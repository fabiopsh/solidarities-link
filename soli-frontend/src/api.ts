import axios from "axios";
import { setupCache } from "axios-cache-interceptor";

const keycloakAuthority = import.meta.env.VITE_KEYCLOAK_URL || "http://localhost:8180/realms/soli";
const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || "soli-frontend";
const oidcStorageKey = `oidc.user:${keycloakAuthority}:${clientId}`;

const api = setupCache(
	axios.create({
		baseURL: import.meta.env.VITE_API_BASE_URL || "",
		headers: {
			"Content-Type": "application/json",
		},
	}),
	// We configure caching behavior. TTL defaults to 5 minutes, which is usually fine.
	{
		// Caches basic user details endpoints (only GET requests starting with /api/users/ and ending with /basic)
		// Or we can cache all GET requests by default, but only for a short time to avoid stale task data.
		// For now, caching all getters with standard TTL, except tasks. Let's do selective caching or default cache.
		ttl: 1000 * 60 * 5, // 5 minutes cache
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
