package it.soli.integration.cassitrack;

import it.soli.entity.*;
import it.soli.integration.cassitrack.dto.*;
import it.soli.integration.faro.GeoUtils;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * SOLI-side use of the Cassino mobility platform (CassiTrack + OmniMove):
 * TPL layer of the SOLI map, TPL support on accompaniment tasks, route disruptions affecting active tasks,
 * reports sent by volunteers and the mobility section of the admin dashboard.
 */
@ApplicationScoped
public class TransitService {

    public static final String SOURCE = "CassiTrack + OmniMove - Piattaforma di mobilità urbana intelligente di Cassino";
    static final double CAR_CO2_PER_KM = 170;
    private static final List<TaskStatus> ACTIVE = List.of(TaskStatus.OPEN, TaskStatus.NOTIFIED, TaskStatus.ACCEPTED, TaskStatus.IN_PROGRESS);

    // ── DTOs ────────────────────────────────────────────────────────────

    public record StopDto(String id, String name, double lat, double lon, List<String> routeIds) {
    }

    public record RouteDto(String id, String shortName, String longName, String color, List<StopDto> stops,
                           String status, int activeVehicles, int maxDelayMinutes, List<String> incidentIds) {
    }

    public record VehicleDto(String vehicleId, double lat, double lon, double speedKmh, double headingDeg, String routeId,
                             String routeShortName, String color, String scheduleStatus, int delayMinutes, String nextStopName,
                             int etaSeconds, int estimatedPassengers, String crowdingLevel, String licensePlate,
                             int seats, boolean accessible, String timestamp) {
    }

    public record KpiDto(long fleetTotal, int trackedVehicles, int onTimeVehicles, int onTimePercentage,
                         double avgDelayMinutes, int activeIncidents) {
    }

    public record NetworkDto(String city, double centerLat, double centerLon, double radiusKm, List<RouteDto> routes,
                             List<VehicleDto> vehicles, List<CtIncident> incidents, KpiDto kpis, String source, String generatedAt) {
    }

    public record ArrivalDto(String tripId, String vehicleId, String routeId, String routeShortName, String routeName,
                             String color, String scheduledArrival, String estimatedArrival, int minutes, int delayMinutes,
                             String crowdingLevel, boolean isRealtime, Boolean accessible) {
    }

    public record NearbyStopDto(StopDto stop, int distanceMeters, int walkMinutes, List<ArrivalDto> nextArrivals) {
    }

    public record PlaceDto(String name, double lat, double lon, String stopId) {
    }

    public record DestinationDto(String stopId, String name, double lat, double lon, boolean inferred, String reason) {
    }

    public record JourneyDto(String mode, int durationMinutes, double costEuros, double co2Grams, double co2SavedGrams,
                             int greenIndex, List<OmJourneyResponse.Leg> legs, String dataSource, String notice,
                             String summary, Boolean accessibleVehicle, String crowdingLevel, int delayMinutes,
                             List<String> incidentIds, String departAt, String arriveAt) {
    }

    public record PlanDto(PlaceDto from, PlaceDto to, double distanceKm, JourneyDto recommended, List<JourneyDto> alternatives,
                          List<String> advice) {
    }

    public record DisruptionDto(CtIncident incident, String impact, String suggestion) {
    }

    public record TaskTransitDto(boolean covered, String city, PlaceDto pickup, List<NearbyStopDto> nearbyStops,
                                 List<DestinationDto> destinationOptions, DestinationDto destination, PlanDto accompaniment,
                                 PlanDto volunteerReach, List<DisruptionDto> disruptions, Map<String, String> lineColors,
                                 String source, String generatedAt) {
    }

    public record AlertDto(UUID taskId, String taskTitle, String role, LocalDateTime scheduledAt, CtIncident incident,
                           String lines, String impact, String suggestion) {
    }

    public record IssueRequest(String type, String routeId, String stopId, String description, Integer expectedDelayMinutes,
                               boolean notifyRequester) {
    }

    public record IssueResponse(CtIncident incident, boolean requesterNotified, String chatMessage, String endpoint) {
    }

    public record HourPoint(int hour, double tplAvgPassengers, long soliAccompaniments) {
    }

    public record RouteDelayDto(String routeId, String shortName, String color, double avgDelayMinutes,
                                double maxDelayMinutes, List<CtAnalytics.DelayByRoute.Point> points) {
    }

    public record CoverageDto(long tasksInArea, long mobilityTasks, long tasksNearStop, int nearStopPercentage,
                              long completedAccompaniments, double estimatedCo2SavedKg) {
    }

