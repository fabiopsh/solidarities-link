import { Stack } from "expo-router";
import { SoliColors } from "@/constants/theme";

export default function AssociationsLayout() {
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
			<Stack.Screen name="[id]" options={{ title: "Associazione" }} />
		</Stack>
	);
}
