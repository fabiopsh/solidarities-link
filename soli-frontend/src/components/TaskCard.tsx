import { useState, useEffect } from "react";
import { Box, Card, CardContent, Typography, Chip, Stack, Button, Divider, useTheme, useMediaQuery } from "@mui/material";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import EventIcon from "@mui/icons-material/Event";
import ScheduleIcon from "@mui/icons-material/Schedule";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import BackpackIcon from "@mui/icons-material/Backpack";
import GroupsIcon from "@mui/icons-material/Groups";
import PetsIcon from "@mui/icons-material/Pets";
import ComputerIcon from "@mui/icons-material/Computer";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import WarningIcon from "@mui/icons-material/Warning";
import ReportIcon from "@mui/icons-material/Report";
import CategoryIcon from "@mui/icons-material/Category";
import type { Task, UrgencyLevel } from "../types/models/Task";
import type { ServiceCategory } from "../types/models/VolunteerProfile";
import api, { USER_BASIC_CACHE_TTL } from "../api";
import UserAvatar from "./UserAvatar";
import { formatScheduledAt } from "../utils/dateFormat";

const CATEGORY_CONFIG: Record<ServiceCategory | string, { label: string; icon: any; color: string }> = {
    MOBILITY: { label: "Mobilità", icon: DirectionsCarIcon, color: "#2196f3" },
    PHYSICAL_SUPPORT: { label: "Supporto Fisico", icon: BackpackIcon, color: "#4caf50" },
    SOCIAL: { label: "Socialità", icon: GroupsIcon, color: "#9c27b0" },
    PET_SUPPORT: { label: "Animali", icon: PetsIcon, color: "#ff9800" },
    DIGITAL: { label: "Digitale", icon: ComputerIcon, color: "#607d8b" },
    // Fallbacks for older data if any
    SHOPPING: { label: "Spesa", icon: BackpackIcon, color: "#4caf50" },
    DELIVERY: { label: "Consegna", icon: DirectionsCarIcon, color: "#2196f3" },
    TRANSPORT: { label: "Trasporto", icon: DirectionsCarIcon, color: "#2196f3" },
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

interface TaskCardProps {
    task: Task;
    currentUserId?: string;
    onDetailsClick?: (taskId: string) => void;
    onCancelClick?: (task: Task) => void;
}

export default function TaskCard({ task, currentUserId, onDetailsClick, onCancelClick }: TaskCardProps) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

    const getStatusConfig = (status: string) => STATUS_CONFIG[status] || { label: status, color: "default" };
    const getUrgencyConfig = (urgency: string) => URGENCY_CONFIG[urgency] || { label: urgency, color: "default", icon: WarningIcon };
    const getCategoryConfig = (cat: string) => CATEGORY_CONFIG[cat] || { label: cat, icon: CategoryIcon, color: "#grey" };

    const isCreator = task.creatorId === currentUserId;

    const [creator, setCreator] = useState<{ firstName: string; lastName: string } | null>(null);
    const [volunteer, setVolunteer] = useState<{ firstName: string; lastName: string } | null>(null);

    useEffect(() => {
        let isMounted = true;

        const fetchNames = async () => {
            const fetches = await Promise.allSettled([
                task.creatorId
                    ? api.get(`/api/users/${task.creatorId}/basic`, { cache: { ttl: USER_BASIC_CACHE_TTL } })
                    : Promise.resolve(null),
                task.volunteerId
                    ? api.get(`/api/users/${task.volunteerId}/basic`, { cache: { ttl: USER_BASIC_CACHE_TTL } })
                    : Promise.resolve(null),
            ]);
            if (!isMounted) return;
            if (fetches[0].status === "fulfilled" && fetches[0].value) setCreator(fetches[0].value.data);
            if (fetches[1].status === "fulfilled" && fetches[1].value) setVolunteer(fetches[1].value.data);
        };

        fetchNames();

        return () => {
            isMounted = false;
        };
    }, [task.creatorId, task.volunteerId]);

    return (
        <Card
            sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                borderRadius: 4,
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                transition: "all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)",
                border: "1px solid",
                borderColor: "divider",
                position: "relative",
                overflow: "hidden",
                bgcolor: "background.paper",
                "&:hover": {
                    transform: "translateY(-6px)",
                    boxShadow: "0 12px 36px rgba(0,0,0,0.12)",
                    borderColor: getCategoryConfig(task.category).color,
                },
            }}
        >
            <CardContent sx={{ flexGrow: 1, p: { xs: 2.5, sm: 3 } }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2.5, gap: 1, flexWrap: "wrap" }}>
                    <Stack direction="row" spacing={1}>
                        <Chip
                            label={getStatusConfig(task.status).label}
                            color={getStatusConfig(task.status).color as any}
                            size="small"
                            sx={{ fontWeight: 800, borderRadius: 1.5, textTransform: "uppercase", fontSize: "0.65rem" }}
                        />
                    </Stack>
                </Box>

                <Typography
                    variant="h5"
                    fontWeight={900}
                    gutterBottom
                    sx={{
                        lineHeight: 1.2,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        color: "text.primary",
                        mb: 1.5
                    }}
                    title={task.title}
                >
                    {task.title}
                </Typography>

                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                        mb: 3,
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        minHeight: 54,
                        lineHeight: 1.5
                    }}
                >
                    {task.description || "Nessuna descrizione disponibile per questa richiesta."}
                </Typography>

                <Stack spacing={1.5} sx={{ mb: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Box sx={{ p: 0.8, borderRadius: 1.5, bgcolor: `${getCategoryConfig(task.category).color}15`, display: "flex" }}>
                            {(() => { const Icon = getCategoryConfig(task.category).icon; return <Icon sx={{ fontSize: 18, color: getCategoryConfig(task.category).color }} />; })()}
                        </Box>
                        <Typography variant="body2" color="text.primary" fontWeight={700}>
                            {getCategoryConfig(task.category).label}
                        </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                        <Box sx={{ p: 0.8, borderRadius: 1.5, bgcolor: "grey.100", display: "flex" }}>
                            <LocationOnIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ flex: 1, pt: 0.5, fontSize: "0.85rem" }}>
                            {task.targetAddress || "Indirizzo non specificato"}
                        </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Box
                            sx={{
                                p: 0.8,
                                borderRadius: 1.5,
                                bgcolor: (theme) => {
                                    const color = getUrgencyConfig(task.urgencyLevel).color;
                                    return color === "default" ? "grey.100" : `${theme.palette[color].main}15`;
                                },
                                display: "flex"
                            }}
                        >
                            {(() => {
                                const config = getUrgencyConfig(task.urgencyLevel);
                                const Icon = config.icon;
                                return <Icon sx={{ fontSize: 18, color: config.color === "default" ? "text.secondary" : `${config.color}.main` }} />;
                            })()}
                        </Box>
                        <Typography variant="body2" color={getUrgencyConfig(task.urgencyLevel).color === "default" ? "text.primary" : `${getUrgencyConfig(task.urgencyLevel).color}.main` as any} fontWeight={700}>
                            Urgenza: {getUrgencyConfig(task.urgencyLevel).label}
                        </Typography>
                    </Box>
                    {task.scheduledAt && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <Box sx={{ p: 0.8, borderRadius: 1.5, bgcolor: "grey.100", display: "flex" }}>
                                <ScheduleIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                            </Box>
                            <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ fontSize: "0.85rem" }}>
                                {formatScheduledAt(task.scheduledAt!, task.hasScheduledTime, "short")}
                            </Typography>
                        </Box>
                    )}
                </Stack>

                <Divider sx={{ my: 2, borderStyle: "dashed" }} />

                <Stack spacing={1}>
                    {creator && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <UserAvatar userId={task.creatorId} firstName={creator.firstName} lastName={creator.lastName} sx={{ width: 24, height: 24, fontSize: "0.75rem", bgcolor: "primary.main" }} />
                            <Typography variant="caption" color="text.primary" fontWeight={600}>
                                Richiedente: {creator.firstName} {creator.lastName}
                            </Typography>
                        </Box>
                    )}

                    {(task.status === "ACCEPTED" || task.status === "IN_PROGRESS" || task.status === "COMPLETED") && volunteer && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <UserAvatar userId={task.volunteerId} firstName={volunteer.firstName} lastName={volunteer.lastName} sx={{ width: 24, height: 24, fontSize: "0.75rem", bgcolor: "secondary.main" }} />
                            <Typography variant="caption" color="text.primary" fontWeight={600}>
                                Volontario: {volunteer.firstName} {volunteer.lastName}
                            </Typography>
                        </Box>
                    )}
                </Stack>
            </CardContent>

            <Box sx={{ p: 2.5, pt: 0, bgcolor: "background.paper" }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    <Button
                        size="large"
                        variant="contained"
                        color="primary"
                        fullWidth={isMobile}
                        onClick={() => onDetailsClick && onDetailsClick(task.id!)}
                        sx={{
                            borderRadius: 2.5,
                            textTransform: "none",
                            fontWeight: 800,
                            px: 4,
                            py: 1.2,
                            boxShadow: "0 4px 12px rgba(0, 121, 107, 0.2)",
                            flex: 1
                        }}
                        disableElevation
                    >
                        Dettagli
                    </Button>

                    {(task.status === "OPEN") && isCreator && onCancelClick && (
                        <Button
                            size="large"
                            variant="outlined"
                            color="error"
                            onClick={() => onCancelClick(task)}
                            sx={{ borderRadius: 2.5, textTransform: "none", fontWeight: 700, flex: 1 }}
                        >
                            Annulla
                        </Button>
                    )}
                </Box>
            </Box>
        </Card>
    );
}
