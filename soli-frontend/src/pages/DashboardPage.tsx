import { useAuth } from "react-oidc-context";
import { useState, useEffect } from "react";
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
} from "@mui/material";
import ViewListIcon from "@mui/icons-material/ViewList";
import MapIcon from "@mui/icons-material/Map";
import AssignmentIcon from "@mui/icons-material/Assignment";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import AddIcon from "@mui/icons-material/Add";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import SyncIcon from "@mui/icons-material/Sync";
import Tooltip from "@mui/material/Tooltip";
import api from "../api";
import type { Task } from "../types/models/Task";
import type { User } from "../types/models/User";
import TaskMapView from "../components/TaskMapView";
import TaskCard from "../components/TaskCard";
import { useRole } from "../context/RoleContext";

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
			const [userRes, tasksRes] = await Promise.all([
				api.get("/api/users/me", { signal }),
				api.get("/api/tasks", { params: { size: 100 }, signal }),
			]);
			setDbUser(userRes.data);
			setTasks(tasksRes.data.data || []);
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
	const recentMyTasks = [...myRequests, ...acceptedTasks].slice(0, 4);

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

			{/* Stat Cards — solo nella Dashboard e solo per VOLONTARI */}
			{!isRequestsPage && role === "volunteer" && (
				<Grid container spacing={3} sx={{ mb: 6 }}>
					<Grid size={{ xs: 12, sm: 6, md: 6 }}>
						<Card sx={{ background: "linear-gradient(135deg, #00796B 0%, #48A999 100%)", color: "white" }}>
							<CardContent sx={{ p: 3 }}>
								<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
									<Box>
										<Typography variant="h3" fontWeight={700}>
											{tasks.filter((t) => t.status === "COMPLETED").length}
										</Typography>
										<Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
											Task Completati
										</Typography>
									</Box>
									<AssignmentIcon sx={{ fontSize: 48, opacity: 0.3 }} />
								</Box>
							</CardContent>
						</Card>
					</Grid>

					<Grid size={{ xs: 12, sm: 6, md: 6 }}>
						<Card sx={{ background: "linear-gradient(135deg, #FF6F00 0%, #FFA040 100%)", color: "white" }}>
							<CardContent sx={{ p: 3 }}>
								<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
									<Box>
										<Typography variant="h3" fontWeight={700}>
											-
										</Typography>
										<Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
											Crediti SOLI
										</Typography>
									</Box>
									<EmojiEventsIcon sx={{ fontSize: 48, opacity: 0.3 }} />
								</Box>
							</CardContent>
						</Card>
					</Grid>
				</Grid>
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
