import { useCallback, useEffect, useRef, useState } from "react";
import {
	View,
	Text,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	TextInput,
	ActivityIndicator,
	Animated,
	KeyboardAvoidingView,
	Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import axios from "axios";

import api from "@/config/api";
import { useAuth } from "@/context/AuthContext";
import { useRole } from "@/context/RoleContext";
import { SectionHeader } from "@/components/SectionHeader";
import { EmptyState } from "@/components/EmptyState";
import { CATEGORY_CONFIG } from "@/constants/taskConfig";
import { SoliColors, SoliGradients, SoliShapes } from "@/constants/theme";
import type { User } from "@/types/models/User";
import type { VolunteerProfile, ServiceCategory } from "@/types/models/VolunteerProfile";
import type { Wallet, Transaction, TransactionType } from "@/types/models/Wallet";

// ─── Constants ────────────────────────────────────────────────────────────────

const DISTANCE_PRESETS = [500, 1000, 2000, 5000, 10000, 20000];
const DISTANCE_LABELS: Record<number, string> = {
	500: "500 m",
	1000: "1 km",
	2000: "2 km",
	5000: "5 km",
	10000: "10 km",
	20000: "20 km",
};

const TRANSACTION_CONFIG: Record<TransactionType, { label: string; color: string; sign: string }> = {
	EARN_TASK_REWARD: { label: "Ricompensa task", color: SoliColors.success, sign: "+" },
	SPEND_DONATION: { label: "Donazione", color: SoliColors.secondary.main, sign: "-" },
	ADJUSTMENT: { label: "Rettifica", color: SoliColors.text.secondary, sign: "±" },
};

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

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
	const { user: oidcUser, logout } = useAuth();
	const { role } = useRole();
	const isVolunteer = role === "volunteer";

	// ── User & wallet
	const [dbUser, setDbUser] = useState<User | null>(null);
	const [wallet, setWallet] = useState<Wallet | null>(null);
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [loadingUser, setLoadingUser] = useState(true);
	const [loadingWallet, setLoadingWallet] = useState(true);

	// ── Volunteer profile
	const [volunteerProfile, setVolunteerProfile] = useState<VolunteerProfile | null>(null);
	const [loadingProfile, setLoadingProfile] = useState(false);
	const [selectedCategories, setSelectedCategories] = useState<ServiceCategory[]>([]);
	const [constraints, setConstraints] = useState("");
	const [maxDistance, setMaxDistance] = useState<number>(2000);
	const [profileDirty, setProfileDirty] = useState(false);
	const [savingProfile, setSavingProfile] = useState(false);

	const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

	const showToast = useCallback((message: string, type: "success" | "error") => {
		setToast({ message, type });
		setTimeout(() => setToast(null), 2500);
	}, []);

	// ── Display name
	const firstName = oidcUser?.given_name ?? dbUser?.firstName ?? "";
	const lastName = oidcUser?.family_name ?? dbUser?.lastName ?? "";
	const displayName = [firstName, lastName].filter(Boolean).join(" ") || oidcUser?.name || oidcUser?.email || "Utente";
	const email = oidcUser?.email ?? dbUser?.email ?? "";
	const initials = displayName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

	// ─── Fetch ────────────────────────────────────────────────────────────────

	useEffect(() => {
		const fetchUserAndWallet = async () => {
			try {
				const [meRes, walletRes, txRes] = await Promise.all([
					api.get<User>("/api/users/me"),
					api.get<Wallet>("/api/wallets/my"),
					api.get<{ content: Transaction[] }>("/api/wallets/my/transactions?size=5"),
				]);
				setDbUser(meRes.data);
				setWallet(walletRes.data);
				setTransactions(txRes.data.content ?? []);
			} catch (err) {
				if (axios.isAxiosError(err) && err.response?.status === 401) logout();
			} finally {
				setLoadingUser(false);
				setLoadingWallet(false);
			}
		};
		fetchUserAndWallet();
	}, [logout]);

	useEffect(() => {
		if (!isVolunteer) return;
		const fetchProfile = async () => {
			setLoadingProfile(true);
			try {
				const res = await api.get<VolunteerProfile>("/api/volunteer-profiles/my");
				setVolunteerProfile(res.data);
			} catch (err) {
				if (axios.isAxiosError(err) && err.response?.status !== 404) {
					// 404 means no profile yet → stay null
				}
				setVolunteerProfile(null);
			} finally {
				setLoadingProfile(false);
			}
		};
		fetchProfile();
	}, [isVolunteer]);

	// Init form from fetched volunteer profile
	useEffect(() => {
		if (volunteerProfile) {
			setSelectedCategories(volunteerProfile.serviceCategories ?? []);
			setConstraints(volunteerProfile.constraints ?? "");
			setMaxDistance(volunteerProfile.maxTaskDistanceMeters ?? 2000);
		}
	}, [volunteerProfile]);

	// ─── Volunteer prefs handlers ─────────────────────────────────────────────

	const toggleCategory = (cat: ServiceCategory) => {
		setSelectedCategories((prev) =>
			prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
		);
		setProfileDirty(true);
	};

	const handleConstraintsChange = (val: string) => {
		setConstraints(val);
		setProfileDirty(true);
	};

	const handleDistanceChange = (dist: number) => {
		setMaxDistance(dist);
		setProfileDirty(true);
	};

	const handleSaveProfile = async () => {
		setSavingProfile(true);
		try {
			const body = {
				serviceCategories: selectedCategories,
				constraints: constraints.trim() || undefined,
				maxTaskDistanceMeters: maxDistance,
			};
			if (volunteerProfile) {
				await api.put(`/api/volunteer-profiles/${volunteerProfile.id}`, body);
			} else {
				const res = await api.post<VolunteerProfile>("/api/volunteer-profiles", body);
				setVolunteerProfile(res.data);
			}
			setProfileDirty(false);
			showToast("Preferenze salvate.", "success");
		} catch {
			showToast("Errore durante il salvataggio.", "error");
		} finally {
			setSavingProfile(false);
		}
	};

	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<KeyboardAvoidingView
			style={styles.container}
			behavior={Platform.OS === "ios" ? "padding" : undefined}
		>
			<ScrollView
				contentContainerStyle={styles.content}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
			>
				{/* ── Avatar section ── */}
				<View style={styles.avatarSection}>
					<LinearGradient
						colors={SoliGradients.button}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 1 }}
						style={styles.avatar}
					>
						<Text style={styles.avatarText}>{initials || "?"}</Text>
					</LinearGradient>
					<Text style={styles.displayName}>{displayName}</Text>
					{email ? <Text style={styles.email}>{email}</Text> : null}
					{dbUser ? (
						<View style={styles.roleBadge}>
							<MaterialIcons name="badge" size={13} color={SoliColors.primary.main} />
							<Text style={styles.roleBadgeText}>
								{dbUser.role === "VOLUNTEER" ? "Volontario" : dbUser.role === "REQUESTER" ? "Richiedente" : dbUser.role}
							</Text>
						</View>
					) : null}
				</View>

				{/* ── Wallet card ── */}
				<View style={styles.card}>
					<View style={styles.walletHeader}>
						<MaterialIcons name="account-balance-wallet" size={22} color={SoliColors.primary.main} />
						<Text style={styles.walletTitle}>Portafoglio SOLI</Text>
					</View>
					{loadingWallet ? (
						<ActivityIndicator color={SoliColors.primary.main} style={{ marginVertical: 12 }} />
					) : (
						<Text style={styles.walletBalance}>
							{wallet?.balance ?? "—"} <Text style={styles.walletUnit}>Crediti</Text>
						</Text>
					)}

					<SectionHeader title="Ultime transazioni" />
					{loadingWallet ? null : transactions.length === 0 ? (
						<View style={styles.txEmpty}>
							<Text style={styles.txEmptyText}>Nessuna transazione</Text>
						</View>
					) : (
						transactions.map((tx) => {
							const cfg = TRANSACTION_CONFIG[tx.transactionType];
							return (
								<View key={tx.id} style={styles.txRow}>
									<View style={{ flex: 1 }}>
										<Text style={styles.txLabel}>{cfg.label}</Text>
										<Text style={styles.txDate}>
											{new Date(tx.timestamp).toLocaleDateString("it-IT", {
												day: "2-digit",
												month: "short",
												year: "numeric",
											})}
										</Text>
									</View>
									<Text style={[styles.txAmount, { color: cfg.color }]}>
										{cfg.sign}{Math.abs(tx.amount)}
									</Text>
								</View>
							);
						})
					)}
				</View>

				{/* ── Volunteer preferences ── */}
				{isVolunteer && (
					<View style={styles.card}>
						<SectionHeader title="Preferenze Volontario" />

						{loadingProfile ? (
							<ActivityIndicator color={SoliColors.primary.main} style={{ marginVertical: 16 }} />
						) : (
							<>
								{/* Categories */}
								<Text style={styles.prefLabel}>Categorie di servizio</Text>
								<View style={styles.categoryChips}>
									{(Object.entries(CATEGORY_CONFIG) as [ServiceCategory, typeof CATEGORY_CONFIG[ServiceCategory]][]).map(([key, config]) => {
										const selected = selectedCategories.includes(key);
										return (
											<TouchableOpacity
												key={key}
												onPress={() => toggleCategory(key)}
												style={[
													styles.categoryChip,
													selected && { backgroundColor: config.bgColor, borderColor: config.color, borderWidth: 2 },
												]}
												activeOpacity={0.8}
											>
												<MaterialIcons name={config.icon as any} size={14} color={selected ? config.color : SoliColors.text.disabled} />
												<Text style={[styles.chipText, { color: selected ? config.color : SoliColors.text.secondary }]}>
													{config.label}
												</Text>
											</TouchableOpacity>
										);
									})}
								</View>

								{/* Constraints */}
								<Text style={[styles.prefLabel, { marginTop: 16 }]}>Vincoli o note</Text>
								<TextInput
									value={constraints}
									onChangeText={handleConstraintsChange}
									placeholder="Es. Non disponibile il lunedì, niente lavori pesanti…"
									placeholderTextColor={SoliColors.text.disabled}
									style={[styles.input, styles.inputMultiline]}
									multiline
									numberOfLines={3}
									textAlignVertical="top"
								/>

								{/* Distance */}
								<Text style={[styles.prefLabel, { marginTop: 16 }]}>Distanza massima</Text>
								<ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.distanceScroll}>
									{DISTANCE_PRESETS.map((dist) => {
										const selected = maxDistance === dist;
										return (
											<TouchableOpacity
												key={dist}
												onPress={() => handleDistanceChange(dist)}
												style={[
													styles.distanceChip,
													selected && { backgroundColor: SoliColors.primary.main, borderColor: SoliColors.primary.main },
												]}
												activeOpacity={0.8}
											>
												<Text style={[styles.chipText, { color: selected ? "#FFF" : SoliColors.text.secondary }]}>
													{DISTANCE_LABELS[dist]}
												</Text>
											</TouchableOpacity>
										);
									})}
								</ScrollView>

								{/* Save button */}
								{profileDirty && (
									<TouchableOpacity
										onPress={handleSaveProfile}
										disabled={savingProfile}
										activeOpacity={0.85}
										style={[styles.saveWrapper, savingProfile && { opacity: 0.7 }]}
									>
										<LinearGradient
											colors={SoliGradients.button}
											start={{ x: 0, y: 0 }}
											end={{ x: 1, y: 0 }}
											style={styles.saveBtn}
										>
											{savingProfile ? (
												<ActivityIndicator color="#FFF" />
											) : (
												<Text style={styles.saveBtnText}>Salva preferenze</Text>
											)}
										</LinearGradient>
									</TouchableOpacity>
								)}
							</>
						)}
					</View>
				)}

				{/* ── Logout ── */}
				<TouchableOpacity style={styles.logoutButton} onPress={logout} activeOpacity={0.7}>
					<MaterialIcons name="logout" size={18} color={SoliColors.error} />
					<Text style={styles.logoutText}>Esci</Text>
				</TouchableOpacity>
			</ScrollView>

			{toast && <Toast message={toast.message} type={toast.type} />}
		</KeyboardAvoidingView>
	);
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: SoliColors.background.default },
	content: { padding: 20, paddingTop: 36, paddingBottom: 40, alignItems: "center" },
	// Avatar
	avatarSection: { alignItems: "center", marginBottom: 24, width: "100%" },
	avatar: {
		width: 80,
		height: 80,
		borderRadius: 40,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 14,
		shadowColor: SoliColors.primary.main,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 12,
		elevation: 6,
	},
	avatarText: { fontSize: 28, fontWeight: "700", color: "#FFF", letterSpacing: 1 },
	displayName: { fontSize: 22, fontWeight: "700", color: SoliColors.text.primary, marginBottom: 4, textAlign: "center" },
	email: { fontSize: 14, color: SoliColors.text.secondary, textAlign: "center", marginBottom: 8 },
	roleBadge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		backgroundColor: "#E0F2F1",
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 20,
	},
	roleBadgeText: { fontSize: 13, fontWeight: "600", color: SoliColors.primary.main },
	// Card
	card: {
		backgroundColor: SoliColors.background.paper,
		borderRadius: SoliShapes.borderRadius.card,
		padding: 20,
		width: "100%",
		marginBottom: 16,
		...SoliShapes.shadow.card,
	},
	// Wallet
	walletHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
	walletTitle: { fontSize: 16, fontWeight: "700", color: SoliColors.text.primary },
	walletBalance: { fontSize: 32, fontWeight: "800", color: SoliColors.text.primary, marginBottom: 16 },
	walletUnit: { fontSize: 16, fontWeight: "400", color: SoliColors.text.secondary },
	txRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 8,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: "#E0E0E0",
	},
	txLabel: { fontSize: 14, fontWeight: "500", color: SoliColors.text.primary },
	txDate: { fontSize: 12, color: SoliColors.text.secondary, marginTop: 2 },
	txAmount: { fontSize: 16, fontWeight: "700" },
	txEmpty: { paddingVertical: 12, alignItems: "center" },
	txEmptyText: { fontSize: 14, color: SoliColors.text.disabled },
	// Volunteer prefs
	prefLabel: { fontSize: 14, fontWeight: "600", color: SoliColors.text.primary, marginBottom: 10 },
	categoryChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
	categoryChip: {
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
		paddingHorizontal: 12,
		paddingVertical: 7,
		borderRadius: 20,
		backgroundColor: "#F5F5F5",
		borderWidth: 1,
		borderColor: "#E0E0E0",
	},
	chipText: { fontSize: 13, fontWeight: "600" },
	input: {
		backgroundColor: SoliColors.background.default,
		borderRadius: SoliShapes.borderRadius.input,
		borderWidth: 1,
		borderColor: "#E0E0E0",
		paddingHorizontal: 14,
		paddingVertical: 10,
		fontSize: 14,
		color: SoliColors.text.primary,
	},
	inputMultiline: { paddingTop: 10, minHeight: 80 },
	distanceScroll: { marginTop: 0 },
	distanceChip: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 20,
		backgroundColor: "#F5F5F5",
		borderWidth: 1,
		borderColor: "#E0E0E0",
		marginRight: 8,
	},
	saveWrapper: { borderRadius: SoliShapes.borderRadius.button, overflow: "hidden", marginTop: 20 },
	saveBtn: { paddingVertical: 14, alignItems: "center" },
	saveBtnText: { fontSize: 15, fontWeight: "700", color: "#FFF" },
	// Logout
	logoutButton: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		paddingVertical: 14,
		paddingHorizontal: 32,
		borderRadius: 12,
		borderWidth: 1.5,
		borderColor: SoliColors.error,
		marginTop: 8,
	},
	logoutText: { color: SoliColors.error, fontSize: 16, fontWeight: "600" },
	// Toast
	toast: {
		position: "absolute",
		bottom: 24,
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
