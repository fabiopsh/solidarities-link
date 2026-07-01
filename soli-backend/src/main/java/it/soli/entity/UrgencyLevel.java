package it.soli.entity;

public enum UrgencyLevel {
    LOW,
    MEDIUM,
    HIGH,
    CRITICAL;

    /**
     * Credit multiplier applied on top of the base credits-per-hour rate,
     * based on task criticality (FR-13).
     */
    public double getCreditMultiplier() {
        switch (this) {
            case CRITICAL: return 2.0;
            case HIGH:     return 1.5;
            case MEDIUM:   return 1.25;
            case LOW:
            default:       return 1.0;
        }
    }
}
