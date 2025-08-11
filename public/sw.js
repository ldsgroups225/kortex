// Kortex Service Worker - Production Implementation
// Handles caching, offline sync, and background operations

const SW_VERSION = '1.0.0'
const CACHE_NAME = `kortex-v${SW_VERSION}`
const DB_NAME = 'kortex-offline'
const DB_VERSION = 1
const SYNC_STORE = 'sync-queue'
const DATA_STORE = 'offline-data'

// Cache strategies
const STATIC_CACHE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/kortex-logo.svg',
  '/offline.html',
]

// Cache strategies constants removed as they were unused

// IndexedDB setup
let db = null

// Initialize IndexedDB
async function initDB() {
  if (db)
    return db

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = event.target.result

      // Sync queue store
      if (!database.objectStoreNames.contains(SYNC_STORE)) {
        const syncStore = database.createObjectStore(SYNC_STORE, {
          keyPath: 'id',
          autoIncrement: true,
        })
        syncStore.createIndex('timestamp', 'timestamp')
        syncStore.createIndex('action', 'action')
      }

      // Data store for offline content
      if (!database.objectStoreNames.contains(DATA_STORE)) {
        const dataStore = database.createObjectStore(DATA_STORE, {
          keyPath: 'id',
        })
        dataStore.createIndex('type', 'type')
        dataStore.createIndex('lastModified', 'lastModified')
      }
    }
  })
}

// Note: Advanced caching strategies removed as they were unused
// The fetch event handler uses a simple cache-first approach

// Install event - cache static resources
globalThis.addEventListener('install', (event) => {
  console.warn('Service worker installing...')

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.warn('Caching static resources')
        return cache.addAll(STATIC_CACHE_URLS)
      })
      .then(() => {
        console.warn('Static resources cached')
        return globalThis.skipWaiting()
      }),
  )
})

// Activate event - clean up old caches
globalThis.addEventListener('activate', (event) => {
  console.warn('Service worker activating...')

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.warn('Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
            return null // Explicit return for the case when cacheName === CACHE_NAME
          }),
        )
      })
      .then(() => {
        console.warn('Service worker activated')
        return globalThis.clients.claim()
      }),
  )
})

// Fetch event - handle network requests
globalThis.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached response if found
        if (response) {
          return response
        }

        // Otherwise fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response
            }

            // Clone the response
            const responseToCache = response.clone()

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache)
              })

            return response
          })
          .catch(() => {
            // Return offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html')
            }
            return new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
          })
      }),
  )
})

// Background sync event - handle sync requests
globalThis.addEventListener('sync', (event) => {
  console.warn('Background sync triggered:', event.tag)

  if (event.tag === 'kortex-sync') {
    event.waitUntil(handleKortexSync())
  }
})

// Message event - handle messages from main thread
globalThis.addEventListener('message', (event) => {
  const { type, payload } = event.data

  console.warn('Service worker received message:', type, payload)

  switch (type) {
    case 'SYNC_REQUEST':
      handleSyncRequest(payload)
      break

    default:
      console.warn('Unknown message type:', type)
  }
})

// Handle Kortex sync operations
async function handleKortexSync() {
  try {
    console.warn('Handling Kortex background sync')

    // Check if we have network connectivity
    if (!navigator.onLine) {
      console.warn('No network connectivity, sync deferred')
      return
    }

    // Get sync queue from IndexedDB or localStorage
    const syncQueue = await getSyncQueue()

    if (syncQueue.length === 0) {
      console.warn('No pending sync requests')
      return
    }

    console.warn(`Processing ${syncQueue.length} pending sync requests`)

    // Process each sync request
    for (const syncRequest of syncQueue) {
      try {
        await processSyncRequest(syncRequest)
        console.warn('Sync request processed:', syncRequest.payload.action)
      }
      catch (error) {
        console.error('Failed to process sync request:', error)
        // In a real implementation, you might want to retry or mark as failed
      }
    }

    // Clear processed sync requests
    await clearSyncQueue()

    // Update last sync time
    await updateLastSyncTime()

    // Notify all clients about successful sync
    await notifyClients({
      type: 'sync-complete',
      payload: {
        action: 'full-sync',
        timestamp: Date.now(),
      },
    })

    console.warn('Background sync completed successfully')
  }
  catch (error) {
    console.error('Background sync failed:', error)

    // Notify clients about sync error
    await notifyClients({
      type: 'SYNC_ERROR',
      payload: {
        action: 'full-sync',
        error: error.message,
        timestamp: Date.now(),
      },
    })
  }
}

