export type ServiceCategory = "MOBILITY" | "PHYSICAL_SUPPORT" | "SOCIAL" | "PET_SUPPORT" | "DIGITAL";

export interface VolunteerProfile {
	id: string;
	userId: string;
	availabilitySchedule?: string; // JSON string depending on how it's handled frontend side, or any generic object
	serviceCategories: ServiceCategory[];
	constraints?: string; // JSON string or array of strings
	maxTaskDistanceMeters: number;
	// Volunteer location preferences
	targetLocation?: string;
	latitude?: number;
	longitude?: number;
}
