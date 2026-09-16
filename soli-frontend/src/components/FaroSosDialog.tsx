import { useState } from "react";
import {
	Alert,
	Box,
	Button,
	Checkbox,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControlLabel,
	FormGroup,
	TextField,
	ToggleButton,
	ToggleButtonGroup,
	Typography,
} from "@mui/material";
import { isAxiosError } from "axios";
import api from "../api";
import type { Task } from "../types/models/Task";
import type { FaroEmergencyCategory, FaroSosRequest, FaroSosResponse } from "../types/models/FaroEmergency";
import { FARO_CATEGORY_CONFIG } from "../utils/faro";

const CONTEXT_FLAGS: { key: keyof FaroSosRequest; label: string }[] = [
	{ key: "hasInjured", label: "Ci sono feriti" },
	{ key: "hasUnconscious", label: "Persone prive di conoscenza" },
	{ key: "hasTrapped", label: "Persone intrappolate" },
	{ key: "hasBuildingCollapse", label: "Crollo di edifici" },
	{ key: "hasSpecialVehicleInvolved", label: "Coinvolti mezzi pesanti/speciali" },
];

const EMPTY_REQUEST: FaroSosRequest = {
	emergencyCategory: "HEALTH_CRISIS",
	description: "",
	hasInjured: false,
	hasUnconscious: false,
	hasTrapped: false,
	hasSpecialVehicleInvolved: false,
	hasBuildingCollapse: false,
};

/** SOS during an active task: forwarded by SOLI to FARO as an authenticated report (POST /api/reports). */
export default function FaroSosDialog({ task, open, onClose }: { task: Task; open: boolean; onClose: () => void }) {
	const [request, setRequest] = useState<FaroSosRequest>(EMPTY_REQUEST);
	const [sending, setSending] = useState(false);
	const [result, setResult] = useState<FaroSosResponse | null>(null);
	const [error, setError] = useState<string | null>(null);

	const handleClose = () => {
		onClose();
		setTimeout(() => {
			setRequest(EMPTY_REQUEST);
			setResult(null);
			setError(null);
		}, 300);
	};

	const handleSend = async () => {
		setSending(true);
		setError(null);
		try {
			const res = await api.post<FaroSosResponse>(`/api/integrations/faro/tasks/${task.id}/sos`, request);
			setResult(res.data);
		} catch (err) {
			const message = isAxiosError<{ error?: string }>(err) ? err.response?.data?.error : undefined;
			setError(message ?? "Invio non riuscito. Chiama subito il 112.");
		} finally {
			setSending(false);
		}
	};

	return (
		<Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
			<DialogTitle sx={{ fontWeight: 900, bgcolor: "error.main", color: "#fff" }}>🆘 SOS – Segnala un'emergenza</DialogTitle>
			<DialogContent sx={{ pt: "20px !important" }}>
				<Alert severity="warning" sx={{ mb: 2 }}>
					Se qualcuno è in pericolo di vita <strong>chiama subito il 112</strong>. La segnalazione viene inoltrata alla
					Protezione Civile tramite la piattaforma FARO.
				</Alert>

				{result ? (
					<Box>
						<Alert severity="success" sx={{ mb: 2 }}>
							<strong>Segnalazione inoltrata a FARO ({result.httpStatus} Accepted).</strong> {result.message}
						</Alert>
						<Typography variant="caption" color="text.secondary" fontWeight={700}>
							{result.endpoint} · payload inviato
						</Typography>
						<Box
							component="pre"
							sx={{
								mt: 0.5,
								p: 1.5,
								borderRadius: 1.5,
								bgcolor: "grey.900",
								color: "grey.100",
								fontSize: "0.72rem",
								overflowX: "auto",
								maxHeight: 260,
							}}
						>
							{JSON.stringify(result.report, null, 2)}
						</Box>
					</Box>
				) : (
					<>
						<Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
							Che cosa sta succedendo?
						</Typography>
						<ToggleButtonGroup
							exclusive
							value={request.emergencyCategory}
							onChange={(_, value: FaroEmergencyCategory | null) => value && setRequest({ ...request, emergencyCategory: value })}
							sx={{ flexWrap: "wrap", gap: 1, mb: 2, "& .MuiToggleButton-root": { borderRadius: "10px !important", border: "1px solid", borderColor: "divider", textTransform: "none", fontWeight: 700 } }}
						>
							{(Object.keys(FARO_CATEGORY_CONFIG) as FaroEmergencyCategory[])
								.filter((key) => key !== "UNKNOWN")
								.map((key) => (
									<ToggleButton key={key} value={key}>
										{FARO_CATEGORY_CONFIG[key].emoji}&nbsp;{FARO_CATEGORY_CONFIG[key].label}
									</ToggleButton>
								))}
						</ToggleButtonGroup>

						<FormGroup sx={{ mb: 2 }}>
							{CONTEXT_FLAGS.map((flag) => (
								<FormControlLabel
									key={flag.key}
									control={
										<Checkbox
											color="error"
											checked={Boolean(request[flag.key])}
											onChange={(e) => setRequest({ ...request, [flag.key]: e.target.checked })}
										/>
									}
									label={flag.label}
								/>
							))}
						</FormGroup>

						<TextField
							label="Descrizione (opzionale)"
							multiline
							minRows={2}
							fullWidth
							value={request.description}
							onChange={(e) => setRequest({ ...request, description: e.target.value })}
							sx={{ mb: 2 }}
						/>

						<Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "action.hover" }}>
							<Typography variant="caption" color="text.secondary" display="block" fontWeight={700}>
								Posizione inviata automaticamente dal task
							</Typography>
							<Typography variant="body2">📍 {task.targetAddress || task.targetLocation || "Indirizzo non disponibile"}</Typography>
							{task.latitude != null && task.longitude != null && (
								<Typography variant="caption" color="text.secondary">
									{task.latitude.toFixed(5)}, {task.longitude.toFixed(5)}
								</Typography>
							)}
						</Box>

						{error && (
							<Alert severity="error" sx={{ mt: 2 }}>
								{error}
							</Alert>
						)}
					</>
				)}
			</DialogContent>
			<DialogActions sx={{ px: 3, pb: 2 }}>
				<Button onClick={handleClose} sx={{ fontWeight: 700 }}>
					{result ? "Chiudi" : "Annulla"}
				</Button>
				{!result && (
					<Button
						variant="contained"
						color="error"
						onClick={handleSend}
						disabled={sending}
						startIcon={sending ? <CircularProgress size={18} color="inherit" /> : undefined}
						sx={{ fontWeight: 800, borderRadius: 2 }}
						disableElevation
					>
						{sending ? "Invio a FARO..." : "Invia SOS"}
					</Button>
				)}
			</DialogActions>
		</Dialog>
	);
}
