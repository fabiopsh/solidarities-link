package it.soli.integration.cassitrack;

import it.soli.entity.Task;
import it.soli.entity.User;
import it.soli.integration.cassitrack.dto.CtApiException;
import it.soli.integration.cassitrack.dto.CtIncident;
import it.soli.service.MatchingService.MatchedVolunteer;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

import java.util.*;

/**
 * TPL-aware volunteer matching inside the area served by the Cassino network.
 *
 * Straight-line distance says little about how fast a volunteer without a car reaches a requester: the advisor asks
 * OmniMove for the real travel time (walking or bus, with live delays) from each competent volunteer's area to the task,
 * ranks candidates by that time (fair rotation as tie-breaker) and also admits volunteers just outside their action
 * radius when the task is reachable by bus within the configured time.
 */
@ApplicationScoped
public class TransitMatchingAdvisor {

    private static final Logger LOG = Logger.getLogger(TransitMatchingAdvisor.class);
    /** Beyond this multiple of the action radius a volunteer is not considered even if well connected. */
    private static final double MAX_RADIUS_EXTENSION = 2.0;

    public record Row(int transitRank, int distanceRank, String volunteer, int distanceMeters, int actionRadiusMeters,
                      boolean withinRadius, Integer walkMinutes, Integer busMinutes, String busSummary, int busDelayMinutes,
                      String crowdingLevel, String bestMode, Integer bestMinutes, boolean selected, boolean addedByTransit,
                      boolean affectedByIncident, String note) {
    }

    public record MatchingDto(boolean covered, int maxTransitMinutes, int distanceOnlyCandidates, int transitCandidates,
                              int addedByTransit, List<Row> rows, String explanation, String source) {
    }

    private record Evaluated(MatchedVolunteer candidate, Integer walk, Integer bus, String busSummary, int delay,
                             String crowding, boolean affected) {
        Integer best() {
            if (walk == null) return bus;
            if (bus == null) return walk;
            return Math.min(walk, bus);
        }
    }

    @Inject
    TransitService transit;

    @Inject
    CassiTrackConfig config;

    public boolean applies(Task task) {
        return task.latitude != null && task.longitude != null && transit.covered(task.latitude, task.longitude);
    }

    /** Candidates to notify, ordered by real travel time. Falls back to the input on integration errors. */
    public List<MatchedVolunteer> rerank(Task task, List<MatchedVolunteer> competent) {
        try {
            List<MatchedVolunteer> result = evaluate(task, competent).stream()
                    .filter(e -> selected(e))
                    .map(Evaluated::candidate)
                    .toList();
            LOG.infof("[CassiTrack] TPL-aware matching for task %s: %d candidates (%d by distance only)",
                    task.id, result.size(), competent.stream().filter(c -> c.distanceMeters <= c.profile.maxTaskDistanceMeters).count());
            return result;
        } catch (CtApiException e) {
            LOG.warnf("[CassiTrack] TPL-aware matching unavailable (%s): distance ranking kept", e.getMessage());
            return competent.stream().filter(c -> c.distanceMeters <= c.profile.maxTaskDistanceMeters)
                    .sorted(Comparator.comparingDouble((MatchedVolunteer c) -> c.distanceMeters).thenComparingLong(c -> c.previousNotifications))
                    .toList();
        }
    }