    public record AnalyticsDto(CtAnalytics.Summary summary, CtAnalytics.Co2 co2, long fleetSize, List<HourPoint> demandByHour,
                               List<RouteDelayDto> delayByRoute, CoverageDto soliCoverage, List<CtIncident> incidents,
                               String source, String generatedAt) {
    }

    private record Keyword(String stopId, Pattern pattern, String reason) {
    }

    private record Cached<T>(Instant at, T value) {
    }

    /** Destinations typically reached by accompaniment tasks, inferred from the text of the request. */
    private static final List<Keyword> KEYWORDS = List.of(
            new Keyword("OSP", Pattern.compile("ospedal|visita|medic|cardiolog|analisi|esam|asl|ambulator|fisioterap|prelievo|ricovero"), "richiesta di tipo sanitario"),
            new Keyword("STZ", Pattern.compile("stazione|treno|ferrovi"), "spostamento verso la stazione"),
            new Keyword("UNI", Pattern.compile("universit|campus|ateneo|folcara"), "destinazione universitaria"),
            new Keyword("MUN", Pattern.compile("comune|municip|anagrafe|ufficio|inps|posta|pratic"), "pratica presso uffici pubblici"),
            new Keyword("COR", Pattern.compile("spesa|supermercat|mercato|negozi|farmacia|commission"), "commissioni in centro"),
            new Keyword("COL", Pattern.compile("passeggiata|museo|anfiteatro|parco"), "uscita ricreativa"));
    private static final List<String> DESTINATION_STOPS = List.of("OSP", "STZ", "UNI", "MUN", "COR", "PSB", "COL", "LIC", "GIA");

    @Inject
    CassiTrackGateway gateway;

    @Inject
    CassiTrackConfig config;

    private final Map<String, Cached<?>> cache = new ConcurrentHashMap<>();

    // ── Coverage & network ──────────────────────────────────────────────

    public boolean enabled() {
        return config.enabled();
    }

    public boolean covered(Double lat, Double lon) {
        return config.enabled() && lat != null && lon != null
                && GeoUtils.distanceMeters(lat, lon, config.coverageLatitude(), config.coverageLongitude()) <= config.coverageRadiusKm() * 1000;
    }

    public NetworkDto network() {
        return cached("network", config.cacheSeconds(), () -> {
            List<CtRouteGeometry> routes = routes();
            Map<String, CtRouteGeometry> byId = routes.stream().collect(Collectors.toMap(CtRouteGeometry::id, r -> r));
            Map<String, CtBus> busByVehicle = buses().stream().filter(b -> b.currentVehicleId() != null)
                    .collect(Collectors.toMap(CtBus::currentVehicleId, b -> b));
            List<CtIncident> incidents = gateway.incidents();
            List<VehicleDto> vehicles = gateway.vehicles().stream().filter(CtVehicleStatus::isActive).map(v -> {
                CtRouteGeometry r = byId.get(v.routeId());
                CtBus bus = busByVehicle.get(v.vehicleId());
                return new VehicleDto(v.vehicleId(), v.lat(), v.lon(), v.speedKmh(), v.headingDeg(), v.routeId(),
                        r == null ? v.routeId() : r.name(), r == null ? "#546E7A" : r.color(), v.scheduleStatus(),
                        v.delayMinutes(), v.nextStopName(), v.etaSeconds(), v.estimatedPassengers(), v.crowdingLevel(),
                        bus == null ? null : bus.licensePlate(), bus == null ? 0 : bus.numberSeats(),
                        bus != null && bus.placeDisablePeople(), v.timestamp());
            }).toList();
            Map<String, List<String>> routesByStop = routesByStop(routes);
            List<RouteDto> routeDtos = routes.stream().map(r -> {
                List<VehicleDto> onRoute = vehicles.stream().filter(v -> v.routeId().equals(r.id())).toList();
                int maxDelay = onRoute.stream().mapToInt(VehicleDto::delayMinutes).max().orElse(0);
                List<String> incidentIds = incidents.stream().filter(i -> i.routeIds().contains(r.id())).map(CtIncident::id).toList();
                String status = incidents.stream().anyMatch(i -> i.routeIds().contains(r.id()) && !"LOW".equals(i.severity())) ? "DISRUPTED"
                        : maxDelay > 5 ? "DELAYED" : "REGULAR";
                return new RouteDto(r.id(), r.name(), r.longName(), r.color(),
                        r.stops().stream().map(s -> new StopDto(s.id(), s.name(), s.lat(), s.lon(), routesByStop.get(s.id()))).toList(),
                        status, onRoute.size(), maxDelay, incidentIds);
            }).toList();
            int onTime = (int) vehicles.stream().filter(v -> v.delayMinutes() <= 3).count();
            KpiDto kpis = new KpiDto(gateway.fleetSize(), vehicles.size(), onTime,
                    vehicles.isEmpty() ? 100 : Math.round(100f * onTime / vehicles.size()),
                    round1(vehicles.stream().mapToInt(VehicleDto::delayMinutes).average().orElse(0)), incidents.size());
            return new NetworkDto("Cassino", config.coverageLatitude(), config.coverageLongitude(), config.coverageRadiusKm(),
                    routeDtos, vehicles, incidents, kpis, SOURCE, OffsetDateTime.now().toString());
        });
    }

