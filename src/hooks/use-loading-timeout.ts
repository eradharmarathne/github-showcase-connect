import { useEffect, useState } from "react";

/**
 * Returns true once `active` has stayed true for longer than `ms`.
 * Resets as soon as `active` becomes false. Used to stop loading screens
 * from spinning forever when a request hangs or silently fails.
 */
export function useLoadingTimeout(active: boolean, ms = 8000) {
	const [timedOut, setTimedOut] = useState(false);

	useEffect(() => {
		if (!active) {
			setTimedOut(false);
			return;
		}
		const id = window.setTimeout(() => setTimedOut(true), ms);
		return () => window.clearTimeout(id);
	}, [active, ms]);

	return timedOut;
}
