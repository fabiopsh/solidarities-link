export type AssociationRole = "ADMIN" | "MODERATOR" | "MEMBER";
export type MembershipStatus = "PENDING" | "APPROVED";

export interface Association {
  id: string;
  name: string;
  description?: string;
  accentColor?: string;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssociationMembership {
  id: string;
  associationId: string;
  userId: string;
  role: AssociationRole;
  status: MembershipStatus;
  joinedAt: string;
  updatedAt: string;
}

export interface MyAssociation {
  association: Association;
  membership: AssociationMembership;
}
