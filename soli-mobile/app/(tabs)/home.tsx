import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useRole } from "@/context/RoleContext";

/**
 * Home screen — welcome dashboard.
 * Shows the current user's name, active role badge, and a placeholder card.
 */
export default function HomeScreen() {
	const { user } = useAuth();
	const { role } = useRole();

	const displayName = user?.given_name || user?.name || user?.email || "Utente";
	const isVolunteer = role === "volunteer";

	return (
		<ScrollView style={styles.container} contentContainerStyle={styles.content}>
			{/* Welcome section */}
			<View style={styles.welcomeSection}>
				<Text style={styles.welcomeText}>Ciao, {displayName}! 👋</Text>
				<Text style={styles.subtitle}>Benvenuto su SoLi</Text>

				{/* Role badge */}
				<View style={[styles.roleBadge, isVolunteer ? styles.roleBadgeVolunteer : styles.roleBadgeRequester]}>
					<Text style={[styles.roleText, isVolunteer ? styles.roleTextVolunteer : styles.roleTextRequester]}>
						{isVolunteer ? "Volontario" : "Richiedente"}
					</Text>
				</View>
			</View>

			{/* Placeholder card */}
			<View style={styles.card}>
				<Text style={styles.cardEmoji}>🚧</Text>
				<Text style={styles.cardTitle}>In costruzione</Text>
				<Text style={styles.cardDescription}>
					Questa sezione è in fase di sviluppo. Presto potrai accedere a tutte le funzionalità di SoLi
					direttamente dal tuo smartphone.
				</Text>
			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#F5F5F5",
	},
	content: {
		padding: 24,
		paddingTop: 36,
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
		color: "#666666",
		marginBottom: 16,
	},
	roleBadge: {
		alignSelf: "flex-start",
		paddingVertical: 5,
		paddingHorizontal: 14,
		borderRadius: 20,
	},
	roleBadgeVolunteer: {
		backgroundColor: "#E8F5E9",
	},
	roleBadgeRequester: {
		backgroundColor: "#FFF3E0",
	},
	roleText: {
		fontSize: 13,
		fontWeight: "600",
	},
	roleTextVolunteer: {
		color: "#2E7D32",
	},
	roleTextRequester: {
		color: "#E65100",
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
		color: "#666666",
		textAlign: "center",
		lineHeight: 22,
	},
});
