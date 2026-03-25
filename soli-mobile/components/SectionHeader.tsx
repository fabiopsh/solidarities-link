import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SoliColors } from "@/constants/theme";

interface SectionHeaderProps {
	title: string;
	rightLabel?: string;
	onRightPress?: () => void;
}

export function SectionHeader({ title, rightLabel, onRightPress }: SectionHeaderProps) {
	return (
		<View style={styles.container}>
			<Text style={styles.title}>{title}</Text>
			{rightLabel && onRightPress ? (
				<TouchableOpacity onPress={onRightPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
					<Text style={styles.rightLabel}>{rightLabel}</Text>
				</TouchableOpacity>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 12,
	},
	title: {
		fontSize: 16,
		fontWeight: "700",
		color: SoliColors.text.primary,
	},
	rightLabel: {
		fontSize: 14,
		fontWeight: "600",
		color: SoliColors.primary.main,
	},
});
