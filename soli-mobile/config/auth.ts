import * as AuthSession from "expo-auth-session";

/**
 * Keycloak OIDC configuration for the SOLI mobile app.
 * Uses Authorization Code flow with PKCE (S256).
 */

// Keycloak server base URL — adjust for your dev environment:
// - iOS Simulator: http://localhost:8180
// - Android Emulator: http://10.0.2.2:8180
// - Physical device: http://<YOUR_LAN_IP>:8180
const KEYCLOAK_BASE_URL = "http://localhost:8180";
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
export const redirectUri = AuthSession.makeRedirectUri({
	scheme: "solimobile",
	path: "callback",
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
