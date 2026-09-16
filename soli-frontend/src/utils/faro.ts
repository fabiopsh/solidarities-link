import type { FaroEmergency, FaroEmergencyCategory, FaroSeverity } from "../types/models/FaroEmergency";
import { haversineKm } from "./location";

export const FARO_CATEGORY_CONFIG: Record<FaroEmergencyCategory, { label: string; emoji: string; color: string }> = {
	FIRE: { label: "Incendio", emoji: "🔥", color: "#e65100" },
	FLOOD: { label: "Alluvione", emoji: "🌊", color: "#0277bd" },
	HEALTH_CRISIS: { label: "Emergenza sanitaria", emoji: "🚑", color: "#c62828" },
	CAR_CRASH: { label: "Incidente stradale", emoji: "💥", color: "#6d4c41" },
	UNKNOWN: { label: "Emergenza", emoji: "⚠️", color: "#616161" },
};

export const FARO_SEVERITY_CONFIG: Record<FaroSeverity, { label: string; color: string; muiColor: "default" | "info" | "warning" | "error" }> = {
	LOW: { label: "Bassa", color: "#fbc02d", muiColor: "default" },
	MEDIUM: { label: "Media", color: "#fb8c00", muiColor: "warning" },
	HIGH: { label: "Alta", color: "#e53935", muiColor: "error" },
	CRITICAL: { label: "Critica", color: "#b71c1c", muiColor: "error" },
};

export const faroCategory = (c?: string) => FARO_CATEGORY_CONFIG[(c as FaroEmergencyCategory) ?? "UNKNOWN"] ?? FARO_CATEGORY_CONFIG.UNKNOWN;
export const faroSeverity = (s?: string) => FARO_SEVERITY_CONFIG[(s as FaroSeverity) ?? "MEDIUM"] ?? FARO_SEVERITY_CONFIG.MEDIUM;

/** Emergencies whose risk perimeter contains the point. */
export function emergenciesCovering(emergencies: FaroEmergency[], lat?: number, lng?: number): FaroEmergency[] {
	if (lat == null || lng == null) return [];
	return emergencies.filter((e) => haversineKm(lat, lng, e.latitude, e.longitude) * 1000 <= e.riskRadiusMeters);
}
