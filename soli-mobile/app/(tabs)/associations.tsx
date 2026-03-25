import { View, Text, StyleSheet, ScrollView } from "react-native";

/**
 * Associations screen — placeholder for the list of active associations in the community.
 */
export default function AssociationsScreen() {
	return (
		<ScrollView style={styles.container} contentContainerStyle={styles.content}>
			<View style={styles.card}>
				<Text style={styles.cardEmoji}>🏛️</Text>
				<Text style={styles.cardTitle}>Associazioni</Text>
				<Text style={styles.cardDescription}>
					Scopri le associazioni attive nella tua comunità, esplora i loro servizi e connettiti con chi opera vicino a te.
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
		flex: 1,
		justifyContent: "center",
		padding: 24,
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
		fontSize: 56,
		marginBottom: 20,
	},
	cardTitle: {
		fontSize: 22,
		fontWeight: "700",
		color: "#11181C",
		marginBottom: 12,
	},
	cardDescription: {
		fontSize: 15,
		color: "#666666",
		textAlign: "center",
		lineHeight: 24,
	},
});
