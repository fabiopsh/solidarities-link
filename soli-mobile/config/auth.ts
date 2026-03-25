import * as AuthSession from "expo-auth-session";
import { Platform } from "react-native";

/**
 * Keycloak OIDC configuration for the SOLI mobile app.
 * Uses Authorization Code flow with PKCE (S256).
 */

import Constants from "expo-constants";

// Helper for dynamic IP resolution to support both Emulators, Simulators and Physical Devices flawlessly
function getServerIp(): string {
	const hostUri = Constants.expoConfig?.hostUri;
	if (hostUri) {
		return hostUri.split(":")[0];
	}
	// Fallback if not running in Expo Go or hostUri is missing
	return Platform.OS === "android" ? "10.0.2.2" : "127.0.0.1";
}

export const SERVER_IP = getServerIp();

// Keycloak server base URL
const KEYCLOAK_BASE_URL = `http://${SERVER_IP}:8180`;
const REALM = "soli";
const CLIENT_ID = "soli-mobile";

export const keycloakConfig = {
	baseUrl: KEYCLOAK_BASE_URL,
	realm: REALM,
	clientId: CLIENT_ID,
};

/**
 * OIDC Discovery document endpoint for Keycloak.
 */
export const discovery: AuthSession.DiscoveryDocument = {
	authorizationEndpoint: `${KEYCLOAK_BASE_URL}/realms/${REALM}/protocol/openid-connect/auth`,
	tokenEndpoint: `${KEYCLOAK_BASE_URL}/realms/${REALM}/protocol/openid-connect/token`,
	revocationEndpoint: `${KEYCLOAK_BASE_URL}/realms/${REALM}/protocol/openid-connect/revoke`,
	endSessionEndpoint: `${KEYCLOAK_BASE_URL}/realms/${REALM}/protocol/openid-connect/logout`,
	userInfoEndpoint: `${KEYCLOAK_BASE_URL}/realms/${REALM}/protocol/openid-connect/userinfo`,
};

/**
 * Redirect URI using the `solimobile` custom scheme defined in app.json.
 * For development in Expo Go, this maps properly to your LAN IP.
 */
export const redirectUri = AuthSession.makeRedirectUri({
	scheme: "solimobile",
	path: "callback",
	preferLocalhost: true, // Force generating a localhost/127.0.0.1 URI
});

// Log the actual redirect URI so we can add it to Keycloak
console.log("🔑 SOLI Mobile Redirect URI:", redirectUri);

/**
 * Keycloak registration URL (direct link to registration form).
 */
export const registrationUrl =
	`${KEYCLOAK_BASE_URL}/realms/${REALM}/protocol/openid-connect/registrations` +
	`?client_id=${encodeURIComponent(CLIENT_ID)}` +
	`&redirect_uri=${encodeURIComponent(redirectUri)}` +
	`&response_type=code` +
	`&scope=openid%20profile%20email`;

/**
 * Requested OIDC scopes.
 */
export const scopes = ["openid", "profile", "email"];
