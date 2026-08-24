import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: "autoUpdate",

      manifest: {
        name: "StockTrace",
        short_name: "StockTrace",
        description: "Application de gestion de stock",
        start_url: "./",
        scope: "./",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#3157d5",
        background_color: "#f8f9fd",
        icons: [
          {
            src: "pwa-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],

  base: "/",

  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
});