    public List<ArrivalDto> stopArrivals(String stopId, int limit) {
        Map<String, CtRouteGeometry> routes = routes().stream().collect(Collectors.toMap(CtRouteGeometry::id, r -> r));
        Map<String, Boolean> accessible = buses().stream().filter(b -> b.currentVehicleId() != null)
                .collect(Collectors.toMap(CtBus::currentVehicleId, CtBus::placeDisablePeople));
        Instant now = Instant.now();
        return gateway.stopArrivals(stopId, limit).stream().map(a -> {
            CtRouteGeometry r = routes.get(a.routeId());
            int minutes = (int) Math.max(0, Math.round(Duration.between(now, OffsetDateTime.parse(a.estimatedArrival()).toInstant()).getSeconds() / 60.0));
            return new ArrivalDto(a.tripId(), a.vehicleId(), a.routeId(), r == null ? a.routeId() : r.name(), a.routeName(),
                    r == null ? "#546E7A" : r.color(), a.scheduledArrival(), a.estimatedArrival(), minutes, a.delayMinutes(),
                    a.crowdingLevel(), a.isRealtime(), a.vehicleId() == null ? null : accessible.getOrDefault(a.vehicleId(), false));
        }).toList();
    }

    // ── Task support ────────────────────────────────────────────────────

    /**
     * TPL support for a task: stops near the meeting point with next arrivals, the accompaniment trip
     * (MOBILITY tasks) and, for a volunteer with a profile in the area, how to reach the meeting point.
     */
    public TaskTransitDto taskTransit(Task task, VolunteerProfile viewerProfile, String destinationStopId, boolean exactLocation) {
        if (!covered(task.latitude, task.longitude)) {
            return new TaskTransitDto(false, null, null, List.of(), List.of(), null, null, null, List.of(), Map.of(), SOURCE, OffsetDateTime.now().toString());
        }
        List<CtRouteGeometry> routes = routes();
        Map<String, CtRouteGeometry.Stop> stops = stopsById(routes);
        Map<String, List<String>> routesByStop = routesByStop(routes);
        List<CtIncident> incidents = gateway.incidents();
        Map<String, Boolean> accessible = accessibleByVehicle();

        PlaceDto pickup = new PlaceDto(exactLocation && task.targetAddress != null ? task.targetAddress : "Punto di incontro (zona del task)",
                task.latitude, task.longitude, null);
        List<NearbyStopDto> nearby = nearestStops(stops, task.latitude, task.longitude, config.maxWalkToStopMeters() * 1.5, 2).stream()
                .map(s -> {
                    int meters = (int) Math.round(GeoUtils.distanceMeters(task.latitude, task.longitude, s.lat(), s.lon()));
                    return new NearbyStopDto(new StopDto(s.id(), s.name(), s.lat(), s.lon(), routesByStop.get(s.id())),
                            meters, (int) Math.ceil(meters * 1.3 / 80), stopArrivals(s.id(), 4));
                }).toList();

        List<DestinationDto> options = DESTINATION_STOPS.stream().map(stops::get).filter(Objects::nonNull)
                .map(s -> new DestinationDto(s.id(), s.name(), s.lat(), s.lon(), false, null)).toList();
        DestinationDto destination = null;
        PlanDto accompaniment = null;
        if (task.category == ServiceCategory.MOBILITY) {
            destination = destinationStopId != null && stops.containsKey(destinationStopId)
                    ? toDestination(stops.get(destinationStopId), false, "scelta dall'utente")
                    : inferDestination(task, stops);
            PlaceDto to = new PlaceDto(destination.name(), destination.lat(), destination.lon(), destination.stopId());
            accompaniment = plan(pickup, to, incidents, accessible, true, task.scheduledAt);
        }

        PlanDto reach = null;
        if (viewerProfile != null && covered(viewerProfile.latitude, viewerProfile.longitude)
                && GeoUtils.distanceMeters(viewerProfile.latitude, viewerProfile.longitude, task.latitude, task.longitude) > 150) {
            PlaceDto home = new PlaceDto("La tua zona", viewerProfile.latitude, viewerProfile.longitude, null);
            reach = plan(home, pickup, incidents, accessible, false, task.scheduledAt);
        }

        List<DisruptionDto> disruptions = disruptions(incidents, pickup, destination, accompaniment, reach);
        Map<String, String> colors = routes.stream().collect(Collectors.toMap(CtRouteGeometry::id, CtRouteGeometry::color));
        return new TaskTransitDto(true, "Cassino", pickup, nearby, options, destination, accompaniment, reach, disruptions,
                colors, SOURCE, OffsetDateTime.now().toString());
    }

