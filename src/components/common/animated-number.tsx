import { animate, useMotionValue, useMotionValueEvent } from "framer-motion";
import { useEffect, useState } from "react";

interface AnimatedNumberProps {
	value: number;
	format?: (n: number) => string;
	duration?: number;
}

/** Counts smoothly from the previous value to the new one. */
export function AnimatedNumber({
	value,
	format = (n) => Math.round(n).toLocaleString(),
	duration = 1.1,
}: AnimatedNumberProps) {
	const mv = useMotionValue(0);
	const [display, setDisplay] = useState(() => format(0));

	useMotionValueEvent(mv, "change", (v) => setDisplay(format(v)));

	useEffect(() => {
		const controls = animate(mv, value, {
			duration,
			ease: [0.22, 1, 0.36, 1],
		});
		return () => controls.stop();
	}, [value, duration, mv]);

	return <span className="tabular-nums">{display}</span>;
}
