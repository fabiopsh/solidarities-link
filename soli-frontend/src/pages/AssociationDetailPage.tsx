import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api, { USER_BASIC_CACHE_TTL } from "../api";
import {
	Box,
	Typography,
	Card,
	CardContent,
	Button,
	CircularProgress,
	Chip,
	Paper,
	Stack,
	TextField,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Snackbar,
	Alert,
	Divider,
	Avatar,
	IconButton,
	Tooltip,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import GroupsIcon from "@mui/icons-material/Groups";
import PendingIcon from "@mui/icons-material/HourglassEmpty";
import type { Association, AssociationMembership, AssociationRole } from "../types/models/Association";

interface BasicUser {
	id: string;
	firstName: string;
	lastName: string;
}

interface AssociationDetailResponse {
	association: Association;
	members: AssociationMembership[];
}

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

function getInitials(firstName: string, lastName: string) {
	return `${firstName?.charAt(0) ?? ""}${lastName?.charAt(0) ?? ""}`.toUpperCase();
}

export default function AssociationDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();

	const [association, setAssociation] = useState<Association | null>(null);
	const [members, setMembers] = useState<AssociationMembership[]>([]);
	const [userNames, setUserNames] = useState<Record<string, BasicUser>>({});
	const [currentDbUserId, setCurrentDbUserId] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	// Edit state
	const [editMode, setEditMode] = useState(false);
	const [editName, setEditName] = useState("");
	const [editDescription, setEditDescription] = useState("");
	const [saving, setSaving] = useState(false);

	// Delete dialog
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [deleting, setDeleting] = useState(false);

	const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
		open: false,
		message: "",
		severity: "success",
	});

	const showSnackbar = (message: string, severity: "success" | "error") =>
		setSnackbar({ open: true, message, severity });

	const fetchData = useCallback(async () => {
		if (!id) return;
		try {
			const [assocRes, userRes] = await Promise.all([
				api.get<AssociationDetailResponse>(`/api/associations/${id}`),
				api.get("/api/users/me"),
			]);
			setAssociation(assocRes.data.association);
			setMembers(assocRes.data.members);
			setCurrentDbUserId(userRes.data.id);

			// Batch-fetch member names
			const uniqueUserIds = [...new Set(assocRes.data.members.map((m) => m.userId))];
			const nameEntries = await Promise.all(
				uniqueUserIds.map((uid) =>
					api
						.get<BasicUser>(`/api/users/${uid}/basic`, { cache: { ttl: USER_BASIC_CACHE_TTL } })
						.then((r) => [uid, r.data] as [string, BasicUser])
						.catch(() => [uid, { id: uid, firstName: "?", lastName: "" }] as [string, BasicUser])
				)
			);
			setUserNames(Object.fromEntries(nameEntries));
		} catch {
			showSnackbar("Errore nel caricamento dell'associazione", "error");
		} finally {
			setLoading(false);
		}
	}, [id]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	// --- Derived ---
	const currentMembership = members.find((m) => m.userId === currentDbUserId) ?? null;
	const isAdmin = currentMembership?.role === "ADMIN" && currentMembership?.status === "APPROVED";
	const isModerator = currentMembership?.role === "MODERATOR" && currentMembership?.status === "APPROVED";
	const canManage = isAdmin || isModerator;

	const pendingMembers = members.filter((m) => m.status === "PENDING");
	const approvedMembers = members.filter((m) => m.status === "APPROVED");

	// --- Actions ---
	const handleSaveEdit = async () => {
		if (!id || !editName.trim()) return;
		setSaving(true);
		try {
			const res = await api.put<Association>(`/api/associations/${id}`, {
				name: editName.trim(),
				description: editDescription.trim() || null,
			});
			setAssociation(res.data);
			setEditMode(false);
			showSnackbar("Associazione aggiornata", "success");
		} catch {
			showSnackbar("Errore durante il salvataggio", "error");
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!id) return;
		setDeleting(true);
		try {
			await api.delete(`/api/associations/${id}`);
			navigate("/dashboard/associations", { replace: true });
		} catch {
			showSnackbar("Errore durante l'eliminazione", "error");
			setDeleting(false);
		}
	};

	const handleApprove = async (userId: string) => {
		if (!id) return;
		try {
			await api.put(`/api/associations/${id}/members/${userId}/approve`);
			showSnackbar("Membro approvato", "success");
			await fetchData();
		} catch {
			showSnackbar("Errore durante l'approvazione", "error");
		}
	};

	const handleReject = async (userId: string) => {
		if (!id) return;
		try {
			await api.delete(`/api/associations/${id}/members/${userId}`);
			showSnackbar("Richiesta rifiutata", "success");
			await fetchData();
		} catch {
			showSnackbar("Errore durante il rifiuto", "error");
		}
	};

	const handleRemoveMember = async (userId: string) => {
		if (!id) return;
		try {
			await api.delete(`/api/associations/${id}/members/${userId}`);
			showSnackbar("Membro rimosso", "success");
			await fetchData();
		} catch (err: any) {
			showSnackbar(
				err?.response?.status === 409
					? "Impossibile rimuovere l'unico admin"
					: "Errore durante la rimozione",
				"error"
			);
		}
	};

	const handleChangeRole = async (userId: string, newRole: AssociationRole) => {
		if (!id) return;
		try {
			await api.put(`/api/associations/${id}/members/${userId}/role`, { role: newRole });
			showSnackbar(
				newRole === "MODERATOR" ? "Membro promosso a Moderatore" : "Ruolo rimosso a Membro",
				"success"
			);
			await fetchData();
		} catch (err: any) {
			showSnackbar(
				err?.response?.status === 409
					? "Impossibile modificare il ruolo"
					: "Errore durante la modifica del ruolo",
				"error"
			);
		}
	};

	// --- Render helpers ---
	const getUserName = (userId: string) => {
		const u = userNames[userId];
		return u ? `${u.firstName} ${u.lastName}`.trim() : "…";
	};

	if (loading) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
				<CircularProgress />
			</Box>
		);
	}

	if (!association) {
		return (
			<Box sx={{ maxWidth: 800, mx: "auto", mt: 6 }}>
				<Alert severity="error">Associazione non trovata.</Alert>
				<Button startIcon={<ArrowBackIcon />} sx={{ mt: 2, textTransform: "none" }} onClick={() => navigate("/dashboard/associations")}>
					Torna alle associazioni
				</Button>
			</Box>
		);
	}

	return (
		<Box sx={{ maxWidth: 900, mx: "auto" }}>
			{/* Back navigation */}
			<Button
				startIcon={<ArrowBackIcon />}
				onClick={() => navigate("/dashboard/associations")}
				sx={{ textTransform: "none", fontWeight: 600, color: "text.secondary", mb: 2, pl: 0 }}
			>
				Associazioni
			</Button>

			{/* ── Header card ── */}
			<Card sx={{ borderRadius: 3, boxShadow: "0 4px 20px rgba(0,0,0,0.05)", mb: 3, overflow: "visible" }}>
				{/* Gradient band */}
				<Box
					sx={{
						background: "linear-gradient(135deg, #00796B 0%, #48A999 100%)",
						p: 4,
						borderRadius: "12px 12px 0 0",
						display: "flex",
						alignItems: "flex-start",
						justifyContent: "space-between",
						gap: 2,
					}}
				>
					<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
						<Box
							sx={{
								width: 56,
								height: 56,
								borderRadius: 2,
								bgcolor: "rgba(255,255,255,0.2)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								flexShrink: 0,
							}}
						>
							<GroupsIcon sx={{ fontSize: 28, color: "white" }} />
						</Box>
						<Box>
							<Typography variant="h5" fontWeight={700} color="white">
								{association.name}
							</Typography>
							<Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)", mt: 0.5 }}>
								Creata il {new Date(association.createdAt).toLocaleDateString("it-IT", { year: "numeric", month: "long", day: "numeric" })}
							</Typography>
						</Box>
					</Box>

					{/* Admin actions */}
					{isAdmin && !editMode && (
						<Stack direction="row" spacing={1} flexShrink={0}>
							<Button
								variant="outlined"
								startIcon={<EditIcon />}
								size="small"
								onClick={() => {
									setEditName(association.name);
									setEditDescription(association.description ?? "");
									setEditMode(true);
								}}
								sx={{
									textTransform: "none",
									fontWeight: 600,
									borderColor: "rgba(255,255,255,0.6)",
									color: "white",
									"&:hover": { borderColor: "white", bgcolor: "rgba(255,255,255,0.1)" },
								}}
							>
								Modifica
							</Button>
							<Button
								variant="outlined"
								startIcon={<DeleteOutlineIcon />}
								size="small"
								onClick={() => setDeleteDialogOpen(true)}
								sx={{
									textTransform: "none",
									fontWeight: 600,
									borderColor: "rgba(255,100,100,0.6)",
									color: "rgba(255,180,180,1)",
									"&:hover": { borderColor: "rgba(255,100,100,0.9)", bgcolor: "rgba(255,0,0,0.08)" },
								}}
							>
								Elimina
							</Button>
						</Stack>
					)}
				</Box>

				<CardContent sx={{ p: 3 }}>
					{editMode ? (
						<Stack spacing={2}>
							<TextField
								label="Nome"
								fullWidth
								value={editName}
								onChange={(e) => setEditName(e.target.value)}
								size="small"
							/>
							<TextField
								label="Descrizione"
								fullWidth
								multiline
								rows={3}
								value={editDescription}
								onChange={(e) => setEditDescription(e.target.value)}
								size="small"
							/>
							<Stack direction="row" spacing={1.5}>
								<Button
									variant="contained"
									disabled={!editName.trim() || saving}
									onClick={handleSaveEdit}
									sx={{
										textTransform: "none",
										fontWeight: 600,
										borderRadius: 2,
										background: "linear-gradient(135deg, #00796b 0%, #48a999 100%)",
										"&:hover": { background: "linear-gradient(135deg, #004d40 0%, #00796b 100%)" },
									}}
								>
									{saving ? <CircularProgress size={18} color="inherit" /> : "Salva modifiche"}
								</Button>
								<Button
									onClick={() => setEditMode(false)}
									sx={{ textTransform: "none", borderRadius: 2 }}
								>
									Annulla
								</Button>
							</Stack>
						</Stack>
					) : (
						<Stack spacing={1.5}>
							{association.description ? (
								<Typography variant="body1" color="text.secondary">
									{association.description}
								</Typography>
							) : (
								<Typography variant="body2" color="text.disabled" fontStyle="italic">
									Nessuna descrizione
								</Typography>
							)}
							<Stack direction="row" spacing={1} flexWrap="wrap">
								<Chip
									label={`${approvedMembers.length} ${approvedMembers.length === 1 ? "membro" : "membri"}`}
									size="small"
									icon={<GroupsIcon />}
									sx={{ fontWeight: 600 }}
								/>
								{currentMembership && (
									<Chip
										label={`Il tuo ruolo: ${ROLE_LABELS[currentMembership.role]}`}
										color={ROLE_COLORS[currentMembership.role]}
										size="small"
										sx={{ fontWeight: 600 }}
									/>
								)}
							</Stack>
						</Stack>
					)}
				</CardContent>
			</Card>

			{/* ── Pending requests (Admin/Moderator only) ── */}
			{canManage && pendingMembers.length > 0 && (
				<Card sx={{ borderRadius: 3, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", mb: 3 }}>
					<CardContent sx={{ p: 3 }}>
						<Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2.5 }}>
							<PendingIcon color="warning" fontSize="small" />
							<Typography variant="h6" fontWeight={700}>
								Richieste in attesa
							</Typography>
							<Chip label={pendingMembers.length} size="small" color="warning" sx={{ fontWeight: 700, ml: 0.5 }} />
						</Box>

						<Stack spacing={1.5}>
							{pendingMembers.map((m) => (
								<Paper
									key={m.id}
									elevation={0}
									sx={{ p: 2, borderRadius: 2, bgcolor: "background.default", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}
								>
									<Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
										<Avatar sx={{ bgcolor: "warning.light", color: "warning.dark", width: 36, height: 36, fontSize: "0.85rem", fontWeight: 700 }}>
											{getInitials(userNames[m.userId]?.firstName ?? "", userNames[m.userId]?.lastName ?? "")}
										</Avatar>
										<Box>
											<Typography variant="body2" fontWeight={600}>{getUserName(m.userId)}</Typography>
											<Typography variant="caption" color="text.secondary">
												Richiesta il {new Date(m.joinedAt).toLocaleDateString("it-IT")}
											</Typography>
										</Box>
									</Box>
									<Stack direction="row" spacing={1}>
										<Tooltip title="Approva">
											<IconButton
												size="small"
												color="success"
												onClick={() => handleApprove(m.userId)}
												sx={{ bgcolor: "success.50", "&:hover": { bgcolor: "success.100" } }}
											>
												<CheckIcon fontSize="small" />
											</IconButton>
										</Tooltip>
										<Tooltip title="Rifiuta">
											<IconButton
												size="small"
												color="error"
												onClick={() => handleReject(m.userId)}
												sx={{ bgcolor: "error.50", "&:hover": { bgcolor: "error.100" } }}
											>
												<CloseIcon fontSize="small" />
											</IconButton>
										</Tooltip>
									</Stack>
								</Paper>
							))}
						</Stack>
					</CardContent>
				</Card>
			)}

			{/* ── Members list ── */}
			<Card sx={{ borderRadius: 3, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
				<CardContent sx={{ p: 3 }}>
					<Typography variant="h6" fontWeight={700} mb={2.5}>
						Membri ({approvedMembers.length})
					</Typography>

					{approvedMembers.length === 0 ? (
						<Card sx={{ p: 5, textAlign: "center", borderRadius: 3, border: "2px dashed", borderColor: "divider", bgcolor: "transparent", boxShadow: "none" }}>
							<GroupsIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
							<Typography color="text.secondary">Nessun membro approvato</Typography>
						</Card>
					) : (
						<Stack spacing={1.5}>
							{approvedMembers.map((m) => {
								const isSelf = m.userId === currentDbUserId;
								const canAdminManageThis = isAdmin && !isSelf;
								const canModeratorManageThis = isModerator && !isSelf && m.role === "MEMBER";

								return (
									<Paper
										key={m.id}
										elevation={0}
										sx={{ p: 2, borderRadius: 2, bgcolor: isSelf ? "rgba(0,121,107,0.04)" : "background.default", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}
									>
										<Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
											<Avatar sx={{ bgcolor: "primary.main", width: 36, height: 36, fontSize: "0.85rem", fontWeight: 700 }}>
												{getInitials(userNames[m.userId]?.firstName ?? "", userNames[m.userId]?.lastName ?? "")}
											</Avatar>
											<Box sx={{ minWidth: 0 }}>
												<Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
													<Typography variant="body2" fontWeight={600} noWrap>
														{getUserName(m.userId)}
													</Typography>
													{isSelf && (
														<Typography variant="caption" color="text.secondary">(tu)</Typography>
													)}
												</Box>
												<Typography variant="caption" color="text.secondary">
													Iscritto dal {new Date(m.joinedAt).toLocaleDateString("it-IT")}
												</Typography>
											</Box>
										</Box>

										<Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexShrink: 0 }}>
											<Chip
												label={ROLE_LABELS[m.role]}
												color={ROLE_COLORS[m.role]}
												size="small"
												sx={{ fontWeight: 600 }}
											/>

											{/* Admin actions */}
											{canAdminManageThis && (
												<Stack direction="row" spacing={0.5}>
													{m.role === "MEMBER" && (
														<Tooltip title="Promuovi a Moderatore">
															<IconButton size="small" color="primary" onClick={() => handleChangeRole(m.userId, "MODERATOR")}>
																<ArrowUpwardIcon fontSize="small" />
															</IconButton>
														</Tooltip>
													)}
													{m.role === "MODERATOR" && (
														<Tooltip title="Rimuovi promozione (torna Membro)">
															<IconButton size="small" color="default" onClick={() => handleChangeRole(m.userId, "MEMBER")}>
																<ArrowDownwardIcon fontSize="small" />
															</IconButton>
														</Tooltip>
													)}
													<Tooltip title="Rimuovi dall'associazione">
														<IconButton size="small" color="error" onClick={() => handleRemoveMember(m.userId)}>
															<PersonRemoveIcon fontSize="small" />
														</IconButton>
													</Tooltip>
												</Stack>
											)}

											{/* Moderator actions — only for base members */}
											{canModeratorManageThis && (
												<Tooltip title="Rimuovi dall'associazione">
													<IconButton size="small" color="error" onClick={() => handleRemoveMember(m.userId)}>
														<PersonRemoveIcon fontSize="small" />
													</IconButton>
												</Tooltip>
											)}
										</Box>
									</Paper>
								);
							})}
						</Stack>
					)}

					{/* Non-member notice */}
					{!currentMembership && (
						<>
							<Divider sx={{ my: 2 }} />
							<Typography variant="caption" color="text.secondary">
								Non sei membro di questa associazione. Puoi iscriverti dalla{" "}
								<Box
									component="span"
									sx={{ color: "primary.main", cursor: "pointer", fontWeight: 600 }}
									onClick={() => navigate("/dashboard/associations")}
								>
									lista associazioni
								</Box>
								.
							</Typography>
						</>
					)}
				</CardContent>
			</Card>

			{/* ── Delete confirmation dialog ── */}
			<Dialog
				open={deleteDialogOpen}
				onClose={() => !deleting && setDeleteDialogOpen(false)}
				maxWidth="xs"
				fullWidth
				PaperProps={{ sx: { borderRadius: 3 } }}
			>
				<DialogTitle sx={{ fontWeight: 700 }}>Elimina associazione</DialogTitle>
				<DialogContent>
					<Typography variant="body2" color="text.secondary">
						Stai per eliminare{" "}
						<Typography component="span" fontWeight={700} color="text.primary">
							{association.name}
						</Typography>
						. Questa operazione è irreversibile e rimuoverà tutti i membri associati.
					</Typography>
				</DialogContent>
				<DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
					<Button
						onClick={() => setDeleteDialogOpen(false)}
						disabled={deleting}
						sx={{ textTransform: "none", borderRadius: 2 }}
					>
						Annulla
					</Button>
					<Button
						variant="contained"
						color="error"
						disabled={deleting}
						onClick={handleDelete}
						sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, px: 3 }}
					>
						{deleting ? <CircularProgress size={18} color="inherit" /> : "Elimina definitivamente"}
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
