import axios from "axios";
import { setupCache } from "axios-cache-interceptor";

const keycloakAuthority = import.meta.env.VITE_KEYCLOAK_URL || "http://localhost:8180/realms/soli";
const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || "soli-frontend";
const oidcStorageKey = `oidc.user:${keycloakAuthority}:${clientId}`;

// Cache TTL for user basic info lookups (the only thing we want to cache).
// This avoids re-fetching the same user name for every TaskCard render.
export const USER_BASIC_CACHE_TTL = 1000 * 60 * 5; // 5 minutes
export const IMAGE_CACHE_TTL = 1000 * 60 * 60; // 1 hour

// In-memory token set synchronously via useLayoutEffect in ProtectedRoute,
// before any useEffect (fetch) can fire in child components.
// This avoids a race condition where oidc-client-ts updates React state
// before writing to localStorage, causing the interceptor to find no token.
let _accessToken: string | null = null;
export function setAccessToken(token: string | null) {
	_accessToken = token;
}

const api = setupCache(
	axios.create({
		baseURL: import.meta.env.VITE_API_BASE_URL || "",
		headers: {
			"Content-Type": "application/json",
		},
	}),
	{
		// No caching by default — every request hits the server for fresh data.
		// Individual calls can opt-in by passing { cache: { ttl: USER_BASIC_CACHE_TTL } }.
		ttl: 0,
	}
);

api.interceptors.request.use(
	(config) => {
		// Prefer the in-memory token (set synchronously by ProtectedRoute before
		// any fetch effect runs) to avoid the post-login race condition with localStorage.
		const token = _accessToken ?? (() => {
			try {
				const raw = localStorage.getItem(oidcStorageKey);
				if (raw) {
					const parsed = JSON.parse(raw);
					return parsed?.access_token ?? null;
				}
			} catch {
				// ignore
			}
			return null;
		})();

		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	(error) => {
		return Promise.reject(error);
	},
);

export default api;
