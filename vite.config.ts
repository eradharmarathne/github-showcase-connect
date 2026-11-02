import react from "@vitejs/plugin-react-swc";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react()],
	server: {
		host: "::",
		port: 8080,
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
		dedupe: ["react", "react-dom", "react/jsx-runtime"],
	},
	optimizeDeps: {
		include: ["react", "react-dom", "react/jsx-runtime"],
	},
});
