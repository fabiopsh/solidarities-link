import { useEffect, useState, type ReactNode } from "react";
import { Alert, Box, Card, CardContent, Chip, CircularProgress, Grid, Stack, Typography } from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { LineChart } from "@mui/x-charts/LineChart";
import api from "../api";
import type { TransitAnalytics } from "../types/models/Transit";
import { formatClock, incidentType, INCIDENT_SEVERITY_COLOR, lineLabel } from "../utils/transit";

const GRAD = {
	blue: "linear-gradient(135deg, #1565C0 0%, #42A5F5 100%)",
	teal: "linear-gradient(135deg, #00796B 0%, #48A999 100%)",
	green: "linear-gradient(135deg, #2E7D32 0%, #66BB6A 100%)",
	amber: "linear-gradient(135deg, #E65100 0%, #FFA040 100%)",
	purple: "linear-gradient(135deg, #6A1B9A 0%, #AB47BC 100%)",
	slate: "linear-gradient(135deg, #455A64 0%, #78909C 100%)",
};

const kpi = (label: string, value: string | number, gradient: string, hint?: string) => (
	<Card sx={{ borderRadius: 3, background: gradient, color: "#fff", height: "100%", boxShadow: "0 6px 18px rgba(0,0,0,0.12)" }}>
		<CardContent>
			<Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</Typography>
			<Typography variant="h4" fontWeight={800} sx={{ lineHeight: 1.2 }}>{value}</Typography>
			{hint && <Typography variant="caption" sx={{ opacity: 0.85 }}>{hint}</Typography>}
		</CardContent>
	</Card>
);

