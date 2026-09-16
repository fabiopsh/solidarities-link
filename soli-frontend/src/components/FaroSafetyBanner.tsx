import { useEffect, useState } from "react";
import { Alert, AlertTitle, Box, Typography } from "@mui/material";
import api from "../api";
import type { FaroTaskSafety } from "../types/models/FaroEmergency";
import { faroCategory, faroSeverity } from "../utils/faro";
import { formatDistance } from "../utils/location";

const POLL_INTERVAL_MS = 15000;

/** Warns when the task lies inside (or next to) the risk perimeter of an active FARO emergency. */
export default function FaroSafetyBanner({ taskId }: { taskId: string }) {
	const [safety, setSafety] = useState<FaroTaskSafety | null>(null);

	useEffect(() => {
		let cancelled = false;
		const load = async () => {
			try {
				const res = await api.get<FaroTaskSafety>(`/api/integrations/faro/tasks/${taskId}/safety`);
				if (!cancelled) setSafety(res.data);
			} catch {
				// integration unavailable: no banner
			}
		};
		load();
		const timer = setInterval(load, POLL_INTERVAL_MS);
		return () => {
			cancelled = true;
			clearInterval(timer);
		};
	}, [taskId]);

	if (!safety || safety.nearbyEmergencies.length === 0) return null;

	const nearest = safety.nearbyEmergencies[0];
	const cat = faroCategory(nearest.category);

	return (
		<Alert
			severity={safety.inRiskArea ? "error" : "warning"}
			icon={<Typography fontSize={26} lineHeight={1}>{cat.emoji}</Typography>}
			sx={{ mb: 3, borderRadius: 2, alignItems: "flex-start" }}
		>
			<AlertTitle sx={{ fontWeight: 800 }}>
				{safety.inRiskArea ? "Task in area a rischio: non recarti sul posto" : "Emergenza attiva nelle vicinanze"}
			</AlertTitle>
			{safety.nearbyEmergencies.map((e) => (
				<Box key={e.id} sx={{ mb: 0.5 }}>
					<Typography variant="body2">
						<strong>{faroCategory(e.category).label}</strong> (gravità {faroSeverity(e.severity).label.toLowerCase()}) a{" "}
						{formatDistance((e.distanceMeters ?? 0) / 1000)}
						{e.address ? ` · ${e.address}` : ""}
					</Typography>
				</Box>
			))}
			<Typography variant="body2" sx={{ mt: 1 }}>
				{safety.inRiskArea
					? "La Protezione Civile sta gestendo l'evento tramite FARO. Contatta il richiedente in chat e attendi indicazioni prima di muoverti."
					: "Segui le indicazioni della Protezione Civile e resta fuori dal perimetro segnalato."}
			</Typography>
			<Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
				Fonte: FARO – First Alert and Response Orchestration
			</Typography>
		</Alert>
	);
}
