import { useCallback, useEffect, useRef, useState } from "react";
import {
	View,
	Text,
	ScrollView,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	RefreshControl,
	Modal,
	KeyboardAvoidingView,
	Platform,
	ActivityIndicator,
	Animated,
	Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axios from "axios";

import api from "@/config/api";
import { useAuth } from "@/context/AuthContext";
import { SectionHeader } from "@/components/SectionHeader";
import { EmptyState } from "@/components/EmptyState";
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
			<Text style={[styles.avatarLetter, { fontSize: size * 0.4 }]}>{initial}</Text>
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

// ─── Filter types ─────────────────────────────────────────────────────────────

type FilterType = "all" | "joined" | "not_joined";

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function AssociationsIndex() {
	const router = useRouter();
	const { logout } = useAuth();
	const insets = useSafeAreaInsets();

	const [allAssociations, setAllAssociations] = useState<Association[]>([]);
	const [myAssociations, setMyAssociations] = useState<MyAssociation[]>([]);
	const [currentUser, setCurrentUser] = useState<User | null>(null);
	const [loadingAll, setLoadingAll] = useState(true);
	const [refreshing, setRefreshing] = useState(false);

	const [searchQuery, setSearchQuery] = useState("");
	const [filter, setFilter] = useState<FilterType>("all");

	const [createModalVisible, setCreateModalVisible] = useState(false);
	const [newName, setNewName] = useState("");
	const [newDescription, setNewDescription] = useState("");
	const [creating, setCreating] = useState(false);

	const [joiningId, setJoiningId] = useState<string | null>(null);
	const [leavingId, setLeavingId] = useState<string | null>(null);

	const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
	const showToast = useCallback((message: string, type: "success" | "error") => {
		setToast({ message, type });
		setTimeout(() => setToast(null), 2500);
	}, []);

	// ─── FAB scale ───────────────────────────────────────────────────────────
	const fabScale = useRef(new Animated.Value(1)).current;
	const onFabPressIn = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		Animated.spring(fabScale, { toValue: 0.88, useNativeDriver: true, speed: 30, bounciness: 4 }).start();
	};
	const onFabPressOut = () => {
		Animated.spring(fabScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }).start();
	};

	// ─── Helpers ─────────────────────────────────────────────────────────────

	const isMember = useCallback(
		(id: string) => myAssociations.some((ma) => ma.association.id === id && ma.membership.status === "APPROVED"),
		[myAssociations],
	);
	const getMembership = useCallback(
		(id: string) => myAssociations.find((ma) => ma.association.id === id),
		[myAssociations],
	);

	// ─── Fetch ────────────────────────────────────────────────────────────────

	const fetchAll = useCallback(async () => {
		try {
			const [meRes, allRes, myRes] = await Promise.all([
				api.get<User>("/api/users/me"),
				api.get<{ content: Association[] }>("/api/associations?size=100"),
				api.get<MyAssociation[]>("/api/associations/my"),
			]);
			setCurrentUser(meRes.data);
			setAllAssociations(allRes.data.content ?? []);
			setMyAssociations(myRes.data ?? []);
		} catch (err) {
			if (axios.isAxiosError(err) && err.response?.status === 401) logout();
		} finally {
			setLoadingAll(false);
			setRefreshing(false);
		}
	}, [logout]);

	useEffect(() => {
		fetchAll();
	}, [fetchAll]);

	// ─── Actions ─────────────────────────────────────────────────────────────

	const handleJoin = async (id: string) => {
		setJoiningId(id);
		try {
			await api.post(`/api/associations/${id}/join`);
			await fetchAll();
			showToast("Iscrizione inviata!", "success");
		} catch (err) {
			if (axios.isAxiosError(err) && err.response?.status === 409) {
				showToast("Iscrizione già presente o in attesa.", "error");
			} else {
				showToast("Errore durante l'iscrizione.", "error");
			}
		} finally {
			setJoiningId(null);
		}
	};

	const handleLeave = async (id: string) => {
		if (!currentUser) return;
		setLeavingId(id);
		try {
			await api.delete(`/api/associations/${id}/members/${currentUser.id}`);
			await fetchAll();
			showToast("Hai abbandonato l'associazione.", "success");
		} catch (err) {
			if (axios.isAxiosError(err) && err.response?.status === 409) {
				showToast("Sei l'unico admin — nomina un altro prima.", "error");
			} else {
				showToast("Errore.", "error");
			}
		} finally {
			setLeavingId(null);
		}
	};

	const handleCreate = async () => {
		if (!newName.trim()) return;
		setCreating(true);
		try {
			await api.post("/api/associations", {
				name: newName.trim(),
				description: newDescription.trim() || undefined,
			});
			setCreateModalVisible(false);
			setNewName("");
			setNewDescription("");
			await fetchAll();
			showToast("Associazione creata!", "success");
		} catch {
			showToast("Errore durante la creazione.", "error");
		} finally {
			setCreating(false);
		}
	};

	// ─── Filtered list ────────────────────────────────────────────────────────

	const filtered = allAssociations
		.filter((a) => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
		.filter((a) => {
			if (filter === "all") return true;
			const member = isMember(a.id);
			return filter === "joined" ? member : !member;
		});

	// ─── Render ───────────────────────────────────────────────────────────────

	if (loadingAll) {
		return (
			<View style={styles.centered}>
				<ActivityIndicator size="large" color={SoliColors.primary.main} />
			</View>
		);
	}

	const myApproved = myAssociations.filter((ma) => ma.membership.status === "APPROVED");
	const myPending = myAssociations.filter((ma) => ma.membership.status === "PENDING");

	return (
		<View style={styles.container}>
			<ScrollView
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor={SoliColors.primary.main} />}
				contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 12 }]}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
			>
				<Text style={styles.pageTitle}>Associazioni</Text>

				{/* ── My associations ── */}
				<SectionHeader title="Le mie associazioni" />
				{myApproved.length === 0 && myPending.length === 0 ? (
					<View style={styles.myEmptyState}>
						<Text style={styles.myEmptyText}>Non sei iscritto a nessuna associazione.</Text>
					</View>
				) : (
					<>
						{myPending.map(({ association, membership }) => (
							<TouchableOpacity
								key={association.id}
								style={[styles.myCard, { opacity: 0.7 }]}
								onPress={() => router.push(`./associations/${association.id}`)}
								activeOpacity={0.8}
							>
								<AvatarCircle name={association.name} id={association.id} accentColor={association.accentColor} size={40} />
								<View style={{ flex: 1 }}>
									<Text style={styles.myCardName}>{association.name}</Text>
									<Text style={styles.pendingBadge}>⏳ In attesa di approvazione</Text>
								</View>
								<MaterialIcons name="chevron-right" size={20} color={SoliColors.text.disabled} />
							</TouchableOpacity>
						))}
						{myApproved.map(({ association, membership }) => (
							<TouchableOpacity
								key={association.id}
								style={styles.myCard}
								onPress={() => router.push(`./associations/${association.id}`)}
								activeOpacity={0.8}
							>
								<AvatarCircle name={association.name} id={association.id} accentColor={association.accentColor} size={40} />
								<View style={{ flex: 1 }}>
									<Text style={styles.myCardName}>{association.name}</Text>
									<View style={styles.rolePill}>
										<Text style={styles.rolePillText}>
											{membership.role === "ADMIN" ? "Admin" : "Membro"}
										</Text>
									</View>
								</View>
								<MaterialIcons name="chevron-right" size={20} color={SoliColors.text.disabled} />
							</TouchableOpacity>
						))}
					</>
				)}

				{/* ── Search ── */}
				<View style={styles.searchBar}>
					<MaterialIcons name="search" size={20} color={SoliColors.text.disabled} />
					<TextInput
						value={searchQuery}
						onChangeText={setSearchQuery}
						placeholder="Cerca associazioni…"
						placeholderTextColor={SoliColors.text.disabled}
						style={styles.searchInput}
					/>
					{searchQuery.length > 0 && (
						<TouchableOpacity onPress={() => setSearchQuery("")}>
							<MaterialIcons name="close" size={18} color={SoliColors.text.disabled} />
						</TouchableOpacity>
					)}
				</View>

				{/* ── Filter chips ── */}
				<View style={styles.filterRow}>
					{(["all", "joined", "not_joined"] as FilterType[]).map((f) => (
						<TouchableOpacity
							key={f}
							onPress={() => setFilter(f)}
							style={[styles.filterChip, filter === f && styles.filterChipActive]}
							activeOpacity={0.8}
						>
							<Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
								{f === "all" ? "Tutte" : f === "joined" ? "Iscritto" : "Non iscritto"}
							</Text>
						</TouchableOpacity>
					))}
				</View>

				{/* ── All associations ── */}
				<SectionHeader title={`Tutte le associazioni`} rightLabel={`${filtered.length}`} />

				{filtered.length === 0 ? (
					<EmptyState
						icon="search-off"
						title="Nessun risultato"
						subtitle="Prova a modificare la ricerca o i filtri."
					/>
				) : (
					filtered.map((assoc) => {
						const memberEntry = getMembership(assoc.id);
						const approved = memberEntry?.membership.status === "APPROVED";
						const pending = memberEntry?.membership.status === "PENDING";
						return (
							<TouchableOpacity
								key={assoc.id}
								style={styles.allCard}
								onPress={() => router.push(`./associations/${assoc.id}`)}
								activeOpacity={0.8}
							>
								<AvatarCircle name={assoc.name} id={assoc.id} accentColor={assoc.accentColor} size={44} />
								<View style={{ flex: 1, marginLeft: 12 }}>
									<Text style={styles.allCardName} numberOfLines={1}>{assoc.name}</Text>
									{assoc.description ? (
										<Text style={styles.allCardDesc} numberOfLines={1}>{assoc.description}</Text>
									) : null}
								</View>
								<View style={{ justifyContent: "center" }}>
									{pending ? (
										<Text style={styles.pendingText}>In attesa</Text>
									) : approved ? (
										<TouchableOpacity
											onPress={() => handleLeave(assoc.id)}
											disabled={leavingId === assoc.id}
										>
											{leavingId === assoc.id ? (
												<ActivityIndicator size="small" color={SoliColors.error} />
											) : (
												<Text style={styles.leaveText}>Abbandona</Text>
											)}
										</TouchableOpacity>
									) : (
										<TouchableOpacity
											onPress={() => handleJoin(assoc.id)}
											disabled={joiningId === assoc.id}
											style={styles.joinBtn}
										>
											{joiningId === assoc.id ? (
												<ActivityIndicator size="small" color={SoliColors.primary.main} />
											) : (
												<Text style={styles.joinBtnText}>Iscriviti</Text>
											)}
										</TouchableOpacity>
									)}
								</View>
							</TouchableOpacity>
						);
					})
				)}
			</ScrollView>

			{/* ── FAB ── */}
			<View style={[styles.fabContainer, { bottom: insets.bottom + 16 }]}>
				<Pressable
					onPressIn={onFabPressIn}
					onPressOut={onFabPressOut}
					onPress={() => setCreateModalVisible(true)}
					accessibilityRole="button"
					accessibilityLabel="Crea associazione"
				>
					<Animated.View style={{ transform: [{ scale: fabScale }] }}>
						<LinearGradient colors={SoliGradients.button} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fab}>
							<MaterialIcons name="add" size={28} color="#FFF" />
						</LinearGradient>
					</Animated.View>
				</Pressable>
			</View>

			{/* ── Create modal ── */}
			<Modal
				visible={createModalVisible}
				transparent
				animationType="slide"
				onRequestClose={() => setCreateModalVisible(false)}
			>
				<KeyboardAvoidingView
					style={styles.modalBackdrop}
					behavior={Platform.OS === "ios" ? "padding" : undefined}
				>
					<Pressable style={{ flex: 1 }} onPress={() => setCreateModalVisible(false)} />
					<View style={styles.modalCard}>
						<Text style={styles.modalTitle}>Nuova associazione</Text>
						<TextInput
							value={newName}
							onChangeText={setNewName}
							placeholder="Nome associazione *"
							placeholderTextColor={SoliColors.text.disabled}
							style={styles.input}
						/>
						<TextInput
							value={newDescription}
							onChangeText={setNewDescription}
							placeholder="Descrizione (opzionale)"
							placeholderTextColor={SoliColors.text.disabled}
							style={[styles.input, styles.inputMultiline]}
							multiline
							numberOfLines={3}
							textAlignVertical="top"
						/>
						<View style={styles.modalActions}>
							<TouchableOpacity onPress={() => setCreateModalVisible(false)} style={styles.modalBtnOutline}>
								<Text style={styles.modalBtnOutlineText}>Annulla</Text>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={handleCreate}
								disabled={!newName.trim() || creating}
								style={[styles.modalBtnPrimary, (!newName.trim() || creating) && { opacity: 0.6 }]}
							>
								{creating ? (
									<ActivityIndicator color="#FFF" />
								) : (
									<Text style={styles.modalBtnPrimaryText}>Crea</Text>
								)}
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
	centered: { flex: 1, alignItems: "center", justifyContent: "center" },
	scrollContent: { paddingHorizontal: 16, paddingBottom: 100 },
	pageTitle: { fontSize: 28, fontWeight: "700", color: SoliColors.text.primary, marginBottom: 16 },
	// My cards
	myCard: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: SoliColors.background.paper,
		borderRadius: SoliShapes.borderRadius.card,
		padding: 14,
		marginBottom: 10,
		gap: 12,
		...SoliShapes.shadow.card,
	},
	myCardName: { fontSize: 15, fontWeight: "600", color: SoliColors.text.primary, marginBottom: 4 },
	rolePill: {
		alignSelf: "flex-start",
		backgroundColor: "#E0F2F1",
		borderRadius: 12,
		paddingHorizontal: 8,
		paddingVertical: 2,
	},
	rolePillText: { fontSize: 11, fontWeight: "700", color: SoliColors.primary.main },
	pendingBadge: { fontSize: 12, color: "#E65100" },
	myEmptyState: { marginBottom: 20, alignItems: "center" },
	myEmptyText: { fontSize: 14, color: SoliColors.text.secondary },
	// Search
	searchBar: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		backgroundColor: SoliColors.background.paper,
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 10,
		marginBottom: 12,
		...SoliShapes.shadow.card,
	},
	searchInput: { flex: 1, fontSize: 15, color: SoliColors.text.primary },
	// Filter
	filterRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
	filterChip: {
		paddingHorizontal: 14,
		paddingVertical: 7,
		borderRadius: 20,
		backgroundColor: "#F5F5F5",
		borderWidth: 1,
		borderColor: "#E0E0E0",
	},
	filterChipActive: { backgroundColor: SoliColors.primary.main, borderColor: SoliColors.primary.main },
	filterChipText: { fontSize: 13, fontWeight: "600", color: SoliColors.text.secondary },
	filterChipTextActive: { color: "#FFF" },
	// All cards
	allCard: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: SoliColors.background.paper,
		borderRadius: SoliShapes.borderRadius.card,
		padding: 14,
		marginBottom: 10,
		...SoliShapes.shadow.card,
	},
	allCardName: { fontSize: 15, fontWeight: "600", color: SoliColors.text.primary, marginBottom: 2 },
	allCardDesc: { fontSize: 13, color: SoliColors.text.secondary },
	joinBtn: {
		borderWidth: 1.5,
		borderColor: SoliColors.primary.main,
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 6,
	},
	joinBtnText: { fontSize: 13, fontWeight: "600", color: SoliColors.primary.main },
	leaveText: { fontSize: 13, fontWeight: "600", color: SoliColors.error },
	pendingText: { fontSize: 12, color: SoliColors.text.disabled, fontWeight: "500" },
	// Avatar
	avatarCircle: { justifyContent: "center", alignItems: "center" },
	avatarLetter: { fontWeight: "700", color: "#FFF" },
	// FAB
	fabContainer: { position: "absolute", right: 20 },
	fab: {
		width: 56,
		height: 56,
		borderRadius: 28,
		justifyContent: "center",
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.22,
		shadowRadius: 10,
		elevation: 8,
	},
	// Modal
	modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
	modalCard: {
		backgroundColor: SoliColors.background.paper,
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		padding: 24,
		gap: 14,
	},
	modalTitle: { fontSize: 20, fontWeight: "700", color: SoliColors.text.primary },
	input: {
		backgroundColor: SoliColors.background.default,
		borderRadius: SoliShapes.borderRadius.input,
		borderWidth: 1,
		borderColor: "#E0E0E0",
		paddingHorizontal: 14,
		paddingVertical: 12,
		fontSize: 15,
		color: SoliColors.text.primary,
	},
	inputMultiline: { paddingTop: 12, minHeight: 80 },
	modalActions: { flexDirection: "row", gap: 10 },
	modalBtnOutline: {
		flex: 1,
		borderWidth: 1.5,
		borderColor: "#E0E0E0",
		borderRadius: 10,
		paddingVertical: 12,
		alignItems: "center",
	},
	modalBtnOutlineText: { fontWeight: "600", color: SoliColors.text.secondary },
	modalBtnPrimary: {
		flex: 1,
		backgroundColor: SoliColors.primary.main,
		borderRadius: 10,
		paddingVertical: 12,
		alignItems: "center",
	},
	modalBtnPrimaryText: { fontWeight: "700", color: "#FFF", fontSize: 15 },
	// Toast
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
