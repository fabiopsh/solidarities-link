import * as AuthSession from "expo-auth-session";
import { Platform } from "react-native";

/**
 * Keycloak OIDC configuration for the SOLI mobile app.
 * Uses Authorization Code flow with PKCE (S256).
 */

// Keycloak server base URL — selected automatically per platform:
// - iOS Simulator: http://localhost:8180
// - Android Emulator: http://10.0.2.2:8180 (special alias for host loopback)
// - Physical device: replace with http://<YOUR_LAN_IP>:8180
const KEYCLOAK_BASE_URL = Platform.OS === "android" ? "http://10.0.2.2:8180" : "http://localhost:8180";
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
 */
export let redirectUri = AuthSession.makeRedirectUri({
	scheme: "solimobile",
	path: "callback",
});

// Fix for Expo Go on Android (Windows Emulator / LAN testing):
// makeRedirectUri() generates `exp://<LAN_IP>:8081/--/callback` dynamically.
// Keycloak rejects wildcards in the host part, so it fails on dynamic IPs.
// We force the IP to 10.0.2.2 (which is statically whitelisted in Keycloak).
if (__DEV__ && Platform.OS === "android" && redirectUri.startsWith("exp://")) {
	redirectUri = redirectUri.replace(/exp:\/\/[0-9.]+(:[0-9]+)?/, "exp://10.0.2.2$1");
}

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
