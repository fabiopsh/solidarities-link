import { useState } from "react";
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

const steps = ["SoliAssistant (Opzionale)", "Dettagli Richiesta", "Conferma"];

export default function TaskWizardPage() {
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
	const navigate = useNavigate();

	const [activeStep, setActiveStep] = useState(0);
	const [aiInput, setAiInput] = useState("");
	const [isExtracting, setIsExtracting] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Form State
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [category, setCategory] = useState<ServiceCategory | "">("");
	const [urgencyLevel, setUrgencyLevel] = useState<UrgencyLevel | "">("MEDIUM");

	const handleNext = () => setActiveStep((prev) => prev + 1);
	const handleBack = () => setActiveStep((prev) => prev - 1);

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
				handleNext(); // Move strictly to next step when done
			}
		} catch (err: any) {
			console.error("Extraction error:", err);
			setError("Errore durante l'elaborazione dell'assistente.");
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
								disabled={isSubmitting}
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
