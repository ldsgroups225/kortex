import { ConvexAuthProvider } from '@convex-dev/auth/react'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { ConvexReactClient } from 'convex/react'
import { Suspense } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App'
import { initializeServiceWorkerHelpers } from './sw-helpers'
import './index.css'
import './i18n'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string)

// Check if analytics should be enabled (default: true in production, can be disabled via env var)
const isAnalyticsEnabled = import.meta.env.VITE_VERCEL_ANALYTICS_DISABLED !== 'true'

// Initialize service worker for background sync
initializeServiceWorkerHelpers().catch(console.error)

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <ConvexAuthProvider client={convex}>
    <Suspense fallback={<LoadingFallback />}>
      <App />
    </Suspense>
    {isAnalyticsEnabled && (
      <>
        <Analytics />
        <SpeedInsights />
      </>
    )}
  </ConvexAuthProvider>,
)
