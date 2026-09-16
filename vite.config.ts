/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/v1": {
        target: "http://localhost:9734",
        ws: true,
        changeOrigin: true,
      },
      "/health": {
        target: "http://localhost:9734",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
  },
});
