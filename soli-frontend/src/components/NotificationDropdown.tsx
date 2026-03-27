import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
	IconButton,
	Badge,
	Menu,
	Box,
	Typography,
	Divider,
	ListItemButton,
	ListItemText,
	ListItemIcon,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import AssignmentIcon from "@mui/icons-material/Assignment";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import api from "../api";
import { useRole } from "../context/RoleContext";
import type { Task } from "../types/models/Task";

interface NotificationItem {
	taskId: string;
	title: string;
	subtitle: string;
	timestamp: string; // createdAt for volunteer, updatedAt for requester
}

export default function NotificationDropdown() {
	const navigate = useNavigate();
	const { role } = useRole();
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
	const [notifications, setNotifications] = useState<NotificationItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [notificationsReadAt, setNotificationsReadAt] = useState<string | null>(null);

	const fetchNotifications = useCallback(async () => {
		setLoading(true);
		try {
			if (role === "volunteer") {
				const [tasksRes, userRes] = await Promise.all([
					api.get("/api/tasks", { params: { size: 100 } }),
					api.get("/api/users/me"),
				]);
				const allTasks: Task[] = tasksRes.data?.data || [];
				const currentUserId: string = userRes.data?.id;
				setNotificationsReadAt(userRes.data?.notificationsReadAt || null);
				const openTasks = allTasks
					.filter((t) => t.status === "OPEN" && t.creatorId !== currentUserId)
					.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
				setNotifications(
					openTasks.map((t) => ({
						taskId: t.id,
						title: t.title,
						subtitle: t.category ? t.category.replace(/_/g, " ") : "Task disponibile",
						timestamp: t.createdAt,
					})),
				);
			} else {
				const [tasksRes, userRes] = await Promise.all([
					api.get("/api/tasks/my-accepted"),
					api.get("/api/users/me"),
				]);
				const tasks: Task[] = tasksRes.data || [];
				setNotificationsReadAt(userRes.data?.notificationsReadAt || null);
				tasks.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
				setNotifications(
					tasks.map((t) => ({
						taskId: t.id,
						title: t.title,
						subtitle: "Accettato da un volontario",
						timestamp: t.updatedAt,
					})),
				);
			}
		} catch (err) {
			console.error("Error fetching notifications:", err);
			setNotifications([]);
		} finally {
			setLoading(false);
		}
	}, [role]);

	// Re-fetch when role changes + auto-poll
	useEffect(() => {
		fetchNotifications();
		const interval = setInterval(fetchNotifications, 3000);
		return () => clearInterval(interval);
	}, [fetchNotifications]);

	const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
		setAnchorEl(event.currentTarget);
		fetchNotifications();
	};

	const handleClose = () => {
		// Persist read timestamp on backend
		if (notifications.length > 0) {
			api.put("/api/users/me/notifications-read").catch(() => {});
			// Optimistically set the read timestamp to now
			setNotificationsReadAt(new Date().toISOString());
		}
		setAnchorEl(null);
	};

	const handleItemClick = (taskId: string) => {
		handleClose();
		navigate(`/dashboard/requests/${taskId}`);
	};

	// Compute unseen count: notifications whose timestamp is after notificationsReadAt
	const unseenCount = notifications.filter((n) => {
		if (!notificationsReadAt) return true; // Never read → all unseen
		return new Date(n.timestamp).getTime() > new Date(notificationsReadAt).getTime();
	}).length;

	return (
		<>
			<IconButton
				onClick={handleOpen}
				size="small"
				sx={{
					mr: 1,
					color: "text.secondary",
					"&:hover": { color: "primary.main" },
					transition: "color 0.2s",
				}}
			>
				<Badge
					badgeContent={unseenCount}
					color="error"
					max={99}
					sx={{
						"& .MuiBadge-badge": {
							fontWeight: 700,
							fontSize: "0.7rem",
							minWidth: 18,
							height: 18,
						},
					}}
				>
					{notifications.length > 0 ? (
						<NotificationsIcon />
					) : (
						<NotificationsNoneIcon />
					)}
				</Badge>
			</IconButton>

			<Menu
				anchorEl={anchorEl}
				open={Boolean(anchorEl)}
				onClose={handleClose}
				transformOrigin={{ horizontal: "right", vertical: "top" }}
				anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
				slotProps={{
					paper: {
						sx: {
							borderRadius: 3,
							minWidth: 320,
							maxWidth: 380,
							maxHeight: 420,
							mt: 0.5,
							boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
							overflow: "hidden",
						},
					},
				}}
			>
				{/* Header */}
				<Box sx={{ px: 2.5, pt: 2, pb: 1.5 }}>
					<Typography variant="subtitle1" fontWeight={700}>
						Notifiche
					</Typography>
					{unseenCount > 0 && (
						<Typography variant="caption" color="text.secondary">
							{unseenCount} {unseenCount === 1 ? "nuova" : "nuove"}
						</Typography>
					)}
				</Box>

				<Divider />

				{/* Content */}
				<Box sx={{ overflowY: "auto", maxHeight: 300 }}>
					{loading ? (
						<Box sx={{ p: 3, textAlign: "center" }}>
							<Typography variant="body2" color="text.secondary">
								Caricamento...
							</Typography>
						</Box>
					) : notifications.length === 0 ? (
						<Box sx={{ p: 4, textAlign: "center" }}>
							<NotificationsNoneIcon sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
							<Typography variant="body2" color="text.secondary">
								Nessuna notifica
							</Typography>
						</Box>
					) : (
						notifications.map((item, index) => (
							<ListItemButton
								key={`${item.taskId}-${index}`}
								onClick={() => handleItemClick(item.taskId)}
								sx={{
									px: 2.5,
									py: 1.5,
									"&:hover": {
										bgcolor: "rgba(0, 121, 107, 0.06)",
									},
								}}
							>
								<ListItemIcon sx={{ minWidth: 40 }}>
									{role === "volunteer" ? (
										<AssignmentIcon sx={{ color: "primary.main" }} />
									) : (
										<CheckCircleIcon sx={{ color: "success.main" }} />
									)}
								</ListItemIcon>
								<ListItemText
									primary={item.title}
									secondary={item.subtitle}
									primaryTypographyProps={{
										fontWeight: 600,
										fontSize: "0.875rem",
										noWrap: true,
									}}
									secondaryTypographyProps={{
										fontSize: "0.75rem",
										noWrap: true,
									}}
								/>
							</ListItemButton>
						))
					)}
				</Box>
			</Menu>
		</>
	);
}