    /** Journey options between two places, enriched with SOLI's reading: accessibility, crowding, incidents, advice. */
    PlanDto plan(PlaceDto from, PlaceDto to, List<CtIncident> incidents, Map<String, Boolean> accessible,
                 boolean accompaniment, LocalDateTime scheduledAt) {
        OmJourneyResponse response = gateway.searchJourneys(new OmJourneySearchRequest(from.lat(), from.lon(), from.name(),
                to.lat(), to.lon(), to.name(), null, to.stopId(), List.of("BUS", "WALK")));
        double km = round1(GeoUtils.distanceMeters(from.lat(), from.lon(), to.lat(), to.lon()) * 1.3 / 1000);
        List<JourneyDto> journeys = response.options().stream()
                .map(o -> enrich(o, from, to, km, incidents, accessible)).toList();
        if (journeys.isEmpty()) {
            return new PlanDto(from, to, km, null, List.of(), List.of("Nessuna soluzione disponibile per questo spostamento."));
        }
        JourneyDto walk = journeys.stream().filter(j -> j.mode().equals("WALK")).findFirst().orElse(null);
        JourneyDto bus = journeys.stream().filter(j -> j.mode().equals("BUS")).findFirst().orElse(null);
        // Accompaniment of a fragile person: walking only for short distances
        // Accompaniment of a fragile person: bus preferred beyond a short walk, unless it is much slower
        JourneyDto recommended;
        if (bus == null || walk == null) {
            recommended = bus != null ? bus : walk != null ? walk : journeys.get(0);
        } else if (accompaniment) {
            recommended = walk.durationMinutes() > 12 && bus.durationMinutes() <= walk.durationMinutes() + 10 ? bus : walk;
        } else {
            recommended = bus.durationMinutes() < walk.durationMinutes() ? bus : walk;
        }
        List<JourneyDto> alternatives = journeys.stream().filter(j -> j != recommended).toList();

        List<String> advice = new ArrayList<>();
        if (recommended.mode().equals("BUS")) {
            if (recommended.delayMinutes() > 3) {
                advice.add("Linea in ritardo di " + recommended.delayMinutes() + " min: il tempo di viaggio include il ritardo rilevato dall'OBU del mezzo.");
            }
            if (accompaniment && Boolean.TRUE.equals(recommended.accessibleVehicle())) {
                advice.add("Mezzo con posto riservato a persone con disabilità: adatto all'accompagnamento.");
            } else if (accompaniment && Boolean.FALSE.equals(recommended.accessibleVehicle())) {
                advice.add("Il mezzo in arrivo non ha posti riservati a persone con disabilità: se serve, attendi la corsa successiva.");
            }
            if ("HIGH".equals(recommended.crowdingLevel()) || "VERY_HIGH".equals(recommended.crowdingLevel())) {
                advice.add("Bus molto affollato (stima BLE a bordo): per una persona fragile valuta la corsa successiva o un orario fuori punta.");
            }
            if (!recommended.incidentIds().isEmpty()) {
                advice.add("Percorso interessato da un disservizio segnalato da CassiTrack: vedi gli avvisi sul percorso.");
            }
            if (recommended.co2SavedGrams() > 0) {
                advice.add("Rispetto all'auto si evitano circa " + Math.round(recommended.co2SavedGrams()) + " g di CO₂.");
            }
        } else if (bus != null && recommended.mode().equals("WALK")) {
            advice.add("A piedi è la scelta più semplice; in alternativa bus in " + bus.durationMinutes() + " min.");
        }
        if (scheduledAt != null && scheduledAt.isAfter(LocalDateTime.now().plusHours(2))) {
            advice.add("Tempi calcolati sulla situazione attuale della rete: ricontrolla poco prima di partire.");
        }
        if (recommended.notice() != null) {
            advice.add(recommended.notice());
        }
        return new PlanDto(from, to, km, recommended, alternatives, advice);
    }

