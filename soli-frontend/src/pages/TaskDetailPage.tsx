import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
	Box,
	Typography,
	Card,
	CardContent,
	Grid,
	Button,
	CircularProgress,
	Chip,
	Divider,
	Paper,
	Stack,
	Alert,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Snackbar,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import CategoryIcon from "@mui/icons-material/Category";
import QrCodeIcon from "@mui/icons-material/QrCode";
import api from "../api";
import type { Task } from "../types/models/Task";

export default function TaskDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const [task, setTask] = useState<Task | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
	const [cancelling, setCancelling] = useState(false);
	const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
		open: false,
		message: "",
		severity: "success",
	});

	const fetchTask = async () => {
		try {
			const res = await api.get(`/api/tasks/${id}`);
			setTask(res.data);
		} catch (err) {
			console.error("Error fetching task details:", err);
			setError("Impossibile recuperare i dettagli della richiesta.");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchTask();
	}, [id]);

	const handleCancelTask = async () => {
		if (!id) return;
		setCancelling(true);
		try {
			await api.put(`/api/tasks/${id}`, { status: "CANCELLED" });
			setCancelDialogOpen(false);
			setSnackbar({ open: true, message: "Richiesta annullata con successo.", severity: "success" });
			// Redirect to dashboard after a short delay
			setTimeout(() => navigate("/dashboard"), 1200);
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
	};

	if (loading) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
				<CircularProgress />
			</Box>
		);
	}

	if (error || !task) {
		return (
			<Box sx={{ maxWidth: 800, mx: "auto", mt: 4 }}>
				<Alert severity="error">{error || "Task non trovato"}</Alert>
				<Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/dashboard")} sx={{ mt: 2 }}>
					Torna alla Dashboard
				</Button>
			</Box>
		);
	}

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

	const isTokenVisible = task.status === "ACCEPTED" || task.status === "IN_PROGRESS";
	const activeToken = task.status === "ACCEPTED" ? task.checkInToken : task.checkOutToken;
	const tokenLabel = task.status === "ACCEPTED" ? "Token Check-In" : "Token Check-Out";
	const tokenHint =
		task.status === "ACCEPTED"
			? "Mostra questo codice al volontario per confermare l'inizio del task."
			: "Mostra questo codice al volontario per confermare il completamento del task.";

	return (
		<Box sx={{ maxWidth: 900, mx: "auto" }}>
			<Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/dashboard")} sx={{ mb: 3 }}>
				Torna indietro
			</Button>

			<Grid container spacing={3}>
				{/* Main Content */}
				<Grid size={{ xs: 12, md: 8 }}>
					<Card sx={{ borderRadius: 3, boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
						<CardContent sx={{ p: 4 }}>
							<Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
								<Chip
									label={task.status}
									color={getStatusColor(task.status) as any}
									sx={{ fontWeight: "bold" }}
								/>
								<Typography variant="caption" color="text.secondary">
									ID: {task.id.substring(0, 8)}...
								</Typography>
							</Box>

							<Typography variant="h4" fontWeight={700} gutterBottom>
								{task.title}
							</Typography>

							<Typography variant="body1" color="text.secondary" sx={{ mb: 4, whiteSpace: "pre-wrap" }}>
								{task.description || "Nessuna descrizione fornita."}
							</Typography>

							<Divider sx={{ my: 3 }} />

							<Stack spacing={2}>
								<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
									<CategoryIcon color="action" />
									<Box>
										<Typography variant="caption" color="text.secondary" display="block">
											Categoria
										</Typography>
										<Typography variant="body1" fontWeight={500}>
											{task.category}
										</Typography>
									</Box>
								</Box>

								<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
									<AccessTimeIcon color="action" />
									<Box>
										<Typography variant="caption" color="text.secondary" display="block">
											Urgenza
										</Typography>
										<Typography variant="body1" fontWeight={500}>
											{task.urgencyLevel}
										</Typography>
									</Box>
								</Box>

								<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
									<LocationOnIcon color="action" />
									<Box>
										<Typography variant="caption" color="text.secondary" display="block">
											Indirizzo / Luogo
										</Typography>
										<Typography variant="body1" fontWeight={500}>
											{task.targetAddress || "Non specificato"}
										</Typography>
									</Box>
								</Box>
							</Stack>
						</CardContent>
					</Card>
				</Grid>

				{/* Sidebar Section (Tokens / Actions) */}
				<Grid size={{ xs: 12, md: 4 }}>
					<Stack spacing={3}>
						{isTokenVisible && activeToken && (
							<Paper
								elevation={6}
								sx={{
									p: 4,
									borderRadius: 3,
									background: "linear-gradient(135deg, #00796B 0%, #48A999 100%)",
									color: "white",
									textAlign: "center",
									position: "relative",
									overflow: "hidden",
									"&::before": {
										content: '""',
										position: "absolute",
										top: -30,
										right: -30,
										width: 120,
										height: 120,
										borderRadius: "50%",
										background: "rgba(255,255,255,0.08)",
									},
									"&::after": {
										content: '""',
										position: "absolute",
										bottom: -20,
										left: -20,
										width: 80,
										height: 80,
										borderRadius: "50%",
										background: "rgba(255,255,255,0.05)",
									},
								}}
							>
								<QrCodeIcon sx={{ fontSize: 56, mb: 1, opacity: 0.9 }} />
								<Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
									{tokenLabel}
								</Typography>
								<Typography variant="body2" sx={{ mb: 3, opacity: 0.85 }}>
									{tokenHint}
								</Typography>
								<Box
									sx={{
										background: "rgba(255,255,255,0.95)",
										color: "#004D40",
										py: 2.5,
										px: 2,
										borderRadius: 2,
										fontFamily: "'Courier New', monospace",
										fontSize: "1.8rem",
										fontWeight: 900,
										letterSpacing: 6,
										boxShadow: "inset 0 2px 8px rgba(0,0,0,0.08)",
										wordBreak: "break-all",
									}}
								>
									{activeToken}
								</Box>
							</Paper>
						)}

						<Card sx={{ borderRadius: 3 }}>
							<CardContent>
								<Typography variant="h6" fontWeight={600} gutterBottom>
									Dettagli Sessione
								</Typography>
								<Typography variant="body2" color="text.secondary">
									Creato il: {new Date(task.createdAt).toLocaleString()}
								</Typography>
								<Typography variant="body2" color="text.secondary">
									Ultimo aggiornamento: {new Date(task.updatedAt).toLocaleString()}
								</Typography>
							</CardContent>
						</Card>

						{task.status === "OPEN" && (
							<Button
								variant="outlined"
								color="error"
								fullWidth
								size="large"
								sx={{ borderRadius: 2 }}
								onClick={() => setCancelDialogOpen(true)}
							>
								Annulla Richiesta
							</Button>
						)}
					</Stack>
				</Grid>
			</Grid>

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