    /** Side-by-side view of distance ranking and TPL-aware ranking, for the task page. */
    public MatchingDto explain(Task task, List<MatchedVolunteer> competent) {
        if (!applies(task)) {
            return new MatchingDto(false, config.matchingMaxTransitMinutes(), 0, 0, 0, List.of(), null, TransitService.SOURCE);
        }
        List<Evaluated> evaluated = evaluate(task, competent);
        List<MatchedVolunteer> byDistance = competent.stream()
                .filter(c -> c.distanceMeters <= c.profile.maxTaskDistanceMeters)
                .sorted(Comparator.comparingDouble(c -> c.distanceMeters)).toList();

        List<Row> rows = new ArrayList<>();
        int rank = 0;
        for (Evaluated e : evaluated) {
            MatchedVolunteer c = e.candidate();
            boolean within = c.distanceMeters <= c.profile.maxTaskDistanceMeters;
            boolean selected = selected(e);
            int distanceRank = byDistance.indexOf(c) + 1;
            String bestMode = e.best() == null ? null : Objects.equals(e.best(), e.walk()) ? "WALK" : "BUS";
            String note;
            if (!selected && within) {
                note = "Nel raggio d'azione ma senza collegamento utile";
            } else if (!selected) {
                note = e.bus() == null ? "Fuori raggio e non collegato dalla rete TPL" : "Fuori raggio: bus oltre " + config.matchingMaxTransitMinutes() + " min";
            } else if (!within) {
                note = "Fuori raggio (" + Math.round(c.distanceMeters / 100) / 10.0 + " km) ma raggiungibile in bus";
            } else if ("BUS".equals(bestMode) && e.walk() != null) {
                note = "Il bus fa risparmiare " + (e.walk() - e.bus()) + " min rispetto a piedi";
            } else {
                note = "BUS".equals(bestMode) ? "Raggiungibile in bus" : "Raggiungibile a piedi";
            }
            if (e.affected() && "BUS".equals(bestMode)) note += " · linea con disservizio";
            rows.add(new Row(selected ? ++rank : 0, distanceRank, displayName(c), (int) Math.round(c.distanceMeters),
                    c.profile.maxTaskDistanceMeters, within, e.walk(), e.bus(), e.busSummary(), e.delay(), e.crowding(),
                    bestMode, e.best(), selected, selected && !within, e.affected(), note));
        }
        rows.sort(Comparator.comparingInt((Row r) -> r.selected() ? 0 : 1).thenComparingInt(r -> r.selected() ? r.transitRank() : r.distanceMeters()));
        int added = (int) rows.stream().filter(Row::addedByTransit).count();
        int selectedCount = (int) rows.stream().filter(Row::selected).count();
        String explanation = "Ordinamento per tempo reale di arrivo (a piedi o in bus, ritardi inclusi) calcolato da OmniMove sulla rete CassiTrack; "
                + "a parità di tempo prevale la rotazione equa. Sono inclusi anche i volontari fuori dal proprio raggio d'azione "
                + "se raggiungono il punto di incontro in bus entro " + config.matchingMaxTransitMinutes() + " minuti.";
        return new MatchingDto(true, config.matchingMaxTransitMinutes(), byDistance.size(), selectedCount, added, rows,
                explanation, TransitService.SOURCE);
    }

    private boolean selected(Evaluated e) {
        MatchedVolunteer c = e.candidate();
        if (c.distanceMeters <= c.profile.maxTaskDistanceMeters) return true;
        return e.bus() != null && e.bus() <= config.matchingMaxTransitMinutes();
    }

    private List<Evaluated> evaluate(Task task, List<MatchedVolunteer> competent) {
        List<CtIncident> incidents = transit.incidents();
        Map<String, Boolean> accessible = transit.accessibleByVehicle();
        TransitService.PlaceDto pickup = new TransitService.PlaceDto("Punto di incontro", task.latitude, task.longitude, null);
        List<Evaluated> result = new ArrayList<>();
        for (MatchedVolunteer c : competent) {
            if (c.distanceMeters > c.profile.maxTaskDistanceMeters * MAX_RADIUS_EXTENSION) continue;
            if (!transit.covered(c.profile.latitude, c.profile.longitude)) {
                result.add(new Evaluated(c, null, null, null, 0, null, false));
                continue;
            }
            TransitService.PlaceDto home = new TransitService.PlaceDto("Zona del volontario", c.profile.latitude, c.profile.longitude, null);
            TransitService.PlanDto plan = transit.plan(home, pickup, incidents, accessible, false, null);
            Integer walk = null, bus = null;
            String summary = null, crowding = null;
            int delay = 0;
            boolean affected = false;
            for (TransitService.JourneyDto j : allJourneys(plan)) {
                if (j.mode().equals("WALK")) walk = j.durationMinutes();
                if (j.mode().equals("BUS")) {
                    bus = j.durationMinutes();
                    summary = j.summary();
                    delay = j.delayMinutes();
                    crowding = j.crowdingLevel();
                    affected = !j.incidentIds().isEmpty();
                }
            }
            result.add(new Evaluated(c, walk, bus, summary, delay, crowding, affected));
        }
        result.sort(Comparator
                .comparingInt((Evaluated e) -> e.best() == null ? Integer.MAX_VALUE : e.best())
                .thenComparingLong(e -> e.candidate().previousNotifications)
                .thenComparingDouble(e -> e.candidate().distanceMeters));
        return result;
    }

    private static List<TransitService.JourneyDto> allJourneys(TransitService.PlanDto plan) {
        List<TransitService.JourneyDto> all = new ArrayList<>();
        if (plan.recommended() != null) all.add(plan.recommended());
        all.addAll(plan.alternatives());
        return all;
    }

    private static String displayName(MatchedVolunteer c) {
        User u = User.findById(c.profile.userId);
        if (u == null || u.firstName == null) return "Volontario";
        return u.firstName + (u.lastName == null || u.lastName.isBlank() ? "" : " " + u.lastName.charAt(0) + ".");
    }
}