    private JourneyDto enrich(OmJourneyResponse.Option o, PlaceDto from, PlaceDto to, double km,
                              List<CtIncident> incidents, Map<String, Boolean> accessible) {
        List<OmJourneyResponse.Leg> busLegs = o.legs().stream().filter(l -> "BUS".equals(l.mode())).toList();
        OmJourneyResponse.Leg firstBus = busLegs.isEmpty() ? null : busLegs.get(0);
        Boolean acc = firstBus == null ? null : firstBus.vehicleId() == null ? Boolean.FALSE : accessible.getOrDefault(firstBus.vehicleId(), false);
        String crowding = busLegs.stream().map(OmJourneyResponse.Leg::crowdingLevel).filter(Objects::nonNull)
                .max(Comparator.comparingInt(TransitService::crowdingRank)).orElse(null);
        int delay = busLegs.stream().mapToInt(OmJourneyResponse.Leg::delayMinutes).max().orElse(0);
        List<String> incidentIds = incidents.stream().filter(i -> busLegs.stream().anyMatch(l -> affects(i, l))).map(CtIncident::id).toList();
        String summary = switch (o.mode()) {
            case "BUS" -> busLegs.stream().map(l -> "Linea " + shortName(l.routeName()) + " da " + l.fromName() + " a " + l.toName())
                    .collect(Collectors.joining(", poi "));
            case "WALK" -> "A piedi, " + String.format(Locale.ITALY, "%.1f km", km);
            default -> o.mode();
        };
        String departAt = o.legs().isEmpty() ? null : o.legs().get(0).departureTime();
        String arriveAt = o.legs().isEmpty() ? null : o.legs().get(o.legs().size() - 1).arrivalTime();
        double saved = Math.max(0, km * CAR_CO2_PER_KM - o.co2Grams());
        return new JourneyDto(o.mode(), o.durationMinutes(), o.costEuros(), o.co2Grams(), Math.round(saved), o.greenIndex(),
                o.legs(), o.dataSource(), o.notice(), summary, acc, crowding, delay, incidentIds, departAt, arriveAt);
    }

    private List<DisruptionDto> disruptions(List<CtIncident> incidents, PlaceDto pickup, DestinationDto destination,
                                            PlanDto accompaniment, PlanDto reach) {
        List<DisruptionDto> result = new ArrayList<>();
        for (CtIncident i : incidents) {
            List<String> impacts = new ArrayList<>();
            String alternative = null;
            if (accompaniment != null && accompaniment.recommended() != null && accompaniment.recommended().incidentIds().contains(i.id())) {
                impacts.add("il tragitto di accompagnamento consigliato (" + accompaniment.recommended().summary() + ")");
                alternative = alternativeHint(accompaniment, i);
            }
            if (reach != null && reach.recommended() != null && reach.recommended().incidentIds().contains(i.id())) {
                impacts.add("il tuo tragitto per raggiungere il punto di incontro");
                if (alternative == null) alternative = alternativeHint(reach, i);
            }
            String suggestion = alternative == null ? i.detour() : alternative + " " + (i.detour() == null ? "" : i.detour());
            if (impacts.isEmpty() && near(i, pickup.lat(), pickup.lon())) {
                impacts.add("la zona del punto di incontro");
            }
            if (impacts.isEmpty() && destination != null && near(i, destination.lat(), destination.lon())) {
                impacts.add("la zona di destinazione (" + destination.name() + ")");
            }
            if (!impacts.isEmpty()) {
                String delay = i.expectedDelayMinutes() > 0 ? " Ritardo stimato: +" + i.expectedDelayMinutes() + " min." : "";
                result.add(new DisruptionDto(i, "Interessa " + String.join(" e ", impacts) + "." + delay, suggestion));
            }
        }
        return result;
    }

    private static String alternativeHint(PlanDto plan, CtIncident incident) {
        return plan.alternatives().stream()
                .filter(j -> !j.incidentIds().contains(incident.id()))
                .findFirst()
                .map(j -> "Alternativa non interessata: " + (j.mode().equals("WALK") ? "a piedi in " + j.durationMinutes() + " min"
                        : j.summary() + " (" + j.durationMinutes() + " min)") + ".")
                .orElse(null);
    }

