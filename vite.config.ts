import react from "@vitejs/plugin-react-swc";
import path from "path";
import vercel from "vite-plugin-vercel";

export default {
  plugins: [react(), vercel()],
  server: {
    host: "::",
    port: 8080,
    proxy: {
      // Proxy Creem.io API requests to handle CORS
      '/api/creem': {
        target: 'https://test-api.creem.io',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/creem/, ''),
        secure: true,
        headers: {
          'Origin': 'https://test-api.creem.io'
        }
      },
      // Proxy Resend API requests to handle CORS
      '/api/resend': {
        target: 'https://api.resend.com',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/resend/, ''),
        secure: true,
        headers: {
          'Origin': 'https://api.resend.com'
        }
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
};