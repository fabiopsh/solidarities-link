import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type UserRole = "volunteer" | "requester";

interface RoleContextType {
	role: UserRole;
	setRole: (role: UserRole) => void;
	toggleRole: () => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const [role, setRoleState] = useState<UserRole>(() => {
		const savedRole = localStorage.getItem("soli_user_role") as UserRole;
		return savedRole === "requester" ? "requester" : "volunteer";
	});

	const setRole = (newRole: UserRole) => {
		setRoleState(newRole);
		localStorage.setItem("soli_user_role", newRole);
	};

	const toggleRole = () => {
		setRole(role === "volunteer" ? "requester" : "volunteer");
	};

	// Sincronizza lo stato anche se un'altra tab modifica il localStorage
	useEffect(() => {
		const handleStorageChange = (e: StorageEvent) => {
			if (e.key === "soli_user_role") {
				const newRole = e.newValue as UserRole;
				if (newRole === "volunteer" || newRole === "requester") {
					setRoleState(newRole);
				}
			}
		};
		window.addEventListener("storage", handleStorageChange);
		return () => window.removeEventListener("storage", handleStorageChange);
	}, []);

	return (
		<RoleContext.Provider value={{ role, setRole, toggleRole }}>
			{children}
		</RoleContext.Provider>
	);
};

export const useRole = () => {
	const context = useContext(RoleContext);
	if (!context) {
		throw new Error("useRole must be used within a RoleProvider");
	}
	return context;
};
