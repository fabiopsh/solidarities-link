import { useState, useEffect } from "react";
import { useAuth } from "react-oidc-context";
import api from "../api";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
	AppBar,
	Box,
	CssBaseline,
	Divider,
	Drawer,
	IconButton,
	List,
	ListItemButton,
	ListItemIcon,
	ListItemText,
	Toolbar,
	Typography,
	Avatar,
	Menu,
	MenuItem,
	useMediaQuery,
	useTheme,
	ToggleButton,
	ToggleButtonGroup,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AssignmentIcon from "@mui/icons-material/Assignment";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonIcon from "@mui/icons-material/Person";
import HandshakeIcon from "@mui/icons-material/Handshake";
import GroupsIcon from "@mui/icons-material/Groups";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import Tooltip from "@mui/material/Tooltip";
import { useRole, type UserRole } from "../context/RoleContext";
import { useThemeMode } from "../context/ThemeModeContext";
import NotificationDropdown from "./NotificationDropdown";

const DRAWER_WIDTH = 280;
const DRAWER_WIDTH_COLLAPSED = 72;

interface NavItem {
	label: string;
	icon: React.ReactNode;
	path: string;
}

const navItems: NavItem[] = [
	{ label: "Dashboard", icon: <DashboardIcon />, path: "/dashboard" },
	{ label: "Richieste", icon: <AssignmentIcon />, path: "/dashboard/requests" },
	{ label: "Wallet", icon: <EmojiEventsIcon />, path: "/dashboard/wallet" },
];

const adminNavItems: NavItem[] = [{ label: "Gestione Admin", icon: <DashboardIcon />, path: "/dashboard/admin" }];

const volunteerNavItems: NavItem[] = [{ label: "Associazioni", icon: <GroupsIcon />, path: "/dashboard/associations" }];

