import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeModeProvider } from "./context/ThemeModeContext";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<ThemeModeProvider>
			<App />
		</ThemeModeProvider>
	</StrictMode>,
);
