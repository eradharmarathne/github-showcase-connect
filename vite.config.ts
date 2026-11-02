import react from "@vitejs/plugin-react-swc";
import path from "path";

export default {
  plugins: [react()],
  server: {
    host: "::",
    port: 8080,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
};
