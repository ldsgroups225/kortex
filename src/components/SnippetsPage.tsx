import type { FilterConfig } from './FilterBar'
import {
  ArrowLeftIcon,
  Bars3Icon,
  ClockIcon,
  PencilIcon,
  PlusIcon,
  StarIcon,
  TagIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { useQuery } from 'convex/react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../../convex/_generated/api'
import { useOfflineSnippets } from '../lib/useOfflineSnippets'
import { CopyButton } from './CopyButton'
import { FilterBar } from './FilterBar'
import { SearchBar } from './SearchBar'

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  { value: 'typescript', label: 'TypeScript', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  { value: 'python', label: 'Python', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  { value: 'java', label: 'Java', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  { value: 'css', label: 'CSS', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  { value: 'html', label: 'HTML', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  { value: 'sql', label: 'SQL', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' },
  { value: 'bash', label: 'Bash', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
  { value: 'json', label: 'JSON', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200' },
  { value: 'markdown', label: 'Markdown', color: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200' },
  { value: 'text', label: 'Text', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
]

const DEFAULT_CATEGORIES = ['General', 'Code', 'Prompts', 'Templates', 'Commands']

interface SnippetsPageProps {
  sidebarOpen?: boolean
  setSidebarOpen?: () => void
}

export function SnippetsPage({ setSidebarOpen: setAppSidebarOpen }: SnippetsPageProps = {}) {
  const { t } = useTranslation()
  const [showEditor, setShowEditor] = useState(false)
  const [editingSnippetId, setEditingSnippetId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [snippetsSidebarOpen, setSnippetsSidebarOpen] = useState(false)
  const [activeFilters, setActiveFilters] = useState<Record<string, string | string[]>>({
    language: '',
    category: '',
    pinned: '',
  })

  // Get current user
  const loggedInUser = useQuery(api.auth.loggedInUser)

  // Use offline snippets hook
  const {
    snippets,
    selectedSnippet,
    createSnippet,
    updateSnippet,
    deleteSnippet,
    togglePin,
    selectSnippet,
    searchSnippets,
    getUserCategories,
    getUserLanguages: _getUserLanguages,
    syncStatus: _syncStatus,
  } = useOfflineSnippets(loggedInUser?._id || null)

  // Get categories from offline hook
  const userCategories = getUserCategories()
  const allCategories = [...new Set([...DEFAULT_CATEGORIES, ...userCategories])].sort()

  // Filter logic - snippets already includes search results
  const getFilteredSnippets = () => {
    let filteredSnippets = snippets

    if (!filteredSnippets)
      return []

    // Apply filters
    if (activeFilters.language) {
      filteredSnippets = filteredSnippets.filter(snippet => snippet.language === activeFilters.language)
    }

    if (activeFilters.category) {
      filteredSnippets = filteredSnippets.filter(snippet => snippet.category === activeFilters.category)
    }

    if (activeFilters.pinned === 'pinned') {
      filteredSnippets = filteredSnippets.filter(snippet => snippet.pinned)
    }
    else if (activeFilters.pinned === 'unpinned') {
      filteredSnippets = filteredSnippets.filter(snippet => !snippet.pinned)
    }

    return filteredSnippets
  }

  const displayedSnippets = getFilteredSnippets()

  // Filter configurations
  const filterConfigs: FilterConfig[] = [
    {
      key: 'language',
      label: t('common.language'),
      options: [
        { value: '', label: t('common.all') },
        ...LANGUAGES.map(lang => ({ value: lang.value, label: lang.label })),
      ],
    },
    {
      key: 'category',
      label: t('common.category'),
      options: [
        { value: '', label: t('common.all') },
        ...allCategories.map(cat => ({ value: cat, label: cat })),
      ],
    },
    {
      key: 'pinned',
      label: t('common.pin'),
      options: [
        { value: '', label: t('common.all') },
        { value: 'pinned', label: t('common.pinned') },
        { value: 'unpinned', label: t('common.unpinned') },
      ],
    },
  ]

  const handleFilterChange = (key: string, value: string | string[]) => {
    setActiveFilters(prev => ({
      ...prev,
      [key]: value,
    }))
  }

  const clearAllFilters = () => {
    setActiveFilters({
      language: '',
      category: '',
      pinned: '',
    })
    searchSnippets('')
  }

  const getLanguageStyle = (language?: string) => {
    const lang = LANGUAGES.find(l => l.value === language)
    return lang ? lang.color : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  }

  const handleCreateSnippet = async () => {
    try {
      const snippetId = await createSnippet({
        title: 'Untitled Snippet',
        content: '',
        language: 'javascript',
        category: 'General',
      })
      selectSnippet(snippetId)
      setSnippetsSidebarOpen(false)
    }
    catch (error) {
      console.error('Failed to create snippet:', error)
    }
  }

  const handleEditSnippet = (snippetId: string) => {
    setEditingSnippetId(snippetId)
    setShowEditor(true)
  }

  const handleDeleteSnippet = async (snippetId: string) => {
    try {
      await deleteSnippet(snippetId)
      setShowDeleteConfirm(null)
      // Toast is handled by the offline hook
    }
    catch (error) {
      console.error('Failed to delete snippet:', error)
    }
  }

  const handleTogglePin = async (snippetId: string) => {
    try {
      await togglePin(snippetId)
      // Toast is handled by the offline hook
    }
    catch (error) {
      console.error('Failed to toggle pin:', error)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Mobile-responsive handlers
  const handleSnippetSelect = (snippetId: string) => {
    selectSnippet(snippetId)
  }

  const handleBackToList = () => {
    selectSnippet(null)
  }

  const isMobileView = selectedSnippet !== null || showEditor
  const selectedSnippetData = selectedSnippet
    ? displayedSnippets?.find(s => s._id === selectedSnippet)
    : null

  return (
    <div className="h-full flex flex-col lg:flex-row">
      {/* Mobile Sidebar Overlay */}
      {snippetsSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSnippetsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:w-80 lg:flex-shrink-0
          ${snippetsSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Snippets</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {displayedSnippets?.length || 0}
                {' '}
                snippets
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSnippetsSidebarOpen(false)}
              className="lg:hidden p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Create Button */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleCreateSnippet}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 font-medium"
              data-onboarding="create-snippet-button"
            >
              <PlusIcon className="h-5 w-5" />
              Create Snippet
            </button>
          </div>

          {/* Search and Filters */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-4">
            <SearchBar
              value=""
              onChange={searchSnippets}
              placeholder={t('snippets.searchSnippets')}
              className="w-full"
            />

            <FilterBar
              filters={filterConfigs}
              activeFilters={activeFilters}
              onFilterChange={handleFilterChange}
              onClearAll={clearAllFilters}
              className="w-full"
            />
          </div>

          {/* Snippets List */}
          <div className="flex-1 overflow-y-auto">
            {displayedSnippets?.length === 0
              ? (
                  <div className="p-6 text-center">
                    <div className="text-4xl mb-4">📦</div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      'No snippets yet'
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      'Save your first code snippet, prompt, or template to get started'
                    </p>
                    <button
                      type="button"
                      onClick={handleCreateSnippet}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                    >
                      Create First Snippet
                    </button>
                  </div>
                )
              : (
                  <div className="space-y-2 p-2">
                    {displayedSnippets?.map(snippet => (
                      <div
                        key={snippet._id}
                        onClick={() => handleSnippetSelect(snippet._id)}
                        className={`
                      p-3 rounded-lg border cursor-pointer transition-colors
                      ${selectedSnippet === snippet._id
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }
                    `}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 dark:text-white truncate">
                              {snippet.title}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              {snippet.language && (
                                <span className={`text-xs px-2 py-1 rounded-full ${getLanguageStyle(snippet.language)}`}>
                                  {LANGUAGES.find(l => l.value === snippet.language)?.label || snippet.language}
                                </span>
                              )}
                              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <TagIcon className="h-3 w-3" />
                                {snippet.category}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                              {snippet.content.substring(0, 100)}
                              {snippet.content.length > 100 ? '...' : ''}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-2">
                              <ClockIcon className="h-3 w-3" />
                              {formatDate(snippet.updatedAt)}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {snippet.pinned && (
                              <StarIconSolid className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full min-w-0">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isMobileView
              ? (
                  <button
                    type="button"
                    onClick={handleBackToList}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <ArrowLeftIcon className="h-5 w-5" />
                  </button>
                )
              : (
                  <button
                    type="button"
                    onClick={() => setSnippetsSidebarOpen(true)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Bars3Icon className="h-5 w-5" />
                  </button>
                )}
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isMobileView && selectedSnippetData ? selectedSnippetData.title : 'Snippets'}
            </h1>
          </div>
          {setAppSidebarOpen && (
            <button
              type="button"
              onClick={setAppSidebarOpen}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Bars3Icon className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {/* Mobile: Show snippet detail or editor */}
          <div className="lg:hidden h-full">
            {showEditor
              ? (
                  <div className="h-full">
                    <SnippetEditor
                      snippet={editingSnippetId ? snippets.find(s => s._id === editingSnippetId) : null}
                      categories={allCategories}
                      onSave={async (data) => {
                        try {
                          if (editingSnippetId) {
                            await updateSnippet(editingSnippetId, data)
                            // Toast is handled by the offline hook
                          }
                          else {
                            await createSnippet(data)
                            // Toast is handled by the offline hook
                          }
                          setShowEditor(false)
                          setEditingSnippetId(null)
                          selectSnippet(null)
                        }
                        catch (error) {
                          console.error('Failed to save snippet:', error)
                        }
                      }}
                      onCancel={() => {
                        setShowEditor(false)
                        setEditingSnippetId(null)
                        selectSnippet(null)
                      }}
                    />
                  </div>
                )
              : selectedSnippet && selectedSnippetData
                ? (
                    <div className="h-full overflow-y-auto p-4">
                      {/* Snippet Detail View */}
                      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                {selectedSnippetData.title}
                              </h2>
                              <div className="flex items-center gap-2 flex-wrap">
                                {selectedSnippetData.language && (
                                  <span className={`text-sm px-3 py-1 rounded-full ${getLanguageStyle(selectedSnippetData.language)}`}>
                                    {LANGUAGES.find(l => l.value === selectedSnippetData.language)?.label || selectedSnippetData.language}
                                  </span>
                                )}
                                <span className="text-sm px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                  <TagIcon className="h-4 w-4" />
                                  {selectedSnippetData.category}
                                </span>
                                <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                  <ClockIcon className="h-4 w-4" />
                                  {formatDate(selectedSnippetData.updatedAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                          <pre className="bg-gray-900 text-gray-100 font-mono text-sm p-4 rounded-lg overflow-x-auto whitespace-pre-wrap break-all">
                            <code>{selectedSnippetData.content}</code>
                          </pre>
                        </div>

                        {/* Actions */}
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex items-center justify-between">
                          <CopyButton
                            content={selectedSnippetData.content}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                          >
                            Copy to Clipboard
                          </CopyButton>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void handleTogglePin(selectedSnippetData._id)}
                              className="p-2 text-gray-400 hover:text-yellow-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                              title={selectedSnippetData.pinned ? 'Unpin' : 'Pin'}
                            >
                              {selectedSnippetData.pinned
                                ? (
                                    <StarIconSolid className="h-5 w-5 text-yellow-500" />
                                  )
                                : (
                                    <StarIcon className="h-5 w-5" />
                                  )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditSnippet(selectedSnippetData._id)}
                              className="p-2 text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowDeleteConfirm(selectedSnippetData._id)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                : (
                    <div className="h-full flex items-center justify-center p-6">
                      <div className="text-center max-w-md">
                        <div className="text-6xl mb-4">📦</div>
                        <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                          Select a snippet
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                          Choose a snippet from the sidebar to view its details, or create a new one.
                        </p>
                        <button
                          type="button"
                          onClick={() => setSnippetsSidebarOpen(true)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                        >
                          Browse Snippets
                        </button>
                      </div>
                    </div>
                  )}
          </div>

          {/* Desktop: Show grid view */}
          <div className="hidden lg:block h-full overflow-y-auto">
            <div className="p-6">
              {/* Desktop Header */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Snippets</h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    {displayedSnippets?.length || 0}
                    {' '}
                    snippets
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCreateSnippet}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-medium"
                >
                  <PlusIcon className="h-5 w-5" />
                  Create Snippet
                </button>
              </div>

              {/* Desktop Content */}
              {displayedSnippets?.length === 0
                ? (
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-center">
                      <div className="text-6xl mb-4">📦</div>
                      <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                        No snippets yet
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                        Save your first code snippet, prompt, or template to get started
                      </p>
                      <button
                        type="button"
                        onClick={handleCreateSnippet}
                        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        Create First Snippet
                      </button>
                    </div>
                  )
                : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6" data-onboarding="snippets-grid">
                      {displayedSnippets?.map((snippet, index) => (
                        <div
                          key={snippet._id}
                          style={{ animationDelay: `${index * 50}ms` }}
                          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 group animate-slide-in-from-bottom overflow-hidden"
                        >
                          {/* Header */}
                          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-start gap-2">
                              <h3 className="font-semibold text-gray-900 dark:text-white truncate flex-1">
                                {snippet.title}
                              </h3>
                              <div className="flex items-center gap-1">
                                {snippet.pinned && (
                                  <StarIconSolid className="h-4 w-4 text-yellow-500" />
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              {snippet.language && (
                                <span className={`text-xs px-2 py-1 rounded-full ${getLanguageStyle(snippet.language)}`}>
                                  {LANGUAGES.find(l => l.value === snippet.language)?.label || snippet.language}
                                </span>
                              )}
                              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                <TagIcon className="h-3 w-3" />
                                {snippet.category}
                              </span>
                            </div>
                          </div>

                          {/* Code Preview */}
                          <div className="p-4">
                            <pre className="bg-gray-900 text-gray-100 font-mono text-sm p-3 rounded-md max-h-48 overflow-auto">
                              <code>
                                {snippet.content.length > 200
                                  ? `${snippet.content.substring(0, 200)}...`
                                  : snippet.content}
                              </code>
                            </pre>
                          </div>

                          {/* Footer */}
                          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex items-center justify-between">
                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                              <ClockIcon className="h-3 w-3" />
                              {formatDate(snippet.updatedAt)}
                            </div>
                            <div className="flex items-center gap-1">
                              <CopyButton
                                content={snippet.content}
                                variant="icon"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 transition-opacity bg-transparent hover:bg-gray-200 dark:hover:bg-gray-600 p-2 rounded"
                                title="Copy to clipboard"
                              />
                              <button
                                type="button"
                                onClick={() => void handleTogglePin(snippet._id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity bg-transparent hover:bg-gray-200 dark:hover:bg-gray-600 p-2 rounded"
                                title={snippet.pinned ? 'Unpin' : 'Pin'}
                              >
                                {snippet.pinned
                                  ? (
                                      <StarIconSolid className="h-4 w-4 text-yellow-500" />
                                    )
                                  : (
                                      <StarIcon className="h-4 w-4 text-gray-400" />
                                    )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditSnippet(snippet._id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity bg-transparent hover:bg-gray-200 dark:hover:bg-gray-600 p-2 rounded"
                                title="Edit"
                              >
                                <PencilIcon className="h-4 w-4 text-gray-400" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(snippet._id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity bg-transparent hover:bg-gray-200 dark:hover:bg-gray-600 p-2 rounded"
                                title="Delete"
                              >
                                <TrashIcon className="h-4 w-4 text-red-500" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
            </div>
          </div>
        </div>
      </main>

      {/* Desktop Editor Modal */}
      {showEditor && (
        <div className="hidden lg:block">
          <SnippetEditor
            snippet={editingSnippetId ? snippets.find(s => s._id === editingSnippetId) : null}
            categories={allCategories}
            onSave={async (data) => {
              try {
                if (editingSnippetId) {
                  await updateSnippet(editingSnippetId, data)
                  // Toast is handled by the offline hook
                }
                else {
                  await createSnippet(data)
                  // Toast is handled by the offline hook
                }
                setShowEditor(false)
                setEditingSnippetId(null)
              }
              catch (error) {
                console.error('Failed to save snippet:', error)
              }
            }}
            onCancel={() => {
              setShowEditor(false)
              setEditingSnippetId(null)
            }}
          />
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Delete Snippet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this snippet? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleDeleteSnippet(showDeleteConfirm)
                  selectSnippet(null)
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface SnippetEditorProps {
  snippet?: any
  categories: string[]
  onSave: (data: {
    title: string
    content: string
    language?: string
    category: string
  }) => Promise<void>
  onCancel: () => void
}

function SnippetEditor({ snippet, categories, onSave, onCancel }: SnippetEditorProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [language, setLanguage] = useState('')
  const [category, setCategory] = useState('General')
  const [customCategory, setCustomCategory] = useState('')
  const [isCustomCategory, setIsCustomCategory] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Compute form values during render instead of using useEffect
  const formTitle = useMemo(() => snippet?.title || '', [snippet?.title])
  const formContent = useMemo(() => snippet?.content || '', [snippet?.content])
  const formLanguage = useMemo(() => snippet?.language || '', [snippet?.language])
  const formCategory = useMemo(() => snippet?.category || 'General', [snippet?.category])

  // Use computed values directly in the form
  const displayTitle = title || formTitle
  const displayContent = content || formContent
  const displayLanguage = language || formLanguage
  const displayCategory = category || formCategory

  const handleSave = async () => {
    if (!displayTitle.trim() || !displayContent.trim())
      return

    setIsSaving(true)
    try {
      await onSave({
        title: displayTitle.trim(),
        content: displayContent.trim(),
        language: displayLanguage || undefined,
        category: isCustomCategory ? customCategory.trim() : displayCategory,
      })
    }
    finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {snippet ? 'Edit Snippet' : 'Create New Snippet'}
          </h3>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={displayTitle}
              onChange={e => setTitle(e.target.value)}
              placeholder="Enter snippet title..."
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
            />
          </div>

          {/* Language and Category Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Language */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Language
              </label>
              <select
                value={displayLanguage}
                onChange={e => setLanguage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
              >
                <option value="">Select language...</option>
                {LANGUAGES.map(lang => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category *
              </label>
              <div className="space-y-2">
                <select
                  value={isCustomCategory ? '' : displayCategory}
                  onChange={(e) => {
                    if (e.target.value) {
                      setCategory(e.target.value)
                      setIsCustomCategory(false)
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
                >
                  <option value="">Select category...</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="customCategory"
                    checked={isCustomCategory}
                    onChange={e => setIsCustomCategory(e.target.checked)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <label htmlFor="customCategory" className="text-sm text-gray-700 dark:text-gray-300">
                    Create new category
                  </label>
                </div>
                {isCustomCategory && (
                  <input
                    type="text"
                    value={customCategory}
                    onChange={e => setCustomCategory(e.target.value)}
                    placeholder="Enter new category..."
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Content *
            </label>
            <textarea
              value={displayContent}
              onChange={e => setContent(e.target.value)}
              placeholder="Enter your code snippet or prompt..."
              rows={12}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none font-mono text-sm resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!displayTitle.trim() || !displayContent.trim() || isSaving}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Snippet'}
          </button>
        </div>
      </div>
    </div>
  )
}
