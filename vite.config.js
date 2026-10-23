import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// base './' lets the same build work on GitHub Pages under any repo name.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: "Life's Epicenter",
        short_name: 'Epicenter',
        description: 'Tasks, health, notes and media for the two of us.',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        background_color: '#131019',
        theme_color: '#131019',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [{
          urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
          handler: 'StaleWhileRevalidate',
          options: { cacheName: 'fonts', expiration: { maxEntries: 20 } }
        }]
      }
    })
  ]
});
