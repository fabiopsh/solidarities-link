import { Alert, AlertTitle, Button, Chip, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useFaroEmergencies } from "../hooks/useFaroEmergencies";
import { useUserLocation } from "../hooks/useUserLocation";
import type { Task } from "../types/models/Task";
import { faroCategory, faroSeverity } from "../utils/faro";
import { formatDistance, haversineKm } from "../utils/location";

const NEARBY_KM = 15;

/** Volunteer dashboard: active FARO emergencies around the user and open Civil Protection requests. */
export default function FaroNearbyBanner({ tasks }: { tasks: Task[] }) {
	const navigate = useNavigate();
	const { emergencies } = useFaroEmergencies();
	const { coords } = useUserLocation();

	const nearby = emergencies
		.map((e) => ({ e, km: coords ? haversineKm(coords[0], coords[1], e.latitude, e.longitude) : null }))
		.filter(({ km }) => km == null || km <= NEARBY_KM)
		.sort((a, b) => (a.km ?? 0) - (b.km ?? 0));
	const faroRequests = tasks.filter((t) => t.externalSource === "FARO" && t.status === "OPEN");

	if (nearby.length === 0 && faroRequests.length === 0) return null;

	return (
		<Alert
			severity="error"
			variant="outlined"
			icon={<Typography fontSize={28} lineHeight={1}>🚨</Typography>}
			sx={{ mb: 4, borderRadius: 3, bgcolor: "rgba(211,47,47,0.04)", "& .MuiAlert-message": { width: "100%" } }}
			action={
				<Button color="error" variant="contained" disableElevation sx={{ fontWeight: 800, borderRadius: 2, whiteSpace: "nowrap" }} onClick={() => navigate("/dashboard/requests")}>
					Apri mappa
				</Button>
			}
		>
			<AlertTitle sx={{ fontWeight: 900 }}>
				{nearby.length > 0 ? `${nearby.length} emergenz${nearby.length === 1 ? "a attiva" : "e attive"} vicino a te` : "Richieste della Protezione Civile"}
			</AlertTitle>
			<Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1, mb: faroRequests.length > 0 ? 1.5 : 0 }}>
				{nearby.slice(0, 4).map(({ e, km }) => (
					<Chip
						key={e.id}
						label={`${faroCategory(e.category).emoji} ${faroCategory(e.category).label}${km != null ? " · " + formatDistance(km) : ""}`}
						sx={{ fontWeight: 700, borderColor: faroSeverity(e.severity).color, borderWidth: 2 }}
						variant="outlined"
					/>
				))}
			</Stack>
			{faroRequests.length > 0 && (
				<Typography variant="body2" fontWeight={600}>
					La Protezione Civile ha chiesto supporto a SOLI tramite FARO: {faroRequests.length} task in attesa di volontari.
				</Typography>
			)}
			<Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
				Non avvicinarti alle aree a rischio. Fonte: FARO – First Alert and Response Orchestration
			</Typography>
		</Alert>
	);
}
