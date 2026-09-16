import { useEffect, useState } from "react";
import { Alert, AlertTitle, Box, Button, Chip, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "../api";
import type { TransitAlert } from "../types/models/Transit";
import { formatClock, incidentType } from "../utils/transit";

const POLL_INTERVAL_MS = 60000;

/** Dashboard: TPL disruptions (CassiTrack) affecting the user's active tasks, grouped by task. */
export default function TransitAlertsBanner() {
	const navigate = useNavigate();
	const [alerts, setAlerts] = useState<TransitAlert[]>([]);

	useEffect(() => {
		let cancelled = false;
		const load = () =>
			api.get<TransitAlert[]>("/api/integrations/cassitrack/alerts/my")
				.then((res) => !cancelled && setAlerts(res.data))
				.catch(() => undefined);
		load();
		const timer = setInterval(load, POLL_INTERVAL_MS);
		return () => {
			cancelled = true;
			clearInterval(timer);
		};
	}, []);

	if (alerts.length === 0) return null;
	const byTask = new Map<string, TransitAlert[]>();
	alerts.forEach((a) => byTask.set(a.taskId, [...(byTask.get(a.taskId) ?? []), a]));

	return (
		<Alert
			severity="info"
			variant="outlined"
			icon={<Typography fontSize={28} lineHeight={1}>🚌</Typography>}
			sx={{ mb: 4, borderRadius: 3, bgcolor: "rgba(21,101,192,0.04)", "& .MuiAlert-message": { width: "100%" } }}
		>
			<AlertTitle sx={{ fontWeight: 900 }}>Disservizi TPL sui tuoi task di oggi</AlertTitle>
			<Stack spacing={1.5}>
				{[...byTask.entries()].map(([taskId, items]) => (
					<Box key={taskId} sx={{ display: "flex", gap: 2, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
						<Box sx={{ flex: 1, minWidth: 260 }}>
							<Typography variant="body2" fontWeight={800}>
								{items[0].taskTitle}
								{items[0].scheduledAt ? ` · ${formatClock(items[0].scheduledAt)}` : ""}
							</Typography>
							{items.map((a) => (
								<Stack key={a.incident.id} direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5, flexWrap: "wrap", rowGap: 0.5 }}>
									<Chip size="small" label={`${incidentType(a.incident.type).emoji} ${a.incident.title}`} sx={{ fontWeight: 700 }} />
									<Typography variant="caption" color="text.secondary">{a.impact}</Typography>
								</Stack>
							))}
							<Typography variant="caption" fontWeight={700} component="div" sx={{ mt: 0.5 }}>
								💡 {items[0].suggestion}
							</Typography>
						</Box>
						<Button variant="contained" color="info" disableElevation size="small" sx={{ fontWeight: 800, borderRadius: 2 }} onClick={() => navigate(`/dashboard/requests/${taskId}`)}>
							Apri task
						</Button>
					</Box>
				))}
			</Stack>
			<Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>
				Fonte: CassiTrack – avvisi di servizio e posizione live dei bus di Cassino
			</Typography>
		</Alert>
	);
}
