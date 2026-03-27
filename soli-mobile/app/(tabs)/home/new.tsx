import { useState } from "react";
import {
	View,
	Text,
	ScrollView,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	KeyboardAvoidingView,
	Platform,
	ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";

import api from "@/config/api";
import { CATEGORY_CONFIG, URGENCY_CONFIG } from "@/constants/taskConfig";
import { SoliColors, SoliGradients, SoliShapes } from "@/constants/theme";
import type { ServiceCategory } from "@/types/models/VolunteerProfile";
import type { UrgencyLevel } from "@/types/models/Task";

const CATEGORIES = Object.entries(CATEGORY_CONFIG) as [ServiceCategory, (typeof CATEGORY_CONFIG)[ServiceCategory]][];
const URGENCIES = Object.entries(URGENCY_CONFIG) as [UrgencyLevel, (typeof URGENCY_CONFIG)[UrgencyLevel]][];

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: 1 | 2 }) {
	return (
		<View style={styles.progressContainer}>
			<View style={styles.progressTrack}>
				<View style={[styles.progressFill, { width: step === 1 ? "50%" : "100%" }]} />
			</View>
			<Text style={styles.progressLabel}>Passo {step} di 2</Text>
		</View>
	);
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NewTaskScreen() {
	const router = useRouter();

	// ─── Form state ──────────────────────────────────────────────────────────
	const [step, setStep] = useState<1 | 2>(1);
	const [title, setTitle] = useState("");
	const [category, setCategory] = useState<ServiceCategory | null>(null);
	const [urgency, setUrgency] = useState<UrgencyLevel | null>(null);
	const [description, setDescription] = useState("");
	const [address, setAddress] = useState("");
	const [scheduledAt, setScheduledAt] = useState("");
	const [scheduledAtError, setScheduledAtError] = useState("");

	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const canProceed = !!title.trim() && !!category && !!urgency;

	// ─── Validation ───────────────────────────────────────────────────────────

	const validateScheduledAt = (val: string) => {
		if (!val.trim()) {
			setScheduledAtError("");
			return true;
		}
		const d = new Date(val);
		if (isNaN(d.getTime())) {
			setScheduledAtError("Formato non valido. Usa YYYY-MM-DDTHH:MM");
			return false;
		}
		setScheduledAtError("");
		return true;
	};

	// ─── Submit ───────────────────────────────────────────────────────────────

	const handleSubmit = async () => {
		if (!canProceed) return;
		setSubmitting(true);
		setError(null);
		try {
			const body: Record<string, unknown> = {
				title: title.trim(),
				category,
				urgencyLevel: urgency,
			};
			if (description.trim()) body.description = description.trim();
			if (address.trim()) body.targetAddress = address.trim();
			if (scheduledAt.trim() && !scheduledAtError) {
				body.scheduledAt = new Date(scheduledAt.trim()).toISOString();
			}

			await api.post("/api/tasks", body);
			router.back();
		} catch (err) {
			if (axios.isAxiosError(err) && err.response?.status === 429) {
				setError("Hai raggiunto il limite giornaliero di richieste. Riprova domani.");
			} else if (axios.isAxiosError(err) && err.response?.status === 400) {
				setError("Dati non validi. Controlla i campi e riprova.");
			} else {
				setError("Errore durante la creazione. Riprova.");
			}
		} finally {
			setSubmitting(false);
		}
	};

	// ─── Step 1 ───────────────────────────────────────────────────────────────

	const renderStep1 = () => (
		<ScrollView
			contentContainerStyle={styles.scrollContent}
			showsVerticalScrollIndicator={false}
			keyboardShouldPersistTaps="handled"
		>
			<ProgressBar step={1} />

			{/* Title */}
			<View style={styles.fieldGroup}>
				<Text style={styles.fieldLabel}>Titolo *</Text>
				<TextInput
					value={title}
					onChangeText={setTitle}
					placeholder="Es. Accompagnamento in farmacia"
					placeholderTextColor={SoliColors.text.disabled}
					style={styles.input}
					maxLength={120}
					returnKeyType="next"
				/>
				<Text style={styles.charCounter}>{title.length}/120</Text>
			</View>

			{/* Category grid */}
			<View style={styles.fieldGroup}>
				<Text style={styles.fieldLabel}>Categoria *</Text>
				<View style={styles.categoryGrid}>
					{CATEGORIES.map(([key, config]) => {
						const selected = category === key;
						return (
							<TouchableOpacity
								key={key}
								onPress={() => setCategory(key)}
								activeOpacity={0.8}
								style={[
									styles.categoryTile,
									selected && { borderColor: config.color, borderWidth: 2, backgroundColor: config.bgColor },
								]}
							>
								<View style={[styles.categoryIconCircle, { backgroundColor: selected ? config.bgColor : "#F5F5F5" }]}>
									<MaterialIcons name={config.icon as any} size={22} color={selected ? config.color : SoliColors.text.disabled} />
								</View>
								<Text style={[styles.categoryTileLabel, selected && { color: config.color, fontWeight: "700" }]}>
									{config.label}
								</Text>
							</TouchableOpacity>
						);
					})}
				</View>
			</View>

			{/* Urgency chips */}
			<View style={styles.fieldGroup}>
				<Text style={styles.fieldLabel}>Urgenza *</Text>
				<View style={styles.chipsRow}>
					{URGENCIES.map(([key, config]) => {
						const selected = urgency === key;
						return (
							<TouchableOpacity
								key={key}
								onPress={() => setUrgency(key)}
								style={[
									styles.urgencyChip,
									selected
										? { backgroundColor: config.bgColor, borderColor: config.color, borderWidth: 2 }
										: { backgroundColor: "#F5F5F5", borderColor: "#E0E0E0", borderWidth: 1 },
								]}
								activeOpacity={0.8}
							>
								<View style={[styles.urgencyDot, { backgroundColor: config.color }]} />
								<Text style={[styles.chipText, { color: selected ? config.color : SoliColors.text.secondary }]}>
									{config.label}
								</Text>
							</TouchableOpacity>
						);
					})}
				</View>
			</View>

			{/* Description */}
			<View style={styles.fieldGroup}>
				<Text style={styles.fieldLabel}>Descrizione</Text>
				<TextInput
					value={description}
					onChangeText={setDescription}
					placeholder="Dettagli aggiuntivi sulla richiesta…"
					placeholderTextColor={SoliColors.text.disabled}
					style={[styles.input, styles.inputMultiline]}
					multiline
					numberOfLines={4}
					maxLength={500}
					textAlignVertical="top"
				/>
				<Text style={styles.charCounter}>{description.length}/500</Text>
			</View>

			{/* Address */}
			<View style={styles.fieldGroup}>
				<Text style={styles.fieldLabel}>Indirizzo</Text>
				<TextInput
					value={address}
					onChangeText={setAddress}
					placeholder="Es. Via Roma 12, Pisa"
					placeholderTextColor={SoliColors.text.disabled}
					style={styles.input}
					returnKeyType="next"
				/>
			</View>

			{/* Scheduled at */}
			<View style={styles.fieldGroup}>
				<Text style={styles.fieldLabel}>Data e ora (opzionale)</Text>
				<TextInput
					value={scheduledAt}
					onChangeText={(v) => { setScheduledAt(v); validateScheduledAt(v); }}
					placeholder="YYYY-MM-DDTHH:MM"
					placeholderTextColor={SoliColors.text.disabled}
					style={[styles.input, scheduledAtError ? styles.inputError : null]}
					returnKeyType="done"
				/>
				{scheduledAtError ? <Text style={styles.fieldError}>{scheduledAtError}</Text> : null}
			</View>

			{/* Continue button */}
			<TouchableOpacity
				onPress={() => canProceed && !scheduledAtError && setStep(2)}
				disabled={!canProceed || !!scheduledAtError}
				activeOpacity={0.85}
				style={[styles.primaryBtnWrapper, (!canProceed || !!scheduledAtError) && styles.btnDisabled]}
			>
				<LinearGradient
					colors={canProceed && !scheduledAtError ? SoliGradients.button : ["#CCCCCC", "#AAAAAA"]}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 0 }}
					style={styles.primaryBtn}
				>
					<Text style={styles.primaryBtnText}>Continua</Text>
					<MaterialIcons name="arrow-forward" size={20} color="#FFF" />
				</LinearGradient>
			</TouchableOpacity>
		</ScrollView>
	);

	// ─── Step 2 ───────────────────────────────────────────────────────────────

	const renderStep2 = () => {
		const catConfig = category ? CATEGORY_CONFIG[category] : null;
		const urgConfig = urgency ? URGENCY_CONFIG[urgency] : null;

		return (
			<ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
				<ProgressBar step={2} />

				<Text style={styles.reviewTitle}>Riepilogo richiesta</Text>

				{/* Summary card */}
				<View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: catConfig?.color ?? "#CCC" }]}>
					<ReviewRow label="Titolo" value={title} />
					<ReviewRow label="Categoria" value={catConfig?.label ?? "—"} />
					<ReviewRow label="Urgenza" value={urgConfig?.label ?? "—"} />
					{description ? <ReviewRow label="Descrizione" value={description} /> : null}
					{address ? <ReviewRow label="Indirizzo" value={address} /> : null}
					{scheduledAt ? <ReviewRow label="Programmato" value={scheduledAt} /> : null}
				</View>

				{/* Error */}
				{error ? (
					<View style={styles.errorCard}>
						<MaterialIcons name="error-outline" size={18} color={SoliColors.error} />
						<Text style={styles.errorText}>{error}</Text>
					</View>
				) : null}

				{/* Actions */}
				<View style={styles.reviewActions}>
					<TouchableOpacity onPress={() => { setStep(1); setError(null); }} style={styles.outlinedBtn} activeOpacity={0.8}>
						<MaterialIcons name="arrow-back" size={18} color={SoliColors.text.secondary} />
						<Text style={styles.outlinedBtnText}>Indietro</Text>
					</TouchableOpacity>
					<TouchableOpacity
						onPress={handleSubmit}
						disabled={submitting}
						activeOpacity={0.85}
						style={[styles.submitBtnWrapper, submitting && styles.btnDisabled]}
					>
						<LinearGradient
							colors={SoliGradients.button}
							start={{ x: 0, y: 0 }}
							end={{ x: 1, y: 0 }}
							style={styles.submitBtn}
						>
							{submitting ? (
								<ActivityIndicator color="#FFF" />
							) : (
								<Text style={styles.primaryBtnText}>Crea richiesta</Text>
							)}
						</LinearGradient>
					</TouchableOpacity>
				</View>
			</ScrollView>
		);
	};

	return (
		<KeyboardAvoidingView
			style={styles.container}
			behavior={Platform.OS === "ios" ? "padding" : undefined}
			keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
		>
			{step === 1 ? renderStep1() : renderStep2()}
		</KeyboardAvoidingView>
	);
}