export default function DashboardLayout() {
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down("md"));
	const [mobileOpen, setMobileOpen] = useState(false);
	const [drawerCollapsed, setDrawerCollapsed] = useState(() => {
		const saved = localStorage.getItem("drawerCollapsed");
		return saved === "true";
	});
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
	const auth = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
	const { role, setRole } = useRole();
	const { mode, toggleMode } = useThemeMode();

	useEffect(() => {
		let urlToRevoke: string | null = null;
		if (auth.isAuthenticated) {
			api.get("/api/users/me/profile-picture", { responseType: "blob" })
				.then((res) => {
					if (res.status === 200 && res.data && res.data.size > 0) {
						urlToRevoke = URL.createObjectURL(res.data);
						setAvatarUrl(urlToRevoke);
					}
				})
				.catch(() => {});
		}
		return () => {
			if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
		};
	}, [auth.isAuthenticated]);

	const handleRoleChange = (
		_event: React.MouseEvent<HTMLElement>,
		newRole: UserRole | null,
	) => {
		if (newRole !== null) {
			setRole(newRole);
		}
	};

	// Fallback generico per ruoli che non possono vedere determinate pagine
	useEffect(() => {
		// Se il richiedente prova ad accedere al wallet
		if (role === "requester" && location.pathname.startsWith("/dashboard/wallet")) {
			navigate("/dashboard", { replace: true });
		}
		// Se il volontario prova a creare una nuova richiesta
		if (role === "volunteer" && location.pathname === "/dashboard/requests/new") {
			navigate("/dashboard", { replace: true });
		}
		// Le associazioni sono solo per la vista volontario
		if (role === "requester" && location.pathname.startsWith("/dashboard/associations")) {
			navigate("/dashboard", { replace: true });
		}
	}, [role, location.pathname, navigate]);

	// Check if user has admin role
	const isAdmin = (auth.user?.profile?.realm_access as any)?.roles?.includes("admin") || false;

	const userName = auth.user?.profile?.given_name || auth.user?.profile?.name || "Utente";
	const userEmail = auth.user?.profile?.email || "";
	const userInitials = userName.charAt(0).toUpperCase();

	const handleDrawerToggle = () => {
		if (isMobile) {
			setMobileOpen(!mobileOpen);
		} else {
			const newCollapsed = !drawerCollapsed;
			setDrawerCollapsed(newCollapsed);
			localStorage.setItem("drawerCollapsed", String(newCollapsed));
		}
	};
	const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
	const handleMenuClose = () => setAnchorEl(null);

	const handleLogout = () => {
		handleMenuClose();
		auth.signoutRedirect();
	};

	const handleNav = (path: string) => {
		navigate(path);
		if (isMobile) setMobileOpen(false);
	};

	const isExpanded = isMobile ? mobileOpen : !drawerCollapsed;
	const isOnProfile = location.pathname === "/dashboard/profile";

	const drawerContent = (
		<Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
			{/* Logo / Brand */}
			<Toolbar
				sx={{
					display: "flex",
					alignItems: "center",
					justifyContent: isExpanded ? "space-between" : "center",
					px: isExpanded ? 2 : 1,
				}}
			>
				{isExpanded && (
					<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
						<HandshakeIcon color="primary" sx={{ fontSize: 32 }} />
						<Typography
							variant="h6"
							noWrap
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
					</Box>
				)}
				<IconButton onClick={handleDrawerToggle} size="small">
					{isExpanded ? <ChevronLeftIcon /> : <MenuIcon />}
				</IconButton>
			</Toolbar>

			<Divider />

			{/* Main Nav Items */}
			<List sx={{ flexGrow: 1, px: 1, py: 2 }}>
				{navItems
					.filter((item) => !(role === "requester" && item.label === "Wallet"))
					.map((item) => (
					<ListItemButton
						key={item.label}
						onClick={() => handleNav(item.path)}
						selected={
							location.pathname === item.path ||
							(item.path !== "/dashboard" && location.pathname.startsWith(item.path))
						}
						sx={{
							borderRadius: 2,
							mb: 0.5,
							minHeight: 48,
							justifyContent: isExpanded ? "initial" : "center",
							px: 2,
							"&.Mui-selected": {
								bgcolor: "primary.main",
								color: "primary.contrastText",
								"&:hover": { bgcolor: "primary.dark" },
								"& .MuiListItemIcon-root": { color: "inherit" },
							},
						}}
					>
						<ListItemIcon
							sx={{
								color: "inherit",
								minWidth: 0,
								mr: isExpanded ? 2 : "auto",
								justifyContent: "center",
							}}
						>
							{item.icon}
						</ListItemIcon>
						{isExpanded && (
							<ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 600 }} />
						)}
					</ListItemButton>
				))}

				{role === "volunteer" && (
					<>
						<Divider sx={{ my: 1 }} />


						{volunteerNavItems.map((item) => (
							<ListItemButton
								key={item.label}
								onClick={() => handleNav(item.path)}
								selected={location.pathname === item.path || location.pathname.startsWith(item.path)}
								sx={{
									borderRadius: 2,
									mb: 0.5,
									minHeight: 48,
									justifyContent: isExpanded ? "initial" : "center",
									px: 2,
									"&.Mui-selected": {
										bgcolor: "primary.main",
										color: "primary.contrastText",
										"&:hover": { bgcolor: "primary.dark" },
										"& .MuiListItemIcon-root": { color: "inherit" },
									},
								}}
							>
								<ListItemIcon
									sx={{
										color: "inherit",
										minWidth: 0,
										mr: isExpanded ? 2 : "auto",
										justifyContent: "center",
									}}
								>
									{item.icon}
								</ListItemIcon>
								{isExpanded && (
									<ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 600 }} />
								)}
							</ListItemButton>
						))}
					</>
				)}

				{isAdmin && (
					<>
						<Divider sx={{ my: 1 }} />
						<Typography
							variant="caption"
							sx={{
								px: !isExpanded ? 0 : 2,
								display: "block",
								textAlign: !isExpanded ? "center" : "left",
								color: "text.secondary",
								fontWeight: "bold",
								mb: 1,
							}}
						>
							{!isExpanded ? "ADM" : "ADMIN"}
						</Typography>
						{adminNavItems.map((item) => (
							<ListItemButton
								key={item.label}
								onClick={() => handleNav(item.path)}
								selected={location.pathname === item.path || location.pathname.startsWith(item.path)}
								sx={{
									borderRadius: 2,
									mb: 0.5,
									minHeight: 48,
									justifyContent: isExpanded ? "initial" : "center",
									px: 2,
									"&.Mui-selected": {
										bgcolor: "secondary.main",
										color: "secondary.contrastText",
										"&:hover": { bgcolor: "secondary.dark" },
										"& .MuiListItemIcon-root": { color: "inherit" },
									},
								}}
							>
								<ListItemIcon
									sx={{
										color: "inherit",
										minWidth: 0,
										mr: isExpanded ? 2 : "auto",
										justifyContent: "center",
									}}
								>
									{item.icon}
								</ListItemIcon>
								{isExpanded && (
									<ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 600 }} />
								)}
							</ListItemButton>
						))}
					</>
				)}
			</List>

			{/* Profile — bottom of sidebar */}
			<Divider />
			{isExpanded ? (
				<Box
					onClick={() => handleNav("/dashboard/profile")}
					sx={{
						m: 1,
						p: 1.5,
						display: "flex",
						alignItems: "center",
						gap: 1.5,
						cursor: "pointer",
						borderRadius: 2,
						bgcolor: isOnProfile ? "primary.main" : "transparent",
						color: isOnProfile ? "primary.contrastText" : "inherit",
						transition: "background-color 0.15s",
						"&:hover": {
							bgcolor: isOnProfile ? "primary.dark" : "action.hover",
						},
					}}
				>
					<Avatar
						src={avatarUrl || undefined}
						sx={{
							bgcolor: isOnProfile ? "rgba(255,255,255,0.25)" : "primary.main",
							width: 36,
							height: 36,
							fontSize: "0.9rem",
							flexShrink: 0,
						}}
					>
						{userInitials}
					</Avatar>
					<Box sx={{ overflow: "hidden", minWidth: 0 }}>
						<Typography variant="body2" fontWeight={600} noWrap>
							{userName}
						</Typography>
						<Typography
							variant="caption"
							noWrap
							sx={{ color: isOnProfile ? "rgba(255,255,255,0.75)" : "text.secondary" }}
						>
							{userEmail}
						</Typography>
					</Box>
				</Box>
			) : (
				<Box sx={{ display: "flex", justifyContent: "center", py: 1.5 }}>
					<IconButton
						onClick={() => handleNav("/dashboard/profile")}
						sx={{
							p: 0.5,
							bgcolor: isOnProfile ? "primary.main" : "transparent",
							"&:hover": { bgcolor: isOnProfile ? "primary.dark" : "action.hover" },
						}}
					>
						<Avatar
							src={avatarUrl || undefined}
							sx={{ bgcolor: "primary.main", width: 36, height: 36, fontSize: "0.9rem" }}
						>
							{userInitials}
						</Avatar>
					</IconButton>
				</Box>
			)}
		</Box>
	);

	const currentDrawerWidth = !isMobile && !drawerCollapsed ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED;

	return (
		<Box sx={{ display: "flex", minHeight: "100vh" }}>
			<CssBaseline />

			{/* AppBar */}
			<AppBar
				position="fixed"
				color="inherit"
				sx={{
					width: { md: `calc(100% - ${currentDrawerWidth}px)` },
					ml: { md: `${currentDrawerWidth}px` },
					transition: theme.transitions.create(["width", "margin"], {
						easing: theme.transitions.easing.sharp,
						duration: theme.transitions.duration.enteringScreen,
					}),
				}}
			>
				<Toolbar>
					<IconButton
						edge="start"
						color="inherit"
						onClick={handleDrawerToggle}
						sx={{ mr: 2, display: { md: "none" } }}
					>
						<MenuIcon />
					</IconButton>

					<Box sx={{ flexGrow: 1 }} />

					<ToggleButtonGroup
						value={role}
						exclusive
						onChange={handleRoleChange}
						aria-label="role switch"
						size="small"
						sx={{ mr: 2, display: { xs: "none", sm: "flex" } }}
					>
						<ToggleButton value="volunteer" aria-label="Volunteer Role" sx={{ px: 2, textTransform: "none", fontWeight: 600 }}>
							Volontario
						</ToggleButton>
						<ToggleButton value="requester" aria-label="Requester Role" sx={{ px: 2, textTransform: "none", fontWeight: 600 }}>
							Richiedente
						</ToggleButton>
					</ToggleButtonGroup>

					<Tooltip title={mode === "light" ? "Passa alla modalità scura" : "Passa alla modalità chiara"}>
						<IconButton
							onClick={toggleMode}
							size="small"
							aria-label="toggle theme"
							sx={{
								mr: 1,
								color: "text.secondary",
								"&:hover": { color: "primary.main" },
								transition: "color 0.2s",
							}}
						>
							{mode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
						</IconButton>
					</Tooltip>

					<NotificationDropdown />

					<IconButton onClick={handleMenuOpen} size="small">
						<Avatar src={avatarUrl || undefined} sx={{ bgcolor: "primary.main", width: 36, height: 36, fontSize: "0.875rem" }}>
							{userInitials}
						</Avatar>
					</IconButton>

					{/* Profile menu */}
					<Menu
						anchorEl={anchorEl}
						open={Boolean(anchorEl)}
						onClose={handleMenuClose}
						transformOrigin={{ horizontal: "right", vertical: "top" }}
						anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
						slotProps={{
							paper: {
								sx: {
									borderRadius: 3,
									minWidth: 240,
									mt: 0.5,
									boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
									overflow: "visible",
								},
							},
						}}
					>
						{/* User card */}
						<Box sx={{ px: 2, pt: 2, pb: 1.5, display: "flex", alignItems: "center", gap: 1.5 }}>
							<Avatar
								src={avatarUrl || undefined}
								sx={{ bgcolor: "primary.main", width: 48, height: 48, fontSize: "1.2rem", flexShrink: 0 }}
							>
								{userInitials}
							</Avatar>
							<Box sx={{ minWidth: 0 }}>
								<Typography variant="body2" fontWeight={700} noWrap>
									{userName}
								</Typography>
								<Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
									{userEmail}
								</Typography>
							</Box>
						</Box>

						<Divider sx={{ mx: 1.5 }} />

						<Box sx={{ p: 1 }}>
							<MenuItem
								onClick={() => { handleMenuClose(); handleNav("/dashboard/profile"); }}
								sx={{ borderRadius: 2, gap: 1.5, py: 1 }}
							>
								<PersonIcon fontSize="small" sx={{ color: "text.secondary" }} />
								<Typography variant="body2" fontWeight={500}>Impostazioni profilo</Typography>
							</MenuItem>
							<MenuItem
								onClick={handleLogout}
								sx={{ borderRadius: 2, gap: 1.5, py: 1, color: "error.main" }}
							>
								<LogoutIcon fontSize="small" color="error" />
								<Typography variant="body2" fontWeight={500} color="error">Esci</Typography>
							</MenuItem>
						</Box>
					</Menu>
				</Toolbar>
			</AppBar>

			{/* Sidebar Drawer */}
			{isMobile ? (
				<Drawer
					variant="temporary"
					open={mobileOpen}
					onClose={handleDrawerToggle}
					ModalProps={{ keepMounted: true }}
					sx={{
						"& .MuiDrawer-paper": {
							width: DRAWER_WIDTH,
							boxSizing: "border-box",
						},
					}}
				>
					{drawerContent}
				</Drawer>
			) : (
				<Drawer
					variant="permanent"
					sx={{
						width: currentDrawerWidth,
						flexShrink: 0,
						"& .MuiDrawer-paper": {
							width: currentDrawerWidth,
							boxSizing: "border-box",
							overflowX: "hidden",
							transition: theme.transitions.create("width", {
								easing: theme.transitions.easing.sharp,
								duration: theme.transitions.duration.enteringScreen,
							}),
						},
					}}
				>
					{drawerContent}
				</Drawer>
			)}

			{/* Main content */}
			<Box
				component="main"
				sx={{
					flexGrow: 1,
					p: 3,
					mt: 8,
					backgroundColor: "background.default",
					minHeight: "100vh",
					transition: theme.transitions.create("margin", {
						easing: theme.transitions.easing.sharp,
						duration: theme.transitions.duration.enteringScreen,
					}),
				}}
			>
				<Outlet />
			</Box>
		</Box>
	);
}