    /** Active tasks of the user (as volunteer or requester) touched by an active disruption of the TPL network. */
    public List<AlertDto> alertsFor(User user) {
        if (!config.enabled()) return List.of();
        List<Task> tasks = Task.list("(volunteerId = ?1 AND status IN ?2) OR (creatorId = ?1 AND status IN ?3)",
                user.id, List.of(TaskStatus.ACCEPTED, TaskStatus.IN_PROGRESS), ACTIVE);
        List<Task> covered = tasks.stream().filter(t -> covered(t.latitude, t.longitude)).toList();
        if (covered.isEmpty()) return List.of();
        List<CtRouteGeometry> routes = routes();
        Map<String, CtRouteGeometry.Stop> stops = stopsById(routes);
        Map<String, List<String>> routesByStop = routesByStop(routes);
        Map<String, String> routeNames = routes.stream().collect(Collectors.toMap(CtRouteGeometry::id, CtRouteGeometry::name));
        List<CtIncident> incidents = gateway.incidents();

        List<AlertDto> alerts = new ArrayList<>();
        for (Task t : covered) {
            Set<String> pickupRoutes = new LinkedHashSet<>();
            nearestStops(stops, t.latitude, t.longitude, config.maxWalkToStopMeters(), 2)
                    .forEach(s -> pickupRoutes.addAll(routesByStop.get(s.id())));
            Set<String> servingRoutes = pickupRoutes;
            if (t.category == ServiceCategory.MOBILITY) {
                // Accompaniment: the lines that connect the meeting point to the destination
                Set<String> destinationRoutes = new HashSet<>(routesByStop.getOrDefault(inferDestination(t, stops).stopId(), List.of()));
                Set<String> both = pickupRoutes.stream().filter(destinationRoutes::contains).collect(Collectors.toCollection(LinkedHashSet::new));
                if (!both.isEmpty()) servingRoutes = both;
            }
            String role = user.id.equals(t.volunteerId) ? "VOLUNTEER" : "REQUESTER";
            for (CtIncident i : incidents) {
                List<String> hit = i.routeIds().stream().filter(servingRoutes::contains).toList();
                if (hit.isEmpty() && !near(i, t.latitude, t.longitude)) continue;
                String lines = hit.stream().map(r -> "Linea " + routeNames.getOrDefault(r, r)).collect(Collectors.joining(", "));
                String impact = hit.isEmpty() ? "Disservizio nella zona del punto di incontro."
                        : lines + " (usata per raggiungere il punto di incontro" + (t.category == ServiceCategory.MOBILITY ? " e la destinazione" : "") + ")"
                        + (i.expectedDelayMinutes() > 0 ? ": ritardi fino a " + i.expectedDelayMinutes() + " min." : ".");
                String suggestion = role.equals("VOLUNTEER")
                        ? "Parti con " + Math.max(5, i.expectedDelayMinutes()) + " minuti di anticipo o avvisa il richiedente dalla pagina del task."
                        : "Il volontario potrebbe arrivare in ritardo: tieni d'occhio la chat del task.";
                alerts.add(new AlertDto(t.id, t.title, role, t.scheduledAt, i, lines, impact, suggestion));
            }
        }
        return alerts;
    }

    /** A volunteer reports a route problem: forwarded to CassiTrack (C-01) and, on request, notified to the requester in chat. */
    @Transactional
    public IssueResponse reportIssue(Task task, User volunteer, IssueRequest body) {
        CtIncident incident = gateway.reportIncident(new CtIncidentReport(body.type(),
                "[SOLI - segnalazione di un volontario durante un task] " + (body.description() == null ? "" : body.description().trim()),
                task.latitude, task.longitude, blankToNull(body.routeId()), blankToNull(body.stopId()),
                body.expectedDelayMinutes(), "SOLI", "task:" + task.id.toString().substring(0, 8)));
        cache.remove("network");

        String message = null;
        if (body.notifyRequester()) {
            ChatSession session = ChatSession.find("taskId", task.id).firstResult();
            if (session == null) {
                session = new ChatSession();
                session.taskId = task.id;
                session.isActive = true;
                session.persist();
            }
            StringBuilder text = new StringBuilder("🚌 Aggiornamento sul percorso: ").append(typeLabel(body.type()).toLowerCase(Locale.ITALY));
            if (body.routeId() != null && !body.routeId().isBlank()) {
                text.append(" sulla ").append(routes().stream().filter(r -> r.id().equals(body.routeId()))
                        .map(r -> "Linea " + r.name()).findFirst().orElse(body.routeId()));
            }
            text.append(".");
            if (body.expectedDelayMinutes() != null && body.expectedDelayMinutes() > 0) {
                text.append(" Arriverò con circa ").append(body.expectedDelayMinutes()).append(" minuti di ritardo.");
            }
            if (body.description() != null && !body.description().isBlank()) {
                text.append(" ").append(body.description().trim());
            }
            ChatMessage chat = new ChatMessage();
            chat.chatSessionId = session.id;
            chat.senderId = volunteer.id;
            chat.content = text.toString();
            chat.persist();
            message = chat.content;
        }
        return new IssueResponse(incident, message != null, message, "POST /cassitrack/api/v1/incidents");
    }

