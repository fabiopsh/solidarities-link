import { Fragment, useEffect, useState } from "react";
import { Box, Chip, CircularProgress, Stack, Typography } from "@mui/material";
import { Circle, CircleMarker, Marker, Polyline, Popup, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import api from "../api";
import type { TransitArrival, TransitNetwork, TransitStop } from "../types/models/Transit";
import {
	crowding,
	delayColor,
	formatClock,
	INCIDENT_SEVERITY_COLOR,
	incidentType,
	lineLabel,
	scheduleStatus,
	uniqueStops,
} from "../utils/transit";

function busIcon(color: string, shortName: string, delay: number): L.DivIcon {
	return L.divIcon({
		className: "transit-bus-marker",
		html: `<div class="transit-bus" style="--line:${color};--status:${delayColor(delay)}"><span class="transit-bus-emoji">🚌</span><span class="transit-bus-line">${shortName}</span></div>`,
		iconSize: [46, 30],
		iconAnchor: [23, 15],
		popupAnchor: [0, -16],
	});
}

function incidentIcon(emoji: string, color: string): L.DivIcon {
	return L.divIcon({
		className: "transit-incident-marker",
		html: `<div class="transit-incident" style="--inc-color:${color}">${emoji}</div>`,
		iconSize: [36, 36],
		iconAnchor: [18, 18],
		popupAnchor: [0, -18],
	});
}

/** Next arrivals at a stop, loaded when its popup opens (OmniMove: live OBU data merged with the timetable). */
export function StopArrivals({ stopId, limit = 5 }: { stopId: string; limit?: number }) {
	const [arrivals, setArrivals] = useState<TransitArrival[] | null>(null);
	useEffect(() => {
		let cancelled = false;
		api.get<TransitArrival[]>(`/api/integrations/cassitrack/stops/${stopId}/arrivals?limit=${limit}`)
			.then((res) => !cancelled && setArrivals(res.data))
			.catch(() => !cancelled && setArrivals([]));
		return () => {
			cancelled = true;
		};
	}, [stopId, limit]);

	if (arrivals === null) return <CircularProgress size={18} sx={{ my: 1 }} />;
	if (arrivals.length === 0) return <Typography variant="caption" color="text.secondary">Nessun passaggio nei prossimi 90 minuti</Typography>;
	return (
		<Stack spacing={0.5}>
			{arrivals.map((a) => {
				const crowd = crowding(a.crowdingLevel);
				return (
					<Box key={a.tripId + a.estimatedArrival} sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.25 }}>
						<Box sx={{ minWidth: 30, textAlign: "center", borderRadius: 1, bgcolor: a.color, color: "#fff", fontWeight: 800, fontSize: 12, py: 0.25 }}>
							{a.routeShortName}
						</Box>
						<Box sx={{ flex: 1, minWidth: 0 }}>
							<Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.2 }}>
								{a.minutes <= 0 ? "In arrivo" : `${a.minutes} min`}{" "}
								<Typography component="span" variant="caption" color="text.secondary">· {formatClock(a.estimatedArrival)}</Typography>
							</Typography>
							<Typography variant="caption" sx={{ color: a.isRealtime ? scheduleStatus(a.delayMinutes > 7 ? "LATE" : a.delayMinutes > 2 ? "SLIGHT_DELAY" : "ON_TIME").color : "text.secondary" }}>
								{a.isRealtime ? (a.delayMinutes > 0 ? `Live · +${a.delayMinutes} min` : "Live · in orario") : "Da orario"}
								{crowd ? ` · ${crowd.icon} ${crowd.label}` : ""}
								{a.accessible ? " · ♿" : ""}
							</Typography>
						</Box>
					</Box>
				);
			})}
		</Stack>
	);
}

