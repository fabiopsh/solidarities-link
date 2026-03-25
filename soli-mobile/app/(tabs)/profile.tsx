import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/context/AuthContext";

/**
 * Profile screen — shows user info, SOLI credits, and logout.
 */
export default function ProfileScreen() {
	const { user, logout } = useAuth();

	const firstName = user?.given_name ?? "";
	const lastName = user?.family_name ?? "";
	const displayName =
		user?.name || [firstName, lastName].filter(Boolean).join(" ") || user?.email || "Utente";
	const email = user?.email ?? "";

	// Up to 2 initials from the display name
	const initials = displayName
		.split(" ")
		.map((w) => w[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);

	return (
		<ScrollView style={styles.container} contentContainerStyle={styles.content}>
			{/* Avatar + name */}
			<View style={styles.avatarSection}>
				<LinearGradient
					colors={["#00796B", "#48A999"]}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
					style={styles.avatar}
				>
					<Text style={styles.avatarText}>{initials || "?"}</Text>
				</LinearGradient>
				<Text style={styles.displayName}>{displayName}</Text>
				{email ? <Text style={styles.email}>{email}</Text> : null}
			</View>

			{/* Wallet card */}
			<View style={styles.card}>
				<View style={styles.walletRow}>
					<View style={styles.walletIconWrapper}>
						<Text style={styles.walletEmoji}>💰</Text>
					</View>
					<View style={styles.walletInfo}>
						<Text style={styles.walletLabel}>Crediti SOLI</Text>
						<Text style={styles.walletValue}>—</Text>
					</View>
				</View>
			</View>

			{/* Logout */}
			<TouchableOpacity style={styles.logoutButton} onPress={logout} activeOpacity={0.7}>
				<Text style={styles.logoutText}>Esci</Text>
			</TouchableOpacity>
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
		paddingTop: 40,
		alignItems: "center",
	},
	// Avatar section
	avatarSection: {
		alignItems: "center",
		marginBottom: 32,
	},
	avatar: {
		width: 80,
		height: 80,
		borderRadius: 40,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 16,
		shadowColor: "#00796B",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.25,
		shadowRadius: 12,
		elevation: 6,
	},
	avatarText: {
		fontSize: 28,
		fontWeight: "700",
		color: "#FFFFFF",
		letterSpacing: 1,
	},
	displayName: {
		fontSize: 22,
		fontWeight: "700",
		color: "#11181C",
		marginBottom: 4,
		textAlign: "center",
	},
	email: {
		fontSize: 14,
		color: "#666666",
		textAlign: "center",
	},
	// Wallet card
	card: {
		backgroundColor: "#FFFFFF",
		borderRadius: 16,
		padding: 20,
		width: "100%",
		marginBottom: 32,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 8,
		elevation: 3,
	},
	walletRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 16,
	},
	walletIconWrapper: {
		width: 48,
		height: 48,
		borderRadius: 12,
		backgroundColor: "#FFF8E1",
		justifyContent: "center",
		alignItems: "center",
	},
	walletEmoji: {
		fontSize: 24,
	},
	walletInfo: {
		flex: 1,
	},
	walletLabel: {
		fontSize: 13,
		color: "#666666",
		marginBottom: 2,
	},
	walletValue: {
		fontSize: 22,
		fontWeight: "700",
		color: "#11181C",
	},
	// Logout
	logoutButton: {
		paddingVertical: 14,
		paddingHorizontal: 40,
		borderRadius: 12,
		borderWidth: 1.5,
		borderColor: "#D32F2F",
	},
	logoutText: {
		color: "#D32F2F",
		fontSize: 16,
		fontWeight: "600",
	},
});
