import { Box, Card, CardContent, Chip, CircularProgress, Divider, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Journey, TaskTransit, TransitPlan } from "../types/models/Transit";
import { crowding, formatClock } from "../utils/transit";
import JourneyView from "./JourneyView";

interface Props {
	transit: TaskTransit | null;
	loading: boolean;
	isMobility: boolean;
	onDestinationChange: (stopId: string) => void;
}

function JourneyMap({ plan, lineColors }: { plan: TransitPlan; lineColors: Record<string, string> }) {
	const journey = plan.recommended;
	if (!journey) return null;
	const points: [number, number][] = journey.legs.flatMap((l) => l.geometry);
	points.push([plan.from.lat, plan.from.lon], [plan.to.lat, plan.to.lon]);
	const lats = points.map((p) => p[0]);
	const lons = points.map((p) => p[1]);
	const bounds: [[number, number], [number, number]] = [
		[Math.min(...lats) - 0.0006, Math.min(...lons) - 0.0008],
		[Math.max(...lats) + 0.0006, Math.max(...lons) + 0.0008],
	];
	return (
		<Box sx={{ height: 280, borderRadius: 2, overflow: "hidden", border: "1px solid", borderColor: "divider", mb: 1.5 }}>
			<MapContainer key={`${plan.to.name}-${journey.mode}`} bounds={bounds} boundsOptions={{ padding: [24, 24] }} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
				<TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
				{journey.legs.map((leg, i) => (
					<Polyline
						key={i}
						positions={leg.geometry}
						pathOptions={
							leg.mode === "BUS"
								? { color: lineColors[leg.routeId ?? ""] ?? "#1565c0", weight: 6, opacity: 0.85 }
								: { color: "#455a64", weight: 4, dashArray: "2 8", opacity: 0.9 }
						}
					/>
				))}
				{journey.legs.filter((l) => l.mode === "BUS").flatMap((l) => [
					<CircleMarker key={`${l.fromStopId}-from`} center={l.geometry[0]} radius={6} pathOptions={{ color: "#263238", weight: 2, fillColor: "#fff", fillOpacity: 1 }}>
						<Tooltip>🚏 {l.fromName} · {formatClock(l.departureTime)}</Tooltip>
					</CircleMarker>,
					<CircleMarker key={`${l.toStopId}-to`} center={l.geometry[l.geometry.length - 1]} radius={6} pathOptions={{ color: "#263238", weight: 2, fillColor: "#fff", fillOpacity: 1 }}>
						<Tooltip>🚏 {l.toName} · {formatClock(l.arrivalTime)}</Tooltip>
					</CircleMarker>,
				])}
				<CircleMarker center={[plan.from.lat, plan.from.lon]} radius={9} pathOptions={{ color: "#fff", weight: 3, fillColor: "#00796B", fillOpacity: 1 }}>
					<Tooltip permanent direction="top" offset={[0, -8]}>Partenza</Tooltip>
				</CircleMarker>
				<CircleMarker center={[plan.to.lat, plan.to.lon]} radius={9} pathOptions={{ color: "#fff", weight: 3, fillColor: "#c62828", fillOpacity: 1 }}>
					<Tooltip permanent direction="top" offset={[0, -8]}>{plan.to.name}</Tooltip>
				</CircleMarker>
			</MapContainer>
		</Box>
	);
}

function PlanSection({ title, subtitle, plan, lineColors }: { title: string; subtitle?: string; plan: TransitPlan; lineColors?: Record<string, string> }) {
	return (
		<Box>
			<Typography variant="subtitle1" fontWeight={800}>{title}</Typography>
			{subtitle && <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>{subtitle}</Typography>}
			{lineColors && <JourneyMap plan={plan} lineColors={lineColors} />}
			{plan.recommended && <JourneyView journey={plan.recommended} highlighted />}
			{plan.advice.length > 0 && (
				<Stack component="ul" spacing={0.25} sx={{ pl: 2.5, my: 1.25 }}>
					{plan.advice.map((a) => (
						<Typography component="li" key={a} variant="body2" color="text.secondary">{a}</Typography>
					))}
				</Stack>
			)}
			{plan.alternatives.length > 0 && (
				<Stack spacing={1} sx={{ mt: 1 }}>
					{plan.alternatives.map((j: Journey) => (
						<JourneyView key={j.mode + j.summary} journey={j} />
					))}
				</Stack>
			)}
		</Box>
	);
}

