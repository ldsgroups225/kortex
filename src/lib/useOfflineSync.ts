import type { Id } from '../../convex/_generated/dataModel'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { hasPendingSyncRequests, queueSyncRequest, registerBackgroundSync } from '../sw-helpers'

// Connection states
export type ConnectionState = 'online' | 'offline' | 'syncing' | 'error'

// Sync status interface
export interface SyncStatus {
  connectionState: ConnectionState
  lastSync?: Date
  isOnline: boolean
  isSyncing: boolean
  offlineChanges: number
  // Additional properties for extended sync status
  pending?: number
  failed?: number
  synced?: number
}

// Hook for offline-first sync management
export function useOfflineSync(_userId: Id<'users'> | null) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('online')
  const [lastSync, setLastSync] = useState<Date | undefined>(undefined)
  const [offlineChanges, setOfflineChanges] = useState<number>(0)

  // Initialize connection state
  useEffect(() => {
    const initialState = navigator.onLine ? 'online' : 'offline'
    // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
    setConnectionState(initialState)
  }, [])

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setConnectionState('online')
    }

    const handleOffline = () => {
      setConnectionState('offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Force sync function
  const forceSync = useCallback(async () => {
    if (connectionState !== 'online')
      return

    setConnectionState('syncing')

    try {
      // Register background sync with service worker
      await registerBackgroundSync('kortex-sync')

      // Queue sync request to service worker
      queueSyncRequest('full-sync')

      // Check for pending changes in service worker queue
      const pendingChanges = hasPendingSyncRequests()
      setOfflineChanges(pendingChanges ? 1 : 0) // Simplified - in real implementation would count actual changes

      // Simulate sync process
      await new Promise(resolve => setTimeout(resolve, 1000))

      setConnectionState('online')
      setLastSync(new Date())
      setOfflineChanges(0)

      toast.success('Synced successfully')
    }
    catch (error) {
      console.error('Sync failed:', error)
      setConnectionState('error')
      toast.error('Sync failed')
    }
  }, [connectionState])

  // Force sync all data types
  const forceSyncAll = useCallback(async () => {
    await forceSync()
  }, [forceSync])

  // Increment offline changes counter
  const incrementOfflineChanges = useCallback(() => {
    setOfflineChanges(prev => prev + 1)
  }, [])

  // Sync status object
  const status: SyncStatus = {
    connectionState,
    lastSync,
    isOnline: connectionState === 'online',
    isSyncing: connectionState === 'syncing',
    offlineChanges,
  }

  return {
    status,
    forceSync,
    forceSyncAll,
    incrementOfflineChanges,
  }
}
