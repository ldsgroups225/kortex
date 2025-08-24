/**
 * Service Worker Helper Functions for Kortex
 *
 * This module provides functions to communicate with the service worker
 * for background synchronization of Automerge documents and localStorage changes.
 */

// Types for service worker messages

// Extend ServiceWorkerRegistration to include the sync property
interface ServiceWorkerRegistrationWithSync extends ServiceWorkerRegistration {
  sync: {
    register: (tag: string) => Promise<void>
  }
}

export interface SyncMessage {
  type: 'SYNC_REQUEST' | 'SYNC_RESPONSE' | 'SYNC_ERROR'
  payload: {
    action: 'todos' | 'notes' | 'snippets' | 'full-sync'
    data?: any
    error?: string
    timestamp: number
  }
}

export interface PendingChange {
  id: string
  type: 'automerge' | 'localStorage'
  storageKey: string
  operation: 'create' | 'update' | 'delete'
  data?: any
  timestamp: number
}

// Storage keys used by the app
export const STORAGE_KEYS = {
  TODOS: 'offline-todos-automerge',
  NOTES: 'offline-notes-automerge',
  SNIPPETS: 'offline-snippets-automerge',
  SYNC_QUEUE: 'kortex-sync-queue',
  LAST_SYNC: 'kortex-last-sync',
} as const

/**
 * Registers the service worker if supported
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    })

    return registration
  }
  catch (error) {
    console.error('Service Worker registration failed:', error)
    return null
  }
}

/**
 * Posts a message to the service worker
 */
export function postMessageToServiceWorker(message: SyncMessage): void {
  if (!navigator.serviceWorker.controller) {
    return
  }

  navigator.serviceWorker.controller.postMessage(message)
}

/**
 * Queues a sync request for when the service worker becomes available
 */
export function queueSyncRequest(action: SyncMessage['payload']['action'], data?: any): void {
  const syncRequest: SyncMessage = {
    type: 'SYNC_REQUEST',
    payload: {
      action,
      data,
      timestamp: Date.now(),
    },
  }

  // Store in sync queue for persistence
  try {
    const queueKey = STORAGE_KEYS.SYNC_QUEUE
    const existingQueue = JSON.parse(localStorage.getItem(queueKey) || '[]')
    existingQueue.push(syncRequest)
    localStorage.setItem(queueKey, JSON.stringify(existingQueue))
  }
  catch (error) {
    console.error('Failed to queue sync request:', error)
  }

  // Try to post immediately if service worker is available
  postMessageToServiceWorker(syncRequest)
}

/**
 * Notifies service worker of pending Automerge document changes
 */
export function notifyAutomergeChanges(storageKey: string, operation: 'create' | 'update' | 'delete', documentData?: any): void {
  const change: PendingChange = {
    id: `automerge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'automerge',
    storageKey,
    operation,
    data: documentData,
    timestamp: Date.now(),
  }

  // Determine sync action based on storage key
  let action: SyncMessage['payload']['action']
  if (storageKey.includes('todos')) {
    action = 'todos'
  }
  else if (storageKey.includes('notes')) {
    action = 'notes'
  }
  else if (storageKey.includes('snippets')) {
    action = 'snippets'
  }
  else {
    action = 'full-sync'
  }

  queueSyncRequest(action, change)
}

/**
 * Notifies service worker of pending localStorage changes
 */
export function notifyLocalStorageChanges(storageKey: string, operation: 'create' | 'update' | 'delete', data?: any): void {
  const change: PendingChange = {
    id: `localStorage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'localStorage',
    storageKey,
    operation,
    data,
    timestamp: Date.now(),
  }

  queueSyncRequest('full-sync', change)
}

/**
 * Registers background sync with the service worker
 */
export async function registerBackgroundSync(tag: string = 'kortex-sync'): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready as ServiceWorkerRegistrationWithSync

    if (!('sync' in registration)) {
      return false
    }

    await registration.sync.register(tag)
    return true
  }
  catch (error) {
    console.error('Failed to register background sync:', error)
    return false
  }
}

/**
 * Checks if there are pending sync requests
 */
export function hasPendingSyncRequests(): boolean {
  try {
    const queueKey = STORAGE_KEYS.SYNC_QUEUE
    const queue = JSON.parse(localStorage.getItem(queueKey) || '[]')
    return queue.length > 0
  }
  catch (error) {
    console.error('Failed to check pending sync requests:', error)
    return false
  }
}

/**
 * Clears completed sync requests from the queue
 */
export function clearCompletedSyncRequests(): void {
  try {
    const queueKey = STORAGE_KEYS.SYNC_QUEUE
    // Clear the entire queue - in a more sophisticated implementation,
    // you might want to only remove confirmed completed requests
    localStorage.setItem(queueKey, '[]')
  }
  catch (error) {
    console.error('Failed to clear sync queue:', error)
  }
}

/**
 * Gets the timestamp of the last successful sync
 */
export function getLastSyncTime(): number | null {
  try {
    const lastSync = localStorage.getItem(STORAGE_KEYS.LAST_SYNC)
    return lastSync ? Number.parseInt(lastSync, 10) : null
  }
  catch (error) {
    console.error('Failed to get last sync time:', error)
    return null
  }
}

/**
 * Updates the last sync timestamp
 */
export function updateLastSyncTime(timestamp: number = Date.now()): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, timestamp.toString())
  }
  catch (error) {
    console.error('Failed to update last sync time:', error)
  }
}

/**
 * Sets up service worker message listeners
 */
export function setupServiceWorkerListeners(): void {
  if (!('serviceWorker' in navigator)) {
    return
  }

  // Listen for messages from service worker
  navigator.serviceWorker.addEventListener('message', (event) => {
    const { type, payload } = event.data

    switch (type) {
      case 'sync-complete':
      case 'SYNC_RESPONSE':
        updateLastSyncTime(payload.timestamp)

        // Dispatch custom event for components to listen to
        window.dispatchEvent(new CustomEvent('kortex-sync-complete', {
          detail: payload,
        }))
        break

      case 'SYNC_ERROR':
        console.error('Sync error:', payload.error)

        // Dispatch custom event for error handling
        window.dispatchEvent(new CustomEvent('kortex-sync-error', {
          detail: payload,
        }))
        break

      default:
    }
  })

  // Listen for service worker state changes
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Retry any pending sync requests with new controller
    if (hasPendingSyncRequests()) {
      // In a real implementation, you might want to re-queue or retry pending syncs
    }
  })
}

/**
 * Requests notification permission from the user
 * Utility function exposed in React layer for push notifications
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    throw new Error('Notifications are not supported in this browser')
  }

  // Check current permission
  const currentPermission = Notification.permission

  // If already granted or denied, return current status
  if (currentPermission !== 'default') {
    return currentPermission
  }

  try {
    // Request permission
    const permission = await Notification.requestPermission()
    return permission
  }
  catch (error) {
    console.error('Failed to request notification permission:', error)
    throw error
  }
}

/**
 * Initializes service worker helpers
 * Call this once when your app starts
 */
export async function initializeServiceWorkerHelpers(): Promise<void> {
  try {
    // Register service worker
    await registerServiceWorker()

    // Set up message listeners
    setupServiceWorkerListeners()

    // Register background sync
    await registerBackgroundSync()
  }
  catch (error) {
    console.error('Failed to initialize service worker helpers:', error)
  }
}
