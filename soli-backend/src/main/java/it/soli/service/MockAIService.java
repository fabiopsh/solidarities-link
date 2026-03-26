package it.soli.service;

import it.soli.entity.ServiceCategory;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@ApplicationScoped
public class MockAIService {

    // ── Urgency levels ──────────────────────────────────────────────────
    public enum UrgencyLevel {
        CRITICAL,  // immediate need
        HIGH,      // today / asap
        MEDIUM,    // tomorrow / this week
        LOW        // default
    }

    private static final Map<UrgencyLevel, List<String>> URGENCY_KEYWORDS = new LinkedHashMap<>();
    static {
        URGENCY_KEYWORDS.put(UrgencyLevel.CRITICAL, List.of(
                "urgente", "urgenza", "subito", "emergenza",
                "immediatamente", "adesso", "ora", "aiuto subito",
                "sos", "grave", "gravissimo"));
        URGENCY_KEYWORDS.put(UrgencyLevel.HIGH, List.of(
                "oggi", "prima possibile", "appena puoi",
                "al più presto", "stamattina", "stasera",
                "questo pomeriggio", "entro oggi"));
        URGENCY_KEYWORDS.put(UrgencyLevel.MEDIUM, List.of(
                "domani", "dopodomani", "questa settimana",
                "prossimi giorni", "fra poco", "settimana prossima",
                "il prossimo"));
    }

    // ── Date extraction patterns ────────────────────────────────────────
    // dd/mm/yyyy or dd-mm-yyyy (year optional)
    private static final Pattern DATE_NUMERIC_PATTERN =
            Pattern.compile("\\b(\\d{1,2}[/\\-]\\d{1,2}(?:[/\\-]\\d{2,4})?)\\b");

    // Time patterns: "alle 15", "alle 15:30", "ore 14", "ore 9:00", "alle ore 10"
    private static final Pattern TIME_PATTERN =
            Pattern.compile("(?:alle(?:\\s+ore)?|ore)\\s+(\\d{1,2})(?:[:.]?(\\d{2}))?", Pattern.CASE_INSENSITIVE);

    private static final List<String> RELATIVE_DATE_KEYWORDS = List.of(
            "oggi", "domani", "dopodomani",
            "la prossima settimana", "settimana prossima",
            "il prossimo mese", "mese prossimo",
            "fra un'ora", "tra un'ora",
            "fra due giorni", "tra due giorni",
            "fra una settimana", "tra una settimana");

    private static final List<String> WEEKDAY_KEYWORDS = List.of(
            "lunedì", "martedì", "mercoledì", "giovedì",
            "venerdì", "sabato", "domenica");

    private static final Map<String, DayOfWeek> WEEKDAY_MAP = Map.of(
            "lunedì", DayOfWeek.MONDAY,
            "martedì", DayOfWeek.TUESDAY,
            "mercoledì", DayOfWeek.WEDNESDAY,
            "giovedì", DayOfWeek.THURSDAY,
            "venerdì", DayOfWeek.FRIDAY,
            "sabato", DayOfWeek.SATURDAY,
            "domenica", DayOfWeek.SUNDAY
    );

    // ── Category keywords ───────────────────────────────────────────────
    private static final List<String> PHYSICAL_SUPPORT_KEYWORDS = List.of(
            "spesa", "farmacia", "supermercato", "pacco", "busta",
            "pesante", "portare", "spostare", "pulizia", "pulire",
            "stirare", "cucinare", "pasto", "lavanderia", "bolletta",
            "ufficio postale", "posta", "commissione", "commissioni",
            "riparare", "riparazione", "montare", "montaggio",
            "giardinaggio", "giardino", "innaffiare", "pianta");

    private static final List<String> SOCIAL_KEYWORDS = List.of(
            "compagnia", "parlare", "chiacchierata", "chiacchierare",
            "solitudine", "solo", "sola", "visita", "visitare",
            "caffè", "passeggiata", "gioco", "giocare", "carte",
            "ascoltare", "amicizia", "festa", "compleanno",
            "conversazione", "telefonata", "pranzo insieme",
            "cena insieme", "tenersi compagnia", "uscire insieme");

