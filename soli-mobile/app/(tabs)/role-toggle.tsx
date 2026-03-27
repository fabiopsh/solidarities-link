import { View } from "react-native";

/**
 * Fake screen for the role-toggle tab.
 *
 * This screen is never navigated to — the tab button is replaced with a custom
 * RoleToggleButton in _layout.tsx that toggles the role without navigating here.
 */
export default function RoleToggleScreen() {
	return <View style={{ flex: 1, backgroundColor: "#F5F5F5" }} />;
}
