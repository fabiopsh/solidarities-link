import { useEffect, useState } from "react";
import { Box, Button, Typography, CircularProgress, Alert, Chip, Stack, Divider, Drawer, IconButton } from "@mui/material";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import ScheduleIcon from "@mui/icons-material/Schedule";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import BackpackIcon from "@mui/icons-material/Backpack";
import GroupsIcon from "@mui/icons-material/Groups";
import PetsIcon from "@mui/icons-material/Pets";
import ComputerIcon from "@mui/icons-material/Computer";
import WarningIcon from "@mui/icons-material/Warning";
import ReportIcon from "@mui/icons-material/Report";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import EventIcon from "@mui/icons-material/Event";
import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import UserAvatar from "./UserAvatar";
import api, { USER_BASIC_CACHE_TTL } from "../api";
import { formatScheduledAt } from "../utils/dateFormat";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { Task, UrgencyLevel } from "../types/models/Task";
import type { ServiceCategory } from "../types/models/VolunteerProfile";

// ── Category config (same as TaskCard) ──────────────────────────────
const CATEGORY_CONFIG: Record<ServiceCategory | string, { label: string; icon: any; color: string; mapIcon: string }> = {
    MOBILITY: { label: "Mobilità", icon: DirectionsCarIcon, color: "#2196f3", mapIcon: "🚗" },
    PHYSICAL_SUPPORT: { label: "Supporto Fisico", icon: BackpackIcon, color: "#4caf50", mapIcon: "💪" },
    SOCIAL: { label: "Socialità", icon: GroupsIcon, color: "#9c27b0", mapIcon: "👥" },
    PET_SUPPORT: { label: "Animali", icon: PetsIcon, color: "#ff9800", mapIcon: "🐾" },
    DIGITAL: { label: "Digitale", icon: ComputerIcon, color: "#607d8b", mapIcon: "💻" },
    SHOPPING: { label: "Spesa", icon: BackpackIcon, color: "#4caf50", mapIcon: "🛒" },
    DELIVERY: { label: "Consegna", icon: DirectionsCarIcon, color: "#2196f3", mapIcon: "📦" },
    TRANSPORT: { label: "Trasporto", icon: DirectionsCarIcon, color: "#2196f3", mapIcon: "🚗" },
};

const URGENCY_CONFIG: Record<UrgencyLevel | string, { label: string; color: "success" | "warning" | "error" | "default"; icon: any }> = {
    LOW: { label: "Bassa", color: "success", icon: EventIcon },
    MEDIUM: { label: "Media", color: "warning", icon: AccessTimeIcon },
    HIGH: { label: "Alta", color: "error", icon: WarningIcon },
    CRITICAL: { label: "Critica", color: "error", icon: ReportIcon },
};

const STATUS_CONFIG: Record<string, { label: string; color: "success" | "info" | "warning" | "primary" | "error" | "default" }> = {
    OPEN: { label: "Aperto", color: "success" },
    ACCEPTED: { label: "Accettato", color: "info" },
    IN_PROGRESS: { label: "In Corso", color: "warning" },
    COMPLETED: { label: "Completato", color: "primary" },
    CANCELLED: { label: "Annullato", color: "error" },
};

const getCategoryConfig = (cat: string) => CATEGORY_CONFIG[cat] || { label: cat, icon: BackpackIcon, color: "#9e9e9e", mapIcon: "📌" };
const getUrgencyConfig = (urgency: string) => URGENCY_CONFIG[urgency] || { label: urgency, color: "default", icon: WarningIcon };
const getStatusConfig = (status: string) => STATUS_CONFIG[status] || { label: status, color: "default" };

// ── Custom SVG icon for user location (red pushpin) ─────────────────
const userLocationIcon = L.divIcon({
    className: "soli-user-marker",
    html: `
        <div style="position:relative;width:40px;height:48px;">
            <svg viewBox="0 0 40 48" width="40" height="48" xmlns="http://www.w3.org/2000/svg">
                <!-- Pin shadow -->
                <ellipse cx="20" cy="46" rx="8" ry="2.5" fill="rgba(0,0,0,0.18)"/>
                <!-- Pin body -->
                <path d="M20 2C12.268 2 6 8.268 6 16c0 10 14 28 14 28s14-18 14-28C34 8.268 27.732 2 20 2z" fill="#D32F2F" stroke="#B71C1C" stroke-width="1.2"/>
                <!-- Inner circle highlight -->
                <circle cx="20" cy="16" r="7" fill="#FFFFFF" opacity="0.95"/>
                <!-- Center dot -->
                <circle cx="20" cy="16" r="4" fill="#D32F2F"/>
                <!-- Shine effect -->
                <path d="M13 10c1.5-3 4.5-5 7-5 1 0 .5.5-.5 1-2 1-4 3-4.5 5.5-.2.8-.8.5-.8 0-.1-.5-.5-1-1.2-1.5z" fill="rgba(255,255,255,0.45)"/>
            </svg>
        </div>
    `,
    iconSize: [40, 48],
    iconAnchor: [20, 46],
    popupAnchor: [0, -42],
});

