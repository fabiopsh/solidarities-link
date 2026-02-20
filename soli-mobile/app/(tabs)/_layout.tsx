import { Tabs } from "expo-router";

/**
 * Tabs layout — for now only contains the Home tab.
 * More tabs will be added as the app grows.
 */
export default function TabsLayout() {
	return (
		<Tabs
			screenOptions={{
				headerStyle: {
					backgroundColor: "#FFFFFF",
					shadowColor: "#000",
					shadowOffset: { width: 0, height: 1 },
					shadowOpacity: 0.08,
					shadowRadius: 3,
					elevation: 2,
				},
				headerTintColor: "#00796B",
				headerTitleStyle: {
					fontWeight: "600",
					fontSize: 18,
				},
				tabBarStyle: {
					display: "none", // Hide tab bar since we only have one tab for now
				},
			}}
		>
			<Tabs.Screen
				name="home"
				options={{
					title: "SoLi",
					headerShown: true,
				}}
			/>
		</Tabs>
	);
}
