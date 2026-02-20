/**
 * SoLi Design System — Color palette and typography for React Native.
 * Aligned with the web frontend theme defined in AI_CONTEXT.md.
 */

import { Platform } from "react-native";

// ─── SoLi Color Palette ──────────────────────────────────────────────────────

export const SoliColors = {
	primary: {
		main: "#00796B", // Teal 700 — primary actions, selected items
		light: "#48A999", // Teal 400 — gradients, hover/press states
		dark: "#004D40", // Teal 900 — dark gradients, pressed buttons
	},
	secondary: {
		main: "#FF6F00", // Amber 900 — accents, secondary CTAs
		light: "#FFA040", // Amber 600 — secondary gradients
	},
	background: {
		default: "#F5F5F5", // Grey 100 — page backgrounds
		paper: "#FFFFFF", // White — cards, drawers, forms
	},
	error: "#D32F2F", // Red 700 — errors, danger alerts
	success: "#2E7D32", // Green 800 — confirmations, success alerts
	text: {
		primary: "#11181C", // Main text color
		secondary: "#666666", // Secondary text, labels
		disabled: "#999999", // Disabled text, captions
	},
};

// ─── Gradients (as [start, end] color arrays for LinearGradient) ─────────────

export const SoliGradients = {
	/** Main gradient — login bg, CTA buttons, primary stat cards */
	primary: ["#004D40", "#00796B", "#48A999"] as const,
	/** Button gradient */
	button: ["#00796B", "#48A999"] as const,
	/** Button hover/pressed gradient */
	buttonPressed: ["#004D40", "#00796B"] as const,
	/** Secondary gradient — amber stat cards */
	secondary: ["#FF6F00", "#FFA040"] as const,
	/** Success gradient — green stat cards */
	success: ["#2E7D32", "#66BB6A"] as const,
};

// ─── Spacing & Shapes ────────────────────────────────────────────────────────

export const SoliShapes = {
	borderRadius: {
		global: 16,
		button: 12,
		input: 12,
		card: 16,
	},
	spacing: {
		xs: 4,
		sm: 8,
		md: 16,
		lg: 24,
		xl: 32,
	},
	shadow: {
		card: {
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.08,
			shadowRadius: 8,
			elevation: 3,
		},
		cardElevated: {
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 8 },
			shadowOpacity: 0.18,
			shadowRadius: 32,
			elevation: 12,
		},
	},
};

// ─── Typography ──────────────────────────────────────────────────────────────

export const Fonts = Platform.select({
	ios: {
		sans: "System",
		serif: "ui-serif",
		rounded: "ui-rounded",
		mono: "ui-monospace",
	},
	default: {
		sans: "normal",
		serif: "serif",
		rounded: "normal",
		mono: "monospace",
	},
});

// ─── Legacy Colors (for backward compatibility) ──────────────────────────────

export const Colors = {
	light: {
		text: SoliColors.text.primary,
		background: SoliColors.background.default,
		tint: SoliColors.primary.main,
		icon: "#687076",
		tabIconDefault: "#687076",
		tabIconSelected: SoliColors.primary.main,
	},
	dark: {
		text: "#ECEDEE",
		background: "#151718",
		tint: "#FFFFFF",
		icon: "#9BA1A6",
		tabIconDefault: "#9BA1A6",
		tabIconSelected: "#FFFFFF",
	},
};