    // ── Admin dashboard ─────────────────────────────────────────────────

    public AnalyticsDto analytics() {
        return cached("analytics", 30, () -> {
            String start = LocalDate.now(MockCassiTrackClient.ZONE).atStartOfDay(MockCassiTrackClient.ZONE).toOffsetDateTime().toString();
            String end = OffsetDateTime.now().truncatedTo(ChronoUnit.SECONDS).toString();
            List<CtRouteGeometry> routes = routes();
            Map<String, CtRouteGeometry.Stop> stops = stopsById(routes);

            double r = config.coverageRadiusKm();
            double dLat = r / 111.0;
            double dLon = r / (111.0 * Math.cos(Math.toRadians(config.coverageLatitude())));
            List<Task> tasks = Task.<Task>list("latitude BETWEEN ?1 AND ?2 AND longitude BETWEEN ?3 AND ?4",
                    config.coverageLatitude() - dLat, config.coverageLatitude() + dLat,
                    config.coverageLongitude() - dLon, config.coverageLongitude() + dLon)
                    .stream().filter(t -> covered(t.latitude, t.longitude)).toList();
            List<Task> mobility = tasks.stream().filter(t -> t.category == ServiceCategory.MOBILITY).toList();
            Map<Integer, Long> byHour = mobility.stream().collect(Collectors.groupingBy(t -> {
                LocalDateTime when = Boolean.TRUE.equals(t.hasScheduledTime) && t.scheduledAt != null ? t.scheduledAt : t.createdAt;
                return when.getHour();
            }, Collectors.counting()));
            List<HourPoint> demand = gateway.busiestHours().busiestHours().stream()
                    .map(h -> new HourPoint(h.hour(), h.avgPassengers(), byHour.getOrDefault(h.hour(), 0L))).toList();

            long nearStop = tasks.stream().filter(t -> !nearestStops(stops, t.latitude, t.longitude, 400, 1).isEmpty()).count();
            List<Task> completed = mobility.stream().filter(t -> t.status == TaskStatus.COMPLETED).toList();
            double co2Kg = completed.stream().mapToDouble(t -> {
                DestinationDto d = inferDestination(t, stops);
                double km = GeoUtils.distanceMeters(t.latitude, t.longitude, d.lat(), d.lon()) * 1.3 / 1000;
                return km * 2 * (CAR_CO2_PER_KM - 68) / 1000;
            }).sum();
            CoverageDto coverage = new CoverageDto(tasks.size(), mobility.size(), nearStop,
                    tasks.isEmpty() ? 0 : Math.round(100f * nearStop / tasks.size()), completed.size(), round1(co2Kg));

            List<CtAnalytics.DelayByRoute.Point> points = gateway.delayByRoute(start, end).data();
            List<RouteDelayDto> delays = routes.stream().map(route -> {
                List<CtAnalytics.DelayByRoute.Point> p = points.stream().filter(x -> x.routeId().equals(route.id())).toList();
                return new RouteDelayDto(route.id(), route.name(), route.color(),
                        round1(p.stream().mapToDouble(CtAnalytics.DelayByRoute.Point::avgDelayMinutes).average().orElse(0)),
                        round1(p.stream().mapToDouble(CtAnalytics.DelayByRoute.Point::avgDelayMinutes).max().orElse(0)), p);
            }).toList();

            return new AnalyticsDto(gateway.analyticsSummary(), gateway.co2(start, end), gateway.fleetSize(), demand, delays,
                    coverage, gateway.incidents(), SOURCE, OffsetDateTime.now().toString());
        });
    }

    // ── Helpers ─────────────────────────────────────────────────────────

    List<CtRouteGeometry> routes() {
        return cached("routes", 300, gateway::routes);
    }

    List<CtBus> buses() {
        return cached("buses", 300, gateway::buses);
    }

    Map<String, Boolean> accessibleByVehicle() {
        return buses().stream().filter(b -> b.currentVehicleId() != null)
                .collect(Collectors.toMap(CtBus::currentVehicleId, CtBus::placeDisablePeople));
    }