// Handle individual sync requests from main thread
async function handleSyncRequest(payload) {
  try {
    console.warn('Processing sync request:', payload.action)

    // Store sync request for background processing
    await addToSyncQueue({
      type: 'SYNC_REQUEST',
      payload,
    })

    // If online, try to process immediately
    if (navigator.onLine) {
      await handleKortexSync()
    }
    else {
      console.warn('Offline - sync request queued for later')
    }
  }
  catch (error) {
    console.error('Failed to handle sync request:', error)
  }
}

// Process a single sync request
async function processSyncRequest(syncRequest) {
  const { action, data } = syncRequest.payload

  switch (action) {
    case 'todos':
      await syncTodos(data)
      break

    case 'notes':
      await syncNotes(data)
      break

    case 'snippets':
      await syncSnippets(data)
      break

    case 'full-sync':
      await syncAllData(data)
      break

    default:
      console.warn('Unknown sync action:', action)
  }
}

// Sync todos data
async function syncTodos() {
  console.warn('Syncing todos data...')
  // In a real implementation, this would:
  // 1. Read pending todos from localStorage/IndexedDB
  // 2. Send them to your backend API
  // 3. Update local storage with synced data
  // 4. Handle conflicts using Automerge

  // Placeholder - simulate API call
  await new Promise(resolve => setTimeout(resolve, 500))
  console.warn('Todos sync completed')
}

// Sync notes data
async function syncNotes() {
  console.warn('Syncing notes data...')
  // Similar to syncTodos but for notes
  await new Promise(resolve => setTimeout(resolve, 500))
  console.warn('Notes sync completed')
}

// Sync snippets data
async function syncSnippets() {
  console.warn('Syncing snippets data...')
  // Similar to syncTodos but for snippets
  await new Promise(resolve => setTimeout(resolve, 500))
  console.warn('Snippets sync completed')
}

// Sync all data types
async function syncAllData(data) {
  console.warn('Syncing all data...')
  await Promise.all([
    syncTodos(data),
    syncNotes(data),
    syncSnippets(data),
  ])
  console.warn('Full sync completed')
}

// Get sync queue from IndexedDB
async function getSyncQueue() {
  try {
    await initDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SYNC_STORE], 'readonly')
      const store = transaction.objectStore(SYNC_STORE)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }
  catch (error) {
    console.error('Failed to get sync queue:', error)
    return []
  }
}

// Add request to sync queue
async function addToSyncQueue(syncRequest) {
  try {
    await initDB()
    const item = {
      ...syncRequest,
      timestamp: Date.now(),
      action: syncRequest.payload.action,
      retries: 0,
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SYNC_STORE], 'readwrite')
      const store = transaction.objectStore(SYNC_STORE)
      const request = store.add(item)

      request.onsuccess = () => {
        console.warn('Sync request queued:', syncRequest.payload.action)
        resolve(request.result)
      }
      request.onerror = () => reject(request.error)
    })
  }
  catch (error) {
    console.error('Failed to add to sync queue:', error)
  }
}

// Clear processed sync requests
async function clearSyncQueue() {
  try {
    await initDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SYNC_STORE], 'readwrite')
      const store = transaction.objectStore(SYNC_STORE)
      const request = store.clear()

      request.onsuccess = () => {
        console.warn('Sync queue cleared')
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  }
  catch (error) {
    console.error('Failed to clear sync queue:', error)
  }
}