    private static final List<String> MOBILITY_KEYWORDS = List.of(
            "medico", "ospedale", "accompagnare", "accompagnamento",
            "dottore", "visita medica", "clinica", "fisioterapia",
            "analisi", "esame", "esami", "trasporto", "guidare",
            "passaggio", "stazione", "aeroporto", "autobus",
            "treno", "prelievo", "ricetta", "ambulatorio",
            "pronto soccorso", "terapia", "riabilitazione");

    private static final List<String> PET_SUPPORT_KEYWORDS = List.of(
            "cane", "cani", "gatto", "gatti", "animale", "animali",
            "veterinario", "dog sitter", "cat sitter", "pet sitter",
            "pet", "cucciolo", "croccantini", "guinzaglio",
            "passeggiata cane", "portare fuori il cane",
            "dare da mangiare", "lettiera", "gabbia",
            "acquario", "pappagallo", "coniglio", "tartaruga");

    private static final List<String> DIGITAL_KEYWORDS = List.of(
            "computer", "telefono", "internet", "password",
            "app", "email", "e-mail", "stampante", "stampare",
            "wifi", "wi-fi", "tablet", "smartphone", "cellulare",
            "sito", "sito web", "account", "aggiornamento",
            "aggiornare", "spid", "pec", "videochiamare",
            "videochiamata", "whatsapp", "messaggio", "sms",
            "installare", "scaricare", "download", "profilo",
            "registrazione", "login", "accesso", "cie",
            "firma digitale", "fascicolo sanitario");

    // ── Dynamic title mapping (keyword → readable label) ───────────────
    private static final Map<ServiceCategory, Map<String, String>> TITLE_HINTS = new LinkedHashMap<>();
    static {
        Map<String, String> physical = new LinkedHashMap<>();
        physical.put("spesa", "Spesa");
        physical.put("supermercato", "Spesa al supermercato");
        physical.put("farmacia", "Ritiro in farmacia");
        physical.put("pacco", "Ritiro/consegna pacco");
        physical.put("pulizia", "Pulizie domestiche");
        physical.put("pulire", "Pulizie domestiche");
        physical.put("cucinare", "Preparazione pasti");
        physical.put("pasto", "Preparazione pasti");
        physical.put("bolletta", "Pagamento bollette");
        physical.put("stirare", "Aiuto con lo stiro");
        physical.put("riparare", "Piccola riparazione");
        physical.put("giardinaggio", "Giardinaggio");
        physical.put("giardino", "Giardinaggio");
        TITLE_HINTS.put(ServiceCategory.PHYSICAL_SUPPORT, physical);

        Map<String, String> social = new LinkedHashMap<>();
        social.put("compagnia", "Richiesta di Compagnia");
        social.put("parlare", "Richiesta di Compagnia");
        social.put("chiacchierata", "Chiacchierata");
        social.put("solitudine", "Richiesta di Compagnia");
        social.put("caffè", "Caffè insieme");
        social.put("passeggiata", "Passeggiata insieme");
        social.put("festa", "Invito a festa");
        social.put("compleanno", "Invito a compleanno");
        social.put("carte", "Gioco di carte");
        TITLE_HINTS.put(ServiceCategory.SOCIAL, social);

        Map<String, String> mobility = new LinkedHashMap<>();
        mobility.put("medico", "Accompagnamento dal medico");
        mobility.put("dottore", "Accompagnamento dal dottore");
        mobility.put("ospedale", "Accompagnamento in ospedale");
        mobility.put("fisioterapia", "Accompagnamento fisioterapia");
        mobility.put("analisi", "Accompagnamento per analisi");
        mobility.put("esame", "Accompagnamento per esami");
        mobility.put("stazione", "Passaggio alla stazione");
        mobility.put("aeroporto", "Passaggio in aeroporto");
        mobility.put("pronto soccorso", "Accompagnamento al pronto soccorso");
        TITLE_HINTS.put(ServiceCategory.MOBILITY, mobility);

        Map<String, String> pet = new LinkedHashMap<>();
        pet.put("cane", "Assistenza per il cane");
        pet.put("cani", "Assistenza per i cani");
        pet.put("gatto", "Assistenza per il gatto");
        pet.put("gatti", "Assistenza per i gatti");
        pet.put("veterinario", "Accompagnamento dal veterinario");
        pet.put("cucciolo", "Assistenza per cucciolo");
        pet.put("croccantini", "Acquisto cibo per animali");
        pet.put("dog sitter", "Dog sitting");
        pet.put("cat sitter", "Cat sitting");
        TITLE_HINTS.put(ServiceCategory.PET_SUPPORT, pet);

        Map<String, String> digital = new LinkedHashMap<>();
        digital.put("computer", "Supporto con il computer");
        digital.put("telefono", "Supporto con il telefono");
        digital.put("password", "Recupero password");
        digital.put("email", "Aiuto con l'email");
        digital.put("e-mail", "Aiuto con l'email");
        digital.put("stampante", "Aiuto con la stampante");
        digital.put("spid", "Assistenza SPID");
        digital.put("pec", "Assistenza PEC");
        digital.put("whatsapp", "Aiuto con WhatsApp");
        digital.put("videochiamata", "Aiuto con videochiamata");
        digital.put("videochiamare", "Aiuto con videochiamata");
        digital.put("app", "Aiuto con un'app");
        digital.put("wifi", "Problemi con il WiFi");
        digital.put("internet", "Problemi con internet");
        digital.put("firma digitale", "Assistenza firma digitale");
        digital.put("fascicolo sanitario", "Accesso fascicolo sanitario");
        TITLE_HINTS.put(ServiceCategory.DIGITAL, digital);
    }

