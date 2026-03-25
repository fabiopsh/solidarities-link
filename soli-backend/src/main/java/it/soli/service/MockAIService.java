package it.soli.service;

import it.soli.entity.ServiceCategory;
import jakarta.enterprise.context.ApplicationScoped;

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

    private boolean containsAny(String text, List<String> keywords) {
        for (String keyword : keywords) {
            if (text.contains(keyword)) {
                return true;
            }
        }
        return false;
    }
}