    List<CtIncident> incidents() {
        return gateway.incidents();
    }

    DestinationDto inferDestination(Task task, Map<String, CtRouteGeometry.Stop> stops) {
        String text = ((task.title == null ? "" : task.title) + " " + (task.description == null ? "" : task.description)).toLowerCase(Locale.ITALY);
        for (Keyword k : KEYWORDS) {
            if (k.pattern().matcher(text).find() && stops.containsKey(k.stopId())) {
                return toDestination(stops.get(k.stopId()), true, k.reason());
            }
        }
        return toDestination(stops.get("PSB"), true, "centro città (nessuna destinazione riconosciuta nella richiesta)");
    }

    private static DestinationDto toDestination(CtRouteGeometry.Stop s, boolean inferred, String reason) {
        return new DestinationDto(s.id(), s.name(), s.lat(), s.lon(), inferred, reason);
    }

    static Map<String, CtRouteGeometry.Stop> stopsById(List<CtRouteGeometry> routes) {
        Map<String, CtRouteGeometry.Stop> stops = new LinkedHashMap<>();
        routes.forEach(r -> r.stops().forEach(s -> stops.putIfAbsent(s.id(), s)));
        return stops;
    }

    static Map<String, List<String>> routesByStop(List<CtRouteGeometry> routes) {
        Map<String, List<String>> result = new HashMap<>();
        routes.forEach(r -> r.stops().forEach(s -> result.computeIfAbsent(s.id(), k -> new ArrayList<>()).add(r.id())));
        return result;
    }

    static List<CtRouteGeometry.Stop> nearestStops(Map<String, CtRouteGeometry.Stop> stops, double lat, double lon, double maxMeters, int limit) {
        return stops.values().stream()
                .filter(s -> GeoUtils.distanceMeters(lat, lon, s.lat(), s.lon()) <= maxMeters)
                .sorted(Comparator.comparingDouble(s -> GeoUtils.distanceMeters(lat, lon, s.lat(), s.lon())))
                .limit(limit)
                .toList();
    }

    /**
     * A disruption affects a bus leg when it hits the boarding/alighting stop, when the leg passes through its area,
     * or when it delays the whole line (breakdowns, non-minor events).
     */
    static boolean affects(CtIncident i, OmJourneyResponse.Leg leg) {
        if ((leg.fromStopId() != null && i.stopIds().contains(leg.fromStopId()))
                || (leg.toStopId() != null && i.stopIds().contains(leg.toStopId()))) {
            return true;
        }
        if (!i.routeIds().contains(leg.routeId())) return false;
        if (i.vehicleId() != null || !"LOW".equals(i.severity())) return true;
        return leg.geometry() != null && leg.geometry().stream()
                .anyMatch(p -> GeoUtils.distanceMeters(p[0], p[1], i.lat(), i.lon()) <= i.radiusMeters() + 150);
    }

    private boolean near(CtIncident i, double lat, double lon) {
        return GeoUtils.distanceMeters(i.lat(), i.lon(), lat, lon) <= i.radiusMeters() + config.incidentProximityMeters();
    }

    static String shortName(String routeName) {
        if (routeName == null) return "?";
        int dash = routeName.indexOf(" - ");
        return dash > 0 ? routeName.substring(0, dash) : routeName;
    }

    static int crowdingRank(String level) {
        return switch (level == null ? "" : level) {
            case "VERY_HIGH" -> 3;
            case "HIGH" -> 2;
            case "MEDIUM" -> 1;
            default -> 0;
        };
    }

    static String typeLabel(String type) {
        return switch (type == null ? "" : type) {
            case "ROAD_CLOSED" -> "Strada chiusa";
            case "PROTEST" -> "Manifestazione";
            case "BUS_BREAKDOWN" -> "Guasto al mezzo";
            case "ROADWORKS" -> "Lavori stradali";
            case "ACCIDENT" -> "Incidente stradale";
            default -> "Problema sul percorso";
        };
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s;
    }

    static double round1(double v) {
        return Math.round(v * 10) / 10.0;
    }

    @SuppressWarnings("unchecked")
    private <T> T cached(String key, int seconds, Supplier<T> loader) {
        Cached<?> hit = cache.get(key);
        if (hit != null && hit.at().isAfter(Instant.now().minusSeconds(seconds))) {
            return (T) hit.value();
        }
        T value = loader.get();
        cache.put(key, new Cached<>(Instant.now(), value));
        return value;
    }
}
