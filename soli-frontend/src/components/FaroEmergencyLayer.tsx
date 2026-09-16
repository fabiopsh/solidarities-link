import { Fragment } from "react";
import { Box, Chip, Stack, Typography } from "@mui/material";
import { Circle, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import type { FaroEmergency } from "../types/models/FaroEmergency";
import { faroCategory, faroSeverity } from "../utils/faro";

function createEmergencyIcon(emergency: FaroEmergency): L.DivIcon {
	const cat = faroCategory(emergency.category);
	const critical = emergency.severity === "CRITICAL" ? " critical" : "";
	return L.divIcon({
		className: "faro-emergency-marker",
		html: `<div class="faro-emergency-pin${critical}" style="--faro-color:${faroSeverity(emergency.severity).color}">${cat.emoji}</div>`,
		iconSize: [44, 44],
		iconAnchor: [22, 22],
		popupAnchor: [0, -22],
	});
}

const minutesAgo = (iso: string) => {
	const diff = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
	return diff === 0 ? "adesso" : `${diff} min fa`;
};

/** Active emergencies from FARO: category marker + risk perimeter scaled on severity. */
export default function FaroEmergencyLayer({ emergencies }: { emergencies: FaroEmergency[] }) {
	return (
		<>
			{emergencies.map((e) => {
				const cat = faroCategory(e.category);
				const sev = faroSeverity(e.severity);
				const context = [e.hasInjured && "feriti", e.hasUnconscious && "persone incoscienti", e.hasTrapped && "persone intrappolate"].filter(Boolean);
				return (
					<Fragment key={e.id}>
						<Circle
							center={[e.latitude, e.longitude]}
							radius={e.riskRadiusMeters}
							pathOptions={{ color: sev.color, fillColor: sev.color, fillOpacity: 0.12, weight: 2, dashArray: "6 6" }}
						/>
						<Marker position={[e.latitude, e.longitude]} icon={createEmergencyIcon(e)} zIndexOffset={1000}>
							<Popup>
								<Box sx={{ minWidth: 260, maxWidth: 300, p: 0.5 }}>
									<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
										<Typography fontSize={26} lineHeight={1}>{cat.emoji}</Typography>
										<Box>
											<Typography variant="subtitle1" fontWeight={800} sx={{ color: cat.color, lineHeight: 1.2 }}>
												{cat.label}
											</Typography>
											<Typography variant="caption" color="text.secondary">
												Emergenza attiva · aggiornata {minutesAgo(e.lastUpdateAt)}
											</Typography>
										</Box>
									</Stack>
									<Stack direction="row" spacing={0.75} sx={{ mb: 1.25, flexWrap: "wrap", rowGap: 0.75 }}>
										<Chip size="small" label={`Gravità ${sev.label}`} sx={{ bgcolor: sev.color, color: "#fff", fontWeight: 700 }} />
										{e.faroStatus === "IN_PROGRESS" && <Chip size="small" variant="outlined" label="Soccorsi in corso" />}
										{e.engaged && <Chip size="small" color="primary" label="SOLI ingaggiato" />}
									</Stack>
									{e.address && (
										<Typography variant="body2" sx={{ mb: 0.75 }}>
											📍 {e.address}
										</Typography>
									)}
									{context.length > 0 && (
										<Typography variant="body2" sx={{ mb: 0.75 }}>
											🩹 Segnalati: {context.join(", ")}
										</Typography>
									)}
									<Typography variant="body2" color="error.main" fontWeight={600} sx={{ mb: 1 }}>
										⛔ Area a rischio: {e.riskRadiusMeters} m. Non avvicinarti.
									</Typography>
									<Typography variant="caption" color="text.secondary" component="div">
										Fonte: FARO · attendibilità {e.confidence != null ? Math.round(e.confidence * 100) + "%" : "n.d."}
									</Typography>
								</Box>
							</Popup>
						</Marker>
					</Fragment>
				);
			})}
		</>
	);
}