const chartCard = (title: string, subtitle: string, content: ReactNode) => (
	<Card sx={{ borderRadius: 3, height: "100%", border: "1px solid", borderColor: "divider", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
		<CardContent sx={{ p: 3 }}>
			<Typography variant="subtitle1" fontWeight={800} sx={{ mb: 0.5 }}>{title}</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{subtitle}</Typography>
			{content}
		</CardContent>
	</Card>
);

/** Admin dashboard: territorial mobility of Cassino (CassiTrack analytics) crossed with SOLI accompaniment demand. */
export default function TransitAnalyticsSection() {
	const [data, setData] = useState<TransitAnalytics | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		api.get<TransitAnalytics>("/api/integrations/cassitrack/analytics")
			.then((res) => setData(res.data))
			.catch((e) => setError(e?.response?.data?.error ?? "Integrazione CassiTrack non disponibile"));
	}, []);

	if (error) return <Alert severity="warning">{error}</Alert>;
	if (!data) return <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}><CircularProgress /></Box>;

	const hours = data.demandByHour;
	const daytime = hours.filter((h) => h.hour >= 9 && h.hour <= 17);
	const quietest = daytime.length > 0 ? daytime.reduce((a, b) => (b.tplAvgPassengers < a.tplAvgPassengers ? b : a)) : null;
	const peakSoli = hours.reduce((a, b) => (b.soliAccompaniments > a.soliAccompaniments ? b : a), hours[0]);
	const slots = data.delayByRoute[0]?.points.map((p) => p.timeSlot) ?? [];
	const c = data.soliCoverage;

	return (
		<Box>
			<Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} sx={{ mb: 2, gap: 1 }}>
				<Box>
					<Typography variant="h5" fontWeight={800}>Mobilità territoriale · Cassino</Typography>
					<Typography variant="body2" color="text.secondary">
						Dati della flotta TPL (CassiTrack, account partner SOLI) incrociati con la domanda di accompagnamenti SOLI nell'area servita.
					</Typography>
				</Box>
				<Chip label={`Aggiornato alle ${formatClock(data.generatedAt)}`} variant="outlined" />
			</Stack>

			<Grid container spacing={2} sx={{ mb: 4 }}>
				<Grid size={{ xs: 6, md: 2 }}>{kpi("Bus attivi", `${data.summary.activeBuses}/${data.fleetSize}`, GRAD.blue, "flotta con OBU")}</Grid>
				<Grid size={{ xs: 6, md: 2 }}>{kpi("Corse oggi", data.summary.tripsToday, GRAD.slate)}</Grid>
				<Grid size={{ xs: 6, md: 2 }}>{kpi("Puntualità", `${data.summary.onTimePercentage.toLocaleString("it-IT")}%`, data.summary.onTimePercentage >= 80 ? GRAD.green : GRAD.amber, "ritardo ≤ 3 min")}</Grid>
				<Grid size={{ xs: 6, md: 2 }}>{kpi("CO₂ evitata TPL", `${Math.round(data.co2.co2SavedKg).toLocaleString("it-IT")} kg`, GRAD.teal, "oggi vs auto privata")}</Grid>
				<Grid size={{ xs: 6, md: 2 }}>{kpi("Task vicini a fermata", `${c.nearStopPercentage}%`, GRAD.purple, `${c.tasksNearStop}/${c.tasksInArea} entro 400 m`)}</Grid>
				<Grid size={{ xs: 6, md: 2 }}>{kpi("CO₂ accompagnamenti", `${c.estimatedCo2SavedKg.toLocaleString("it-IT")} kg`, GRAD.green, `${c.completedAccompaniments} svolti in TPL (stima)`)}</Grid>
			</Grid>

			<Grid container spacing={3} sx={{ mb: 4 }}>
				<Grid size={{ xs: 12, md: 7 }}>
					{chartCard(
						"Affollamento bus vs richieste di accompagnamento",
						"Passeggeri medi a bordo per fascia oraria (CassiTrack, stima BLE) e accompagnamenti SOLI nella stessa fascia.",
						<>
							<BarChart
								height={300}
								margin={{ top: 10, bottom: 24 }}
								xAxis={[{ scaleType: "band", data: hours.map((h) => `${h.hour}:00`) }]}
								yAxis={[{ id: "tpl", position: "left" }, { id: "soli", position: "right" }]}
								series={[
									{ data: hours.map((h) => h.tplAvgPassengers), label: "Passeggeri medi bus", color: "#90CAF9", yAxisId: "tpl" },
									{ data: hours.map((h) => h.soliAccompaniments), label: "Accompagnamenti SOLI", color: "#00796B", yAxisId: "soli" },
								]}
							/>
							{quietest && (
								<Alert severity="info" sx={{ mt: 1 }}>
									Fascia diurna con bus meno affollati: <strong>{quietest.hour}:00–{quietest.hour + 1}:00</strong> ({quietest.tplAvgPassengers.toLocaleString("it-IT")} passeggeri medi).
									{peakSoli && peakSoli.soliAccompaniments > 0 && (
										<> Picco di accompagnamenti SOLI alle <strong>{peakSoli.hour}:00</strong>: suggerire ai richiedenti fragili gli orari fuori punta.</>
									)}
								</Alert>
							)}
						</>,
					)}
				</Grid>
				<Grid size={{ xs: 12, md: 5 }}>
					{chartCard(
						"Ritardo medio per linea (oggi)",
						"Minuti di ritardo per fascia oraria (CassiTrack, delay-by-route).",
						<LineChart
							height={300}
							margin={{ top: 10, bottom: 24 }}
							xAxis={[{ scaleType: "point", data: slots }]}
							series={data.delayByRoute.map((r) => ({
								data: r.points.map((p) => p.avgDelayMinutes),
								label: lineLabel(r.shortName),
								color: r.color,
								curve: "monotoneX" as const,
							}))}
						/>,
					)}
				</Grid>
			</Grid>

			<Grid container spacing={3}>
				<Grid size={{ xs: 12, md: 5 }}>
					{chartCard(
						"Linee",
						"Ritardo medio e massimo della giornata.",
						<Stack spacing={1.25}>
							{data.delayByRoute.map((r) => (
								<Stack key={r.routeId} direction="row" spacing={1.5} alignItems="center">
									<Box sx={{ minWidth: 34, textAlign: "center", borderRadius: 1, bgcolor: r.color, color: "#fff", fontWeight: 800, py: 0.25 }}>{r.shortName}</Box>
									<Typography variant="body2" sx={{ flex: 1 }}>{lineLabel(r.shortName)}</Typography>
									<Chip size="small" label={`media ${r.avgDelayMinutes.toLocaleString("it-IT")}′`} />
									<Chip size="small" variant="outlined" color={r.maxDelayMinutes > 7 ? "error" : "default"} label={`max ${r.maxDelayMinutes.toLocaleString("it-IT")}′`} />
								</Stack>
							))}
						</Stack>,
					)}
				</Grid>
				<Grid size={{ xs: 12, md: 7 }}>
					{chartCard(
						"Disservizi attivi sulla rete",
						"Avvisi CassiTrack (conducenti, fleet manager, enti) e segnalazioni dei volontari SOLI.",
						<Stack spacing={1.25}>
							{data.incidents.length === 0 && <Typography variant="body2" color="text.secondary">Nessun disservizio attivo.</Typography>}
							{data.incidents.map((i) => (
								<Box key={i.id} sx={{ p: 1.25, borderRadius: 2, borderLeft: "4px solid", borderColor: INCIDENT_SEVERITY_COLOR[i.severity] ?? "#ef6c00", bgcolor: "action.hover" }}>
									<Stack direction="row" justifyContent="space-between" spacing={1}>
										<Typography variant="body2" fontWeight={800}>{incidentType(i.type).emoji} {i.title}</Typography>
										<Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
											{formatClock(i.reportedAt)}–{formatClock(i.expectedEndAt)}
										</Typography>
									</Stack>
									<Typography variant="caption" color="text.secondary">
										{i.routeIds.map((r) => r.replace("LINEA_", "Linea ")).join(", ") || "Nessuna linea"} · +{i.expectedDelayMinutes} min · fonte {i.source}
										{i.status === "UNDER_REVIEW" ? " · in verifica" : ""}
									</Typography>
								</Box>
							))}
						</Stack>,
					)}
				</Grid>
			</Grid>

			<Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 3 }}>
				Fonte: {data.source}. CO₂ accompagnamenti: stima andata/ritorno in bus (68 gCO₂/pkm) invece dell'auto (170 gCO₂/km).
			</Typography>
		</Box>
	);
}
