export interface Reward {
	id: string;
	title: string;
	description?: string;
	costInCredits: number;
	partnerName?: string;
	stockLimit?: number;
	isActive: boolean;
}
