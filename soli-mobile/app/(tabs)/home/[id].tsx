import { useCallback, useEffect, useRef, useState } from "react";
import {
	View,
	Text,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	TextInput,
	Modal,
	ActivityIndicator,
	Animated,
	Pressable,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";

import api from "@/config/api";
import { useAuth } from "@/context/AuthContext";
import { StatusChip } from "@/components/StatusChip";
import { CATEGORY_CONFIG, URGENCY_CONFIG } from "@/constants/taskConfig";
import { SoliColors, SoliGradients, SoliShapes } from "@/constants/theme";
import type { Task } from "@/types/models/Task";
import type { User } from "@/types/models/User";

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, type }: { message: string; type: "success" | "error" }) {
	const opacity = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		Animated.sequence([
			Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
			Animated.delay(2100),
			Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
		]).start();
	}, []);

	return (
		<Animated.View
			style={[
				styles.toast,
				{ opacity, backgroundColor: type === "success" ? SoliColors.success : SoliColors.error },
			]}
			pointerEvents="none"
		>
			<MaterialIcons name={type === "success" ? "check-circle" : "error"} size={18} color="#FFF" />
			<Text style={styles.toastText}>{message}</Text>
		</Animated.View>
	);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso?: string) {
	if (!iso) return "—";
	return new Date(iso).toLocaleDateString("it-IT", {
		day: "2-digit",
		month: "long",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function formatCountdown(ms: number) {
	if (ms <= 0) return "00:00";
	const totalSec = Math.floor(ms / 1000);
	const min = Math.floor(totalSec / 60).toString().padStart(2, "0");
	const sec = (totalSec % 60).toString().padStart(2, "0");
	return `${min}:${sec}`;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TaskDetailScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const router = useRouter();
	const { logout } = useAuth();

	const [task, setTask] = useState<Task | null>(null);
	const [currentUser, setCurrentUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [accepting, setAccepting] = useState(false);
	const [cancelling, setCancelling] = useState(false);
	const [confirming, setConfirming] = useState(false);
	const [cancelTimeLeft, setCancelTimeLeft] = useState(0);
	const [cancelModalVisible, setCancelModalVisible] = useState(false);

	const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

	const showToast = (message: string, type: "success" | "error") => {
		setToast({ message, type });
		setTimeout(() => setToast(null), 2500);
	};

	// ─── Fetch ──────────────────────────────────────────────────────────────

	const fetchAll = useCallback(async () => {
		try {
			setError(null);
			const [taskRes, meRes] = await Promise.all([
				api.get<Task>(`/api/tasks/${id}`),
				api.get<User>("/api/users/me"),
			]);
			setTask(taskRes.data);
			setCurrentUser(meRes.data);
		} catch (err) {
			if (axios.isAxiosError(err) && err.response?.status === 401) {
				logout();
			} else {
				setError("Impossibile caricare il task.");
			}
		} finally {
			setLoading(false);
		}
	}, [id, logout]);

	useEffect(() => {
		fetchAll();
	}, [fetchAll]);

	// ─── Cancel countdown ────────────────────────────────────────────────────

	useEffect(() => {
		if (!task || task.status !== "ACCEPTED" || !task.acceptedAt) {
			setCancelTimeLeft(0);
			return;
		}
		const CANCEL_WINDOW_MS = 10 * 60 * 1000;
		const deadline = new Date(task.acceptedAt).getTime() + CANCEL_WINDOW_MS;

		const tick = () => {
			const remaining = deadline - Date.now();
			setCancelTimeLeft(Math.max(0, remaining));
		};
		tick();
		const timer = setInterval(tick, 1000);
		return () => clearInterval(timer);
	}, [task?.status, task?.acceptedAt]);

	// ─── Derived flags ───────────────────────────────────────────────────────

	const myId = currentUser?.id;
	const isCreator = myId != null && task?.creatorId === myId;
	const isTaskVolunteer = myId != null && task?.volunteerId === myId;

	const canAccept = !isCreator && task?.status === "OPEN";
	const canCancel =
		isCreator &&
		(task?.status === "OPEN" || (task?.status === "ACCEPTED" && cancelTimeLeft > 0));
	const isTokenVisible =
		(task?.status === "ACCEPTED" || task?.status === "IN_PROGRESS") && isCreator;
	const activeToken = task?.status === "ACCEPTED" ? task?.checkInToken : task?.checkOutToken;
	const tokenLabel = task?.status === "ACCEPTED" ? "Token Check-In" : "Token Check-Out";

	const canConfirm =
		task?.status === "IN_PROGRESS" &&
		((isCreator && !task?.creatorConfirmed) || (isTaskVolunteer && !task?.volunteerConfirmed));

	const showConfirmCard =
		task?.status === "IN_PROGRESS" || task?.status === "COMPLETED";
	const showChatBanner =
		task?.status === "ACCEPTED" || task?.status === "IN_PROGRESS";

	// ─── Actions ─────────────────────────────────────────────────────────────

	const handleAccept = async () => {
		if (!task) return;
		setAccepting(true);
		try {
			await api.post(`/api/tasks/${task.id}/accept`);
			await fetchAll();
			showToast("Task accettato!", "success");
		} catch {
			showToast("Errore durante l'accettazione.", "error");
		} finally {
			setAccepting(false);
		}
	};

	const handleCancel = async () => {
		if (!task) return;
		setCancelling(true);
		try {
			await api.post(`/api/tasks/${task.id}/cancel`);
			setCancelModalVisible(false);
			await fetchAll();
			showToast("Richiesta annullata.", "success");
		} catch {
			showToast("Errore durante l'annullamento.", "error");
		} finally {
			setCancelling(false);
		}
	};

	const handleConfirm = async () => {
		if (!task) return;
		setConfirming(true);
		try {
			await api.post(`/api/tasks/${task.id}/confirm`);
			await fetchAll();
			showToast("Completamento confermato!", "success");
		} catch {
			showToast("Errore durante la conferma.", "error");
		} finally {
			setConfirming(false);
		}
	};

	// ─── Loading / Error ─────────────────────────────────────────────────────

	if (loading) {
		return (
			<View style={styles.centered}>
				<ActivityIndicator size="large" color={SoliColors.primary.main} />
			</View>
		);
	}

	if (error || !task) {
		return (
			<View style={styles.centered}>
				<MaterialIcons name="error-outline" size={40} color={SoliColors.error} />
				<Text style={styles.errorText}>{error ?? "Task non trovato."}</Text>
				<TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
					<Text style={styles.backBtnText}>Torna indietro</Text>
				</TouchableOpacity>
			</View>
		);
	}

	const catConfig = CATEGORY_CONFIG[task.category];
	const urgConfig = URGENCY_CONFIG[task.urgencyLevel];

	return (
		<View style={styles.container}>
			<ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

				{/* ── Header card ── */}
				<View style={[styles.card, styles.headerCard]}>
					<Text style={styles.taskTitle}>{task.title}</Text>
					<View style={styles.row}>
						<StatusChip status={task.status} size="md" />
						<View style={[styles.catBadge, { backgroundColor: catConfig.bgColor }]}>
							<MaterialIcons name={catConfig.icon as any} size={14} color={catConfig.color} />
							<Text style={[styles.catLabel, { color: catConfig.color }]}>{catConfig.label}</Text>
						</View>
					</View>
					<View style={[styles.urgencyBadge, { backgroundColor: urgConfig.bgColor }]}>
						<View style={[styles.urgencyDot, { backgroundColor: urgConfig.color }]} />
						<Text style={[styles.urgencyText, { color: urgConfig.color }]}>
							Urgenza {urgConfig.label}
						</Text>
					</View>
				</View>

				{/* ── Info card ── */}
				<View style={styles.card}>
					<InfoRow icon="location-on" label="Indirizzo" value={task.targetAddress ?? "—"} />
					<InfoRow icon="event" label="Programmato" value={formatDateTime(task.scheduledAt)} />
					<InfoRow icon="monetization-on" label="Crediti" value={`${task.rewardCredits} Cr`} />
					<InfoRow icon="access-time" label="Creato il" value={formatDateTime(task.createdAt)} />
				</View>

				{/* ── Description card ── */}
				<View style={styles.card}>
					<Text style={styles.cardTitle}>Descrizione</Text>
					<Text style={styles.descriptionText}>
						{task.description ?? "Nessuna descrizione fornita."}
					</Text>
				</View>

				{/* ── Token card ── */}
				{isTokenVisible && activeToken ? (
					<View style={[styles.card, styles.tokenCard]}>
						<View style={styles.tokenHeader}>
							<MaterialIcons name="vpn-key" size={18} color="#E65100" />
							<Text style={styles.tokenLabel}>{tokenLabel}</Text>
						</View>
						<TextInput
							value={activeToken}
							editable={false}
							selectTextOnFocus
							style={styles.tokenInput}
						/>
						<Text style={styles.tokenHint}>Mostra questo token al volontario per il check-in</Text>
					</View>
				) : null}

				{/* ── Confirm card ── */}
				{showConfirmCard ? (
					<View style={styles.card}>
						<Text style={styles.cardTitle}>Stato Completamento</Text>
						<ConfirmRow label="Richiedente" confirmed={task.creatorConfirmed ?? false} />
						<ConfirmRow label="Volontario" confirmed={task.volunteerConfirmed ?? false} />
					</View>
				) : null}

				{/* ── Chat banner ── */}
				{showChatBanner ? (
					<View style={[styles.card, styles.chatBanner]}>
						<MaterialIcons name="chat" size={20} color={SoliColors.primary.main} />
						<Text style={styles.chatText}>💬 Chat disponibile prossimamente</Text>
					</View>
				) : null}

				{/* ── Actions ── */}
				<View style={styles.actionsSection}>
					{/* Accept */}
					{canAccept && (
						<TouchableOpacity
							onPress={handleAccept}
							disabled={accepting}
							activeOpacity={0.85}
							style={styles.actionBtnWrapper}
						>
							<LinearGradient colors={SoliGradients.button} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.actionBtn}>
								{accepting ? (
									<ActivityIndicator color="#FFF" />
								) : (
									<>
										<MaterialIcons name="check" size={20} color="#FFF" />
										<Text style={styles.actionBtnText}>Accetta richiesta</Text>
									</>
								)}
							</LinearGradient>
						</TouchableOpacity>
					)}

					{/* Confirm completion */}
					{canConfirm && (
						<TouchableOpacity
							onPress={handleConfirm}
							disabled={confirming}
							activeOpacity={0.85}
							style={styles.actionBtnWrapper}
						>
							<LinearGradient colors={["#2E7D32", "#66BB6A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.actionBtn}>
								{confirming ? (
									<ActivityIndicator color="#FFF" />
								) : (
									<>
										<MaterialIcons name="done-all" size={20} color="#FFF" />
										<Text style={styles.actionBtnText}>Conferma completamento</Text>
									</>
								)}
							</LinearGradient>
						</TouchableOpacity>
					)}

					{/* Cancel countdown badge */}
					{task.status === "ACCEPTED" && isCreator && cancelTimeLeft > 0 && (
						<View style={styles.countdownBadge}>
							<MaterialIcons name="timer" size={16} color="#E65100" />
							<Text style={styles.countdownText}>
								Puoi annullare per ancora {formatCountdown(cancelTimeLeft)}
							</Text>
						</View>
					)}

					{/* Cancel button */}
					{canCancel && (
						<TouchableOpacity
							onPress={() => setCancelModalVisible(true)}
							activeOpacity={0.85}
							style={[styles.actionBtnWrapper, styles.cancelBtnWrapper]}
						>
							<MaterialIcons name="cancel" size={18} color={SoliColors.error} />
							<Text style={styles.cancelBtnText}>Annulla richiesta</Text>
						</TouchableOpacity>
					)}
				</View>
			</ScrollView>

			{/* ── Cancel modal ── */}
			<Modal
				visible={cancelModalVisible}
				transparent
				animationType="fade"
				onRequestClose={() => setCancelModalVisible(false)}
			>
				<Pressable style={styles.modalBackdrop} onPress={() => setCancelModalVisible(false)}>
					<Pressable style={styles.modalCard} onPress={() => {}}>
						<MaterialIcons name="warning" size={36} color={SoliColors.error} />
						<Text style={styles.modalTitle}>Annullare la richiesta?</Text>
						<Text style={styles.modalSubtitle}>
							Questa azione non può essere annullata.
						</Text>
						<View style={styles.modalActions}>
							<TouchableOpacity
								onPress={() => setCancelModalVisible(false)}
								style={styles.modalBtnOutline}
							>
								<Text style={styles.modalBtnOutlineText}>No, torna indietro</Text>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={handleCancel}
								disabled={cancelling}
								style={[styles.modalBtnDanger, cancelling && { opacity: 0.7 }]}
							>
								{cancelling ? (
									<ActivityIndicator color="#FFF" />
								) : (
									<Text style={styles.modalBtnDangerText}>Sì, annulla</Text>
								)}
							</TouchableOpacity>
						</View>
					</Pressable>
				</Pressable>
			</Modal>

			{/* ── Toast ── */}
			{toast && <Toast message={toast.message} type={toast.type} />}
		</View>
	);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
	return (
		<View style={styles.infoRow}>
			<MaterialIcons name={icon as any} size={16} color={SoliColors.text.disabled} style={styles.infoIcon} />
			<View>
				<Text style={styles.infoLabel}>{label}</Text>
				<Text style={styles.infoValue}>{value}</Text>
			</View>
		</View>
	);
}

function ConfirmRow({ label, confirmed }: { label: string; confirmed: boolean }) {
	return (
		<View style={styles.confirmRow}>
			<MaterialIcons
				name={confirmed ? "check-circle" : "radio-button-unchecked"}
				size={20}
				color={confirmed ? SoliColors.success : SoliColors.text.disabled}
			/>
			<Text style={styles.confirmLabel}>{label}</Text>
			<Text style={[styles.confirmStatus, { color: confirmed ? SoliColors.success : SoliColors.text.disabled }]}>
				{confirmed ? "Confermato" : "In attesa"}
			</Text>
		</View>
	);
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: SoliColors.background.default },
	centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: SoliColors.background.default },
	scroll: { padding: 16, paddingBottom: 40 },
	card: {
		backgroundColor: SoliColors.background.paper,
		borderRadius: SoliShapes.borderRadius.card,
		padding: 16,
		marginBottom: 12,
		...SoliShapes.shadow.card,
	},
	headerCard: { gap: 10 },
	taskTitle: { fontSize: 22, fontWeight: "700", color: SoliColors.text.primary, lineHeight: 28 },
	row: { flexDirection: "row", alignItems: "center", gap: 8 },
	catBadge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 8,
	},
	catLabel: { fontSize: 12, fontWeight: "600" },
	urgencyBadge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		alignSelf: "flex-start",
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 20,
	},
	urgencyDot: { width: 8, height: 8, borderRadius: 4 },
	urgencyText: { fontSize: 13, fontWeight: "600" },
	cardTitle: { fontSize: 15, fontWeight: "700", color: SoliColors.text.primary, marginBottom: 10 },
	infoRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
	infoIcon: { marginRight: 10, marginTop: 2 },
	infoLabel: { fontSize: 11, color: SoliColors.text.secondary, marginBottom: 2 },
	infoValue: { fontSize: 14, fontWeight: "500", color: SoliColors.text.primary },
	descriptionText: { fontSize: 15, color: SoliColors.text.secondary, lineHeight: 22 },
	tokenCard: { borderWidth: 1, borderColor: "#FFB74D", backgroundColor: "#FFFDE7" },
	tokenHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
	tokenLabel: { fontSize: 14, fontWeight: "700", color: "#E65100" },
	tokenInput: {
		backgroundColor: "#FFF8E1",
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "#FFD54F",
		padding: 12,
		fontSize: 15,
		fontFamily: "monospace",
		color: SoliColors.text.primary,
		letterSpacing: 1,
		marginBottom: 8,
	},
	tokenHint: { fontSize: 12, color: "#BF360C" },
	confirmRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
	confirmLabel: { flex: 1, fontSize: 14, color: SoliColors.text.primary, fontWeight: "500" },
	confirmStatus: { fontSize: 13, fontWeight: "600" },
	chatBanner: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		backgroundColor: "#E0F2F1",
		borderWidth: 1,
		borderColor: "#B2DFDB",
	},
	chatText: { fontSize: 14, color: SoliColors.primary.main, fontWeight: "500" },
	actionsSection: { gap: 10, marginTop: 4 },
	actionBtnWrapper: { borderRadius: SoliShapes.borderRadius.button, overflow: "hidden" },
	actionBtn: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		paddingVertical: 14,
	},
	actionBtnText: { fontSize: 16, fontWeight: "700", color: "#FFF" },
	cancelBtnWrapper: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 6,
		borderWidth: 1.5,
		borderColor: SoliColors.error,
		paddingVertical: 12,
		borderRadius: SoliShapes.borderRadius.button,
		backgroundColor: "transparent",
		overflow: "visible",
	},
	cancelBtnText: { fontSize: 15, fontWeight: "600", color: SoliColors.error },
	countdownBadge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		backgroundColor: "#FFF3E0",
		borderRadius: 10,
		padding: 10,
	},
	countdownText: { fontSize: 13, color: "#E65100", fontWeight: "500" },
	errorText: { fontSize: 16, color: SoliColors.error, textAlign: "center", marginVertical: 12 },
	backBtn: {
		backgroundColor: SoliColors.primary.main,
		paddingHorizontal: 20,
		paddingVertical: 10,
		borderRadius: 10,
	},
	backBtnText: { color: "#FFF", fontWeight: "600" },
	modalBackdrop: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.5)",
		justifyContent: "center",
		alignItems: "center",
		padding: 24,
	},
	modalCard: {
		backgroundColor: SoliColors.background.paper,
		borderRadius: SoliShapes.borderRadius.card,
		padding: 24,
		width: "100%",
		alignItems: "center",
		gap: 10,
	},
	modalTitle: { fontSize: 20, fontWeight: "700", color: SoliColors.text.primary },
	modalSubtitle: { fontSize: 14, color: SoliColors.text.secondary, textAlign: "center" },
	modalActions: { flexDirection: "row", gap: 10, marginTop: 8, width: "100%" },
	modalBtnOutline: {
		flex: 1,
		borderWidth: 1.5,
		borderColor: SoliColors.text.disabled,
		borderRadius: 10,
		paddingVertical: 12,
		alignItems: "center",
	},
	modalBtnOutlineText: { fontWeight: "600", color: SoliColors.text.secondary },
	modalBtnDanger: {
		flex: 1,
		backgroundColor: SoliColors.error,
		borderRadius: 10,
		paddingVertical: 12,
		alignItems: "center",
	},
	modalBtnDangerText: { fontWeight: "700", color: "#FFF", fontSize: 15 },
	toast: {
		position: "absolute",
		bottom: 80,
		left: 24,
		right: 24,
		borderRadius: 12,
		padding: 14,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	toastText: { color: "#FFF", fontWeight: "600", fontSize: 14 },
});
