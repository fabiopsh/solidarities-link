import { useState, useEffect } from "react";
import { useMap, MapContainer, TileLayer, Marker, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
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
	Autocomplete,
	Tooltip,
	IconButton,
	Badge,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import { useNavigate } from "react-router-dom";
import api from "../api";
import type { User } from "../types/models/User";
import type { VolunteerProfile, ServiceCategory } from "../types/models/VolunteerProfile";
import type { MyAssociation, AssociationRole } from "../types/models/Association";
import { useRole } from "../context/RoleContext";
import GroupsIcon from "@mui/icons-material/Groups";
import AssociationAvatar from "../components/AssociationAvatar";

const SERVICE_CATEGORIES: { value: ServiceCategory; label: string; emoji: string }[] = [
	{ value: "MOBILITY", label: "Mobilità e Trasporti", emoji: "🚗" },
	{ value: "PHYSICAL_SUPPORT", label: "Supporto Fisico", emoji: "💪" },
	{ value: "SOCIAL", label: "Compagnia e Socialità", emoji: "🤝" },
	{ value: "PET_SUPPORT", label: "Cura Animali", emoji: "🐾" },
	{ value: "DIGITAL", label: "Assistenza Digitale", emoji: "💻" },
];

const DefaultIcon = L.icon({
	iconUrl: icon,
	shadowUrl: iconShadow,
	iconSize: [25, 41],
	iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Helper to recenter map when address is searched or loaded
function LocationMarker({ position, setPosition, onDragEnd }: { position: [number, number]; setPosition: (p: L.LatLng) => void; onDragEnd?: (p: L.LatLng) => void }) {
	const map = useMap();
	useEffect(() => {
		map.flyTo(position, map.getZoom());
	}, [position, map]);

	return (
		<Marker
			position={position}
			draggable={true}
			eventHandlers={{
				dragend: (e) => {
					const marker = e.target;
					const newPos = marker.getLatLng();
					setPosition(newPos);
					if (onDragEnd) onDragEnd(newPos);
				},
			}}
		/>
	);
}

export default function ProfilePage() {
	const { role } = useRole();
	const navigate = useNavigate();
	const [user, setUser] = useState<User | null>(null);
	const [profile, setProfile] = useState<VolunteerProfile | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
	const [uploadingAvatar, setUploadingAvatar] = useState(false);
	const [myAssociations, setMyAssociations] = useState<MyAssociation[]>([]);
	const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
		open: false,
		message: "",
		severity: "success",
	});

	// Form state
	const [selectedCategories, setSelectedCategories] = useState<ServiceCategory[]>([]);
	const [constraints, setConstraints] = useState("");
	const [maxDistance, setMaxDistance] = useState(5000);
	const [targetAddress, setTargetAddress] = useState("");
	const [latitude, setLatitude] = useState<number>(45.4642); // Default Milan
	const [longitude, setLongitude] = useState<number>(9.1900);
	const [options, setOptions] = useState<any[]>([]);
	const [inputValue, setInputValue] = useState("");

	// Get current position if no location is set
	useEffect(() => {
		if (navigator.geolocation && !targetAddress) {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					setLatitude(position.coords.latitude);
					setLongitude(position.coords.longitude);
				},
				(error) => {
					console.error("Error getting default location:", error);
				}
			);
		}
	}, [targetAddress]);

	// Autocomplete search logic
	useEffect(() => {
		let active = true;

		if (inputValue === "") {
			setOptions([{ display_name: "La mia posizione", type: "my_location" }]);
			return undefined;
		}

		const fetchSuggestions = async () => {
			try {
				const response = await fetch(
					`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(inputValue)}&countrycodes=it&limit=5`
				);
				const data = await response.json();

				if (active) {
					setOptions([{ display_name: "La mia posizione", type: "my_location" }, ...(data || [])]);
				}
			} catch (error) {
				console.error("Error fetching suggestions:", error);
			}
		};

		const debounceTimer = setTimeout(() => {
			fetchSuggestions();
		}, 500);

		return () => {
			active = false;
			clearTimeout(debounceTimer);
		};
	}, [inputValue]);

	const handleReverseGeocode = async (lat: number, lon: number) => {
		try {
			const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
			const data = await res.json();
			if (data && data.display_name) {
				setTargetAddress(data.display_name);
			}
		} catch (error) {
			console.error("Error reverse geocoding:", error);
		}
	};

	const handleMyLocationSelect = () => {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					const lat = position.coords.latitude;
					const lon = position.coords.longitude;
					setLatitude(lat);
					setLongitude(lon);
					handleReverseGeocode(lat, lon);
				},
				(error) => {
					console.error("Error getting current location:", error);
				}
			);
		}
	};

	useEffect(() => {
		const controller = new AbortController();
		const signal = controller.signal;
		let avatarUrlToRevoke: string | null = null;

		const fetchAll = async () => {
			try {
				const [userRes, profileRes, assocRes, avatarRes] = await Promise.allSettled([
					api.get("/api/users/me", { signal }),
					role === "volunteer"
						? api.get("/api/volunteer-profiles/my", { signal })
						: Promise.resolve(null),
					api.get<MyAssociation[]>("/api/associations/my", { signal }),
					api.get("/api/users/me/profile-picture", { responseType: "blob", signal }),
				]);

				// StrictMode cleanup o navigazione avvenuta prima del completamento
				if (signal.aborted) return;

				if (userRes.status === "fulfilled") {
					setUser(userRes.value.data);
				}

				if (profileRes.status === "fulfilled" && profileRes.value?.data) {
					const myProfile: VolunteerProfile = profileRes.value.data;
					setProfile(myProfile);
					setSelectedCategories(myProfile.serviceCategories || []);
					try {
						setConstraints(myProfile.constraints ? JSON.parse(myProfile.constraints) : "");
					} catch {
						setConstraints(myProfile.constraints || "");
					}
					setMaxDistance(myProfile.maxTaskDistanceMeters || 5000);
					setTargetAddress(myProfile.targetLocation || "");
					if (myProfile.latitude && myProfile.longitude) {
						setLatitude(myProfile.latitude);
						setLongitude(myProfile.longitude);
					}
				}
				// profileRes "rejected" con 404 significa nessun profilo volontario ancora — normale

				if (assocRes.status === "fulfilled") {
					setMyAssociations(assocRes.value.data ?? []);
				}

				if (avatarRes.status === "fulfilled") {
					const res = avatarRes.value;
					if (res.status === 200 && res.data && res.data.size > 0) {
						avatarUrlToRevoke = URL.createObjectURL(res.data);
						setAvatarUrl(avatarUrlToRevoke);
					}
				}
			} catch (err: any) {
				if (err?.code === "ERR_CANCELED") return;
				console.error("Error fetching profile data:", err);
			} finally {
				if (!signal.aborted) setLoading(false);
			}
		};

		fetchAll();

		return () => {
			controller.abort();
			if (avatarUrlToRevoke) URL.revokeObjectURL(avatarUrlToRevoke);
		};
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
				targetLocation: targetAddress.trim() || undefined,
				latitude: latitude,
				longitude: longitude,
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

	const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		if (!e.target.files || e.target.files.length === 0) return;
		const file = e.target.files[0];

		const formData = new FormData();
		// Match the parameter name in the @RestForm annotation on the backend
		formData.append("image", file);

		setUploadingAvatar(true);
		try {
			await api.put("/api/users/me/profile-picture", formData, {
				headers: { "Content-Type": "multipart/form-data" }
			});
			// Re-fetch avatar
			const res = await api.get("/api/users/me/profile-picture", { responseType: "blob" });
			if (res.status === 200 && res.data && res.data.size > 0) {
				const newUrl = URL.createObjectURL(res.data);
				setAvatarUrl((prev) => {
					if (prev) URL.revokeObjectURL(prev);
					return newUrl;
				});
			}
			setSnackbar({ open: true, message: "Foto profilo aggiornata con successo!", severity: "success" });
		} catch (error) {
			console.error("Error uploading profile picture:", error);
			setSnackbar({ open: true, message: "Errore durante l'aggiornamento della foto profilo.", severity: "error" });
		} finally {
			setUploadingAvatar(false);
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

	const ASSOC_ROLE_LABELS: Record<AssociationRole, string> = {
		ADMIN: "Admin",
		MODERATOR: "Moderatore",
		MEMBER: "Membro",
	};
	const ASSOC_ROLE_COLORS: Record<AssociationRole, "success" | "primary" | "default"> = {
		ADMIN: "success",
		MODERATOR: "primary",
		MEMBER: "default",
	};

	return (
		<Box sx={{ maxWidth: 900, mx: "auto" }}>
			<Typography variant="h4" fontWeight={700} gutterBottom>
				Il tuo Profilo
			</Typography>
			<Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
				{role === "requester"
					? "Gestisci le tue informazioni personali."
					: "Gestisci le tue informazioni personali e le preferenze operative."}
			</Typography>

			<Grid container spacing={3} justifyContent={role === "requester" ? "center" : "flex-start"}>
				{/* User Info Card */}
				<Grid size={{ xs: 12, md: role === "requester" ? 8 : 5 }}>
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
							<Badge
								overlap="circular"
								anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
								badgeContent={
									uploadingAvatar ? (
										<CircularProgress size={24} sx={{ color: "white", bgcolor: "primary.dark", borderRadius: "50%", p: 0.5 }} />
									) : (
										<Tooltip title="Cambia foto profilo">
											<IconButton
												component="label"
												sx={{ bgcolor: "white", boxShadow: 2, "&:hover": { bgcolor: "grey.100" } }}
												size="small"
											>
												<input hidden accept="image/*" type="file" onChange={handleImageUpload} />
												<PhotoCameraIcon fontSize="small" color="primary" />
											</IconButton>
										</Tooltip>
									)
								}
								sx={{ mb: 2 }}
							>
								<Avatar
									src={avatarUrl || undefined}
									sx={{
										width: 80,
										height: 80,
										fontSize: "1.8rem",
										fontWeight: 700,
										bgcolor: "white",
										color: "primary.main",
										mx: "auto",
										boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
									}}
								>
									{userInitials}
								</Avatar>
							</Badge>
							<Typography variant="h5" fontWeight={700} color="white">
								{userName}
							</Typography>
							<Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)", mt: 0.5 }}>
								{user?.email}
							</Typography>
						</Box>
						<CardContent sx={{ p: 3 }}>
							<Stack spacing={2}>
								{role !== "requester" && (
									<>
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
									</>
								)}
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
								{role !== "requester" && (
									<>
										<Divider />
										<Box>
											<Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
												<GroupsIcon fontSize="small" color="primary" />
												<Typography variant="body2" fontWeight={600}>
													Associazioni
												</Typography>
											</Box>
											{myAssociations.length === 0 ? (
												<Typography variant="caption" color="text.secondary">
													Non sei ancora iscritto a nessuna associazione
												</Typography>
											) : (
												<Stack spacing={1}>
													{myAssociations.map(({ association, membership }) => (
														<Paper
															key={association.id}
															elevation={0}
															onClick={() => navigate(`/dashboard/associations/${association.id}`)}
															sx={{
																display: "flex",
																alignItems: "center",
																justifyContent: "space-between",
																gap: 1,
																p: 1,
																borderRadius: 2,
																bgcolor: "background.default",
																cursor: "pointer",
																"&:hover": { bgcolor: "action.hover" },
															}}
														>
															<Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
																<AssociationAvatar
																	associationId={association.id}
																	accentColor={association.accentColor ?? undefined}
																	size={28}
																/>
																<Typography variant="body2" fontWeight={500} noWrap>
																	{association.name}
																</Typography>
															</Box>
															<Stack direction="row" spacing={0.5} flexShrink={0}>
																<Chip
																	label={ASSOC_ROLE_LABELS[membership.role]}
																	color={ASSOC_ROLE_COLORS[membership.role]}
																	size="small"
																	sx={{ height: 20, fontSize: "0.7rem" }}
																/>
																{membership.status === "PENDING" && (
																	<Chip
																		label="In attesa"
																		color="warning"
																		variant="outlined"
																		size="small"
																		sx={{ height: 20, fontSize: "0.7rem" }}
																	/>
																)}
															</Stack>
														</Paper>
													))}
												</Stack>
											)}
										</Box>
									</>
								)}
							</Stack>
						</CardContent>
					</Card>
				</Grid>

				{/* Volunteer Profile Form */}
				{role === "volunteer" && (
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
									sx={{ mb: 4 }}
									variant="outlined"
									size="small"
								/>

								{/* Location Map */}
								<Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
									Centro di Intervento Operativo
								</Typography>
								<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
									Inserisci la città o l'indirizzo da cui partirai per le attività di volontariato.
								</Typography>
								<Box sx={{ display: "flex", gap: 2, mb: 2 }}>
									<Autocomplete
										fullWidth
										options={options}
										getOptionLabel={(option) => (typeof option === "string" ? option : option.display_name)}
										filterOptions={(x) => x}
										autoComplete
										includeInputInList
										filterSelectedOptions
										value={targetAddress}
										noOptionsText="Nessun luogo trovato"
										onChange={(_event, newValue: any) => {
											if (newValue) {
												if (newValue.type === "my_location") {
													handleMyLocationSelect();
												} else {
													setTargetAddress(newValue.display_name);
													const lat = parseFloat(newValue.lat);
													const lon = parseFloat(newValue.lon);
													if (!isNaN(lat) && !isNaN(lon)) {
														setLatitude(lat);
														setLongitude(lon);
													}
												}
											} else {
												setTargetAddress("");
											}
										}}
										onInputChange={(_event, newInputValue) => {
											setInputValue(newInputValue);
										}}
										renderInput={(params) => (
											<TextField
												{...params}
												label="Indirizzo / Luogo"
												placeholder="Es: Via Roma 1, Milano"
												variant="outlined"
												size="small"
												InputProps={{
													...params.InputProps,
													endAdornment: (
														<>
															{inputValue.length > 0 && options.length === 0 ? <CircularProgress color="inherit" size={20} /> : null}
															{params.InputProps.endAdornment}
														</>
													),
												}}
											/>
										)}
									/>
								</Box>
								<Box sx={{ height: 300, width: "100%", borderRadius: 2, overflow: "hidden", border: "1px solid", borderColor: "divider", position: "relative", zIndex: 0, mb: 4 }}>
									<MapContainer center={[latitude, longitude]} zoom={12} style={{ height: "100%", width: "100%" }}>
										<TileLayer
											attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
											url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
										/>
										<LocationMarker
											position={[latitude, longitude]}
											setPosition={(p) => { setLatitude(p.lat); setLongitude(p.lng); }}
											onDragEnd={(p) => handleReverseGeocode(p.lat, p.lng)}
										/>
										<Circle
											center={[latitude, longitude]}
											radius={maxDistance}
											pathOptions={{ fillColor: '#00796B', color: '#004D40', fillOpacity: 0.2 }}
										/>
									</MapContainer>
								</Box>

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
				)}
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
