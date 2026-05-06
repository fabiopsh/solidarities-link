import { createTheme, type PaletteMode } from "@mui/material/styles";

// Material Design 3 inspired theme for SOLI
export const createAppTheme = (mode: PaletteMode) =>
	createTheme({
		palette: {
			mode,
			primary: {
				main: "#00796B", // Teal 700
				light: "#48A999",
				dark: "#004D40",
				contrastText: "#FFFFFF",
			},
			secondary: {
				main: "#FF6F00", // Amber 900
				light: "#FFA040",
				dark: "#C43E00",
				contrastText: "#FFFFFF",
			},
			...(mode === "light"
				? {
						background: {
							default: "#F5F5F5",
							paper: "#FFFFFF",
						},
				  }
				: {
						background: {
							default: "#121212",
							paper: "#1E1E1E",
						},
				  }),
			error: {
				main: "#D32F2F",
			},
			success: {
				main: "#2E7D32",
			},
		},
		typography: {
			fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
			h1: { fontWeight: 700 },
			h2: { fontWeight: 700 },
			h3: { fontWeight: 600 },
			h4: { fontWeight: 600 },
			h5: { fontWeight: 500 },
			h6: { fontWeight: 500 },
		},
		shape: {
			borderRadius: 16,
		},
		components: {
			MuiButton: {
				styleOverrides: {
					root: {
						textTransform: "none",
						borderRadius: 12,
						padding: "10px 24px",
						fontWeight: 600,
					},
				},
			},
			MuiDrawer: {
				styleOverrides: {
					paper: {
						borderRight: "none",
						boxShadow:
							mode === "light"
								? "2px 0 8px rgba(0,0,0,0.05)"
								: "2px 0 8px rgba(0,0,0,0.5)",
					},
				},
			},
			MuiAppBar: {
				styleOverrides: {
					root: {
						boxShadow:
							mode === "light"
								? "0 1px 3px rgba(0,0,0,0.08)"
								: "0 1px 3px rgba(0,0,0,0.4)",
					},
				},
			},
			MuiCard: {
				styleOverrides: {
					root: {
						borderRadius: 16,
						boxShadow:
							mode === "light"
								? "0 2px 8px rgba(0,0,0,0.08)"
								: "0 2px 8px rgba(0,0,0,0.5)",
					},
				},
			},
			MuiListItemButton: {
				styleOverrides: {
					root: {
						borderRadius: 12,
						margin: "2px 8px",
						"&.Mui-selected": {
							backgroundColor: "rgba(0, 121, 107, 0.08)",
							"&:hover": {
								backgroundColor: "rgba(0, 121, 107, 0.12)",
							},
						},
					},
				},
			},
		},
	});

const theme = createAppTheme("light");

export default theme;
