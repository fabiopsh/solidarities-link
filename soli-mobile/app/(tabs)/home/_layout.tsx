import { Stack } from "expo-router";
import { SoliColors } from "@/constants/theme";

/**
 * Home stack layout:
 * - index     → task list (no header — custom header rendered inside)
 * - [id]      → task detail
 * - new       → task creation wizard (modal, slides up from bottom)
 */
export default function HomeLayout() {
	return (
		<Stack
			screenOptions={{
				headerStyle: { backgroundColor: SoliColors.background.paper },
				headerTintColor: SoliColors.primary.main,
				headerTitleStyle: { fontWeight: "600", fontSize: 18 },
				headerBackTitle: "Indietro",
			}}
		>
			<Stack.Screen name="index" options={{ headerShown: false }} />
			<Stack.Screen name="[id]" options={{ title: "Dettaglio Richiesta" }} />
			<Stack.Screen
				name="new"
				options={{
					title: "Nuova Richiesta",
					presentation: "modal",
					headerStyle: { backgroundColor: SoliColors.background.paper },
				}}
			/>
		</Stack>
	);
}
