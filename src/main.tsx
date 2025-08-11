import { ConvexAuthProvider } from '@convex-dev/auth/react'
import { ConvexReactClient } from 'convex/react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { initializeServiceWorkerHelpers } from './sw-helpers'
import './index.css'
import './i18n'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string)

// Initialize service worker for background sync
initializeServiceWorkerHelpers().catch(console.error)

createRoot(document.getElementById('root')!).render(
  <ConvexAuthProvider client={convex}>
    <App />
  </ConvexAuthProvider>,
)
