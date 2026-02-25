export type NotificationStatus = "PENDING" | "ACCEPTED" | "IGNORED" | "REJECTED";

export interface TaskNotification {
	id: string;
	taskId: string;
	volunteerId: string;
	status: NotificationStatus;
	notifiedAt: string;
	respondedAt?: string;
}