// ── Create category-colored marker with emoji ─────────────────────
function createTaskIcon(category: string): L.DivIcon {
    const config = getCategoryConfig(category);
    const color = config.color;
    const darkerColor = darkenHex(color, 30);

    return L.divIcon({
        className: "soli-task-marker",
        html: `
            <div style="position:relative;width:38px;height:46px;">
                <svg viewBox="0 0 38 46" width="38" height="46" xmlns="http://www.w3.org/2000/svg">
                    <!-- Pin shadow -->
                    <ellipse cx="19" cy="44" rx="7" ry="2.2" fill="rgba(0,0,0,0.15)"/>
                    <!-- Pin body -->
                    <path d="M19 2C11.82 2 6 7.82 6 15c0 9.5 13 27 13 27s13-17.5 13-27C32 7.82 26.18 2 19 2z" fill="${color}" stroke="${darkerColor}" stroke-width="1"/>
                    <!-- White inner circle -->
                    <circle cx="19" cy="15" r="9" fill="#FFFFFF" opacity="0.92"/>
                </svg>
                <div style="
                    position:absolute;
                    top:6px;
                    left:0;
                    width:38px;
                    height:20px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    font-size:14px;
                    line-height:1;
                    pointer-events:none;
                ">${config.mapIcon}</div>
            </div>
        `,
        iconSize: [38, 46],
        iconAnchor: [19, 44],
        popupAnchor: [0, -40],
    });
}