function FlyToCity({ network, focusKey }: { network: TransitNetwork; focusKey: number }) {
	const map = useMap();
	useEffect(() => {
		if (focusKey === 0) return;
		map.flyTo([network.centerLat, network.centerLon], 15, { duration: 1.2 });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [focusKey]);
	return null;
}

/** TPL layer from CassiTrack: ring lines, stops with live arrivals, buses coloured by delay, active incidents. */
export default function TransitLayer({ network, focusKey }: { network: TransitNetwork; focusKey: number }) {
	const stops: TransitStop[] = uniqueStops(network.routes);
	const routeById = new Map(network.routes.map((r) => [r.id, r]));

	return (
		<>
			<FlyToCity network={network} focusKey={focusKey} />
			{network.routes.map((r) => (
				<Polyline
					key={r.id}
					positions={[...r.stops.map((s) => [s.lat, s.lon] as [number, number]), [r.stops[0].lat, r.stops[0].lon]]}
					pathOptions={{ color: r.color, weight: 5, opacity: 0.75, dashArray: r.status === "DISRUPTED" ? "10 8" : undefined }}
				>
					<Tooltip sticky>
						<strong>{lineLabel(r.shortName)}</strong> · {r.longName}
					</Tooltip>
				</Polyline>
			))}

			{network.incidents.map((i) => {
				const type = incidentType(i.type);
				const color = INCIDENT_SEVERITY_COLOR[i.severity] ?? "#ef6c00";
				return (
					<Fragment key={i.id}>
						<Circle center={[i.lat, i.lon]} radius={i.radiusMeters} pathOptions={{ color, fillColor: color, fillOpacity: 0.12, weight: 2, dashArray: "4 6" }} />
						<Marker position={[i.lat, i.lon]} icon={incidentIcon(type.emoji, color)} zIndexOffset={900}>
							<Popup>
								<Box sx={{ minWidth: 250, maxWidth: 300 }}>
									<Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.25 }}>{type.emoji} {i.title}</Typography>
									<Typography variant="caption" color="text.secondary">
										{type.label} · dalle {formatClock(i.reportedAt)} alle {formatClock(i.expectedEndAt)}
									</Typography>
									{i.description && <Typography variant="body2" sx={{ mt: 1 }}>{i.description}</Typography>}
									<Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: "wrap", rowGap: 0.5 }}>
										{i.routeIds.map((id) => {
											const r = routeById.get(id);
											return <Chip key={id} size="small" label={r ? lineLabel(r.shortName) : id} sx={{ bgcolor: r?.color, color: "#fff", fontWeight: 700 }} />;
										})}
										{i.expectedDelayMinutes > 0 && <Chip size="small" variant="outlined" color="error" label={`+${i.expectedDelayMinutes} min`} />}
									</Stack>
									{i.detour && <Typography variant="body2" sx={{ mt: 1 }}>↪️ {i.detour}</Typography>}
									<Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>
										Fonte: CassiTrack ({i.source === "SOLI" ? "segnalazione volontario SOLI" : i.source === "DRIVER" ? "conducente" : i.source === "FLEET_MANAGER" ? "fleet manager" : "ente esterno"})
									</Typography>
								</Box>
							</Popup>
						</Marker>
					</Fragment>
				);
			})}

			{stops.map((s) => (
				<CircleMarker key={s.id} center={[s.lat, s.lon]} radius={6} pathOptions={{ color: "#263238", weight: 2, fillColor: "#fff", fillOpacity: 1 }}>
					<Tooltip direction="top" offset={[0, -6]}>🚏 {s.name}</Tooltip>
					<Popup>
						<Box sx={{ minWidth: 240 }}>
							<Typography variant="subtitle1" fontWeight={800}>🚏 {s.name}</Typography>
							<Stack direction="row" spacing={0.5} sx={{ my: 0.75 }}>
								{s.routeIds.map((id) => {
									const r = routeById.get(id);
									return <Chip key={id} size="small" label={r ? lineLabel(r.shortName) : id} sx={{ bgcolor: r?.color, color: "#fff", fontWeight: 700 }} />;
								})}
							</Stack>
							<Typography variant="caption" fontWeight={700} color="text.secondary" component="div" sx={{ mb: 0.5 }}>PROSSIMI ARRIVI</Typography>
							<StopArrivals stopId={s.id} />
						</Box>
					</Popup>
				</CircleMarker>
			))}

			{network.vehicles.map((v) => {
				const status = scheduleStatus(v.scheduleStatus);
				const crowd = crowding(v.crowdingLevel);
				return (
					<Marker key={v.vehicleId} position={[v.lat, v.lon]} icon={busIcon(v.color, v.routeShortName, v.delayMinutes)} zIndexOffset={1300}>
						<Tooltip direction="top" offset={[0, -14]}>
							<strong>{lineLabel(v.routeShortName)}</strong> · {v.vehicleId}
							<br />
							<span style={{ color: status.color, fontWeight: 700 }}>● {status.label}{v.delayMinutes > 0 ? ` (+${v.delayMinutes} min)` : ""}</span>
						</Tooltip>
						<Popup>
							<Box sx={{ minWidth: 240 }}>
								<Stack direction="row" spacing={1} alignItems="center">
									<Box sx={{ px: 1, borderRadius: 1, bgcolor: v.color, color: "#fff", fontWeight: 800 }}>{v.routeShortName}</Box>
									<Typography variant="subtitle1" fontWeight={800}>{v.vehicleId}</Typography>
									<Chip size="small" label={status.label} sx={{ bgcolor: status.color, color: "#fff", fontWeight: 700 }} />
								</Stack>
								<Typography variant="body2" sx={{ mt: 1 }}>
									Prossima fermata: <strong>{v.nextStopName}</strong> tra {Math.max(1, Math.round(v.etaSeconds / 60))} min
								</Typography>
								<Typography variant="body2">Ritardo: <strong style={{ color: delayColor(v.delayMinutes) }}>{v.delayMinutes > 0 ? `+${v.delayMinutes} min` : "in orario"}</strong> · {Math.round(v.speedKmh)} km/h</Typography>
								<Typography variant="body2">
									Passeggeri stimati: <strong>{v.estimatedPassengers}</strong>/{v.seats} {crowd ? `· ${crowd.icon} ${crowd.label}` : ""}
								</Typography>
								<Typography variant="body2">{v.accessible ? "♿ Posto riservato a persone con disabilità" : "Senza posti riservati a persone con disabilità"}</Typography>
								<Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.75 }}>
									Fonte: OBU CassiTrack · {v.licensePlate ?? ""} · aggiornato {formatClock(v.timestamp)}
								</Typography>
							</Box>
						</Popup>
					</Marker>
				);
			})}
		</>
	);
}
