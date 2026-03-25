import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { SERVER_IP } from "./auth";

// ─── Base URL ─────────────────────────────────────────────────────────────────
// SERVER_IP is resolved at runtime by config/auth.ts:
//   • Expo Go / dev client  → LAN IP from Constants.expoConfig.hostUri
//   • Android emulator      → 10.0.2.2  (loopback alias for host machine)
//   • iOS simulator         → 127.0.0.1
//   • Physical device       → LAN IP (same as Expo Go)

const API_PORT = 8080; // Quarkus backend (matches docker-compose and Vite proxy target)

export const API_BASE_URL = `http://${SERVER_IP}:${API_PORT}`;

// ─── Axios instance ───────────────────────────────────────────────────────────

const api = axios.create({
	baseURL: API_BASE_URL,
	headers: {
		"Content-Type": "application/json",
	},
	// Mobile networks can be slow — 15 s is a good balance
	timeout: 15_000,
});

// ─── Request interceptor — inject JWT ────────────────────────────────────────
// Reads the access token from SecureStore on every request so the latest token
// is always used (handles token refreshes transparently).

api.interceptors.request.use(
	async (config) => {
		try {
			const token = await SecureStore.getItemAsync("soli_access_token");
			if (token) {
				config.headers.Authorization = `Bearer ${token}`;
			}
		} catch (err) {
			// SecureStore failure should not block the request — log and continue
			if (__DEV__) {
				console.warn("[api] Could not read token from SecureStore:", err);
			}
		}
		return config;
	},
	(error) => Promise.reject(error),
);

// ─── Response interceptor — structured error logging ─────────────────────────

api.interceptors.response.use(
	(response) => response,
	(error) => {
		if (__DEV__) {
			const method = error.config?.method?.toUpperCase() ?? "?";
			const url = error.config?.url ?? "";
			const status = error.response?.status ?? error.message;
			console.error(`[api] ${method} ${url} → ${status}`);
		}
		return Promise.reject(error);
	},
);

export default api;
