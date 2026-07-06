export interface ApiTokenView {
	id: string;
	label: string;
	tokenPrefix: string;
	scope: string;
	createdAt: string;
	expiresAt: string;
	lastUsedAt?: string;
	revoked: boolean;
	callCount: number;
	expired: boolean;
}

export interface CreatedApiToken extends ApiTokenView {
	// Plaintext key, returned only once at creation.
	key: string;
}
