import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useAuth } from "@/context/AuthContext";

/**
 * Home screen — placeholder page shown after successful authentication.
 * Displays a welcome message with the user's name and a "work in progress" notice.
 */
export default function HomeScreen() {
	const { user, logout } = useAuth();

	// Build a display name: prefer given_name, fall back to name, then email
	const displayName = user?.given_name || user?.name || user?.email || "Utente";

	return (
		<View style={styles.container}>
			{/* Welcome section */}
			<View style={styles.welcomeSection}>
				<Text style={styles.welcomeText}>Ciao, {displayName}! 👋</Text>
				<Text style={styles.subtitle}>Benvenuto su SoLi</Text>
			</View>

			{/* Placeholder card */}
			<View style={styles.card}>
				<Text style={styles.cardEmoji}>🚧</Text>
				<Text style={styles.cardTitle}>In costruzione</Text>
				<Text style={styles.cardDescription}>
					Questa sezione è in fase di sviluppo. Presto potrai accedere a tutte le funzionalità di SoLi direttamente
					dal tuo smartphone.
				</Text>
			</View>

			{/* Logout button */}
			<TouchableOpacity style={styles.logoutButton} onPress={logout} activeOpacity={0.7}>
				<Text style={styles.logoutButtonText}>Esci</Text>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#F5F5F5",
		padding: 24,
		paddingTop: 60,
	},
	welcomeSection: {
		marginBottom: 32,
	},
	welcomeText: {
		fontSize: 28,
		fontWeight: "700",
		color: "#11181C",
		marginBottom: 4,
	},
	subtitle: {
		fontSize: 16,
		color: "#666",
		fontWeight: "400",
	},
	card: {
		backgroundColor: "#FFFFFF",
		borderRadius: 16,
		padding: 32,
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 8,
		elevation: 3,
		marginBottom: 32,
	},
	cardEmoji: {
		fontSize: 48,
		marginBottom: 16,
	},
	cardTitle: {
		fontSize: 20,
		fontWeight: "600",
		color: "#11181C",
		marginBottom: 8,
	},
	cardDescription: {
		fontSize: 14,
		color: "#666",
		textAlign: "center",
		lineHeight: 22,
	},
	logoutButton: {
		alignSelf: "center",
		paddingVertical: 12,
		paddingHorizontal: 32,
		borderRadius: 12,
		borderWidth: 1.5,
		borderColor: "#D32F2F",
		backgroundColor: "transparent",
	},
	logoutButtonText: {
		color: "#D32F2F",
		fontSize: 16,
		fontWeight: "600",
	},
});
