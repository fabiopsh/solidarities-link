import { Box, Button, Chip, FormControlLabel, Stack, Switch, Typography } from "@mui/material";
import type { TransitNetwork } from "../types/models/Transit";
import { incidentType, lineLabel, ROUTE_STATUS_CONFIG } from "../utils/transit";

interface Props {
	network: TransitNetwork | null;
	visible: boolean;
	onToggle: (visible: boolean) => void;
	onFocus: () => void;
}

/** Controls and live summary of the TPL layer (CassiTrack, Cassino). */
export default function TransitPanel({ network, visible, onToggle, onFocus }: Props) {
	if (!network) return null;
	const k = network.kpis;
	const disrupted = network.routes.some((r) => r.status === "DISRUPTED");
	return (
		<Box
			sx={{
				mb: 1.5,
				px: 2,
				py: 1.25,
				borderRadius: 2,
				border: "1px solid",
				borderColor: disrupted ? "info.main" : "divider",
				bgcolor: "rgba(21,101,192,0.05)",
			}}
		>
			<Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} justifyContent="space-between">
				<Stack direction="row" spacing={1.25} alignItems="center" sx={{ flexWrap: "wrap", rowGap: 1 }}>
					<Typography variant="body2" fontWeight={800}>🚌 Mobilità territoriale · CassiTrack ({network.city})</Typography>
					<Chip size="small" label={`Bus attivi ${k.trackedVehicles}/${k.fleetTotal}`} sx={{ fontWeight: 700 }} />
					<Chip size="small" variant="outlined" color={k.onTimePercentage >= 75 ? "success" : "warning"} label={`Puntualità ${k.onTimePercentage}%`} sx={{ fontWeight: 700 }} />
					<Chip size="small" label={`Ritardo medio ${k.avgDelayMinutes.toLocaleString("it-IT")} min`} sx={{ fontWeight: 700 }} />
					{k.activeIncidents > 0 && <Chip size="small" color="warning" label={`${k.activeIncidents} disservizi`} sx={{ fontWeight: 700 }} />}
					<Button size="small" variant="outlined" color="info" onClick={onFocus} sx={{ fontWeight: 700, textTransform: "none" }}>
						Vai a {network.city}
					</Button>
				</Stack>
				<FormControlLabel
					control={<Switch size="small" color="info" checked={visible} onChange={(e) => onToggle(e.target.checked)} />}
					label={<Typography variant="caption" fontWeight={700}>Mostra TPL</Typography>}
				/>
			</Stack>
			<Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1, flexWrap: "wrap", rowGap: 0.75 }}>
				{network.routes.map((r) => {
					const st = ROUTE_STATUS_CONFIG[r.status];
					return (
						<Chip
							key={r.id}
							size="small"
							variant="outlined"
							label={`${lineLabel(r.shortName)} · ${r.longName} · ${st.label}${r.maxDelayMinutes > 2 ? ` +${r.maxDelayMinutes}′` : ""}`}
							sx={{ fontWeight: 700, borderWidth: 2, borderColor: r.color, "& .MuiChip-label": { color: st.color } }}
						/>
					);
				})}
			</Stack>
			{network.incidents.length > 0 && (
				<Stack spacing={0.25} sx={{ mt: 1 }}>
					{network.incidents.slice(0, 3).map((i) => (
						<Typography key={i.id} variant="caption" color="text.secondary">
							{incidentType(i.type).emoji} <strong>{i.title}</strong>
							{i.expectedDelayMinutes > 0 ? ` · ritardi fino a ${i.expectedDelayMinutes} min` : ""}
							{i.detour ? ` · ${i.detour}` : ""}
						</Typography>
					))}
				</Stack>
			)}
		</Box>
	);
}
