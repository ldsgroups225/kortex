import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { NotesPage } from "./components/NotesPage";
import { SnippetsPage } from "./components/SnippetsPage";
import { useState, useEffect } from "react";
import { 
  HomeIcon, 
  DocumentTextIcon, 
  CodeBracketIcon, 
  CheckCircleIcon, 
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
  SunIcon,
  MoonIcon
} from "@heroicons/react/24/outline";

type Route = 'dashboard' | 'notes' | 'snippets' | 'todos' | 'settings';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<Route>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    setDarkMode(shouldUseDark);
    document.documentElement.classList.toggle('dark', shouldUseDark);
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('theme', newDarkMode ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', newDarkMode);
  };

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors`}>
      <Authenticated>
        <AuthenticatedApp 
          currentRoute={currentRoute}
          setCurrentRoute={setCurrentRoute}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
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
  toggleDarkMode 
}: {
  currentRoute: Route;
  setCurrentRoute: (route: Route) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}) {
  const loggedInUser = useQuery(api.auth.loggedInUser);

  const navigation = [
    { name: 'Dashboard', route: 'dashboard' as Route, icon: HomeIcon },
    { name: 'Notes', route: 'notes' as Route, icon: DocumentTextIcon },
    { name: 'Snippets', route: 'snippets' as Route, icon: CodeBracketIcon },
    { name: 'Todos', route: 'todos' as Route, icon: CheckCircleIcon },
    { name: 'Settings', route: 'settings' as Route, icon: Cog6ToothIcon },
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
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">NotesApp</h1>
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
      </header>
      
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Welcome to NotesApp
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Organize your notes, snippets, and todos in one place
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
    default:
      return <DashboardPage />;
  }
}

function DashboardPage() {
  const notes = useQuery(api.notes.getUserNotes);
  const snippets = useQuery(api.snippets.getUserSnippets, {});
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <DocumentTextIcon className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notes</h3>
              <p className="text-gray-600 dark:text-gray-400">{notes?.length || 0} notes</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <CodeBracketIcon className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Snippets</h3>
              <p className="text-gray-600 dark:text-gray-400">{snippets?.length || 0} snippets</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <CheckCircleIcon className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Todos</h3>
              <p className="text-gray-600 dark:text-gray-400">0 todos</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Notes</h3>
          {notes && notes.length > 0 ? (
            <div className="space-y-3">
              {notes.slice(0, 5).map((note) => (
                <div key={note._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-white truncate">
                      {note.title || 'Untitled Note'}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {note.content.replace(/<[^>]*>/g, '').substring(0, 100) || 'No content'}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 ml-4">
                    {new Date(note._creationTime).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">No notes yet</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Snippets</h3>
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
            <p className="text-gray-600 dark:text-gray-400">No snippets yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

function TodosPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Todo List</h3>
        <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
          New Todo
        </button>
      </div>
      
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-center">
        <CheckCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No todos yet</h3>
        <p className="text-gray-600 dark:text-gray-400">Add your first todo to stay organized</p>
      </div>
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Settings</h3>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Account Settings</h4>
        <p className="text-gray-600 dark:text-gray-400">Account settings will be available here</p>
      </div>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Preferences</h4>
        <p className="text-gray-600 dark:text-gray-400">App preferences will be available here</p>
      </div>
    </div>
  );
}
