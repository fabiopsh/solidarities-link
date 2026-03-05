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
	Chip,
	Stack,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Snackbar,
	Alert,
} from "@mui/material";
import VolunteerActivismIcon from "@mui/icons-material/VolunteerActivism";
import AssignmentIcon from "@mui/icons-material/Assignment";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import AddIcon from "@mui/icons-material/Add";
import api from "../api";
import type { Task } from "../types/models/Task";

export default function DashboardPage() {
	const auth = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const userName = auth.user?.profile?.given_name || auth.user?.profile?.name || "Utente";
	const isRequestsPage = location.pathname.includes("/requests");

	const [tasks, setTasks] = useState<Task[]>([]);
	const [loading, setLoading] = useState(true);
	const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
	const [taskToCancel, setTaskToCancel] = useState<string | null>(null);
	const [cancelling, setCancelling] = useState(false);
	const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
		open: false,
		message: "",
		severity: "success",
	});

	const fetchTasks = async () => {
		try {
			const res = await api.get("/api/tasks");
			// Sort by creation date descending
			const sortedTasks = (res.data.data || []).sort(
				(a: Task, b: Task) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
			);
			setTasks(sortedTasks);
		} catch (err) {
			console.error("Error fetching tasks:", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchTasks();
	}, []);

	const handleCancelTask = async () => {
		if (!taskToCancel) return;
		setCancelling(true);
		try {
			await api.put(`/api/tasks/${taskToCancel}`, { status: "CANCELLED" });
			setCancelDialogOpen(false);
			setTaskToCancel(null);
			setSnackbar({ open: true, message: "Richiesta annullata con successo.", severity: "success" });
			fetchTasks();
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

	const getStatusColor = (status: string) => {
		switch (status) {
			case "OPEN":
				return "success";
			case "ACCEPTED":
				return "info";
			case "IN_PROGRESS":
				return "warning";
			case "COMPLETED":
				return "primary";
			case "CANCELLED":
				return "error";
			default:
				return "default";
		}
	};

	const displayedTasks = isRequestsPage ? tasks : tasks.slice(0, 4);

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
			</Box>

			{/* Stat Cards — solo nella Dashboard */}
			{!isRequestsPage && (
				<Grid container spacing={3} sx={{ mb: 6 }}>
					<Grid size={{ xs: 12, sm: 6, md: 4 }}>
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

					<Grid size={{ xs: 12, sm: 6, md: 4 }}>
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

					<Grid size={{ xs: 12, sm: 6, md: 4 }}>
						<Card sx={{ background: "linear-gradient(135deg, #2E7D32 0%, #66BB6A 100%)", color: "white" }}>
							<CardContent sx={{ p: 3 }}>
								<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
									<Box>
										<Typography variant="h3" fontWeight={700}>
											-
										</Typography>
										<Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
											Volontari Attivi
										</Typography>
									</Box>
									<VolunteerActivismIcon sx={{ fontSize: 48, opacity: 0.3 }} />
								</Box>
							</CardContent>
						</Card>
					</Grid>
				</Grid>
			)}

			{!isRequestsPage && (
				<Typography variant="h5" fontWeight={600} sx={{ mb: 3 }}>
					Richieste Recenti
				</Typography>
			)}

			{loading ? (
				<Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
					<CircularProgress />
				</Box>
			) : tasks.length === 0 ? (
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
						Non hai ancora creato nessuna richiesta.
					</Typography>
					<Button variant="outlined" sx={{ mt: 2 }} onClick={() => navigate("/dashboard/requests/new")}>
						Inizia ora
					</Button>
				</Card>
			) : (
				<Grid container spacing={3}>
					{displayedTasks.map((task) => (
						<Grid size={{ xs: 12, md: 6 }} key={task.id}>
							<Card
								sx={{
									borderRadius: 3,
									transition: "transform 0.2s, box-shadow 0.2s",
									"&:hover": { transform: "translateY(-4px)", boxShadow: "0 12px 24px rgba(0,0,0,0.12)" },
								}}
							>
								<CardContent sx={{ p: 3 }}>
									<Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
										<Chip
											label={task.status}
											size="small"
											color={getStatusColor(task.status) as any}
											sx={{ fontWeight: "bold", fontSize: "0.75rem" }}
										/>
										<Typography variant="caption" color="text.secondary">
											{new Date(task.createdAt).toLocaleDateString()}
										</Typography>
									</Box>
									<Typography
										variant="h6"
										fontWeight={700}
										gutterBottom
										sx={{ cursor: "pointer" }}
										onClick={() => navigate(`/dashboard/requests/${task.id}`)}
									>
										{task.title}
									</Typography>
									<Typography
										variant="body2"
										color="text.secondary"
										sx={{
											mb: 3,
											display: "-webkit-box",
											WebkitLineClamp: 2,
											WebkitBoxOrient: "vertical",
											overflow: "hidden",
											height: "3em",
										}}
									>
										{task.description || "Nessuna descrizione."}
									</Typography>
									<Stack direction="row" spacing={1} justifyContent="flex-end">
										<Button
											size="small"
											variant="text"
											onClick={() => navigate(`/dashboard/requests/${task.id}`)}
										>
											Dettaglio
										</Button>
										{task.status === "OPEN" && (
											<Button
												size="small"
												color="error"
												variant="outlined"
												onClick={() => {
													setTaskToCancel(task.id);
													setCancelDialogOpen(true);
												}}
											>
												Annulla
											</Button>
										)}
									</Stack>
								</CardContent>
							</Card>
						</Grid>
					))}
				</Grid>
			)}

			{/* Link "Vedi tutte" — solo nella Dashboard quando ci sono più di 4 task */}
			{!isRequestsPage && tasks.length > 4 && (
				<Box sx={{ textAlign: "center", mt: 3 }}>
					<Button variant="text" onClick={() => navigate("/dashboard/requests")}>
						Vedi tutte le richieste ({tasks.length})
					</Button>
				</Box>
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
