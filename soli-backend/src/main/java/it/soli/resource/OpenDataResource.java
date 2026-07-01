package it.soli.resource;

import it.soli.service.AnalyticsService;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Public, read-only Open Data API for smart-city analytics.
 * Access is gated by {@link OpenDataApiKeyFilter} (X-API-Key header). All
 * responses are aggregated — no personal data is exposed.
 */
@Path("/api/open/v1")
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Open Data", description = "API pubbliche di sola lettura (dati aggregati) per il contesto smart-city. Autenticazione via header X-API-Key.")
public class OpenDataResource {

    @Inject
    AnalyticsService analytics;

    private LocalDate parseDate(String s) {
        try {
            return (s == null || s.isBlank()) ? null : LocalDate.parse(s);
        } catch (Exception e) {
            return null;
        }
    }

    @GET
    @Path("/meta")
    @Operation(summary = "Metadati del dataset", description = "Versione, licenza, ultimo aggiornamento, città coperte, note privacy.")
    public Map<String, Object> meta() {
        return analytics.meta();
    }

    @GET
    @Path("/categories")
    @Operation(summary = "Riferimento categorie e moltiplicatori crediti")
    public Map<String, Object> categories() {
        return analytics.categories();
    }

    @GET
    @Path("/stats/overview")
    @Operation(summary = "Panoramica generale", description = "Totali di utenti, volontari, task per stato, crediti e riscatti.")
    public Map<String, Object> overview() {
        return analytics.overview();
    }

    @GET
    @Path("/stats/tasks/by-category")
    @Operation(summary = "Task per categoria di servizio")
    public List<Map<String, Object>> tasksByCategory() {
        return analytics.tasksByCategory();
    }

    @GET
    @Path("/stats/tasks/by-urgency")
    @Operation(summary = "Task per livello di criticità")
    public List<Map<String, Object>> tasksByUrgency() {
        return analytics.tasksByUrgency();
    }

    @GET
    @Path("/stats/tasks/by-status")
    @Operation(summary = "Task per stato")
    public List<Map<String, Object>> tasksByStatus() {
        return analytics.tasksByStatus();
    }

    @GET
    @Path("/stats/tasks/timeseries")
    @Operation(summary = "Serie temporale task creati e completati",
            description = "Parametri: from, to (YYYY-MM-DD), granularity=day|week|month.")
    public List<Map<String, Object>> tasksTimeseries(
            @QueryParam("from") String from,
            @QueryParam("to") String to,
            @QueryParam("granularity") @DefaultValue("day") String granularity) {
        return analytics.tasksTimeseries(parseDate(from), parseDate(to), granularity);
    }

    @GET
    @Path("/stats/geo/by-city")
    @Operation(summary = "Distribuzione task per città")
    public List<Map<String, Object>> geoByCity() {
        return analytics.geoByCity();
    }

    @GET
    @Path("/stats/geo/grid")
    @Operation(summary = "Heatmap aggregata (griglia coordinate)",
            description = "Conteggi per cella lat/lon arrotondata; celle con meno di 3 elementi soppresse. precision=1..4.")
    public List<Map<String, Object>> geoGrid(@QueryParam("precision") @DefaultValue("2") int precision) {
        return analytics.geoGrid(precision);
    }

    @GET
    @Path("/stats/credits")
    @Operation(summary = "Statistiche crediti (economia circolare)")
    public Map<String, Object> credits() {
        return analytics.credits();
    }

    @GET
    @Path("/stats/credits/timeseries")
    @Operation(summary = "Serie temporale crediti guadagnati e spesi")
    public List<Map<String, Object>> creditsTimeseries(
            @QueryParam("from") String from,
            @QueryParam("to") String to,
            @QueryParam("granularity") @DefaultValue("month") String granularity) {
        return analytics.creditsTimeseries(parseDate(from), parseDate(to), granularity);
    }

    @GET
    @Path("/stats/volunteering")
    @Operation(summary = "Partecipazione dei volontari")
    public Map<String, Object> volunteering() {
        return analytics.volunteering();
    }

    @GET
    @Path("/stats/impact")
    @Operation(summary = "Impatto sociale (ore, beneficiari, donazioni)")
    public Map<String, Object> impact() {
        return analytics.impact();
    }

    @GET
    @Path("/stats/charities")
    @Operation(summary = "Enti benefici e statistiche di riscatto")
    public List<Map<String, Object>> charities() {
        return analytics.charitiesStats();
    }

    @GET
    @Path("/stats/cities")
    @Operation(summary = "Confronto tra città (KPI ranking)",
            description = "Tabella comparativa per città: task, completamento, tempo di risposta, volontari, crediti.")
    public List<Map<String, Object>> cities() {
        return analytics.cities();
    }

    @GET
    @Path("/city/{city}")
    @Operation(summary = "Report analitico di una singola città",
            description = "Statistiche complete per una città: totali, completamento, tempi, volontari, ripartizione per categoria/urgenza.")
    public Map<String, Object> cityReport(@PathParam("city") String city) {
        return analytics.cityReport(city);
    }

    @GET
    @Path("/stats/demand-supply")
    @Operation(summary = "Domanda vs offerta per categoria",
            description = "Task aperti (domanda) contro volontari disponibili (offerta) per categoria: individua le carenze di copertura.")
    public List<Map<String, Object>> demandSupply() {
        return analytics.demandSupply();
    }

    @GET
    @Path("/stats/funnel")
    @Operation(summary = "Imbuto del ciclo di vita dei task",
            description = "Creati → accettati → in corso → completati, con tassi di accettazione/completamento e annullamenti/rilasci.")
    public Map<String, Object> funnel() {
        return analytics.funnel();
    }

    @GET
    @Path("/stats/tasks/by-weekday")
    @Operation(summary = "Distribuzione dei task per giorno della settimana")
    public List<Map<String, Object>> tasksByWeekday() {
        return analytics.tasksByWeekday();
    }

    @GET
    @Path("/stats/tasks/by-hour")
    @Operation(summary = "Distribuzione dei task per ora del giorno")
    public List<Map<String, Object>> tasksByHour() {
        return analytics.tasksByHour();
    }
}
