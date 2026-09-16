/** Territorial mobility data from CassiTrack + OmniMove (Cassino), as exposed by SOLI's backend. */

export type CrowdingLevel = "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
export type ScheduleStatus = "ON_TIME" | "SLIGHT_DELAY" | "LATE" | "EARLY" | "SCHEDULED";
export type RouteStatus = "REGULAR" | "DELAYED" | "DISRUPTED";
export type IncidentType = "ROAD_CLOSED" | "PROTEST" | "BUS_BREAKDOWN" | "ROADWORKS" | "ACCIDENT" | "OTHER";

export interface TransitStop {
	id: string;
	name: string;
	lat: number;
	lon: number;
	routeIds: string[];
}

export interface TransitRoute {
	id: string;
	shortName: string;
	longName: string;
	color: string;
	stops: TransitStop[];
	status: RouteStatus;
	activeVehicles: number;
	maxDelayMinutes: number;
	incidentIds: string[];
}

export interface TransitVehicle {
	vehicleId: string;
	lat: number;
	lon: number;
	speedKmh: number;
	headingDeg: number;
	routeId: string;
	routeShortName: string;
	color: string;
	scheduleStatus: ScheduleStatus;
	delayMinutes: number;
	nextStopName: string;
	etaSeconds: number;
	estimatedPassengers: number;
	crowdingLevel: CrowdingLevel;
	licensePlate?: string;
	seats: number;
	accessible: boolean;
	timestamp: string;
}

export interface TransitIncident {
	id: string;
	type: IncidentType;
	severity: "LOW" | "MEDIUM" | "HIGH";
	title: string;
	description?: string;
	routeIds: string[];
	stopIds: string[];
	vehicleId?: string | null;
	lat: number;
	lon: number;
	radiusMeters: number;
	expectedDelayMinutes: number;
	detour?: string;
	source: string;
	status: string;
	reportedAt: string;
	expectedEndAt: string;
}

export interface TransitNetwork {
	city: string;
	centerLat: number;
	centerLon: number;
	radiusKm: number;
	routes: TransitRoute[];
	vehicles: TransitVehicle[];
	incidents: TransitIncident[];
	kpis: {
		fleetTotal: number;
		trackedVehicles: number;
		onTimeVehicles: number;
		onTimePercentage: number;
		avgDelayMinutes: number;
		activeIncidents: number;
	};
	source: string;
	generatedAt: string;
}

export interface TransitArrival {
	tripId: string;
	vehicleId?: string | null;
	routeId: string;
	routeShortName: string;
	routeName: string;
	color: string;
	scheduledArrival: string;
	estimatedArrival: string;
	minutes: number;
	delayMinutes: number;
	crowdingLevel?: CrowdingLevel | null;
	isRealtime: boolean;
	accessible?: boolean | null;
}

export interface JourneyLeg {
	mode: "BUS" | "WALK" | "BIKE" | "SCOOTER";
	fromName: string;
	toName: string;
	fromStopId?: string | null;
	toStopId?: string | null;
	routeId?: string | null;
	routeName?: string | null;
	vehicleId?: string | null;
	departureTime: string;
	arrivalTime: string;
	durationMinutes: number;
	distanceKm: number;
	delayMinutes: number;
	crowdingLevel?: CrowdingLevel | null;
	geometry: [number, number][];
}

export interface Journey {
	mode: "BUS" | "WALK" | "BIKE" | "SCOOTER";
	durationMinutes: number;
	costEuros: number;
	co2Grams: number;
	co2SavedGrams: number;
	greenIndex: number;
	legs: JourneyLeg[];
	dataSource: "GOOGLE_MAPS" | "CASSITRACK";
	notice?: string | null;
	summary: string;
	accessibleVehicle?: boolean | null;
	crowdingLevel?: CrowdingLevel | null;
	delayMinutes: number;
	incidentIds: string[];
	departAt?: string;
	arriveAt?: string;
}

export interface TransitPlace {
	name: string;
	lat: number;
	lon: number;
	stopId?: string | null;
}

export interface TransitPlan {
	from: TransitPlace;
	to: TransitPlace;
	distanceKm: number;
	recommended: Journey | null;
	alternatives: Journey[];
	advice: string[];
}

export interface TransitDestination {
	stopId: string;
	name: string;
	lat: number;
	lon: number;
	inferred: boolean;
	reason?: string | null;
}

export interface TaskTransit {
	covered: boolean;
	city?: string;
	pickup?: TransitPlace;
	nearbyStops: { stop: TransitStop; distanceMeters: number; walkMinutes: number; nextArrivals: TransitArrival[] }[];
	destinationOptions: TransitDestination[];
	destination?: TransitDestination | null;
	accompaniment?: TransitPlan | null;
	volunteerReach?: TransitPlan | null;
	disruptions: { incident: TransitIncident; impact: string; suggestion?: string | null }[];
	lineColors: Record<string, string>;
	source: string;
	generatedAt: string;
}

export interface TransitMatchingRow {
	transitRank: number;
	distanceRank: number;
	volunteer: string;
	distanceMeters: number;
	actionRadiusMeters: number;
	withinRadius: boolean;
	walkMinutes?: number | null;
	busMinutes?: number | null;
	busSummary?: string | null;
	busDelayMinutes: number;
	crowdingLevel?: CrowdingLevel | null;
	bestMode?: "WALK" | "BUS" | null;
	bestMinutes?: number | null;
	selected: boolean;
	addedByTransit: boolean;
	affectedByIncident: boolean;
	note: string;
}

export interface TransitMatching {
	covered: boolean;
	maxTransitMinutes: number;
	distanceOnlyCandidates: number;
	transitCandidates: number;
	addedByTransit: number;
	rows: TransitMatchingRow[];
	explanation?: string;
	source: string;
}

export interface TransitAlert {
	taskId: string;
	taskTitle: string;
	role: "VOLUNTEER" | "REQUESTER";
	scheduledAt?: string | null;
	incident: TransitIncident;
	lines: string;
	impact: string;
	suggestion: string;
}

export interface TransitAnalytics {
	summary: { activeBuses: number; tripsToday: number; onTimePercentage: number };
	co2: { co2SavedKg: number; passengerKm: number };
	fleetSize: number;
	demandByHour: { hour: number; tplAvgPassengers: number; soliAccompaniments: number }[];
	delayByRoute: {
		routeId: string;
		shortName: string;
		color: string;
		avgDelayMinutes: number;
		maxDelayMinutes: number;
		points: { routeId: string; timeSlot: string; avgDelayMinutes: number }[];
	}[];
	soliCoverage: {
		tasksInArea: number;
		mobilityTasks: number;
		tasksNearStop: number;
		nearStopPercentage: number;
		completedAccompaniments: number;
		estimatedCo2SavedKg: number;
	};
	incidents: TransitIncident[];
	source: string;
	generatedAt: string;
}
