import type { ServiceCategory, } from "@/types/models/VolunteerProfile";
import type { UrgencyLevel, TaskStatus } from "@/types/models/Task";

// ─── Category Config ───────────────────────────────────────────────────────

export interface CategoryConfig {
	label: string;
	icon: string; // MaterialIcons name
	color: string;
	bgColor: string;
}

export const CATEGORY_CONFIG: Record<ServiceCategory, CategoryConfig> = {
	MOBILITY: {
		label: "Mobilità",
		icon: "directions-car",
		color: "#2196F3",
		bgColor: "#E3F2FD",
	},
	PHYSICAL_SUPPORT: {
		label: "Supporto Fisico",
		icon: "fitness-center",
		color: "#4CAF50",
		bgColor: "#E8F5E9",
	},
	SOCIAL: {
		label: "Socialità",
		icon: "groups",
		color: "#9C27B0",
		bgColor: "#F3E5F5",
	},
	PET_SUPPORT: {
		label: "Animali",
		icon: "pets",
		color: "#FF9800",
		bgColor: "#FFF3E0",
	},
	DIGITAL: {
		label: "Digitale",
		icon: "computer",
		color: "#607D8B",
		bgColor: "#ECEFF1",
	},
};

// ─── Urgency Config ────────────────────────────────────────────────────────

export interface UrgencyConfig {
	label: string;
	color: string;
	bgColor: string;
}

export const URGENCY_CONFIG: Record<UrgencyLevel, UrgencyConfig> = {
	LOW: {
		label: "Bassa",
		color: "#558B2F",
		bgColor: "#F1F8E9",
	},
	MEDIUM: {
		label: "Media",
		color: "#F57F17",
		bgColor: "#FFFDE7",
	},
	HIGH: {
		label: "Alta",
		color: "#BF360C",
		bgColor: "#FBE9E7",
	},
	CRITICAL: {
		label: "Critica",
		color: "#B71C1C",
		bgColor: "#FFEBEE",
	},
};

// ─── Status Config ─────────────────────────────────────────────────────────

export interface StatusConfig {
	label: string;
	bgColor: string;
	textColor: string;
}

export const STATUS_CONFIG: Record<TaskStatus, StatusConfig> = {
	OPEN: {
		label: "Aperta",
		bgColor: "#E0F2F1",
		textColor: "#00796B",
	},
	NOTIFIED: {
		label: "Notificata",
		bgColor: "#E3F2FD",
		textColor: "#1565C0",
	},
	ACCEPTED: {
		label: "Accettata",
		bgColor: "#E8EAF6",
		textColor: "#3949AB",
	},
	IN_PROGRESS: {
		label: "In Corso",
		bgColor: "#FFF3E0",
		textColor: "#E65100",
	},
	COMPLETED: {
		label: "Completata",
		bgColor: "#E8F5E9",
		textColor: "#2E7D32",
	},
	RELEASED: {
		label: "Rilasciata",
		bgColor: "#F3E5F5",
		textColor: "#6A1B9A",
	},
	CANCELLED: {
		label: "Annullata",
		bgColor: "#FFEBEE",
		textColor: "#C62828",
	},
};
