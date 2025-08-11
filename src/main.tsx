import { ConvexAuthProvider } from '@convex-dev/auth/react'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { ConvexReactClient } from 'convex/react'
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

createRoot(document.getElementById('root')!).render(
  <ConvexAuthProvider client={convex}>
    <App />
    {isAnalyticsEnabled && (
      <>
        <Analytics />
        <SpeedInsights />
      </>
    )}
  </ConvexAuthProvider>,
)
