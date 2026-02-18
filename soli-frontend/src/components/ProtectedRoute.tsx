import { useAuth } from "react-oidc-context";
import { Navigate } from "react-router-dom";
import { Box, CircularProgress, Typography } from "@mui/material";

interface ProtectedRouteProps {
	children: React.ReactNode;
}

/**
 * Security guard that protects routes requiring authentication.
 * - Shows loading spinner while OIDC state is being resolved
 * - Redirects to /login if user is not authenticated
 * - Renders children if user is authenticated
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
	const auth = useAuth();

	// Still loading OIDC state (checking localStorage, silent renew, etc.)
	if (auth.isLoading) {
		return (
			<Box
				sx={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					height: "100vh",
					gap: 2,
					backgroundColor: "background.default",
				}}
			>
				<CircularProgress color="primary" size={48} />
				<Typography variant="body1" color="text.secondary">
					Verifica autenticazione...
				</Typography>
			</Box>
		);
	}

	// Auth error (token expired, server unreachable, etc.)
	if (auth.error) {
		console.error("Auth error:", auth.error);
		return <Navigate to="/login" replace />;
	}

	// Not authenticated → redirect to login
	if (!auth.isAuthenticated) {
		return <Navigate to="/login" replace />;
	}

	// User is authenticated → render protected content
	return <>{children}</>;
}
