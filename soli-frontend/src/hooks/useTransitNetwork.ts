import { useEffect, useState } from "react";
import api from "../api";
import type { TransitNetwork } from "../types/models/Transit";

const POLL_INTERVAL_MS = 15000;

/** TPL network of Cassino from CassiTrack: routes, live vehicles (OBU refresh ~15 s), incidents, KPIs. */
export function useTransitNetwork(enabled = true) {
	const [network, setNetwork] = useState<TransitNetwork | null>(null);

	useEffect(() => {
		if (!enabled) return;
		let cancelled = false;
		const load = async () => {
			try {
				const res = await api.get<TransitNetwork>("/api/integrations/cassitrack/network");
				if (!cancelled) setNetwork(res.data);
			} catch (err) {
				console.error("CassiTrack network unavailable", err);
			}
		};
		load();
		const timer = setInterval(load, POLL_INTERVAL_MS);
		return () => {
			cancelled = true;
			clearInterval(timer);
		};
	}, [enabled]);

	return network;
}