    // ── Default titles (fallback per categoria) ─────────────────────────
    private static final Map<ServiceCategory, String> DEFAULT_TITLES = Map.of(
            ServiceCategory.PHYSICAL_SUPPORT, "Aiuto fisico generico",
            ServiceCategory.SOCIAL,           "Richiesta di Compagnia",
            ServiceCategory.MOBILITY,         "Accompagnamento",
            ServiceCategory.PET_SUPPORT,      "Assistenza animali",
            ServiceCategory.DIGITAL,          "Supporto Digitale"
    );

    // ── Default estimated durations ─────────────────────────────────────
    private static final Map<ServiceCategory, String> DEFAULT_DURATIONS = Map.of(
            ServiceCategory.PHYSICAL_SUPPORT, "1 ora",
            ServiceCategory.SOCIAL,           "2 ore",
            ServiceCategory.MOBILITY,         "3 ore",
            ServiceCategory.PET_SUPPORT,      "1 ora",
            ServiceCategory.DIGITAL,          "1 ora"
    );

    // ── Banned keywords for content moderation ──────────────────────────
    private static final List<String> BANNED_KEYWORDS = List.of(
            // insults
            "idiota", "stupido", "cretino", "imbecille",
            "deficiente", "scemo",
            // vulgar
            "fottiti", "cazzo", "stronzo", "vaffanculo", "merda",
            "minchia", "coglione",
            // scam / financial
            "truffa", "truffatore", "paga", "vendere",
            "soldi", "pagamento", "bonifico",
            "carta di credito", "iban", "denaro",
            // threats
            "ammazzare", "uccidere", "picchiare", "minaccia");

    // ── Result class ────────────────────────────────────────────────────
    public static class IntentExtractionResult {
        public ServiceCategory category;
        public String title;
        public String description;
        public String estimatedDuration;
        public UrgencyLevel urgency;
        public String extractedDate;
        /** Resolved ISO datetime string (e.g. "2026-03-27T15:00:00") */
        public String scheduledAt;
    }

    // ── Public API ──────────────────────────────────────────────────────

