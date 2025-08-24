import type { OfflineNote } from '../lib/useOfflineNotes'
import type { FilterConfig } from './FilterBar'
import { ClockIcon, PlusIcon, StarIcon, TrashIcon } from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { useQuery } from 'convex/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { api } from '../../convex/_generated/api'
import { useOfflineNotes } from '../lib/useOfflineNotes'
import { FilterBar } from './FilterBar'
import { RichTextEditor } from './RichTextEditor'
import { SearchBar } from './SearchBar'
import { TagInput } from './TagInput'
import { TwoColumnLayout } from './TwoColumnLayout'

export function NotesPage() {
  const { t } = useTranslation()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [activeFilters, setActiveFilters] = useState<Record<string, string | string[]>>({
    tags: [],
    pinned: '',
  })

  const loggedInUser = useQuery(api.auth.loggedInUser)
  const {
    notes,
    selectedNote,
    createNote,
    updateNote,
    deleteNote,
    togglePin,
    selectNote,
    searchNotes,
    getUserTags,
  } = useOfflineNotes(loggedInUser?._id || null)

  const [pendingChanges, setPendingChanges] = useState<{
    title?: string
    content?: string
    tags?: string[]
  }>({})

  const saveChanges = useCallback(async () => {
    if (!selectedNote || Object.keys(pendingChanges).length === 0)
      return
    try {
      await updateNote(selectedNote._id, pendingChanges)
      setPendingChanges({})
    }
    catch (error) {
      console.error('Failed to save changes:', error)
      toast.error(t('toasts.operationError'))
    }
  }, [selectedNote, pendingChanges, updateNote, t])

  const saveChangesRef = useRef(saveChanges)
  saveChangesRef.current = saveChanges

  useEffect(() => {
    const timer = setTimeout(() => saveChangesRef.current(), 2000)
    return () => clearTimeout(timer)
  }, [pendingChanges])

  const userTags = getUserTags()

  const filteredNotes = useMemo(() => {
    let filtered = notes || []
    if (activeFilters.tags && Array.isArray(activeFilters.tags) && activeFilters.tags.length > 0) {
      filtered = filtered.filter(n => n.tags && (activeFilters.tags as string[]).every((t: string) => n.tags.includes(t)))
    }
    if (activeFilters.pinned === 'pinned') {
      filtered = filtered.filter(n => n.pinned)
    }
    else if (activeFilters.pinned === 'unpinned') {
      filtered = filtered.filter(n => !n.pinned)
    }
    return filtered
  }, [notes, activeFilters])

  const filterConfigs: FilterConfig[] = [
    {
      key: 'tags',
      label: t('common.tags'),
      options: userTags.map(tag => ({ value: tag, label: tag })),
      multiSelect: true,
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
    setActiveFilters({ tags: [], pinned: '' })
    searchNotes('')
  }

  const handleCreateNote = async () => {
    try {
      const noteId = await createNote({ title: 'Untitled Note', content: '', tags: [] })
      selectNote(noteId)
    }
    catch (error) {
      console.error('Failed to create note:', error)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote(noteId)
      setShowDeleteConfirm(null)
    }
    catch (error) {
      console.error('Failed to delete note:', error)
    }
  }

  const handleTogglePin = async (noteId: string) => {
    try {
      await togglePin(noteId)
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

  const sidebarContent = (
    <SidebarContent
      filteredNotes={filteredNotes}
      handleCreateNote={handleCreateNote}
      searchNotes={searchNotes}
      t={t}
      filterConfigs={filterConfigs}
      activeFilters={activeFilters}
      handleFilterChange={handleFilterChange}
      clearAllFilters={clearAllFilters}
      selectNote={selectNote}
      setSidebarOpen={() => {}}
      selectedNote={selectedNote}
      formatDate={formatDate}
    />
  )

  const mainContent = (
    <MainContent
      selectedNote={selectedNote}
      pendingChanges={pendingChanges}
      setPendingChanges={setPendingChanges}
      handleTogglePin={handleTogglePin}
      setShowDeleteConfirm={setShowDeleteConfirm}
      userTags={userTags}
      formatDate={formatDate}
    />
  )

  return (
    <>
      <TwoColumnLayout
        sidebarContent={sidebarContent}
        mainContent={mainContent}
        pageTitle="Notes"
      />
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Delete Note</h3>
            <p className="mb-6">Are you sure you want to delete this note?</p>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowDeleteConfirm(null)} className="px-4 py-2 rounded-lg">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteNote(showDeleteConfirm)}
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
  filteredNotes,
  handleCreateNote,
  searchNotes,
  t,
  filterConfigs,
  activeFilters,
  handleFilterChange,
  clearAllFilters,
  selectNote,
  setSidebarOpen,
  selectedNote,
  formatDate,
}: {
  filteredNotes: OfflineNote[]
  handleCreateNote: () => Promise<void>
  searchNotes: (query: string) => void
  t: (key: string, options?: Record<string, unknown>) => string
  filterConfigs: FilterConfig[]
  activeFilters: Record<string, string | string[]>
  handleFilterChange: (key: string, value: string | string[]) => void
  clearAllFilters: () => void
  selectNote: (noteId: string | null) => void
  setSidebarOpen: (open: boolean) => void
  selectedNote: OfflineNote | null
  formatDate: (timestamp: number) => string
}) {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold">Notes</h2>
        <p className="text-sm text-gray-500">
          {filteredNotes?.length || 0}
          {' '}
          notes
        </p>
      </div>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={handleCreateNote}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <PlusIcon className="h-5 w-5" />
          Create Note
        </button>
      </div>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-4">
        <SearchBar value="" onChange={searchNotes} placeholder={t('notes.searchNotes')} />
        <FilterBar
          filters={filterConfigs}
          activeFilters={activeFilters}
          onFilterChange={handleFilterChange}
          onClearAll={clearAllFilters}
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {filteredNotes?.length === 0
          ? (
              <div className="p-6 text-center">
                <h3 className="text-lg font-medium">No notes found</h3>
                <p className="text-sm text-gray-500">Try adjusting your filters or creating a new note.</p>
              </div>
            )
          : (
              <div className="space-y-2 p-2">
                {filteredNotes?.map((note: OfflineNote) => (
                  <div
                    key={note._id}
                    onClick={() => {
                      selectNote(note._id)
                      if (setSidebarOpen)
                        setSidebarOpen(false)
                    }}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedNote?._id === note._id
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <h4 className="font-medium truncate">{note.title || 'Untitled Note'}</h4>
                    <p className="text-sm text-gray-500 truncate">{note.content.replace(/<[^>]*>/g, '')}</p>
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                      <span>{formatDate(note.updatedAt)}</span>
                      <div className="flex gap-1">
                        {note.tags?.slice(0, 2).map((t: string) => (
                          <span key={t} className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 rounded-full">
                            {t}
                          </span>
                        ))}
                      </div>
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
  selectedNote,
  pendingChanges,
  setPendingChanges,
  handleTogglePin,
  setShowDeleteConfirm,
  userTags,
  formatDate,
}: {
  selectedNote: OfflineNote | null
  pendingChanges: Partial<OfflineNote>
  setPendingChanges: (changes: (prev: Partial<OfflineNote>) => Partial<OfflineNote>) => void
  handleTogglePin: (noteId: string) => Promise<void>
  setShowDeleteConfirm: (noteId: string | null) => void
  userTags: string[]
  formatDate: (timestamp: number) => string
}) {
  const note = selectedNote ? { ...selectedNote, ...pendingChanges } : null
  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <h3 className="text-xl font-medium">Select a note</h3>
          <p className="text-gray-500">Choose a note from the list to view its details.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full min-w-0">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <input
          type="text"
          value={note.title}
          onChange={e => setPendingChanges((p: Partial<OfflineNote>) => ({ ...p, title: e.target.value }))}
          className="text-lg font-semibold bg-transparent w-full focus:outline-none"
          placeholder="Note title"
        />
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => handleTogglePin(note._id)} className="p-2 text-gray-400 hover:text-yellow-500">
            {note.pinned
              ? (
                  <StarIconSolid className="h-5 w-5 text-yellow-500" />
                )
              : (
                  <StarIcon className="h-5 w-5" />
                )}
          </button>
          <button type="button" onClick={() => setShowDeleteConfirm(note._id)} className="p-2 text-gray-400 hover:text-red-500">
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <TagInput
          tags={note.tags || []}
          onChange={tags => setPendingChanges((p: Partial<OfflineNote>) => ({ ...p, tags }))}
          suggestions={userTags}
        />
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        <RichTextEditor
          content={note.content}
          onChange={content => setPendingChanges((p: Partial<OfflineNote>) => ({ ...p, content }))}
        />
      </div>
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500">
        <ClockIcon className="h-4 w-4 inline-block mr-1" />
        Last updated:
        {' '}
        {formatDate(note.updatedAt)}
        {Object.keys(pendingChanges).length > 0 && <span className="ml-2 text-blue-500">Saving...</span>}
      </div>
    </div>
  )
}
