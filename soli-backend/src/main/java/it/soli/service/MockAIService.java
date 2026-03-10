package it.soli.service;

import it.soli.entity.ServiceCategory;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class MockAIService {

    private static final List<String> BANNED_KEYWORDS = List.of("idiota", "truffa", "paga");

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

    public static class IntentExtractionResult {
        public ServiceCategory category;
        public String title;
        public String description;
        public String estimatedDuration;
    }

    public IntentExtractionResult extractIntent(String text) {
        IntentExtractionResult result = new IntentExtractionResult();
        if (text == null || text.isBlank()) {
            return result;
        }

        String lowerText = text.toLowerCase();

        // Very basic mock logic according to FR-05
        if (lowerText.contains("spesa") || lowerText.contains("farmacia")) {
            result.category = ServiceCategory.PHYSICAL_SUPPORT;
            result.title = "Commissioni (Spesa/Farmacia)";
            result.description = text;
            result.estimatedDuration = "1 ora";
        } else if (lowerText.contains("compagnia") || lowerText.contains("parlare") || lowerText.contains("chiacchierata")) {
            result.category = ServiceCategory.SOCIAL;
            result.title = "Richiesta di Compagnia";
            result.description = text;
            result.estimatedDuration = "2 ore";
        } else if (lowerText.contains("medico") || lowerText.contains("ospedale") || lowerText.contains("accompagnare")) {
            result.category = ServiceCategory.MOBILITY;
            result.title = "Accompagnamento Medico";
            result.description = text;
            result.estimatedDuration = "3 ore";
        } else if (lowerText.contains("computer") || lowerText.contains("telefono") || lowerText.contains("internet")) {
            result.category = ServiceCategory.DIGITAL;
            result.title = "Supporto Digitale";
            result.description = text;
            result.estimatedDuration = "1 ora";
        } else {
            result.category = ServiceCategory.PHYSICAL_SUPPORT;
            result.title = "Aiuto generico";
            result.description = text;
            result.estimatedDuration = "1 ora";
        }

        return result;
    }
}
