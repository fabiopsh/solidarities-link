import { useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { Tabs } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRole } from "@/context/RoleContext";

/**
 * Floating role-toggle button rendered in the center tab slot.
 * Pressing it toggles between "volunteer" (teal) and "requester" (amber)
 * without navigating to any screen.
 */
function RoleToggleButton() {
	const { role, toggleRole } = useRole();
	const scale = useRef(new Animated.Value(1)).current;

	const isVolunteer = role === "volunteer";

	const handlePressIn = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		Animated.spring(scale, {
			toValue: 0.88,
			useNativeDriver: true,
			speed: 30,
			bounciness: 4,
		}).start();
	};

	const handlePressOut = () => {
		Animated.spring(scale, {
			toValue: 1,
			useNativeDriver: true,
			speed: 20,
			bounciness: 8,
		}).start();
	};

	return (
		<View style={styles.roleButtonContainer}>
			<Pressable
				onPressIn={handlePressIn}
				onPressOut={handlePressOut}
				onPress={toggleRole}
				accessibilityRole="button"
				accessibilityLabel={
					isVolunteer
						? "Sei in modalità Volontario — premi per passare a Richiedente"
						: "Sei in modalità Richiedente — premi per passare a Volontario"
				}
			>
				<Animated.View style={{ transform: [{ scale }] }}>
					<LinearGradient
						colors={isVolunteer ? ["#00796B", "#48A999"] : ["#FF6F00", "#FFA040"]}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 1 }}
						style={styles.roleButton}
					>
						<MaterialIcons
							name={isVolunteer ? "volunteer-activism" : "assignment"}
							size={26}
							color="#FFFFFF"
						/>
					</LinearGradient>
				</Animated.View>
			</Pressable>
		</View>
	);
}

/**
 * Tabs layout — 4 navigable tabs + 1 floating role-toggle button in the center.
 */
export default function TabsLayout() {
	return (
		<Tabs
			screenOptions={{
				tabBarActiveTintColor: "#00796B",
				tabBarInactiveTintColor: "#999999",
				tabBarButton: HapticTab,
				tabBarStyle: styles.tabBar,
				tabBarLabelStyle: styles.tabBarLabel,
				headerStyle: styles.header,
				headerTintColor: "#00796B",
				headerTitleStyle: styles.headerTitle,
			}}
		>
			<Tabs.Screen
				name="home"
				options={{
					title: "Home",
					tabBarIcon: ({ color, size }) => (
						<IconSymbol name="house.fill" size={size} color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name="radar"
				options={{
					title: "Radar",
					tabBarIcon: ({ color, size }) => (
						<IconSymbol name="map.fill" size={size} color={color} />
					),
				}}
			/>
			{/* Center fake tab — button handled by RoleToggleButton, never navigates */}
			<Tabs.Screen
				name="role-toggle"
				options={{
					title: "",
					headerShown: false,
					tabBarShowLabel: false,
					tabBarButton: () => <RoleToggleButton />,
				}}
			/>
			<Tabs.Screen
				name="associations"
				options={{
					title: "Associazioni",
					tabBarIcon: ({ color, size }) => (
						<IconSymbol name="building.columns.fill" size={size} color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name="profile"
				options={{
					title: "Profilo",
					tabBarIcon: ({ color, size }) => (
						<IconSymbol name="person.fill" size={size} color={color} />
					),
				}}
			/>
		</Tabs>
	);
}

const styles = StyleSheet.create({
	tabBar: {
		backgroundColor: "#FFFFFF",
		borderTopColor: "rgba(0,0,0,0.06)",
		borderTopWidth: StyleSheet.hairlineWidth,
		paddingTop: 8,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: -3 },
		shadowOpacity: 0.06,
		shadowRadius: 12,
		elevation: 10,
	},
	tabBarLabel: {
		fontSize: 11,
		fontWeight: "600",
	},
	header: {
		backgroundColor: "#FFFFFF",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.08,
		shadowRadius: 3,
		elevation: 2,
	},
	headerTitle: {
		fontWeight: "600",
		fontSize: 18,
	},
	// Role toggle button
	roleButtonContainer: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		overflow: "visible",
	},
	roleButton: {
		width: 56,
		height: 56,
		borderRadius: 28,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 4,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.22,
		shadowRadius: 10,
		elevation: 8,
	},
});