// ─── Sub-component ────────────────────────────────────────────────────────────

function ReviewRow({ label, value }: { label: string; value: string }) {
	return (
		<View style={styles.reviewRow}>
			<Text style={styles.reviewLabel}>{label}</Text>
			<Text style={styles.reviewValue}>{value}</Text>
		</View>
	);
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: SoliColors.background.default },
	scrollContent: { padding: 16, paddingBottom: 40 },

	progressContainer: { marginBottom: 24 },
	progressTrack: {
		height: 6,
		backgroundColor: "#E0E0E0",
		borderRadius: 3,
		overflow: "hidden",
		marginBottom: 6,
	},
	progressFill: { height: "100%", backgroundColor: SoliColors.primary.main, borderRadius: 3 },
	progressLabel: { fontSize: 13, color: SoliColors.text.secondary, textAlign: "right" },

	fieldGroup: { marginBottom: 20 },
	fieldLabel: { fontSize: 14, fontWeight: "700", color: SoliColors.text.primary, marginBottom: 8 },
	charCounter: { fontSize: 11, color: SoliColors.text.disabled, textAlign: "right", marginTop: 4 },
	input: {
		backgroundColor: SoliColors.background.paper,
		borderRadius: SoliShapes.borderRadius.input,
		borderWidth: 1,
		borderColor: "#E0E0E0",
		paddingHorizontal: 14,
		paddingVertical: 12,
		fontSize: 15,
		color: SoliColors.text.primary,
	},
	inputMultiline: { paddingTop: 12, minHeight: 100 },
	inputError: { borderColor: SoliColors.error },
	fieldError: { fontSize: 12, color: SoliColors.error, marginTop: 4 },

	categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
	categoryTile: {
		width: "47%",
		backgroundColor: SoliColors.background.paper,
		borderRadius: 12,
		padding: 14,
		alignItems: "center",
		borderWidth: 1,
		borderColor: "#E0E0E0",
		gap: 8,
	},
	categoryIconCircle: {
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: "center",
		alignItems: "center",
	},
	categoryTileLabel: {
		fontSize: 13,
		fontWeight: "500",
		color: SoliColors.text.secondary,
		textAlign: "center",
	},

	chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
	urgencyChip: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 20,
	},
	urgencyDot: { width: 8, height: 8, borderRadius: 4 },
	chipText: { fontSize: 13, fontWeight: "600" },

	primaryBtnWrapper: { borderRadius: SoliShapes.borderRadius.button, overflow: "hidden", marginTop: 8 },
	primaryBtn: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		paddingVertical: 15,
	},
	primaryBtnText: { fontSize: 16, fontWeight: "700", color: "#FFF" },
	btnDisabled: { opacity: 0.6 },

	reviewTitle: {
		fontSize: 20,
		fontWeight: "700",
		color: SoliColors.text.primary,
		marginBottom: 16,
	},
	card: {
		backgroundColor: SoliColors.background.paper,
		borderRadius: SoliShapes.borderRadius.card,
		padding: 16,
		marginBottom: 16,
		...SoliShapes.shadow.card,
		gap: 10,
	},
	reviewRow: {},
	reviewLabel: { fontSize: 11, color: SoliColors.text.secondary, marginBottom: 2 },
	reviewValue: { fontSize: 14, fontWeight: "500", color: SoliColors.text.primary },

	errorCard: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 8,
		backgroundColor: "#FFEBEE",
		borderRadius: 10,
		padding: 12,
		marginBottom: 16,
	},
	errorText: { flex: 1, fontSize: 14, color: SoliColors.error },

	reviewActions: { flexDirection: "row", gap: 10 },
	outlinedBtn: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 6,
		borderWidth: 1.5,
		borderColor: "#E0E0E0",
		borderRadius: SoliShapes.borderRadius.button,
		paddingVertical: 14,
	},
	outlinedBtnText: { fontSize: 15, fontWeight: "600", color: SoliColors.text.secondary },
	submitBtnWrapper: { flex: 1.5, borderRadius: SoliShapes.borderRadius.button, overflow: "hidden" },
	submitBtn: { alignItems: "center", justifyContent: "center", paddingVertical: 14 },
});
