package it.soli.entity;

public enum ServiceCategory {
    MOBILITY,
    PHYSICAL_SUPPORT,
    SOCIAL,
    PET_SUPPORT,
    DIGITAL;

    /**
     * Credit multiplier applied on top of the base credits-per-hour rate,
     * based on the effort/skill typically required by the task category (FR-13).
     */
    public double getCreditMultiplier() {
        switch (this) {
            case PHYSICAL_SUPPORT: return 1.5;
            case MOBILITY:         return 1.2;
            case DIGITAL:          return 1.1;
            case PET_SUPPORT:      return 1.1;
            case SOCIAL:
            default:               return 1.0;
        }
    }
}
