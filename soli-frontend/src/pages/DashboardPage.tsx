import { useAuth } from "react-oidc-context";
import { Box, Typography, Card, CardContent, Grid } from "@mui/material";
import VolunteerActivismIcon from "@mui/icons-material/VolunteerActivism";
import AssignmentIcon from "@mui/icons-material/Assignment";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";

export default function DashboardPage() {
	const auth = useAuth();
	const userName = auth.user?.profile?.given_name || auth.user?.profile?.name || "Utente";

	return (
		<Box>
			{/* Welcome */}
			<Typography variant="h4" fontWeight={700} gutterBottom>
				Benvenuto, {userName}! 👋
			</Typography>
			<Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
				Panoramica della tua attività su SoLi — Solidarities Link.
			</Typography>

			{/* Stat Cards */}
			<Grid container spacing={3}>
				<Grid size={{ xs: 12, sm: 6, md: 4 }}>
					<Card
						sx={{
							background: "linear-gradient(135deg, #00796B 0%, #48A999 100%)",
							color: "white",
						}}
					>
						<CardContent sx={{ p: 3 }}>
							<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
								<Box>
									<Typography variant="h3" fontWeight={700}>
										0
									</Typography>
									<Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
										Task Completati
									</Typography>
								</Box>
								<AssignmentIcon sx={{ fontSize: 48, opacity: 0.3 }} />
							</Box>
						</CardContent>
					</Card>
				</Grid>

				<Grid size={{ xs: 12, sm: 6, md: 4 }}>
					<Card
						sx={{
							background: "linear-gradient(135deg, #FF6F00 0%, #FFA040 100%)",
							color: "white",
						}}
					>
						<CardContent sx={{ p: 3 }}>
							<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
								<Box>
									<Typography variant="h3" fontWeight={700}>
										0
									</Typography>
									<Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
										Crediti SOLI
									</Typography>
								</Box>
								<EmojiEventsIcon sx={{ fontSize: 48, opacity: 0.3 }} />
							</Box>
						</CardContent>
					</Card>
				</Grid>

				<Grid size={{ xs: 12, sm: 6, md: 4 }}>
					<Card
						sx={{
							background: "linear-gradient(135deg, #2E7D32 0%, #66BB6A 100%)",
							color: "white",
						}}
					>
						<CardContent sx={{ p: 3 }}>
							<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
								<Box>
									<Typography variant="h3" fontWeight={700}>
										0
									</Typography>
									<Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
										Volontari Attivi
									</Typography>
								</Box>
								<VolunteerActivismIcon sx={{ fontSize: 48, opacity: 0.3 }} />
							</Box>
						</CardContent>
					</Card>
				</Grid>
			</Grid>

			{/* Placeholder content */}
			<Card sx={{ mt: 4, p: 4, textAlign: "center" }}>
				<Typography variant="h6" color="text.secondary" gutterBottom>
					🚧 In costruzione
				</Typography>
				<Typography variant="body2" color="text.secondary">
					Questa sezione verrà popolata con i dati reali del sistema SOLI.
				</Typography>
			</Card>
		</Box>
	);
}
