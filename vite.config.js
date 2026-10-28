import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// base './' lets the same build work on GitHub Pages under any repo name.
// VITE_PREVIEW=1 builds the preview copy served from /preview/: no service worker, so it never
// takes over the installed app.
const PREVIEW = process.env.VITE_PREVIEW === '1';
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      disable: PREVIEW,
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
        globIgnores: ['preview/**'],
        // Leave the preview copy alone: never answer its pages with the live app.
        navigateFallbackDenylist: [/\/preview\//],
        importScripts: ['push-sw.js'],
        runtimeCaching: [{
          urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
          handler: 'StaleWhileRevalidate',
          options: { cacheName: 'fonts', expiration: { maxEntries: 20 } }
        }]
      }
    })
  ]
});
