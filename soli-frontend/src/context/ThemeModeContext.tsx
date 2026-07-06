import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { createAppTheme } from "../theme";

export type ThemeMode = "light" | "dark";

interface ThemeModeContextType {
	mode: ThemeMode;
	setMode: (mode: ThemeMode) => void;
	toggleMode: () => void;
}

const ThemeModeContext = createContext<ThemeModeContextType | undefined>(undefined);

const STORAGE_KEY = "soli_theme_mode";

const readInitialMode = (): ThemeMode => {
	const saved = localStorage.getItem(STORAGE_KEY);
	if (saved === "light" || saved === "dark") return saved;
	const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
	return prefersDark ? "dark" : "light";
};

export const ThemeModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const [mode, setModeState] = useState<ThemeMode>(readInitialMode);

	const setMode = (newMode: ThemeMode) => {
		setModeState(newMode);
		localStorage.setItem(STORAGE_KEY, newMode);
	};

	const toggleMode = () => {
		setMode(mode === "light" ? "dark" : "light");
	};

	// Expose the active mode to CSS (Leaflet popups, scrollbars, etc.).
	// createTheme applies dark mode only in JS, so plain CSS selectors need a DOM hook.
	useEffect(() => {
		const root = document.documentElement;
		root.setAttribute("data-mui-color-scheme", mode);
		root.classList.toggle("dark", mode === "dark");
	}, [mode]);

	// Sync across tabs
	useEffect(() => {
		const handleStorageChange = (e: StorageEvent) => {
			if (e.key === STORAGE_KEY) {
				const newMode = e.newValue as ThemeMode;
				if (newMode === "light" || newMode === "dark") {
					setModeState(newMode);
				}
			}
		};
		window.addEventListener("storage", handleStorageChange);
		return () => window.removeEventListener("storage", handleStorageChange);
	}, []);

	const theme = useMemo(() => createAppTheme(mode), [mode]);

	return (
		<ThemeModeContext.Provider value={{ mode, setMode, toggleMode }}>
			<ThemeProvider theme={theme}>
				<CssBaseline />
				{children}
			</ThemeProvider>
		</ThemeModeContext.Provider>
	);
};

export const useThemeMode = () => {
	const context = useContext(ThemeModeContext);
	if (!context) {
		throw new Error("useThemeMode must be used within a ThemeModeProvider");
	}
	return context;
};
