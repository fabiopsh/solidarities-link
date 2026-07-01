import { useState } from "react";
import {
	Box,
	Typography,
	Card,
	CardContent,
	Chip,
	TextField,
	Button,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	Paper,
	TableContainer,
	Link as MuiLink,
	CircularProgress,
	Divider,
} from "@mui/material";

// Base URL of the backend (Open Data API). External consumers call it directly.
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:8080";

const ENDPOINTS: { method: string; path: string; desc: string }[] = [
	{ method: "GET", path: "/api/open/v1/meta", desc: "Metadati dataset, licenza, città coperte" },
	{ method: "GET", path: "/api/open/v1/categories", desc: "Categorie e moltiplicatori crediti" },
	{ method: "GET", path: "/api/open/v1/stats/overview", desc: "Panoramica generale del sistema" },
	{ method: "GET", path: "/api/open/v1/stats/tasks/by-category", desc: "Task per categoria di servizio" },
	{ method: "GET", path: "/api/open/v1/stats/tasks/by-urgency", desc: "Task per livello di criticità" },
	{ method: "GET", path: "/api/open/v1/stats/tasks/by-status", desc: "Task per stato" },
	{ method: "GET", path: "/api/open/v1/stats/tasks/timeseries?granularity=week", desc: "Serie temporale creati/completati" },
	{ method: "GET", path: "/api/open/v1/stats/geo/by-city", desc: "Distribuzione task per città" },
	{ method: "GET", path: "/api/open/v1/stats/geo/grid?precision=2", desc: "Heatmap aggregata (k-anonymity)" },
	{ method: "GET", path: "/api/open/v1/stats/credits", desc: "Statistiche crediti (economia circolare)" },
	{ method: "GET", path: "/api/open/v1/stats/credits/timeseries", desc: "Serie temporale crediti" },
	{ method: "GET", path: "/api/open/v1/stats/volunteering", desc: "Partecipazione dei volontari" },
	{ method: "GET", path: "/api/open/v1/stats/impact", desc: "Impatto sociale (ore, beneficiari, donazioni)" },
	{ method: "GET", path: "/api/open/v1/stats/charities", desc: "Enti benefici e statistiche riscatti" },
	{ method: "GET", path: "/api/open/v1/stats/cities", desc: "Confronto KPI tra città (ranking)" },
	{ method: "GET", path: "/api/open/v1/city/Pisa", desc: "Report analitico completo di una città" },
	{ method: "GET", path: "/api/open/v1/stats/demand-supply", desc: "Domanda (task aperti) vs offerta (volontari) per categoria" },
	{ method: "GET", path: "/api/open/v1/stats/funnel", desc: "Imbuto del ciclo di vita dei task" },
	{ method: "GET", path: "/api/open/v1/stats/tasks/by-weekday", desc: "Distribuzione task per giorno della settimana" },
	{ method: "GET", path: "/api/open/v1/stats/tasks/by-hour", desc: "Distribuzione task per ora del giorno" },
];

export default function DevelopersPortalPage() {
	const [apiKey, setApiKey] = useState("");
	const [endpoint, setEndpoint] = useState(ENDPOINTS[2].path);
	const [result, setResult] = useState<string>("");
	const [loading, setLoading] = useState(false);
	const [status, setStatus] = useState<number | null>(null);

	const run = async () => {
		setLoading(true);
		setResult("");
		setStatus(null);
		try {
			const res = await fetch(`${API_BASE}${endpoint}`, {
				headers: apiKey ? { "X-API-Key": apiKey } : {},
			});
			setStatus(res.status);
			const text = await res.text();
			try {
				setResult(JSON.stringify(JSON.parse(text), null, 2));
			} catch {
				setResult(text);
			}
		} catch (e: any) {
			setResult(String(e));
		} finally {
			setLoading(false);
		}
	};

	return (
		<Box sx={{ maxWidth: 1000, mx: "auto", p: { xs: 2, md: 4 } }}>
			<Typography variant="h3" fontWeight={900} sx={{ color: "primary.dark", mb: 1 }}>
				SOLI Open Data API
			</Typography>
			<Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
				API pubbliche di sola lettura con dati aggregati sul volontariato civico, pensate per il
				contesto smart-city. Nessun dato personale è esposto. Licenza <strong>CC-BY 4.0</strong>.
			</Typography>

			<Card sx={{ borderRadius: 3, mb: 3 }}>
				<CardContent>
					<Typography variant="h6" fontWeight={700} gutterBottom>Autenticazione</Typography>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
						Ogni richiesta richiede un token API (richiedilo all'amministratore) nell'header:
					</Typography>
					<Box component="pre" sx={{ p: 2, bgcolor: "action.hover", borderRadius: 2, overflowX: "auto", fontSize: "0.85rem" }}>
{`curl -H "X-API-Key: soli_xxxxxxxxxxxxxxxx" \\
  ${API_BASE}/api/open/v1/stats/overview`}
					</Box>
					<Typography variant="body2" sx={{ mt: 1 }}>
						Documentazione interattiva (OpenAPI/Swagger):{" "}
						<MuiLink href={`${API_BASE}/q/swagger-ui`} target="_blank" rel="noreferrer">{API_BASE}/q/swagger-ui</MuiLink>
					</Typography>
				</CardContent>
			</Card>

			<Card sx={{ borderRadius: 3, mb: 3 }}>
				<CardContent>
					<Typography variant="h6" fontWeight={700} gutterBottom>Endpoint disponibili</Typography>
					<TableContainer component={Paper} elevation={0}>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell sx={{ fontWeight: "bold" }}>Metodo</TableCell>
									<TableCell sx={{ fontWeight: "bold" }}>Path</TableCell>
									<TableCell sx={{ fontWeight: "bold" }}>Descrizione</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{ENDPOINTS.map((e) => (
									<TableRow key={e.path} hover>
										<TableCell><Chip label={e.method} size="small" color="success" /></TableCell>
										<TableCell sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{e.path}</TableCell>
										<TableCell sx={{ color: "text.secondary" }}>{e.desc}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>
				</CardContent>
			</Card>

			<Card sx={{ borderRadius: 3 }}>
				<CardContent>
					<Typography variant="h6" fontWeight={700} gutterBottom>Prova live</Typography>
					<TextField label="La tua API key" fullWidth value={apiKey} onChange={(e) => setApiKey(e.target.value)}
						placeholder="soli_..." sx={{ mb: 2 }} />
					<TextField select fullWidth SelectProps={{ native: true }} label="Endpoint" value={endpoint}
						onChange={(e) => setEndpoint(e.target.value)} sx={{ mb: 2 }}>
						{ENDPOINTS.map((e) => <option key={e.path} value={e.path}>{e.path}</option>)}
					</TextField>
					<Button variant="contained" onClick={run} disabled={loading || !apiKey}>
						{loading ? <CircularProgress size={18} color="inherit" /> : "Esegui richiesta"}
					</Button>
					{status !== null && (
						<>
							<Divider sx={{ my: 2 }} />
							<Typography variant="body2" sx={{ mb: 1 }}>
								Risposta HTTP <Chip size="small" label={status} color={status < 300 ? "success" : "error"} />
							</Typography>
							<Box component="pre" sx={{ p: 2, bgcolor: "action.hover", borderRadius: 2, overflowX: "auto", maxHeight: 400, fontSize: "0.8rem" }}>
								{result}
							</Box>
						</>
					)}
				</CardContent>
			</Card>
		</Box>
	);
}
