package it.soli.integration.urbansentinel;

import it.soli.entity.Task;
import it.soli.entity.TaskStatus;
import it.soli.integration.faro.GeoUtils;
import it.soli.integration.urbansentinel.dto.UsBuilding;
import it.soli.integration.urbansentinel.dto.UsEarthquake;
import it.soli.integration.urbansentinel.dto.UsSeismicMetrics;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Builds the post-earthquake overlay for the SOLI map from Urban Sentinel data:
 * epicentre and affected area of the event, monitored buildings in the area, each one weighted
 * by the KPIs and alert levels computed by Urban Sentinel, plus the SOLI tasks nearby.
 */
@ApplicationScoped
public class SeismicOverlayService {

    public record SeismicEventDto(String id, double magnitude, double depthKm, double latitude, double longitude,
                                  String occurredAt, String place, String province, String region, String address,
                                  int affectedRadiusKm) {
    }

    public record SensorKpiDto(String id, String name, int floor, Double peakResultantMg,
                               String eventAlertLevel, String prePostAlertLevel) {
    }

    /**
     * Only values sent by Urban Sentinel: alert levels are theirs (worst over the building's sensors),
     * accelerations are those of the most stressed sensor. No threshold is known to SOLI.
     */
    public record BuildingKpiDto(String id, String name, String buildingType, String address, String city,
                                 double latitude, double longitude, int constructionYear, String structureType,
                                 int floors, int occupants, String healthStatus,
                                 double epicentralDistanceKm, boolean analyzed, Double peakAccXMg, Double peakAccYMg,
                                 Double peakAccZMg, Double peakResultantMg, String alertLevel, String prePostAlertLevel,
                                 String worstSensor, List<SensorKpiDto> sensors, int nearbyActiveTasks) {
    }

    public record Summary(int monitoredBuildings, int red, int yellow, int green, int notAnalyzed,
                          int occupantsInRedBuildings, int occupantsInYellowBuildings, int activeTasksNearCriticalBuildings) {
    }

    public record OverlayDto(SeismicEventDto event, Summary summary, List<BuildingKpiDto> buildings,
                             String source, String generatedAt) {
    }

    private record Cached<T>(Instant at, T value) {
    }

    private static final String SELECT_METRICS = String.join(",", MockUrbanSentinelClient.METRIC_NAMES);
    private static final List<TaskStatus> ACTIVE_STATUSES =
            List.of(TaskStatus.OPEN, TaskStatus.NOTIFIED, TaskStatus.ACCEPTED, TaskStatus.IN_PROGRESS);

    @Inject
    UrbanSentinelGateway gateway;

    @Inject
    UrbanSentinelConfig config;

    private final Map<String, Cached<?>> cache = new ConcurrentHashMap<>();

    public List<SeismicEventDto> recentEvents() {
        return cached("events", () -> {
            Instant now = Instant.now().truncatedTo(ChronoUnit.SECONDS);
            String from = now.minus(config.lookbackDays(), ChronoUnit.DAYS).atOffset(ZoneOffset.UTC).toString();
            String to = now.atOffset(ZoneOffset.UTC).toString();
            return gateway.earthquakes(config.minMagnitude(), from, to).stream().map(SeismicOverlayService::toDto).toList();
        });
    }

    public Optional<OverlayDto> overlay(String eventId) {
        return recentEvents().stream().filter(e -> e.id().equals(eventId)).findFirst()
                .map(event -> cached("overlay:" + eventId, () -> buildOverlay(event)));
    }

    private OverlayDto buildOverlay(SeismicEventDto event) {
        double r = event.affectedRadiusKm();
        double dLat = r / 111.0;
        double dLon = r / (111.0 * Math.cos(Math.toRadians(event.latitude())));
        double minLat = event.latitude() - dLat, maxLat = event.latitude() + dLat;
        double minLon = event.longitude() - dLon, maxLon = event.longitude() + dLon;

        List<UsBuilding> buildings = gateway.buildings(minLat, maxLat, minLon, maxLon).stream()
                .filter(b -> distanceKm(event, b) <= r)
                .toList();
        Map<String, List<UsSeismicMetrics.Metric>> metricsByBuilding = gateway.seismicMetrics(event.id(), SELECT_METRICS)
                .metrics().stream().collect(Collectors.groupingBy(UsSeismicMetrics.Metric::buildingId));

        List<Task> tasks = Task.list("status IN ?1 AND latitude BETWEEN ?2 AND ?3 AND longitude BETWEEN ?4 AND ?5",
                ACTIVE_STATUSES, minLat, maxLat, minLon, maxLon);

        List<BuildingKpiDto> result = new ArrayList<>();
        for (UsBuilding b : buildings) {
            int nearbyTasks = (int) tasks.stream()
                    .filter(t -> t.latitude != null && t.longitude != null)
                    .filter(t -> GeoUtils.distanceMeters(b.latitude(), b.longitude(), t.latitude, t.longitude) <= config.nearTaskRadiusMeters())
                    .count();
            result.add(toBuildingKpi(event, b, metricsByBuilding.getOrDefault(b.id(), List.of()), nearbyTasks));
        }
        result.sort(Comparator
                .comparingInt((BuildingKpiDto b) -> MockUrbanSentinelClient.severity(b.alertLevel())).reversed()
                .thenComparing(b -> b.peakResultantMg() == null ? 0 : b.peakResultantMg(), Comparator.reverseOrder()));

        int red = 0, yellow = 0, green = 0, none = 0, occRed = 0, occYellow = 0, tasksNearCritical = 0;
        for (BuildingKpiDto b : result) {
            if (!b.analyzed()) {
                none++;
                continue;
            }
            switch (b.alertLevel()) {
                case "RED" -> { red++; occRed += b.occupants(); tasksNearCritical += b.nearbyActiveTasks(); }
                case "YELLOW" -> { yellow++; occYellow += b.occupants(); tasksNearCritical += b.nearbyActiveTasks(); }
                default -> green++;
            }
        }
        return new OverlayDto(event, new Summary(result.size(), red, yellow, green, none, occRed, occYellow, tasksNearCritical),
                result, "Urban Sentinel - Structural Health Monitoring", OffsetDateTime.now().toString());
    }

