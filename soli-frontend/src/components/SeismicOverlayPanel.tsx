import { Box, Button, Chip, FormControlLabel, MenuItem, Stack, Switch, TextField, Typography } from "@mui/material";
import type { SeismicEvent, SeismicOverlay } from "../types/models/SeismicOverlay";
import { ALERT_LEVEL_CONFIG, eventLabel } from "../utils/seismic";

interface Props {
	events: SeismicEvent[];
	selectedId: string | null;
	onSelect: (id: string) => void;
	overlay: SeismicOverlay | null;
	visible: boolean;
	onToggle: (visible: boolean) => void;
	onFocus: () => void;
}

/** Controls and summary of the Urban Sentinel post-earthquake overlay. */
export default function SeismicOverlayPanel({ events, selectedId, onSelect, overlay, visible, onToggle, onFocus }: Props) {
	if (events.length === 0) return null;
	const s = overlay?.summary;
	return (
		<Box
			sx={{
				mb: 1.5,
				px: 2,
				py: 1.25,
				borderRadius: 2,
				border: "1px solid",
				borderColor: s && s.red > 0 ? "warning.main" : "divider",
				bgcolor: s && s.red > 0 ? "rgba(239,108,0,0.06)" : "background.paper",
			}}
		>
			<Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} justifyContent="space-between">
				<Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexWrap: "wrap", rowGap: 1 }}>
					<Typography variant="body2" fontWeight={800}>🌍 Post-sisma · Urban Sentinel</Typography>
					<TextField
						select
						size="small"
						value={selectedId ?? ""}
						onChange={(e) => {
							onSelect(e.target.value);
							onToggle(true);
						}}
						sx={{ minWidth: 300 }}
					>
						{events.map((e) => (
							<MenuItem key={e.id} value={e.id}>{eventLabel(e)}</MenuItem>
						))}
					</TextField>
					<Button size="small" variant="outlined" color="warning" onClick={onFocus} sx={{ fontWeight: 700, textTransform: "none" }}>
						Vai all'epicentro
					</Button>
				</Stack>
				<FormControlLabel
					control={<Switch size="small" color="warning" checked={visible} onChange={(e) => onToggle(e.target.checked)} />}
					label={<Typography variant="caption" fontWeight={700}>Mostra overlay</Typography>}
				/>
			</Stack>
			{s && overlay && (
				<Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1, flexWrap: "wrap", rowGap: 0.75 }}>
					<Typography variant="caption" color="text.secondary">
						Profondità {overlay.event.depthKm.toLocaleString("it-IT")} km · area {overlay.event.affectedRadiusKm} km · {s.monitoredBuildings} edifici monitorati:
					</Typography>
					<Chip size="small" label={`${s.red} critici`} sx={{ bgcolor: ALERT_LEVEL_CONFIG.RED.color, color: "#fff", fontWeight: 700 }} />
					<Chip size="small" label={`${s.yellow} in attenzione`} sx={{ bgcolor: ALERT_LEVEL_CONFIG.YELLOW.color, color: "#fff", fontWeight: 700 }} />
					<Chip size="small" label={`${s.green} normali`} sx={{ bgcolor: ALERT_LEVEL_CONFIG.GREEN.color, color: "#fff", fontWeight: 700 }} />
					{s.occupantsInRedBuildings + s.occupantsInYellowBuildings > 0 && (
						<Typography variant="caption" fontWeight={700}>
							👥 {s.occupantsInRedBuildings + s.occupantsInYellowBuildings} occupanti in edifici da verificare
						</Typography>
					)}
					<Typography variant="caption" color="text.secondary">
						· colore = livello di allerta Urban Sentinel, dimensione = risultante di picco rilevata
					</Typography>
				</Stack>
			)}
		</Box>
	);
}
