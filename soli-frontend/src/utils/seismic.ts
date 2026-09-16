import type { AlertLevel, SeismicEvent } from "../types/models/SeismicOverlay";

export const ALERT_LEVEL_CONFIG: Record<AlertLevel, { label: string; short: string; color: string; bg: string }> = {
	RED: { label: "Livello rosso: controllo tecnico precauzionale necessario", short: "Critico", color: "#c62828", bg: "#ffebee" },
	YELLOW: { label: "Livello giallo: richiesto monitoraggio costante", short: "Attenzione", color: "#f9a825", bg: "#fff8e1" },
	GREEN: { label: "Livello verde: nessuna criticità rilevata", short: "Normale", color: "#2e7d32", bg: "#e8f5e9" },
	NO_DATA: { label: "Nessun dato dai sensori", short: "Nessun dato", color: "#757575", bg: "#f5f5f5" },
};

export const alertLevel = (level?: string) => ALERT_LEVEL_CONFIG[(level as AlertLevel) ?? "NO_DATA"] ?? ALERT_LEVEL_CONFIG.NO_DATA;

export const BUILDING_TYPE_CONFIG: Record<string, { label: string; emoji: string }> = {
	SCHOOL: { label: "Scuola", emoji: "🏫" },
	TOWN_HALL: { label: "Municipio", emoji: "🏛️" },
	HOSPITAL: { label: "Ospedale", emoji: "🏥" },
	SPORTS_HALL: { label: "Palazzetto", emoji: "🏟️" },
};

export const buildingType = (type: string) => BUILDING_TYPE_CONFIG[type] ?? { label: "Edificio pubblico", emoji: "🏢" };

export const STRUCTURE_LABELS: Record<string, string> = {
	REINFORCED_CONCRETE: "Cemento armato",
	MASONRY: "Muratura",
	STEEL: "Acciaio",
};

export const formatMg = (value?: number) =>
	value == null ? "–" : `${value.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mg`;

export const formatEventDate = (iso: string) =>
	new Date(iso).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export const eventLabel = (e: SeismicEvent) =>
	`M ${e.magnitude.toFixed(1)} · ${e.place ?? "Evento"}${e.province ? ` (${e.province})` : ""} · ${formatEventDate(e.occurredAt)}`;
