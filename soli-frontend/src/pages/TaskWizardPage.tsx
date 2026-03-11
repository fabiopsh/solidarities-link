import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
	Box,
	Button,
	Card,
	CardContent,
	CircularProgress,
	FormControl,
	InputLabel,
	MenuItem,
	Select,
	Step,
	StepLabel,
	Stepper,
	TextField,
	Typography,
	Alert,
	useTheme,
	useMediaQuery,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
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

const steps = ["SoliAssistant (Opzionale)", "Dettagli Richiesta", "Posizione", "Conferma"];

function LocationMarker({ position, setPosition }: { position: [number, number]; setPosition: (p: L.LatLng) => void }) {
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
					setPosition(marker.getLatLng());
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
	const [targetAddress, setTargetAddress] = useState("");
	const [latitude, setLatitude] = useState<number>(45.4642);
	const [longitude, setLongitude] = useState<number>(9.1900);
	const [isSearchingAddress, setIsSearchingAddress] = useState(false);

	const handleNext = () => setActiveStep((prev) => prev + 1);
	const handleBack = () => setActiveStep((prev) => prev - 1);

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
				handleNext(); // Move strictly to next step when done
			}
		} catch (err: any) {
			console.error("Extraction error:", err);
			setError("Errore durante l'elaborazione dell'assistente.");
		} finally {
			setIsExtracting(false);
		}
	};

	const handleSearchAddress = async () => {
		if (!targetAddress.trim()) return;
		setIsSearchingAddress(true);
		try {
			const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(targetAddress)}`);
			const data = await res.json();
			if (data && data.length > 0) {
				const lat = parseFloat(data[0].lat);
				const lon = parseFloat(data[0].lon);
				if (!isNaN(lat) && !isNaN(lon)) {
					setLatitude(lat);
					setLongitude(lon);
				}
			}
		} catch (error) {
			console.error("Error fetching address:", error);
		} finally {
			setIsSearchingAddress(false);
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
						<Typography variant="body1" color="text.secondary">
							Raccontaci a parole tue di cosa hai bisogno. Il nostro assistente intelligente compilerà il modulo
							per te. Puoi anche saltare questo passaggio e compilare manualmente.
						</Typography>
						<TextField
							fullWidth
							multiline
							rows={4}
							variant="outlined"
							placeholder="Es: Ho bisogno di qualcuno che mi accompagni a fare la spesa questo giovedì mattina..."
							value={aiInput}
							onChange={(e) => setAiInput(e.target.value)}
							disabled={isExtracting}
							InputProps={{
								sx: { fontSize: "1.2rem", p: 2 }, // Larger text for accessibility
							}}
						/>
						<Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
							<Button size="large" onClick={handleNext} disabled={isExtracting}>
								Salta
							</Button>
							<Button
								variant="contained"
								size="large"
								startIcon={isExtracting ? <CircularProgress size={24} color="inherit" /> : <AutoAwesomeIcon />}
								onClick={handleExtractIntent}
								disabled={isExtracting || !aiInput.trim()}
								sx={{
									px: 4,
									py: 1.5,
									background: "linear-gradient(45deg, #00796B 30%, #48A999 90%)",
									color: "white",
									fontWeight: "bold",
									fontSize: "1.1rem",
								}}
							>
								{isExtracting ? "Analisi in corso..." : "Usa Assistente"}
							</Button>
						</Box>
					</Box>
				);
			case 1:
				return (
					<Box sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 2 }}>
						<TextField
							label="Titolo della Richiesta"
							fullWidth
							required
							variant="outlined"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							InputProps={{ sx: { fontSize: "1.1rem" } }}
						/>
						<FormControl fullWidth required>
							<InputLabel>Categoria</InputLabel>
							<Select
								value={category}
								label="Categoria"
								onChange={(e) => setCategory(e.target.value as ServiceCategory)}
								sx={{ fontSize: "1.1rem" }}
							>
								<MenuItem value="MOBILITY">Mobilità / Accompagnamento</MenuItem>
								<MenuItem value="PHYSICAL_SUPPORT">Supporto Fisico / Commissioni</MenuItem>
								<MenuItem value="SOCIAL">Socialità / Compagnia</MenuItem>
								<MenuItem value="PET_SUPPORT">Supporto Animali Domestici</MenuItem>
								<MenuItem value="DIGITAL">Inclusione Digitale / Aiuto Informatico</MenuItem>
							</Select>
						</FormControl>
						<FormControl fullWidth required>
							<InputLabel>Livello di Urgenza</InputLabel>
							<Select
								value={urgencyLevel}
								label="Livello di Urgenza"
								onChange={(e) => setUrgencyLevel(e.target.value as UrgencyLevel)}
								sx={{ fontSize: "1.1rem" }}
							>
								<MenuItem value="LOW">Bassa (Giorni successivi)</MenuItem>
								<MenuItem value="MEDIUM">Media (Entro domani)</MenuItem>
								<MenuItem value="HIGH">Alta (Oggi)</MenuItem>
								<MenuItem value="CRITICAL">Critica (Immediata)</MenuItem>
							</Select>
						</FormControl>
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
						<Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
							<Button size="large" onClick={handleBack}>
								Indietro
							</Button>
							<Button
								variant="contained"
								size="large"
								onClick={handleNext}
								disabled={!title || !category || !urgencyLevel}
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
						<Typography variant="body1" color="text.secondary">
							Cerca l'indirizzo o sposta il pin sulla mappa per indicare la posizione esatta in cui serve aiuto.
						</Typography>
						<Box sx={{ display: "flex", gap: 2 }}>
							<TextField
								label="Indirizzo / Luogo"
								placeholder="Es: Via Roma 1, Milano"
								fullWidth
								required
								variant="outlined"
								value={targetAddress}
								onChange={(e) => setTargetAddress(e.target.value)}
								InputProps={{ sx: { fontSize: "1.1rem" } }}
							/>
							<Button
								variant="outlined"
								onClick={handleSearchAddress}
								disabled={isSearchingAddress || !targetAddress.trim()}
								sx={{ minWidth: "120px", height: "56px" }}
							>
								{isSearchingAddress ? <CircularProgress size={24} /> : "Cerca"}
							</Button>
						</Box>
						<Box sx={{ height: 350, width: "100%", borderRadius: 2, overflow: "hidden", border: "1px solid", borderColor: "divider", position: "relative", zIndex: 0 }}>
							<MapContainer center={[latitude, longitude]} zoom={14} style={{ height: "100%", width: "100%" }}>
								<TileLayer
									attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
									url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
								/>
								<LocationMarker position={[latitude, longitude]} setPosition={(p) => { setLatitude(p.lat); setLongitude(p.lng); }} />
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
			case 3:
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
			<Typography variant="h4" fontWeight="bold" gutterBottom sx={{ mb: 4, color: "primary.dark" }}>
				Nuova Richiesta di Aiuto
			</Typography>

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
