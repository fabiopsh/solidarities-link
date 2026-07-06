import { useAuth } from "react-oidc-context";
import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
	Box,
	Typography,
	Card,
	CardContent,
	Grid,
	Button,
	CircularProgress,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Snackbar,
	Alert,
	Tabs,
	Tab,
	ToggleButton,
	ToggleButtonGroup,
	Chip,
} from "@mui/material";
import ViewListIcon from "@mui/icons-material/ViewList";
import MapIcon from "@mui/icons-material/Map";
import AssignmentIcon from "@mui/icons-material/Assignment";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import AddIcon from "@mui/icons-material/Add";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import SyncIcon from "@mui/icons-material/Sync";
import ScheduleIcon from "@mui/icons-material/Schedule";
import GroupsIcon from "@mui/icons-material/Groups";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import Tooltip from "@mui/material/Tooltip";
import { PieChart } from "@mui/x-charts/PieChart";
import api from "../api";
import type { Task } from "../types/models/Task";
import type { ServiceCategory } from "../types/models/VolunteerProfile";
import type { User } from "../types/models/User";
import type { Wallet } from "../types/models/Wallet";
import TaskMapView from "../components/TaskMapView";
import TaskCard from "../components/TaskCard";
import { useRole } from "../context/RoleContext";

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
	MOBILITY: "Mobilità",
	PHYSICAL_SUPPORT: "Supporto Fisico",
	SOCIAL: "Sociale",
	PET_SUPPORT: "Animali",
	DIGITAL: "Digitale",
};

const CATEGORY_COLORS: Record<ServiceCategory, string> = {
	MOBILITY: "#1565C0",
	PHYSICAL_SUPPORT: "#00796B",
	SOCIAL: "#E65100",
	PET_SUPPORT: "#6A1B9A",
	DIGITAL: "#455A64",
};

