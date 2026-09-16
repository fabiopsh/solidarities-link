import { Box, Chip, Stack, Typography } from "@mui/material";
import type { Journey } from "../types/models/Transit";
import { crowding, delayColor, formatClock, MODE_CONFIG } from "../utils/transit";

/** One journey option from OmniMove: duration, legs timeline and SOLI's reading (accessibility, crowding, CO2). */
export default function JourneyView({ journey, highlighted = false }: { journey: Journey; highlighted?: boolean }) {
	const mode = MODE_CONFIG[journey.mode] ?? { label: journey.mode, emoji: "➡️" };
	const crowd = crowding(journey.crowdingLevel);
	return (
		<Box
			sx={{
				p: 1.75,
				borderRadius: 2,
				border: "2px solid",
				borderColor: highlighted ? "info.main" : "divider",
				bgcolor: highlighted ? "rgba(21,101,192,0.04)" : "background.paper",
			}}
		>
			<Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
				<Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
					<Typography fontSize={24} lineHeight={1}>{mode.emoji}</Typography>
					<Box sx={{ minWidth: 0 }}>
						<Typography variant="subtitle2" fontWeight={800} sx={{ lineHeight: 1.2 }}>
							{highlighted ? "Consigliato · " : ""}{mode.label}
						</Typography>
						<Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.3 }}>
							{journey.summary}
						</Typography>
					</Box>
				</Stack>
				<Box sx={{ textAlign: "right", flexShrink: 0 }}>
					<Typography variant="h5" fontWeight={900} sx={{ lineHeight: 1, color: highlighted ? "info.dark" : "text.primary" }}>
						{journey.durationMinutes} min
					</Typography>
					<Typography variant="caption" color="text.secondary">
						arrivo {formatClock(journey.arriveAt)}
					</Typography>
				</Box>
			</Stack>

			{journey.mode === "BUS" && (
				<Stack spacing={0.75} sx={{ mt: 1.5, pl: 1, borderLeft: "3px dotted", borderColor: "divider" }}>
					{journey.legs.map((leg, idx) => (
						<Stack key={idx} direction="row" spacing={1} alignItems="center">
							<Typography variant="caption" sx={{ minWidth: 38, fontWeight: 700, color: "text.secondary" }}>
								{formatClock(leg.departureTime)}
							</Typography>
							{leg.mode === "BUS" ? (
								<>
									<Chip size="small" label={`Linea ${leg.routeName?.split(" - ")[0]}`} sx={{ fontWeight: 800, bgcolor: "#263238", color: "#fff", height: 20 }} />
									<Typography variant="body2" sx={{ flex: 1 }}>
										{leg.fromName} → {leg.toName} <Typography component="span" variant="caption" color="text.secondary">({leg.durationMinutes} min)</Typography>
									</Typography>
									{leg.delayMinutes > 0 ? (
										<Typography variant="caption" fontWeight={800} sx={{ color: delayColor(leg.delayMinutes) }}>+{leg.delayMinutes}′ live</Typography>
									) : leg.vehicleId ? (
										<Typography variant="caption" fontWeight={800} sx={{ color: "#2e7d32" }}>live</Typography>
									) : (
										<Typography variant="caption" color="text.secondary">orario</Typography>
									)}
								</>
							) : (
								<Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
									🚶 {leg.durationMinutes} min a piedi → {leg.toName}
								</Typography>
							)}
						</Stack>
					))}
				</Stack>
			)}

			<Stack direction="row" spacing={0.75} sx={{ mt: 1.5, flexWrap: "wrap", rowGap: 0.75 }}>
				<Chip size="small" variant="outlined" label={journey.costEuros > 0 ? `€ ${journey.costEuros.toFixed(2)}` : "Gratis"} />
				<Chip size="small" variant="outlined" label={`🌱 Green ${journey.greenIndex}/100`} />
				{journey.co2SavedGrams > 0 && <Chip size="small" variant="outlined" color="success" label={`−${Math.round(journey.co2SavedGrams)} g CO₂ vs auto`} />}
				{journey.accessibleVehicle === true && <Chip size="small" color="info" label="♿ Mezzo accessibile" />}
				{journey.accessibleVehicle === false && <Chip size="small" variant="outlined" color="warning" label="Mezzo senza posto disabili" />}
				{crowd && <Chip size="small" variant="outlined" label={`${crowd.icon} ${crowd.label}`} />}
				{journey.incidentIds.length > 0 && <Chip size="small" color="warning" label="⚠️ Disservizio sul percorso" />}
				{journey.mode === "BUS" && (
					<Chip size="small" variant="outlined" label={journey.dataSource === "GOOGLE_MAPS" ? "ETA live (traffico)" : "ETA da orario"} />
				)}
			</Stack>
		</Box>
	);
}
