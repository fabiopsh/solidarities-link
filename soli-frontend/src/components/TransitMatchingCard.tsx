import { useEffect, useState } from "react";
import { Box, Card, CardContent, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from "@mui/material";
import api from "../api";
import type { TransitMatching } from "../types/models/Transit";

const rankDelta = (transitRank: number, distanceRank: number) => {
	if (distanceRank === 0) return { label: "nuovo", color: "#1565c0" };
	const delta = distanceRank - transitRank;
	if (delta > 0) return { label: `▲ ${delta}`, color: "#2e7d32" };
	if (delta < 0) return { label: `▼ ${-delta}`, color: "#c62828" };
	return { label: "=", color: "#757575" };
};

/** Requester view: distance-only ranking vs TPL-aware ranking of the volunteers notified for the task. */
export default function TransitMatchingCard({ taskId }: { taskId: string }) {
	const [data, setData] = useState<TransitMatching | null>(null);

	useEffect(() => {
		let cancelled = false;
		api.get<TransitMatching>(`/api/integrations/cassitrack/tasks/${taskId}/matching`)
			.then((res) => !cancelled && setData(res.data))
			.catch(() => undefined);
		return () => {
			cancelled = true;
		};
	}, [taskId]);

	if (!data?.covered || data.rows.length === 0) return null;

	return (
		<Card sx={{ borderRadius: 3, boxShadow: "0 4px 20px rgba(0,0,0,0.05)", borderTop: "4px solid", borderColor: "secondary.main" }}>
			<CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
				<Typography variant="h6" fontWeight={900}>🤝 Volontari raggiungibili con il TPL</Typography>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{data.explanation}</Typography>
				<Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap", rowGap: 1 }}>
					<Chip label={`Solo distanza: ${data.distanceOnlyCandidates} volontari`} variant="outlined" sx={{ fontWeight: 700 }} />
					<Chip label={`Con CassiTrack: ${data.transitCandidates} volontari`} color="secondary" sx={{ fontWeight: 700 }} />
					{data.addedByTransit > 0 && <Chip label={`+${data.addedByTransit} raggiungibili in bus fuori raggio`} color="info" sx={{ fontWeight: 700 }} />}
				</Stack>
				<Box sx={{ overflowX: "auto" }}>
					<Table size="small" sx={{ minWidth: 640 }}>
						<TableHead>
							<TableRow>
								<TableCell sx={{ fontWeight: 800 }}>#</TableCell>
								<TableCell sx={{ fontWeight: 800 }}>Volontario</TableCell>
								<TableCell sx={{ fontWeight: 800 }}>Distanza</TableCell>
								<TableCell sx={{ fontWeight: 800 }}>🚶 A piedi</TableCell>
								<TableCell sx={{ fontWeight: 800 }}>🚌 Bus (live)</TableCell>
								<TableCell sx={{ fontWeight: 800 }}>Note</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{data.rows.map((r) => {
								const delta = rankDelta(r.transitRank, r.distanceRank);
								return (
									<TableRow key={r.volunteer + r.distanceMeters} sx={{ opacity: r.selected ? 1 : 0.5, bgcolor: r.addedByTransit ? "rgba(21,101,192,0.06)" : undefined }}>
										<TableCell>
											{r.selected ? (
												<Stack direction="row" spacing={0.75} alignItems="center">
													<Typography fontWeight={900}>{r.transitRank}</Typography>
													<Tooltip title={r.distanceRank ? `Posizione con il solo criterio di distanza: ${r.distanceRank}` : "Escluso dal solo criterio di distanza"}>
														<Typography variant="caption" fontWeight={800} sx={{ color: delta.color }}>{delta.label}</Typography>
													</Tooltip>
												</Stack>
											) : "–"}
										</TableCell>
										<TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>{r.volunteer}</TableCell>
										<TableCell sx={{ whiteSpace: "nowrap" }}>
											{(r.distanceMeters / 1000).toLocaleString("it-IT", { maximumFractionDigits: 1 })} km
											<Typography variant="caption" color={r.withinRadius ? "text.secondary" : "error.main"} component="div">
												raggio {(r.actionRadiusMeters / 1000).toLocaleString("it-IT", { maximumFractionDigits: 1 })} km
											</Typography>
										</TableCell>
										<TableCell sx={{ fontWeight: r.bestMode === "WALK" ? 800 : 400 }}>{r.walkMinutes != null ? `${r.walkMinutes} min` : "–"}</TableCell>
										<TableCell sx={{ fontWeight: r.bestMode === "BUS" ? 800 : 400 }}>
											{r.busMinutes != null ? `${r.busMinutes} min` : "–"}
											{r.busSummary && (
												<Typography variant="caption" color="text.secondary" component="div" sx={{ maxWidth: 220 }}>
													{r.busSummary}{r.busDelayMinutes > 0 ? ` · +${r.busDelayMinutes}′` : ""}
												</Typography>
											)}
										</TableCell>
										<TableCell>
											<Typography variant="caption" sx={{ color: r.addedByTransit ? "info.main" : "text.secondary", fontWeight: r.addedByTransit ? 700 : 400 }}>
												{r.note}
											</Typography>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</Box>
				<Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1.5 }}>
					I nomi dei volontari sono abbreviati per privacy. Fonte tempi di viaggio: OmniMove (POST /journeys/search) su dati CassiTrack.
				</Typography>
			</CardContent>
		</Card>
	);
}
