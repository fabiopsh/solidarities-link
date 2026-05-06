/**
 * Format a scheduledAt ISO string for display.
 * If time is exactly 00:00, only the date is shown (no time).
 * @param isoString  ISO date-time string from the backend (e.g. "2026-04-22T00:00:00")
 * @param variant    "long" for full display, "short" for compact (card/list)
 */
export function formatScheduledAt(isoString: string, hasTime?: boolean, variant: "long" | "short" = "long"): string {
    const d = new Date(isoString);
    // Use the explicit flag if provided, otherwise fallback to guessing (for legacy data)
    const timeIsSet = hasTime != null ? hasTime : (d.getHours() !== 0 || d.getMinutes() !== 0);

    if (variant === "short") {
        const opts: Intl.DateTimeFormatOptions = {
            weekday: "short",
            month: "short",
            day: "numeric",
        };
        if (timeIsSet) {
            opts.hour = "2-digit";
            opts.minute = "2-digit";
        }
        return d.toLocaleDateString("it-IT", opts);
    }

    // long variant
    const opts: Intl.DateTimeFormatOptions = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    };
    if (timeIsSet) {
        opts.hour = "2-digit";
        opts.minute = "2-digit";
    }
    return d.toLocaleString("it-IT", opts);
}
