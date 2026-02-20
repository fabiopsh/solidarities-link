import { useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";

/**
 * Login screen — entry point of the app.
 * Full-screen teal gradient background with centered white card.
 * Mirrors the web frontend LoginPage design.
 */
export default function LoginScreen() {
	const { isAuthenticated, isLoading, login, register } = useAuth();
	const router = useRouter();

	// If already authenticated, redirect to home
	useEffect(() => {
		if (isAuthenticated && !isLoading) {
			router.replace("/(tabs)/home");
		}
	}, [isAuthenticated, isLoading]);

	if (isLoading) {
		return (
			<LinearGradient
				colors={["#004D40", "#00796B", "#48A999"]}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={styles.loadingContainer}
			>
				<ActivityIndicator size="large" color="#FFFFFF" />
				<Text style={styles.loadingText}>Caricamento...</Text>
			</LinearGradient>
		);
	}

	if (isAuthenticated) {
		return null;
	}

	return (
		<LinearGradient
			colors={["#004D40", "#00796B", "#48A999"]}
			start={{ x: 0, y: 0 }}
			end={{ x: 1, y: 1 }}
			style={styles.container}
		>
			<View style={styles.card}>
				{/* Logo */}
				<Text style={styles.logoEmoji}>🤝</Text>
				<Text style={styles.logoText}>SoLi</Text>
				<Text style={styles.tagline}>Solidarities Link</Text>

				{/* Description */}
				<Text style={styles.description}>
					Accedi al tuo account per iniziare a fare la differenza nel tuo quartiere.
				</Text>

				{/* Login Button */}
				<TouchableOpacity onPress={login} activeOpacity={0.85}>
					<LinearGradient
						colors={["#00796B", "#48A999"]}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 1 }}
						style={styles.primaryButton}
					>
						<Text style={styles.primaryButtonText}>🔑 Accedi con Keycloak</Text>
					</LinearGradient>
				</TouchableOpacity>

				{/* Register Button */}
				<TouchableOpacity style={styles.outlinedButton} onPress={register} activeOpacity={0.7}>
					<Text style={styles.outlinedButtonText}>Registrati</Text>
				</TouchableOpacity>

				{/* Motivational quote */}
				<Text style={styles.motto}>Il desiderio di aiutare incontra il bisogno in tempo reale.</Text>
			</View>
		</LinearGradient>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		padding: 16,
	},
	loadingContainer: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		gap: 16,
	},
	loadingText: {
		color: "rgba(255,255,255,0.85)",
		fontSize: 16,
		fontWeight: "400",
		marginTop: 12,
	},
	card: {
		width: "100%",
		maxWidth: 440,
		backgroundColor: "#FFFFFF",
		borderRadius: 24,
		padding: 40,
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.18,
		shadowRadius: 32,
		elevation: 12,
	},
	logoEmoji: {
		fontSize: 56,
		marginBottom: 8,
	},
	logoText: {
		fontSize: 36,
		fontWeight: "700",
		color: "#00796B",
	},
	tagline: {
		fontSize: 16,
		color: "#666",
		marginTop: 4,
		marginBottom: 24,
	},
	description: {
		fontSize: 16,
		color: "#666",
		textAlign: "center",
		lineHeight: 24,
		marginBottom: 32,
	},
	primaryButton: {
		width: "100%",
		minWidth: 280,
		paddingVertical: 14,
		paddingHorizontal: 24,
		borderRadius: 12,
		alignItems: "center",
		marginBottom: 12,
		shadowColor: "#004D40",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 12,
		elevation: 6,
	},
	primaryButtonText: {
		color: "#FFFFFF",
		fontSize: 16,
		fontWeight: "600",
	},
	outlinedButton: {
		width: "100%",
		minWidth: 280,
		paddingVertical: 14,
		paddingHorizontal: 24,
		borderRadius: 12,
		alignItems: "center",
		borderWidth: 1.5,
		borderColor: "#00796B",
		backgroundColor: "transparent",
		marginBottom: 24,
	},
	outlinedButtonText: {
		color: "#00796B",
		fontSize: 16,
		fontWeight: "600",
	},
	motto: {
		fontSize: 12,
		color: "#999",
		textAlign: "center",
		fontStyle: "italic",
	},
});
