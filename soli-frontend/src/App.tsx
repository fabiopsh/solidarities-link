import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "react-oidc-context";
import { oidcConfig } from "./config/auth";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/DashboardLayout";
import LoginPage from "./pages/LoginPage";
import CallbackPage from "./pages/CallbackPage";
import DashboardPage from "./pages/DashboardPage";
import TaskWizardPage from "./pages/TaskWizardPage";
import TaskDetailPage from "./pages/TaskDetailPage";

export default function App() {
	return (
		<AuthProvider {...oidcConfig}>
			<BrowserRouter>
				<Routes>
					{/* Public routes */}
					<Route path="/login" element={<LoginPage />} />

					{/* OIDC callback handler */}
					<Route path="/callback" element={<CallbackPage />} />

					<Route
						path="/dashboard"
						element={
							<ProtectedRoute>
								<DashboardLayout />
							</ProtectedRoute>
						}
					>
						<Route index element={<DashboardPage />} />
						<Route path="requests" element={<DashboardPage />} />
						<Route path="requests/new" element={<TaskWizardPage />} />
						<Route path="requests/:id" element={<TaskDetailPage />} />
						<Route path="wallet" element={<PlaceholderPage title="Wallet" />} />
						<Route path="profile" element={<PlaceholderPage title="Profilo" />} />
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
