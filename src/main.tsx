import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Filter out Recharts defaultProps warnings in development
if (import.meta.env.DEV) {
	const originalWarn = console.warn;
	const originalError = console.error;
	
	const filterMessage = (message: any) => {
		return typeof message === 'string' && 
			(message.includes('Support for defaultProps will be removed') ||
			 message.includes('XAxis:') ||
			 message.includes('YAxis:') ||
			 message.includes('ReferenceLine:') ||
			 message.includes('defaultProps will be removed') ||
			 message.includes('Multiple GoTrueClient instances detected') ||
			 message.includes('ResponsiveContainer of recharts'));
	};
	
	console.warn = (...args) => {
		if (filterMessage(args[0])) {
			return; // Suppress these specific warnings
		}
		originalWarn.apply(console, args);
	};
	
	console.error = (...args) => {
		if (filterMessage(args[0])) {
			return; // Suppress these specific warnings
		}
		originalError.apply(console, args);
	};
}

createRoot(document.getElementById("root")!).render(<App />);
