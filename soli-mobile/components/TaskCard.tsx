import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { StatusChip } from "@/components/StatusChip";
import { CATEGORY_CONFIG, URGENCY_CONFIG } from "@/constants/taskConfig";
import { SoliColors, SoliShapes } from "@/constants/theme";
import type { Task } from "@/types/models/Task";

interface TaskCardProps {
	task: Task;
	currentUserId?: string;
	onPress: (id: string) => void;
}

export function TaskCard({ task, onPress }: TaskCardProps) {
	const catConfig = CATEGORY_CONFIG[task.category];
	const urgConfig = URGENCY_CONFIG[task.urgencyLevel];

	const formattedDate = task.scheduledAt
		? new Date(task.scheduledAt).toLocaleDateString("it-IT", {
				day: "2-digit",
				month: "short",
				hour: "2-digit",
				minute: "2-digit",
			})
		: null;

	return (
		<TouchableOpacity
			onPress={() => onPress(task.id)}
			activeOpacity={0.82}
			style={[styles.card, SoliShapes.shadow.card]}
		>
			{/* Left category border */}
			<View style={[styles.leftBorder, { backgroundColor: catConfig.color }]} />

			<View style={styles.content}>
				{/* Row 1: status + credits */}
				<View style={styles.row}>
					<StatusChip status={task.status} size="sm" />
					<View style={styles.creditsBadge}>
						<Text style={styles.creditsText}>{task.rewardCredits} Cr</Text>
					</View>
				</View>

				{/* Row 2: title */}
				<Text style={styles.title} numberOfLines={2}>
					{task.title}
				</Text>

				{/* Row 3: description */}
				{task.description ? (
					<Text style={styles.description} numberOfLines={2}>
						{task.description}
					</Text>
				) : null}

				{/* Row 4: category icon + address + urgency dot */}
				<View style={[styles.row, styles.metaRow]}>
					<View style={[styles.catIconBadge, { backgroundColor: catConfig.bgColor }]}>
						<MaterialIcons name={catConfig.icon as any} size={14} color={catConfig.color} />
					</View>
					{task.targetAddress ? (
						<>
							<MaterialIcons name="location-on" size={13} color={SoliColors.text.disabled} style={styles.locationIcon} />
							<Text style={styles.address} numberOfLines={1}>
								{task.targetAddress}
							</Text>
						</>
					) : null}
					<View style={[styles.urgencyDot, { backgroundColor: urgConfig.color }]} />
					<Text style={[styles.urgencyLabel, { color: urgConfig.color }]}>{urgConfig.label}</Text>
				</View>

				{/* Row 5: scheduled date */}
				{formattedDate ? (
					<View style={styles.scheduledRow}>
						<MaterialIcons name="event" size={13} color={SoliColors.text.disabled} />
						<Text style={styles.scheduledText}>{formattedDate}</Text>
					</View>
				) : null}
			</View>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: SoliColors.background.paper,
		borderRadius: SoliShapes.borderRadius.card,
		flexDirection: "row",
		overflow: "hidden",
		marginBottom: 12,
	},
	leftBorder: {
		width: 4,
	},
	content: {
		flex: 1,
		padding: 14,
		gap: 6,
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
	},
	metaRow: {
		gap: 4,
		marginTop: 2,
	},
	creditsBadge: {
		marginLeft: "auto",
		backgroundColor: "#E0F2F1",
		borderRadius: 20,
		paddingHorizontal: 8,
		paddingVertical: 2,
	},
	creditsText: {
		fontSize: 11,
		fontWeight: "700",
		color: SoliColors.primary.main,
	},
	title: {
		fontSize: 17,
		fontWeight: "700",
		color: SoliColors.text.primary,
		lineHeight: 22,
	},
	description: {
		fontSize: 14,
		color: SoliColors.text.secondary,
		lineHeight: 19,
	},
	catIconBadge: {
		width: 22,
		height: 22,
		borderRadius: 6,
		justifyContent: "center",
		alignItems: "center",
	},
	locationIcon: {
		marginLeft: 4,
	},
	address: {
		fontSize: 12,
		color: SoliColors.text.secondary,
		flex: 1,
	},
	urgencyDot: {
		width: 7,
		height: 7,
		borderRadius: 4,
		marginLeft: 6,
	},
	urgencyLabel: {
		fontSize: 11,
		fontWeight: "600",
	},
	scheduledRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		marginTop: 2,
	},
	scheduledText: {
		fontSize: 12,
		color: SoliColors.text.secondary,
	},
});
