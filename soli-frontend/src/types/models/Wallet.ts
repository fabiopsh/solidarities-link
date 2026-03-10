export type TransactionType = "EARN_TASK_REWARD" | "SPEND_DONATION" | "ADJUSTMENT";

export interface Wallet {
	id: string;
	userId: string;
	balance: number;
	updatedAt: string;
}

export interface Transaction {
	id: string;
	walletId: string;
	amount: number;
	transactionType: TransactionType;
	referenceId?: string;
	timestamp: string;
}
