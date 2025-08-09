import { useAuthActions } from '@convex-dev/auth/react'
import {
  ArrowRightOnRectangleIcon,
  CheckIcon,
  ComputerDesktopIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  MoonIcon,
  SunIcon,
  TrashIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import { useMutation, useQuery } from 'convex/react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../../convex/_generated/api'
import { DataPortability } from './DataPortability'

export function SettingsPage() {
  const { t } = useTranslation()
  const { i18n } = useTranslation()
  const loggedInUser = useQuery(api.auth.loggedInUser)
  const userPreferences = useQuery(api.userPreferences.getUserPreferences)
  const updatePreferences = useMutation(api.userPreferences.updateUserPreferences)
  const { signOut } = useAuthActions()

  const [isLoading, setIsLoading] = useState(false)

  // Compute local state during render instead of using useEffect
  const localTheme = useMemo(() => {
    return userPreferences?.theme || 'system'
  }, [userPreferences?.theme])

  const localLanguage = useMemo(() => {
    return userPreferences?.language || 'en'
  }, [userPreferences?.language])

  const handleThemeChange = async (theme: 'light' | 'dark' | 'system') => {
    setIsLoading(true)
    try {
      await updatePreferences({ theme })
      // setLocalTheme(theme) // This line is removed as per the edit hint

      // Apply theme immediately
      if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        document.documentElement.classList.toggle('dark', prefersDark)
      }
      else {
        document.documentElement.classList.toggle('dark', theme === 'dark')
      }
    }
    catch (error) {
      console.error('Failed to update theme:', error)
    }
    finally {
      setIsLoading(false)
    }
  }

  const handleLanguageChange = async (language: 'en' | 'fr') => {
    setIsLoading(true)
    try {
      await updatePreferences({ language })
      // setLocalLanguage(language) // This line is removed as per the edit hint
      i18n.changeLanguage(language)
    }
    catch (error) {
      console.error('Failed to update language:', error)
    }
    finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = () => {
    // TODO: Replace with proper confirmation dialog
    void signOut()
  }

  const handleDeleteAccount = () => {
    // TODO: Replace with proper confirmation dialog
    console.warn('Delete account functionality to be implemented')
  }

  const themeOptions = [
    { value: 'light', label: t('settings.lightMode'), icon: SunIcon },
    { value: 'dark', label: t('settings.darkMode'), icon: MoonIcon },
    { value: 'system', label: t('settings.system'), icon: ComputerDesktopIcon },
  ]

  const languageOptions = [
    { value: 'en', label: 'English 🇬🇧', flag: '🇬🇧' },
    { value: 'fr', label: 'Français 🇫🇷', flag: '🇫🇷' },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('settings.title')}
        </h1>
      </div>

      {/* Account Information */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <UserIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('settings.account')}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Manage your account information and sign out.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <EnvelopeIcon className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {t('auth.email')}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {loggedInUser?.email || 'Loading...'}
                </p>
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4" />
                <span>{t('settings.signOut')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Appearance Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <SunIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('settings.appearance')}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Change the look and feel of your app.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('settings.theme')}
              </label>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {themeOptions.map((option) => {
                  const Icon = option.icon
                  const isSelected = localTheme === option.value
                  return (
                    <button
                      type="button"
                      key={option.value}
                      onClick={() => void handleThemeChange(option.value as 'light' | 'dark' | 'system')}
                      disabled={isLoading}
                      className={`relative flex items-center space-x-3 p-3 rounded-lg border transition-colors ${isSelected
                        ? 'bg-blue-50 dark:bg-primary/20 border-primary font-medium text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-sm font-medium">{option.label}</span>
                      {isSelected && (
                        <CheckIcon className="absolute top-2 right-2 h-4 w-4 text-primary" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Language Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-6 w-6 text-gray-500 dark:text-gray-400">🌐</div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('settings.language')}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Choose your preferred language for the interface.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('settings.language')}
              </label>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {languageOptions.map(option => {
                  const isSelected = localLanguage === option.value
                  return (
                    <button
                      type="button"
                      key={option.value}
                      onClick={() => void handleLanguageChange(option.value as 'en' | 'fr')}
                      disabled={isLoading}
                      className={`relative flex items-center space-x-3 p-3 rounded-lg border transition-colors ${isSelected
                        ? 'bg-blue-50 dark:bg-primary/20 border-primary font-medium text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span className="text-lg">{option.flag}</span>
                      <span className="text-sm font-medium">{option.label}</span>
                      {isSelected && (
                        <CheckIcon className="absolute top-2 right-2 h-4 w-4 text-primary" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Portability */}
      <DataPortability />

      {/* Danger Zone */}
      <div className="bg-red-50 dark:bg-red-500/10 rounded-lg shadow-sm border border-red-500 dark:border-red-600">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
            <div>
              <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">
                {t('settings.dangerZone')}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Irreversible actions that require careful consideration.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {t('settings.deleteAccountDescription')}
              </p>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md transition-colors"
              >
                <TrashIcon className="h-4 w-4" />
                <span>{t('settings.deleteAccount')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
