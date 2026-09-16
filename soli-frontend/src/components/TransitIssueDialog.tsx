import { useState } from "react";
import {
	Alert,
	Button,
	Checkbox,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControlLabel,
	MenuItem,
	Stack,
	TextField,
	Typography,
} from "@mui/material";
import axios from "axios";
import api from "../api";
import { useTransitNetwork } from "../hooks/useTransitNetwork";
import type { TransitIncident } from "../types/models/Transit";
import { INCIDENT_TYPE_CONFIG, lineLabel } from "../utils/transit";

interface IssueResponse {
	incident: TransitIncident;
	requesterNotified: boolean;
	chatMessage?: string | null;
	endpoint: string;
}

/** Volunteer reports a route problem: sent to CassiTrack (incident alarm system) and optionally notified to the requester. */
export default function TransitIssueDialog({ taskId, open, onClose, onSent }: { taskId: string; open: boolean; onClose: () => void; onSent?: () => void }) {
	const network = useTransitNetwork(open);
	const [type, setType] = useState("ROAD_CLOSED");
	const [routeId, setRouteId] = useState("");
	const [delay, setDelay] = useState(10);
	const [description, setDescription] = useState("");
	const [notify, setNotify] = useState(true);
	const [sending, setSending] = useState(false);
	const [result, setResult] = useState<IssueResponse | null>(null);
	const [error, setError] = useState<string | null>(null);

	const close = () => {
		setResult(null);
		setError(null);
		onClose();
	};

	const send = async () => {
		setSending(true);
		setError(null);
		try {
			const res = await api.post<IssueResponse>(`/api/integrations/cassitrack/tasks/${taskId}/route-issues`, {
				type,
				routeId: routeId || null,
				description,
				expectedDelayMinutes: delay,
				notifyRequester: notify,
			});
			setResult(res.data);
			onSent?.();
		} catch (e) {
			setError((axios.isAxiosError(e) && e.response?.data?.error) || "Invio non riuscito");
		} finally {
			setSending(false);
		}
	};

	return (
		<Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
			<DialogTitle sx={{ fontWeight: 900 }}>🚌 Problema sul percorso</DialogTitle>
			<DialogContent>
				{result ? (
					<Stack spacing={2} sx={{ mt: 1 }}>
						<Alert severity="success">
							Segnalazione inviata a CassiTrack ({result.endpoint} → 201 Created, id {result.incident.id}). Il fleet manager la verificherà e,
							se confermata, sarà visibile a tutti i passeggeri della rete.
						</Alert>
						{result.requesterNotified && (
							<Alert severity="info">
								<Typography variant="body2" fontWeight={700}>Messaggio inviato al richiedente in chat:</Typography>
								<Typography variant="body2">“{result.chatMessage}”</Typography>
							</Alert>
						)}
					</Stack>
				) : (
					<Stack spacing={2} sx={{ mt: 1 }}>
						<Typography variant="body2" color="text.secondary">
							Strada chiusa, manifestazione, bus guasto? La segnalazione arriva al sistema di allarme incidenti di CassiTrack e aiuta gli
							altri volontari e i passeggeri della rete.
						</Typography>
						<TextField select label="Tipo di problema" value={type} onChange={(e) => setType(e.target.value)}>
							{Object.entries(INCIDENT_TYPE_CONFIG).map(([key, cfg]) => (
								<MenuItem key={key} value={key}>{cfg.emoji} {cfg.label}</MenuItem>
							))}
						</TextField>
						<TextField select label="Linea interessata" value={routeId} onChange={(e) => setRouteId(e.target.value)}>
							<MenuItem value="">Non so / nessuna linea</MenuItem>
							{network?.routes.map((r) => (
								<MenuItem key={r.id} value={r.id}>{lineLabel(r.shortName)} · {r.longName}</MenuItem>
							))}
						</TextField>
						<TextField
							type="number"
							label="Ritardo previsto (minuti)"
							value={delay}
							onChange={(e) => setDelay(Math.max(0, Math.min(60, Number(e.target.value))))}
						/>
						<TextField
							label="Descrizione"
							multiline
							minRows={2}
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Es. Via Garigliano chiusa per un incidente, il bus è deviato."
						/>
						<FormControlLabel
							control={<Checkbox checked={notify} onChange={(e) => setNotify(e.target.checked)} />}
							label="Avvisa il richiedente in chat del ritardo"
						/>
						{error && <Alert severity="error">{error}</Alert>}
					</Stack>
				)}
			</DialogContent>
			<DialogActions sx={{ px: 3, pb: 2 }}>
				<Button onClick={close}>{result ? "Chiudi" : "Annulla"}</Button>
				{!result && (
					<Button variant="contained" color="warning" disableElevation onClick={send} disabled={sending} sx={{ fontWeight: 800 }}>
						{sending ? "Invio..." : "Invia segnalazione"}
					</Button>
				)}
			</DialogActions>
		</Dialog>
	);
}
