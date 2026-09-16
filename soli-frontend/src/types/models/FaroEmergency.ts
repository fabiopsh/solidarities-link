export type FaroEmergencyCategory = "FIRE" | "FLOOD" | "CAR_CRASH" | "HEALTH_CRISIS" | "UNKNOWN";

export type FaroSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/** Active emergency received from FARO's event stream (GET /api/integrations/faro/emergencies). */
export interface FaroEmergency {
	id: string;
	eventId: string;
	faroEmergencyId?: number;
	category: FaroEmergencyCategory;
	severity: FaroSeverity;
	latitude: number;
	longitude: number;
	address?: string;
	confidence?: number;
	hasInjured: boolean;
	hasUnconscious: boolean;
	hasTrapped: boolean;
	faroStatus?: "OPEN" | "IN_PROGRESS" | "CLOSED";
	engaged: boolean;
	riskRadiusMeters: number;
	distanceMeters?: number;
	firstSeenAt: string;
	lastUpdateAt: string;
}

export interface FaroTaskSafety {
	inRiskArea: boolean;
	nearbyEmergencies: FaroEmergency[];
}

export interface FaroSosRequest {
	emergencyCategory: FaroEmergencyCategory;
	description: string;
	hasInjured: boolean;
	hasUnconscious: boolean;
	hasTrapped: boolean;
	hasSpecialVehicleInvolved: boolean;
	hasBuildingCollapse: boolean;
}

export interface FaroSosResponse {
	httpStatus: number;
	endpoint: string;
	sentAt: string;
	report: Record<string, unknown>;
	message: string;
}
