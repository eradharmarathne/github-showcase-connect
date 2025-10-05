import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Filter out Recharts defaultProps warnings in development
if (import.meta.env.DEV) {
	const originalWarn = console.warn;
	console.warn = (...args) => {
		const message = args[0];
		if (
			typeof message === 'string' && 
			(message.includes('Support for defaultProps will be removed') ||
			 message.includes('XAxis:') ||
			 message.includes('YAxis:') ||
			 message.includes('ReferenceLine:'))
		) {
			return; // Suppress these specific warnings
		}
		originalWarn.apply(console, args);
	};
}

createRoot(document.getElementById("root")!).render(<App />);
