export type ReportStatus = "OPEN" | "INVESTIGATING" | "RESOLVED" | "DISMISSED";

export interface Report {
	id: string;
	taskId?: string;
	reporterId: string;
	reportedUserId: string;
	reason: string;
	status: ReportStatus;
	createdAt: string;
	resolvedAt?: string;
}

export type AuditEntityType = "TASK" | "WALLET" | "USER";

export interface AuditLog {
	id: string;
	entityType: AuditEntityType;
	entityId: string;
	action: string;
	oldValue?: string; // or any/unknown JSON type
	newValue?: string; // or any/unknown JSON type
	actorId?: string;
	timestamp: string;
}
