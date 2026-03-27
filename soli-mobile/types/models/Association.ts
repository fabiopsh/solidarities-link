export type MembershipRole = "ADMIN" | "MEMBER";
export type MembershipStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface Association {
	id: string;
	name: string;
	description?: string;
	accentColor?: string;
	logoUrl?: string;
	createdAt: string;
	updatedAt: string;
}

export interface AssociationMembership {
	id: string;
	associationId: string;
	userId: string;
	role: MembershipRole;
	status: MembershipStatus;
	joinedAt?: string;
	createdAt: string;
}

/** Shape returned by GET /api/associations/my */
export interface MyAssociation {
	association: Association;
	membership: AssociationMembership;
}

/** Shape returned by GET /api/associations/:id (includes members list) */
export interface AssociationDetailResponse {
	association: Association;
	members: AssociationMembership[];
}
