import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// base: "./" makes all built asset URLs relative, so the app works no matter
// what your GitHub Pages URL/subpath ends up being (https://USER.github.io/REPO/).
//
// Установка как приложение: манифест и сервис-воркер создаёт плагин VitePWA, вручную их подключать не нужно
// (manifest.json и sw.js в public/ больше не используются). Иконки лежат в public/ рядом с index.html.
export default defineConfig({
  base: "./",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png"],
      manifest: {
        id: "./",
        name: "Бюджет — 50/30/20",
        short_name: "Бюджет",
        description: "Личный трекер бюджета по методу 50/30/20",
        lang: "ru",
        dir: "ltr",
        categories: ["finance", "productivity"],
        start_url: "./",
        scope: "./",
        display: "standalone",
        orientation: "any",
        background_color: "#F1F4F2",
        theme_color: "#16201B",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      // Картинки и шрифт тоже сохраняются в кэш приложения: после первого запуска шапки появляются мгновенно и без сети.
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,ttf,woff2}"],
        cleanupOutdatedCaches: true,
        // Статические страницы (политика конфиденциальности) и служебные файлы не подменяются страницей приложения.
        navigateFallbackDenylist: [/privacy\.html$/, /^\/\.well-known\//],
      },
    }),
  ],
});
