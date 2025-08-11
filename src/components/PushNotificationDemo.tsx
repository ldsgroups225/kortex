/**
 * Push Notification Demo Component
 *
 * Demonstrates how to integrate push notifications in a React component.
 * This is an example component that shows the basic usage patterns.
 */

import React, { useEffect, useState } from 'react'
import {
  getCurrentPushSubscription,
  getPermissionStatusText,
  isPushSupported,
  requestNotificationPermission,
  showTestNotification,
  subscribeToPush,
  subscriptionToObject,
  unsubscribeFromPush,
} from '../lib/pushNotifications'

interface PushNotificationDemoProps {
  className?: string
}

export function PushNotificationDemo({ className }: PushNotificationDemoProps) {
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [hasPermission, setHasPermission] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [loading, setLoading] = useState(false)
  const [statusText, setStatusText] = useState('')

  useEffect(() => {
    const initializeNotifications = async () => {
      const supported = isPushSupported()
      setIsSupported(supported)

      if (!supported) {
        setStatusText('Push notifications are not supported in this browser')
        return
      }

      if (!('Notification' in window)) {
        return
      }

      const permission = Notification.permission
      const hasPermission = permission === 'granted'
      setPermission(permission)
      setHasPermission(hasPermission)
      setStatusText(getPermissionStatusText())

      try {
        const currentSubscription = await getCurrentPushSubscription()
        setSubscription(currentSubscription)
      }
      catch (error) {
        console.error('Failed to check subscription status:', error)
      }
    }

    initializeNotifications()
  }, [])

  const handleRequestPermission = async () => {
    setLoading(true)

    try {
      const result = await requestNotificationPermission()
      setPermission(result)
      setHasPermission(result === 'granted')
      setStatusText(getPermissionStatusText())
    }
    catch (error) {
      console.error('Failed to request permission:', error)
      setStatusText('Failed to request notification permission')
    }
    finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async () => {
    setLoading(true)

    try {
      const newSubscription = await subscribeToPush()

      if (newSubscription) {
        setSubscription(newSubscription)

        const subscriptionData = subscriptionToObject(newSubscription)
        console.warn('Subscription data to send to backend:', subscriptionData)

        setStatusText('Successfully subscribed to push notifications')
      }
    }
    catch (error) {
      console.error('Failed to subscribe:', error)
      setStatusText('Failed to subscribe to push notifications')
    }
    finally {
      setLoading(false)
    }
  }

  const handleUnsubscribe = async () => {
    setLoading(true)

    try {
      const success = await unsubscribeFromPush()

      if (success) {
        setSubscription(null)
        setStatusText('Successfully unsubscribed from push notifications')
      }
    }
    catch (error) {
      console.error('Failed to unsubscribe:', error)
      setStatusText('Failed to unsubscribe from push notifications')
    }
    finally {
      setLoading(false)
    }
  }

  const handleTestNotification = async () => {
    try {
      await showTestNotification()
    }
    catch (error) {
      console.error('Failed to show test notification:', error)
      setStatusText('Failed to show test notification')
    }
  }

  if (!isSupported) {
    return (
      <div className={className}>
        <div className="p-4 bg-yellow-100 border border-yellow-400 rounded">
          <h3 className="font-semibold text-yellow-800">Push Notifications Not Supported</h3>
          <p className="text-yellow-700">
            Your browser doesn't support push notifications. Please try using a modern browser like
            Chrome, Firefox, or Safari.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Push Notification Demo</h2>

        <div className="p-3 bg-gray-100 rounded">
          <h3 className="font-semibold mb-2">Status</h3>
          <p className="text-sm text-gray-700">{statusText}</p>
          {subscription && <p className="text-sm text-green-600 mt-1">✅ Subscribed to push notifications</p>}
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold">Actions</h3>

          {permission === 'default' && (
            <button
              type="button"
              onClick={handleRequestPermission}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
            >
              {loading ? 'Requesting...' : 'Request Permission'}
            </button>
          )}

          {hasPermission && (
            <div className="space-x-2">
              {!subscription
                ? (
                    <button
                      type="button"
                      onClick={handleSubscribe}
                      disabled={loading}
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-green-300"
                    >
                      {loading ? 'Subscribing...' : 'Subscribe to Push'}
                    </button>
                  )
                : (
                    <button
                      type="button"
                      onClick={handleUnsubscribe}
                      disabled={loading}
                      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-red-300"
                    >
                      {loading ? 'Unsubscribing...' : 'Unsubscribe from Push'}
                    </button>
                  )}
            </div>
          )}

          <button
            type="button"
            onClick={handleTestNotification}
            disabled={loading}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-purple-300"
          >
            Test Notification
          </button>
        </div>

        {/* Permission Denied Help */}
        {permission === 'denied' && (
          <div className="p-3 bg-red-100 border border-red-400 rounded">
            <h4 className="font-semibold text-red-800">Notifications Blocked</h4>
            <p className="text-red-700 text-sm">
              Notifications have been blocked for this site. To enable them:
            </p>
            <ul className="text-red-700 text-sm mt-1 list-disc list-inside">
              <li>Click the icon in your browser's address bar</li>
              <li>Select "Allow" for notifications</li>
              <li>Refresh this page</li>
            </ul>
          </div>
        )}

        {/* Technical Info */}
        <details className="text-xs text-gray-600">
          <summary className="cursor-pointer font-semibold">Technical Information</summary>
          <div className="mt-2 space-y-1">
            <p>
              <strong>Push Support:</strong>
              {' '}
              {isSupported ? 'Yes' : 'No'}
            </p>
            <p>
              <strong>Permission:</strong>
              {' '}
              {permission}
            </p>
            <p>
              <strong>Service Worker:</strong>
              {' '}
              {'serviceWorker' in navigator ? 'Supported' : 'Not supported'}
            </p>
            <p>
              <strong>Subscription:</strong>
              {' '}
              {subscription ? 'Active' : 'None'}
            </p>
            {subscription && (
              <>
                <p>
                  <strong>Endpoint:</strong>
                  {' '}
                  {subscription.endpoint.substring(0, 50)}
                  ...
                </p>
                <p>
                  <strong>Has Keys:</strong>
                  {' '}
                  {subscription.getKey('p256dh') && subscription.getKey('auth') ? 'Yes' : 'No'}
                </p>
              </>
            )}
          </div>
        </details>

        {/* Integration Note */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
          <h4 className="font-semibold text-blue-800">Integration Note</h4>
          <p className="text-blue-700 text-sm">
            This demo shows local notification functionality. In a real application, you would:
          </p>
          <ul className="text-blue-700 text-sm mt-1 list-disc list-inside">
            <li>Send subscription data to your Convex backend</li>
            <li>Use VAPID keys for authentication</li>
            <li>Send push messages from your server</li>
            <li>Handle notification clicks and actions</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default PushNotificationDemo
