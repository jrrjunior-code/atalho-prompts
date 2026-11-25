/**
 * Atalho - PWA Configuration
 * Configured for @vite-pwa/astro
 */

import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Atalho — Biblioteca de Prompts',
        short_name: 'Atalho',
        description: 'Uma biblioteca aberta de prompts e atalhos para criar imagens, escrever, estudar, programar e desenvolver negócios.',
        theme_color: '#171d19',
        background_color: '#f7f8f4',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        lang: 'pt-BR',
        dir: 'ltr',
        categories: ['productivity', 'utilities', 'education'],
        icons: [
          {
            src: '/brandkit/assets/logo-principal-1024.png',
            sizes: '1024x1024',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/brandkit/assets/logo-principal-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/brandkit/assets/logo-principal-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/brandkit/assets/favicon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/brandkit/assets/favicon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        screenshots: [
          {
            src: '/screenshots/desktop.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Atalho no desktop',
          },
          {
            src: '/screenshots/mobile.png',
            sizes: '390x844',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Atalho no mobile',
          },
        ],
        shortcuts: [
          {
            name: 'Explorar Prompts',
            short_name: 'Explorar',
            description: 'Navegar pelo catálogo completo',
            url: '/#catalogo',
            icons: [{ src: '/brandkit/assets/logo-principal-192.png', sizes: '192x192' }],
          },
          {
            name: 'Meus Favoritos',
            short_name: 'Favoritos',
            description: 'Ver prompts salvos',
            url: '/#catalogo?view=favorites',
            icons: [{ src: '/brandkit/assets/logo-principal-192.png', sizes: '192x192' }],
          },
        ],
        related_applications: [],
        prefer_related_applications: false,
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json}'],
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }, // 1 year
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.githubusercontent\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'github-content',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 }, // 1 week
              networkTimeoutSeconds: 10,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/data\/.*\.json$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'catalog-data',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }, // 30 days
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: '/',
      },
    }),
  ],
});