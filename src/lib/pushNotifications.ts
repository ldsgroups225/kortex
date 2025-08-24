/**
 * Push Notification Utilities for Kortex
 *
 * Provides utilities for managing push notifications, including permission requests,
 * subscription management, and integration with the service worker.
 */

export interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  requireInteraction?: boolean
  actions?: Array<{
    action: string
    title: string
  }>
  data?: Record<string, any>
}

/**
 * Checks if push notifications are supported in this browser
 */
export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
  )
}

/**
 * Gets the current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'default'
  }
  return Notification.permission
}

/**
 * Requests notification permission from the user
 * Returns a promise that resolves with the permission result
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported in this browser')
  }

  // Check current permission
  const currentPermission = getNotificationPermission()

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
 * Checks if the user has granted notification permissions
 */
export function hasNotificationPermission(): boolean {
  return getNotificationPermission() === 'granted'
}

/**
 * Gets the current push subscription from the service worker
 */
export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    return null
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    return subscription
  }
  catch (error) {
    console.error('Failed to get push subscription:', error)
    return null
  }
}

/**
 * Subscribe to push notifications
 * Requires VAPID public key from your server
 */
export async function subscribeToPush(vapidPublicKey?: string): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported')
  }

  // Check permission first
  const permission = await requestNotificationPermission()
  if (permission !== 'granted') {
    throw new Error('Notification permission not granted')
  }

  try {
    const registration = await navigator.serviceWorker.ready

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      return subscription
    }

    // Subscribe to push notifications
    const subscribeOptions: PushSubscriptionOptionsInit = {
      userVisibleOnly: true, // Required for web push
      applicationServerKey: vapidPublicKey ? urlBase64ToUint8Array(vapidPublicKey) : undefined,
    }

    subscription = await registration.pushManager.subscribe(subscribeOptions)

    return subscription
  }
  catch (error) {
    console.error('Failed to subscribe to push notifications:', error)
    throw error
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      return true
    }

    const result = await subscription.unsubscribe()
    return result
  }
  catch (error) {
    console.error('Failed to unsubscribe from push notifications:', error)
    return false
  }
}

/**
 * Converts a base64 URL-encoded string to Uint8Array
 * This is required for VAPID public keys
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Converts a PushSubscription to a plain object for storage/transmission
 */
export function subscriptionToObject(subscription: PushSubscription): PushSubscriptionData {
  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
      auth: arrayBufferToBase64(subscription.getKey('auth')!),
    },
  }
}

/**
 * Converts an ArrayBuffer to a base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

/**
 * Shows a local notification (fallback for when service worker isn't available)
 */
export async function showLocalNotification(payload: NotificationPayload): Promise<Notification | null> {
  if (!hasNotificationPermission()) {
    return null
  }

  try {
    const notification = new Notification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/kortex-logo.svg',
      badge: payload.badge || '/kortex-logo.svg',
      tag: payload.tag,
      requireInteraction: payload.requireInteraction || false,
      data: payload.data || {},
    })

    // Handle click events
    notification.onclick = () => {
      window.focus()
      notification.close()
    }

    return notification
  }
  catch (error) {
    console.error('Failed to show local notification:', error)
    return null
  }
}

/**
 * Test function to show a sample notification
 * Useful for testing the notification system
 */
export async function showTestNotification(): Promise<void> {
  const payload: NotificationPayload = {
    title: 'Kortex Test Notification',
    body: 'This is a test notification to verify the push notification system is working.',
    icon: '/kortex-logo.svg',
    tag: 'test-notification',
    data: {
      type: 'test',
      timestamp: Date.now(),
    },
  }

  await showLocalNotification(payload)
}

/**
 * Gets notification permission status as a user-friendly string
 */
export function getPermissionStatusText(): string {
  const permission = getNotificationPermission()
  switch (permission) {
    case 'granted':
      return 'Notifications are enabled'
    case 'denied':
      return 'Notifications are blocked. Please enable them in your browser settings.'
    case 'default':
      return 'Notification permission not yet requested'
    default:
      return 'Unknown notification status'
  }
}

/**
 * Checks if the browser supports push notifications with payload
 */
export function supportsPushWithPayload(): boolean {
  if (!isPushSupported()) {
    return false
  }

  // Most modern browsers support push with payload
  // This is a basic check - you might want to add more specific browser detection
  return true
}

/**
 * Utility to handle service worker push subscription changes
 */
export function setupPushSubscriptionChangeHandler(): void {
  if (!isPushSupported()) {
    return
  }

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'subscription-change') {
      // Handle subscription change - you might want to re-subscribe
      // or update your server with the new subscription
    }
  })
}
