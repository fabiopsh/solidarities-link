package it.soli.integration.cassitrack;

import it.soli.integration.cassitrack.MockCassiTrackClient.Pass;
import it.soli.integration.cassitrack.MockCassiTrackClient.RouteSeed;
import it.soli.integration.cassitrack.MockCassiTrackClient.StopSeed;
import it.soli.integration.cassitrack.dto.*;
import it.soli.integration.faro.GeoUtils;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.*;

/**
 * In-memory simulation of the OmniMove REST API.
 *
 * Like the real OmniMove, it plans on CassiTrack's network (stops, routes, live vehicle positions): the bus ETA comes
 * from the live position of the vehicle (dataSource GOOGLE_MAPS) or from the timetable when no OBU data exists
 * (dataSource CASSITRACK + notice). Options are "alternatives of transport" (BUS with walking legs, WALK, BIKE,
 * SCOOTER) ordered by duration; costs, CO2 and green index follow the partner's data dictionary
 * (car 170 gCO2/km, bus 68 gCO2/passenger-km, zero for active mobility). A single transfer at Piazza San Benedetto
 * (hub of the three ring lines) is allowed.
 */
@ApplicationScoped
public class MockOmniMoveClient implements OmniMoveClient {

    static final String USERNAME = "soli-integration@omnimove.it";
    static final String PASSWORD = "soli-om-demo";

    private static final Set<String> MODES = Set.of("BUS", "WALK", "BIKE", "SCOOTER");
    private static final double WALK_FACTOR = 1.3;
    private static final double WALK_METERS_PER_MINUTE = 80;
    private static final double BIKE_METERS_PER_MINUTE = 250;
    private static final double SCOOTER_METERS_PER_MINUTE = 300;
    private static final double BUS_CO2_PER_KM = 68;
    private static final double BUS_FARE = 1.00;
    private static final int MAX_WALK_TO_STOP_METERS = 900;
    private static final int TRANSFER_MINUTES = 2;
    private static final String HUB = "PSB";

    @Inject
    MockCassiTrackClient network;

    private final SecureRandom random = new SecureRandom();
    private final Set<String> tokens = new HashSet<>();

    private record BusPlan(List<OmJourneyResponse.Leg> legs, Instant arrival, double rideKm, boolean realtime) {
    }

    @Override
    public synchronized CtSession login(CtLoginRequest credentials) {
        simulateLatency();
        if (credentials == null || !USERNAME.equals(credentials.email()) || !PASSWORD.equals(credentials.password())) {
            throw new CtApiException(401, "Credenziali non valide");
        }
        byte[] raw = new byte[32];
        random.nextBytes(raw);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
        tokens.add(token);
        return new CtSession("omnimove_jwt", token);
    }

    @Override
    public List<OmStop> stops(CtSession session) {
        simulateLatency();
        requireSession(session);
        return network.stopSeeds().values().stream()
                .map(s -> new OmStop(s.id(), s.name(), s.lat(), s.lon()))
                .sorted(Comparator.comparing(OmStop::name))
                .limit(500)
                .toList();
    }

    @Override
    public OmJourneyResponse search(CtSession session, OmJourneySearchRequest req) {
        simulateLatency();
        requireSession(session);
        if (req == null || (req.originLat() == 0 && req.originLon() == 0) || (req.destLat() == 0 && req.destLon() == 0)) {
            throw new CtApiException(400, "Coordinate mancanti");
        }
        Set<String> modes = req.modes() == null || req.modes().isEmpty() ? MODES : new HashSet<>(req.modes());
        Instant now = Instant.now();
        double meters = GeoUtils.distanceMeters(req.originLat(), req.originLon(), req.destLat(), req.destLon()) * WALK_FACTOR;
        double km = meters / 1000.0;
        String origin = req.originName() == null ? "Partenza" : req.originName();
        String dest = req.destName() == null ? "Destinazione" : req.destName();
        double[] from = {req.originLat(), req.originLon()};
        double[] to = {req.destLat(), req.destLon()};

        List<OmJourneyResponse.Option> options = new ArrayList<>();
        if (modes.contains("BUS")) {
            planBus(from, origin, to, dest, now).ifPresent(p -> {
                int minutes = minutesBetween(now, p.arrival());
                options.add(new OmJourneyResponse.Option("BUS", minutes, BUS_FARE, round0(p.rideKm() * BUS_CO2_PER_KM), 60,
                        p.legs(), p.realtime() ? "GOOGLE_MAPS" : "CASSITRACK",
                        p.realtime() ? null : "ETA basata sull'orario pianificato di CassiTrack: mezzo non tracciato in tempo reale."));
            });
        }
        if (modes.contains("WALK") && meters / WALK_METERS_PER_MINUTE <= 90) {
            int minutes = (int) Math.ceil(meters / WALK_METERS_PER_MINUTE);
            options.add(new OmJourneyResponse.Option("WALK", minutes, 0, 0, 100,
                    List.of(leg("WALK", origin, dest, null, null, now, minutes, km, from, to)), "GOOGLE_MAPS", null));
        }
        if (modes.contains("BIKE") && km <= 10) {
            int minutes = (int) Math.ceil(meters / BIKE_METERS_PER_MINUTE) + 2;
            options.add(new OmJourneyResponse.Option("BIKE", minutes, 1.5, 0, 100,
                    List.of(leg("BIKE", origin, dest, null, null, now, minutes, km, from, to)), "GOOGLE_MAPS",
                    "Disponibilità bici stimata (integrazione operatori di micromobilità non attiva)."));
        }
        if (modes.contains("SCOOTER") && km <= 10) {
            int minutes = (int) Math.ceil(meters / SCOOTER_METERS_PER_MINUTE) + 2;
            options.add(new OmJourneyResponse.Option("SCOOTER", minutes, Math.round((1 + 0.2 * minutes) * 100) / 100.0, 0, 100,
                    List.of(leg("SCOOTER", origin, dest, null, null, now, minutes, km, from, to)), "GOOGLE_MAPS",
                    "Disponibilità monopattini stimata (integrazione operatori di micromobilità non attiva)."));
        }
        options.sort(Comparator.comparingInt(OmJourneyResponse.Option::durationMinutes));
        return new OmJourneyResponse(options);
    }

