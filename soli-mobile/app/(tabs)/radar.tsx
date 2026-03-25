import { View, Text, StyleSheet, ScrollView } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SoliColors, SoliShapes } from "@/constants/theme";

/**
 * Radar screen — enhanced placeholder.
 * A full map view requires react-native-maps (not yet installed).
 */
export default function RadarScreen() {
	const insets = useSafeAreaInsets();

	return (
		<ScrollView
			style={styles.container}
			contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}
		>
			{/* Icon circle */}
			<View style={styles.iconCircle}>
				<MaterialIcons name="explore" size={48} color="#FFFFFF" />
			</View>

			<Text style={styles.title}>Radar — Prossimamente</Text>
			<Text style={styles.subtitle}>
				Scopri le richieste di aiuto aperte attorno a te su una mappa interattiva.
			</Text>

			{/* Feature list */}
			<View style={[styles.featureBox, SoliShapes.shadow.card]}>
				<Text style={styles.featureBoxTitle}>Cosa includerà</Text>
				{[
					{ icon: "map", text: "Mappa task aperti vicino a te" },
					{ icon: "tune", text: "Filtro per distanza e categoria" },
					{ icon: "navigation", text: "Navigazione GPS integrata" },
					{ icon: "notifications-active", text: "Alert task urgenti nelle vicinanze" },
				].map((f) => (
					<View key={f.text} style={styles.featureRow}>
						<MaterialIcons name={f.icon as any} size={20} color={SoliColors.primary.main} />
						<Text style={styles.featureText}>{f.text}</Text>
					</View>
				))}
			</View>

			{/* Tech note */}
			<View style={styles.techNote}>
				<MaterialIcons name="info-outline" size={15} color={SoliColors.text.disabled} />
				<Text style={styles.techNoteText}>
					Richiede l'installazione di <Text style={styles.code}>react-native-maps</Text>
				</Text>
			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: SoliColors.background.default },
	content: { alignItems: "center", paddingHorizontal: 24, paddingBottom: 48 },
	iconCircle: {
		width: 88,
		height: 88,
		borderRadius: 44,
		backgroundColor: SoliColors.primary.main,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 24,
		shadowColor: SoliColors.primary.main,
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.3,
		shadowRadius: 16,
		elevation: 8,
	},
	title: {
		fontSize: 24,
		fontWeight: "700",
		color: SoliColors.text.primary,
		textAlign: "center",
		marginBottom: 12,
	},
	subtitle: {
		fontSize: 15,
		color: SoliColors.text.secondary,
		textAlign: "center",
		lineHeight: 22,
		marginBottom: 32,
	},
	featureBox: {
		width: "100%",
		backgroundColor: SoliColors.background.paper,
		borderRadius: SoliShapes.borderRadius.card,
		padding: 20,
		borderWidth: 1.5,
		borderStyle: "dashed",
		borderColor: "#B2DFDB",
		marginBottom: 20,
		gap: 14,
	},
	featureBoxTitle: {
		fontSize: 14,
		fontWeight: "700",
		color: SoliColors.text.primary,
		marginBottom: 4,
	},
	featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
	featureText: { fontSize: 14, color: SoliColors.text.secondary },
	techNote: {
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
	},
	techNoteText: { fontSize: 12, color: SoliColors.text.disabled },
	code: { fontFamily: "monospace", fontSize: 12 },
});