    /**
     * Check if a message is safe (not containing banned words).
     */
    public boolean isMessageSafe(String text) {
        if (text == null || text.isBlank()) {
            return true;
        }
        String lowerText = text.toLowerCase();
        for (String keyword : BANNED_KEYWORDS) {
            if (lowerText.contains(keyword)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Extract intent, urgency, and date from free-text Italian input.
     */
    public IntentExtractionResult extractIntent(String text) {
        IntentExtractionResult result = new IntentExtractionResult();
        if (text == null || text.isBlank()) {
            result.urgency = UrgencyLevel.LOW;
            return result;
        }

        String lowerText = text.toLowerCase();

        // 1. Detect category + dynamic title
        result.category = detectCategory(lowerText);
        result.title = buildTitle(lowerText, result.category);
        result.description = text;
        result.estimatedDuration = DEFAULT_DURATIONS.getOrDefault(
                result.category, "1 ora");

        // 2. Detect urgency
        result.urgency = detectUrgency(lowerText);

        // 3. Extract date references
        result.extractedDate = extractDate(lowerText);

        // 4. Resolve to ISO datetime for the frontend datepicker
        result.scheduledAt = resolveToIsoDateTime(lowerText, result.extractedDate);

        return result;
    }

    // ── Internal helpers ────────────────────────────────────────────────

    private ServiceCategory detectCategory(String lowerText) {
        // Evaluate categories in a meaningful order.
        // PET_SUPPORT before SOCIAL because "passeggiata cane" should not
        // match SOCIAL's "passeggiata" first.
        if (containsAny(lowerText, PET_SUPPORT_KEYWORDS))     return ServiceCategory.PET_SUPPORT;
        if (containsAny(lowerText, MOBILITY_KEYWORDS))         return ServiceCategory.MOBILITY;
        if (containsAny(lowerText, DIGITAL_KEYWORDS))          return ServiceCategory.DIGITAL;
        if (containsAny(lowerText, SOCIAL_KEYWORDS))           return ServiceCategory.SOCIAL;
        if (containsAny(lowerText, PHYSICAL_SUPPORT_KEYWORDS)) return ServiceCategory.PHYSICAL_SUPPORT;

        // Fallback
        return ServiceCategory.PHYSICAL_SUPPORT;
    }

    private String buildTitle(String lowerText, ServiceCategory category) {
        Map<String, String> hints = TITLE_HINTS.get(category);
        if (hints != null) {
            for (Map.Entry<String, String> entry : hints.entrySet()) {
                if (lowerText.contains(entry.getKey())) {
                    return entry.getValue();
                }
            }
        }
        return DEFAULT_TITLES.getOrDefault(category, "Aiuto generico");
    }

    private UrgencyLevel detectUrgency(String lowerText) {
        // Check from highest to lowest priority — early return on first match
        for (Map.Entry<UrgencyLevel, List<String>> entry : URGENCY_KEYWORDS.entrySet()) {
            for (String keyword : entry.getValue()) {
                if (lowerText.contains(keyword)) {
                    return entry.getKey();
                }
            }
        }
        return UrgencyLevel.LOW;
    }

    private String extractDate(String lowerText) {
        // 1. Try numeric dates first (e.g. 25/03/2026)
        Matcher matcher = DATE_NUMERIC_PATTERN.matcher(lowerText);
        if (matcher.find()) {
            return matcher.group(1);
        }

        // 2. Try relative date expressions (longer phrases first)
        for (String keyword : RELATIVE_DATE_KEYWORDS) {
            if (lowerText.contains(keyword)) {
                return keyword;
            }
        }

        // 3. Try weekday names
        for (String day : WEEKDAY_KEYWORDS) {
            if (lowerText.contains(day)) {
                return day;
            }
        }

        return null;
    }

    /**
     * Extract an explicit time reference from the text (e.g. "alle 15:30", "ore 9").
     * Returns a LocalTime or null if no time is found.
     */
    private LocalTime extractTime(String lowerText) {
        Matcher matcher = TIME_PATTERN.matcher(lowerText);
        if (matcher.find()) {
            int hour = Integer.parseInt(matcher.group(1));
            int minute = matcher.group(2) != null ? Integer.parseInt(matcher.group(2)) : 0;
            if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
                return LocalTime.of(hour, minute);
            }
        }
        return null;
    }

    /**
     * Resolve the extractedDate label + any time reference into an ISO datetime string.
     * Ensures the result is at least 1 hour in the future.
     */
    private String resolveToIsoDateTime(String lowerText, String extractedDate) {
        if (extractedDate == null) {
            return null;
        }

        LocalDateTime now = LocalDateTime.now();
        LocalTime explicitTime = extractTime(lowerText);
        LocalTime defaultTime = LocalTime.of(10, 0); // fallback: 10:00
        LocalDate resolvedDate = null;

        // ── Relative expressions ────────────────────────────────────
        switch (extractedDate) {
            case "oggi":
                resolvedDate = now.toLocalDate();
                if (explicitTime == null) {
                    // Default to 2 hours from now, rounded to next half-hour
                    LocalTime shifted = now.toLocalTime().plusHours(2);
                    int min = shifted.getMinute() < 30 ? 30 : 0;
                    int hr = min == 0 ? shifted.getHour() + 1 : shifted.getHour();
                    explicitTime = LocalTime.of(Math.min(hr, 23), min);
                }
                break;
            case "domani":
                resolvedDate = now.toLocalDate().plusDays(1);
                break;
            case "dopodomani":
                resolvedDate = now.toLocalDate().plusDays(2);
                break;
            case "fra un'ora": case "tra un'ora":
                return enforceMinimum(now.plusHours(1));
            case "fra due giorni": case "tra due giorni":
                resolvedDate = now.toLocalDate().plusDays(2);
                break;
            case "fra una settimana": case "tra una settimana":
            case "la prossima settimana": case "settimana prossima":
                resolvedDate = now.toLocalDate().plusWeeks(1);
                break;
            case "il prossimo mese": case "mese prossimo":
                resolvedDate = now.toLocalDate().plusMonths(1);
                break;
            default:
                // Check if it's a weekday name
                DayOfWeek targetDay = WEEKDAY_MAP.get(extractedDate);
                if (targetDay != null) {
                    resolvedDate = nextOccurrence(now.toLocalDate(), targetDay);
                } else {
                    // Try to parse numeric date (dd/mm or dd/mm/yyyy)
                    resolvedDate = parseNumericDate(extractedDate);
                }
                break;
        }

        if (resolvedDate == null) {
            return null;
        }

        LocalTime time = explicitTime != null ? explicitTime : defaultTime;
        LocalDateTime resolved = LocalDateTime.of(resolvedDate, time);

        return enforceMinimum(resolved);
    }

    /**
     * Parse a numeric date string like "27/03" or "27/03/2026".
     */
    private LocalDate parseNumericDate(String dateStr) {
        try {
            String[] parts = dateStr.split("[/\\-]");
            int day = Integer.parseInt(parts[0]);
            int month = Integer.parseInt(parts[1]);
            int year = parts.length >= 3 ? Integer.parseInt(parts[2]) : LocalDate.now().getYear();
            // Handle 2-digit years
            if (year < 100) {
                year += 2000;
            }
            return LocalDate.of(year, month, day);
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Find the next occurrence of a given day of week (at least 1 day ahead).
     */
    private LocalDate nextOccurrence(LocalDate from, DayOfWeek target) {
        LocalDate next = from.plusDays(1);
        while (next.getDayOfWeek() != target) {
            next = next.plusDays(1);
        }
        return next;
    }

    /**
     * Ensure the datetime is at least 1 hour in the future.
     * Returns an ISO-8601 string without seconds.
     */
    private String enforceMinimum(LocalDateTime dateTime) {
        LocalDateTime minimum = LocalDateTime.now().plusHours(1);
        if (dateTime.isBefore(minimum)) {
            dateTime = minimum;
        }
        return dateTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm"));
    }

    private boolean containsAny(String text, List<String> keywords) {
        for (String keyword : keywords) {
            if (text.contains(keyword)) {
                return true;
            }
        }
        return false;
    }
}
