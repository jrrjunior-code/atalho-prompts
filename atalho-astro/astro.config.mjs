import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import { VitePWA } from 'vite-plugin-pwa';

const base = process.env.ATALHO_BASE_PATH || '/atalho/';

export default defineConfig({
  site: 'https://jrrjunior-code.github.io',
  base,
  outDir: 'dist',
  compressHTML: true,
  prefetch: true,
  integrations: [
    tailwind({
      applyBaseStyles: false,
      nesting: true,
    }),
  ],
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
        },
      },
    },
    plugins: [
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: null,
        includeAssets: ['favicon.svg', 'robots.txt'],
        manifest: {
          name: 'Atalho — Biblioteca de Prompts',
          short_name: 'Atalho',
          description: 'Uma biblioteca aberta de prompts e atalhos para criar imagens, escrever, estudar, programar e desenvolver negócios.',
          theme_color: '#171d19',
          background_color: '#f7f8f4',
          display: 'standalone',
          orientation: 'portrait-primary',
          scope: base,
          start_url: base,
          lang: 'pt-BR',
          dir: 'ltr',
          categories: ['productivity', 'utilities', 'education'],
          icons: [
            {
              src: 'brandkit/assets/favicon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
            {
              src: 'brandkit/assets/favicon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
          shortcuts: [
            {
              name: 'Explorar Prompts',
              short_name: 'Explorar',
              description: 'Navegar pelo catálogo completo',
              url: `${base}#catalogo`,
              icons: [{ src: 'brandkit/assets/favicon-192.png', sizes: '192x192' }],
            },
            {
              name: 'Meus Favoritos',
              short_name: 'Favoritos',
              description: 'Ver prompts salvos',
              url: `${base}?view=favorites#catalogo`,
              icons: [{ src: 'brandkit/assets/favicon-192.png', sizes: '192x192' }],
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json}'],
          globIgnores: ['**/data/**'],
          cleanupOutdatedCaches: true,
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-stylesheets',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
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
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
                networkTimeoutSeconds: 10,
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: new RegExp(`${base}data/.*\\.json$`, 'i'),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'catalog-data',
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
  },
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
  },
  devToolbar: {
    enabled: false,
  },
});