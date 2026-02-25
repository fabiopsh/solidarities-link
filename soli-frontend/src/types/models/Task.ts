import type { ServiceCategory } from "./VolunteerProfile";

export type UrgencyLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type TaskStatus = "OPEN" | "NOTIFIED" | "ACCEPTED" | "IN_PROGRESS" | "COMPLETED" | "RELEASED" | "CANCELLED";

export interface Task {
	id: string;
	creatorId: string;
	beneficiaryId: string;
	volunteerId?: string;
	category: ServiceCategory;
	title: string;
	description?: string;
	urgencyLevel: UrgencyLevel;
	scheduledAt?: string;
	targetLocation?: string;
	targetAddress?: string;
	status: TaskStatus;
	checkInToken?: string;
	checkOutToken?: string;
	rewardCredits: number;
	createdAt: string;
	updatedAt: string;
}
