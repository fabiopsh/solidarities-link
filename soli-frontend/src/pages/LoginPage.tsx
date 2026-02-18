import { useAuth } from "react-oidc-context";
import { Navigate } from "react-router-dom";
import { Box, Button, Card, CardContent, Typography, CircularProgress } from "@mui/material";
import HandshakeIcon from "@mui/icons-material/Handshake";
import LoginIcon from "@mui/icons-material/Login";

export default function LoginPage() {
	const auth = useAuth();

	if (auth.isLoading) {
		return (
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					height: "100vh",
					backgroundColor: "background.default",
				}}
			>
				<CircularProgress color="primary" size={48} />
			</Box>
		);
	}

	if (auth.isAuthenticated) {
		return <Navigate to="/dashboard" replace />;
	}

	return (
		<Box
			sx={{
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				minHeight: "100vh",
				background: "linear-gradient(135deg, #004D40 0%, #00796B 40%, #48A999 100%)",
				p: 2,
			}}
		>
			<Card
				sx={{
					maxWidth: 440,
					width: "100%",
					textAlign: "center",
					p: { xs: 3, sm: 5 },
					borderRadius: 4,
					boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
				}}
			>
				<CardContent sx={{ p: 0 }}>
					{/* Logo */}
					<Box sx={{ mb: 3 }}>
						<HandshakeIcon
							sx={{
								fontSize: 64,
								color: "primary.main",
								mb: 1,
							}}
						/>
						<Typography
							variant="h3"
							sx={{
								fontWeight: 700,
								background: "linear-gradient(135deg, #00796B 0%, #48A999 100%)",
								backgroundClip: "text",
								WebkitBackgroundClip: "text",
								WebkitTextFillColor: "transparent",
							}}
						>
							SoLi
						</Typography>
						<Typography variant="subtitle1" color="text.secondary" sx={{ mt: 0.5 }}>
							Solidarities Link
						</Typography>
					</Box>

					<Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.7 }}>
						Accedi al tuo account per iniziare a fare la differenza nel tuo quartiere.
					</Typography>

					{/* Login Button */}
					<Button
						variant="contained"
						size="large"
						fullWidth
						startIcon={<LoginIcon />}
						onClick={() => auth.signinRedirect()}
						sx={{
							py: 1.5,
							fontSize: "1rem",
							mb: 2,
							background: "linear-gradient(135deg, #00796B 0%, #48A999 100%)",
							"&:hover": {
								background: "linear-gradient(135deg, #004D40 0%, #00796B 100%)",
							},
						}}
					>
						Accedi con Keycloak
					</Button>

					{/* Register Button */}
					<Button
						variant="outlined"
						size="large"
						fullWidth
						onClick={() => {
							// Keycloak registration URL
							const registrationUrl =
								(auth.settings.authority || "") +
								"/protocol/openid-connect/registrations" +
								"?client_id=" +
								encodeURIComponent(auth.settings.client_id || "") +
								"&redirect_uri=" +
								encodeURIComponent(auth.settings.redirect_uri || window.location.origin) +
								"&response_type=code" +
								"&scope=openid profile email";
							window.location.href = registrationUrl;
						}}
						sx={{
							py: 1.5,
							fontSize: "1rem",
							borderColor: "primary.main",
							color: "primary.main",
						}}
					>
						Registrati
					</Button>

					<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 3 }}>
						Il desiderio di aiutare incontra il bisogno in tempo reale.
					</Typography>
				</CardContent>
			</Card>
		</Box>
	);
}
