import { createTheme } from "@mui/material/styles";

// Material Design 3 inspired theme for SOLI
const theme = createTheme({
	palette: {
		mode: "light",
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
		background: {
			default: "#F5F5F5",
			paper: "#FFFFFF",
		},
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
					boxShadow: "2px 0 8px rgba(0,0,0,0.05)",
				},
			},
		},
		MuiAppBar: {
			styleOverrides: {
				root: {
					boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
				},
			},
		},
		MuiCard: {
			styleOverrides: {
				root: {
					borderRadius: 16,
					boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
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

export default theme;
