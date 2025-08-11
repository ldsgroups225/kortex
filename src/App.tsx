import {
  Bars3Icon,
  CheckCircleIcon,
  CodeBracketIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  HomeIcon,
  MoonIcon,
  ShieldCheckIcon,
  SunIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { Authenticated, Unauthenticated, useMutation, useQuery } from 'convex/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Toaster } from 'sonner'
import { api } from '../convex/_generated/api'
import { AdminDashboard } from './components/AdminDashboard'
import { KeyboardShortcuts } from './components/KeyboardShortcuts'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { NotesPage } from './components/NotesPage'
import { OfflineStatus, OfflineStatusIndicator, PwaStatusBadge } from './components/OfflineStatus'
import { OnboardingProvider } from './components/OnboardingProvider'
import { OnboardingTooltip } from './components/OnboardingTooltip'
import { PwaInstallButton, PwaInstallPrompt } from './components/PwaInstallPrompt'
import { SettingsPage } from './components/SettingsPage'
import { SnippetsPage } from './components/SnippetsPage'
import { TodosPage } from './components/TodosPage'
import { useOfflineSync } from './lib/useOfflineSync'
import { SignInForm } from './SignInForm'
import { SignOutButton } from './SignOutButton'

type Route = 'dashboard' | 'notes' | 'snippets' | 'todos' | 'settings' | 'admin'

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<Route>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const userPreferences = useQuery(api.userPreferences.getUserPreferences)
  const updateUserPreferences = useMutation(api.userPreferences.updateUserPreferences)

  // Compute dark mode during render instead of using useEffect
  const darkMode = useMemo(() => {
    if (userPreferences) {
      const { theme } = userPreferences
      let shouldUseDark = false

      if (theme === 'system') {
        shouldUseDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      }
      else {
        shouldUseDark = theme === 'dark'
      }

      return shouldUseDark
    }
    else {
      // Fallback to localStorage for unauthenticated users
      const savedTheme = localStorage.getItem('theme')
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      return savedTheme === 'dark' || (!savedTheme && prefersDark)
    }
  }, [userPreferences])

  // Apply dark mode class to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  const toggleDarkMode = async () => {
    const newTheme = darkMode ? 'light' : 'dark'

    if (userPreferences) {
      // For authenticated users, update preferences in database
      try {
        await updateUserPreferences({ theme: newTheme })
      }
      catch (error) {
        console.error('Failed to update theme preference:', error)
      }
    }
    else {
      // For unauthenticated users, use localStorage
      localStorage.setItem('theme', newTheme)
      document.documentElement.classList.toggle('dark', newTheme === 'dark')
    }
  }

  // Keyboard shortcuts refs
  const searchRef = useRef<HTMLInputElement>(null)

  const handleCopyLastSelected = () => {
    // This would copy the last selected note/snippet/todo
    // Implementation depends on the current route and selected item
    // Copy last selected item functionality
  }

  const handleCreateNote = () => {
    if (currentRoute === 'notes') {
      // Trigger note creation
      // Create new note functionality
    }
  }

  const handleFocusSearch = () => {
    if (searchRef.current) {
      searchRef.current.focus()
    }
  }

  return (
    <OnboardingProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <KeyboardShortcuts
          onCopyLastSelected={handleCopyLastSelected}
          onCreateNote={handleCreateNote}
          onFocusSearch={handleFocusSearch}
        />
        <Authenticated>
          <AuthenticatedApp
            currentRoute={currentRoute}
            setCurrentRoute={setCurrentRoute}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            darkMode={darkMode}
            toggleDarkMode={toggleDarkMode}
            searchRef={searchRef}
          />
          <OnboardingTooltip />
          <PwaInstallPrompt />
        </Authenticated>

        <Unauthenticated>
          <UnauthenticatedApp darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
          <PwaInstallPrompt />
        </Unauthenticated>
      </div>
      <Toaster richColors position="top-right" theme={darkMode ? 'dark' : 'light'} />
    </OnboardingProvider>
  )
}

