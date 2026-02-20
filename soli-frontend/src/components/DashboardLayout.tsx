import { useState } from "react";
import { useAuth } from "react-oidc-context";
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
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import VolunteerActivismIcon from "@mui/icons-material/VolunteerActivism";
import AssignmentIcon from "@mui/icons-material/Assignment";
import ChatIcon from "@mui/icons-material/Chat";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonIcon from "@mui/icons-material/Person";
import HandshakeIcon from "@mui/icons-material/Handshake";

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
	{ label: "Volontari", icon: <VolunteerActivismIcon />, path: "/dashboard/volunteers" },
	{ label: "Utenti", icon: <PeopleIcon />, path: "/dashboard/users" },
	{ label: "Chat", icon: <ChatIcon />, path: "/dashboard/chat" },
	{ label: "Crediti SOLI", icon: <EmojiEventsIcon />, path: "/dashboard/credits" },
];

const bottomNavItems: NavItem[] = [{ label: "Impostazioni", icon: <SettingsIcon />, path: "/dashboard/settings" }];

export default function DashboardLayout() {
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down("md"));
	const [drawerOpen, setDrawerOpen] = useState(!isMobile);
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
	const auth = useAuth();
	const navigate = useNavigate();
	const location = useLocation();

	const userName = auth.user?.profile?.given_name || auth.user?.profile?.name || "Utente";
	const userEmail = auth.user?.profile?.email || "";
	const userInitials = userName.charAt(0).toUpperCase();

	const handleDrawerToggle = () => setDrawerOpen(!drawerOpen);
	const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
	const handleMenuClose = () => setAnchorEl(null);

	const handleLogout = () => {
		handleMenuClose();
		auth.signoutRedirect();
	};

	const handleNav = (path: string) => {
		navigate(path);
		if (isMobile) setDrawerOpen(false);
	};

	const drawerContent = (
		<Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
			{/* Logo / Brand */}
			<Toolbar
				sx={{
					display: "flex",
					alignItems: "center",
					justifyContent: drawerOpen ? "space-between" : "center",
					px: drawerOpen ? 2 : 1,
				}}
			>
				{drawerOpen && (
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
					{drawerOpen ? <ChevronLeftIcon /> : <MenuIcon />}
				</IconButton>
			</Toolbar>

			<Divider />

			{/* Main navigation */}
			<List sx={{ flexGrow: 1, px: 1, pt: 1 }}>
				{navItems.map((item) => (
					<ListItemButton
						key={item.path}
						selected={location.pathname === item.path}
						onClick={() => handleNav(item.path)}
						sx={{
							minHeight: 48,
							justifyContent: drawerOpen ? "initial" : "center",
							px: 2,
							mb: 0.5,
						}}
					>
						<ListItemIcon
							sx={{
								minWidth: 0,
								mr: drawerOpen ? 2 : "auto",
								justifyContent: "center",
								color: location.pathname === item.path ? "primary.main" : "text.secondary",
							}}
						>
							{item.icon}
						</ListItemIcon>
						{drawerOpen && (
							<ListItemText
								primary={item.label}
								primaryTypographyProps={{
									fontWeight: location.pathname === item.path ? 600 : 400,
									fontSize: "0.9rem",
								}}
							/>
						)}
					</ListItemButton>
				))}
			</List>

			<Divider />

			{/* Bottom navigation */}
			<List sx={{ px: 1, pb: 1 }}>
				{bottomNavItems.map((item) => (
					<ListItemButton
						key={item.path}
						selected={location.pathname === item.path}
						onClick={() => handleNav(item.path)}
						sx={{
							minHeight: 48,
							justifyContent: drawerOpen ? "initial" : "center",
							px: 2,
						}}
					>
						<ListItemIcon
							sx={{
								minWidth: 0,
								mr: drawerOpen ? 2 : "auto",
								justifyContent: "center",
							}}
						>
							{item.icon}
						</ListItemIcon>
						{drawerOpen && <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: "0.9rem" }} />}
					</ListItemButton>
				))}
			</List>

			{/* User info at bottom */}
			{drawerOpen && (
				<>
					<Divider />
					<Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
						<Avatar sx={{ bgcolor: "primary.main", width: 36, height: 36, fontSize: "0.9rem" }}>
							{userInitials}
						</Avatar>
						<Box sx={{ overflow: "hidden" }}>
							<Typography variant="body2" fontWeight={600} noWrap>
								{userName}
							</Typography>
							<Typography variant="caption" color="text.secondary" noWrap>
								{userEmail}
							</Typography>
						</Box>
					</Box>
				</>
			)}
		</Box>
	);

	const currentDrawerWidth = drawerOpen ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED;

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

					<IconButton onClick={handleMenuOpen} size="small">
						<Avatar sx={{ bgcolor: "primary.main", width: 36, height: 36, fontSize: "0.875rem" }}>
							{userInitials}
						</Avatar>
					</IconButton>

					<Menu
						anchorEl={anchorEl}
						open={Boolean(anchorEl)}
						onClose={handleMenuClose}
						transformOrigin={{ horizontal: "right", vertical: "top" }}
						anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
					>
						<MenuItem onClick={handleMenuClose}>
							<ListItemIcon>
								<PersonIcon fontSize="small" />
							</ListItemIcon>
							Profilo
						</MenuItem>
						<MenuItem onClick={handleMenuClose}>
							<ListItemIcon>
								<SettingsIcon fontSize="small" />
							</ListItemIcon>
							Impostazioni
						</MenuItem>
						<Divider />
						<MenuItem onClick={handleLogout}>
							<ListItemIcon>
								<LogoutIcon fontSize="small" />
							</ListItemIcon>
							Esci
						</MenuItem>
					</Menu>
				</Toolbar>
			</AppBar>

			{/* Sidebar Drawer */}
			{isMobile ? (
				<Drawer
					variant="temporary"
					open={drawerOpen}
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
