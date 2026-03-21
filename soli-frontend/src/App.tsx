import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "react-oidc-context";
import { oidcConfig } from "./config/auth";
import { RoleProvider } from "./context/RoleContext";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/DashboardLayout";
import LoginPage from "./pages/LoginPage";
import CallbackPage from "./pages/CallbackPage";
import DashboardPage from "./pages/DashboardPage";
import TaskWizardPage from "./pages/TaskWizardPage";
import TaskDetailPage from "./pages/TaskDetailPage";
import ProfilePage from "./pages/ProfilePage";
import WalletPage from "./pages/WalletPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AssociationsPage from "./pages/AssociationsPage";
import AssociationDetailPage from "./pages/AssociationDetailPage";

export default function App() {
	return (
		<AuthProvider {...oidcConfig}>
			<RoleProvider>
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
							<Route path="wallet" element={<WalletPage />} />
							<Route path="profile" element={<ProfilePage />} />
							<Route path="admin" element={<AdminDashboardPage />} />
							<Route path="associations" element={<AssociationsPage />} />
							<Route path="associations/:id" element={<AssociationDetailPage />} />
						</Route>

						{/* Default: redirect to dashboard (ProtectedRoute handles unauth) */}
						<Route path="*" element={<Navigate to="/dashboard" replace />} />
					</Routes>
				</BrowserRouter>
			</RoleProvider>
		</AuthProvider>
	);
}
