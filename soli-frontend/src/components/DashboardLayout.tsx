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
import AssignmentIcon from "@mui/icons-material/Assignment";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
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
	{ label: "Wallet", icon: <EmojiEventsIcon />, path: "/dashboard/wallet" },
];

const adminNavItems: NavItem[] = [{ label: "Gestione Admin", icon: <DashboardIcon />, path: "/dashboard/admin" }];

const bottomNavItems: NavItem[] = [{ label: "Profilo", icon: <PersonIcon />, path: "/dashboard/profile" }];

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

	const drawerContent = (
		<Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
			{/* Logo / Brand */}
			<Toolbar
				sx={{
					display: "flex",
					alignItems: "center",
					justifyContent: (isMobile ? mobileOpen : !drawerCollapsed) ? "space-between" : "center",
					px: (isMobile ? mobileOpen : !drawerCollapsed) ? 2 : 1,
				}}
			>
				{(isMobile ? mobileOpen : !drawerCollapsed) && (
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
					{(isMobile ? mobileOpen : !drawerCollapsed) ? <ChevronLeftIcon /> : <MenuIcon />}
				</IconButton>
			</Toolbar>

			<Divider />

			{/* Main Nav Items */}
			<List sx={{ flexGrow: 1, px: 1, py: 2 }}>
				{navItems.map((item) => (
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
							justifyContent: (isMobile ? mobileOpen : !drawerCollapsed) ? "initial" : "center",
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
								mr: (isMobile ? mobileOpen : !drawerCollapsed) ? 2 : "auto",
								justifyContent: "center",
							}}
						>
							{item.icon}
						</ListItemIcon>
						{!(isMobile ? false : drawerCollapsed) && (
							<ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 600 }} />
						)}
					</ListItemButton>
				))}

				{isAdmin && (
					<>
						<Divider sx={{ my: 1 }} />
						<Typography
							variant="caption"
							sx={{
								px: (isMobile ? false : drawerCollapsed) ? 0 : 2,
								display: "block",
								textAlign: (isMobile ? false : drawerCollapsed) ? "center" : "left",
								color: "text.secondary",
								fontWeight: "bold",
								mb: 1,
							}}
						>
							{(isMobile ? false : drawerCollapsed) ? "ADM" : "ADMIN"}
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
									justifyContent: (isMobile ? mobileOpen : !drawerCollapsed) ? "initial" : "center",
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
										mr: (isMobile ? mobileOpen : !drawerCollapsed) ? 2 : "auto",
										justifyContent: "center",
									}}
								>
									{item.icon}
								</ListItemIcon>
								{!(isMobile ? false : drawerCollapsed) && (
									<ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 600 }} />
								)}
							</ListItemButton>
						))}
					</>
				)}
			</List>

			{/* Bottom navigation */}
			<List sx={{ px: 1, pb: 1 }}>
				{bottomNavItems.map((item) => (
					<ListItemButton
						key={item.path}
						selected={location.pathname === item.path}
						onClick={() => handleNav(item.path)}
						sx={{
							minHeight: 48,
							justifyContent: (isMobile ? mobileOpen : !drawerCollapsed) ? "initial" : "center",
							px: 2,
						}}
					>
						<ListItemIcon
							sx={{
								minWidth: 0,
								mr: (isMobile ? mobileOpen : !drawerCollapsed) ? 2 : "auto",
								justifyContent: "center",
							}}
						>
							{item.icon}
						</ListItemIcon>
						{(isMobile ? mobileOpen : !drawerCollapsed) && (
							<ListItemText primary={item.label} primaryTypographyProps={{ fontSize: "0.9rem" }} />
						)}
					</ListItemButton>
				))}
			</List>

			{/* User info at bottom */}
			{(isMobile ? mobileOpen : !drawerCollapsed) && (
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
						<MenuItem
							onClick={() => {
								handleMenuClose();
								handleNav("/dashboard/profile");
							}}
						>
							<ListItemIcon>
								<PersonIcon fontSize="small" />
							</ListItemIcon>
							Profilo
						</MenuItem>
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
