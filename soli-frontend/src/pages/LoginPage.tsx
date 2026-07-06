import { useAuth } from "react-oidc-context";
import { UserManager } from "oidc-client-ts";
import { Navigate } from "react-router-dom";
import { Box, Button, Card, CardContent, Typography, CircularProgress } from "@mui/material";
import logoUrl from "../assets/logo.svg";
import LoginIcon from "@mui/icons-material/Login";
import { oidcConfig } from "../config/auth";

export default function LoginPage() {
	const auth = useAuth();

	const handleRegister = async () => {
		// Il tema classico di Keycloak non supporta prompt=create per il redirect diretto
		// alla registrazione. Si usa invece l'endpoint /registrations di Keycloak,
		// sovrascrivendo l'authorization_endpoint nei metadati del UserManager.
		// PKCE e state vengono gestiti normalmente da oidc-client-ts.
		const authority = (oidcConfig.authority as string) ?? "http://localhost:8180/realms/soli";
		const registrationManager = new UserManager({
			...oidcConfig,
			metadata: {
				issuer: authority,
				authorization_endpoint: `${authority}/protocol/openid-connect/registrations`,
				token_endpoint: `${authority}/protocol/openid-connect/token`,
				userinfo_endpoint: `${authority}/protocol/openid-connect/userinfo`,
				end_session_endpoint: `${authority}/protocol/openid-connect/logout`,
				jwks_uri: `${authority}/protocol/openid-connect/certs`,
			},
		});
		await registrationManager.signinRedirect();
	};

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
						<Box
							component="img"
							src={logoUrl}
							alt="SoLi Logo"
							sx={{
								width: 64,
								height: 64,
								mb: 1,
								objectFit: "contain",
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
						onClick={() => auth.signinRedirect({ extraQueryParams: { prompt: "login" } })}
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
						onClick={handleRegister}
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
