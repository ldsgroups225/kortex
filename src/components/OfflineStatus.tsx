import type { ConnectionState, SyncStatus } from '../lib/useOfflineSync'
import {
  ArrowDownTrayIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  SignalIcon,
  SignalSlashIcon,
} from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { useRegisterSW } from 'virtual:pwa-register/react'

interface OfflineStatusProps {
  status: SyncStatus
  onForcSync?: () => void
  className?: string
}

export function OfflineStatus({ status, onForcSync, className = '' }: OfflineStatusProps) {
  const { t } = useTranslation()

  // Handle cases where status might be undefined or have missing properties
  if (!status) {
    return (
      <div className={`bg-gray-50 dark:bg-gray-900/20 rounded-lg p-3 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0 text-gray-400">
            <SignalSlashIcon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t('sync.loading') || 'Loading...'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const getStatusInfo = () => {
    switch (status.connectionState) {
      case 'online':
        return {
          icon: SignalIcon,
          text: t('sync.online'),
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          textColor: 'text-green-700 dark:text-green-300',
          iconColor: 'text-green-600 dark:text-green-400',
          description: status.lastSync
            ? t('sync.lastSyncAt', {
                time: status.lastSync.toLocaleTimeString(),
              })
            : t('sync.connected'),
        }

      case 'offline':
        return {
          icon: SignalSlashIcon,
          text: t('sync.offline'),
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
          textColor: 'text-yellow-700 dark:text-yellow-300',
          iconColor: 'text-yellow-600 dark:text-yellow-400',
          description: (status.offlineChanges || 0) > 0
            ? t('sync.changesWaiting', { count: status.offlineChanges || 0 })
            : t('sync.workingOffline'),
        }

      case 'syncing':
        return {
          icon: CloudArrowUpIcon,
          text: t('sync.syncing'),
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          textColor: 'text-blue-700 dark:text-blue-300',
          iconColor: 'text-blue-600 dark:text-blue-400',
          description: t('sync.syncingChanges', { count: status.offlineChanges || 0 }),
        }

      case 'error':
        return {
          icon: ExclamationTriangleIcon,
          text: t('sync.error'),
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          textColor: 'text-red-700 dark:text-red-300',
          iconColor: 'text-red-600 dark:text-red-400',
          description: t('sync.syncError'),
        }

      default:
        // Fallback for unknown connection states
        return {
          icon: SignalSlashIcon,
          text: t('sync.unknown') || 'Unknown',
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
          textColor: 'text-gray-700 dark:text-gray-300',
          iconColor: 'text-gray-600 dark:text-gray-400',
          description: t('sync.unknownState') || 'Unknown sync state',
        }
    }
  }

  const statusInfo = getStatusInfo()
  const Icon = statusInfo.icon

  return (
    <div className={`${statusInfo.bgColor} rounded-lg p-3 ${className}`}>
      <div className="flex items-center space-x-3">
        <div className={`flex-shrink-0 ${statusInfo.iconColor}`}>
          <Icon className={`h-5 w-5 ${
            status.connectionState === 'syncing' ? 'animate-pulse' : ''
          }`}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className={`text-sm font-medium ${statusInfo.textColor}`}>
              {statusInfo.text}
            </p>

            {/* Show counts when relevant */}
            <div className="flex items-center space-x-2 text-xs">
              {(status.offlineChanges || 0) > 0 && (
                <span className={`px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 ${
                  status.connectionState === 'offline'
                    ? 'text-orange-700 dark:text-orange-300'
                    : 'text-orange-600 dark:text-orange-400'
                }`}
                >
                  {status.offlineChanges || 0}
                  {' '}
                  {t('sync.pending')}
                </span>
              )}

              {(status.offlineChanges || 0) > 0 && status.connectionState === 'syncing' && (
                <span className="px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                  {status.offlineChanges || 0}
                  {' '}
                  {t('sync.syncing')}
                </span>
              )}
            </div>
          </div>

          <p className={`text-xs ${statusInfo.textColor} mt-1 opacity-75`}>
            {statusInfo.description}
          </p>
        </div>

        {/* Force sync button for offline/error states */}
        {(status.connectionState === 'error'
          || (status.connectionState === 'offline' && (status.offlineChanges || 0) > 0))
        && onForcSync && (
          <button
            type="button"
            onClick={onForcSync}
            className={`flex-shrink-0 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              status.connectionState === 'error'
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50'
            }`}
          >
            {t('sync.retry')}
          </button>
        )}
      </div>
    </div>
  )
}

// Minimal status indicator for the sidebar
export function OfflineStatusIndicator({
  connectionState,
  offlineChanges,
  className = '',
}: {
  connectionState: ConnectionState
  offlineChanges: number
  className?: string
}) {
  const getIndicatorInfo = () => {
    switch (connectionState) {
      case 'online':
        return {
          color: 'bg-green-400',
          pulse: false,
        }
      case 'offline':
        return {
          color: 'bg-yellow-400',
          pulse: false,
        }
      case 'syncing':
        return {
          color: 'bg-blue-400',
          pulse: true,
        }
      case 'error':
        return {
          color: 'bg-red-400',
          pulse: false,
        }
    }
  }

  const indicator = getIndicatorInfo()

  return (
    <div className={`relative ${className}`}>
      <div className={`w-2 h-2 rounded-full ${indicator.color} ${
        indicator.pulse ? 'animate-pulse' : ''
      }`}
      />

      {/* Show offline changes count */}
      {offlineChanges > 0 && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full flex items-center justify-center">
          <span className="text-[8px] font-bold text-white leading-none">
            {offlineChanges > 9 ? '9+' : offlineChanges}
          </span>
        </div>
      )}
    </div>
  )
}

// PWA Status Badge for the sidebar showing caching/update status
export function PwaStatusBadge({ className = '' }: { className?: string }) {
  const { t } = useTranslation()

  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh],
    updateServiceWorker: _updateServiceWorker,
  } = useRegisterSW({
    onRegistered() {},
    onRegisterError(error) {
      console.error('SW registration error', error)
    },
    onNeedRefresh() { },
    onOfflineReady() {},
  })

  // Don't show badge if nothing relevant is happening
  if (!offlineReady && !needRefresh) {
    return null
  }

  const getBadgeInfo = () => {
    if (needRefresh) {
      return {
        icon: ArrowDownTrayIcon,
        text: t('pwa.updateAvailable'),
        color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
        pulse: true,
      }
    }

    if (offlineReady) {
      return {
        icon: CheckCircleIcon,
        text: t('pwa.swCached'),
        color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
        pulse: false,
      }
    }

    return null
  }

  const badgeInfo = getBadgeInfo()
  if (!badgeInfo)
    return null

  const Icon = badgeInfo.icon

  return (
    <div className={`flex items-center space-x-2 px-2 py-1 rounded-md text-xs font-medium ${badgeInfo.color} ${className}`}>
      <Icon className={`h-3 w-3 ${
        badgeInfo.pulse ? 'animate-pulse' : ''
      }`}
      />
      <span>{badgeInfo.text}</span>
      {needRefresh && (
        <button
          type="button"
          onClick={() => {
            // Simple approach: just reload the page
            // The service worker will handle the update automatically
            window.location.reload()
          }}
          className="ml-1 text-xs underline hover:no-underline"
        >
          {t('pwa.reload')}
        </button>
      )}
    </div>
  )
}
