import { useEffect, useState } from "react";
import api from "../api";
import type { FaroEmergency } from "../types/models/FaroEmergency";

const POLL_INTERVAL_MS = 15000;

/** Active FARO emergencies, refreshed periodically (the backend consumes FARO's event stream). */
export function useFaroEmergencies(enabled = true) {
	const [emergencies, setEmergencies] = useState<FaroEmergency[]>([]);
	const [loading, setLoading] = useState(enabled);

	useEffect(() => {
		if (!enabled) return;
		let cancelled = false;
		const load = async () => {
			try {
				const res = await api.get<FaroEmergency[]>("/api/integrations/faro/emergencies");
				if (!cancelled) setEmergencies(res.data);
			} catch (err) {
				console.error("FARO emergencies unavailable", err);
			} finally {
				if (!cancelled) setLoading(false);
			}
		};
		load();
		const timer = setInterval(load, POLL_INTERVAL_MS);
		return () => {
			cancelled = true;
			clearInterval(timer);
		};
	}, [enabled]);

	return { emergencies, loading };
}
