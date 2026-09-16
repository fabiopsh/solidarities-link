import type { CrowdingLevel, IncidentType, ScheduleStatus, TransitStop } from "../types/models/Transit";
import { haversineKm } from "./location";

export const CROWDING_CONFIG: Record<CrowdingLevel, { label: string; color: string; icon: string }> = {
	LOW: { label: "Poco affollato", color: "#2e7d32", icon: "🟢" },
	MEDIUM: { label: "Affollamento medio", color: "#f9a825", icon: "🟡" },
	HIGH: { label: "Affollato", color: "#ef6c00", icon: "🟠" },
	VERY_HIGH: { label: "Molto affollato", color: "#c62828", icon: "🔴" },
};

export const crowding = (level?: string | null) => (level ? CROWDING_CONFIG[level as CrowdingLevel] : undefined);

export const SCHEDULE_STATUS_CONFIG: Record<ScheduleStatus, { label: string; color: string }> = {
	ON_TIME: { label: "In orario", color: "#2e7d32" },
	EARLY: { label: "In anticipo", color: "#1565c0" },
	SLIGHT_DELAY: { label: "Lieve ritardo", color: "#f9a825" },
	LATE: { label: "In ritardo", color: "#c62828" },
	SCHEDULED: { label: "Da orario", color: "#757575" },
};

export const scheduleStatus = (status?: string) =>
	SCHEDULE_STATUS_CONFIG[(status as ScheduleStatus) ?? "SCHEDULED"] ?? SCHEDULE_STATUS_CONFIG.SCHEDULED;

export const INCIDENT_TYPE_CONFIG: Record<IncidentType, { label: string; emoji: string }> = {
	ROAD_CLOSED: { label: "Strada chiusa", emoji: "⛔" },
	PROTEST: { label: "Manifestazione", emoji: "📢" },
	BUS_BREAKDOWN: { label: "Guasto al mezzo", emoji: "🛠️" },
	ROADWORKS: { label: "Lavori stradali", emoji: "🚧" },
	ACCIDENT: { label: "Incidente stradale", emoji: "💥" },
	OTHER: { label: "Altro problema", emoji: "⚠️" },
};

export const incidentType = (type?: string) => INCIDENT_TYPE_CONFIG[(type as IncidentType) ?? "OTHER"] ?? INCIDENT_TYPE_CONFIG.OTHER;

export const INCIDENT_SEVERITY_COLOR: Record<string, string> = { HIGH: "#c62828", MEDIUM: "#ef6c00", LOW: "#f9a825" };

export const ROUTE_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
	REGULAR: { label: "Regolare", color: "#2e7d32" },
	DELAYED: { label: "Ritardi", color: "#ef6c00" },
	DISRUPTED: { label: "Disservizio", color: "#c62828" },
};

export const MODE_CONFIG: Record<string, { label: string; emoji: string }> = {
	BUS: { label: "Bus", emoji: "🚌" },
	WALK: { label: "A piedi", emoji: "🚶" },
	BIKE: { label: "Bici", emoji: "🚲" },
	SCOOTER: { label: "Monopattino", emoji: "🛴" },
};

export const delayColor = (minutes: number) => (minutes <= 2 ? "#2e7d32" : minutes <= 7 ? "#f9a825" : "#c62828");

export const formatClock = (iso?: string | null) =>
	iso ? new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) : "–";

export const minutesFromNow = (iso: string) => Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60000));

export const lineLabel = (shortName: string) => `Linea ${shortName}`;

/** Nearest stop of the network within {@code maxMeters}, with walking time (80 m/min on a 1.3 road factor). */
export function nearestStop(stops: TransitStop[], lat: number, lon: number, maxMeters = 700) {
	let best: { stop: TransitStop; meters: number } | null = null;
	for (const stop of stops) {
		const meters = haversineKm(lat, lon, stop.lat, stop.lon) * 1000;
		if (meters <= maxMeters && (!best || meters < best.meters)) best = { stop, meters };
	}
	return best ? { ...best, walkMinutes: Math.ceil((best.meters * 1.3) / 80) } : null;
}

export const uniqueStops = (routes: { stops: TransitStop[] }[]) => {
	const map = new Map<string, TransitStop>();
	routes.forEach((r) => r.stops.forEach((s) => map.set(s.id, s)));
	return [...map.values()];
};