    @Override
    public List<CtStopArrival> arrivals(CtSession session, String stopId, int limit) {
        simulateLatency();
        requireSession(session);
        if (stopId == null || !stopId.matches("[A-Za-z0-9_]{1,50}") || !network.stopSeeds().containsKey(stopId)) {
            throw new CtApiException(400, "Stop ID non valido");
        }
        int max = Math.max(1, Math.min(10, limit));
        Instant now = Instant.now();
        List<Pass> passes = new ArrayList<>(network.livePasses(stopId, now, now.plus(Duration.ofMinutes(60))));
        passes.addAll(network.scheduledPasses(stopId, now, now.plus(Duration.ofMinutes(90)), true));
        passes.sort(Comparator.comparing(Pass::estimated));
        return passes.stream().limit(max).map(p -> network.toArrival(p, stopId)).toList();
    }

    // ── Planner ─────────────────────────────────────────────────────────

    private Optional<BusPlan> planBus(double[] origin, String originName, double[] dest, String destName, Instant now) {
        List<StopSeed> boarding = nearestStops(origin);
        List<StopSeed> alighting = nearestStops(dest);
        BusPlan best = null;
        for (StopSeed b : boarding) {
            for (StopSeed a : alighting) {
                if (b.id().equals(a.id())) continue;
                for (RouteSeed r : network.routeSeeds().values()) {
                    if (r.stopIds().contains(b.id()) && r.stopIds().contains(a.id())) {
                        best = better(best, direct(origin, originName, b, r, a, dest, destName, now));
                    }
                }
                if (b.id().equals(HUB) || a.id().equals(HUB)) continue;
                for (RouteSeed r1 : network.routeSeeds().values()) {
                    if (!r1.stopIds().contains(b.id()) || !r1.stopIds().contains(HUB)) continue;
                    for (RouteSeed r2 : network.routeSeeds().values()) {
                        if (r2 == r1 || !r2.stopIds().contains(HUB) || !r2.stopIds().contains(a.id())) continue;
                        best = better(best, transfer(origin, originName, b, r1, r2, a, dest, destName, now));
                    }
                }
            }
        }
        return Optional.ofNullable(best);
    }

    private BusPlan direct(double[] origin, String originName, StopSeed b, RouteSeed r, StopSeed a,
                           double[] dest, String destName, Instant now) {
        List<OmJourneyResponse.Leg> legs = new ArrayList<>();
        Instant t = walk(legs, origin, originName, b, now, true);
        BusRide ride = ride(r, b, a, t);
        if (ride == null) return null;
        legs.add(ride.leg());
        Instant end = walk(legs, dest, destName, a, ride.arrival(), false);
        return new BusPlan(legs, end, ride.leg().distanceKm(), ride.realtime());
    }

    private BusPlan transfer(double[] origin, String originName, StopSeed b, RouteSeed r1, RouteSeed r2, StopSeed a,
                             double[] dest, String destName, Instant now) {
        StopSeed hub = network.stopSeeds().get(HUB);
        List<OmJourneyResponse.Leg> legs = new ArrayList<>();
        Instant t = walk(legs, origin, originName, b, now, true);
        BusRide first = ride(r1, b, hub, t);
        if (first == null) return null;
        legs.add(first.leg());
        BusRide second = ride(r2, hub, a, first.arrival().plus(Duration.ofMinutes(TRANSFER_MINUTES)));
        if (second == null) return null;
        legs.add(second.leg());
        Instant end = walk(legs, dest, destName, a, second.arrival(), false);
        return new BusPlan(legs, end, first.leg().distanceKm() + second.leg().distanceKm(), first.realtime() && second.realtime());
    }

