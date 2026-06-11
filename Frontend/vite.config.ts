import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = env.VITE_API_URL || 'https://loyola-lms.onrender.com/api';

  return {
    server: {
      host: "localhost",
      strictPort: false,
      hmr: {
        host: "localhost",
        protocol: "ws",
      },
    },
    define: {
      // Hardcode the production URL as fallback — works even without .env on Vercel
      '__PROD_API_URL__': JSON.stringify('https://loyola-lms.onrender.com/api'),
    },
    optimizeDeps: {
      include: ["@zoom/meetingsdk"],
    },
    plugins: [react()],
    assetsInclude: ['**/*.glb'],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});