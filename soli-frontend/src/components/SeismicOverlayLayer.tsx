import { useEffect, useRef } from "react";
import { Box, Typography } from "@mui/material";
import { Circle, Marker, Popup, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import type { BuildingKpi, SeismicOverlay } from "../types/models/SeismicOverlay";
import { alertLevel, buildingType, formatEventDate, formatMg } from "../utils/seismic";

function epicenterIcon(magnitude: number): L.DivIcon {
	return L.divIcon({
		className: "seismic-epicenter-marker",
		html: `<div class="seismic-epicenter"><span>M${magnitude.toFixed(1)}</span></div>`,
		iconSize: [56, 56],
		iconAnchor: [28, 28],
		popupAnchor: [0, -26],
	});
}

/** Colour = Urban Sentinel alert level; size = measured peak resultant, relative to the strongest building of the event. */
function buildingIcon(b: BuildingKpi, maxPeakMg: number): L.DivIcon {
	const level = alertLevel(b.alertLevel);
	const relative = maxPeakMg > 0 && b.peakResultantMg != null ? b.peakResultantMg / maxPeakMg : 0;
	const size = Math.round(30 + 26 * relative);
	const pulse = b.alertLevel === "RED" ? " critical" : "";
	return L.divIcon({
		className: "seismic-building-marker",
		html: `<div class="seismic-building${pulse}" style="--us-color:${level.color};width:${size}px;height:${size}px;font-size:${Math.round(size * 0.5)}px">${buildingType(b.buildingType).emoji}</div>`,
		iconSize: [size, size],
		iconAnchor: [size / 2, size / 2],
		popupAnchor: [0, -size / 2],
	});
}

/** Centres the map on the epicentre when another event is loaded or when the user asks for it. */
function FlyToEvent({ overlay, focusKey }: { overlay: SeismicOverlay; focusKey: number }) {
	const map = useMap();
	const shownEventId = useRef(overlay.event.id);
	const { id, latitude, longitude } = overlay.event;

	useEffect(() => {
		if (shownEventId.current === id) return;
		shownEventId.current = id;
		map.flyTo([latitude, longitude], 12, { duration: 1.2 });
	}, [map, id, latitude, longitude]);

	useEffect(() => {
		if (focusKey === 0) return;
		map.flyTo([latitude, longitude], 12, { duration: 1.2 });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [focusKey]);

	return null;
}

/** Post-earthquake overlay: epicentre, affected area and monitored buildings weighted by damage KPIs. */
export default function SeismicOverlayLayer({
	overlay,
	focusKey,
	onSelectBuilding,
}: {
	overlay: SeismicOverlay;
	focusKey: number;
	onSelectBuilding: (building: BuildingKpi) => void;
}) {
	const { event } = overlay;
	const maxPeakMg = Math.max(0, ...overlay.buildings.map((b) => b.peakResultantMg ?? 0));
	return (
		<>
			<FlyToEvent overlay={overlay} focusKey={focusKey} />
			<Circle
				center={[event.latitude, event.longitude]}
				radius={event.affectedRadiusKm * 1000}
				pathOptions={{ color: "#ef6c00", fillColor: "#ff9800", fillOpacity: 0.06, weight: 2, dashArray: "8 6" }}
			/>
			<Circle
				center={[event.latitude, event.longitude]}
				radius={Math.min(event.affectedRadiusKm * 1000, 3000)}
				pathOptions={{ color: "#e65100", fillColor: "#ff6d00", fillOpacity: 0.12, weight: 1 }}
			/>
			<Marker position={[event.latitude, event.longitude]} icon={epicenterIcon(event.magnitude)} zIndexOffset={1500}>
				<Popup>
					<Box sx={{ minWidth: 240 }}>
						<Typography variant="subtitle1" fontWeight={800}>Epicentro · M {event.magnitude.toFixed(1)}</Typography>
						<Typography variant="body2">{event.address}</Typography>
						<Typography variant="body2" color="text.secondary">
							{formatEventDate(event.occurredAt)} · profondità {event.depthKm.toLocaleString("it-IT")} km
						</Typography>
						<Typography variant="body2" sx={{ mt: 0.5 }}>
							Area interessata: raggio {event.affectedRadiusKm} km · {overlay.summary.monitoredBuildings} edifici monitorati
						</Typography>
						<Typography variant="caption" color="text.secondary">Fonte: INGV via Urban Sentinel</Typography>
					</Box>
				</Popup>
			</Marker>
			{overlay.buildings.map((b) => {
				const level = alertLevel(b.alertLevel);
				return (
					<Marker
						key={b.id}
						position={[b.latitude, b.longitude]}
						icon={buildingIcon(b, maxPeakMg)}
						zIndexOffset={b.alertLevel === "RED" ? 1200 : 1100}
						eventHandlers={{ click: () => onSelectBuilding(b) }}
					>
						<Tooltip direction="top" offset={[0, -18]}>
							<strong>{b.name}</strong>
							<br />
							<span style={{ color: level.color, fontWeight: 700 }}>● {level.short}</span> · risultante picco {formatMg(b.peakResultantMg)}
							<br />
							<span style={{ opacity: 0.7 }}>Clicca per la scheda completa</span>
						</Tooltip>
					</Marker>
				);
			})}
		</>
	);
}
