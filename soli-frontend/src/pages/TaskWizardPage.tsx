import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
	Box,
	Button,
	Card,
	CardContent,
	CircularProgress,
	Step,
	StepLabel,
	Stepper,
	TextField,
	Typography,
	Alert,
	useTheme,
	useMediaQuery,
	Autocomplete,
	Grid,
	Paper,
	Collapse,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import BackpackIcon from "@mui/icons-material/Backpack";
import GroupsIcon from "@mui/icons-material/Groups";
import PetsIcon from "@mui/icons-material/Pets";
import ComputerIcon from "@mui/icons-material/Computer";
import EventIcon from "@mui/icons-material/Event";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import WarningIcon from "@mui/icons-material/Warning";
import ReportIcon from "@mui/icons-material/Report";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { MobileDatePicker } from "@mui/x-date-pickers/MobileDatePicker";
import { MobileTimePicker } from "@mui/x-date-pickers/MobileTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import "dayjs/locale/it";
import api from "../api";
import type { ServiceCategory } from "../types/models/VolunteerProfile";
import type { UrgencyLevel } from "../types/models/Task";

import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
	iconUrl: icon,
	shadowUrl: iconShadow,
	iconSize: [25, 41],
	iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const steps = ["Dettagli Richiesta", "Posizione", "Conferma"];

const CATEGORIES: { value: ServiceCategory; label: string; icon: any; color: string }[] = [
	{ value: "MOBILITY", label: "Mobilità / Accompagnamento", icon: DirectionsCarIcon, color: "#2196f3" },
	{ value: "PHYSICAL_SUPPORT", label: "Supporto Fisico / Commissioni", icon: BackpackIcon, color: "#4caf50" },
	{ value: "SOCIAL", label: "Socialità / Compagnia", icon: GroupsIcon, color: "#9c27b0" },
	{ value: "PET_SUPPORT", label: "Supporto Animali Domestici", icon: PetsIcon, color: "#ff9800" },
	{ value: "DIGITAL", label: "Inclusione Digitale / Aiuto Informatico", icon: ComputerIcon, color: "#607d8b" },
];

const URGENCIES: { value: UrgencyLevel; label: string; sublabel: string; icon: any; color: string }[] = [
	{ value: "LOW", label: "Bassa", sublabel: "Giorni successivi", icon: EventIcon, color: "#8bc34a" },
	{ value: "MEDIUM", label: "Media", sublabel: "Entro domani", icon: AccessTimeIcon, color: "#ffc107" },
	{ value: "HIGH", label: "Alta", sublabel: "Oggi", icon: WarningIcon, color: "#ff5722" },
	{ value: "CRITICAL", label: "Critica", sublabel: "Immediata", icon: ReportIcon, color: "#f44336" },
];

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

