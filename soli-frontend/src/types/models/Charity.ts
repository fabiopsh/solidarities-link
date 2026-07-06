export interface Charity {
	id: string;
	name: string;
	description?: string;
	cause: string;
	voucherLabel: string;
	costInCredits: number;
	stockRemaining: number;
	isActive: boolean;
	createdAt?: string;
}

export interface Redemption {
	id: string;
	userId: string;
	charityId: string;
	voucherCode: string;
	creditsSpent: number;
	createdAt: string;
}
