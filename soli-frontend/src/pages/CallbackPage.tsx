import { useEffect } from "react";
import { useAuth } from "react-oidc-context";
import { useNavigate } from "react-router-dom";
import { Box, CircularProgress, Typography } from "@mui/material";

/**
 * Handles the OIDC callback after Keycloak redirects back.
 * Waits for token exchange to complete, then navigates to /dashboard.
 */
export default function CallbackPage() {
	const auth = useAuth();
	const navigate = useNavigate();

	useEffect(() => {
		if (auth.isAuthenticated) {
			// Clean up OIDC query params and redirect to dashboard
			navigate("/dashboard", { replace: true });
		}

		if (auth.error) {
			console.error("OIDC callback error:", auth.error);
			navigate("/login", { replace: true });
		}
	}, [auth.isAuthenticated, auth.error, navigate]);

	return (
		<Box
			sx={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				height: "100vh",
				gap: 2,
				background: "linear-gradient(135deg, #004D40 0%, #00796B 40%, #48A999 100%)",
			}}
		>
			<CircularProgress sx={{ color: "#FFFFFF" }} size={48} />
			<Typography variant="body1" sx={{ color: "rgba(255,255,255,0.85)" }}>
				Autenticazione in corso...
			</Typography>
		</Box>
	);
}
