import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface I18nProviderProps {
  children: React.ReactNode
}

export function I18nProvider({ children }: I18nProviderProps) {
  const { ready } = useTranslation()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const updateReady = () => {
      if (ready) {
        setIsReady(true)
      }
    }
    updateReady()
  }, [ready])

  if (!isReady) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
