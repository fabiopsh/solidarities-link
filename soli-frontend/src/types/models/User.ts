export type UserRole = "REQUESTER" | "VOLUNTEER" | "ADMIN";

export type CertificationLevel = "LV1_SPID" | "LV2_TRAINED" | "LV3_PARTNER";

export type UserStatus = "ACTIVE" | "SUSPENDED";

export interface User {
	id: string;
	keycloakId: string;
	email: string;
	firstName: string;
	lastName: string;
	fiscalCode?: string;
	role: UserRole;
	certificationLevel?: CertificationLevel;
	status: UserStatus;
	lastKnownLocation?: string;
	createdAt: string;
	notificationsReadAt?: string;
	updatedAt: string;
}
