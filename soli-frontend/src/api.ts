import axios from "axios";

const keycloakAuthority = import.meta.env.VITE_KEYCLOAK_URL || "http://localhost:8180/realms/soli";
const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || "soli-frontend";
const oidcStorageKey = `oidc.user:${keycloakAuthority}:${clientId}`;

const api = axios.create({
	baseURL: import.meta.env.VITE_API_BASE_URL || "",
	headers: {
		"Content-Type": "application/json",
	},
});

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
