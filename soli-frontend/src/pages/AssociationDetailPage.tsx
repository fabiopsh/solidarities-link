import { useState, useEffect, useCallback, useRef } from "react";
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
	Badge,
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
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import type { Association, AssociationMembership, AssociationRole } from "../types/models/Association";
import UserAvatar from "../components/UserAvatar";

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

const COLOR_PALETTE = [
	"#00796B", "#00838F", "#1565C0", "#4527A0", "#6A1B9A",
	"#AD1457", "#C62828", "#E65100", "#F57F17", "#2E7D32",
	"#37474F", "#5D4037",
];


export default function AssociationDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();

	const [association, setAssociation] = useState<Association | null>(null);
	const [members, setMembers] = useState<AssociationMembership[]>([]);
	const [userNames, setUserNames] = useState<Record<string, BasicUser>>({});
	const [currentDbUserId, setCurrentDbUserId] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	// Image
	const [imageUrl, setImageUrl] = useState<string | null>(null);
	const [uploadingImage, setUploadingImage] = useState(false);
	const imageInputRef = useRef<HTMLInputElement>(null);
	const imageUrlRef = useRef<string | null>(null);

	// Edit state
	const [editMode, setEditMode] = useState(false);
	const [editName, setEditName] = useState("");
	const [editDescription, setEditDescription] = useState("");
	const [editColor, setEditColor] = useState<string | null>(null);
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

	const loadImage = useCallback(async (associationId: string) => {
		try {
			const res = await api.get(`/api/associations/${associationId}/image`, { responseType: "blob" });
			if (res.status === 200 && res.data && res.data.size > 0) {
				if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
				const newUrl = URL.createObjectURL(res.data);
				imageUrlRef.current = newUrl;
				setImageUrl(newUrl);
			} else {
				if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
				imageUrlRef.current = null;
				setImageUrl(null);
			}
		} catch {
			if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
			imageUrlRef.current = null;
			setImageUrl(null);
		}
	}, []);

	const fetchData = useCallback(async (signal?: AbortSignal) => {
		if (!id) return;
		try {
			const [assocRes, userRes] = await Promise.all([
				api.get<AssociationDetailResponse>(`/api/associations/${id}`, { signal }),
				api.get("/api/users/me", { signal }),
			]);
			setAssociation(assocRes.data.association);
			setMembers(assocRes.data.members);
			setCurrentDbUserId(userRes.data.id);

			await loadImage(id);

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
		} catch (err: any) {
			if (err?.code === "ERR_CANCELED") return;
			showSnackbar("Errore nel caricamento dell'associazione", "error");
		} finally {
			setLoading(false);
		}
	}, [id, loadImage]);

	useEffect(() => {
		const controller = new AbortController();
		fetchData(controller.signal);
		return () => {
			controller.abort();
			if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
		};
	}, [fetchData]);

	// --- Derived ---
	const currentMembership = members.find((m) => m.userId === currentDbUserId) ?? null;
	const isAdmin = currentMembership?.role === "ADMIN" && currentMembership?.status === "APPROVED";
	const isModerator = currentMembership?.role === "MODERATOR" && currentMembership?.status === "APPROVED";
	const canManage = isAdmin || isModerator;

	const pendingMembers = members.filter((m) => m.status === "PENDING");
	const approvedMembers = members.filter((m) => m.status === "APPROVED");

	const accentColor = association?.accentColor ?? "#00796B";
	const headerBg = `linear-gradient(135deg, ${accentColor}dd 0%, ${accentColor} 100%)`;

	// --- Actions ---
	const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file || !id) return;
		setUploadingImage(true);
		try {
			const formData = new FormData();
			formData.append("image", file);
			await api.put(`/api/associations/${id}/image`, formData, {
				headers: { "Content-Type": "multipart/form-data" },
			});
			await loadImage(id);
			showSnackbar("Immagine aggiornata", "success");
		} catch {
			showSnackbar("Errore durante il caricamento", "error");
		} finally {
			setUploadingImage(false);
			if (imageInputRef.current) imageInputRef.current.value = "";
		}
	};

	const handleSaveEdit = async () => {
		if (!id || !editName.trim()) return;
		setSaving(true);
		try {
			const res = await api.put<Association>(`/api/associations/${id}`, {
				name: editName.trim(),
				description: editDescription.trim() || null,
				accentColor: editColor,
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
				err?.response?.status === 409 ? "Impossibile rimuovere l'unico admin" : "Errore durante la rimozione",
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
				err?.response?.status === 409 ? "Impossibile modificare il ruolo" : "Errore durante la modifica",
				"error"
			);
		}
	};

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
				{/* Gradient header */}
				<Box
					sx={{
						background: headerBg,
						p: { xs: 3, md: 4 },
						borderRadius: "12px 12px 0 0",
					}}
				>
					<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
						{/* Avatar + title */}
						<Box sx={{ display: "flex", alignItems: "center", gap: 2.5 }}>
							<Badge
								overlap="circular"
								anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
								badgeContent={
									isAdmin ? (
										uploadingImage ? (
											<CircularProgress size={22} sx={{ color: "white", bgcolor: "rgba(0,0,0,0.3)", borderRadius: "50%", p: 0.4 }} />
										) : (
											<Tooltip title="Cambia immagine">
												<IconButton
													component="label"
													size="small"
													sx={{ bgcolor: "white", boxShadow: 2, width: 28, height: 28, "&:hover": { bgcolor: "grey.100" } }}
												>
													<input hidden accept="image/*" type="file" ref={imageInputRef} onChange={handleImageUpload} />
													<PhotoCameraIcon sx={{ fontSize: 14, color: accentColor }} />
												</IconButton>
											</Tooltip>
										)
									) : null
								}
							>
								{imageUrl ? (
									<Avatar
										src={imageUrl}
										sx={{ width: 64, height: 64, borderRadius: 2, boxShadow: "0 2px 8px rgba(0,0,0,0.25)" }}
									/>
								) : (
									<Box
										sx={{
											width: 64,
											height: 64,
											borderRadius: 2,
											bgcolor: "rgba(255,255,255,0.2)",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
										}}
									>
										<GroupsIcon sx={{ fontSize: 32, color: "white" }} />
									</Box>
								)}
							</Badge>

							<Box>
								<Typography variant="h5" fontWeight={700} color="white">
									{association.name}
								</Typography>
								<Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)", mt: 0.25 }}>
									Creata il {new Date(association.createdAt).toLocaleDateString("it-IT", { year: "numeric", month: "long", day: "numeric" })}
								</Typography>
							</Box>
						</Box>

						{/* Admin action buttons — white filled for visibility */}
						{isAdmin && !editMode && (
							<Stack direction="row" spacing={1} flexShrink={0}>
								<Button
									variant="contained"
									startIcon={<EditIcon />}
									size="small"
									onClick={() => {
										setEditName(association.name);
										setEditDescription(association.description ?? "");
										setEditColor(association.accentColor ?? null);
										setEditMode(true);
									}}
									sx={{
										textTransform: "none",
										fontWeight: 600,
										bgcolor: "rgba(255,255,255,0.95)",
										color: accentColor,
										boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
										"&:hover": { bgcolor: "white", boxShadow: "0 4px 12px rgba(0,0,0,0.25)" },
									}}
								>
									Modifica
								</Button>
								<Button
									variant="contained"
									startIcon={<DeleteOutlineIcon />}
									size="small"
									onClick={() => setDeleteDialogOpen(true)}
									sx={{
										textTransform: "none",
										fontWeight: 600,
										bgcolor: "rgba(255,255,255,0.15)",
										color: "white",
										border: "1px solid rgba(255,255,255,0.4)",
										boxShadow: "none",
										"&:hover": { bgcolor: "rgba(220,50,50,0.6)", border: "1px solid rgba(255,150,150,0.5)" },
									}}
								>
									Elimina
								</Button>
							</Stack>
						)}
					</Box>
				</Box>

				{/* Card body */}
				<CardContent sx={{ p: 3 }}>
					{editMode ? (
						<Stack spacing={2.5}>
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

							{/* Color picker */}
							<Box>
								<Typography variant="body2" fontWeight={600} mb={1} color="text.secondary">
									Colore di sfondo
								</Typography>
								<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
									{/* Reset option */}
									<Tooltip title="Predefinito (teal)">
										<Box
											onClick={() => setEditColor(null)}
											sx={{
												width: 32,
												height: 32,
												borderRadius: "50%",
												bgcolor: "#00796B",
												cursor: "pointer",
												border: editColor === null ? "3px solid" : "2px solid transparent",
												borderColor: editColor === null ? "text.primary" : "transparent",
												outline: editColor === null ? "2px solid rgba(0,0,0,0.15)" : "none",
												outlineOffset: "2px",
												transition: "transform 0.1s",
												"&:hover": { transform: "scale(1.15)" },
											}}
										/>
									</Tooltip>
									{COLOR_PALETTE.slice(1).map((color) => (
										<Tooltip key={color} title={color}>
											<Box
												onClick={() => setEditColor(color)}
												sx={{
													width: 32,
													height: 32,
													borderRadius: "50%",
													bgcolor: color,
													cursor: "pointer",
													border: editColor === color ? "3px solid" : "2px solid transparent",
													borderColor: editColor === color ? "text.primary" : "transparent",
													outline: editColor === color ? "2px solid rgba(0,0,0,0.15)" : "none",
													outlineOffset: "2px",
													transition: "transform 0.1s",
													"&:hover": { transform: "scale(1.15)" },
												}}
											/>
										</Tooltip>
									))}
								</Stack>
							</Box>

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

			{/* ── Pending requests ── */}
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
										<UserAvatar
											userId={m.userId}
											firstName={userNames[m.userId]?.firstName}
											lastName={userNames[m.userId]?.lastName}
											sx={{ bgcolor: "warning.light", color: "warning.dark", width: 36, height: 36, fontSize: "0.85rem", fontWeight: 700 }}
										/>
										<Box>
											<Typography variant="body2" fontWeight={600}>{getUserName(m.userId)}</Typography>
											<Typography variant="caption" color="text.secondary">
												Richiesta il {new Date(m.joinedAt).toLocaleDateString("it-IT")}
											</Typography>
										</Box>
									</Box>
									<Stack direction="row" spacing={1}>
										<Tooltip title="Approva">
											<IconButton size="small" color="success" onClick={() => handleApprove(m.userId)}>
												<CheckIcon fontSize="small" />
											</IconButton>
										</Tooltip>
										<Tooltip title="Rifiuta">
											<IconButton size="small" color="error" onClick={() => handleReject(m.userId)}>
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
										sx={{
											p: 2,
											borderRadius: 2,
											bgcolor: isSelf ? `${accentColor}08` : "background.default",
											border: isSelf ? `1px solid ${accentColor}30` : "none",
											display: "flex",
											alignItems: "center",
											justifyContent: "space-between",
											gap: 2,
										}}
									>
										<Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
											<UserAvatar
												userId={m.userId}
												firstName={userNames[m.userId]?.firstName}
												lastName={userNames[m.userId]?.lastName}
												sx={{ bgcolor: isSelf ? accentColor : "grey.400", width: 36, height: 36, fontSize: "0.85rem", fontWeight: 700 }}
											/>
											<Box sx={{ minWidth: 0 }}>
												<Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
													<Typography variant="body2" fontWeight={600} noWrap>
														{getUserName(m.userId)}
													</Typography>
													{isSelf && <Typography variant="caption" color="text.secondary">(tu)</Typography>}
												</Box>
												<Typography variant="caption" color="text.secondary">
													Iscritto dal {new Date(m.joinedAt).toLocaleDateString("it-IT")}
												</Typography>
											</Box>
										</Box>

										<Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexShrink: 0 }}>
											<Chip label={ROLE_LABELS[m.role]} color={ROLE_COLORS[m.role]} size="small" sx={{ fontWeight: 600 }} />

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
															<IconButton size="small" onClick={() => handleChangeRole(m.userId, "MEMBER")}>
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

			{/* ── Delete dialog ── */}
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
						. Questa operazione è irreversibile e rimuoverà tutti i membri e i dati associati.
					</Typography>
				</DialogContent>
				<DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
					<Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting} sx={{ textTransform: "none", borderRadius: 2 }}>
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
