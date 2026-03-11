import { useState, useEffect } from "react";
import { Box, Card, CardContent, Typography, Chip, Stack, Button } from "@mui/material";
import CategoryIcon from "@mui/icons-material/Category";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import EventIcon from "@mui/icons-material/Event";
import PersonIcon from "@mui/icons-material/Person";
import type { Task } from "../types/models/Task";
import api, { USER_BASIC_CACHE_TTL } from "../api";

interface TaskCardProps {
    task: Task;
    currentUserId?: string;
    onDetailsClick?: (taskId: string) => void;
    onCancelClick?: (task: Task) => void;
}

export default function TaskCard({ task, currentUserId, onDetailsClick, onCancelClick }: TaskCardProps) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case "OPEN": return "success";
            case "ACCEPTED": return "info";
            case "IN_PROGRESS": return "warning";
            case "COMPLETED": return "primary";
            case "CANCELLED": return "error";
            default: return "default";
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "OPEN": return "Aperto";
            case "ACCEPTED": return "Accettato";
            case "IN_PROGRESS": return "In Corso";
            case "COMPLETED": return "Completato";
            case "CANCELLED": return "Annullato";
            default: return status;
        }
    };

    const getCategoryLabel = (category: string) => {
        switch (category) {
            case "SHOPPING": return "Spesa";
            case "DELIVERY": return "Consegna";
            case "HOUSEHOLD": return "Faccende Domestiche";
            case "TRANSPORT": return "Trasporto";
            case "COMPANY": return "Compagnia";
            case "OTHER": return "Altro";
            default: return category;
        }
    };

    const isCreator = task.creatorId === currentUserId;

    const [creator, setCreator] = useState<{ firstName: string; lastName: string } | null>(null);
    const [volunteer, setVolunteer] = useState<{ firstName: string; lastName: string } | null>(null);

    useEffect(() => {
        let isMounted = true;

        const fetchNames = async () => {
            try {
                if (task.creatorId) {
                    const res = await api.get(`/api/users/${task.creatorId}/basic`, { cache: { ttl: USER_BASIC_CACHE_TTL } });
                    if (isMounted) setCreator(res.data);
                }
                if (task.volunteerId) {
                    const res = await api.get(`/api/users/${task.volunteerId}/basic`, { cache: { ttl: USER_BASIC_CACHE_TTL } });
                    if (isMounted) setVolunteer(res.data);
                }
            } catch (err) {
                console.error("Failed to fetch user names in TaskCard", err);
            }
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
                borderRadius: 3,
                boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
                transition: "all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)",
                border: "1px solid",
                borderColor: "divider",
                position: "relative",
                overflow: "hidden",
                "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
                    borderColor: "primary.main",
                },
            }}
        >
            <CardContent sx={{ flexGrow: 1, p: { xs: 2, sm: 3 } }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2, gap: 1, flexWrap: "wrap" }}>
                    <Chip
                        label={getStatusLabel(task.status)}
                        color={getStatusColor(task.status) as any}
                        size="small"
                        sx={{ fontWeight: 700, borderRadius: 1.5, px: 1 }}
                    />
                    <Chip
                        label={`Urgenza ${task.urgencyLevel}`}
                        size="small"
                        variant="outlined"
                        color={task.urgencyLevel === "CRITICAL" ? "error" : task.urgencyLevel === "HIGH" ? "warning" : "default"}
                        sx={{ fontWeight: 600, borderRadius: 1.5 }}
                    />
                </Box>

                <Typography
                    variant="h6"
                    fontWeight={800}
                    gutterBottom
                    sx={{
                        lineHeight: 1.3,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
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
                        minHeight: 60,
                    }}
                >
                    {task.description || "Nessuna descrizione disponibile per questa richiesta."}
                </Typography>

                <Stack spacing={1.5} sx={{ mt: "auto", bgcolor: "grey.50", p: 1.5, borderRadius: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <CategoryIcon fontSize="small" sx={{ color: "text.secondary" }} />
                        <Typography variant="subtitle2" color="text.primary" fontWeight={600}>
                            {getCategoryLabel(task.category)}
                        </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                        <LocationOnIcon fontSize="small" sx={{ color: "text.secondary", mt: 0.3 }} />
                        <Typography variant="body2" color="text.secondary" sx={{ flex: 1, wordBreak: "break-word" }}>
                            {task.targetAddress || "Indirizzo non specificato"}
                        </Typography>
                    </Box>
                    {task.scheduledAt && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <EventIcon fontSize="small" sx={{ color: "text.secondary" }} />
                            <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                {new Date(task.scheduledAt).toLocaleDateString([], {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </Typography>
                        </Box>
                    )}

                    {creator && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <PersonIcon fontSize="small" sx={{ color: "text.secondary" }} />
                            <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                Richiedente: {creator.firstName} {creator.lastName}
                            </Typography>
                        </Box>
                    )}

                    {(task.status === "ACCEPTED" || task.status === "IN_PROGRESS" || task.status === "COMPLETED") && volunteer && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <PersonIcon fontSize="small" sx={{ color: "text.secondary" }} />
                            <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                Volontario: {volunteer.firstName} {volunteer.lastName}
                            </Typography>
                        </Box>
                    )}
                </Stack>
            </CardContent>

            <Box sx={{ p: { xs: 2, sm: 3 }, pt: 0, borderTop: "1px solid", borderColor: "divider", bgcolor: "background.paper", borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2, gap: 1, flexWrap: "wrap" }}>
                    <Button
                        size="medium"
                        variant="contained"
                        color="primary"
                        onClick={() => onDetailsClick && onDetailsClick(task.id!)}
                        sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, px: 3, flex: { xs: 1, sm: "none" } }}
                        disableElevation
                    >
                        Dettagli
                    </Button>

                    {(task.status === "OPEN") && isCreator && onCancelClick && (
                        <Button
                            size="medium"
                            variant="outlined"
                            color="error"
                            onClick={() => onCancelClick(task)}
                            sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, flex: { xs: 1, sm: "none" } }}
                        >
                            Annulla
                        </Button>
                    )}
                </Box>
            </Box>
        </Card>
    );
}
