import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useState, useEffect } from 'react';
import { useAuthActions } from "@convex-dev/auth/react";
import {
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  UserIcon,
  EnvelopeIcon,
  ArrowRightOnRectangleIcon,
  TrashIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const userPreferences = useQuery(api.userPreferences.getUserPreferences);
  const updatePreferences = useMutation(api.userPreferences.updateUserPreferences);
  const { signOut } = useAuthActions();

  const [localTheme, setLocalTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [localLanguage, setLocalLanguage] = useState<'en' | 'fr'>('en');
  const [isLoading, setIsLoading] = useState(false);

  // Initialize local state from user preferences
  useEffect(() => {
    if (userPreferences) {
      setLocalTheme(userPreferences.theme);
      setLocalLanguage(userPreferences.language);
    }
  }, [userPreferences]);

  const handleThemeChange = async (theme: 'light' | 'dark' | 'system') => {
    setIsLoading(true);
    try {
      await updatePreferences({ theme });
      setLocalTheme(theme);

      // Apply theme immediately
      if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.toggle('dark', prefersDark);
      } else {
        document.documentElement.classList.toggle('dark', theme === 'dark');
      }
    } catch (error) {
      console.error('Failed to update theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLanguageChange = async (language: 'en' | 'fr') => {
    setIsLoading(true);
    try {
      await updatePreferences({ language });
      setLocalLanguage(language);
      i18n.changeLanguage(language);
    } catch (error) {
      console.error('Failed to update language:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    if (confirm(t('settings.signOutConfirm'))) {
      void signOut();
    }
  };

  const handleDeleteAccount = () => {
    if (confirm(t('settings.deleteAccountConfirm'))) {
      // Account deletion logic would be implemented here
      console.log('Delete account functionality to be implemented');
    }
  };

  const themeOptions = [
    { value: 'light', label: t('settings.lightMode'), icon: SunIcon },
    { value: 'dark', label: t('settings.darkMode'), icon: MoonIcon },
    { value: 'system', label: t('settings.system'), icon: ComputerDesktopIcon },
  ];

  const languageOptions = [
    { value: 'en', label: 'English 🇬🇧', flag: '🇬🇧' },
    { value: 'fr', label: 'Français 🇫🇷', flag: '🇫🇷' },
  ];

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
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('settings.account')}
            </h2>
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
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('settings.appearance')}
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('settings.theme')}
              </label>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {themeOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      onClick={() => void handleThemeChange(option.value as 'light' | 'dark' | 'system')}
                      disabled={isLoading}
                      className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${localTheme === option.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                        }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-sm font-medium">{option.label}</span>
                    </button>
                  );
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
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('settings.language')}
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('settings.language')}
              </label>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {languageOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => void handleLanguageChange(option.value as 'en' | 'fr')}
                    disabled={isLoading}
                    className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${localLanguage === option.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                      }`}
                  >
                    <span className="text-lg">{option.flag}</span>
                    <span className="text-sm font-medium">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-red-200 dark:border-red-800">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
            <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">
              {t('settings.dangerZone')}
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {t('settings.deleteAccountDescription')}
              </p>
              <button
                onClick={handleDeleteAccount}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
              >
                <TrashIcon className="h-4 w-4" />
                <span>{t('settings.deleteAccount')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
