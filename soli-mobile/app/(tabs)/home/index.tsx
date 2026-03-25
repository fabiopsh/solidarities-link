import { useCallback, useEffect, useRef, useState } from "react";
import {
	View,
	Text,
	FlatList,
	StyleSheet,
	RefreshControl,
	TouchableOpacity,
	Animated,
	Pressable,
	SafeAreaView,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axios from "axios";

import api from "@/config/api";
import { useAuth } from "@/context/AuthContext";
import { useRole } from "@/context/RoleContext";
import { TaskCard } from "@/components/TaskCard";
import { EmptyState } from "@/components/EmptyState";
import { SoliColors, SoliGradients, SoliShapes } from "@/constants/theme";
import type { Task } from "@/types/models/Task";
import type { User } from "@/types/models/User";

// ─── FAB ─────────────────────────────────────────────────────────────────────

interface FABProps {
	disabled: boolean;
	onPress: () => void;
	insets: { bottom: number };
}

function FAB({ disabled, onPress, insets }: FABProps) {
	const scale = useRef(new Animated.Value(1)).current;

	const handlePressIn = () => {
		if (disabled) return;
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		Animated.spring(scale, { toValue: 0.88, useNativeDriver: true, speed: 30, bounciness: 4 }).start();
	};
	const handlePressOut = () => {
		Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }).start();
	};

	return (
		<View style={[styles.fabContainer, { bottom: insets.bottom + 16 }]}>
			<Pressable
				onPressIn={handlePressIn}
				onPressOut={handlePressOut}
				onPress={onPress}
				disabled={disabled}
				accessibilityRole="button"
				accessibilityLabel="Crea nuova richiesta"
			>
				<Animated.View style={{ transform: [{ scale }] }}>
					<LinearGradient
						colors={disabled ? ["#CCCCCC", "#AAAAAA"] : SoliGradients.button}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 1 }}
						style={styles.fab}
					>
						<MaterialIcons name="add" size={28} color="#FFFFFF" />
					</LinearGradient>
				</Animated.View>
			</Pressable>
		</View>
	);
}

// ─── Segmented control ────────────────────────────────────────────────────────

interface SegmentedTabsProps {
	tabs: { key: string; label: string }[];
	active: string;
	onChange: (key: string) => void;
}

