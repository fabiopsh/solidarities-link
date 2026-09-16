import { Alert, AlertTitle, Box, Button, Typography } from "@mui/material";
import type { TaskTransit } from "../types/models/Transit";
import { formatClock, incidentType } from "../utils/transit";

/** Route disruptions (CassiTrack) touching the trips of an active task. */
export default function TransitDisruptionBanner({ transit, onReport }: { transit: TaskTransit | null; onReport?: () => void }) {
	if (!transit?.covered || transit.disruptions.length === 0) return null;
	const worst = transit.disruptions[0].incident;
	return (
		<Alert
			severity="warning"
			icon={<Typography fontSize={26} lineHeight={1}>{incidentType(worst.type).emoji}</Typography>}
			sx={{ mb: 3, borderRadius: 2, alignItems: "flex-start", "& .MuiAlert-message": { width: "100%" } }}
		>
			<AlertTitle sx={{ fontWeight: 800 }}>Disservizi TPL sul percorso di questo task</AlertTitle>
			{transit.disruptions.map((d) => (
				<Box key={d.incident.id} sx={{ mb: 0.75 }}>
					<Typography variant="body2">
						<strong>{d.incident.title}</strong> (fino alle {formatClock(d.incident.expectedEndAt)}) — {d.impact}
					</Typography>
					{d.suggestion && (
						<Typography variant="body2" color="text.secondary">↪️ {d.suggestion}</Typography>
					)}
				</Box>
			))}
			{onReport && (
				<Button color="warning" variant="contained" size="small" disableElevation onClick={onReport} sx={{ fontWeight: 800, my: 0.75 }}>
					Segnala un problema / avvisa il richiedente
				</Button>
			)}
			<Typography variant="caption" color="text.secondary" component="div">
				Fonte: CassiTrack – avvisi di servizio della rete TPL di Cassino
			</Typography>
		</Alert>
	);
}
