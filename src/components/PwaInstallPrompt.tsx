import { ArrowDownTrayIcon, CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRegisterSW } from 'virtual:pwa-register/react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt: () => Promise<void>
}

interface PwaInstallPromptProps {
  className?: string
}

// Function to check if PWA is installed
function checkPWAInstallation() {
  // Check for standalone display mode (PWA is installed)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  // Check for iOS standalone mode
  const isIOSStandalone = (window.navigator as any).standalone === true
  // Check for Android TWA
  const isAndroidTWA = document.referrer.includes('android-app://')

  return isStandalone || isIOSStandalone || isAndroidTWA
}

export function PwaInstallPrompt({ className = '' }: PwaInstallPromptProps) {
  const { t } = useTranslation()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(() => checkPWAInstallation())
  const [isInstalling, setIsInstalling] = useState(false)

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered() {
    },
    onRegisterError(error) {
      console.error('SW registration error', error)
    },
  })

  useEffect(() => {
    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const installPrompt = e as BeforeInstallPromptEvent
      setDeferredPrompt(installPrompt)
      setShowPrompt(true)
    }

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt)
      return

    setIsInstalling(true)

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        setIsInstalled(true)
        setShowPrompt(false)
        setDeferredPrompt(null)
      }
    }
    catch (error) {
      console.error('Error installing PWA:', error)
    }
    finally {
      setIsInstalling(false)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setDeferredPrompt(null)
  }

  const handleCloseSWPrompt = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  // If the app is already installed, don't show the install prompt
  if (isInstalled) {
    // Show service worker update prompt instead
    if (offlineReady || needRefresh) {
      return (
        <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-sm">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                {offlineReady
                  ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    )
                  : (
                      <ArrowDownTrayIcon className="h-5 w-5 text-blue-500" />
                    )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {offlineReady
                    ? t('pwa.appReadyOffline')
                    : t('pwa.updateAvailable')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {offlineReady
                    ? t('pwa.appReadyOfflineDesc')
                    : t('pwa.updateAvailableDesc')}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {needRefresh && (
                  <button
                    type="button"
                    onClick={() => updateServiceWorker(true)}
                    className="px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    {t('pwa.reload')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCloseSWPrompt}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md transition-colors"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  // Show install prompt if available and not dismissed
  if (showPrompt && deferredPrompt) {
    return (
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg shadow-lg p-4 max-w-sm">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              <ArrowDownTrayIcon className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold">
                {t('pwa.installApp')}
              </h3>
              <p className="text-xs text-blue-100 mt-1">
                {t('pwa.installAppDesc')}
              </p>
              <div className="flex items-center space-x-2 mt-3">
                <button
                  type="button"
                  onClick={handleInstallClick}
                  disabled={isInstalling}
                  className="px-3 py-1.5 text-xs font-medium bg-white text-blue-600 rounded-md hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isInstalling ? t('pwa.installing') : t('pwa.install')}
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="px-3 py-1.5 text-xs font-medium text-blue-100 border border-blue-300 rounded-md hover:bg-blue-500/20 transition-colors"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 text-blue-100 hover:text-white rounded-md transition-colors"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

// Component for showing install status in the sidebar
export function PwaInstallButton({ className = '' }: { className?: string }) {
  const { t } = useTranslation()
  const [isInstalled, setIsInstalled] = useState(() => checkPWAInstallation())
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalling, setIsInstalling] = useState(false)

  useEffect(() => {
    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt)
      return

    setIsInstalling(true)

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        setIsInstalled(true)
        setDeferredPrompt(null)
      }
    }
    catch (error) {
      console.error('Error installing PWA:', error)
    }
    finally {
      setIsInstalling(false)
    }
  }

  if (isInstalled) {
    return (
      <div className={`flex items-center space-x-2 px-3 py-2 text-sm text-green-700 dark:text-green-300 ${className}`}>
        <CheckCircleIcon className="h-4 w-4" />
        <span>{t('pwa.appInstalled')}</span>
      </div>
    )
  }

  if (deferredPrompt) {
    return (
      <button
        type="button"
        onClick={handleInstallClick}
        disabled={isInstalling}
        className={`flex items-center space-x-2 w-full px-3 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        <ArrowDownTrayIcon className="h-4 w-4" />
        <span>{isInstalling ? t('pwa.installing') : t('pwa.installApp')}</span>
      </button>
    )
  }

  return null
}
