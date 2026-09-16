import { Box, Chip, Divider, Drawer, Grid, IconButton, Stack, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import type { BuildingKpi, SeismicEvent } from "../types/models/SeismicOverlay";
import { alertLevel, buildingType, formatEventDate, formatMg, STRUCTURE_LABELS } from "../utils/seismic";

function KpiTile({ label, value, hint, color }: { label: string; value: string; hint?: string; color?: string }) {
	return (
		<Box sx={{ p: 1.25, borderRadius: 2, border: "1px solid", borderColor: "divider", height: "100%" }}>
			<Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: "block", lineHeight: 1.2 }}>
				{label}
			</Typography>
			<Typography variant="h6" fontWeight={800} sx={{ color: color ?? "primary.main", lineHeight: 1.3 }}>
				{value}
			</Typography>
			{hint && (
				<Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.2 }}>
					{hint}
				</Typography>
			)}
		</Box>
	);
}

function InfoRow({ label, value }: { label: string; value: string }) {
	return (
		<Stack direction="row" justifyContent="space-between" spacing={2} sx={{ py: 0.5 }}>
			<Typography variant="body2" color="text.secondary">{label}</Typography>
			<Typography variant="body2" fontWeight={600} textAlign="right">{value}</Typography>
		</Stack>
	);
}

interface Props {
	building: BuildingKpi | null;
	event: SeismicEvent | null;
	open: boolean;
	onClose: () => void;
}

/** Full building card (Urban Sentinel KPIs), shown beside the map instead of a cramped map popup. */
export default function SeismicBuildingDrawer({ building: b, event, open, onClose }: Props) {
	return (
		<Drawer
			anchor="right"
			open={open}
			onClose={onClose}
			PaperProps={{ sx: { width: { xs: "100%", sm: 440 }, borderTopLeftRadius: { sm: 16 }, borderBottomLeftRadius: { sm: 16 } } }}
		>
			{b && (() => {
				const level = alertLevel(b.alertLevel);
				const prePost = alertLevel(b.prePostAlertLevel);
				const type = buildingType(b.buildingType);
				return (
					<Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
						{/* Header */}
						<Box sx={{ p: 2.5, pb: 2, bgcolor: level.bg, borderBottom: `3px solid ${level.color}` }}>
							<Stack direction="row" spacing={1.5} alignItems="flex-start">
								<Typography fontSize={36} lineHeight={1}>{type.emoji}</Typography>
								<Box sx={{ flex: 1, minWidth: 0 }}>
									<Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.25 }}>{b.name}</Typography>
									<Typography variant="body2" color="text.secondary">
										{type.label} · {b.address}, {b.city}
									</Typography>
								</Box>
								<IconButton onClick={onClose} size="small" aria-label="Chiudi">
									<CloseIcon />
								</IconButton>
							</Stack>
							<Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2, flexWrap: "wrap", rowGap: 0.75 }}>
								<Chip label={`Allerta evento: ${level.short}`} sx={{ bgcolor: level.color, color: "#fff", fontWeight: 800 }} />
								<Chip
									variant="outlined"
									label={`Pre/Post evento: ${prePost.short}`}
									sx={{ borderColor: prePost.color, color: prePost.color, fontWeight: 800, borderWidth: 2, bgcolor: "background.paper" }}
								/>
							</Stack>
							<Typography variant="body2" sx={{ mt: 1 }}>{level.label}</Typography>
						</Box>

						{/* Scrollable body */}
						<Box sx={{ p: 2.5, overflowY: "auto", flex: 1 }}>
							{event && (
								<Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1.5 }}>
									Evento M {event.magnitude.toFixed(1)} · {event.place} · {formatEventDate(event.occurredAt)} · a{" "}
									{b.epicentralDistanceKm.toLocaleString("it-IT")} km dall'epicentro
								</Typography>
							)}

							{b.analyzed ? (
								<>
									<Typography variant="overline" fontWeight={800} color="primary" sx={{ lineHeight: 1.5 }}>
										Indici sintetici · dominio del tempo
									</Typography>
									<Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1 }}>
										Valori del sensore più sollecitato: {b.worstSensor}
									</Typography>
									<Grid container spacing={1}>
										<Grid size={4}><KpiTile label="Picco X" value={formatMg(b.peakAccXMg)} /></Grid>
										<Grid size={4}><KpiTile label="Picco Y" value={formatMg(b.peakAccYMg)} /></Grid>
										<Grid size={4}><KpiTile label="Picco Z" value={formatMg(b.peakAccZMg)} /></Grid>
										<Grid size={12}>
											<KpiTile label="Risultante picco accelerazione" value={formatMg(b.peakResultantMg)} color={level.color} />
										</Grid>
									</Grid>

									<Divider sx={{ my: 2 }} />
									<Typography variant="overline" fontWeight={800} color="primary">
										Sensori ({b.sensors.length})
									</Typography>
									<Stack spacing={0.75} sx={{ mt: 0.5 }}>
										{b.sensors.map((s) => {
											const sl = alertLevel(s.eventAlertLevel);
											return (
												<Stack key={s.id} direction="row" alignItems="center" spacing={1} sx={{ px: 1.25, py: 0.75, borderRadius: 1.5, bgcolor: "action.hover" }}>
													<Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: sl.color, flexShrink: 0 }} />
													<Typography variant="body2" fontWeight={700} sx={{ flex: 1 }}>
														{s.name} <Typography component="span" variant="caption" color="text.secondary">· piano {s.floor}</Typography>
													</Typography>
													<Typography variant="body2" fontWeight={700}>{formatMg(s.peakResultantMg)}</Typography>
													<Typography variant="caption" sx={{ color: sl.color, fontWeight: 700, minWidth: 64, textAlign: "right" }}>{sl.short}</Typography>
												</Stack>
											);
										})}
									</Stack>
								</>
							) : (
								<Typography variant="body2" color="text.secondary">Nessuna metrica calcolata per questo evento.</Typography>
							)}

							<Divider sx={{ my: 2 }} />
							<Typography variant="overline" fontWeight={800} color="primary">Edificio</Typography>
							<InfoRow label="Struttura" value={STRUCTURE_LABELS[b.structureType] ?? b.structureType} />
							<InfoRow label="Anno di costruzione" value={String(b.constructionYear)} />
							<InfoRow label="Piani" value={String(b.floors)} />
							<InfoRow label="Occupanti" value={b.occupants.toLocaleString("it-IT")} />
							<InfoRow label="Stato di salute" value={b.healthStatus} />

							{b.nearbyActiveTasks > 0 && (
								<Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: level.bg, border: `1px solid ${level.color}` }}>
									<Typography variant="body2" fontWeight={700}>
										🤝 {b.nearbyActiveTasks} task SOLI attivi entro 500 m da questo edificio
									</Typography>
								</Box>
							)}

							<Typography variant="caption" color="text.disabled" component="div" sx={{ mt: 2 }}>
								Fonte: Urban Sentinel – Structural Health Monitoring
							</Typography>
						</Box>
					</Box>
				);
			})()}
		</Drawer>
	);
}
