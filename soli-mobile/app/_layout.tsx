import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { RoleProvider } from "@/context/RoleContext";

/**
 * Navigation guard that redirects based on authentication state.
 * - Not authenticated → /login
 * - Authenticated → /(tabs)/home
 */
function AuthNavigationGuard({ children }: { children: React.ReactNode }) {
	const { isAuthenticated, isLoading } = useAuth();
	const segments = useSegments();
	const router = useRouter();

	useEffect(() => {
		if (isLoading) return;

		const inAuthGroup = segments[0] === "login" || segments[0] === "callback";

		if (!isAuthenticated && !inAuthGroup) {
			// Not authenticated and not on login page → redirect to login
			router.replace("/login");
		} else if (isAuthenticated && inAuthGroup) {
			// Authenticated but still on login page → redirect to home
			router.replace("/(tabs)/home");
		}
	}, [isAuthenticated, isLoading, segments]);

	return <>{children}</>;
}

/**
 * Root layout — wraps the entire app with AuthProvider and navigation guard.
 */
export default function RootLayout() {
	return (
		<AuthProvider>
			<RoleProvider>
				<AuthNavigationGuard>
					<Stack screenOptions={{ headerShown: false }}>
						<Stack.Screen name="index" options={{ headerShown: false }} />
						<Stack.Screen name="login" options={{ headerShown: false }} />
						<Stack.Screen name="callback" options={{ headerShown: false, animation: "none" }} />
						<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
					</Stack>
					<StatusBar style="auto" />
				</AuthNavigationGuard>
			</RoleProvider>
		</AuthProvider>
	);
}
