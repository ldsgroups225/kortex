import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import topLevelAwait from 'vite-plugin-top-level-await'
import wasm from 'vite-plugin-wasm'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
    VitePWA({
      registerType: 'prompt',
      manifest: false, // use external manifest in public/
      devOptions: { enabled: mode === 'development' },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallback: '/offline.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.(?:js|css|png|svg|ico|woff2?)$/,
            handler: 'CacheFirst',
            options: { cacheName: 'static-assets', expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/src/') || url.pathname.endsWith('.tsx'),
            handler: 'NetworkFirst',
            options: { cacheName: 'vite-modules' },
          },
          {
            urlPattern: /^https:\/\/api\.convex\.cloud\/.*/, // Convex functions
            handler: 'NetworkFirst',
            options: { cacheName: 'convex-api', networkTimeoutSeconds: 5 },
          },
          {
            urlPattern: /.*/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'others' },
          },
        ],
      },
    }),
    // The code below enables dev tools like taking screenshots of your site
    // while it is being developed on chef.convex.dev.
    // Feel free to remove this code if you're no longer developing your app with Chef.
    mode === 'development'
      ? {
          name: 'inject-chef-dev',
          transform(code: string, id: string) {
            if (id.includes('main.tsx')) {
              return {
                code: `${code}

/* Added by Vite plugin inject-chef-dev */
window.addEventListener('message', async (message) => {
  if (message.source !== window.parent) return;
  if (message.data.type !== 'chefPreviewRequest') return;

  const worker = await import('https://chef.convex.dev/scripts/worker.bundled.mjs');
  await worker.respondToMessage(message);
});
            `,
                map: null,
              }
            }
            return null
          },
        }
      : null,
    // End of code for taking screenshots on chef.convex.dev.
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['@automerge/automerge'],
  },
}))
