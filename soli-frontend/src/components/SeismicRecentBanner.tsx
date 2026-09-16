import { useState } from "react";
import { Alert, AlertTitle, Button, Chip, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useSeismicOverlay } from "../hooks/useSeismicOverlay";
import { ALERT_LEVEL_CONFIG, buildingType, formatEventDate } from "../utils/seismic";

const RECENT_DAYS = 7;

/** Volunteer dashboard: latest earthquake reported by Urban Sentinel and the buildings to be checked. */
export default function SeismicRecentBanner() {
	const navigate = useNavigate();
	const { overlay } = useSeismicOverlay();
	const [now] = useState(() => Date.now());

	if (!overlay) return null;
	const ageDays = (now - new Date(overlay.event.occurredAt).getTime()) / 86400000;
	if (ageDays > RECENT_DAYS) return null;

	const { event, summary } = overlay;
	const toCheck = overlay.buildings.filter((b) => b.alertLevel === "RED" || b.alertLevel === "YELLOW");

	return (
		<Alert
			severity="warning"
			variant="outlined"
			icon={<Typography fontSize={28} lineHeight={1}>🌍</Typography>}
			sx={{ mb: 4, borderRadius: 3, bgcolor: "rgba(239,108,0,0.04)", "& .MuiAlert-message": { width: "100%" } }}
			action={
				<Button color="warning" variant="contained" disableElevation sx={{ fontWeight: 800, borderRadius: 2, whiteSpace: "nowrap" }} onClick={() => navigate("/dashboard/requests")}>
					Vedi overlay
				</Button>
			}
		>
			<AlertTitle sx={{ fontWeight: 900 }}>
				Terremoto M {event.magnitude.toFixed(1)} · {event.place} ({event.province}) – {formatEventDate(event.occurredAt)}
			</AlertTitle>
			<Typography variant="body2" sx={{ mb: 1 }}>
				Urban Sentinel ha analizzato {summary.monitoredBuildings} edifici pubblici nell'area: {summary.red} con livello di allerta rosso, {summary.yellow} con livello giallo.
			</Typography>
			<Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
				{toCheck.slice(0, 4).map((b) => (
					<Chip
						key={b.id}
						variant="outlined"
						label={`${buildingType(b.buildingType).emoji} ${b.name} · ${ALERT_LEVEL_CONFIG[b.alertLevel].short}`}
						sx={{ fontWeight: 700, borderWidth: 2, borderColor: ALERT_LEVEL_CONFIG[b.alertLevel].color }}
					/>
				))}
			</Stack>
			<Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.75 }}>
				Evita di fissare task negli edifici segnalati finché non sono stati verificati. Fonte: Urban Sentinel – Structural Health Monitoring
			</Typography>
		</Alert>
	);
}
