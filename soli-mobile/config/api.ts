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

// ─── In-memory token cache ────────────────────────────────────────────────────
// Mirrors the same pattern used in the web frontend (soli-frontend/src/api.ts).
//
// Race condition without this cache:
//   1. saveSession() calls setAccessToken(token) → React state updates → nav guard
//      immediately pushes the home screen
//   2. SecureStore.setItemAsync(token) is still in-flight (async)
//   3. Home screen mounts, useFocusEffect fires, interceptor reads SecureStore
//      → finds the OLD / absent token → 401
//
// With the cache:
//   AuthContext calls setApiToken(token) BEFORE awaiting SecureStore, so by
//   the time any screen makes an API call the token is already here.

let _token: string | null = null;

/**
 * Set (or clear) the in-memory token.
 * Called by AuthContext whenever the access token changes.
 */
export function setApiToken(token: string | null): void {
	_token = token;
}

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
// Priority:
//   1. In-memory token  (set synchronously by AuthContext — always up-to-date)
//   2. SecureStore      (fallback for cold-start before AuthContext has run)

api.interceptors.request.use(
	async (config) => {
		// 1. Fast path — use in-memory token if available
		if (_token) {
			config.headers.Authorization = `Bearer ${_token}`;
			return config;
		}

		// 2. Slow path — read from SecureStore (cold-start / hot-reload)
		try {
			const stored = await SecureStore.getItemAsync("soli_access_token");
			if (stored) {
				config.headers.Authorization = `Bearer ${stored}`;
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