function AuthenticatedApp({
  currentRoute,
  setCurrentRoute,
  sidebarOpen,
  setSidebarOpen,
  darkMode,
  toggleDarkMode,
}: {
  currentRoute: Route
  setCurrentRoute: (route: Route) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  darkMode: boolean
  toggleDarkMode: () => void
  searchRef?: React.RefObject<HTMLInputElement | null>
}) {
  const loggedInUser = useQuery(api.auth.loggedInUser)
  const { t } = useTranslation()

  // Initialize offline sync
  const offlineSync = useOfflineSync(loggedInUser?._id || null)

  const navigation = [
    { name: t('navigation.dashboard'), route: 'dashboard' as Route, icon: HomeIcon },
    { name: t('navigation.notes'), route: 'notes' as Route, icon: DocumentTextIcon },
    { name: t('navigation.snippets'), route: 'snippets' as Route, icon: CodeBracketIcon },
    { name: t('navigation.todos'), route: 'todos' as Route, icon: CheckCircleIcon },
    { name: t('navigation.settings'), route: 'settings' as Route, icon: Cog6ToothIcon },
    ...(loggedInUser ? [{ name: 'Admin', route: 'admin' as Route, icon: ShieldCheckIcon }] : []),
  ]

  // Render the main layout
  const renderSidebar = ({ includeOfflineStatus = true }: { includeOfflineStatus?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-6 border-b border-border dark:border-border-dark">
        <div className="flex items-center space-x-3">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white" data-onboarding="app-logo">Kortex</h1>
          <OfflineStatusIndicator
            connectionState={offlineSync.status.connectionState}
            offlineChanges={offlineSync.status.offlineChanges}
            className="flex-shrink-0"
          />
        </div>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2" data-onboarding="navigation">
        {navigation.map(item => (
          <button
            type="button"
            key={item.name}
            onClick={() => {
              setCurrentRoute(item.route)
              setSidebarOpen(false)
            }}
            className={`
              w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
              ${currentRoute === item.route
            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }
            `}
          >
            <item.icon className="h-5 w-5 mr-3" />
            {item.name}
          </button>
        ))}
      </nav>

      {/* Sync Status - for pages that need offline functionality */}
      {includeOfflineStatus && (currentRoute === 'notes' || currentRoute === 'todos' || currentRoute === 'snippets') && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <OfflineStatus
            status={offlineSync.status}
            onForcSync={offlineSync.forceSync}
            className="mb-4"
          />
        </div>
      )}

      {/* User info and controls */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <button
          type="button"
          onClick={toggleDarkMode}
          className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          {darkMode
            ? (
                <SunIcon className="h-5 w-5 mr-3" />
              )
            : (
                <MoonIcon className="h-5 w-5 mr-3" />
              )}
          {darkMode ? t('settings.lightMode') : t('settings.darkMode')}
        </button>

        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {loggedInUser?.email || 'User'}
            </p>
          </div>
          <SignOutButton />
        </div>
      </div>
    </div>
  )

  // For notes page - full height layout
  if (currentRoute === 'notes') {
    return (
      <div className="flex h-screen">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main App Sidebar */}
        <div className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        >
          {renderSidebar({})}
        </div>

        {/* Notes page content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <NotesPage sidebarOpen={false} setSidebarOpen={() => setSidebarOpen(true)} />
        </div>
      </div>
    )
  }

  // For todos page - full height layout
  if (currentRoute === 'todos') {
    return (
      <div className="flex h-screen">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main App Sidebar */}
        <div className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        >
          {renderSidebar({})}
        </div>

        {/* Todos page content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <TodosPage sidebarOpen={false} setSidebarOpen={() => setSidebarOpen(true)} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-component dark:bg-component-dark border-r border-border dark:border-border-dark transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-border dark:border-border-dark">
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white" data-onboarding="app-logo">Kortex</h1>
              <OfflineStatusIndicator
                connectionState={offlineSync.status.connectionState}
                offlineChanges={offlineSync.status.offlineChanges}
                className="flex-shrink-0"
              />
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2" data-onboarding="navigation">
            {navigation.map(item => (
              <button
                type="button"
                key={item.name}
                onClick={() => {
                  setCurrentRoute(item.route)
                  setSidebarOpen(false)
                }}
                className={`
                  w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
                  ${currentRoute === item.route
                ? 'text-primary font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-white'
              }
                `}
              >
                <item.icon className="h-5 w-5 mr-3" />
                {item.name}
              </button>
            ))}
          </nav>

          {/* Offline Status Panel */}
          <div className="border-t border-border dark:border-border-dark p-4">
            <OfflineStatus
              status={offlineSync.status}
              onForceSync={offlineSync.forceSyncAll}
              className="mb-4"
            />
          </div>

          {/* PWA Status Badge */}
          <div className="border-t border-border dark:border-border-dark p-4">
            <PwaStatusBadge className="mb-4" />
          </div>

          {/* User info and controls */}
          <div className="border-t border-border dark:border-border-dark p-4 space-y-4">
            {/* PWA Install Button */}
            <PwaInstallButton className="mb-4" />

            <button
              type="button"
              onClick={toggleDarkMode}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {darkMode
                ? (
                    <SunIcon className="h-5 w-5 mr-3" />
                  )
                : (
                    <MoonIcon className="h-5 w-5 mr-3" />
                  )}
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </button>

            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {loggedInUser?.email || 'User'}
                </p>
              </div>
              <SignOutButton />
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-component dark:bg-component-dark border-b border-border dark:border-border-dark h-16 flex items-center justify-between px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          <div className="flex-1 lg:ml-0">
            <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 capitalize">
              {currentRoute}
            </h2>
          </div>

          <div className="flex items-center space-x-4">
            <LanguageSwitcher />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          <RouteContent route={currentRoute} />
        </main>
      </div>
    </div>
  )
}

function UnauthenticatedApp({ darkMode, toggleDarkMode }: { darkMode: boolean, toggleDarkMode: () => void }) {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100 dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="relative z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50 px-6 py-4">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Kortex</h1>
          <div className="flex items-center space-x-4">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={toggleDarkMode}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-colors"
            >
              {darkMode
                ? (
                    <SunIcon className="h-5 w-5" />
                  )
                : (
                    <MoonIcon className="h-5 w-5" />
                  )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - Two Column Layout */}
      <main className="min-h-[calc(100vh-80px)] grid grid-cols-1 md:grid-cols-2">
        {/* Left Column - Sign In Form */}
        <div className="flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {t('auth.welcome')}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Sign in to your account
                </p>
              </div>
              <SignInForm />
            </div>
          </div>
        </div>

        {/* Right Column - Branding & Welcome */}
        <div className="hidden md:flex items-center justify-center p-8 relative overflow-hidden">
          <div className="text-center max-w-lg relative z-10">
            {/* App Icon/Logo */}
            <div className="mb-8">
              <div className="w-24 h-24 mx-auto rounded-2xl shadow-2xl mb-6">
                <img src="/kortex-logo.svg" alt="Kortex Logo" className="w-full h-full" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Kortex
              </h1>
            </div>

            {/* Tagline & Features */}
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
                The All-in-One Workspace for Notes, Code, and Tasks
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                Boost your productivity with Kortex, the intelligent workspace. Seamlessly manage rich-text notes, organize code snippets, and track tasks on a visual Kanban board.
              </p>

              {/* Feature highlights */}
              <div className="grid grid-cols-1 gap-4 mt-8">
                <div className="flex items-center gap-3 text-left">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                    <DocumentTextIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-gray-700 dark:text-gray-300">Rich text notes with instant sync</span>
                </div>
                <div className="flex items-center gap-3 text-left">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                    <CodeBracketIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-gray-700 dark:text-gray-300">Code snippets and templates</span>
                </div>
                <div className="flex items-center gap-3 text-left">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                    <CheckCircleIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-gray-700 dark:text-gray-300">Task management & organization</span>
                </div>
              </div>
            </div>
          </div>

          {/* Background decoration */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-300 dark:bg-blue-600 rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-purple-300 dark:bg-purple-600 rounded-full blur-3xl"></div>
            <div className="absolute top-3/4 left-1/2 w-28 h-28 bg-indigo-300 dark:bg-indigo-600 rounded-full blur-3xl"></div>
          </div>
        </div>
      </main>
    </div>
  )
}

function RouteContent({ route }: { route: Route }) {
  const content = () => {
    switch (route) {
      case 'dashboard':
        return <DashboardPage />
      case 'notes':
        return <NotesPage />
      case 'snippets':
        return <SnippetsPage />
      case 'todos':
        return <TodosPage />
      case 'settings':
        return <SettingsPage />
      case 'admin':
        return <AdminDashboard />
      default:
        return <DashboardPage />
    }
  }

  return (
    <div key={route} className="animate-fade-in">
      {content()}
    </div>
  )
}

function DashboardPage() {
  const { t } = useTranslation()
  const notes = useQuery(api.notes.getUserNotes)
  const snippets = useQuery(api.snippets.getUserSnippets, {})
  const todos = useQuery(api.todos.getTodos)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-onboarding="stats-grid">
        <div className="bg-component dark:bg-component-dark p-6 rounded-lg shadow-sm border border-border dark:border-border-dark">
          <div className="flex items-center">
            <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-full">
              <DocumentTextIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {notes?.length || 0}
              </div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('navigation.notes')}</h3>
            </div>
          </div>
        </div>

        <div className="bg-component dark:bg-component-dark p-6 rounded-lg shadow-sm border border-border dark:border-border-dark">
          <div className="flex items-center">
            <div className="bg-green-100 dark:bg-green-900/50 p-3 rounded-full">
              <CodeBracketIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {snippets?.length || 0}
              </div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('navigation.snippets')}</h3>
            </div>
          </div>
        </div>

        <div className="bg-component dark:bg-component-dark p-6 rounded-lg shadow-sm border border-border dark:border-border-dark">
          <div className="flex items-center">
            <div className="bg-purple-100 dark:bg-purple-900/50 p-3 rounded-full">
              <CheckCircleIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {todos ? (todos.todo.length + todos.inProgress.length + todos.done.length) : 0}
              </div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('navigation.todos')}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-component dark:bg-component-dark p-6 rounded-lg shadow-sm border border-border dark:border-border-dark">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('dashboard.recentNotes')}</h3>
          {notes && notes.length > 0
            ? (
                <div className="space-y-2">
                  {notes.slice(0, 5).map(note => (
                    <div key={note._id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-600/50 rounded-md transition-colors cursor-pointer">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-white truncate">
                          {note.title || t('common.untitled')}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {note.content.replace(/<[^>]*>/g, '').substring(0, 100) || t('notes.noContent')}
                        </p>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 ml-4">
                        {new Date(note._creationTime).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )
            : (
                <p className="text-gray-600 dark:text-gray-400">{t('notes.noNotes')}</p>
              )}
        </div>

        <div className="bg-component dark:bg-component-dark p-6 rounded-lg shadow-sm border border-border dark:border-border-dark">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('dashboard.recentSnippets')}</h3>
          {snippets && snippets.length > 0
            ? (
                <div className="space-y-2">
                  {snippets.slice(0, 5).map(snippet => (
                    <div key={snippet._id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-600/50 rounded-md transition-colors cursor-pointer">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-white truncate">
                          {snippet.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          {snippet.language && (
                            <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                              {snippet.language}
                            </span>
                          )}
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {snippet.category}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 ml-4">
                        {new Date(snippet._creationTime).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )
            : (
                <p className="text-gray-600 dark:text-gray-400">{t('snippets.noSnippets')}</p>
              )}
        </div>

        <div className="bg-component dark:bg-component-dark p-6 rounded-lg shadow-sm border border-border dark:border-border-dark">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('dashboard.recentTodos')}</h3>
          {todos && (todos.todo.length > 0 || todos.inProgress.length > 0)
            ? (
                <div className="space-y-2">
                  {[...todos.todo, ...todos.inProgress]
                    .sort((a, b) => b._creationTime - a._creationTime)
                    .slice(0, 5)
                    .map(todo => (
                      <div key={todo._id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-600/50 rounded-md transition-colors cursor-pointer">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${todo.status === 'todo'
                              ? 'bg-blue-500'
                              : todo.status === 'in_progress' ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            />
                            <h4 className="font-medium text-gray-900 dark:text-white truncate">
                              {todo.title}
                            </h4>
                          </div>
                          {todo.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                              {todo.description}
                            </p>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 ml-4">
                          {new Date(todo._creationTime).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                </div>
              )
            : (
                <p className="text-gray-600 dark:text-gray-400">{t('todos.noTodos')}</p>
              )}
        </div>
      </div>
    </div>
  )
}
