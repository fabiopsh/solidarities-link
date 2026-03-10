export interface ChatSession {
	id: string;
	taskId: string;
	isActive: boolean;
	createdAt: string;
}

export interface ChatMessage {
	id: string;
	chatSessionId: string;
	senderId: string;
	content: string;
	isFlagged: boolean;
	sentAt: string;
}
