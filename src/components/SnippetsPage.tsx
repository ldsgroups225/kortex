import type { OfflineSnippet } from '../lib/useOfflineSnippets'
import type { FilterConfig } from './FilterBar'
import {
  ClockIcon,
  PlusIcon,
  StarIcon,
  TagIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { useQuery } from 'convex/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { api } from '../../convex/_generated/api'
import { useOfflineSnippets } from '../lib/useOfflineSnippets'
import { CopyButton } from './CopyButton'
import { FilterBar } from './FilterBar'
import { SearchBar } from './SearchBar'
import { TwoColumnLayout } from './TwoColumnLayout'

const LANGUAGES = [
  {
    value: 'javascript',
    label: 'JavaScript',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  },
  // ... (rest of the languages array)
]

const DEFAULT_CATEGORIES = ['General', 'Code', 'Prompts', 'Templates', 'Commands']

export function SnippetsPage() {
  const { t } = useTranslation()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [activeFilters, setActiveFilters] = useState<Record<string, string | string[]>>({
    language: '',
    category: '',
    pinned: '',
  })
  const [pendingChanges, setPendingChanges] = useState<{
    title?: string
    content?: string
    language?: string
    category?: string
  }>({})

  const loggedInUser = useQuery(api.auth.loggedInUser)
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
  } = useOfflineSnippets(loggedInUser?._id || null)

  const saveChanges = useCallback(async () => {
    if (!selectedSnippet || Object.keys(pendingChanges).length === 0)
      return
    try {
      await updateSnippet(selectedSnippet._id, pendingChanges)
      setPendingChanges({})
    }
    catch (error) {
      console.error('Failed to save changes:', error)
      toast.error(t('toasts.operationError'))
    }
  }, [selectedSnippet, pendingChanges, updateSnippet, t])

  const saveChangesRef = useRef(saveChanges)
  saveChangesRef.current = saveChanges

  useEffect(() => {
    const timer = setTimeout(() => saveChangesRef.current(), 2000)
    return () => clearTimeout(timer)
  }, [pendingChanges])

  const userCategories = getUserCategories()
  const allCategories = [...new Set([...DEFAULT_CATEGORIES, ...userCategories])].sort()

  const filteredSnippets = useMemo(() => {
    let filtered = snippets || []
    if (activeFilters.language) {
      filtered = filtered.filter(s => s.language === activeFilters.language)
    }
    if (activeFilters.category) {
      filtered = filtered.filter(s => s.category === activeFilters.category)
    }
    if (activeFilters.pinned === 'pinned') {
      filtered = filtered.filter(s => s.pinned)
    }
    else if (activeFilters.pinned === 'unpinned') {
      filtered = filtered.filter(s => !s.pinned)
    }
    return filtered
  }, [snippets, activeFilters])

  const filterConfigs: FilterConfig[] = [
    {
      key: 'language',
      label: t('common.language'),
      options: [{ value: '', label: t('common.all') }, ...LANGUAGES.map(l => ({ value: l.value, label: l.label }))],
    },
    {
      key: 'category',
      label: t('common.category'),
      options: [{ value: '', label: t('common.all') }, ...allCategories.map(c => ({ value: c, label: c }))],
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
    setActiveFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearAllFilters = () => {
    setActiveFilters({ language: '', category: '', pinned: '' })
    searchSnippets('')
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
    }
    catch (error) {
      console.error('Failed to create snippet:', error)
    }
  }

  const handleDeleteSnippet = async (snippetId: string) => {
    try {
      await deleteSnippet(snippetId)
      setShowDeleteConfirm(null)
    }
    catch (error) {
      console.error('Failed to delete snippet:', error)
    }
  }

  const handleTogglePin = async (snippetId: string) => {
    try {
      await togglePin(snippetId)
    }
    catch (error) {
      console.error('Failed to toggle pin:', error)
    }
  }

  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const getLanguageStyle = (language?: string) => {
    const lang = LANGUAGES.find(l => l.value === language)
    return lang ? lang.color : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  }

  const selectedSnippetData = useMemo(
    () => (selectedSnippet ? { ...selectedSnippet, ...pendingChanges } : null),
    [selectedSnippet, pendingChanges],
  )

  const sidebarContent = (
    <SidebarContent
      filteredSnippets={filteredSnippets}
      handleCreateSnippet={handleCreateSnippet}
      searchSnippets={searchSnippets}
      t={t}
      filterConfigs={filterConfigs}
      activeFilters={activeFilters}
      handleFilterChange={handleFilterChange}
      clearAllFilters={clearAllFilters}
      selectSnippet={selectSnippet}
      setSidebarOpen={() => {}}
      selectedSnippet={selectedSnippet?._id}
      getLanguageStyle={getLanguageStyle}
    />
  )

  const mainContent = (
    <MainContent
      selectedSnippetData={selectedSnippetData}
      getLanguageStyle={getLanguageStyle}
      formatDate={formatDate}
      handleTogglePin={handleTogglePin}
      setShowDeleteConfirm={setShowDeleteConfirm}
      allCategories={allCategories}
      setPendingChanges={setPendingChanges}
    />
  )

  return (
    <>
      <TwoColumnLayout
        sidebarContent={sidebarContent}
        mainContent={mainContent}
        pageTitle="Snippets"
      />
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Delete Snippet</h3>
            <p className="mb-6">Are you sure you want to delete this snippet?</p>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowDeleteConfirm(null)} className="px-4 py-2 rounded-lg">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteSnippet(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function SidebarContent({
  filteredSnippets,
  handleCreateSnippet,
  searchSnippets,
  t,
  filterConfigs,
  activeFilters,
  handleFilterChange,
  clearAllFilters,
  selectSnippet,
  setSidebarOpen,
  selectedSnippet,
  getLanguageStyle,
}: {
  filteredSnippets: OfflineSnippet[]
  handleCreateSnippet: () => Promise<void>
  searchSnippets: (query: string) => void
  t: (key: string, options?: Record<string, unknown>) => string
  filterConfigs: FilterConfig[]
  activeFilters: Record<string, string | string[]>
  handleFilterChange: (key: string, value: string | string[]) => void
  clearAllFilters: () => void
  selectSnippet: (snippetId: string | null) => void
  setSidebarOpen: (open: boolean) => void
  selectedSnippet: string | undefined
  getLanguageStyle: (language?: string) => string
}) {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold">Snippets</h2>
        <p className="text-sm text-gray-500">
          {filteredSnippets?.length || 0}
          {' '}
          snippets
        </p>
      </div>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={handleCreateSnippet}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          <PlusIcon className="h-5 w-5" />
          Create Snippet
        </button>
      </div>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-4">
        <SearchBar value="" onChange={searchSnippets} placeholder={t('snippets.searchSnippets')} />
        <FilterBar
          filters={filterConfigs}
          activeFilters={activeFilters}
          onFilterChange={handleFilterChange}
          onClearAll={clearAllFilters}
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {filteredSnippets?.length === 0
          ? (
              <div className="p-6 text-center">
                <h3 className="text-lg font-medium">No snippets found</h3>
                <p className="text-sm text-gray-500">Try adjusting your filters or creating a new snippet.</p>
              </div>
            )
          : (
              <div className="space-y-2 p-2">
                {filteredSnippets?.map((snippet: OfflineSnippet) => (
                  <div
                    key={snippet._id}
                    onClick={() => {
                      selectSnippet(snippet._id)
                      if (setSidebarOpen)
                        setSidebarOpen(false)
                    }}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedSnippet === snippet._id
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <h4 className="font-medium truncate">{snippet.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-1 rounded-full ${getLanguageStyle(snippet.language)}`}>
                        {LANGUAGES.find(l => l.value === snippet.language)?.label || snippet.language}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <TagIcon className="h-3 w-3" />
                        {snippet.category}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
      </div>
    </div>
  )
}

function MainContent({
  selectedSnippetData,
  getLanguageStyle,
  formatDate,
  handleTogglePin,
  setShowDeleteConfirm,
  allCategories,
  setPendingChanges,
}: {
  selectedSnippetData: OfflineSnippet | null
  getLanguageStyle: (language?: string) => string
  formatDate: (timestamp: number) => string
  handleTogglePin: (snippetId: string) => Promise<void>
  setShowDeleteConfirm: (snippetId: string | null) => void
  allCategories: string[]
  setPendingChanges: (changes: (prev: Partial<OfflineSnippet>) => Partial<OfflineSnippet>) => void
}) {
  if (!selectedSnippetData) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <h3 className="text-xl font-medium">Select a snippet</h3>
          <p className="text-gray-500">Choose a snippet from the list to view its details.</p>
        </div>
      </div>
    )
  }
  return (
    <div className="flex-1 flex flex-col h-full min-w-0">
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <input
              type="text"
              value={selectedSnippetData.title}
              onChange={e => setPendingChanges((p: Partial<OfflineSnippet>) => ({ ...p, title: e.target.value }))}
              className="text-xl font-semibold bg-transparent w-full focus:outline-none"
              placeholder="Snippet title"
            />
            <div className="flex items-center gap-2 flex-wrap mt-2">
              <select
                value={selectedSnippetData.language}
                onChange={e => setPendingChanges((p: Partial<OfflineSnippet>) => ({ ...p, language: e.target.value }))}
                className={`text-sm px-3 py-1 rounded-full focus:outline-none appearance-none ${getLanguageStyle(
                  selectedSnippetData.language,
                )}`}
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
              <select
                value={selectedSnippetData.category}
                onChange={e => setPendingChanges((p: Partial<OfflineSnippet>) => ({ ...p, category: e.target.value }))}
                className="text-sm px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center gap-1 focus:outline-none appearance-none"
              >
                {allCategories.map((cat: string) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <span className="text-sm text-gray-500 flex items-center gap-1">
                <ClockIcon className="h-4 w-4" />
                {formatDate(selectedSnippetData.updatedAt)}
              </span>
            </div>
          </div>
          <div className="p-6">
            <textarea
              value={selectedSnippetData.content}
              onChange={e => setPendingChanges((p: Partial<OfflineSnippet>) => ({ ...p, content: e.target.value }))}
              placeholder="Snippet content..."
              rows={15}
              className="w-full p-2 border rounded font-mono text-sm bg-gray-900 text-gray-100"
            />
          </div>
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex items-center justify-between">
            <CopyButton content={selectedSnippetData.content} />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleTogglePin(selectedSnippetData._id)}
                className="p-2 text-gray-400 hover:text-yellow-500"
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
                onClick={() => setShowDeleteConfirm(selectedSnippetData._id)}
                className="p-2 text-gray-400 hover:text-red-500"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
