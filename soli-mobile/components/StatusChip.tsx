import { View, Text, StyleSheet } from "react-native";
import { STATUS_CONFIG } from "@/constants/taskConfig";
import type { TaskStatus } from "@/types/models/Task";

interface StatusChipProps {
	status: TaskStatus;
	size?: "sm" | "md";
}

export function StatusChip({ status, size = "md" }: StatusChipProps) {
	const config = STATUS_CONFIG[status];

	return (
		<View
			style={[
				styles.chip,
				{ backgroundColor: config.bgColor },
				size === "sm" ? styles.chipSm : styles.chipMd,
			]}
		>
			<Text
				style={[
					styles.label,
					{ color: config.textColor },
					size === "sm" ? styles.labelSm : styles.labelMd,
				]}
			>
				{config.label}
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	chip: {
		borderRadius: 20,
		alignSelf: "flex-start",
	},
	chipSm: {
		paddingHorizontal: 8,
		paddingVertical: 2,
	},
	chipMd: {
		paddingHorizontal: 10,
		paddingVertical: 4,
	},
	label: {
		fontWeight: "700",
	},
	labelSm: {
		fontSize: 11,
	},
	labelMd: {
		fontSize: 13,
	},
});
