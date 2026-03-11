import { useState, useEffect, useRef } from "react";
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
	Drawer,
	IconButton,
	TextField,
	Snackbar,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import ChatIcon from "@mui/icons-material/Chat";
import ForumIcon from "@mui/icons-material/Forum";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import CategoryIcon from "@mui/icons-material/Category";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import TimerIcon from "@mui/icons-material/Timer";
import QrCodeIcon from "@mui/icons-material/QrCode";
import LinearProgress from "@mui/material/LinearProgress";
import PersonIcon from "@mui/icons-material/Person";
import { useAuth } from "react-oidc-context";
import api, { USER_BASIC_CACHE_TTL } from "../api";
import type { Task } from "../types/models/Task";
import type { User } from "../types/models/User";

interface ChatMessage {
	id: string;
	content: string;
	senderId: string;
	createdAt: string;
}

interface BasicUser {
	id: string;
	firstName: string;
	lastName: string;
}

export default function TaskDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const auth = useAuth();
	const [task, setTask] = useState<Task | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
	const [cancelling, setCancelling] = useState(false);
	const [accepting, setAccepting] = useState(false);
	const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
		open: false,
		message: "",
		severity: "success",
	});

	const [dbUser, setDbUser] = useState<User | null>(null);
	const [creator, setCreator] = useState<BasicUser | null>(null);
	const [volunteer, setVolunteer] = useState<BasicUser | null>(null);

	// Cancellation timer state (10 minutes)
	const [cancelTimeLeft, setCancelTimeLeft] = useState<number | null>(null);
	const [confirming, setConfirming] = useState(false);

	// Chat states
	const [chatOpen, setChatOpen] = useState(false);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [chatInput, setChatInput] = useState("");
	const [chatError, setChatError] = useState<string | null>(null);
	const wsRef = useRef<WebSocket | null>(null);
	const messagesEndRef = useRef<HTMLDivElement | null>(null);

	// Scroll chat to bottom
	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	useEffect(() => {
		if (chatOpen) {
			scrollToBottom();
		}
	}, [messages, chatOpen]);

	// WebSocket connection
	useEffect(() => {
		if (!chatOpen || !id || !auth.user?.access_token) return;

		// Load existing messages from REST API first
		const loadHistory = async () => {
			try {
				const sessionRes = await api.get(`/api/chat/sessions/task/${id}`);
				if (sessionRes.data?.id) {
					const msgRes = await api.get(`/api/chat/sessions/${sessionRes.data.id}/messages?size=100`);
					const history = msgRes.data?.data || [];
					// Map sentAt to createdAt for frontend consistency
					setMessages(history.map((m: any) => ({ ...m, createdAt: m.sentAt || m.createdAt })));
				}
			} catch {
				// No session or no messages yet — that's fine
			}
		};
		loadHistory();

		// Connect to WebSocket with token in query string
		const wsUrl = `ws://localhost:8080/chat/${id}?token=${auth.user.access_token}`;
		const ws = new WebSocket(wsUrl);
		wsRef.current = ws;

		ws.onopen = () => {
			console.log("WebSocket connected for chat");
			setChatError(null);
		};

		ws.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				// Check for mock AI rejection or errors
				if (data.error) {
					setChatError(data.error);
				} else if (data.content) {
					setMessages((prev) => [...prev, data]);
				}
			} catch (e) {
				console.error("Failed to parse WS message", e);
			}
		};

		ws.onerror = () => {
			console.error("WebSocket error");
			setChatError("Connessione chat interrotta.");
		};

		ws.onclose = () => {
			console.log("WebSocket disconnected");
		};

		return () => {
			ws.close();
		};
	}, [chatOpen, id, auth.user?.access_token]);

	const fetchTaskAndUser = async () => {
		try {
			const [taskRes, userRes] = await Promise.all([api.get(`/api/tasks/${id}`), api.get("/api/users/me")]);
			const fetchedTask = taskRes.data;
			setTask(fetchedTask);
			setDbUser(userRes.data);

			try {
				if (fetchedTask.creatorId) {
					const creatorRes = await api.get(`/api/users/${fetchedTask.creatorId}/basic`, { cache: { ttl: USER_BASIC_CACHE_TTL } });
					setCreator(creatorRes.data);
				}
				if (fetchedTask.volunteerId) {
					const volRes = await api.get(`/api/users/${fetchedTask.volunteerId}/basic`, { cache: { ttl: USER_BASIC_CACHE_TTL } });
					setVolunteer(volRes.data);
				}
			} catch (err) {
				console.error("Failed to fetch creator/volunteer basic details", err);
			}
		} catch (err) {
			console.error("Error fetching task details or user:", err);
			setError("Impossibile recuperare i dettagli della richiesta.");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchTaskAndUser();
	}, [id]);

	// Cancellation timer: countdown from acceptedAt + 10 minutes
	useEffect(() => {
		if (!task || task.status !== "ACCEPTED" || !task.acceptedAt) {
			setCancelTimeLeft(null);
			return;
		}

		const calculateTimeLeft = () => {
			const acceptedTime = new Date(task.acceptedAt!).getTime();
			const deadline = acceptedTime + 10 * 60 * 1000; // 10 minutes
			const remaining = Math.max(0, deadline - Date.now());
			return Math.floor(remaining / 1000);
		};

		setCancelTimeLeft(calculateTimeLeft());

		const interval = setInterval(() => {
			const remaining = calculateTimeLeft();
			setCancelTimeLeft(remaining);
			if (remaining <= 0) {
				clearInterval(interval);
			}
		}, 1000);

		return () => clearInterval(interval);
	}, [task?.status, task?.acceptedAt]);

	const handleConfirmCompletion = async () => {
		if (!id) return;
		setConfirming(true);
		try {
			await api.post(`/api/tasks/${id}/confirm-completion`);
			setSnackbar({
				open: true,
				message: "Completamento confermato con successo!",
				severity: "success",
			});
			await fetchTaskAndUser();
		} catch (err: any) {
			const errorMsg = err?.response?.data?.error || "Errore durante la conferma del completamento.";
			setSnackbar({ open: true, message: errorMsg, severity: "error" });
		} finally {
			setConfirming(false);
		}
	};

	const handleAcceptTask = async () => {
		if (!id) return;
		setAccepting(true);
		try {
			// Status "ACCEPTED" will automatically assign backend volunteerId to current user
			await api.put(`/api/tasks/${id}`, { status: "ACCEPTED" });
			setSnackbar({
				open: true,
				message: "Hai preso in carico questa richiesta con successo!",
				severity: "success",
			});
			await fetchTaskAndUser(); // Refresh to see chat and new tokens
		} catch (err) {
			console.error("Error accepting task:", err);
			setSnackbar({ open: true, message: "Errore durante la presa in carico. Riprova.", severity: "error" });
		} finally {
			setAccepting(false);
		}
	};

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

	const handleSendMessage = (e: React.FormEvent) => {
		e.preventDefault();
		if (!chatInput.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

		// Send message payload
		const payload = {
			content: chatInput.trim(),
			// token is already in connection, but could send here if needed
		};
		wsRef.current.send(JSON.stringify(payload));
		setChatInput("");
		setChatError(null); // Clear previous errors on new message
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

	// Helper functions for labels (assuming these will be defined elsewhere or added by user)
	const getStatusLabel = (status: string) => {
		switch (status) {
			case "OPEN":
				return "Aperto";
			case "ACCEPTED":
				return "Accettato";
			case "IN_PROGRESS":
				return "In Corso";
			case "COMPLETED":
				return "Completato";
			case "CANCELLED":
				return "Annullato";
			default:
				return status;
		}
	};

	const getCategoryLabel = (category: string) => {
		// Placeholder for actual category mapping
		return category;
	};

	const isCreator = dbUser?.id === task.creatorId;
	const isVolunteer = dbUser?.id === task.volunteerId;
	const canCancel = isCreator && (
		task.status === "OPEN" ||
		(task.status === "ACCEPTED" && cancelTimeLeft !== null && cancelTimeLeft > 0)
	);

	// Format timer MM:SS
	const formatTimer = (seconds: number) => {
		const m = Math.floor(seconds / 60).toString().padStart(2, "0");
		const s = (seconds % 60).toString().padStart(2, "0");
		return `${m}:${s}`;
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
							<Grid container alignItems="flex-start" justifyContent="space-between" spacing={3} sx={{ mb: 4 }}>
								<Grid size={{ xs: 12, md: "grow" }}>
									<Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1, flexWrap: "wrap" }}>
										<Typography variant="h4" fontWeight={800} sx={{ color: "primary.dark", wordBreak: "break-word" }}>
											{task.title}
										</Typography>
										<Chip
											label={getStatusLabel(task.status)}
											color={getStatusColor(task.status) as any}
											sx={{ fontWeight: "bold" }}
										/>
									</Box>
									<Typography
										variant="subtitle1"
										color="text.secondary"
										sx={{ display: "flex", alignItems: "center", gap: 1 }}
									>
										<CategoryIcon fontSize="small" />
										{getCategoryLabel(task.category)}
									</Typography>
								</Grid>
								{(task.status === "OPEN" || task.status === "ACCEPTED" || task.status === "IN_PROGRESS") && (
									<Grid size={{ xs: 12, md: "auto" }}>
										<Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: { xs: "flex-start", md: "flex-end" } }}>
											{(task.status === "ACCEPTED" || task.status === "IN_PROGRESS") && isVolunteer && (
												<Button
													variant="contained"
													color="secondary"
													onClick={() => setChatOpen(true)}
													startIcon={<ForumIcon />}
													sx={{ fontWeight: "bold", borderRadius: 2, flex: { xs: 1, sm: "none" } }}
												>
													Chat (Volontario)
												</Button>
											)}
											{(task.status === "ACCEPTED" || task.status === "IN_PROGRESS") && isCreator && (
												<Button
													variant="contained"
													color="primary"
													onClick={() => setChatOpen(true)}
													startIcon={<ForumIcon />}
													sx={{ fontWeight: "bold", borderRadius: 2, flex: { xs: 1, sm: "none" } }}
												>
													Chat
												</Button>
											)}

											{task.status === "OPEN" && !isCreator && (
												<Button
													variant="contained"
													color="primary"
													onClick={handleAcceptTask}
													disabled={accepting}
													startIcon={accepting && <CircularProgress size={20} color="inherit" />}
													sx={{ fontWeight: "bold", borderRadius: 2, px: 4, flex: { xs: 1, sm: "none" } }}
													disableElevation
												>
													{accepting ? "Assegnazione..." : "Prendi in carico"}
												</Button>
											)}

											{canCancel && (
												<Button
													variant="outlined"
													color="error"
													onClick={() => setCancelDialogOpen(true)}
													sx={{ fontWeight: "bold", borderRadius: 2, flex: { xs: 1, sm: "none" } }}
												>
													Annulla Richiesta
												</Button>
											)}
										</Box>
									</Grid>
								)}
							</Grid>

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

								{creator && (
									<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
										<PersonIcon color="action" />
										<Box>
											<Typography variant="caption" color="text.secondary" display="block">
												Richiedente
											</Typography>
											<Typography variant="body1" fontWeight={500}>
												{creator.firstName} {creator.lastName}
											</Typography>
										</Box>
									</Box>
								)}

								{(task.status === "ACCEPTED" || task.status === "IN_PROGRESS" || task.status === "COMPLETED") && volunteer && (
									<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
										<PersonIcon color="action" />
										<Box>
											<Typography variant="caption" color="text.secondary" display="block">
												Volontario
											</Typography>
											<Typography variant="body1" fontWeight={500}>
												{volunteer.firstName} {volunteer.lastName}
											</Typography>
										</Box>
									</Box>
								)}
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

						{/* Cancellation Timer */}
						{task.status === "ACCEPTED" && isCreator && cancelTimeLeft !== null && (
							<Paper
								elevation={3}
								sx={{
									p: 3,
									borderRadius: 3,
									background: cancelTimeLeft > 0
										? "linear-gradient(135deg, #FF6F00 0%, #FFA040 100%)"
										: "linear-gradient(135deg, #D32F2F 0%, #EF5350 100%)",
									color: "white",
									textAlign: "center",
								}}
							>
								<TimerIcon sx={{ fontSize: 40, mb: 1, opacity: 0.9 }} />
								<Typography variant="subtitle2" sx={{ opacity: 0.9, mb: 1 }}>
									{cancelTimeLeft > 0 ? "Tempo rimasto per annullare" : "Finestra di annullamento scaduta"}
								</Typography>
								<Typography variant="h3" fontWeight={900} sx={{ fontFamily: "'Courier New', monospace", letterSpacing: 4 }}>
									{formatTimer(cancelTimeLeft)}
								</Typography>
								<LinearProgress
									variant="determinate"
									value={Math.max(0, (cancelTimeLeft / 600) * 100)}
									sx={{
										mt: 2,
										height: 8,
										borderRadius: 4,
										bgcolor: "rgba(255,255,255,0.3)",
										"& .MuiLinearProgress-bar": {
											bgcolor: "white",
											borderRadius: 4,
										},
									}}
								/>
							</Paper>
						)}

						{/* Dual Confirmation Completion */}
						{(task.status === "ACCEPTED" || task.status === "IN_PROGRESS") && (isCreator || isVolunteer) && (
							<Card sx={{ borderRadius: 3, border: "2px solid", borderColor: "success.main" }}>
								<CardContent sx={{ textAlign: "center" }}>
									<CheckCircleOutlineIcon sx={{ fontSize: 40, color: "success.main", mb: 1 }} />
									<Typography variant="h6" fontWeight={700} gutterBottom>
										Conferma Completamento
									</Typography>

									{/* Status messages */}
									{task.creatorConfirmed && !task.volunteerConfirmed && (
										<Alert severity="info" sx={{ mb: 2, textAlign: "left" }}>
											Il richiedente ha confermato il completamento. In attesa della conferma del volontario.
										</Alert>
									)}
									{!task.creatorConfirmed && task.volunteerConfirmed && (
										<Alert severity="info" sx={{ mb: 2, textAlign: "left" }}>
											Il volontario ha confermato il completamento. In attesa della conferma del richiedente.
										</Alert>
									)}
									{!task.creatorConfirmed && !task.volunteerConfirmed && (
										<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
											Entrambi (richiedente e volontario) devono confermare il completamento del task.
										</Typography>
									)}

									<Button
										variant="contained"
										color="success"
										fullWidth
										size="large"
										startIcon={confirming ? <CircularProgress size={20} color="inherit" /> : <CheckCircleOutlineIcon />}
										onClick={handleConfirmCompletion}
										disabled={
											confirming ||
											(isCreator && Boolean(task.creatorConfirmed)) ||
											(isVolunteer && Boolean(task.volunteerConfirmed))
										}
										sx={{
											py: 1.5,
											fontWeight: 700,
											fontSize: "1rem",
											borderRadius: 2,
										}}
									>
										{confirming
											? "Conferma in corso..."
											: (isCreator && task.creatorConfirmed) || (isVolunteer && task.volunteerConfirmed)
												? "✓ Già confermato"
												: "Conferma Completamento"}
									</Button>
								</CardContent>
							</Card>
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

			{/* Chat Drawer */}
			<Drawer
				anchor="right"
				open={chatOpen}
				onClose={() => setChatOpen(false)}
				PaperProps={{
					sx: {
						width: { xs: "100%", sm: 400 },
						display: "flex",
						flexDirection: "column",
						bgcolor: "#F8FAFC",
					},
				}}
			>
				{/* Drawer Header */}
				<Box
					sx={{
						p: 2,
						bgcolor: "primary.main",
						color: "white",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						boxShadow: 1,
						zIndex: 1,
					}}
				>
					<Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
						<ChatIcon />
						<Typography variant="h6" fontWeight={600}>
							Chat di Supporto
						</Typography>
					</Box>
					<IconButton color="inherit" onClick={() => setChatOpen(false)} size="small">
						<CloseIcon />
					</IconButton>
				</Box>

				{chatError && (
					<Alert
						severity="error"
						variant="filled"
						sx={{ m: 2, borderRadius: 2 }}
						onClose={() => setChatError(null)}
					>
						{chatError}
					</Alert>
				)}

				{!chatError && (
					<Alert
						severity="info"
						sx={{ mx: 2, mt: 2, borderRadius: 2, "& .MuiAlert-message": { fontSize: "0.85rem" } }}
					>
						Questa chat è monitorata. I messaggi vengono resi anonimi per garantire la privacy. La chat verrà
						disattivata al completamento del task.
					</Alert>
				)}

				{/* Messages Area */}
				<Box sx={{ flexGrow: 1, p: 2, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
					{messages.length === 0 ? (
						<Box
							sx={{
								height: "100%",
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								justifyContent: "center",
								opacity: 0.5,
							}}
						>
							<ForumIcon sx={{ fontSize: 48, mb: 2 }} />
							<Typography variant="body2">Nessun messaggio.</Typography>
							<Typography variant="caption">Scrivi per iniziare la conversazione.</Typography>
						</Box>
					) : (
						messages.map((msg, idx) => {
							// Assuming we decode auth.user to get our own ID, or simply styling based on senderId match
							// Since auth object might not map perfectly to backend UUID yet without an extra call,
							// Let's use a simple logical check if we have our ID, otherwise alternate for demo
							const isMe = dbUser?.id ? msg.senderId === dbUser.id : false;

							return (
								<Box
									key={msg.id || idx}
									sx={{
										alignSelf: isMe ? "flex-end" : "flex-start",
										maxWidth: "80%",
									}}
								>
									<Paper
										elevation={1}
										sx={{
											p: 1.5,
											backgroundColor: isMe ? "primary.main" : "white",
											color: isMe ? "white" : "text.primary",
											borderRadius: isMe ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
										}}
									>
										<Typography variant="body2">{msg.content}</Typography>
									</Paper>
									<Typography
										variant="caption"
										sx={{
											display: "block",
											mt: 0.5,
											textAlign: isMe ? "right" : "left",
											color: "text.secondary",
											fontSize: "0.65rem",
										}}
									>
										{msg.createdAt
											? new Date(msg.createdAt).toLocaleTimeString([], {
												hour: "2-digit",
												minute: "2-digit",
											})
											: "Ora"}
									</Typography>
								</Box>
							);
						})
					)}
					<div ref={messagesEndRef} />
				</Box>

				{/* Input Area */}
				<Box
					component="form"
					onSubmit={handleSendMessage}
					sx={{
						p: 2,
						bgcolor: "white",
						borderTop: "1px solid",
						borderColor: "divider",
						display: "flex",
						gap: 1,
					}}
				>
					<TextField
						fullWidth
						size="small"
						placeholder="Scrivi un messaggio..."
						value={chatInput}
						onChange={(e) => setChatInput(e.target.value)}
						variant="outlined"
						sx={{
							"& .MuiOutlinedInput-root": {
								borderRadius: 8,
							},
						}}
					/>
					<IconButton
						type="submit"
						color="primary"
						disabled={!chatInput.trim()}
						sx={{
							bgcolor: chatInput.trim() ? "primary.light" : "transparent",
							color: chatInput.trim() ? "white" : "inherit",
							"&:hover": {
								bgcolor: "primary.main",
								color: "white",
							},
						}}
					>
						<SendIcon fontSize="small" />
					</IconButton>
				</Box>
			</Drawer>
		</Box>
	);
}
