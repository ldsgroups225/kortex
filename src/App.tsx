import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { NotesPage } from "./components/NotesPage";
import { SnippetsPage } from "./components/SnippetsPage";
import { TodosPage } from "./components/TodosPage";
import { SettingsPage } from "./components/SettingsPage";
import { AdminDashboard } from "./components/AdminDashboard";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { KeyboardShortcuts } from "./components/KeyboardShortcuts";
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  HomeIcon,
  DocumentTextIcon,
  CodeBracketIcon,
  CheckCircleIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  Bars3Icon,
  XMarkIcon,
  SunIcon,
  MoonIcon
} from "@heroicons/react/24/outline";

type Route = 'dashboard' | 'notes' | 'snippets' | 'todos' | 'settings' | 'admin';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<Route>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const userPreferences = useQuery(api.userPreferences.getUserPreferences);

  useEffect(() => {
    if (userPreferences) {
      const { theme } = userPreferences;
      let shouldUseDark = false;

      if (theme === 'system') {
        shouldUseDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      } else {
        shouldUseDark = theme === 'dark';
      }

      setDarkMode(shouldUseDark);
      document.documentElement.classList.toggle('dark', shouldUseDark);
    } else {
      // Fallback to localStorage for unauthenticated users
      const savedTheme = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldUseDark = savedTheme === 'dark' || (!savedTheme && prefersDark);

      setDarkMode(shouldUseDark);
      document.documentElement.classList.toggle('dark', shouldUseDark);
    }
  }, [userPreferences]);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('theme', newDarkMode ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', newDarkMode);
  };

  // Keyboard shortcuts refs
  const searchRef = useRef<HTMLInputElement>(null);

  const handleCopyLastSelected = () => {
    // This would copy the last selected note/snippet/todo
    // Implementation depends on the current route and selected item
    console.log('Copy last selected item');
  };

  const handleCreateNote = () => {
    if (currentRoute === 'notes') {
      // Trigger note creation
      console.log('Create new note');
    }
  };

  const handleFocusSearch = () => {
    if (searchRef.current) {
      searchRef.current.focus();
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors`}>
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
      </Authenticated>

      <Unauthenticated>
        <UnauthenticatedApp darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
      </Unauthenticated>
    </div>
  );
}

function AuthenticatedApp({
  currentRoute,
  setCurrentRoute,
  sidebarOpen,
  setSidebarOpen,
  darkMode,
  toggleDarkMode,
  searchRef
}: {
  currentRoute: Route;
  setCurrentRoute: (route: Route) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  searchRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const { t } = useTranslation();

  const navigation = [
    { name: t('navigation.dashboard'), route: 'dashboard' as Route, icon: HomeIcon },
    { name: t('navigation.notes'), route: 'notes' as Route, icon: DocumentTextIcon },
    { name: t('navigation.snippets'), route: 'snippets' as Route, icon: CodeBracketIcon },
    { name: t('navigation.todos'), route: 'todos' as Route, icon: CheckCircleIcon },
    { name: t('navigation.settings'), route: 'settings' as Route, icon: Cog6ToothIcon },
    ...(loggedInUser ? [{ name: 'Admin', route: 'admin' as Route, icon: ShieldCheckIcon }] : []),
  ];

  // For notes page, we want full height layout
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

        {/* Sidebar */}
        <div className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">NotesApp</h1>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-2">
              {navigation.map((item) => (
                <button
                  key={item.name}
                  onClick={() => {
                    setCurrentRoute(item.route);
                    setSidebarOpen(false);
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

            {/* User info and controls */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
              <button
                onClick={toggleDarkMode}
                className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {darkMode ? (
                  <SunIcon className="h-5 w-5 mr-3" />
                ) : (
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
        </div>

        {/* Main content for notes */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top bar for mobile */}
          <header className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16 flex items-center justify-between px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>

            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Notes
            </h2>

            <div className="w-10" /> {/* Spacer */}
          </header>

          {/* Notes page content */}
          <div className="flex-1 overflow-hidden">
            <NotesPage />
          </div>
        </div>
      </div>
    );
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
        fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">NotesApp</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => (
              <button
                key={item.name}
                onClick={() => {
                  setCurrentRoute(item.route);
                  setSidebarOpen(false);
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

          {/* User info and controls */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
            <button
              onClick={toggleDarkMode}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {darkMode ? (
                <SunIcon className="h-5 w-5 mr-3" />
              ) : (
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
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16 flex items-center justify-between px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          <div className="flex-1 lg:ml-0">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
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
  );
}

function UnauthenticatedApp({ darkMode, toggleDarkMode }: { darkMode: boolean; toggleDarkMode: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">NotesApp</h1>
          <div className="flex items-center space-x-4">
            <LanguageSwitcher />
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {darkMode ? (
                <SunIcon className="h-5 w-5" />
              ) : (
                <MoonIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t('dashboard.welcome')}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {t('dashboard.welcome')}
            </p>
          </div>
          <SignInForm />
        </div>
      </main>
    </div>
  );
}

function RouteContent({ route }: { route: Route }) {
  switch (route) {
    case 'dashboard':
      return <DashboardPage />;
    case 'notes':
      return <NotesPage />;
    case 'snippets':
      return <SnippetsPage />;
    case 'todos':
      return <TodosPage />;
    case 'settings':
      return <SettingsPage />;
    case 'admin':
      return <AdminDashboard />;
    default:
      return <DashboardPage />;
  }
}

function DashboardPage() {
  const { t } = useTranslation();
  const notes = useQuery(api.notes.getUserNotes);
  const snippets = useQuery(api.snippets.getUserSnippets, {});
  const todos = useQuery(api.todos.getTodos);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <DocumentTextIcon className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('navigation.notes')}</h3>
              <p className="text-gray-600 dark:text-gray-400">{notes?.length || 0} {t('navigation.notes').toLowerCase()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <CodeBracketIcon className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('navigation.snippets')}</h3>
              <p className="text-gray-600 dark:text-gray-400">{snippets?.length || 0} {t('navigation.snippets').toLowerCase()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <CheckCircleIcon className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('navigation.todos')}</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {todos ? (todos.todo.length + todos.inProgress.length + todos.done.length) : 0} {t('navigation.todos').toLowerCase()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('dashboard.recentNotes')}</h3>
          {notes && notes.length > 0 ? (
            <div className="space-y-3">
              {notes.slice(0, 5).map((note) => (
                <div key={note._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
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
          ) : (
            <p className="text-gray-600 dark:text-gray-400">{t('notes.noNotes')}</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('dashboard.recentSnippets')}</h3>
          {snippets && snippets.length > 0 ? (
            <div className="space-y-3">
              {snippets.slice(0, 5).map((snippet) => (
                <div key={snippet._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
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
          ) : (
            <p className="text-gray-600 dark:text-gray-400">{t('snippets.noSnippets')}</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('dashboard.recentTodos')}</h3>
          {todos && (todos.todo.length > 0 || todos.inProgress.length > 0) ? (
            <div className="space-y-3">
              {[...todos.todo, ...todos.inProgress]
                .sort((a, b) => b._creationTime - a._creationTime)
                .slice(0, 5)
                .map((todo) => (
                  <div key={todo._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${todo.status === 'todo' ? 'bg-blue-500' :
                          todo.status === 'in_progress' ? 'bg-yellow-500' : 'bg-green-500'
                          }`} />
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
          ) : (
            <p className="text-gray-600 dark:text-gray-400">{t('todos.noTodos')}</p>
          )}
        </div>
      </div>
    </div>
  );
}




