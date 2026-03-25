import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import * as AuthSession from "expo-auth-session";
import * as SecureStore from "expo-secure-store";
import * as Linking from "expo-linking";
import { Platform } from "react-native";
import { discovery, redirectUri, scopes, keycloakConfig } from "@/config/auth";
import { setApiToken } from "@/config/api";

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserInfo {
	sub: string;
	email?: string;
	name?: string;
	given_name?: string;
	family_name?: string;
	preferred_username?: string;
}

interface AuthContextType {
	isAuthenticated: boolean;
	isLoading: boolean;
	accessToken: string | null;
	user: UserInfo | null;
	login: () => Promise<void>;
	register: () => Promise<void>;
	logout: () => Promise<void>;
}

// ─── Secure Store Keys ───────────────────────────────────────────────────────

const TOKEN_KEY = "soli_access_token";
const REFRESH_TOKEN_KEY = "soli_refresh_token";
const USER_KEY = "soli_user_info";

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Hook to access authentication state and actions.
 */
export function useAuth(): AuthContextType {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Decode a JWT payload without verifying the signature (client-side only).
 */
function decodeJwtPayload(token: string): Record<string, unknown> {
	try {
		const base64 = token.split(".")[1];
		const json = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
		return JSON.parse(json);
	} catch {
		return {};
	}
}

/**
 * Extract user info from an ID token or access token payload.
 */
function extractUserInfo(idToken: string): UserInfo {
	const payload = decodeJwtPayload(idToken);
	return {
		sub: (payload.sub as string) || "",
		email: payload.email as string | undefined,
		name: payload.name as string | undefined,
		given_name: payload.given_name as string | undefined,
		family_name: payload.family_name as string | undefined,
		preferred_username: payload.preferred_username as string | undefined,
	};
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [isLoading, setIsLoading] = useState(true);
	const [accessToken, setAccessToken] = useState<string | null>(null);
	const [user, setUser] = useState<UserInfo | null>(null);
	const isRestoringSession = useRef(true);

	const isAuthenticated = !!accessToken;

	// ─── Build OIDC auth request ─────────────────────────────────────────────

	const [request, response, promptAsync] = AuthSession.useAuthRequest(
		{
			clientId: keycloakConfig.clientId,
			redirectUri,
			scopes,
			usePKCE: true,
			responseType: AuthSession.ResponseType.Code,
		},
		discovery,
	);

	// ─── Handle auth response ────────────────────────────────────────────────

	useEffect(() => {
		if (isRestoringSession.current) return;

		if (response?.type === "success" && response.params.code) {
			exchangeCodeForToken(response.params.code, request?.codeVerifier || "");
		}
	}, [response]);

	/**
	 * Exchange authorization code for tokens via Keycloak token endpoint.
	 */
	async function exchangeCodeForToken(code: string, codeVerifier: string) {
		try {
			const tokenResult = await AuthSession.exchangeCodeAsync(
				{
					clientId: keycloakConfig.clientId,
					code,
					redirectUri,
					extraParams: {
						code_verifier: codeVerifier,
					},
				},
				discovery,
			);

			await saveSession(tokenResult);
		} catch (error) {
			console.error("Token exchange failed:", error);
		}
	}

	/**
	 * Save tokens and user info to memory and secure storage.
	 *
	 * Order matters:
	 *  1. setApiToken()    — in-memory cache, read synchronously by the Axios
	 *                        interceptor on the very next request
	 *  2. setAccessToken() — React state update → triggers re-render / nav guard
	 *  3. SecureStore      — persisted asynchronously (may complete after the
	 *                        first API call is already in-flight)
	 */
	async function saveSession(tokenResult: AuthSession.TokenResponse) {
		const token = tokenResult.accessToken;

		// 1. In-memory first — interceptor never has to wait for SecureStore
		setApiToken(token);

		// 2. React state — navigation guard will push home screen on next render
		setAccessToken(token);

		const userInfo = extractUserInfo(tokenResult.idToken || token);
		setUser(userInfo);

		// 3. Persist (async — happens after the first render cycle)
		await SecureStore.setItemAsync(TOKEN_KEY, token);
		if (tokenResult.refreshToken) {
			await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokenResult.refreshToken);
		}
		await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userInfo));
	}

	// ─── Restore session on app start ────────────────────────────────────────

	useEffect(() => {
		restoreSession();
	}, []);

	async function restoreSession() {
		try {
			const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
			const storedUser = await SecureStore.getItemAsync(USER_KEY);
			const storedRefreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

			if (storedToken && storedUser) {
				const payload = decodeJwtPayload(storedToken);
				const exp = payload.exp as number;
				const now = Math.floor(Date.now() / 1000);

				if (exp && exp > now) {
					// Token still valid — populate in-memory cache FIRST so that
					// any API call that fires right after setAccessToken() already
					// has the token without needing to await SecureStore again.
					setApiToken(storedToken);
					setAccessToken(storedToken);
					setUser(JSON.parse(storedUser));
				} else if (storedRefreshToken) {
					// Token expired — try silent refresh (saveSession will call setApiToken)
					await refreshAccessToken(storedRefreshToken);
				} else {
					// No refresh token — force re-login
					await clearSession();
				}
			}
		} catch (error) {
			console.error("Session restore failed:", error);
			await clearSession();
		} finally {
			isRestoringSession.current = false;
			setIsLoading(false);
		}
	}

	/**
	 * Refresh access token using the stored refresh token.
	 */
	async function refreshAccessToken(refreshToken: string) {
		try {
			const tokenResult = await AuthSession.refreshAsync(
				{
					clientId: keycloakConfig.clientId,
					refreshToken,
				},
				discovery,
			);

			await saveSession(tokenResult);
		} catch (error) {
			console.error("Token refresh failed:", error);
			await clearSession();
		}
	}

	/**
	 * Clear all tokens and user info from state and secure store.
	 */
	async function clearSession() {
		setApiToken(null);
		setAccessToken(null);
		setUser(null);
		await SecureStore.deleteItemAsync(TOKEN_KEY);
		await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
		await SecureStore.deleteItemAsync(USER_KEY);
	}

	// ─── Public actions ──────────────────────────────────────────────────────

	const login = useCallback(async () => {
		if (request) {
			await promptAsync();
		}
	}, [request, promptAsync]);

	const register = useCallback(async () => {
		const registrationUrl =
			`${keycloakConfig.baseUrl}/realms/${keycloakConfig.realm}/protocol/openid-connect/registrations` +
			`?client_id=${encodeURIComponent(keycloakConfig.clientId)}` +
			`&redirect_uri=${encodeURIComponent(redirectUri)}` +
			`&response_type=code` +
			`&scope=openid%20profile%20email`;

		if (Platform.OS === "web") {
			window.location.href = registrationUrl;
		} else {
			await Linking.openURL(registrationUrl);
		}
	}, []);

	const logout = useCallback(async () => {
		await clearSession();
	}, []);

	// ─── Render ──────────────────────────────────────────────────────────────

	return (
		<AuthContext.Provider
			value={{
				isAuthenticated,
				isLoading,
				accessToken,
				user,
				login,
				register,
				logout,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}

export default AuthContext;