    private static BuildingKpiDto toBuildingKpi(SeismicEventDto event, UsBuilding b, List<UsSeismicMetrics.Metric> metrics, int nearbyTasks) {
        Map<String, Integer> floors = b.sensors().stream().collect(Collectors.toMap(UsBuilding.Sensor::id, UsBuilding.Sensor::floor));
        List<SensorKpiDto> sensors = metrics.stream()
                .sorted(Comparator.comparing(UsSeismicMetrics.Metric::sensorName))
                .map(m -> new SensorKpiDto(m.sensorId(), m.sensorName(), floors.getOrDefault(m.sensorId(), 0),
                        m.peakResultant(), m.eventAlertLevel(), m.prePostAlertLevel()))
                .toList();
        UsSeismicMetrics.Metric worst = metrics.stream()
                .filter(m -> m.peakResultant() != null)
                .max(Comparator.comparingDouble(UsSeismicMetrics.Metric::peakResultant)).orElse(null);
        String eventLevel = worstLevel(metrics.stream().map(UsSeismicMetrics.Metric::eventAlertLevel).toList());
        String prePost = worstLevel(metrics.stream().map(UsSeismicMetrics.Metric::prePostAlertLevel).toList());
        double distance = Math.round(distanceKm(event, b) * 100) / 100.0;

        if (worst == null) {
            return new BuildingKpiDto(b.id(), b.name(), b.buildingType(), b.address(), b.city(), b.latitude(), b.longitude(),
                    b.constructionYear(), b.structureType(), b.floors(), b.occupants(), b.healthStatus(),
                    distance, false, null, null, null, null, "NO_DATA", null, null, sensors, nearbyTasks);
        }
        return new BuildingKpiDto(b.id(), b.name(), b.buildingType(), b.address(), b.city(), b.latitude(), b.longitude(),
                b.constructionYear(), b.structureType(), b.floors(), b.occupants(), b.healthStatus(),
                distance, true, worst.peakAccX(), worst.peakAccY(), worst.peakAccZ(), worst.peakResultant(),
                eventLevel, prePost, worst.sensorName(), sensors, nearbyTasks);
    }

    private static String worstLevel(List<String> levels) {
        return levels.stream().filter(Objects::nonNull)
                .max(Comparator.comparingInt(MockUrbanSentinelClient::severity)).orElse(null);
    }

    private static SeismicEventDto toDto(UsEarthquake e) {
        UsEarthquake.GeoInfo g = e.geoInfo();
        int radius = (int) Math.max(10, Math.min(150, Math.round(Math.exp(e.magnitude()) / 2)));
        return new SeismicEventDto(e.id(), e.magnitude(), e.depth(), e.latitude(), e.longitude(), e.occurredAt(),
                g == null ? null : g.city(), g == null ? null : g.province(), g == null ? null : g.region(),
                g == null ? null : g.formattedAddress(), radius);
    }

    private static double distanceKm(SeismicEventDto e, UsBuilding b) {
        return GeoUtils.distanceMeters(e.latitude(), e.longitude(), b.latitude(), b.longitude()) / 1000.0;
    }

    @SuppressWarnings("unchecked")
    private <T> T cached(String key, java.util.function.Supplier<T> loader) {
        Cached<?> hit = cache.get(key);
        if (hit != null && hit.at().isAfter(Instant.now().minusSeconds(config.cacheSeconds()))) {
            return (T) hit.value();
        }
        T value = loader.get();
        cache.put(key, new Cached<>(Instant.now(), value));
        return value;
    }
}
