import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// base: "./" makes all built asset URLs relative, so the app works no matter
// what your GitHub Pages URL/subpath ends up being (https://USER.github.io/REPO/).
export default defineConfig({
  base: "./",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        name: "Бюджет — Сбер / Альфа / Озон",
        short_name: "Бюджет",
        description: "Личный трекер бюджета по методу 50/30/20",
        start_url: "./",
        scope: "./",
        display: "standalone",
        background_color: "#F1F4F2",
        theme_color: "#16201B",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
});
