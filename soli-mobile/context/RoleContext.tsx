import { createContext, useContext, useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";

export type Role = "volunteer" | "requester";

interface RoleContextType {
	role: Role;
	toggleRole: () => void;
}

const ROLE_KEY = "soli_user_role";

const RoleContext = createContext<RoleContextType>({
	role: "volunteer",
	toggleRole: () => {},
});

export function RoleProvider({ children }: { children: React.ReactNode }) {
	const [role, setRole] = useState<Role>("volunteer");

	// Load persisted role on mount
	useEffect(() => {
		SecureStore.getItemAsync(ROLE_KEY).then((stored) => {
			if (stored === "volunteer" || stored === "requester") {
				setRole(stored);
			}
		});
	}, []);

	const toggleRole = () => {
		setRole((prev) => {
			const next: Role = prev === "volunteer" ? "requester" : "volunteer";
			SecureStore.setItemAsync(ROLE_KEY, next);
			return next;
		});
	};

	return <RoleContext.Provider value={{ role, toggleRole }}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextType {
	return useContext(RoleContext);
}