function SegmentedTabs({ tabs, active, onChange }: SegmentedTabsProps) {
	return (
		<View style={styles.segmentedContainer}>
			{tabs.map((tab) => {
				const isActive = tab.key === active;
				return (
					<TouchableOpacity
						key={tab.key}
						onPress={() => onChange(tab.key)}
						style={[styles.segmentedTab, isActive && styles.segmentedTabActive]}
						activeOpacity={0.75}
					>
						<Text style={[styles.segmentedLabel, isActive && styles.segmentedLabelActive]}>
							{tab.label}
						</Text>
					</TouchableOpacity>
				);
			})}
		</View>
	);
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function HomeIndex() {
	const { user, logout } = useAuth();
	const { role } = useRole();
	const router = useRouter();
	const insets = useSafeAreaInsets();

	const [tasks, setTasks] = useState<Task[]>([]);
	const [currentUser, setCurrentUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<"available" | "accepted">("available");
	const [dailyCount, setDailyCount] = useState<{ count: number; limit: number } | null>(null);

	const isVolunteer = role === "volunteer";
	const isRequester = role === "requester";

	const displayName = user?.given_name || user?.name || user?.email?.split("@")[0] || "Utente";

	// ─── Data fetching ────────────────────────────────────────────────────────

	const fetchData = useCallback(async () => {
		try {
			setError(null);
			const [meRes, tasksRes] = await Promise.all([
				api.get<User>("/api/users/me"),
				api.get<{ data: Task[] }>("/api/tasks?size=100"),
			]);
			setCurrentUser(meRes.data);
			setTasks(tasksRes.data.data ?? []);

			if (isRequester) {
				try {
					const dcRes = await api.get<{ count: number; limit: number }>("/api/tasks/daily-count");
					setDailyCount(dcRes.data);
				} catch {
					// daily-count is optional — don't break the page
				}
			}
		} catch (err) {
			if (axios.isAxiosError(err) && err.response?.status === 401) {
				logout();
			} else {
				setError("Impossibile caricare le richieste. Riprova.");
			}
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, [isRequester, logout]);

	// Runs on first render AND every time the screen comes back into focus
	// (e.g. after creating a task from the modal — no separate useEffect needed)
	useFocusEffect(
		useCallback(() => {
			setLoading(true);
			fetchData();
		}, [fetchData]),
	);

	const handleRefresh = () => {
		setRefreshing(true);
		fetchData();
	};

	// ─── Filtered lists ───────────────────────────────────────────────────────

	const myId = currentUser?.id;

	if (__DEV__ && (tasks.length > 0 || currentUser)) {
		console.warn(`[Home] tasks=${tasks.length} myId=${myId} role=${role}`);
		if (tasks.length > 0) {
			console.warn(`[Home] first task creatorId=${tasks[0].creatorId} status=${tasks[0].status}`);
		}
	}

	const volunteerAvailable = tasks.filter(
		(t) => (t.status === "OPEN" || t.status === "NOTIFIED") && t.creatorId !== myId,
	);
	const volunteerAccepted = tasks.filter(
		(t) => t.volunteerId === myId && (t.status === "ACCEPTED" || t.status === "IN_PROGRESS"),
	);
	const requesterTasks = tasks.filter((t) => t.creatorId === myId);

	const listData = isVolunteer
		? activeTab === "available"
			? volunteerAvailable
			: volunteerAccepted
		: requesterTasks;

	// ─── Render ───────────────────────────────────────────────────────────────

	const fabDisabled = isRequester && dailyCount != null && dailyCount.count >= dailyCount.limit;

	const renderHeader = () => (
		<View style={styles.listHeader}>
			{/* Welcome */}
			<View style={[styles.welcomeSection, { paddingTop: insets.top + 8 }]}>
				<Text style={styles.welcomeText}>Ciao, {displayName}! 👋</Text>
				<View style={[styles.roleBadge, isVolunteer ? styles.badgeVolunteer : styles.badgeRequester]}>
					<Text style={[styles.roleText, isVolunteer ? styles.roleTextVolunteer : styles.roleTextRequester]}>
						{isVolunteer ? "Volontario" : "Richiedente"}
					</Text>
				</View>
			</View>

			{/* Daily count banner (requester) */}
			{isRequester && dailyCount != null && dailyCount.count > 0 && (
				<View style={styles.dailyBanner}>
					<MaterialIcons name="info" size={16} color="#E65100" />
					<Text style={styles.dailyBannerText}>
						{dailyCount.count}/{dailyCount.limit} richieste create oggi
					</Text>
				</View>
			)}

			{/* Segmented tabs (volunteer only) */}
			{isVolunteer && (
				<SegmentedTabs
					tabs={[
						{ key: "available", label: "Disponibili" },
						{ key: "accepted", label: "In corso" },
					]}
					active={activeTab}
					onChange={(k) => setActiveTab(k as "available" | "accepted")}
				/>
			)}

			{/* Section label */}
			<Text style={styles.sectionLabel}>
				{isVolunteer
					? activeTab === "available"
						? `${volunteerAvailable.length} disponibili`
						: `${volunteerAccepted.length} in corso`
					: `${requesterTasks.length} le tue richieste`}
			</Text>
		</View>
	);

	if (loading) {
		return (
			<SafeAreaView style={styles.centered}>
				<Text style={styles.loadingText}>Caricamento…</Text>
			</SafeAreaView>
		);
	}

	if (error) {
		return (
			<SafeAreaView style={[styles.centered, { paddingTop: insets.top }]}>
				<MaterialIcons name="error-outline" size={40} color={SoliColors.error} />
				<Text style={styles.errorText}>{error}</Text>
				<TouchableOpacity onPress={() => { setLoading(true); fetchData(); }} style={styles.retryButton}>
					<Text style={styles.retryText}>Riprova</Text>
				</TouchableOpacity>
			</SafeAreaView>
		);
	}

	return (
		<View style={styles.container}>
			<FlatList
				data={listData}
				keyExtractor={(item) => item.id}
				renderItem={({ item }) => (
					<TaskCard
						task={item}
						currentUserId={myId}
						onPress={(id) => router.push(`./home/${id}`)}
					/>
				)}
				ListHeaderComponent={renderHeader}
				ListEmptyComponent={
					<EmptyState
						icon={isVolunteer ? "volunteer-activism" : "assignment"}
						title={
							isVolunteer
								? activeTab === "available"
									? "Nessuna richiesta disponibile"
									: "Nessun task in corso"
								: "Nessuna richiesta creata"
						}
						subtitle={
							isVolunteer
								? "Nuove richieste appariranno qui quando qualcuno avrà bisogno di aiuto."
								: "Crea la tua prima richiesta premendo il tasto + in basso."
						}
						actionLabel={isRequester && !fabDisabled ? "Crea richiesta" : undefined}
						onAction={isRequester && !fabDisabled ? () => router.push("./home/new") : undefined}
					/>
				}
				contentContainerStyle={styles.listContent}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={SoliColors.primary.main} />}
				showsVerticalScrollIndicator={false}
			/>

			{/* FAB — requester only */}
			{isRequester && (
				<FAB
					disabled={fabDisabled}
					onPress={() => router.push("./home/new")}
					insets={insets}
				/>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: SoliColors.background.default,
	},
	centered: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: SoliColors.background.default,
		padding: 24,
	},
	listContent: {
		paddingHorizontal: 16,
		paddingBottom: 100,
	},
	listHeader: {
		marginBottom: 8,
	},
	welcomeSection: {
		marginBottom: 12,
	},
	welcomeText: {
		fontSize: 26,
		fontWeight: "700",
		color: SoliColors.text.primary,
		marginBottom: 8,
	},
	roleBadge: {
		alignSelf: "flex-start",
		paddingVertical: 4,
		paddingHorizontal: 12,
		borderRadius: 20,
		marginBottom: 4,
	},
	badgeVolunteer: { backgroundColor: "#E8F5E9" },
	badgeRequester: { backgroundColor: "#FFF3E0" },
	roleText: { fontSize: 13, fontWeight: "600" },
	roleTextVolunteer: { color: "#2E7D32" },
	roleTextRequester: { color: "#E65100" },
	dailyBanner: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		backgroundColor: "#FFF3E0",
		borderRadius: SoliShapes.borderRadius.global,
		padding: 12,
		marginBottom: 12,
	},
	dailyBannerText: {
		fontSize: 13,
		color: "#E65100",
		fontWeight: "500",
	},
	segmentedContainer: {
		flexDirection: "row",
		backgroundColor: "#EEEEEE",
		borderRadius: 12,
		padding: 3,
		marginBottom: 16,
	},
	segmentedTab: {
		flex: 1,
		paddingVertical: 8,
		alignItems: "center",
		borderRadius: 10,
	},
	segmentedTabActive: {
		backgroundColor: SoliColors.background.paper,
		...SoliShapes.shadow.card,
	},
	segmentedLabel: {
		fontSize: 14,
		fontWeight: "600",
		color: SoliColors.text.disabled,
	},
	segmentedLabelActive: {
		color: SoliColors.primary.main,
	},
	sectionLabel: {
		fontSize: 13,
		color: SoliColors.text.secondary,
		marginBottom: 12,
	},
	loadingText: {
		fontSize: 16,
		color: SoliColors.text.secondary,
	},
	errorText: {
		fontSize: 16,
		color: SoliColors.error,
		textAlign: "center",
		marginTop: 12,
		marginBottom: 16,
	},
	retryButton: {
		backgroundColor: SoliColors.primary.main,
		paddingHorizontal: 20,
		paddingVertical: 10,
		borderRadius: 10,
	},
	retryText: {
		color: "#FFFFFF",
		fontWeight: "600",
		fontSize: 15,
	},
	fabContainer: {
		position: "absolute",
		right: 20,
	},
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
});
