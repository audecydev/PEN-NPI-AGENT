import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// `--mode artifact` inlines everything into one HTML file for the published workbench.
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === "artifact" ? [viteSingleFile()] : [])],
  build: { outDir: mode === "artifact" ? "dist-artifact" : "dist", chunkSizeWarningLimit: 4000 },
  server: { proxy: { "/api": "http://localhost:8787" } },
}));
