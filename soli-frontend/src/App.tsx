import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "react-oidc-context";
import { oidcConfig } from "./config/auth";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/DashboardLayout";
import LoginPage from "./pages/LoginPage";
import CallbackPage from "./pages/CallbackPage";
import DashboardPage from "./pages/DashboardPage";

export default function App() {
	return (
		<AuthProvider {...oidcConfig}>
			<BrowserRouter>
				<Routes>
					{/* Public routes */}
					<Route path="/login" element={<LoginPage />} />

					{/* OIDC callback handler */}
					<Route path="/callback" element={<CallbackPage />} />

					{/* Protected routes — require authentication */}
					<Route
						path="/dashboard"
						element={
							<ProtectedRoute>
								<DashboardLayout />
							</ProtectedRoute>
						}
					>
						<Route index element={<DashboardPage />} />
						<Route path="requests" element={<PlaceholderPage title="Richieste" />} />
						<Route path="volunteers" element={<PlaceholderPage title="Volontari" />} />
						<Route path="users" element={<PlaceholderPage title="Utenti" />} />
						<Route path="chat" element={<PlaceholderPage title="Chat" />} />
						<Route path="credits" element={<PlaceholderPage title="Crediti SOLI" />} />
						<Route path="settings" element={<PlaceholderPage title="Impostazioni" />} />
					</Route>

					{/* Default: redirect to dashboard (ProtectedRoute handles unauth) */}
					<Route path="*" element={<Navigate to="/dashboard" replace />} />
				</Routes>
			</BrowserRouter>
		</AuthProvider>
	);
}

function PlaceholderPage({ title }: { title: string }) {
	return (
		<div style={{ padding: "24px" }}>
			<h2>{title}</h2>
			<p style={{ color: "#666" }}>Questa sezione è in fase di sviluppo.</p>
		</div>
	);
}
