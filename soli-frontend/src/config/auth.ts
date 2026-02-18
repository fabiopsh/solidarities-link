import { WebStorageStateStore } from "oidc-client-ts";
import type { AuthProviderProps } from "react-oidc-context";

const keycloakAuthority = import.meta.env.VITE_KEYCLOAK_URL || "http://localhost:8180/realms/soli";
const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || "soli-frontend";
const redirectUri = import.meta.env.VITE_REDIRECT_URI || window.location.origin + "/callback";

export const oidcConfig: AuthProviderProps = {
	authority: keycloakAuthority,
	client_id: clientId,
	redirect_uri: redirectUri,
	post_logout_redirect_uri: window.location.origin + "/login",
	response_type: "code",
	scope: "openid profile email",
	userStore: new WebStorageStateStore({ store: window.localStorage }),
	automaticSilentRenew: true,
};