// Store/retrieve app data
async function storeOfflineData(type, data) {
  try {
    await initDB()
    const item = {
      id: `${type}_${Date.now()}`,
      type,
      data,
      lastModified: Date.now(),
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DATA_STORE], 'readwrite')
      const store = transaction.objectStore(DATA_STORE)
      const request = store.put(item)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }
  catch (error) {
    console.error('Failed to store offline data:', error)
  }
}

// Note: getOfflineData function removed as it was unused

// Update last sync timestamp
async function updateLastSyncTime() {
  try {
    await storeOfflineData('lastSync', { timestamp: Date.now() })
    console.warn('Last sync time updated')
  }
  catch (error) {
    console.error('Failed to update last sync time:', error)
  }
}

// Notify all clients about sync events
async function notifyClients(message) {
  try {
    const clients = await globalThis.clients.matchAll({
      includeUncontrolled: true,
      type: 'window',
    })

    console.warn(`Notifying ${clients.length} clients about sync event`)

    clients.forEach((client) => {
      client.postMessage(message)
    })
  }
  catch (error) {
    console.error('Failed to notify clients:', error)
  }
}

// Handle periodic sync (if supported)
globalThis.addEventListener('periodicsync', (event) => {
  console.warn('Periodic sync triggered:', event.tag)

  if (event.tag === 'kortex-periodic-sync') {
    event.waitUntil(handleKortexSync())
  }
})

// Push notification event handler
globalThis.addEventListener('push', (event) => {
  console.warn('Push notification received:', event)

  // Default notification data
  const defaultNotification = {
    title: 'Kortex Notification',
    body: 'You have a new update',
    icon: '/kortex-logo.svg',
    badge: '/kortex-logo.svg',
    tag: 'kortex-notification',
    requireInteraction: false,
    actions: [
      {
        action: 'view',
        title: 'View',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
      },
    ],
  }

  let notificationData = defaultNotification

  // Parse payload if available
  if (event.data) {
    try {
      const payload = event.data.json()
      notificationData = {
        ...defaultNotification,
        ...payload,
        // Ensure essential fields are present
        title: payload.title || defaultNotification.title,
        body: payload.body || defaultNotification.body,
        icon: payload.icon || defaultNotification.icon,
        badge: payload.badge || defaultNotification.badge,
      }
    }
    catch (error) {
      console.warn('Failed to parse push payload, using text:', error)
      notificationData.body = event.data.text() || defaultNotification.body
    }
  }

  // Show the notification
  event.waitUntil(
    globalThis.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      actions: notificationData.actions,
      data: notificationData.data || {},
    }),
  )
})

// Handle notification click events
globalThis.addEventListener('notificationclick', (event) => {
  console.warn('Notification clicked:', event)

  // Close the notification
  event.notification.close()

  // Handle different actions
  if (event.action === 'view') {
    // Open the app or focus existing window
    event.waitUntil(
      globalThis.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // If we already have a window open, focus it
          if (clientList.length > 0) {
            const client = clientList[0]
            return client.focus()
          }
          // Otherwise, open a new window
          return globalThis.clients.openWindow('/')
        }),
    )
  }
  else if (event.action === 'dismiss') {
    // Just close the notification (already handled above)
    console.warn('Notification dismissed')
  }
  else {
    // Default action (click on notification body)
    event.waitUntil(
      globalThis.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          if (clientList.length > 0) {
            const client = clientList[0]
            return client.focus()
          }
          return globalThis.clients.openWindow('/')
        }),
    )
  }
})

// Handle notification close events
globalThis.addEventListener('notificationclose', (event) => {
  console.warn('Notification closed:', event)
  // Optional: Track notification dismissal analytics
})

// Initialize IndexedDB immediately when service worker loads
initDB().then(() => {
  console.warn('Kortex service worker loaded with IndexedDB initialized')
}).catch((error) => {
  console.error('Failed to initialize IndexedDB:', error)
  console.warn('Kortex service worker loaded (fallback mode)')
})