// Utility to darken a hex colour
function darkenHex(hex: string, amount: number): string {
    const num = parseInt(hex.replace("#", ""), 16);
    const r = Math.max(0, (num >> 16) - amount);
    const g = Math.max(0, ((num >> 8) & 0x00FF) - amount);
    const b = Math.max(0, (num & 0x0000FF) - amount);
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, "0")}`;
}

// Child component to handle map centering when a location is provided
function AutoCenterMap({ position }: { position: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.flyTo(position, map.getZoom());
    }, [position, map]);
    return null;
}

// ── Task Detail Drawer ──────────────────────────────────────────────
interface BasicUser {
    id: string;
    firstName: string;
    lastName: string;
}

function TaskDetailDrawer({ task, open, onClose }: { task: Task | null; open: boolean; onClose: () => void }) {
    const navigate = useNavigate();
    const [creator, setCreator] = useState<BasicUser | null>(null);
    const [volunteer, setVolunteer] = useState<BasicUser | null>(null);

    useEffect(() => {
        if (!task || !open) {
            setCreator(null);
            setVolunteer(null);
            return;
        }

        let mounted = true;
        const fetchUsers = async () => {
            try {
                if (task.creatorId) {
                    const res = await api.get(`/api/users/${task.creatorId}/basic`, { cache: { ttl: USER_BASIC_CACHE_TTL } });
                    if (mounted) setCreator(res.data);
                }
                if (task.volunteerId) {
                    const res = await api.get(`/api/users/${task.volunteerId}/basic`, { cache: { ttl: USER_BASIC_CACHE_TTL } });
                    if (mounted) setVolunteer(res.data);
                }
            } catch (err) {
                console.error("Failed to fetch user details", err);
            }
        };
        fetchUsers();
        return () => { mounted = false; };
    }, [task?.id, open]);

    if (!task) return null;

    const catConfig = getCategoryConfig(task.category);
    const urgConfig = getUrgencyConfig(task.urgencyLevel);
    const statusConfig = getStatusConfig(task.status);
    const CatIcon = catConfig.icon;
    const UrgIcon = urgConfig.icon;

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    width: { xs: "100%", sm: 420 },
                    borderRadius: { xs: 0, sm: "16px 0 0 16px" },
                    boxShadow: "-8px 0 32px rgba(0,0,0,0.12)",
                },
            }}
        >
            {/* Coloured header band */}
            <Box
                sx={{
                    background: `linear-gradient(135deg, ${catConfig.color} 0%, ${catConfig.color}CC 100%)`,
                    color: "#fff",
                    px: 3,
                    pt: 3,
                    pb: 2.5,
                    position: "relative",
                }}
            >
                <IconButton
                    onClick={onClose}
                    sx={{ position: "absolute", top: 8, right: 8, color: "rgba(255,255,255,0.85)", "&:hover": { bgcolor: "rgba(255,255,255,0.15)" } }}
                >
                    <CloseIcon />
                </IconButton>

                <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                    <Chip
                        label={statusConfig.label}
                        color={statusConfig.color as any}
                        size="small"
                        sx={{ fontWeight: 800, borderRadius: 1.5, textTransform: "uppercase", fontSize: "0.65rem" }}
                    />
                    <Chip
                        label={`Urgenza: ${urgConfig.label}`}
                        color={urgConfig.color as any}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 700, borderRadius: 1.5, fontSize: "0.65rem", borderColor: "rgba(255,255,255,0.5)", color: "#fff" }}
                    />
                </Stack>

                <Typography variant="h5" fontWeight={900} sx={{ lineHeight: 1.2, wordBreak: "break-word" }}>
                    {task.title}
                </Typography>

                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1.5, opacity: 0.9 }}>
                    <CatIcon sx={{ fontSize: 18 }} />
                    <Typography variant="body2" fontWeight={700}>
                        {catConfig.label}
                    </Typography>
                </Box>
            </Box>

            {/* Body */}
            <Box sx={{ px: 3, py: 2.5, flex: 1, overflowY: "auto" }}>
                {/* Description */}
                {task.description && (
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
                            Descrizione
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                            {task.description}
                        </Typography>
                    </Box>
                )}

                <Divider sx={{ borderStyle: "dashed", mb: 2.5 }} />

                {/* Details grid */}
                <Stack spacing={2.5}>
                    {/* Category */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: `${catConfig.color}15`, display: "flex" }}>
                            <CatIcon sx={{ color: catConfig.color }} />
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary" display="block" fontWeight={600}>CATEGORIA</Typography>
                            <Typography variant="body1" fontWeight={700}>{catConfig.label}</Typography>
                        </Box>
                    </Box>

                    {/* Urgency */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Box
                            sx={{
                                p: 1,
                                borderRadius: 1.5,
                                bgcolor: (theme: any) => {
                                    const color = urgConfig.color;
                                    return color === "default" ? "action.hover" : `${theme.palette[color].main}20`;
                                },
                                display: "flex",
                            }}
                        >
                            <UrgIcon sx={{ color: urgConfig.color === "default" ? "text.secondary" : `${urgConfig.color}.main` }} />
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary" display="block" fontWeight={600}>URGENZA</Typography>
                            <Typography
                                variant="body1"
                                fontWeight={700}
                                sx={{ color: urgConfig.color === "default" ? "text.primary" : `${urgConfig.color}.main` }}
                            >
                                {urgConfig.label}
                            </Typography>
                        </Box>
                    </Box>

                    {/* Address */}
                    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                        <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: "action.hover", display: "flex" }}>
                            <LocationOnIcon color="action" />
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary" display="block" fontWeight={600}>INDIRIZZO / LUOGO</Typography>
                            <Typography variant="body1" fontWeight={500}>{task.targetAddress || "Non specificato"}</Typography>
                        </Box>
                    </Box>

                    {/* Scheduled date */}
                    {task.scheduledAt && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                            <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: "action.hover", display: "flex" }}>
                                <ScheduleIcon color="action" />
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" display="block" fontWeight={600}>
                                    {(() => { const timeIsSet = task.hasScheduledTime != null ? task.hasScheduledTime : (new Date(task.scheduledAt!).getHours() !== 0 || new Date(task.scheduledAt!).getMinutes() !== 0); return timeIsSet ? "DATA E ORA PREVISTA" : "DATA PREVISTA"; })()}
                                </Typography>
                                <Typography variant="body1" fontWeight={700}>
                                    {formatScheduledAt(task.scheduledAt!, task.hasScheduledTime, "long")}
                                </Typography>
                            </Box>
                        </Box>
                    )}

                    {/* Reward credits */}
                    {task.rewardCredits > 0 && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                            <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: "#FFF3E0", display: "flex" }}>
                                <Typography sx={{ fontSize: 20, lineHeight: 1 }}>🪙</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" display="block" fontWeight={600}>CREDITI RICOMPENSA</Typography>
                                <Typography variant="body1" fontWeight={700} sx={{ color: "#FF6F00" }}>
                                    {task.rewardCredits} crediti
                                </Typography>
                            </Box>
                        </Box>
                    )}
                </Stack>

                <Divider sx={{ my: 2.5, borderStyle: "dashed" }} />

                {/* People section */}
                <Stack spacing={2}>
                    {creator && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                            <UserAvatar userId={task.creatorId} firstName={creator.firstName} lastName={creator.lastName} sx={{ width: 40, height: 40, bgcolor: "primary.main", fontWeight: "bold" }} />
                            <Box>
                                <Typography variant="caption" color="text.secondary" display="block" fontWeight={600}>RICHIEDENTE</Typography>
                                <Typography variant="body1" fontWeight={700}>{creator.firstName} {creator.lastName}</Typography>
                            </Box>
                        </Box>
                    )}

                    {(task.status === "ACCEPTED" || task.status === "IN_PROGRESS" || task.status === "COMPLETED") && volunteer && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                            <UserAvatar userId={task.volunteerId} firstName={volunteer.firstName} lastName={volunteer.lastName} sx={{ width: 40, height: 40, bgcolor: "secondary.main", fontWeight: "bold" }} />
                            <Box>
                                <Typography variant="caption" color="text.secondary" display="block" fontWeight={600}>VOLONTARIO</Typography>
                                <Typography variant="body1" fontWeight={700}>{volunteer.firstName} {volunteer.lastName}</Typography>
                            </Box>
                        </Box>
                    )}
                </Stack>

                {/* Session details */}
                <Box sx={{ mt: 3, p: 2, bgcolor: "action.hover", borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                        Creato il: {new Date(task.createdAt).toLocaleString("it-IT")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                        Ultimo aggiornamento: {new Date(task.updatedAt).toLocaleString("it-IT")}
                    </Typography>
                </Box>
            </Box>

            {/* Footer action */}
            <Box sx={{ px: 3, py: 2, borderTop: "1px solid", borderColor: "divider" }}>
                <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    disableElevation
                    startIcon={<OpenInNewIcon />}
                    sx={{
                        borderRadius: 2.5,
                        fontWeight: 700,
                        textTransform: "none",
                        py: 1.3,
                        background: `linear-gradient(135deg, ${catConfig.color} 0%, ${catConfig.color}CC 100%)`,
                        "&:hover": {
                            background: `linear-gradient(135deg, ${darkenHex(catConfig.color, 20)} 0%, ${catConfig.color} 100%)`,
                        },
                    }}
                    onClick={() => navigate(`/dashboard/requests/${task.id}`)}
                >
                    Vai alla pagina completa
                </Button>
            </Box>
        </Drawer>
    );
}

// ── Main map component ──────────────────────────────────────────────
export default function TaskMapView({ tasks }: { tasks: Task[] }) {
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isLocating, setIsLocating] = useState(true);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const handleOpenDrawer = (task: Task) => {
        setSelectedTask(task);
        setDrawerOpen(true);
    };

    const handleCloseDrawer = () => {
        setDrawerOpen(false);
    };

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation([position.coords.latitude, position.coords.longitude]);
                    setIsLocating(false);
                },
                (error) => {
                    console.error("Error getting location:", error);
                    setLocationError("Impossibile rilevare la posizione esatta. Verrà mostrata una vista predefinita (Milano).");
                    setUserLocation([45.4642, 9.1900]); // Milan fallback
                    setIsLocating(false);
                }
            );
        } else {
            setLocationError("Geolocalizzazione non supportata dal browser.");
            setUserLocation([45.4642, 9.1900]);
            setIsLocating(false);
        }
    }, []);

    if (isLocating) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 400 }}>
                <CircularProgress />
                <Typography variant="body1" sx={{ ml: 2 }}>Rilevamento posizione in corso...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ width: "100%", mt: 2 }}>
            {locationError && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    {locationError}
                </Alert>
            )}
            <Box sx={{ height: 600, width: "100%", borderRadius: 2, overflow: "hidden", border: "1px solid", borderColor: "divider", zIndex: 0 }}>
                <MapContainer center={userLocation!} zoom={13} style={{ height: "100%", width: "100%" }}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {userLocation && <AutoCenterMap position={userLocation} />}

                    {/* User location marker — red pushpin */}
                    {userLocation && (
                        <Marker position={userLocation} icon={userLocationIcon}>
                            <Popup>
                                <Box sx={{ textAlign: "center", py: 0.5, px: 1 }}>
                                    <Typography variant="subtitle2" fontWeight={700} sx={{ color: "#D32F2F" }}>
                                        📍 La tua posizione
                                    </Typography>
                                </Box>
                            </Popup>
                        </Marker>
                    )}

                    {/* Task markers — category icon & colour */}
                    {tasks.map((task) => {
                        if (task.latitude && task.longitude) {
                            const catConfig = getCategoryConfig(task.category);
                            const urgConfig = getUrgencyConfig(task.urgencyLevel);
                            const statusConfig = getStatusConfig(task.status);
                            return (
                                <Marker
                                    key={task.id}
                                    position={[task.latitude, task.longitude]}
                                    icon={createTaskIcon(task.category)}
                                >
                                    <Popup>
                                        <Box sx={{ minWidth: 280, maxWidth: 320, p: 0.5 }}>
                                            {/* Header — Status + Urgency */}
                                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5, gap: 1 }}>
                                                <Chip
                                                    label={statusConfig.label}
                                                    color={statusConfig.color as any}
                                                    size="small"
                                                    sx={{ fontWeight: 800, borderRadius: 1.5, textTransform: "uppercase", fontSize: "0.65rem" }}
                                                />
                                                <Chip
                                                    label={urgConfig.label}
                                                    color={urgConfig.color as any}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{ fontWeight: 700, borderRadius: 1.5, fontSize: "0.65rem" }}
                                                />
                                            </Box>

                                            {/* Title */}
                                            <Typography
                                                variant="subtitle1"
                                                fontWeight={800}
                                                gutterBottom
                                                sx={{ lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                                                title={task.title}
                                            >
                                                {task.title}
                                            </Typography>

                                            {/* Description */}
                                            {task.description && (
                                                <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                    sx={{
                                                        mb: 1.5,
                                                        display: "-webkit-box",
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: "vertical",
                                                        overflow: "hidden",
                                                        lineHeight: 1.4,
                                                        fontSize: "0.82rem",
                                                    }}
                                                >
                                                    {task.description}
                                                </Typography>
                                            )}

                                            <Divider sx={{ my: 1.5, borderStyle: "dashed" }} />

                                            {/* Category row */}
                                            <Stack spacing={1} sx={{ mb: 1.5 }}>
                                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                    <Box sx={{ p: 0.5, borderRadius: 1, bgcolor: `${catConfig.color}15`, display: "flex" }}>
                                                        {(() => { const Icon = catConfig.icon; return <Icon sx={{ fontSize: 16, color: catConfig.color }} />; })()}
                                                    </Box>
                                                    <Typography variant="body2" fontWeight={700} sx={{ color: catConfig.color }}>
                                                        {catConfig.label}
                                                    </Typography>
                                                </Box>

                                                {/* Address row */}
                                                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                                                    <Box sx={{ p: 0.5, borderRadius: 1, bgcolor: "action.hover", display: "flex" }}>
                                                        <LocationOnIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                                                    </Box>
                                                    <Typography variant="body2" color="text.secondary" sx={{ flex: 1, wordWrap: "break-word", fontSize: "0.82rem" }}>
                                                        {task.targetAddress || "Indirizzo non specificato"}
                                                    </Typography>
                                                </Box>

                                                {/* Date row */}
                                                {task.scheduledAt && (
                                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                        <Box sx={{ p: 0.5, borderRadius: 1, bgcolor: "action.hover", display: "flex" }}>
                                                            <ScheduleIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                                                        </Box>
                                                        <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ fontSize: "0.82rem" }}>
                                                            {formatScheduledAt(task.scheduledAt!, task.hasScheduledTime, "short")}
                                                        </Typography>
                                                    </Box>
                                                )}

                                                {/* Reward credits */}
                                                {task.rewardCredits > 0 && (
                                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                        <Typography variant="body2" fontWeight={700} sx={{ color: "#FF6F00" }}>
                                                            🪙 {task.rewardCredits} crediti
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </Stack>

                                            <Button
                                                size="small"
                                                variant="contained"
                                                fullWidth
                                                disableElevation
                                                sx={{
                                                    borderRadius: 2,
                                                    fontWeight: 700,
                                                    textTransform: "none",
                                                    mt: 0.5,
                                                    background: `linear-gradient(135deg, ${catConfig.color} 0%, ${catConfig.color}CC 100%)`,
                                                    "&:hover": {
                                                        background: `linear-gradient(135deg, ${darkenHex(catConfig.color, 20)} 0%, ${catConfig.color} 100%)`,
                                                    },
                                                }}
                                                onClick={() => handleOpenDrawer(task)}
                                            >
                                                Dettagli Task
                                            </Button>
                                        </Box>
                                    </Popup>
                                </Marker>
                            );
                        }
                        return null;
                    })}
                </MapContainer>
            </Box>

            {/* Task detail drawer — opens on top of map */}
            <TaskDetailDrawer task={selectedTask} open={drawerOpen} onClose={handleCloseDrawer} />
        </Box>
    );
}