export default function DashboardPage() {
	const auth = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const { role } = useRole();
	const userName = auth.user?.profile?.given_name || auth.user?.profile?.name || "Utente";
	const isRequestsPage = location.pathname.includes("/requests");

	const [tasks, setTasks] = useState<Task[]>([]);
	const [loading, setLoading] = useState(true);
	const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
	const [taskToCancel, setTaskToCancel] = useState<Task | null>(null);
	const [cancelling, setCancelling] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Tab state for requests page
	const [tabValue, setTabValue] = useState<string>("my_requests");
	const [viewMode, setViewMode] = useState<"LIST" | "MAP">("LIST");

	const [dbUser, setDbUser] = useState<User | null>(null);
	const [wallet, setWallet] = useState<Wallet | null>(null);

	const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
		open: false,
		message: "",
		severity: "success",
	});

	const [lastSync, setLastSync] = useState<Date | null>(null);
	const [syncing, setSyncing] = useState(false);

	const fetchTasksAndUser = async (isManualSync = false, signal?: AbortSignal) => {
		if (isManualSync) setSyncing(true);
		try {
			const [userRes, tasksRes, walletRes] = await Promise.all([
				api.get("/api/users/me", { signal }),
				api.get("/api/tasks", { params: { size: 100 }, signal }),
				api.get("/api/wallets/my", { signal }).catch(() => null),
			]);
			setDbUser(userRes.data);
			setTasks(tasksRes.data.data || []);
			if (walletRes) setWallet(walletRes.data);
			setLastSync(new Date());
		} catch (err: any) {
			if (err?.code === "ERR_CANCELED") return;
			console.error("Error fetching tasks:", err);
			setError("Impossibile caricare i task. Riprova più tardi.");
		} finally {
			setLoading(false);
			if (isManualSync) setSyncing(false);
		}
	};

	useEffect(() => {
		const controller = new AbortController();
		fetchTasksAndUser(false, controller.signal);
		return () => controller.abort();
	}, [location.pathname]);

	useEffect(() => {
		if (isRequestsPage) {
			setTabValue(role === "requester" ? "my_requests" : "available");
		}
	}, [role, isRequestsPage]);

	const handleCancelTask = async () => {
		if (!taskToCancel) return;
		setCancelling(true);
		try {
			await api.put(`/api/tasks/${taskToCancel.id}`, { status: "CANCELLED" });
			setCancelDialogOpen(false);
			setTaskToCancel(null);
			setSnackbar({ open: true, message: "Richiesta annullata con successo.", severity: "success" });
			fetchTasksAndUser();
		} catch (err) {
			console.error("Error cancelling task:", err);
			setSnackbar({ open: true, message: "Errore durante l'annullamento della richiesta.", severity: "error" });
		} finally {
			setCancelling(false);
		}
	};

	const handleCloseDialog = () => {
		if (cancelling) return;
		setCancelDialogOpen(false);
		setTaskToCancel(null);
	};



	// Derived state
	const currentUserId = dbUser?.id;

	// Filter tasks for the tabs
	// "My Requests": Created by me
	const myRequests = tasks.filter((t) => t.creatorId === currentUserId);
	// "Accepted Tasks": Assigned to me as a volunteer
	const acceptedTasks = tasks.filter((t) => t.volunteerId === currentUserId);
	// "Available Tasks": OPEN status, AND not created by me (so I can accept them)
	const availableTasks = tasks.filter((t) => t.status === "OPEN" && t.creatorId !== currentUserId);

	// On dashboard overview, show up to 4 recent tasks from my activity
	const recentMyTasks = [...myRequests, ...acceptedTasks]
		.filter((t) => t.status !== "CANCELLED" && t.status !== "COMPLETED")
		.slice(0, 4);

	// --- Volunteer stats ---
	const myVolunteerTasks = tasks.filter((t) => t.volunteerId === currentUserId);
	const completedAsVolunteer = myVolunteerTasks.filter((t) => t.status === "COMPLETED");
	const volunteerHours = completedAsVolunteer.reduce((sum, t) => {
		if (t.checkInAt && t.checkOutAt) {
			const ms = new Date(t.checkOutAt).getTime() - new Date(t.checkInAt).getTime();
			return sum + Math.max(0, ms / 3_600_000);
		}
		return sum;
	}, 0);
	const peopleHelped = new Set(completedAsVolunteer.map((t) => t.beneficiaryId)).size;
	const volunteerByCategory = myVolunteerTasks
		.filter((t) => t.status !== "CANCELLED")
		.reduce<Record<string, number>>((acc, t) => {
			acc[t.category] = (acc[t.category] || 0) + 1;
			return acc;
		}, {});
	const nextEngagement = myVolunteerTasks
		.filter((t) => (t.status === "ACCEPTED" || t.status === "IN_PROGRESS") && t.scheduledAt && new Date(t.scheduledAt) > new Date())
		.sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())[0];

	// --- Requester stats ---
	const myTasksAll = tasks.filter((t) => t.creatorId === currentUserId);
	const activeRequests = myTasksAll.filter((t) => !["COMPLETED", "CANCELLED", "RELEASED"].includes(t.status)).length;
	const completedRequests = myTasksAll.filter((t) => t.status === "COMPLETED").length;
	const nonCancelledRequests = myTasksAll.filter((t) => t.status !== "CANCELLED").length;
	const completionRate = nonCancelledRequests > 0 ? Math.round((completedRequests / nonCancelledRequests) * 100) : 0;
	const requestsWithAcceptance = myTasksAll.filter((t) => t.acceptedAt);
	const avgWaitHours = requestsWithAcceptance.length > 0
		? requestsWithAcceptance.reduce((sum, t) => sum + (new Date(t.acceptedAt!).getTime() - new Date(t.createdAt).getTime()) / 3_600_000, 0) / requestsWithAcceptance.length
		: null;
	const requesterByCategory = myTasksAll
		.filter((t) => t.status !== "CANCELLED")
		.reduce<Record<string, number>>((acc, t) => {
			acc[t.category] = (acc[t.category] || 0) + 1;
			return acc;
		}, {});
	const nextRequest = myTasksAll
		.filter((t) => !["COMPLETED", "CANCELLED", "RELEASED"].includes(t.status) && t.scheduledAt && new Date(t.scheduledAt) > new Date())
		.sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())[0];

	const pieDataFromCounts = (counts: Record<string, number>) =>
		Object.entries(counts).map(([category, value], id) => ({
			id,
			value,
			label: CATEGORY_LABELS[category as ServiceCategory] || category,
			color: CATEGORY_COLORS[category as ServiceCategory],
		}));

	if (loading) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
				<CircularProgress />
			</Box>
		);
	}

	if (error) {
		return (
			<Box sx={{ mt: 4 }}>
				<Alert severity="error">{error}</Alert>
			</Box>
		);
	}

	// Reusable Task Card Renderer
	const renderTaskCards = (taskList: Task[]) => {
		if (taskList.length === 0) {
			return (
				<Card
					sx={{
						p: 6,
						textAlign: "center",
						borderRadius: 3,
						border: "2px dashed",
						borderColor: "divider",
						bgcolor: "transparent",
					}}
				>
					<AssignmentIcon sx={{ fontSize: 48, color: "text.disabled", mb: 2 }} />
					<Typography variant="h6" color="text.secondary">
						Nessun task trovato in questa sezione.
					</Typography>
					{isRequestsPage && tabValue === "my_requests" && role === "requester" && (
						<Button variant="outlined" sx={{ mt: 2 }} onClick={() => navigate("/dashboard/requests/new")}>
							Crea una nuova richiesta
						</Button>
					)}
				</Card>
			);
		}

		return (
			<Grid container spacing={3}>
				{taskList.map((task) => (
					<Grid size={{ xs: 12, sm: 6, md: 4 }} key={task.id}>
						<TaskCard
							task={task}
							currentUserId={currentUserId}
							onDetailsClick={(taskId) => navigate(`/dashboard/requests/${taskId}`)}
							onCancelClick={(taskToCancel) => {
								setTaskToCancel(taskToCancel);
								setCancelDialogOpen(true);
							}}
						/>
					</Grid>
				))}
			</Grid>
		);
	};

	const statCard = (label: string, value: string | number, gradient: string, icon: ReactNode) => (
		<Card sx={{ background: gradient, color: "white", height: "100%" }}>
			<CardContent sx={{ p: 3 }}>
				<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
					<Box>
						<Typography variant="h3" fontWeight={700}>
							{value}
						</Typography>
						<Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
							{label}
						</Typography>
					</Box>
					{icon}
				</Box>
			</CardContent>
		</Card>
	);

	return (
		<Box>
			{/* Top Bar with Action */}
			<Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 4 }}>
				<Box>
					<Typography variant="h4" fontWeight={700} gutterBottom>
						{isRequestsPage ? "Le tue Richieste" : `Benvenuto, ${userName}! 👋`}
					</Typography>
					<Typography variant="body1" color="text.secondary">
						{isRequestsPage
							? "Storico completo delle tue richieste di assistenza."
							: "Panoramica della tua attività su SoLi — Solidarities Link."}
					</Typography>
				</Box>
				{role === "requester" && (
					<Button
						variant="contained"
						startIcon={<AddIcon />}
						size="large"
						onClick={() => navigate("/dashboard/requests/new")}
						sx={{
							px: 3,
							py: 1.5,
							fontWeight: "bold",
							borderRadius: 2,
							boxShadow: "0 4px 12px rgba(0, 121, 107, 0.3)",
						}}
					>
						Nuova Richiesta
					</Button>
				)}
			</Box>

			{/* Stat Cards — solo nella Dashboard principale */}
			{!isRequestsPage && role === "volunteer" && (
				<>
					<Grid container spacing={3} sx={{ mb: 4 }}>
						<Grid size={{ xs: 12, sm: 6, md: 3 }}>
							{statCard("Task Completati", completedAsVolunteer.length, "linear-gradient(135deg, #00796B 0%, #48A999 100%)", <AssignmentIcon sx={{ fontSize: 48, opacity: 0.3 }} />)}
						</Grid>
						<Grid size={{ xs: 12, sm: 6, md: 3 }}>
							{statCard("Crediti SOLI", wallet ? wallet.balance : "-", "linear-gradient(135deg, #FF6F00 0%, #FFA040 100%)", <EmojiEventsIcon sx={{ fontSize: 48, opacity: 0.3 }} />)}
						</Grid>
						<Grid size={{ xs: 12, sm: 6, md: 3 }}>
							{statCard("Ore di Volontariato", volunteerHours.toFixed(1), "linear-gradient(135deg, #1565C0 0%, #42A5F5 100%)", <HourglassBottomIcon sx={{ fontSize: 48, opacity: 0.3 }} />)}
						</Grid>
						<Grid size={{ xs: 12, sm: 6, md: 3 }}>
							{statCard("Persone Aiutate", peopleHelped, "linear-gradient(135deg, #6A1B9A 0%, #AB47BC 100%)", <GroupsIcon sx={{ fontSize: 48, opacity: 0.3 }} />)}
						</Grid>
					</Grid>

					<Grid container spacing={3} sx={{ mb: 6 }}>
						<Grid size={{ xs: 12, md: 7 }}>
							<Card sx={{ borderRadius: 3, height: "100%", border: "1px solid", borderColor: "divider" }}>
								<CardContent sx={{ p: 3 }}>
									<Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2 }}>
										Le tue attività per categoria
									</Typography>
									{Object.keys(volunteerByCategory).length > 0 ? (
										<PieChart
											height={260}
											margin={{ top: 10, bottom: 10 }}
											series={[{ data: pieDataFromCounts(volunteerByCategory), innerRadius: 45, paddingAngle: 2, cornerRadius: 4 }]}
										/>
									) : (
										<Typography variant="body2" color="text.secondary">Nessun task ancora accettato.</Typography>
									)}
								</CardContent>
							</Card>
						</Grid>
						<Grid size={{ xs: 12, md: 5 }}>
							<Card sx={{ borderRadius: 3, height: "100%", border: "1px solid", borderColor: "divider" }}>
								<CardContent sx={{ p: 3 }}>
									<Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2 }}>
										Prossimo impegno
									</Typography>
									{nextEngagement ? (
										<Box>
											<Typography variant="h6" fontWeight={700}>{nextEngagement.title}</Typography>
											<Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1, color: "text.secondary" }}>
												<ScheduleIcon fontSize="small" />
												<Typography variant="body2">
													{new Date(nextEngagement.scheduledAt!).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
												</Typography>
											</Box>
											{nextEngagement.targetAddress && (
												<Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
													{nextEngagement.targetAddress}
												</Typography>
											)}
											<Chip
												size="small"
												label={CATEGORY_LABELS[nextEngagement.category] || nextEngagement.category}
												sx={{ mt: 1.5, bgcolor: CATEGORY_COLORS[nextEngagement.category], color: "white" }}
											/>
										</Box>
									) : (
										<Typography variant="body2" color="text.secondary">Nessun impegno programmato al momento.</Typography>
									)}
								</CardContent>
							</Card>
						</Grid>
					</Grid>
				</>
			)}

			{!isRequestsPage && role === "requester" && (
				<>
					<Grid container spacing={3} sx={{ mb: 4 }}>
						<Grid size={{ xs: 12, sm: 6, md: 3 }}>
							{statCard("Richieste Attive", activeRequests, "linear-gradient(135deg, #1565C0 0%, #42A5F5 100%)", <ScheduleIcon sx={{ fontSize: 48, opacity: 0.3 }} />)}
						</Grid>
						<Grid size={{ xs: 12, sm: 6, md: 3 }}>
							{statCard("Richieste Completate", completedRequests, "linear-gradient(135deg, #00796B 0%, #48A999 100%)", <CheckCircleIcon sx={{ fontSize: 48, opacity: 0.3 }} />)}
						</Grid>
						<Grid size={{ xs: 12, sm: 6, md: 3 }}>
							{statCard("Tasso di Completamento", `${completionRate}%`, "linear-gradient(135deg, #2E7D32 0%, #66BB6A 100%)", <EmojiEventsIcon sx={{ fontSize: 48, opacity: 0.3 }} />)}
						</Grid>
						<Grid size={{ xs: 12, sm: 6, md: 3 }}>
							{statCard("Attesa Media", avgWaitHours !== null ? `${avgWaitHours.toFixed(1)}h` : "-", "linear-gradient(135deg, #FF6F00 0%, #FFA040 100%)", <HourglassBottomIcon sx={{ fontSize: 48, opacity: 0.3 }} />)}
						</Grid>
					</Grid>

					<Grid container spacing={3} sx={{ mb: 6 }}>
						<Grid size={{ xs: 12, md: 7 }}>
							<Card sx={{ borderRadius: 3, height: "100%", border: "1px solid", borderColor: "divider" }}>
								<CardContent sx={{ p: 3 }}>
									<Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2 }}>
										Le tue richieste per categoria
									</Typography>
									{Object.keys(requesterByCategory).length > 0 ? (
										<PieChart
											height={260}
											margin={{ top: 10, bottom: 10 }}
											series={[{ data: pieDataFromCounts(requesterByCategory), innerRadius: 45, paddingAngle: 2, cornerRadius: 4 }]}
										/>
									) : (
										<Typography variant="body2" color="text.secondary">Non hai ancora creato richieste.</Typography>
									)}
								</CardContent>
							</Card>
						</Grid>
						<Grid size={{ xs: 12, md: 5 }}>
							<Card sx={{ borderRadius: 3, height: "100%", border: "1px solid", borderColor: "divider" }}>
								<CardContent sx={{ p: 3 }}>
									<Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2 }}>
										Prossima richiesta programmata
									</Typography>
									{nextRequest ? (
										<Box>
											<Typography variant="h6" fontWeight={700}>{nextRequest.title}</Typography>
											<Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1, color: "text.secondary" }}>
												<EventAvailableIcon fontSize="small" />
												<Typography variant="body2">
													{new Date(nextRequest.scheduledAt!).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
												</Typography>
											</Box>
											<Chip
												size="small"
												label={nextRequest.status === "OPEN" ? "In attesa di un volontario" : "Assegnata"}
												color={nextRequest.status === "OPEN" ? "warning" : "success"}
												sx={{ mt: 1.5 }}
											/>
										</Box>
									) : (
										<Typography variant="body2" color="text.secondary">Nessuna richiesta programmata al momento.</Typography>
									)}
								</CardContent>
							</Card>
						</Grid>
					</Grid>
				</>
			)}

			{/* Tab Navigation for Requests Page */}
			{isRequestsPage ? (
				<>
					<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider", mb: 4 }}>
						<Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} aria-label="task tabs">
							{role === "requester" && <Tab label="Le Mie Richieste" value="my_requests" sx={{ fontWeight: "bold" }} />}
							{role === "volunteer" && <Tab label="Task Disponibili" value="available" sx={{ fontWeight: "bold" }} />}
							{role === "volunteer" && <Tab label="Task Accettati" value="accepted" sx={{ fontWeight: "bold" }} />}
						</Tabs>
						<Box sx={{ display: "flex", alignItems: "center", gap: 1, pb: 0.5 }}>
							{lastSync && (
								<Typography variant="caption" color="text.disabled" sx={{ whiteSpace: "nowrap" }}>
									Ultimo sync: {lastSync.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
								</Typography>
							)}
							<Tooltip title="Sincronizza i task">
								<span>
									<Button
										variant="outlined"
										size="small"
										startIcon={
											<SyncIcon
												sx={{
													animation: syncing ? "spin 1s linear infinite" : "none",
													"@keyframes spin": {
														"0%": { transform: "rotate(0deg)" },
														"100%": { transform: "rotate(360deg)" },
													},
												}}
											/>
										}
										onClick={() => fetchTasksAndUser(true)}
										disabled={syncing}
										sx={{
											borderRadius: 2,
											textTransform: "none",
											fontWeight: 600,
											minWidth: "auto",
											px: 2,
										}}
									>
										Sync
									</Button>
								</span>
							</Tooltip>
						</Box>
					</Box>

					{/* My Requests Tab */}
					{role === "requester" && (
						<Box role="tabpanel" hidden={tabValue !== "my_requests"}>
							{tabValue === "my_requests" && renderTaskCards(myRequests)}
						</Box>
					)}

					{/* Available Tasks Tab */}
					{role === "volunteer" && (
						<Box role="tabpanel" hidden={tabValue !== "available"}>
							{tabValue === "available" && (
							<>
								<Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
									<ToggleButtonGroup
										value={viewMode}
										exclusive
										onChange={(_, newMode) => {
											if (newMode !== null) setViewMode(newMode);
										}}
										aria-label="view mode"
										size="small"
										sx={{ bgcolor: "background.paper" }}
									>
										<ToggleButton value="LIST" aria-label="list view">
											<ViewListIcon sx={{ mr: 1 }} /> Lista
										</ToggleButton>
										<ToggleButton value="MAP" aria-label="map view">
											<MapIcon sx={{ mr: 1 }} /> Mappa
										</ToggleButton>
									</ToggleButtonGroup>
								</Box>
								{viewMode === "LIST" ? (
									renderTaskCards(availableTasks)
								) : (
									<TaskMapView tasks={availableTasks} />
								)}
							</>
							)}
						</Box>
					)}

					{/* Accepted Tasks Tab */}
					{role === "volunteer" && (
						<Box role="tabpanel" hidden={tabValue !== "accepted"}>
							{tabValue === "accepted" && renderTaskCards(acceptedTasks)}
						</Box>
					)}
				</>
			) : (
				<>
					{/* Recent Tasks List for General Dashboard */}
					<Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
						<Typography variant="h5" fontWeight={700}>
							I tuoi task recenti
						</Typography>
						<Button
							endIcon={<ArrowForwardIcon />}
							onClick={() => navigate("/dashboard/requests")}
							sx={{ fontWeight: 600 }}
						>
							Vedi tutte
						</Button>
					</Box>

					{renderTaskCards(recentMyTasks)}
				</>
			)}

			{/* Dialog di Conferma Annullamento */}
			<Dialog open={cancelDialogOpen} onClose={handleCloseDialog}>
				<DialogTitle>Annulla Richiesta</DialogTitle>
				<DialogContent>
					Sei sicuro di voler annullare questa richiesta? L'operazione non è reversibile.
				</DialogContent>
				<DialogActions sx={{ p: 2 }}>
					<Button onClick={handleCloseDialog} disabled={cancelling}>
						No, mantieni
					</Button>
					<Button
						onClick={handleCancelTask}
						color="error"
						variant="contained"
						disabled={cancelling}
						startIcon={cancelling ? <CircularProgress size={16} color="inherit" /> : undefined}
					>
						{cancelling ? "Annullamento..." : "Sì, annulla"}
					</Button>
				</DialogActions>
			</Dialog>

			<Snackbar
				open={snackbar.open}
				autoHideDuration={4000}
				onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
				anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
			>
				<Alert
					severity={snackbar.severity}
					onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
					variant="filled"
					sx={{ width: "100%" }}
				>
					{snackbar.message}
				</Alert>
			</Snackbar>
		</Box>
	);
}