    private record BusRide(OmJourneyResponse.Leg leg, Instant arrival, boolean realtime) {
    }

    /** First pass of the route at the boarding stop after {@code readyAt} (live vehicle first, then untracked timetable). */
    private BusRide ride(RouteSeed r, StopSeed b, StopSeed a, Instant readyAt) {
        Instant horizon = readyAt.plus(Duration.ofMinutes(90));
        List<Pass> passes = new ArrayList<>(network.livePasses(b.id(), readyAt, horizon));
        passes.addAll(network.scheduledPasses(b.id(), readyAt, horizon, true));
        Pass pass = passes.stream().filter(p -> p.routeId().equals(r.id()))
                .min(Comparator.comparing(Pass::estimated)).orElse(null);
        if (pass == null) return null;

        int ib = r.stopIds().indexOf(b.id());
        int ia = r.stopIds().indexOf(a.id());
        double loop = network.loop(r.id());
        double rideMinutes = ((network.offset(r.id(), ia) - network.offset(r.id(), ib)) % loop + loop) % loop;
        List<double[]> geometry = new ArrayList<>();
        double meters = 0;
        int n = r.stopIds().size();
        for (int i = ib; ; i = (i + 1) % n) {
            StopSeed s = network.stopSeeds().get(r.stopIds().get(i));
            if (!geometry.isEmpty()) {
                double[] prev = geometry.get(geometry.size() - 1);
                meters += GeoUtils.distanceMeters(prev[0], prev[1], s.lat(), s.lon()) * MockCassiTrackClient.ROAD_FACTOR;
            }
            geometry.add(new double[]{s.lat(), s.lon()});
            if (i == ia) break;
        }
        Instant arrival = pass.estimated().plusSeconds(Math.round(rideMinutes * 60));
        OmJourneyResponse.Leg leg = new OmJourneyResponse.Leg("BUS", b.name(), a.name(), b.id(), a.id(), r.id(),
                r.shortName() + " - " + r.longName(), pass.vehicleId(), MockCassiTrackClient.iso(pass.estimated()),
                MockCassiTrackClient.iso(arrival), (int) Math.ceil(rideMinutes), round2(meters / 1000.0),
                pass.delayMinutes(), pass.crowding(), geometry);
        return new BusRide(leg, arrival, pass.realtime());
    }

    /** Adds the walking leg to/from a stop and returns the instant at the end of the walk (or {@code at} if negligible). */
    private Instant walk(List<OmJourneyResponse.Leg> legs, double[] point, String pointName, StopSeed stop, Instant at, boolean towardsStop) {
        double meters = GeoUtils.distanceMeters(point[0], point[1], stop.lat(), stop.lon()) * WALK_FACTOR;
        int minutes = (int) Math.ceil(meters / WALK_METERS_PER_MINUTE);
        if (meters < 40) return at;
        double[] s = {stop.lat(), stop.lon()};
        legs.add(towardsStop
                ? leg("WALK", pointName, stop.name(), null, stop.id(), at, minutes, meters / 1000.0, point, s)
                : leg("WALK", stop.name(), pointName, stop.id(), null, at, minutes, meters / 1000.0, s, point));
        return at.plus(Duration.ofMinutes(minutes));
    }

    private static OmJourneyResponse.Leg leg(String mode, String from, String to, String fromStop, String toStop,
                                             Instant start, int minutes, double km, double[] a, double[] b) {
        return new OmJourneyResponse.Leg(mode, from, to, fromStop, toStop, null, null, null,
                MockCassiTrackClient.iso(start), MockCassiTrackClient.iso(start.plus(Duration.ofMinutes(minutes))),
                minutes, round2(km), 0, null, List.of(a, b));
    }

    private List<StopSeed> nearestStops(double[] point) {
        return network.stopSeeds().values().stream()
                .filter(s -> GeoUtils.distanceMeters(point[0], point[1], s.lat(), s.lon()) <= MAX_WALK_TO_STOP_METERS)
                .sorted(Comparator.comparingDouble(s -> GeoUtils.distanceMeters(point[0], point[1], s.lat(), s.lon())))
                .limit(3)
                .toList();
    }

    private static BusPlan better(BusPlan current, BusPlan candidate) {
        if (candidate == null) return current;
        if (current == null || candidate.arrival().isBefore(current.arrival())) return candidate;
        return current;
    }

    private synchronized void requireSession(CtSession session) {
        if (session == null || !"omnimove_jwt".equals(session.cookieName()) || !tokens.contains(session.token())) {
            throw new CtApiException(401, "Non autenticato");
        }
    }

    private static int minutesBetween(Instant a, Instant b) {
        return (int) Math.ceil(Duration.between(a, b).getSeconds() / 60.0);
    }

    private static double round0(double v) {
        return Math.round(v);
    }

    private static double round2(double v) {
        return Math.round(v * 100) / 100.0;
    }

    private void simulateLatency() {
        try {
            Thread.sleep(5 + random.nextInt(20));
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
        }
    }
}