/** TPL support on the task page: stops near the meeting point, accompaniment trip, how to reach the requester. */
export default function TaskTransitCard({ transit, loading, isMobility, onDestinationChange }: Props) {
	if (!transit) {
		return loading ? (
			<Card sx={{ borderRadius: 3 }}><CardContent sx={{ display: "flex", justifyContent: "center" }}><CircularProgress size={24} /></CardContent></Card>
		) : null;
	}
	if (!transit.covered) return null;

	return (
		<Card sx={{ borderRadius: 3, boxShadow: "0 4px 20px rgba(0,0,0,0.05)", borderTop: "4px solid", borderColor: "info.main" }}>
			<CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
				<Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2, flexWrap: "wrap", gap: 1 }}>
					<Box>
						<Typography variant="h6" fontWeight={900}>🚌 Supporto TPL {isMobility ? "per l'accompagnamento" : "per raggiungere il task"}</Typography>
						<Typography variant="body2" color="text.secondary">Dati in tempo reale della rete urbana di {transit.city} · CassiTrack + OmniMove</Typography>
					</Box>
					<Chip size="small" color="info" variant="outlined" label="Aggiornato ogni 30 s" />
				</Stack>

				{/* Stops near the meeting point */}
				<Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>Fermate vicine al punto di incontro</Typography>
				<Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 3 }}>
					{transit.nearbyStops.map((s) => (
						<Box key={s.stop.id} sx={{ flex: 1, p: 1.5, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
							<Typography variant="body2" fontWeight={800}>🚏 {s.stop.name}</Typography>
							<Typography variant="caption" color="text.secondary">{s.distanceMeters} m · {s.walkMinutes} min a piedi</Typography>
							<Stack spacing={0.5} sx={{ mt: 1 }}>
								{s.nextArrivals.slice(0, 3).map((a) => {
									const crowd = crowding(a.crowdingLevel);
									return (
										<Stack key={a.tripId + a.estimatedArrival} direction="row" spacing={1} alignItems="center">
											<Box sx={{ minWidth: 26, textAlign: "center", borderRadius: 1, bgcolor: a.color, color: "#fff", fontWeight: 800, fontSize: 12 }}>{a.routeShortName}</Box>
											<Typography variant="body2" fontWeight={700} sx={{ minWidth: 48 }}>{a.minutes} min</Typography>
											<Typography variant="caption" color={a.isRealtime && a.delayMinutes > 2 ? "error.main" : "text.secondary"} sx={{ flex: 1 }}>
												{a.isRealtime ? (a.delayMinutes > 0 ? `live +${a.delayMinutes}′` : "live") : "da orario"}
												{crowd ? ` · ${crowd.icon}` : ""}
												{a.accessible ? " · ♿" : ""}
											</Typography>
										</Stack>
									);
								})}
							</Stack>
						</Box>
					))}
					{transit.nearbyStops.length === 0 && (
						<Typography variant="body2" color="text.secondary">Nessuna fermata entro 1 km dal punto di incontro.</Typography>
					)}
				</Stack>

				{/* Accompaniment trip */}
				{isMobility && transit.accompaniment && transit.destination && (
					<>
						<Divider sx={{ mb: 2.5, borderStyle: "dashed" }} />
						<Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} sx={{ mb: 1.5 }}>
							<TextField
								select
								size="small"
								label="Destinazione dell'accompagnamento"
								value={transit.destination.stopId}
								onChange={(e) => onDestinationChange(e.target.value)}
								sx={{ minWidth: 280 }}
							>
								{transit.destinationOptions.map((d) => (
									<MenuItem key={d.stopId} value={d.stopId}>{d.name}</MenuItem>
								))}
							</TextField>
							{transit.destination.inferred && (
								<Typography variant="caption" color="text.secondary">
									✨ Dedotta dalla richiesta: {transit.destination.reason}
								</Typography>
							)}
						</Stack>
						<PlanSection
							title={`Tragitto di accompagnamento · ${transit.accompaniment.distanceKm.toLocaleString("it-IT")} km`}
							subtitle="Soluzione pensata per una persona fragile: breve tratto a piedi, mezzo accessibile, affollamento e ritardi in tempo reale."
							plan={transit.accompaniment}
							lineColors={transit.lineColors}
						/>
					</>
				)}

				{/* Volunteer reaching the meeting point */}
				{transit.volunteerReach && (
					<>
						<Divider sx={{ my: 2.5, borderStyle: "dashed" }} />
						<PlanSection
							title="Come raggiungere il punto di incontro"
							subtitle="Dalla zona indicata nel tuo profilo volontario, senza auto."
							plan={transit.volunteerReach}
						/>
					</>
				)}

				<Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 2.5 }}>
					Fonte: {transit.source} · aggiornato alle {formatClock(transit.generatedAt)}
				</Typography>
			</CardContent>
		</Card>
	);
}
