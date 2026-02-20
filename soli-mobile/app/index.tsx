import { Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { View, ActivityIndicator } from "react-native";

/**
 * Root index — redirects to the appropriate screen based on auth state.
 * Expo-router requires an index.tsx at app root as the entry point.
 */
export default function Index() {
	const { isAuthenticated, isLoading } = useAuth();

	if (isLoading) {
		return (
			<View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F5F5F5" }}>
				<ActivityIndicator size="large" color="#00796B" />
			</View>
		);
	}

	if (isAuthenticated) {
		return <Redirect href="/(tabs)/home" />;
	}

	return <Redirect href="/login" />;
}
