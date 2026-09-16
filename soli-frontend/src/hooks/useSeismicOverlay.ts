import { useEffect, useState } from "react";
import api from "../api";
import type { SeismicEvent, SeismicOverlay } from "../types/models/SeismicOverlay";

/** Recent earthquakes from Urban Sentinel and the post-event overlay of the selected one (newest by default). */
export function useSeismicOverlay(enabled = true) {
	const [events, setEvents] = useState<SeismicEvent[]>([]);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [overlay, setOverlay] = useState<SeismicOverlay | null>(null);

	useEffect(() => {
		if (!enabled) return;
		let cancelled = false;
		api.get<SeismicEvent[]>("/api/integrations/urban-sentinel/earthquakes")
			.then((res) => {
				if (cancelled) return;
				setEvents(res.data);
				setSelectedId((current) => current ?? res.data[0]?.id ?? null);
			})
			.catch((err) => console.error("Urban Sentinel earthquakes unavailable", err));
		return () => {
			cancelled = true;
		};
	}, [enabled]);

	useEffect(() => {
		if (!enabled || !selectedId) return;
		let cancelled = false;
		api.get<SeismicOverlay>(`/api/integrations/urban-sentinel/earthquakes/${selectedId}/overlay`)
			.then((res) => {
				if (!cancelled) setOverlay(res.data);
			})
			.catch((err) => console.error("Urban Sentinel overlay unavailable", err));
		return () => {
			cancelled = true;
		};
	}, [enabled, selectedId]);

	const loading = selectedId != null && overlay?.event.id !== selectedId;

	return { events, selectedId, setSelectedId, overlay, loading };
}
