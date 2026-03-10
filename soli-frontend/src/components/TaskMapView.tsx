import { useEffect, useState } from "react";
import { Box, Button, Typography, CircularProgress, Alert } from "@mui/material";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import LocationOnIcon from "@mui/icons-material/LocationOn";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import type { Task } from "../types/models/Task";

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Child component to handle map centering when a location is provided
function AutoCenterMap({ position }: { position: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.flyTo(position, map.getZoom());
    }, [position, map]);
    return null;
}

export default function TaskMapView({ tasks }: { tasks: Task[] }) {
    const navigate = useNavigate();
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isLocating, setIsLocating] = useState(true);

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

                    {/* User location marker */}
                    {userLocation && (
                        <Marker position={userLocation}>
                            <Popup>
                                <Typography variant="subtitle2">La tua posizione</Typography>
                            </Popup>
                        </Marker>
                    )}

                    {/* Task markers */}
                    {tasks.map((task) => {
                        if (task.latitude && task.longitude) {
                            return (
                                <Marker key={task.id} position={[task.latitude, task.longitude]}>
                                    <Popup>
                                        <Box sx={{ minWidth: 260, p: 1 }}>
                                            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5, gap: 1 }}>
                                                <Typography variant="caption" sx={{ fontWeight: "bold", color: "primary.main", textTransform: "uppercase" }}>
                                                    {getCategoryLabel(task.category)}
                                                </Typography>
                                                <Typography variant="caption" sx={{ fontWeight: "bold", color: task.urgencyLevel === "CRITICAL" ? "error.main" : task.urgencyLevel === "HIGH" ? "warning.main" : "text.secondary" }}>
                                                    Urg. {task.urgencyLevel}
                                                </Typography>
                                            </Box>

                                            <Typography variant="subtitle1" fontWeight="800" gutterBottom sx={{ lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }} title={task.title}>
                                                {task.title}
                                            </Typography>

                                            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mb: 2, mt: 1, bgcolor: "grey.50", p: 1, borderRadius: 2 }}>
                                                <LocationOnIcon fontSize="small" sx={{ color: "text.secondary", mt: 0.3 }} />
                                                <Typography variant="body2" color="text.secondary" sx={{ flex: 1, wordWrap: "break-word" }}>
                                                    {task.targetAddress || "Indirizzo non specificato"}
                                                </Typography>
                                            </Box>

                                            <Button
                                                size="small"
                                                variant="contained"
                                                fullWidth
                                                disableElevation
                                                sx={{ borderRadius: 2, fontWeight: 700 }}
                                                onClick={() => navigate(`/dashboard/requests/${task.id}`)}
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
        </Box>
    );
}
