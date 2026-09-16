import { useCallback, useEffect, useState } from "react";
import api from "../api";
import type { TaskTransit } from "../types/models/Transit";

const POLL_INTERVAL_MS = 30000;

/** TPL support for a task (CassiTrack + OmniMove): nearby stops, accompaniment trip, reach plan, disruptions. */
export function useTaskTransit(taskId: string | undefined, destinationStopId: string | null) {
	const [transit, setTransit] = useState<TaskTransit | null>(null);
	const [loading, setLoading] = useState(false);

	const load = useCallback(async () => {
		if (!taskId) return;
		try {
			const query = destinationStopId ? `?destinationStopId=${encodeURIComponent(destinationStopId)}` : "";
			const res = await api.get<TaskTransit>(`/api/integrations/cassitrack/tasks/${taskId}/transit${query}`);
			setTransit(res.data);
		} catch {
			// integration unavailable: no TPL support shown
		} finally {
			setLoading(false);
		}
	}, [taskId, destinationStopId]);

	useEffect(() => {
		setLoading(true);
		load();
		const timer = setInterval(load, POLL_INTERVAL_MS);
		return () => clearInterval(timer);
	}, [load]);

	return { transit, loading, reload: load };
}
