import { useCallback, useEffect, useRef, useState } from "react";
import {
	View,
	Text,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	Modal,
	TextInput,
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	Animated,
	Pressable,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";

import api from "@/config/api";
import { useAuth } from "@/context/AuthContext";
import { SectionHeader } from "@/components/SectionHeader";
import { SoliColors, SoliGradients, SoliShapes } from "@/constants/theme";
import type { Association, AssociationMembership, MyAssociation } from "@/types/models/Association";
import type { User } from "@/types/models/User";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PALETTE = ["#00796B", "#1565C0", "#6A1B9A", "#00838F", "#4527A0", "#E65100"];

function getAvatarColor(id: string, accentColor?: string | null): string {
	if (accentColor) return accentColor;
	return PALETTE[id.charCodeAt(0) % PALETTE.length];
}

function AvatarCircle({ name, id, accentColor, size = 44 }: { name: string; id: string; accentColor?: string | null; size?: number }) {
	const initial = name.trim()[0]?.toUpperCase() ?? "?";
	const color = getAvatarColor(id, accentColor);
	return (
		<View style={[styles.avatarCircle, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
			<Text style={{ fontSize: size * 0.4, fontWeight: "700", color: "#FFF" }}>{initial}</Text>
		</View>
	);
}

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
			style={[styles.toast, { opacity, backgroundColor: type === "success" ? SoliColors.success : SoliColors.error }]}
			pointerEvents="none"
		>
			<MaterialIcons name={type === "success" ? "check-circle" : "error"} size={18} color="#FFF" />
			<Text style={styles.toastText}>{message}</Text>
		</Animated.View>
	);
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AssociationDetailScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const router = useRouter();
	const { logout } = useAuth();

	const [association, setAssociation] = useState<Association | null>(null);
	const [members, setMembers] = useState<AssociationMembership[]>([]);
	const [myMembership, setMyMembership] = useState<AssociationMembership | null>(null);
	const [currentUser, setCurrentUser] = useState<User | null>(null);
	const [userNames, setUserNames] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [editModalVisible, setEditModalVisible] = useState(false);
	const [editName, setEditName] = useState("");
	const [editDescription, setEditDescription] = useState("");
	const [saving, setSaving] = useState(false);

	const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

	const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
	const showToast = useCallback((message: string, type: "success" | "error") => {
		setToast({ message, type });
		setTimeout(() => setToast(null), 2500);
	}, []);

	// ─── Derived ─────────────────────────────────────────────────────────────

	const isAdmin = myMembership?.role === "ADMIN";
	const isMember = myMembership?.status === "APPROVED";
	const isPending = myMembership?.status === "PENDING";

	const approvedMembers = members.filter((m) => m.status === "APPROVED");
	const pendingMembers = members.filter((m) => m.status === "PENDING");

	// ─── Fetch ────────────────────────────────────────────────────────────────

	const fetchAll = useCallback(async () => {
		try {
			setError(null);
			const [assocRes, meRes, myRes] = await Promise.all([
				api.get<{ association: Association; members: AssociationMembership[] }>(`/api/associations/${id}`),
				api.get<User>("/api/users/me"),
				api.get<MyAssociation[]>("/api/associations/my"),
			]);

			const { association: assocData, members: membersData } = assocRes.data;
			setAssociation(assocData);
			setMembers(membersData);
			setCurrentUser(meRes.data);

			const myEntry = myRes.data?.find((ma) => ma.association.id === id);
			setMyMembership(myEntry?.membership ?? null);

			// Fetch user names in parallel
			const uniqueIds = [...new Set(membersData.map((m) => m.userId))];
			const results = await Promise.allSettled(
				uniqueIds.map((uid) => api.get<{ id: string; firstName: string; lastName: string }>(`/api/users/${uid}/basic`)),
			);
			const names: Record<string, string> = {};
			results.forEach((result, i) => {
				if (result.status === "fulfilled") {
					const u = result.value.data;
					names[u.id] = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.id;
				} else {
					names[uniqueIds[i]] = "Utente";
				}
			});
			setUserNames(names);
		} catch (err) {
			if (axios.isAxiosError(err) && err.response?.status === 401) {
				logout();
			} else {
				setError("Impossibile caricare l'associazione.");
			}
		} finally {
			setLoading(false);
		}
	}, [id, logout]);

	useEffect(() => {
		fetchAll();
	}, [fetchAll]);

	// ─── Actions ─────────────────────────────────────────────────────────────

	const withLoading = async (key: string, fn: () => Promise<void>) => {
		setActionLoading((prev) => ({ ...prev, [key]: true }));
		try {
			await fn();
		} finally {
			setActionLoading((prev) => ({ ...prev, [key]: false }));
		}
	};

	const handleJoin = () =>
		withLoading("join", async () => {
			await api.post(`/api/associations/${id}/join`);
			await fetchAll();
			showToast("Iscrizione inviata!", "success");
		});

	const handleLeave = () =>
		withLoading("leave", async () => {
			if (!currentUser) return;
			try {
				await api.delete(`/api/associations/${id}/members/${currentUser.id}`);
				router.back();
			} catch (err) {
				if (axios.isAxiosError(err) && err.response?.status === 409) {
					showToast("Sei l'unico admin — nomina un altro prima.", "error");
				} else {
					showToast("Errore durante l'uscita.", "error");
				}
			}
		});

	const handleApprove = (userId: string) =>
		withLoading(`approve_${userId}`, async () => {
			await api.put(`/api/associations/${id}/members/${userId}/approve`);
			await fetchAll();
			showToast("Membro approvato.", "success");
		});

	const handleRemove = (userId: string) =>
		withLoading(`remove_${userId}`, async () => {
			await api.delete(`/api/associations/${id}/members/${userId}`);
			await fetchAll();
			showToast("Membro rimosso.", "success");
		});

	const handleSaveEdit = async () => {
		setSaving(true);
		try {
			await api.put(`/api/associations/${id}`, {
				name: editName.trim(),
				description: editDescription.trim() || undefined,
			});
			setEditModalVisible(false);
			await fetchAll();
			showToast("Associazione aggiornata.", "success");
		} catch {
			showToast("Errore durante il salvataggio.", "error");
		} finally {
			setSaving(false);
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

	if (error || !association) {
		return (
			<View style={styles.centered}>
				<MaterialIcons name="error-outline" size={40} color={SoliColors.error} />
				<Text style={styles.errorText}>{error ?? "Associazione non trovata."}</Text>
				<TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
					<Text style={styles.backBtnText}>Torna indietro</Text>
				</TouchableOpacity>
			</View>
		);
	}

	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<View style={styles.container}>
			<ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

				{/* ── Header card ── */}
				<View style={styles.card}>
					<View style={styles.headerRow}>
						<AvatarCircle name={association.name} id={association.id} accentColor={association.accentColor} size={72} />
						{isAdmin && (
							<TouchableOpacity
								onPress={() => {
									setEditName(association.name);
									setEditDescription(association.description ?? "");
									setEditModalVisible(true);
								}}
								style={styles.editBtn}
							>
								<MaterialIcons name="edit" size={20} color={SoliColors.primary.main} />
							</TouchableOpacity>
						)}
					</View>
					<Text style={styles.assocName}>{association.name}</Text>
					{association.description ? (
						<Text style={styles.assocDesc}>{association.description}</Text>
					) : null}
					<Text style={styles.createdAt}>
						Creata il{" "}
						{new Date(association.createdAt).toLocaleDateString("it-IT", {
							day: "2-digit",
							month: "long",
							year: "numeric",
						})}
					</Text>
				</View>

				{/* ── My membership card ── */}
				{myMembership ? (
					<View style={[styles.card, isPending && styles.pendingCard]}>
						{isPending && (
							<View style={styles.pendingBanner}>
								<MaterialIcons name="schedule" size={16} color="#E65100" />
								<Text style={styles.pendingBannerText}>Richiesta in attesa di approvazione</Text>
							</View>
						)}
						{isMember && (
							<>
								<View style={styles.membershipRow}>
									<View>
										<Text style={styles.membershipLabel}>Il tuo ruolo</Text>
										<View style={[styles.rolePill, myMembership.role === "ADMIN" && styles.rolePillAdmin]}>
											<Text style={[styles.rolePillText, myMembership.role === "ADMIN" && styles.rolePillTextAdmin]}>
												{myMembership.role === "ADMIN" ? "Admin" : "Membro"}
											</Text>
										</View>
									</View>
								</View>
								<TouchableOpacity
									onPress={handleLeave}
									disabled={!!actionLoading["leave"]}
									style={styles.leaveBtn}
								>
									{actionLoading["leave"] ? (
										<ActivityIndicator size="small" color={SoliColors.error} />
									) : (
										<>
											<MaterialIcons name="exit-to-app" size={16} color={SoliColors.error} />
											<Text style={styles.leaveBtnText}>Abbandona</Text>
										</>
									)}
								</TouchableOpacity>
							</>
						)}
					</View>
				) : (
					/* ── Join button ── */
					<TouchableOpacity
						onPress={handleJoin}
						disabled={!!actionLoading["join"]}
						activeOpacity={0.85}
						style={styles.joinBtnWrapper}
					>
						<LinearGradient colors={SoliGradients.button} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.joinBtn}>
							{actionLoading["join"] ? (
								<ActivityIndicator color="#FFF" />
							) : (
								<>
									<MaterialIcons name="group-add" size={20} color="#FFF" />
									<Text style={styles.joinBtnText}>Iscriviti</Text>
								</>
							)}
						</LinearGradient>
					</TouchableOpacity>
				)}

				{/* ── Pending approvals (admin only) ── */}
				{isAdmin && pendingMembers.length > 0 && (
					<View style={styles.card}>
						<SectionHeader title={`Richieste in attesa (${pendingMembers.length})`} />
						{pendingMembers.map((m) => (
							<View key={m.id} style={styles.memberRow}>
								<AvatarCircle name={userNames[m.userId] ?? "U"} id={m.userId} size={36} />
								<Text style={styles.memberName}>{userNames[m.userId] ?? "Caricamento…"}</Text>
								<TouchableOpacity
									onPress={() => handleApprove(m.userId)}
									disabled={!!actionLoading[`approve_${m.userId}`]}
									style={styles.approveBtn}
								>
									{actionLoading[`approve_${m.userId}`] ? (
										<ActivityIndicator size="small" color={SoliColors.primary.main} />
									) : (
										<Text style={styles.approveBtnText}>Approva</Text>
									)}
								</TouchableOpacity>
								<TouchableOpacity
									onPress={() => handleRemove(m.userId)}
									disabled={!!actionLoading[`remove_${m.userId}`]}
								>
									<Text style={styles.rejectText}>Rifiuta</Text>
								</TouchableOpacity>
							</View>
						))}
					</View>
				)}

				{/* ── Members ── */}
				<View style={styles.card}>
					<SectionHeader title={`Membri (${approvedMembers.length})`} />
					{approvedMembers.length === 0 ? (
						<Text style={styles.emptyMembers}>Nessun membro approvato.</Text>
					) : (
						approvedMembers.map((m) => {
							const isMe = m.userId === currentUser?.id;
							return (
								<View key={m.id} style={styles.memberRow}>
									<AvatarCircle name={userNames[m.userId] ?? "U"} id={m.userId} size={36} />
									<View style={{ flex: 1, marginLeft: 10 }}>
										<Text style={styles.memberName}>
											{userNames[m.userId] ?? "Caricamento…"}
											{isMe ? " (tu)" : ""}
										</Text>
										<View style={[styles.rolePill, m.role === "ADMIN" && styles.rolePillAdmin]}>
											<Text style={[styles.rolePillText, m.role === "ADMIN" && styles.rolePillTextAdmin]}>
												{m.role === "ADMIN" ? "Admin" : "Membro"}
											</Text>
										</View>
									</View>
									{isAdmin && !isMe && (
										<TouchableOpacity onPress={() => handleRemove(m.userId)} disabled={!!actionLoading[`remove_${m.userId}`]}>
											{actionLoading[`remove_${m.userId}`] ? (
												<ActivityIndicator size="small" color={SoliColors.error} />
											) : (
												<MaterialIcons name="person-remove" size={20} color={SoliColors.error} />
											)}
										</TouchableOpacity>
									)}
								</View>
							);
						})
					)}
				</View>
			</ScrollView>

			{/* ── Edit modal ── */}
			<Modal
				visible={editModalVisible}
				transparent
				animationType="slide"
				onRequestClose={() => setEditModalVisible(false)}
			>
				<KeyboardAvoidingView
					style={styles.modalBackdrop}
					behavior={Platform.OS === "ios" ? "padding" : undefined}
				>
					<Pressable style={{ flex: 1 }} onPress={() => setEditModalVisible(false)} />
					<View style={styles.modalCard}>
						<Text style={styles.modalTitle}>Modifica associazione</Text>
						<TextInput
							value={editName}
							onChangeText={setEditName}
							placeholder="Nome *"
							placeholderTextColor={SoliColors.text.disabled}
							style={styles.input}
						/>
						<TextInput
							value={editDescription}
							onChangeText={setEditDescription}
							placeholder="Descrizione"
							placeholderTextColor={SoliColors.text.disabled}
							style={[styles.input, styles.inputMultiline]}
							multiline
							numberOfLines={3}
							textAlignVertical="top"
						/>
						<View style={styles.modalActions}>
							<TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.modalBtnOutline}>
								<Text style={styles.modalBtnOutlineText}>Annulla</Text>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={handleSaveEdit}
								disabled={!editName.trim() || saving}
								style={[styles.modalBtnPrimary, (!editName.trim() || saving) && { opacity: 0.6 }]}
							>
								{saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalBtnPrimaryText}>Salva</Text>}
							</TouchableOpacity>
						</View>
					</View>
				</KeyboardAvoidingView>
			</Modal>

			{toast && <Toast message={toast.message} type={toast.type} />}
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
	pendingCard: { borderWidth: 1, borderColor: "#FFB74D" },
	headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 },
	editBtn: {
		padding: 4,
		backgroundColor: "#E0F2F1",
		borderRadius: 8,
	},
	assocName: { fontSize: 22, fontWeight: "700", color: SoliColors.text.primary, marginBottom: 8 },
	assocDesc: { fontSize: 14, color: SoliColors.text.secondary, lineHeight: 20, marginBottom: 8 },
	createdAt: { fontSize: 12, color: SoliColors.text.disabled },
	// Membership
	pendingBanner: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		backgroundColor: "#FFF3E0",
		borderRadius: 8,
		padding: 10,
		marginBottom: 8,
	},
	pendingBannerText: { fontSize: 13, color: "#E65100" },
	membershipRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
	membershipLabel: { fontSize: 12, color: SoliColors.text.secondary, marginBottom: 4 },
	leaveBtn: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 6,
		borderWidth: 1.5,
		borderColor: SoliColors.error,
		borderRadius: 8,
		paddingVertical: 8,
	},
	leaveBtnText: { fontSize: 14, fontWeight: "600", color: SoliColors.error },
	// Join
	joinBtnWrapper: { borderRadius: SoliShapes.borderRadius.button, overflow: "hidden", marginBottom: 12 },
	joinBtn: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		paddingVertical: 14,
	},
	joinBtnText: { fontSize: 16, fontWeight: "700", color: "#FFF" },
	// Role pill
	rolePill: {
		alignSelf: "flex-start",
		backgroundColor: "#F5F5F5",
		borderRadius: 12,
		paddingHorizontal: 8,
		paddingVertical: 2,
	},
	rolePillAdmin: { backgroundColor: "#E0F2F1" },
	rolePillText: { fontSize: 11, fontWeight: "700", color: SoliColors.text.secondary },
	rolePillTextAdmin: { color: SoliColors.primary.main },
	// Members
	memberRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#F0F0F0" },
	memberName: { fontSize: 14, fontWeight: "500", color: SoliColors.text.primary, marginBottom: 4 },
	emptyMembers: { fontSize: 14, color: SoliColors.text.disabled, textAlign: "center", paddingVertical: 12 },
	approveBtn: { borderWidth: 1, borderColor: SoliColors.primary.main, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
	approveBtnText: { fontSize: 13, fontWeight: "600", color: SoliColors.primary.main },
	rejectText: { fontSize: 13, fontWeight: "600", color: SoliColors.error },
	// Avatar
	avatarCircle: { justifyContent: "center", alignItems: "center" },
	// Error
	errorText: { fontSize: 16, color: SoliColors.error, textAlign: "center", marginVertical: 12 },
	backBtn: { backgroundColor: SoliColors.primary.main, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
	backBtnText: { color: "#FFF", fontWeight: "600" },
	// Modal
	modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
	modalCard: { backgroundColor: SoliColors.background.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 14 },
	modalTitle: { fontSize: 20, fontWeight: "700", color: SoliColors.text.primary },
	input: { backgroundColor: SoliColors.background.default, borderRadius: SoliShapes.borderRadius.input, borderWidth: 1, borderColor: "#E0E0E0", paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: SoliColors.text.primary },
	inputMultiline: { paddingTop: 12, minHeight: 80 },
	modalActions: { flexDirection: "row", gap: 10 },
	modalBtnOutline: { flex: 1, borderWidth: 1.5, borderColor: "#E0E0E0", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
	modalBtnOutlineText: { fontWeight: "600", color: SoliColors.text.secondary },
	modalBtnPrimary: { flex: 1, backgroundColor: SoliColors.primary.main, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
	modalBtnPrimaryText: { fontWeight: "700", color: "#FFF", fontSize: 15 },
	// Toast
	toast: { position: "absolute", bottom: 80, left: 24, right: 24, borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "center", gap: 8 },
	toastText: { color: "#FFF", fontWeight: "600", fontSize: 14 },
});
