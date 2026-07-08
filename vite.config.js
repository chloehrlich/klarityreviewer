import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Same shape as the Pacer app: React SPA in src/, API functions live in /api
// (served by Vercel in prod). In local dev, `vercel dev` proxies /api; plain
// `vite` serves only the front end.
export default defineConfig({
  plugins: [react()],
});