export default function TaskWizardPage() {
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
	const navigate = useNavigate();

	const [activeStep, setActiveStep] = useState(0);
	const [aiInput, setAiInput] = useState("");
	const [isExtracting, setIsExtracting] = useState(false);
	const [showAiAssistant, setShowAiAssistant] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Daily limit state
	const [dailyCount, setDailyCount] = useState<number>(0);
	const [dailyLimit, setDailyLimit] = useState<number>(5);
	const [limitReached, setLimitReached] = useState(false);

	// Form State
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [category, setCategory] = useState<ServiceCategory | "">("");
	const [urgencyLevel, setUrgencyLevel] = useState<UrgencyLevel | "">("MEDIUM");
	const [scheduledDate, setScheduledDate] = useState<dayjs.Dayjs | null>(null);
	const [scheduledTime, setScheduledTime] = useState<dayjs.Dayjs | null>(null);
	const [datePickerOpen, setDatePickerOpen] = useState(false);
	const [timePickerOpen, setTimePickerOpen] = useState(false);
	const [targetAddress, setTargetAddress] = useState("");
	const [latitude, setLatitude] = useState<number>(45.4642);
	const [longitude, setLongitude] = useState<number>(9.1900);
	const [options, setOptions] = useState<any[]>([]);
	const [inputValue, setInputValue] = useState("");

	// Compute the resolved scheduledAt: date only → date at midnight; date+time → full datetime; time only → null (requires date)
	const resolvedScheduledAt = useMemo(() => {
		if (scheduledDate && scheduledTime) {
			return scheduledDate.hour(scheduledTime.hour()).minute(scheduledTime.minute()).second(0).millisecond(0);
		}
		if (scheduledDate && !scheduledTime) {
			// Only date set → send date at midnight
			return scheduledDate.hour(0).minute(0).second(0).millisecond(0);
		}
		// Time-only or nothing → not sent
		return null;
	}, [scheduledDate, scheduledTime]);

	// Warning: user set time but not date
	const scheduledAtDateMissing = !!(scheduledTime && !scheduledDate);

	const scheduledAtError = useMemo(() => {
		if (resolvedScheduledAt) {
			if (resolvedScheduledAt.isBefore(dayjs())) {
				return "L'orario non può essere nel passato";
			}
		}
		return null;
	}, [resolvedScheduledAt]);

	const scheduledAtWarning = useMemo(() => {
		if (resolvedScheduledAt && !scheduledAtError) {
			if (resolvedScheduledAt.isBefore(dayjs().add(30, "minute"))) {
				return "Si consiglia di programmare il task almeno 30 minuti nel futuro per dare tempo ai volontari di organizzarsi.";
			}
		}
		return null;
	}, [resolvedScheduledAt, scheduledAtError]);

	// Get current position on mount
	useEffect(() => {
		if (navigator.geolocation) {
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
	}, []);

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

	const handleNext = () => setActiveStep((prev) => prev + 1);
	const handleBack = () => {
		if (activeStep === 0) {
			navigate(-1);
		} else {
			setActiveStep((prev) => prev - 1);
		}
	};

	// Fetch daily task count on mount
	useEffect(() => {
		const fetchDailyCount = async () => {
			try {
				const res = await api.get("/api/tasks/daily-count");
				if (res.data) {
					setDailyCount(res.data.count);
					setDailyLimit(res.data.limit);
					setLimitReached(res.data.count >= res.data.limit);
				}
			} catch (err) {
				console.error("Error fetching daily count:", err);
			}
		};
		fetchDailyCount();
	}, []);

	const handleExtractIntent = async () => {
		if (!aiInput.trim()) return;

		setIsExtracting(true);
		setError(null);
		try {
			const res = await api.post("/api/assistant/extract", { text: aiInput });
			if (res.data) {
				setTitle(res.data.title || "");
				setDescription(res.data.description || "");
				setCategory(res.data.category || "");
				setTargetAddress(res.data.targetAddress || "");
				if (res.data.urgency) {
					setUrgencyLevel(res.data.urgency as UrgencyLevel);
				}
				if (res.data.extractedDateIso) {
					const pd = dayjs(res.data.extractedDateIso, "YYYY-MM-DD");
					if (pd.isValid()) {
						setScheduledDate(pd);
					} else {
						setScheduledDate(null);
					}
				} else {
					setScheduledDate(null);
				}
				if (res.data.extractedTimeIso) {
					const pt = dayjs(`1970-01-01T${res.data.extractedTimeIso}`);
					if (pt.isValid()) {
						setScheduledTime(pt);
					} else {
						setScheduledTime(null);
					}
				} else {
					setScheduledTime(null);
				}
				setShowAiAssistant(false);
			}
		} catch (err: any) {
			console.error("Extraction error:", err);
			const serverMessage = err?.response?.data?.error;
			setError(serverMessage || "Errore durante l'elaborazione dell'assistente.");
		} finally {
			setIsExtracting(false);
		}
	};


	const handleSubmit = async () => {
		setIsSubmitting(true);
		setError(null);
		try {
			await api.post("/api/tasks", {
				title,
				description,
				category,
				urgencyLevel,
				scheduledAt: resolvedScheduledAt
					? resolvedScheduledAt.format("YYYY-MM-DDTHH:mm:ss")
					: null,
				hasScheduledTime: !!(scheduledTime && scheduledDate),
				targetAddress,
				latitude,
				longitude,
				beneficiaryId: null, // Backend will default to creatorId if null
			});
			// On success, redirect to requests
			navigate("/dashboard/requests");
		} catch (err: any) {
			console.error("Submission error:", err);
			setError("Errore durante la creazione della richiesta.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const renderStepContent = (step: number) => {
		switch (step) {
			case 0:
				return (
					<Box sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 2 }}>
						<Button
							variant="outlined"
							startIcon={<AutoAwesomeIcon />}
							onClick={() => setShowAiAssistant((prev) => !prev)}
							sx={{ alignSelf: "flex-start", fontWeight: "bold", borderWidth: "2px", "&:hover": { borderWidth: "2px" } }}
							color="primary"
						>
							{showAiAssistant ? "Chiudi Assistente IA" : "Usa Assistente IA (Compila automaticamente i campi)"}
						</Button>

						<Collapse in={showAiAssistant}>
							<Box sx={{ display: "flex", flexDirection: "column", gap: 2, bgcolor: "rgba(0, 121, 107, 0.04)", p: 2, borderRadius: 1, border: "1px solid", borderColor: "rgba(0, 121, 107, 0.2)" }}>
								<Typography variant="body2" color="primary.dark">
									Raccontaci a parole tue di cosa hai bisogno. Il nostro assistente compilerà il modulo per te.
								</Typography>
								<TextField
									fullWidth
									multiline
									rows={3}
									variant="outlined"
									placeholder="Es: Ho bisogno di qualcuno che mi accompagni a fare la spesa giovedì alle 10:00 del mattino..."
									value={aiInput}
									onChange={(e) => setAiInput(e.target.value)}
									disabled={isExtracting}
									InputProps={{
										sx: { fontSize: "1.1rem", bgcolor: "background.paper" },
									}}
								/>
								<Button
									variant="contained"
									onClick={handleExtractIntent}
									disabled={isExtracting || !aiInput.trim()}
									startIcon={isExtracting ? <CircularProgress size={20} color="inherit" /> : <AutoAwesomeIcon />}
									sx={{
										alignSelf: "flex-end",
										background: "linear-gradient(45deg, #00796B 0%, #48A999 100%)",
										color: "white",
										fontWeight: "bold"
									}}
								>
									{isExtracting ? "Analisi..." : "Compila i campi"}
								</Button>
							</Box>
						</Collapse>

						<TextField
							label="Titolo della Richiesta"
							fullWidth
							required
							variant="outlined"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							InputProps={{ sx: { fontSize: "1.1rem" } }}
						/>
						<Box>
							<Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
								Categoria *
							</Typography>
							<Grid container spacing={2}>
								{CATEGORIES.map((cat) => {
									const Icon = cat.icon;
									const isSelected = category === cat.value;
									return (
										<Grid size={{ xs: 6, sm: 4 }} key={cat.value}>
											<Paper
												elevation={isSelected ? 4 : 1}
												onClick={() => setCategory(cat.value)}
												sx={{
													p: 2,
													display: "flex",
													flexDirection: "column",
													alignItems: "center",
													justifyContent: "center",
													textAlign: "center",
													cursor: "pointer",
													borderRadius: 3,
													border: "2px solid",
													borderColor: isSelected ? cat.color : "transparent",
													bgcolor: isSelected ? `${cat.color}08` : "background.paper",
													transition: "all 0.2s ease-in-out",
													"&:hover": {
														transform: "translateY(-4px)",
														boxShadow: 3,
														borderColor: isSelected ? cat.color : "divider",
													},
													minHeight: 120,
												}}
											>
												<Icon sx={{ fontSize: 40, color: isSelected ? cat.color : "text.secondary", mb: 1 }} />
												<Typography variant="body2" fontWeight={isSelected ? "bold" : "normal"} color={isSelected ? "text.primary" : "text.secondary"}>
													{cat.label}
												</Typography>
											</Paper>
										</Grid>
									);
								})}
							</Grid>
						</Box>

						<Box>
							<Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
								Livello di Urgenza *
							</Typography>
							<Grid container spacing={2}>
								{URGENCIES.map((urg) => {
									const Icon = urg.icon;
									const isSelected = urgencyLevel === urg.value;
									return (
										<Grid size={{ xs: 6, sm: 3 }} key={urg.value}>
											<Paper
												elevation={isSelected ? 4 : 1}
												onClick={() => setUrgencyLevel(urg.value)}
												sx={{
													p: 2,
													display: "flex",
													flexDirection: "column",
													alignItems: "center",
													justifyContent: "center",
													textAlign: "center",
													cursor: "pointer",
													borderRadius: 3,
													border: "2px solid",
													borderColor: isSelected ? urg.color : "transparent",
													bgcolor: isSelected ? `${urg.color}08` : "background.paper",
													transition: "all 0.2s ease-in-out",
													"&:hover": {
														transform: "translateY(-4px)",
														boxShadow: 3,
														borderColor: isSelected ? urg.color : "divider",
													},
													minHeight: 110,
												}}
											>
												<Icon sx={{ fontSize: 32, color: isSelected ? urg.color : "text.secondary", mb: 1 }} />
												<Typography variant="body2" fontWeight={isSelected ? "bold" : "normal"} color={isSelected ? "text.primary" : "text.secondary"}>
													{urg.label}
												</Typography>
												<Typography variant="caption" color="text.secondary">
													{urg.sublabel}
												</Typography>
											</Paper>
										</Grid>
									);
								})}
							</Grid>
						</Box>
						<TextField
							label="Descrizione Dettagliata"
							fullWidth
							multiline
							rows={3}
							variant="outlined"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							InputProps={{ sx: { fontSize: "1.1rem" } }}
						/>

						{/* ── Date and Time picker ── */}
						<Box>
							<Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
								Quando hai bisogno di aiuto? (Opzionale)
							</Typography>
							<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
								Inserire data e ora indicativa. Si consiglia almeno 30 minuti nel futuro.
							</Typography>
							<LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
								<Grid container spacing={2}>
									<Grid size={{ xs: 12, sm: 6 }}>
										<Box sx={{ position: "relative" }}>
											<MobileDatePicker
												label="Data"
												value={scheduledDate}
												onChange={(value) => setScheduledDate(value)}
												format="DD/MM/YYYY"
												disablePast
												open={datePickerOpen}
												onOpen={() => setDatePickerOpen(true)}
												onClose={() => setDatePickerOpen(false)}
												slotProps={{
													textField: {
														fullWidth: true,
														required: false,
														variant: "outlined",
														InputProps: { sx: { fontSize: "1.1rem", pointerEvents: "none" } },
													},
												}}
											/>
											<Box
												sx={{ position: "absolute", inset: 0, cursor: "pointer", zIndex: 1 }}
												onClick={() => setDatePickerOpen(true)}
											/>
										</Box>
									</Grid>
									<Grid size={{ xs: 12, sm: 6 }}>
										<Box sx={{ position: "relative" }}>
											<MobileTimePicker
												label="Orario"
												value={scheduledTime}
												onChange={(value) => setScheduledTime(value)}
												ampm={false}
												open={timePickerOpen}
												onOpen={() => setTimePickerOpen(true)}
												onClose={() => setTimePickerOpen(false)}
												slotProps={{
													textField: {
														fullWidth: true,
														required: false,
														variant: "outlined",
														error: !!scheduledAtError,
														InputProps: { sx: { fontSize: "1.1rem", pointerEvents: "none" } },
													},
													dialog: {
														PaperProps: {
															sx: { borderRadius: 4 },
														},
													},
												}}
											/>
											<Box
												sx={{ position: "absolute", inset: 0, cursor: "pointer", zIndex: 1 }}
												onClick={() => setTimePickerOpen(true)}
											/>
										</Box>
									</Grid>
								</Grid>
								{scheduledAtDateMissing && (
									<Typography color="error" variant="caption" sx={{ mt: 1, display: "block" }}>
										⚠️ Hai inserito un orario, per favore seleziona anche una data.
									</Typography>
								)}
								{scheduledAtError && !scheduledAtDateMissing && (
									<Typography color="error" variant="caption" sx={{ mt: 1, display: "block" }}>
										{scheduledAtError}
									</Typography>
								)}
								{scheduledAtWarning && !scheduledAtError && !scheduledAtDateMissing && (
									<Typography color="warning.main" variant="caption" sx={{ mt: 1, display: "block" }}>
										⚠️ {scheduledAtWarning}
									</Typography>
								)}
							</LocalizationProvider>
						</Box>

						<Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
							<Button size="large" onClick={handleBack}>
								Indietro
							</Button>
							<Button
								variant="contained"
								size="large"
								onClick={handleNext}
								disabled={!title || !category || !urgencyLevel || !!scheduledAtError || scheduledAtDateMissing}
								sx={{ px: 4, py: 1.5, fontSize: "1.1rem" }}
							>
								Avanti
							</Button>
						</Box>
					</Box>
				);
			case 1:
				return (
					<Box sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 2 }}>
						<Typography variant="body1" color="text.secondary">
							Cerca l'indirizzo o sposta il pin sulla mappa per indicare la posizione esatta in cui serve aiuto.
						</Typography>
						<Box sx={{ display: "flex", gap: 2 }}>
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
										required
										variant="outlined"
										InputProps={{
											...params.InputProps,
											sx: { fontSize: "1.1rem" },
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
						<Box sx={{ height: 350, width: "100%", borderRadius: 2, overflow: "hidden", border: "1px solid", borderColor: "divider", position: "relative", zIndex: 0 }}>
							<MapContainer center={[latitude, longitude]} zoom={14} style={{ height: "100%", width: "100%" }}>
								<TileLayer
									attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
									url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
								/>
								<LocationMarker
									position={[latitude, longitude]}
									setPosition={(p) => { setLatitude(p.lat); setLongitude(p.lng); }}
									onDragEnd={(p) => handleReverseGeocode(p.lat, p.lng)}
								/>
							</MapContainer>
						</Box>
						<Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
							<Button size="large" onClick={handleBack}>
								Indietro
							</Button>
							<Button
								variant="contained"
								size="large"
								onClick={handleNext}
								disabled={!targetAddress}
								sx={{ px: 4, py: 1.5, fontSize: "1.1rem" }}
							>
								Avanti
							</Button>
						</Box>
					</Box>
				);
			case 2:
				return (
					<Box sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 2 }}>
						<Typography variant="h6" gutterBottom>
							Riepilogo Richiesta
						</Typography>
						<Box
							sx={{
								bgcolor: "background.paper",
								p: 3,
								borderRadius: 2,
								border: "1px solid",
								borderColor: "divider",
							}}
						>
							<Typography variant="subtitle1" color="text.secondary">
								Titolo
							</Typography>
							<Typography variant="h6" gutterBottom>
								{title}
							</Typography>

							<Typography variant="subtitle1" color="text.secondary" sx={{ mt: 2 }}>
								Categoria
							</Typography>
							<Typography variant="body1" gutterBottom>
								{category}
							</Typography>

							<Typography variant="subtitle1" color="text.secondary" sx={{ mt: 2 }}>
								Urgenza
							</Typography>
							<Typography variant="body1" gutterBottom>
								{urgencyLevel}
							</Typography>

							<Typography variant="subtitle1" color="text.secondary" sx={{ mt: 2 }}>
								Indirizzo / Luogo
							</Typography>
							<Typography variant="body1" gutterBottom>
								{targetAddress}
							</Typography>

							<Typography variant="subtitle1" color="text.secondary" sx={{ mt: 2 }}>
								Descrizione
							</Typography>
							<Typography variant="body1">{description || "Nessuna descrizione aggiuntiva"}</Typography>

							{resolvedScheduledAt && (
								<>
									<Typography variant="subtitle1" color="text.secondary" sx={{ mt: 2 }}>
										Quando
									</Typography>
									<Typography variant="body1" gutterBottom>
										{resolvedScheduledAt.locale("it").format(scheduledTime ? "dddd D MMMM YYYY, HH:mm" : "dddd D MMMM YYYY")}
									</Typography>
								</>
							)}
						</Box>
						<Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
							<Button size="large" onClick={handleBack} disabled={isSubmitting}>
								Modifica
							</Button>
							<Button
								variant="contained"
								color="primary"
								size="large"
								onClick={handleSubmit}
								disabled={isSubmitting || limitReached}
								startIcon={isSubmitting && <CircularProgress size={20} color="inherit" />}
								sx={{ px: 4, py: 1.5, fontSize: "1.1rem", fontWeight: "bold" }}
							>
								{isSubmitting ? "Invio in corso..." : "Pubblica Richiesta"}
							</Button>
						</Box>
					</Box>
				);
			default:
				return null;
		}
	};

	return (
		<Box sx={{ maxWidth: 800, mx: "auto", width: "100%" }}>
			<Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
				<Typography variant="h4" fontWeight="bold" sx={{ color: "primary.dark" }}>
					Nuova Richiesta di Aiuto
				</Typography>
				<Button
					startIcon={<ArrowBackIcon />}
					onClick={() => navigate(-1)}
					sx={{ color: "text.secondary", fontWeight: 500 }}
				>
					Annulla
				</Button>
			</Box>

			{error && (
				<Alert severity="error" sx={{ mb: 3 }}>
					{error}
				</Alert>
			)}

			{limitReached ? (
				<Alert severity="error" sx={{ mb: 3 }}>
					Hai raggiunto il limite massimo di {dailyLimit} richieste giornaliere. Riprova domani.
				</Alert>
			) : (
				<Alert severity="info" sx={{ mb: 3 }}>
					Richieste utilizzate oggi: {dailyCount}/{dailyLimit}
				</Alert>
			)}

			<Card sx={{ p: isMobile ? 2 : 4, borderRadius: 3, boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
				<Stepper
					activeStep={activeStep}
					alternativeLabel={!isMobile}
					orientation={isMobile ? "vertical" : "horizontal"}
					sx={{ mb: 4 }}
				>
					{steps.map((label) => (
						<Step key={label}>
							<StepLabel>{label}</StepLabel>
						</Step>
					))}
				</Stepper>

				<CardContent sx={{ p: 0 }}>{renderStepContent(activeStep)}</CardContent>
			</Card>
		</Box>
	);
}
