import { View, ActivityIndicator, Text, StyleSheet } from "react-native";

/**
 * OAuth callback route — handles the redirect from Keycloak after login.
 *
 * expo-auth-session captures the authorization code from the deep link and
 * feeds it to the useAuthRequest hook in AuthContext. This screen just shows
 * a loading spinner while the token exchange completes. Once authenticated,
 * AuthNavigationGuard in _layout.tsx redirects to /(tabs)/home.
 */
export default function CallbackScreen() {
	return (
		<View style={styles.container}>
			<ActivityIndicator size="large" color="#00796B" />
			<Text style={styles.text}>Accesso in corso…</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#F5F5F5",
		gap: 16,
	},
	text: {
		fontSize: 16,
		color: "#666",
		marginTop: 8,
	},
});
