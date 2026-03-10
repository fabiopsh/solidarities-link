import { useState, useEffect } from "react";
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
	FormGroup,
	FormControlLabel,
	Checkbox,
	TextField,
	Slider,
	Snackbar,
	Alert,
	Avatar,
	Stack,
	Paper,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import api from "../api";
import type { User } from "../types/models/User";
import type { VolunteerProfile, ServiceCategory } from "../types/models/VolunteerProfile";

const SERVICE_CATEGORIES: { value: ServiceCategory; label: string; emoji: string }[] = [
	{ value: "MOBILITY", label: "Mobilità e Trasporti", emoji: "🚗" },
	{ value: "PHYSICAL_SUPPORT", label: "Supporto Fisico", emoji: "💪" },
	{ value: "SOCIAL", label: "Compagnia e Socialità", emoji: "🤝" },
	{ value: "PET_SUPPORT", label: "Cura Animali", emoji: "🐾" },
	{ value: "DIGITAL", label: "Assistenza Digitale", emoji: "💻" },
];

export default function ProfilePage() {
	const [user, setUser] = useState<User | null>(null);
	const [profile, setProfile] = useState<VolunteerProfile | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
		open: false,
		message: "",
		severity: "success",
	});

	// Form state
	const [selectedCategories, setSelectedCategories] = useState<ServiceCategory[]>([]);
	const [constraints, setConstraints] = useState("");
	const [maxDistance, setMaxDistance] = useState(5000);

	useEffect(() => {
		const fetchData = async () => {
			try {
				const userRes = await api.get("/api/users/me");
				setUser(userRes.data);

				// Try to find volunteer profile
				try {
					const myProfileRes = await api.get("/api/volunteer-profiles/my");
					const myProfile: VolunteerProfile = myProfileRes.data;
					if (myProfile) {
						setProfile(myProfile);
						setSelectedCategories(myProfile.serviceCategories || []);
						try {
							setConstraints(myProfile.constraints ? JSON.parse(myProfile.constraints) : "");
						} catch {
							setConstraints(myProfile.constraints || "");
						}
						setMaxDistance(myProfile.maxTaskDistanceMeters || 5000);
					}
				} catch (err: any) {
					// 404 No profile yet, that's fine
				}
			} catch (err) {
				console.error("Error fetching user data:", err);
			} finally {
				setLoading(false);
			}
		};
		fetchData();
	}, []);

	const handleCategoryToggle = (cat: ServiceCategory) => {
		setSelectedCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
	};

	const handleSave = async () => {
		if (!user) return;
		setSaving(true);
		try {
			const payload = {
				userId: user.id,
				serviceCategories: selectedCategories,
				constraints: constraints.trim() ? JSON.stringify(constraints.trim()) : null,
				maxTaskDistanceMeters: maxDistance,
			};

			if (profile) {
				await api.put(`/api/volunteer-profiles/${profile.id}`, payload);
			} else {
				const res = await api.post("/api/volunteer-profiles", payload);
				setProfile(res.data);
			}
			setSnackbar({ open: true, message: "Profilo salvato con successo!", severity: "success" });
		} catch (err) {
			console.error("Error saving profile:", err);
			setSnackbar({ open: true, message: "Errore nel salvataggio del profilo.", severity: "error" });
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
				<CircularProgress />
			</Box>
		);
	}

	const userName = user ? `${user.firstName} ${user.lastName}` : "Utente";
	const userInitials = user
		? `${user.firstName?.charAt(0) || ""}${user.lastName?.charAt(0) || ""}`.toUpperCase()
		: "U";

	const getRoleLabel = (role: string) => {
		switch (role) {
			case "REQUESTER":
				return "Richiedente";
			case "VOLUNTEER":
				return "Volontario";
			case "CAREGIVER":
				return "Caregiver";
			case "ADMIN":
				return "Amministratore";
			default:
				return role;
		}
	};

	const getCertLabel = (cert?: string) => {
		switch (cert) {
			case "LV1_SPID":
				return "Livello 1 — SPID";
			case "LV2_TRAINED":
				return "Livello 2 — Formazione";
			case "LV3_PARTNER":
				return "Livello 3 — Partner";
			default:
				return "Non certificato";
		}
	};

	return (
		<Box sx={{ maxWidth: 900, mx: "auto" }}>
			<Typography variant="h4" fontWeight={700} gutterBottom>
				Il tuo Profilo
			</Typography>
			<Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
				Gestisci le tue informazioni personali e le preferenze operative.
			</Typography>

			<Grid container spacing={3}>
				{/* User Info Card */}
				<Grid size={{ xs: 12, md: 5 }}>
					<Card sx={{ borderRadius: 3, boxShadow: "0 4px 20px rgba(0,0,0,0.05)", overflow: "visible" }}>
						<Box
							sx={{
								background: "linear-gradient(135deg, #00796B 0%, #48A999 100%)",
								p: 4,
								pb: 6,
								borderRadius: "16px 16px 0 0",
								textAlign: "center",
								position: "relative",
							}}
						>
							<Avatar
								sx={{
									width: 80,
									height: 80,
									fontSize: "1.8rem",
									fontWeight: 700,
									bgcolor: "white",
									color: "primary.main",
									mx: "auto",
									mb: 2,
									boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
								}}
							>
								{userInitials}
							</Avatar>
							<Typography variant="h5" fontWeight={700} color="white">
								{userName}
							</Typography>
							<Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)", mt: 0.5 }}>
								{user?.email}
							</Typography>
						</Box>
						<CardContent sx={{ p: 3 }}>
							<Stack spacing={2}>
								<Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
									<Typography variant="body2" color="text.secondary">
										Ruolo
									</Typography>
									<Chip
										label={getRoleLabel(user?.role || "")}
										color="primary"
										size="small"
										sx={{ fontWeight: 600 }}
									/>
								</Box>
								<Divider />
								<Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
									<Typography variant="body2" color="text.secondary">
										Certificazione
									</Typography>
									<Chip
										icon={<VerifiedUserIcon />}
										label={getCertLabel(user?.certificationLevel)}
										size="small"
										variant="outlined"
										sx={{ fontWeight: 500 }}
									/>
								</Box>
								<Divider />
								<Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
									<Typography variant="body2" color="text.secondary">
										Stato
									</Typography>
									<Chip
										label={user?.status === "ACTIVE" ? "Attivo" : "Sospeso"}
										color={user?.status === "ACTIVE" ? "success" : "error"}
										size="small"
										sx={{ fontWeight: 600 }}
									/>
								</Box>
								<Divider />
								<Typography variant="caption" color="text.secondary">
									Membro dal{" "}
									{user
										? new Date(user.createdAt).toLocaleDateString("it-IT", {
											year: "numeric",
											month: "long",
											day: "numeric",
										})
										: "—"}
								</Typography>
							</Stack>
						</CardContent>
					</Card>
				</Grid>

				{/* Volunteer Profile Form */}
				<Grid size={{ xs: 12, md: 7 }}>
					<Card sx={{ borderRadius: 3, boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
						<CardContent sx={{ p: 4 }}>
							<Typography variant="h6" fontWeight={700} gutterBottom>
								⚙️ Preferenze Volontario
							</Typography>
							<Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
								Configura i tuoi ambiti di intervento e le tue disponibilità.
							</Typography>

							{/* Service Categories */}
							<Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
								Ambiti di Intervento
							</Typography>
							<Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
								<FormGroup>
									{SERVICE_CATEGORIES.map((cat) => (
										<FormControlLabel
											key={cat.value}
											control={
												<Checkbox
													checked={selectedCategories.includes(cat.value)}
													onChange={() => handleCategoryToggle(cat.value)}
													color="primary"
												/>
											}
											label={
												<Typography variant="body2">
													{cat.emoji} {cat.label}
												</Typography>
											}
										/>
									))}
								</FormGroup>
							</Paper>

							{/* Constraints */}
							<Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
								Vincoli e Limitazioni
							</Typography>
							<TextField
								fullWidth
								multiline
								rows={3}
								placeholder="Es: allergie, limitazioni fisiche, disponibilità solo in orari specifici..."
								value={constraints}
								onChange={(e) => setConstraints(e.target.value)}
								sx={{ mb: 3 }}
								variant="outlined"
								size="small"
							/>

							{/* Max Distance */}
							<Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
								Distanza Massima di Intervento
							</Typography>
							<Box sx={{ px: 1, mb: 3 }}>
								<Slider
									value={maxDistance}
									onChange={(_, val) => setMaxDistance(val as number)}
									min={500}
									max={20000}
									step={500}
									valueLabelDisplay="auto"
									valueLabelFormat={(v) => `${(v / 1000).toFixed(1)} km`}
									marks={[
										{ value: 500, label: "0.5 km" },
										{ value: 10000, label: "10 km" },
										{ value: 20000, label: "20 km" },
									]}
									sx={{ color: "primary.main" }}
								/>
								<Typography variant="caption" color="text.secondary">
									Raggio attuale: <strong>{(maxDistance / 1000).toFixed(1)} km</strong>
								</Typography>
							</Box>

							<Button
								variant="contained"
								startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
								onClick={handleSave}
								disabled={saving}
								fullWidth
								size="large"
								sx={{
									fontWeight: "bold",
									borderRadius: 2,
									py: 1.5,
									boxShadow: "0 4px 12px rgba(0, 121, 107, 0.3)",
								}}
							>
								{saving ? "Salvataggio..." : "Salva Preferenze"}
							</Button>
						</CardContent>
					</Card>
				</Grid>
			</Grid>

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
