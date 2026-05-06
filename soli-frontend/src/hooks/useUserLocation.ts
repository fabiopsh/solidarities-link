import { useEffect, useRef, useState } from "react";
import api from "../api";

export interface UserLocationState {
	coords: [number, number] | null;
	ready: boolean;
	source: "geolocation" | "profile" | "none" | null;
}

let cachedState: UserLocationState | null = null;
let cachedAt = 0;
const TTL_MS = 5 * 60 * 1000;
let inflight: Promise<UserLocationState> | null = null;

const resolveLocation = (): Promise<UserLocationState> => {
	if (inflight) return inflight;

	inflight = new Promise<UserLocationState>((resolve) => {
		const fallbackToProfile = async () => {
			try {
				const res = await api.get("/api/volunteer-profiles/my");
				const p = res.data;
				if (p?.latitude != null && p?.longitude != null) {
					resolve({ coords: [p.latitude, p.longitude], ready: true, source: "profile" });
					return;
				}
			} catch {
				// no volunteer profile (e.g. requester) — swallow
			}
			resolve({ coords: null, ready: true, source: "none" });
		};

		if (typeof navigator !== "undefined" && navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(pos) =>
					resolve({
						coords: [pos.coords.latitude, pos.coords.longitude],
						ready: true,
						source: "geolocation",
					}),
				() => {
					fallbackToProfile();
				},
				{ enableHighAccuracy: false, timeout: 8000, maximumAge: TTL_MS },
			);
		} else {
			fallbackToProfile();
		}
	}).then((s) => {
		cachedState = s;
		cachedAt = Date.now();
		inflight = null;
		return s;
	});

	return inflight;
};

export function useUserLocation(): UserLocationState {
	const [state, setState] = useState<UserLocationState>(() => {
		if (cachedState && Date.now() - cachedAt < TTL_MS) return cachedState;
		return { coords: null, ready: false, source: null };
	});
	const initializedRef = useRef(false);

	useEffect(() => {
		if (state.ready) return;
		if (initializedRef.current) return;
		initializedRef.current = true;

		let mounted = true;
		resolveLocation().then((s) => {
			if (mounted) setState(s);
		});

		return () => {
			mounted = false;
		};
	}, [state.ready]);

	return state;
}
