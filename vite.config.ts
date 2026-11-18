import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: {
    host: true,
    allowedHosts: true,
  },
  preview: {
    host: true,
    allowedHosts: true,
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: [
        'favicon.svg',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/maskable-512.png',
        'icons/apple-touch-icon.png',
        'icons/screenshot-narrow.png',
        'icons/screenshot-wide.png',
      ],
      manifest: {
        id: '/',
        name: 'Tanggal Tua',
        short_name: 'Tanggal Tua',
        description: 'Catat uang jajan, tahu sisa jatah hari ini.',
        lang: 'id',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FAF5EC',
        theme_color: '#2B3A8C',
        prefer_related_applications: false,
        categories: ['finance', 'productivity', 'utilities'],
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        screenshots: [
          {
            src: '/icons/screenshot-narrow.png',
            sizes: '540x960',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Layar utama sisa jatah harian Tanggal Tua',
          },
          {
            src: '/icons/screenshot-wide.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Tampilan Tanggal Tua di layar lebar',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,webmanifest}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
