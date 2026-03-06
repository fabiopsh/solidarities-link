import { useState, useEffect } from "react";
import {
	Box,
	Typography,
	Card,
	CardContent,
	CircularProgress,
	Alert,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	Chip,
	Button,
} from "@mui/material";
import { useAuth } from "react-oidc-context";
import { Link } from "react-router-dom";
import api from "../api";
import type { Task } from "../types/models/Task";

export default function AdminDashboardPage() {
	const auth = useAuth();
	const [tasks, setTasks] = useState<Task[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const isAdmin = (auth.user?.profile?.realm_access as any)?.roles?.includes("admin") || false;

	const fetchAllTasks = async () => {
		try {
			// API for admin returns ALL tasks (handled by backend listAll filtering by role)
			const res = await api.get("/api/tasks", { params: { size: 100 } });
			setTasks(res.data.data || []);
		} catch (err) {
			console.error("Error fetching all tasks:", err);
			setError("Failed to load global tasks.");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (auth.isAuthenticated && isAdmin) {
			fetchAllTasks();
		} else if (auth.isAuthenticated && !isAdmin) {
			setError("Accesso Negato. Questa pagina è riservata agli amministratori.");
			setLoading(false);
		}
	}, [auth.isAuthenticated, isAdmin]);

	const getStatusColor = (status: string) => {
		switch (status) {
			case "OPEN":
				return "primary";
			case "ACCEPTED":
			case "IN_PROGRESS":
				return "secondary";
			case "COMPLETED":
				return "success";
			case "CANCELLED":
				return "error";
			default:
				return "default";
		}
	};

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

	return (
		<Box>
			<Box sx={{ mb: 4 }}>
				<Typography variant="h4" fontWeight={800} sx={{ color: "primary.dark", mb: 1 }}>
					Gestione Globale Task
				</Typography>
				<Typography variant="body1" color="text.secondary">
					Visione completa di tutte le richieste inserite a sistema.
				</Typography>
			</Box>

			<Card sx={{ borderRadius: 3, boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
				<CardContent sx={{ p: 0 }}>
					<TableContainer component={Paper} elevation={0}>
						<Table>
							<TableHead sx={{ bgcolor: "grey.50" }}>
								<TableRow>
									<TableCell sx={{ fontWeight: "bold" }}>Titolo</TableCell>
									<TableCell sx={{ fontWeight: "bold" }}>Categoria</TableCell>
									<TableCell sx={{ fontWeight: "bold" }}>Stato</TableCell>
									<TableCell sx={{ fontWeight: "bold" }}>ID Creatore</TableCell>
									<TableCell sx={{ fontWeight: "bold" }}>Azioni</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{tasks.length === 0 ? (
									<TableRow>
										<TableCell colSpan={5} align="center" sx={{ py: 3 }}>
											Nessun task presente a sistema.
										</TableCell>
									</TableRow>
								) : (
									tasks.map((task) => (
										<TableRow key={task.id} hover>
											<TableCell>{task.title}</TableCell>
											<TableCell>{task.category}</TableCell>
											<TableCell>
												<Chip
													label={task.status}
													color={getStatusColor(task.status)}
													size="small"
													sx={{ fontWeight: "bold" }}
												/>
											</TableCell>
											<TableCell sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
												{task.creatorId?.substring(0, 8)}...
											</TableCell>
											<TableCell>
												<Button
													component={Link}
													to={`/dashboard/requests/${task.id}`}
													variant="outlined"
													size="small"
												>
													Dettagli
												</Button>
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</TableContainer>
				</CardContent>
			</Card>
		</Box>
	);
}
