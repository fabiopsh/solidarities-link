import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import { SoliColors, SoliGradients } from "@/constants/theme";

interface EmptyStateProps {
	icon: string;
	title: string;
	subtitle?: string;
	actionLabel?: string;
	onAction?: () => void;
}

export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
	return (
		<View style={styles.container}>
			<View style={styles.iconCircle}>
				<MaterialIcons name={icon as any} size={28} color="#FFFFFF" />
			</View>
			<Text style={styles.title}>{title}</Text>
			{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
			{actionLabel && onAction ? (
				<TouchableOpacity onPress={onAction} activeOpacity={0.85} style={styles.actionWrapper}>
					<LinearGradient
						colors={SoliGradients.button}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 0 }}
						style={styles.actionButton}
					>
						<Text style={styles.actionLabel}>{actionLabel}</Text>
					</LinearGradient>
				</TouchableOpacity>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		alignItems: "center",
		paddingVertical: 40,
		paddingHorizontal: 32,
	},
	iconCircle: {
		width: 64,
		height: 64,
		borderRadius: 32,
		backgroundColor: SoliColors.primary.main,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 16,
	},
	title: {
		fontSize: 18,
		fontWeight: "700",
		color: SoliColors.text.primary,
		textAlign: "center",
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 14,
		color: SoliColors.text.secondary,
		textAlign: "center",
		lineHeight: 20,
		marginBottom: 20,
	},
	actionWrapper: {
		marginTop: 4,
		borderRadius: 12,
		overflow: "hidden",
	},
	actionButton: {
		paddingHorizontal: 24,
		paddingVertical: 12,
	},
	actionLabel: {
		fontSize: 15,
		fontWeight: "600",
		color: "#FFFFFF",
	},
});
