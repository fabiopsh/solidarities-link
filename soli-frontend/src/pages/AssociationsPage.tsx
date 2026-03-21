import { useState, useEffect, useCallback } from "react";
import { useAuth } from "react-oidc-context";
import { useNavigate } from "react-router-dom";
import api from "../api";
import {
	Box,
	Typography,
	Grid,
	Card,
	CardContent,
	TextField,
	InputAdornment,
	Chip,
	Button,
	CircularProgress,
	Paper,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Snackbar,
	Alert,
	Stack,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import GroupsIcon from "@mui/icons-material/Groups";
import AddIcon from "@mui/icons-material/Add";
import type { Association, MyAssociation, AssociationRole } from "../types/models/Association";
import type { PaginatedResponse } from "../types/models/PaginatedResponse";
import { useRole } from "../context/RoleContext";
import AssociationAvatar from "../components/AssociationAvatar";

const ROLE_LABELS: Record<AssociationRole, string> = {
	ADMIN: "Admin",
	MODERATOR: "Moderatore",
	MEMBER: "Membro",
};

const ROLE_COLORS: Record<AssociationRole, "success" | "primary" | "default"> = {
	ADMIN: "success",
	MODERATOR: "primary",
	MEMBER: "default",
};

type MembershipFilter = "all" | "joined" | "not_joined";

const FILTER_OPTIONS: { value: MembershipFilter; label: string }[] = [
	{ value: "all", label: "Tutte" },
	{ value: "joined", label: "Iscritto" },
	{ value: "not_joined", label: "Non iscritto" },
];

export default function AssociationsPage() {
	const auth = useAuth();
	const navigate = useNavigate();
	const { role } = useRole();

	const [allAssociations, setAllAssociations] = useState<Association[]>([]);
	const [loadingAll, setLoadingAll] = useState(true);
	const [myAssociations, setMyAssociations] = useState<MyAssociation[]>([]);
	const [loadingMy, setLoadingMy] = useState(true);
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);

	const [searchQuery, setSearchQuery] = useState("");
	const [membershipFilter, setMembershipFilter] = useState<MembershipFilter>("all");

	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [newName, setNewName] = useState("");
	const [newDescription, setNewDescription] = useState("");
	const [creating, setCreating] = useState(false);

	const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
		open: false,
		message: "",
		severity: "success",
	});

	const showSnackbar = (message: string, severity: "success" | "error") =>
		setSnackbar({ open: true, message, severity });

	const fetchCurrentUser = useCallback(async () => {
		try {
			const res = await api.get("/api/users/me");
			setCurrentUserId(res.data.id);
		} catch { /* ignore */ }
	}, []);

	const fetchAllAssociations = useCallback(async () => {
		setLoadingAll(true);
		try {
			const res = await api.get<PaginatedResponse<Association>>("/api/associations?page=0&size=100");
			setAllAssociations(res.data.data ?? []);
		} catch {
			showSnackbar("Errore nel caricamento delle associazioni", "error");
		} finally {
			setLoadingAll(false);
		}
	}, []);

	const fetchMyAssociations = useCallback(async () => {
		setLoadingMy(true);
		try {
			const res = await api.get<MyAssociation[]>("/api/associations/my");
			setMyAssociations(res.data ?? []);
		} catch {
			showSnackbar("Errore nel caricamento delle tue associazioni", "error");
		} finally {
			setLoadingMy(false);
		}
	}, []);

	useEffect(() => {
		if (auth.isAuthenticated) {
			fetchCurrentUser();
			fetchAllAssociations();
			fetchMyAssociations();
		}
	}, [auth.isAuthenticated, fetchCurrentUser, fetchAllAssociations, fetchMyAssociations]);

	const isMember = (associationId: string) =>
		myAssociations.some((m) => m.association.id === associationId);

	const getMembership = (associationId: string) =>
		myAssociations.find((m) => m.association.id === associationId);

	const handleJoin = async (associationId: string) => {
		try {
			await api.post(`/api/associations/${associationId}/join`);
			showSnackbar("Richiesta di iscrizione inviata", "success");
			await fetchMyAssociations();
		} catch (err: any) {
			showSnackbar(
				err?.response?.status === 409
					? "Sei già iscritto o hai una richiesta in attesa"
					: "Errore durante l'iscrizione",
				"error"
			);
		}
	};

	const handleLeave = async (associationId: string) => {
		if (!currentUserId) return;
		try {
			await api.delete(`/api/associations/${associationId}/members/${currentUserId}`);
			showSnackbar("Hai abbandonato l'associazione", "success");
			await fetchMyAssociations();
		} catch (err: any) {
			showSnackbar(
				err?.response?.status === 409
					? "Non puoi abbandonare: sei l'unico admin"
					: "Errore durante l'abbandono",
				"error"
			);
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
			showSnackbar("Associazione creata con successo", "success");
			setCreateDialogOpen(false);
			setNewName("");
			setNewDescription("");
			await Promise.all([fetchAllAssociations(), fetchMyAssociations()]);
		} catch {
			showSnackbar("Errore durante la creazione", "error");
		} finally {
			setCreating(false);
		}
	};

	const filteredAssociations = allAssociations.filter((a) => {
		const matchSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase());
		const matchFilter =
			membershipFilter === "all" ||
			(membershipFilter === "joined" && isMember(a.id)) ||
			(membershipFilter === "not_joined" && !isMember(a.id));
		return matchSearch && matchFilter;
	});

	return (
		<Box sx={{ maxWidth: 1100, mx: "auto" }}>
			{/* Page header */}
			<Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 4 }}>
				<Box>
					<Typography variant="h4" fontWeight={700} gutterBottom>
						Associazioni
					</Typography>
					<Typography variant="body1" color="text.secondary">
						Esplora le associazioni attive nella rete SoLi e gestisci le tue iscrizioni.
					</Typography>
				</Box>
				{role === "volunteer" && (
					<Button
						variant="contained"
						startIcon={<AddIcon />}
						size="large"
						onClick={() => setCreateDialogOpen(true)}
						sx={{
							flexShrink: 0,
							ml: 2,
							background: "linear-gradient(135deg, #00796b 0%, #48a999 100%)",
							borderRadius: 2,
							px: 3,
							textTransform: "none",
							fontWeight: 600,
							boxShadow: "0 2px 8px rgba(0,121,107,0.25)",
							"&:hover": {
								background: "linear-gradient(135deg, #004d40 0%, #00796b 100%)",
								boxShadow: "0 4px 12px rgba(0,77,64,0.3)",
							},
						}}
					>
						Crea associazione
					</Button>
				)}
			</Box>

			<Grid container spacing={3} alignItems="flex-start">
				{/* LEFT — Global list */}
				<Grid item xs={12} md={6}>
					<Card sx={{ borderRadius: 3, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
						<CardContent sx={{ p: 3 }}>
							<Typography variant="h6" fontWeight={700} mb={2.5}>
								Lista associazioni
							</Typography>

							<TextField
								fullWidth
								size="small"
								placeholder="Cerca per nome..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								InputProps={{
									startAdornment: (
										<InputAdornment position="start">
											<SearchIcon fontSize="small" color="action" />
										</InputAdornment>
									),
								}}
								sx={{
									mb: 2,
									"& .MuiOutlinedInput-root": {
										borderRadius: "12px",
										bgcolor: "background.default",
									},
								}}
							/>

							{/* Filter chips */}
							<Stack direction="row" spacing={1} mb={3}>
								{FILTER_OPTIONS.map((opt) => (
									<Chip
										key={opt.value}
										label={opt.label}
										onClick={() => setMembershipFilter(opt.value)}
										variant={membershipFilter === opt.value ? "filled" : "outlined"}
										color={membershipFilter === opt.value ? "primary" : "default"}
										sx={{ fontWeight: 600, borderRadius: "8px" }}
									/>
								))}
							</Stack>

							{/* List */}
							{loadingAll ? (
								<Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
									<CircularProgress />
								</Box>
							) : filteredAssociations.length === 0 ? (
								<Card
									sx={{
										p: 5,
										textAlign: "center",
										borderRadius: 3,
										border: "2px dashed",
										borderColor: "divider",
										bgcolor: "transparent",
										boxShadow: "none",
									}}
								>
									<GroupsIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
									<Typography variant="h6" color="text.secondary">
										Nessuna associazione trovata
									</Typography>
								</Card>
							) : (
								<Stack spacing={1.5} sx={{ maxHeight: 520, overflowY: "auto", pr: 0.5 }}>
									{filteredAssociations.map((assoc) => {
										const membership = getMembership(assoc.id);
										const member = isMember(assoc.id);
										return (
											<Paper
												key={assoc.id}
												elevation={0}
												sx={{
													p: 2,
													borderRadius: 2,
													bgcolor: "background.default",
													display: "flex",
													alignItems: "center",
													justifyContent: "space-between",
													gap: 2,
													transition: "box-shadow 0.15s",
													"&:hover": { boxShadow: "0 2px 8px rgba(0,0,0,0.08)" },
												}}
											>
												<Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
													<AssociationAvatar
														associationId={assoc.id}
														accentColor={assoc.accentColor ?? undefined}
														size={36}
													/>
													<Box sx={{ minWidth: 0 }}>
														<Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
															<Typography
																variant="body2"
																fontWeight={600}
																noWrap
																onClick={() => navigate(`/dashboard/associations/${assoc.id}`)}
																sx={{ cursor: "pointer", "&:hover": { color: "primary.main", textDecoration: "underline" } }}
															>
																{assoc.name}
															</Typography>
															{membership && (
																<Chip
																	label={
																		membership.membership.status === "APPROVED"
																			? ROLE_LABELS[membership.membership.role]
																			: "In attesa"
																	}
																	color={
																		membership.membership.status === "APPROVED"
																			? ROLE_COLORS[membership.membership.role]
																			: "warning"
																	}
																	size="small"
																	sx={{ height: 20, fontSize: "0.7rem" }}
																/>
															)}
														</Box>
														{assoc.description && (
															<Typography
																variant="caption"
																color="text.secondary"
																sx={{
																	display: "-webkit-box",
																	WebkitLineClamp: 1,
																	WebkitBoxOrient: "vertical",
																	overflow: "hidden",
																}}
															>
																{assoc.description}
															</Typography>
														)}
													</Box>
												</Box>

												{member ? (
													<Button
														size="small"
														color="error"
														variant="text"
														onClick={() => handleLeave(assoc.id)}
														sx={{ textTransform: "none", fontWeight: 600, flexShrink: 0 }}
													>
														Abbandona
													</Button>
												) : (
													<Button
														size="small"
														variant="outlined"
														onClick={() => handleJoin(assoc.id)}
														sx={{
															textTransform: "none",
															fontWeight: 600,
															borderRadius: "8px",
															flexShrink: 0,
															borderColor: "primary.main",
															color: "primary.main",
														}}
													>
														Iscriviti
													</Button>
												)}
											</Paper>
										);
									})}
								</Stack>
							)}
						</CardContent>
					</Card>
				</Grid>

				{/* RIGHT — My associations */}
				<Grid item xs={12} md={6}>
					<Card sx={{ borderRadius: 3, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
						<CardContent sx={{ p: 3 }}>
							<Typography variant="h6" fontWeight={700} mb={2.5}>
								Le mie associazioni
							</Typography>

							{loadingMy ? (
								<Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
									<CircularProgress />
								</Box>
							) : myAssociations.length === 0 ? (
								<Card
									sx={{
										p: 5,
										textAlign: "center",
										borderRadius: 3,
										border: "2px dashed",
										borderColor: "divider",
										bgcolor: "transparent",
										boxShadow: "none",
									}}
								>
									<GroupsIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
									<Typography variant="body2" color="text.secondary">
										Non sei ancora iscritto a nessuna associazione
									</Typography>
								</Card>
							) : (
								<Stack spacing={1.5} sx={{ maxHeight: 520, overflowY: "auto", pr: 0.5 }}>
									{myAssociations.map(({ association, membership }) => (
										<Paper
											key={association.id}
											elevation={0}
											sx={{
												p: 2,
												borderRadius: 2,
												bgcolor: "background.default",
											}}
										>
											<Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
												<Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
												<AssociationAvatar
													associationId={association.id}
													accentColor={association.accentColor ?? undefined}
													size={36}
												/>
												<Box sx={{ minWidth: 0 }}>
													<Typography
														variant="body2"
														fontWeight={600}
														noWrap
														onClick={() => navigate(`/dashboard/associations/${association.id}`)}
														sx={{ cursor: "pointer", "&:hover": { color: "primary.main", textDecoration: "underline" } }}
													>
														{association.name}
													</Typography>
													{association.description && (
														<Typography
															variant="caption"
															color="text.secondary"
															sx={{
																display: "-webkit-box",
																WebkitLineClamp: 1,
																WebkitBoxOrient: "vertical",
																overflow: "hidden",
															}}
														>
															{association.description}
														</Typography>
													)}
												</Box>
											</Box>
											<Stack direction="row" spacing={0.5} flexShrink={0}>
													<Chip
														label={ROLE_LABELS[membership.role]}
														color={ROLE_COLORS[membership.role]}
														size="small"
														sx={{ height: 22, fontSize: "0.7rem" }}
													/>
													<Chip
														label={membership.status === "APPROVED" ? "Approvato" : "In attesa"}
														color={membership.status === "APPROVED" ? "success" : "warning"}
														variant="outlined"
														size="small"
														sx={{ height: 22, fontSize: "0.7rem" }}
													/>
												</Stack>
											</Box>

											<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 1.5 }}>
												<Typography variant="caption" color="text.secondary">
													Iscritto il {new Date(membership.joinedAt).toLocaleDateString("it-IT")}
												</Typography>
												{currentUserId && (
													<Button
														size="small"
														color="error"
														variant="text"
														onClick={() => handleLeave(association.id)}
														sx={{ textTransform: "none", fontWeight: 600, p: 0, minWidth: 0, fontSize: "0.75rem" }}
													>
														Abbandona
													</Button>
												)}
											</Box>
										</Paper>
									))}
								</Stack>
							)}
						</CardContent>
					</Card>
				</Grid>
			</Grid>

			{/* Create dialog */}
			<Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="xs" fullWidth
				PaperProps={{ sx: { borderRadius: 3 } }}
			>
				<DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Crea associazione</DialogTitle>
				<DialogContent sx={{ pt: 1 }}>
					<TextField
						label="Nome"
						fullWidth
						value={newName}
						onChange={(e) => setNewName(e.target.value)}
						sx={{ mt: 1, mb: 2 }}
						autoFocus
					/>
					<TextField
						label="Descrizione (opzionale)"
						fullWidth
						multiline
						rows={3}
						value={newDescription}
						onChange={(e) => setNewDescription(e.target.value)}
					/>
				</DialogContent>
				<DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
					<Button
						onClick={() => setCreateDialogOpen(false)}
						sx={{ textTransform: "none", borderRadius: 2 }}
					>
						Annulla
					</Button>
					<Button
						variant="contained"
						disabled={!newName.trim() || creating}
						onClick={handleCreate}
						sx={{
							textTransform: "none",
							fontWeight: 600,
							borderRadius: 2,
							px: 3,
							background: "linear-gradient(135deg, #00796b 0%, #48a999 100%)",
							"&:hover": { background: "linear-gradient(135deg, #004d40 0%, #00796b 100%)" },
						}}
					>
						{creating ? <CircularProgress size={18} color="inherit" /> : "Crea"}
					</Button>
				</DialogActions>
			</Dialog>

			<Snackbar
				open={snackbar.open}
				autoHideDuration={4000}
				onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
				anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
			>
				<Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: 2 }}>
					{snackbar.message}
				</Alert>
			</Snackbar>
		</Box>
	);
}
