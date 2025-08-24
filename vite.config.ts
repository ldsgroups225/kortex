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
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [
          /^\/_/, // API routes
          /\/[^/?][^./?]*\.[^/]+$/, // Files with extensions
          /^\/sw\.js$/, // Service worker file
          /^\/workbox-.*\.js$/, // Workbox files
        ],
        // Skip precaching in development to avoid glob pattern warnings
        globPatterns: mode === 'development' ? [] : ['**/*.{js,wasm,css,html}'],
        // Don't cache the main document during updates
        navigateFallbackAllowlist: [/^(?!\/__).*/], // Allow fallback except for special routes
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
            urlPattern: ({ request }) => request.destination === 'document',
            handler: 'NetworkFirst',
            options: { 
              cacheName: 'pages',
              networkTimeoutSeconds: 3,
            },
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
  build: {
    // Increase chunk size warning limit since we're dealing with WASM files
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Manual chunking to optimize bundle splitting
        manualChunks: (id) => {
          // Vendor chunk for React and core libraries
          if (id.includes('react') || id.includes('react-dom')) {
            return 'vendor'
          }

          // Convex chunk for backend-related code
          if (id.includes('convex') && !id.includes('@convex-dev/auth')) {
            return 'convex'
          }

          // UI chunk for UI libraries
          if (id.includes('@heroicons/react')
            || id.includes('@tiptap/')
            || id.includes('sonner')
            || id.includes('react-tooltip')) {
            return 'ui'
          }

          // Automerge chunk (this is the largest dependency)
          if (id.includes('@automerge/automerge')) {
            return 'automerge'
          }

          // i18n chunk for internationalization
          if (id.includes('i18next') || id.includes('react-i18next')) {
            return 'i18n'
          }

          // Utils chunk for utility libraries
          if (id.includes('clsx')
            || id.includes('tailwind-merge')
            || id.includes('uuid')
            || id.includes('jszip')) {
            return 'utils'
          }

          // Keep problematic packages in the main bundle
          if (id.includes('@convex-dev/auth')) {
            return undefined
          }

          // Default behavior for other node_modules
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        },
      },
    },
    // Enable source maps for better debugging in production
    sourcemap: false, // Set to true if you need source maps
    // Optimize for modern browsers
    target: 'esnext',
    // Enable minification
    minify: 'esbuild',
  },
}))
