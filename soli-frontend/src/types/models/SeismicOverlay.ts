export type AlertLevel = "GREEN" | "YELLOW" | "RED" | "NO_DATA";

/** Earthquake detected by Urban Sentinel (INGV feed). */
export interface SeismicEvent {
	id: string;
	magnitude: number;
	depthKm: number;
	latitude: number;
	longitude: number;
	occurredAt: string;
	place?: string;
	province?: string;
	region?: string;
	address?: string;
	affectedRadiusKm: number;
}

export interface SensorKpi {
	id: string;
	name: string;
	floor: number;
	peakResultantMg?: number;
	eventAlertLevel?: AlertLevel;
	prePostAlertLevel?: AlertLevel;
}

/** Monitored building weighted by the damage KPIs computed by Urban Sentinel (worst sensor). */
export interface BuildingKpi {
	id: string;
	name: string;
	buildingType: string;
	address: string;
	city: string;
	latitude: number;
	longitude: number;
	constructionYear: number;
	structureType: string;
	floors: number;
	occupants: number;
	healthStatus: string;
	epicentralDistanceKm: number;
	analyzed: boolean;
	peakAccXMg?: number;
	peakAccYMg?: number;
	peakAccZMg?: number;
	peakResultantMg?: number;
	alertLevel: AlertLevel;
	prePostAlertLevel?: AlertLevel;
	worstSensor?: string;
	sensors: SensorKpi[];
	nearbyActiveTasks: number;
}

export interface SeismicOverlay {
	event: SeismicEvent;
	summary: {
		monitoredBuildings: number;
		red: number;
		yellow: number;
		green: number;
		notAnalyzed: number;
		occupantsInRedBuildings: number;
		occupantsInYellowBuildings: number;
		activeTasksNearCriticalBuildings: number;
	};
	buildings: BuildingKpi[];
	source: string;
	generatedAt: string;
}
