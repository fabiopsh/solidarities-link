import { useState, useEffect, type ReactNode } from "react";
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
	Tabs,
	Tab,
	Grid,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	TextField,
	IconButton,
	Snackbar,
	Tooltip,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	LinearProgress,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import BlockIcon from "@mui/icons-material/Block";
import AddIcon from "@mui/icons-material/Add";
import { BarChart } from "@mui/x-charts/BarChart";
import { PieChart } from "@mui/x-charts/PieChart";
import { LineChart } from "@mui/x-charts/LineChart";
import { useAuth } from "react-oidc-context";
import { Link } from "react-router-dom";
import api from "../api";
import type { Task } from "../types/models/Task";
import type { ApiTokenView, CreatedApiToken } from "../types/models/ApiToken";
import TransitAnalyticsSection from "../components/TransitAnalyticsSection";

type Snack = { open: boolean; message: string; severity: "success" | "error" };

export default function AdminDashboardPage() {
	const auth = useAuth();

	const [tab, setTab] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [snackbar, setSnackbar] = useState<Snack>({ open: false, message: "", severity: "success" });
	const showSnack = (message: string, severity: "success" | "error" = "success") =>
		setSnackbar({ open: true, message, severity });

	// Tasks
	const [tasks, setTasks] = useState<Task[]>([]);

	// Analytics
	const [overview, setOverview] = useState<Record<string, number> | null>(null);
	const [byCategory, setByCategory] = useState<any[]>([]);
	const [byStatus, setByStatus] = useState<any[]>([]);
	const [cities, setCities] = useState<any[]>([]);
	const [series, setSeries] = useState<any[]>([]);
	const [demand, setDemand] = useState<any[]>([]);
	const [funnel, setFunnel] = useState<Record<string, number> | null>(null);
	const [weekday, setWeekday] = useState<any[]>([]);
	const [selectedCity, setSelectedCity] = useState<string>("");
	const [cityReport, setCityReport] = useState<any | null>(null);

	// Tokens
	const [tokens, setTokens] = useState<ApiTokenView[]>([]);
	const [createOpen, setCreateOpen] = useState(false);
	const [newLabel, setNewLabel] = useState("");
	const [newExpiry, setNewExpiry] = useState("");
	const [creating, setCreating] = useState(false);
	const [createdKey, setCreatedKey] = useState<CreatedApiToken | null>(null);

	const fetchAll = async () => {
		try {
			// Authoritative admin check: backend DB role (the Keycloak ID token does not
			// carry realm roles, so auth.user.profile.realm_access is unreliable).
			const me = await api.get("/api/users/me");
			if (me.data?.role !== "ADMIN") {
				setError("Accesso Negato. Questa pagina è riservata agli amministratori.");
				setLoading(false);
				return;
			}
			const [tasksRes, ov, cat, st, cty, ts, ds, fn, wd, tok] = await Promise.all([
				api.get("/api/tasks", { params: { size: 100 } }),
				api.get("/api/open/v1/stats/overview"),
				api.get("/api/open/v1/stats/tasks/by-category"),
				api.get("/api/open/v1/stats/tasks/by-status"),
				api.get("/api/open/v1/stats/cities"),
				api.get("/api/open/v1/stats/tasks/timeseries", { params: { granularity: "week" } }),
				api.get("/api/open/v1/stats/demand-supply"),
				api.get("/api/open/v1/stats/funnel"),
				api.get("/api/open/v1/stats/tasks/by-weekday"),
				api.get("/api/admin/tokens"),
			]);
			setTasks(tasksRes.data.data || []);
			setOverview(ov.data);
			setByCategory(cat.data || []);
			setByStatus(st.data || []);
			setCities(cty.data || []);
			setSeries(ts.data || []);
			setDemand(ds.data || []);
			setFunnel(fn.data);
			setWeekday(wd.data || []);
			setTokens(tok.data || []);
		} catch (err) {
			console.error("Admin dashboard load error:", err);
			setError("Errore nel caricamento dei dati amministrativi.");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (auth.isAuthenticated) {
			fetchAll();
		}
	}, [auth.isAuthenticated]);

	const refreshTokens = async () => {
		const tok = await api.get("/api/admin/tokens");
		setTokens(tok.data || []);
	};

	const handleCreateToken = async () => {
		if (!newLabel.trim() || !newExpiry) return;
		setCreating(true);
		try {
			const res = await api.post("/api/admin/tokens", {
				label: newLabel.trim(),
				expiresAt: `${newExpiry}T00:00:00`,
			});
			setCreatedKey(res.data);
			setCreateOpen(false);
			setNewLabel("");
			setNewExpiry("");
			await refreshTokens();
		} catch (err: any) {
			showSnack(err?.response?.data?.error || "Errore nella creazione del token", "error");
		} finally {
			setCreating(false);
		}
	};

	const handleRevoke = async (id: string) => {
		try {
			await api.post(`/api/admin/tokens/${id}/revoke`);
			showSnack("Token revocato");
			await refreshTokens();
		} catch {
			showSnack("Errore nella revoca", "error");
		}
	};

	const handleDelete = async (id: string) => {
		try {
			await api.delete(`/api/admin/tokens/${id}`);
			showSnack("Token eliminato");
			await refreshTokens();
		} catch {
			showSnack("Errore nell'eliminazione", "error");
		}
	};

	const copy = (text: string) => {
		navigator.clipboard?.writeText(text);
		showSnack("Copiato negli appunti");
	};

	const loadCity = async (city: string) => {
		setSelectedCity(city);
		if (!city) { setCityReport(null); return; }
		try {
			const res = await api.get(`/api/open/v1/city/${encodeURIComponent(city)}`);
			setCityReport(res.data);
		} catch {
			setCityReport(null);
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "OPEN": return "primary";
			case "ACCEPTED":
			case "IN_PROGRESS": return "secondary";
			case "COMPLETED": return "success";
			case "CANCELLED": return "error";
			default: return "default";
		}
	};

	if (loading) {
		return <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}><CircularProgress /></Box>;
	}
	if (error) {
		return <Box sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Box>;
	}

	const GRAD = {
		teal: "linear-gradient(135deg, #00796B 0%, #48A999 100%)",
		green: "linear-gradient(135deg, #2E7D32 0%, #66BB6A 100%)",
		amber: "linear-gradient(135deg, #E65100 0%, #FFA040 100%)",
		purple: "linear-gradient(135deg, #6A1B9A 0%, #AB47BC 100%)",
		blue: "linear-gradient(135deg, #1565C0 0%, #42A5F5 100%)",
		slate: "linear-gradient(135deg, #455A64 0%, #78909C 100%)",
	};

	const kpi = (label: string, value: number | string | undefined, gradient = GRAD.teal, suffix = "") => (
		<Card sx={{ borderRadius: 3, background: gradient, color: "#fff", height: "100%", boxShadow: "0 6px 18px rgba(0,0,0,0.12)" }}>
			<CardContent>
				<Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</Typography>
				<Typography variant="h4" fontWeight={800} sx={{ lineHeight: 1.2 }}>
					{value ?? "—"}{suffix}
				</Typography>
			</CardContent>
		</Card>
	);

	// Standardised chart container: clipped rounded corners + consistent title spacing.
	const ChartCard = ({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) => (
		<Card sx={{ borderRadius: 3, height: "100%", overflow: "hidden", border: "1px solid", borderColor: "divider", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
			<CardContent sx={{ p: 3 }}>
				<Typography variant="subtitle1" fontWeight={800} sx={{ mb: subtitle ? 0.5 : 2 }}>{title}</Typography>
				{subtitle && <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{subtitle}</Typography>}
				<Box sx={{ width: "100%", "& .MuiChartsSurface-root": { overflow: "visible" } }}>{children}</Box>
			</CardContent>
		</Card>
	);

	const completionColor = (rate: number) => (rate >= 55 ? "#2E7D32" : rate >= 45 ? "#F9A825" : "#D32F2F");
	const sectionSx = { fontWeight: 800, mt: 1, mb: 2 } as const;

	return (
		<Box>
			<Box sx={{ mb: 3 }}>
				<Typography variant="h4" fontWeight={800} sx={{ color: "primary.dark", mb: 0.5 }}>
					Pannello Amministrazione
				</Typography>
				<Typography variant="body1" color="text.secondary">
					Task globali, statistiche Open Data e gestione token API.
				</Typography>
			</Box>

			<Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
				<Tab label="Task" />
				<Tab label="Statistiche" />
				<Tab label="API Token" />
				<Tab label="Mobilità · CassiTrack" />
			</Tabs>

			{/* ---------------------------------------------------------- TAB 0: Task */}
			{tab === 0 && (
				<Card sx={{ borderRadius: 3, boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
					<CardContent sx={{ p: 0 }}>
						<TableContainer component={Paper} elevation={0} sx={{ overflowX: "auto" }}>
							<Table sx={{ minWidth: 600 }}>
								<TableHead sx={{ bgcolor: "action.hover" }}>
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
										<TableRow><TableCell colSpan={5} align="center" sx={{ py: 3 }}>Nessun task presente a sistema.</TableCell></TableRow>
									) : (
										tasks.map((task) => (
											<TableRow key={task.id} hover>
												<TableCell sx={{ maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{task.title}</TableCell>
												<TableCell>{task.category}</TableCell>
												<TableCell><Chip label={task.status} color={getStatusColor(task.status) as any} size="small" sx={{ fontWeight: "bold" }} /></TableCell>
												<TableCell sx={{ fontSize: "0.85rem", color: "text.secondary" }}>{task.creatorId?.substring(0, 8)}...</TableCell>
												<TableCell><Button component={Link} to={`/dashboard/requests/${task.id}`} variant="outlined" size="small">Dettagli</Button></TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
						</TableContainer>
					</CardContent>
				</Card>
			)}

			{/* ------------------------------------- TAB 3: Mobilità territoriale */}
			{tab === 3 && <TransitAnalyticsSection />}

			{/* --------------------------------------------------- TAB 1: Statistiche */}
			{tab === 1 && (
				<Box>
					{/* KPI */}
					<Grid container spacing={2} sx={{ mb: 4 }}>
						<Grid size={{ xs: 6, md: 3 }}>{kpi("Task totali", overview?.tasksTotal, GRAD.teal)}</Grid>
						<Grid size={{ xs: 6, md: 3 }}>{kpi("Completati", overview?.tasksCompleted, GRAD.green)}</Grid>
						<Grid size={{ xs: 6, md: 3 }}>{kpi("Volontari", overview?.volunteers, GRAD.purple)}</Grid>
						<Grid size={{ xs: 6, md: 3 }}>{kpi("Crediti in circolo", overview?.creditsInCirculation, GRAD.amber)}</Grid>
					</Grid>

					{/* Panoramica */}
					<Typography variant="h5" sx={sectionSx}>Panoramica</Typography>
					<Grid container spacing={3} sx={{ mb: 4 }}>
						<Grid size={{ xs: 12, md: 6 }}>
							<ChartCard title="Task per categoria">
								{byCategory.length > 0 && (
									<BarChart height={300} margin={{ top: 10, bottom: 24 }}
										xAxis={[{ scaleType: "band", data: byCategory.map((c) => c.category) }]}
										series={[
											{ data: byCategory.map((c) => c.total), label: "Totale", color: "#00796B" },
											{ data: byCategory.map((c) => c.completed), label: "Completati", color: "#48A999" },
										]} />
								)}
							</ChartCard>
						</Grid>
						<Grid size={{ xs: 12, md: 6 }}>
							<ChartCard title="Task per stato">
								{byStatus.length > 0 && (
									<PieChart height={300} margin={{ top: 10, bottom: 24 }}
										series={[{ data: byStatus.map((s, i) => ({ id: i, value: s.count, label: s.status })), innerRadius: 45, paddingAngle: 2, cornerRadius: 4 }]} />
								)}
							</ChartCard>
						</Grid>
						<Grid size={{ xs: 12 }}>
							<ChartCard title="Andamento settimanale (creati vs completati)">
								{series.length > 0 && (
									<LineChart height={300} margin={{ top: 10, bottom: 24 }}
										xAxis={[{ scaleType: "point", data: series.map((p) => String(p.period).substring(0, 10)) }]}
										series={[
											{ data: series.map((p) => p.created), label: "Creati", color: "#1565C0", curve: "monotoneX" },
											{ data: series.map((p) => p.completed), label: "Completati", color: "#2E7D32", curve: "monotoneX" },
										]} />
								)}
							</ChartCard>
						</Grid>
					</Grid>

					{/* Domanda & offerta + funnel */}
					<Typography variant="h5" sx={sectionSx}>Domanda &amp; offerta</Typography>
					<Grid container spacing={3} sx={{ mb: 4 }}>
						<Grid size={{ xs: 12, md: 7 }}>
							<ChartCard title="Task aperti vs volontari per categoria"
								subtitle="Individua le carenze di copertura: dove la domanda supera l'offerta la categoria è sotto-servita.">
								{demand.length > 0 && (
									<BarChart height={300} margin={{ top: 10, bottom: 24 }}
										xAxis={[{ scaleType: "band", data: demand.map((d) => d.category) }]}
										series={[
											{ data: demand.map((d) => d.openTasks), label: "Task aperti (domanda)", color: "#E65100" },
											{ data: demand.map((d) => d.volunteers), label: "Volontari (offerta)", color: "#1565C0" },
										]} />
								)}
							</ChartCard>
						</Grid>
						<Grid size={{ xs: 12, md: 5 }}>
							<ChartCard title="Imbuto ciclo di vita">
								{funnel && (
									<>
										<BarChart height={220} layout="horizontal" margin={{ left: 76, top: 6, bottom: 24 }}
											yAxis={[{ scaleType: "band", data: ["Creati", "Accettati", "In corso", "Completati"] }]}
											series={[{ data: [funnel.created, funnel.accepted, funnel.inProgress, funnel.completed], color: "#00796B" }]} />
										<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1.5 }}>
											<Chip label={`Accettazione ${funnel.acceptanceRate}%`} color="info" size="small" />
											<Chip label={`Completamento ${funnel.completionRate}%`} color="success" size="small" />
											<Chip label={`Annullati ${funnel.cancelled}`} size="small" variant="outlined" />
											<Chip label={`Rilasciati ${funnel.released}`} size="small" variant="outlined" />
										</Box>
									</>
								)}
							</ChartCard>
						</Grid>
						<Grid size={{ xs: 12 }}>
							<ChartCard title="Task creati per giorno della settimana">
								{weekday.length > 0 && (
									<BarChart height={240} margin={{ top: 10, bottom: 24 }}
										xAxis={[{ scaleType: "band", data: weekday.map((w) => w.weekday) }]}
										series={[{ data: weekday.map((w) => w.count), label: "Task creati", color: "#6A1B9A" }]} />
								)}
							</ChartCard>
						</Grid>
					</Grid>

					{/* Confronto città + drill-down */}
					<Typography variant="h5" sx={sectionSx}>Statistiche per città</Typography>
					<Grid container spacing={3} sx={{ mb: 2 }}>
						<Grid size={{ xs: 12, md: 7 }}>
							<Card sx={{ borderRadius: 3, height: "100%", overflow: "hidden", border: "1px solid", borderColor: "divider", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
								<CardContent sx={{ p: 3, pb: 1 }}>
									<Typography variant="subtitle1" fontWeight={800} sx={{ mb: 0.5 }}>Confronto città</Typography>
									<Typography variant="body2" color="text.secondary">Clicca una riga per il report dettagliato.</Typography>
								</CardContent>
								<TableContainer>
									<Table size="small">
										<TableHead>
											<TableRow sx={{ "& th": { fontWeight: 700, color: "text.secondary", borderBottom: "2px solid", borderColor: "divider" } }}>
												<TableCell sx={{ width: 40 }}>#</TableCell>
												<TableCell>Città</TableCell>
												<TableCell align="right">Task</TableCell>
												<TableCell sx={{ minWidth: 140 }}>Completamento</TableCell>
												<TableCell align="right">Risposta</TableCell>
												<TableCell align="right">Volontari</TableCell>
												<TableCell align="right">Crediti</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{cities.map((c, i) => (
												<TableRow key={c.city} hover selected={c.city === selectedCity}
													sx={{ cursor: "pointer", "&.Mui-selected": { bgcolor: "action.selected" } }}
													onClick={() => loadCity(c.city)}>
													<TableCell sx={{ color: "text.secondary", fontWeight: 700 }}>{i + 1}</TableCell>
													<TableCell sx={{ fontWeight: 700 }}>{c.city}</TableCell>
													<TableCell align="right">{c.tasks}</TableCell>
													<TableCell>
														<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
															<LinearProgress variant="determinate" value={Math.min(c.completionRate, 100)}
																sx={{ flexGrow: 1, height: 8, borderRadius: 5, [`& .MuiLinearProgress-bar`]: { backgroundColor: completionColor(c.completionRate) }, backgroundColor: "action.hover" }} />
															<Typography variant="caption" sx={{ fontWeight: 700, minWidth: 38, textAlign: "right", color: completionColor(c.completionRate) }}>{c.completionRate}%</Typography>
														</Box>
													</TableCell>
													<TableCell align="right">{c.avgResponseMinutes}′</TableCell>
													<TableCell align="right">{c.activeVolunteers}</TableCell>
													<TableCell align="right" sx={{ fontWeight: 600 }}>{c.creditsEarned}</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</TableContainer>
							</Card>
						</Grid>
						<Grid size={{ xs: 12, md: 5 }}>
							<Card sx={{ borderRadius: 3, height: "100%", border: "1px solid", borderColor: "divider", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}><CardContent sx={{ p: 3 }}>
								<FormControl fullWidth sx={{ mb: 2 }}>
									<InputLabel id="city-select-label">Approfondisci una città</InputLabel>
									<Select
										labelId="city-select-label"
										label="Approfondisci una città"
										value={selectedCity}
										onChange={(e) => loadCity(e.target.value)}
									>
										<MenuItem value=""><em>— Seleziona —</em></MenuItem>
										{cities.map((c) => <MenuItem key={c.city} value={c.city}>{c.city}</MenuItem>)}
									</Select>
								</FormControl>
								{!cityReport ? (
									<Typography variant="body2" color="text.secondary">Seleziona una città (o clicca una riga) per il report dettagliato.</Typography>
								) : (
									<>
										<Grid container spacing={1.5} sx={{ mb: 2 }}>
											<Grid size={6}>{kpi("Completamento", cityReport.completionRate, GRAD.green, "%")}</Grid>
											<Grid size={6}>{kpi("Task aperti", cityReport.openTasks, GRAD.amber)}</Grid>
											<Grid size={6}>{kpi("Durata media", cityReport.avgDurationMinutes, GRAD.blue, " min")}</Grid>
											<Grid size={6}>{kpi("Beneficiari", cityReport.beneficiariesHelped, GRAD.slate)}</Grid>
										</Grid>
										{cityReport.byCategory?.length > 0 && (
											<BarChart height={220}
												xAxis={[{ scaleType: "band", data: cityReport.byCategory.map((c: any) => c.category) }]}
												series={[{ data: cityReport.byCategory.map((c: any) => c.total), label: `Task a ${cityReport.city}`, color: "#00796B" }]} />
										)}
									</>
								)}
							</CardContent></Card>
						</Grid>
					</Grid>

					<Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
						Questi dati provengono dalle API Open (<code>/api/open/v1</code>), le stesse esposte pubblicamente tramite token API. Vedi il portale <Link to="/developers">sviluppatori</Link>.
					</Alert>
				</Box>
			)}

			{/* ---------------------------------------------------- TAB 2: API Token */}
			{tab === 2 && (
				<Box>
					<Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
						<Typography variant="body1" color="text.secondary">
							Token per l'accesso esterno alle API Open (sola lettura). La chiave è mostrata una sola volta alla creazione.
						</Typography>
						<Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>Nuovo token</Button>
					</Box>
					<Card sx={{ borderRadius: 3 }}>
						<CardContent sx={{ p: 0 }}>
							<TableContainer component={Paper} elevation={0} sx={{ overflowX: "auto" }}>
								<Table sx={{ minWidth: 700 }}>
									<TableHead sx={{ bgcolor: "action.hover" }}>
										<TableRow>
											<TableCell sx={{ fontWeight: "bold" }}>Etichetta</TableCell>
											<TableCell sx={{ fontWeight: "bold" }}>Prefisso</TableCell>
											<TableCell sx={{ fontWeight: "bold" }}>Scadenza</TableCell>
											<TableCell sx={{ fontWeight: "bold" }}>Ultimo uso</TableCell>
											<TableCell sx={{ fontWeight: "bold" }}>Chiamate</TableCell>
											<TableCell sx={{ fontWeight: "bold" }}>Stato</TableCell>
											<TableCell sx={{ fontWeight: "bold" }}>Azioni</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{tokens.length === 0 ? (
											<TableRow><TableCell colSpan={7} align="center" sx={{ py: 3 }}>Nessun token creato.</TableCell></TableRow>
										) : (
											tokens.map((t) => (
												<TableRow key={t.id} hover>
													<TableCell>{t.label}</TableCell>
													<TableCell sx={{ fontFamily: "monospace" }}>{t.tokenPrefix}…</TableCell>
													<TableCell>{new Date(t.expiresAt).toLocaleDateString()}</TableCell>
													<TableCell>{t.lastUsedAt ? new Date(t.lastUsedAt).toLocaleString() : "—"}</TableCell>
													<TableCell>{t.callCount}</TableCell>
													<TableCell>
														<Chip
															size="small"
															label={t.revoked ? "Revocato" : t.expired ? "Scaduto" : "Attivo"}
															color={t.revoked || t.expired ? "default" : "success"}
														/>
													</TableCell>
													<TableCell>
														{!t.revoked && (
															<Tooltip title="Revoca">
																<IconButton size="small" onClick={() => handleRevoke(t.id)}><BlockIcon fontSize="small" /></IconButton>
															</Tooltip>
														)}
														<Tooltip title="Elimina">
															<IconButton size="small" color="error" onClick={() => handleDelete(t.id)}><DeleteIcon fontSize="small" /></IconButton>
														</Tooltip>
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
			)}

			{/* Create token dialog */}
			<Dialog open={createOpen} onClose={() => !creating && setCreateOpen(false)} fullWidth maxWidth="xs">
				<DialogTitle fontWeight={700}>Nuovo token API</DialogTitle>
				<DialogContent>
					<TextField label="Etichetta (es. Comune di Pisa)" fullWidth autoFocus value={newLabel}
						onChange={(e) => setNewLabel(e.target.value)} sx={{ mt: 1, mb: 2 }} />
					<TextField label="Scadenza" type="date" fullWidth value={newExpiry}
						onChange={(e) => setNewExpiry(e.target.value)} InputLabelProps={{ shrink: true }}
						inputProps={{ min: new Date(Date.now() + 86400000).toISOString().substring(0, 10) }} />
				</DialogContent>
				<DialogActions sx={{ p: 2 }}>
					<Button onClick={() => setCreateOpen(false)} disabled={creating}>Annulla</Button>
					<Button variant="contained" onClick={handleCreateToken} disabled={creating || !newLabel.trim() || !newExpiry}>
						{creating ? <CircularProgress size={18} color="inherit" /> : "Crea"}
					</Button>
				</DialogActions>
			</Dialog>

			{/* Show created key once */}
			<Dialog open={Boolean(createdKey)} onClose={() => setCreatedKey(null)} fullWidth maxWidth="sm">
				<DialogTitle fontWeight={700}>Token creato</DialogTitle>
				<DialogContent>
					<Alert severity="warning" sx={{ mb: 2 }}>
						Copia ora la chiave: non sarà più visualizzabile.
					</Alert>
					<Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 1.5, bgcolor: "action.hover", borderRadius: 2 }}>
						<Typography sx={{ fontFamily: "monospace", wordBreak: "break-all", flexGrow: 1 }}>{createdKey?.key}</Typography>
						<IconButton onClick={() => createdKey && copy(createdKey.key)}><ContentCopyIcon /></IconButton>
					</Box>
					<Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
						Usala nell'header <code>X-API-Key</code> verso <code>/api/open/v1/...</code>.
					</Typography>
				</DialogContent>
				<DialogActions sx={{ p: 2 }}>
					<Button variant="contained" onClick={() => setCreatedKey(null)}>Ho copiato la chiave</Button>
				</DialogActions>
			</Dialog>

			<Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
				anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
				<Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: 2 }}>{snackbar.message}</Alert>
			</Snackbar>
		</Box>
	);
}
