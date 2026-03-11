import axios from "axios";
import { setupCache } from "axios-cache-interceptor";

const keycloakAuthority = import.meta.env.VITE_KEYCLOAK_URL || "http://localhost:8180/realms/soli";
const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || "soli-frontend";
const oidcStorageKey = `oidc.user:${keycloakAuthority}:${clientId}`;

// Cache TTL for user basic info lookups (the only thing we want to cache).
// This avoids re-fetching the same user name for every TaskCard render.
export const USER_BASIC_CACHE_TTL = 1000 * 60 * 5; // 5 minutes

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
		try {
			const oidcStorageString = localStorage.getItem(oidcStorageKey);
			if (oidcStorageString) {
				const oidcData = JSON.parse(oidcStorageString);
				if (oidcData && oidcData.access_token) {
					config.headers.Authorization = `Bearer ${oidcData.access_token}`;
				}
			}
		} catch (error) {
			console.error("Error reading OIDC token from local storage:", error);
		}
		return config;
	},
	(error) => {
		return Promise.reject(error);
	},
);

export default api;
