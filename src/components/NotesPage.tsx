import type { Id } from '../../convex/_generated/dataModel'
import type { FilterConfig } from './FilterBar'
import {
  ArrowLeftIcon,
  Bars3Icon,
  ClockIcon,
  PlusIcon,
  StarIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { useMutation, useQuery } from 'convex/react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { api } from '../../convex/_generated/api'
import { CopyButton } from './CopyButton'
import { FilterBar } from './FilterBar'
import { RichTextEditor } from './RichTextEditor'
import { SearchBar } from './SearchBar'
import { TagBadge } from './TagBadge'
import { TagInput } from './TagInput'

interface NotesPageProps {
  sidebarOpen?: boolean
  setSidebarOpen?: () => void
}

export function NotesPage({ setSidebarOpen: setAppSidebarOpen }: NotesPageProps = {}) {
  const { t } = useTranslation()
  const [selectedNoteId, setSelectedNoteId] = useState<Id<'notes'> | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Id<'notes'> | null>(null)
  const [notesSidebarOpen, setNotesSidebarOpen] = useState(false)
  const [activeFilters, setActiveFilters] = useState<Record<string, string | string[]>>({
    tags: [],
    pinned: '',
  })

  // Queries
  const notes = useQuery(api.notes.getUserNotes)
  const searchResults = useQuery(api.notes.searchNotes, { query: searchQuery })
  const selectedNote = useQuery(api.notes.getNote, selectedNoteId ? { noteId: selectedNoteId } : 'skip',
  )
  const userTags = useQuery(api.notes.getUserTags) || []

  // Mutations
  const createNote = useMutation(api.notes.createNote)
  const updateNote = useMutation(api.notes.updateNote)
  const deleteNote = useMutation(api.notes.deleteNote)
  const togglePin = useMutation(api.notes.togglePin)

  // Auto-save functionality
  const [pendingChanges, setPendingChanges] = useState<{
    title?: string
    content?: string
    tags?: string[]
  }>({})

  const saveChanges = useCallback(async () => {
    if (!selectedNoteId || Object.keys(pendingChanges).length === 0)
      return

    try {
      await updateNote({
        noteId: selectedNoteId,
        ...pendingChanges,
      })
      setPendingChanges({})
      toast.success(t('toasts.noteSaved'), {
        description: t('toasts.noteSavedDesc'),
      })
    }
    catch (error) {
      console.error('Failed to save changes:', error)
      toast.error(t('toasts.operationError'), {
        description: t('toasts.operationErrorDesc'),
      })
    }
  }, [selectedNoteId, pendingChanges, updateNote, t])

  // Auto-save every 2 seconds
  useEffect(() => {
    const timer = setTimeout(saveChanges, 2000)
    return () => clearTimeout(timer)
  }, [saveChanges])

  // Save on unmount
  useEffect(() => {
    return () => {
      saveChanges()
    }
  }, [saveChanges])

  // Filter and search logic
  const getFilteredNotes = () => {
    let filteredNotes = searchQuery.trim() ? searchResults : notes

    if (!filteredNotes)
      return []

    // Apply filters
    if (activeFilters.tags && Array.isArray(activeFilters.tags) && activeFilters.tags.length > 0) {
      filteredNotes = filteredNotes.filter(note =>
        note.tags && (activeFilters.tags as string[]).some((tag: string) => note.tags.includes(tag)),
      )
    }

    if (activeFilters.pinned === 'pinned') {
      filteredNotes = filteredNotes.filter(note => note.pinned)
    }
    else if (activeFilters.pinned === 'unpinned') {
      filteredNotes = filteredNotes.filter(note => !note.pinned)
    }

    return filteredNotes
  }

  const displayedNotes = getFilteredNotes()

  // Filter configurations
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
    setActiveFilters(prev => ({
      ...prev,
      [key]: value,
    }))
  }

  const clearAllFilters = () => {
    setActiveFilters({
      tags: [],
      pinned: '',
    })
    setSearchQuery('')
  }

  const handleTagClick = (tag: string) => {
    const currentTags = Array.isArray(activeFilters.tags) ? activeFilters.tags : []
    if (!currentTags.includes(tag)) {
      handleFilterChange('tags', [...currentTags, tag])
    }
  }

  const handleCreateNote = async () => {
    if (isCreating)
      return

    setIsCreating(true)
    try {
      const noteId = await createNote({
        title: 'Untitled Note',
        content: '',
        tags: [],
      })
      setSelectedNoteId(noteId)
      // Close notes sidebar on mobile after creating note
      setNotesSidebarOpen(false)
      toast.success(t('toasts.noteCreated'), {
        description: t('toasts.noteCreatedDesc'),
      })
    }
    catch (error) {
      console.error('Failed to create note:', error)
      toast.error(t('toasts.operationError'), {
        description: t('toasts.operationErrorDesc'),
      })
    }
    finally {
      setIsCreating(false)
    }
  }

  const handleNoteSelect = (noteId: Id<'notes'>) => {
    setSelectedNoteId(noteId)
    // Close notes sidebar on mobile after selecting note
    setNotesSidebarOpen(false)
  }

  const handleDeleteNote = async (noteId: Id<'notes'>) => {
    try {
      await deleteNote({ noteId })
      if (selectedNoteId === noteId) {
        setSelectedNoteId(null)
      }
      setShowDeleteConfirm(null)
      toast.error(t('toasts.noteDeleted'), {
        description: t('toasts.noteDeletedDesc'),
      })
    }
    catch (error) {
      console.error('Failed to delete note:', error)
      toast.error(t('toasts.operationError'), {
        description: t('toasts.operationErrorDesc'),
      })
    }
  }

  const handleTogglePin = async (noteId: Id<'notes'>) => {
    try {
      await togglePin({ noteId })
      const note = notes?.find(n => n._id === noteId)
      toast.success(note?.pinned ? t('toasts.noteUnpinned') : t('toasts.notePinned'), {
        description: note?.pinned ? t('toasts.noteUnpinnedDesc') : t('toasts.notePinnedDesc'),
      })
    }
    catch (error) {
      console.error('Failed to toggle pin:', error)
      toast.error(t('toasts.operationError'), {
        description: t('toasts.operationErrorDesc'),
      })
    }
  }

  const updateTitle = (title: string) => {
    setPendingChanges(prev => ({ ...prev, title }))
  }

  const updateContent = (content: string) => {
    setPendingChanges(prev => ({ ...prev, content }))
  }

  const updateTags = (tags: string[]) => {
    setPendingChanges(prev => ({ ...prev, tags }))
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="flex h-full bg-white dark:bg-gray-900 relative">
      {/* Mobile overlay for notes sidebar */}
      {notesSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setNotesSidebarOpen(false)}
        />
      )}

      {/* Notes Sidebar - Mobile first approach */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-full max-w-sm bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 lg:w-80 lg:max-w-none
        ${notesSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
      >
        <div className="flex flex-col h-full">
          {/* Mobile header with close button */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 lg:hidden">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('notes.title')}</h2>
            <button
              type="button"
              onClick={() => setNotesSidebarOpen(false)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Desktop header */}
          <div className="hidden lg:block p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('notes.title')}</h2>
              <button
                type="button"
                onClick={() => void handleCreateNote()}
                disabled={isCreating}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                data-onboarding="create-note-button"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Mobile create button */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 lg:hidden">
            <button
              type="button"
              onClick={() => void handleCreateNote()}
              disabled={isCreating}
              className="w-full flex items-center justify-center gap-2 p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              data-onboarding="create-note-button"
            >
              <PlusIcon className="h-4 w-4" />
              <span className="font-medium">Create New Note</span>
            </button>
          </div>

          {/* Search and Filters */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-4">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={t('notes.searchNotes')}
            />

            <FilterBar
              filters={filterConfigs}
              activeFilters={activeFilters}
              onFilterChange={handleFilterChange}
              onClearAll={clearAllFilters}
            />
          </div>

          {/* Notes List */}
          <div className="flex-1 overflow-y-auto">
            {displayedNotes?.length === 0
              ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    <div className="text-4xl mb-2">📝</div>
                    <p className="text-sm">
                      {searchQuery ? 'No notes found' : 'No notes yet'}
                    </p>
                    {!searchQuery && (
                      <button
                        type="button"
                        onClick={() => void handleCreateNote()}
                        disabled={isCreating}
                        className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        Create your first note
                      </button>
                    )}
                  </div>
                )
              : (
                  <div className="space-y-1 p-2" data-onboarding="notes-list">
                    {displayedNotes?.map((note, index) => (
                      <div
                        key={note._id}
                        onClick={() => handleNoteSelect(note._id)}
                        style={{ animationDelay: `${index * 50}ms` }}
                        className={`p-3 sm:p-4 rounded-md cursor-pointer transition-colors group animate-slide-in-from-bottom ${selectedNoteId === note._id
                          ? 'bg-blue-50 dark:bg-primary/10'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700/40'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-medium text-gray-900 dark:text-white truncate flex-1 text-sm sm:text-base">
                            {note.title || 'Untitled Note'}
                          </h3>
                          <div className="flex items-center gap-1 ml-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                void handleTogglePin(note._id)
                              }}
                              className="opacity-0 group-hover:opacity-100 sm:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-opacity"
                            >
                              {note.pinned
                                ? (
                                    <StarIconSolid className="h-4 w-4 text-yellow-500" />
                                  )
                                : (
                                    <StarIcon className="h-4 w-4 text-gray-400" />
                                  )}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setShowDeleteConfirm(note._id)
                              }}
                              className="opacity-0 group-hover:opacity-100 sm:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-opacity"
                            >
                              <TrashIcon className="h-4 w-4 text-red-500" />
                            </button>
                          </div>
                        </div>

                        <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                          {note.content.replace(/<[^>]*>/g, '').substring(0, 100) || 'No content'}
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <ClockIcon className="h-3 w-3" />
                            <span className="hidden sm:inline">{formatDate(note._creationTime)}</span>
                            <span className="sm:hidden">{new Date(note._creationTime).toLocaleDateString()}</span>
                          </div>
                          {note.tags.length > 0 && (
                            <div className="flex gap-1 flex-wrap">
                              {note.tags.slice(0, 2).map(tag => (
                                <TagBadge
                                  key={tag}
                                  tag={tag}
                                  onClick={() => handleTagClick(tag)}
                                  clickable={true}
                                  className="text-xs"
                                />
                              ))}
                              {note.tags.length > 2 && (
                                <span className="text-gray-400 text-xs">
                                  +
                                  {note.tags.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
          </div>
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedNote
          ? (
              <>
                {/* Mobile header with back button */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 lg:hidden">
                  <button
                    type="button"
                    onClick={() => setSelectedNoteId(null)}
                    className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <ArrowLeftIcon className="h-5 w-5" />
                  </button>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate mx-4">
                    {(pendingChanges.title ?? selectedNote.title) || 'Untitled Note'}
                  </h3>
                  <CopyButton
                    content={pendingChanges.title ?? selectedNote.title}
                    size="sm"
                  />
                </div>

                {/* Desktop Note Header */}
                <div className="hidden lg:block p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 space-y-4">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={pendingChanges.title ?? selectedNote.title}
                      onChange={e => updateTitle(e.target.value)}
                      className="flex-1 text-xl sm:text-2xl font-bold border-none bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-500"
                      placeholder="Note title..."
                      data-onboarding="note-title"
                    />
                    <CopyButton
                      content={pendingChanges.title ?? selectedNote.title}
                      size="sm"
                      className="ml-2"
                    />
                  </div>

                  <TagInput
                    tags={pendingChanges.tags ?? selectedNote.tags}
                    onChange={updateTags}
                    suggestions={userTags}
                    placeholder="Add tags..."
                  />

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                      <span className="whitespace-nowrap">
                        Created:
                        {' '}
                        {formatDate(selectedNote._creationTime)}
                      </span>
                      <span className="hidden sm:inline">•</span>
                      <span className="whitespace-nowrap">
                        Updated:
                        {' '}
                        {formatDate(selectedNote._creationTime)}
                      </span>
                      {Object.keys(pendingChanges).length > 0 && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span className="text-blue-600 dark:text-blue-400 whitespace-nowrap">Saving...</span>
                        </>
                      )}
                    </div>
                    <CopyButton
                      content={pendingChanges.content ?? selectedNote.content}
                      size="sm"
                      variant="text"
                    />
                  </div>
                </div>

                {/* Mobile Tags */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 lg:hidden">
                  <TagInput
                    tags={pendingChanges.tags ?? selectedNote.tags}
                    onChange={updateTags}
                    suggestions={userTags}
                    placeholder="Add tags..."
                  />
                </div>

                {/* Editor */}
                <div className="flex-1 p-4 sm:p-6 overflow-hidden">
                  <RichTextEditor
                    content={pendingChanges.content ?? selectedNote.content}
                    onChange={updateContent}
                    placeholder="Start writing your note..."
                    className="h-full"
                    data-onboarding="note-editor"
                  />
                </div>
              </>
            )
          : (
              <>
                {/* Mobile header when no note selected */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 lg:hidden">
                  <button
                    type="button"
                    onClick={() => {
                      if (setAppSidebarOpen) {
                        setAppSidebarOpen()
                      }
                      else {
                        setNotesSidebarOpen(true)
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Bars3Icon className="h-5 w-5" />
                    <span className="text-sm font-medium">Menu</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCreateNote()}
                    disabled={isCreating}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    <PlusIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Empty state */}
                <div className="flex-1 flex items-center justify-center text-center p-4">
                  <div className="max-w-sm">
                    <div className="text-4xl sm:text-6xl mb-4">📝</div>
                    <h3 className="text-lg sm:text-xl font-medium text-gray-900 dark:text-white mb-2">
                      Select a note to start editing
                    </h3>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">
                      Choose a note from the sidebar or create a new one
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <button
                        type="button"
                        onClick={() => setNotesSidebarOpen(true)}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors lg:hidden"
                      >
                        Browse Notes
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleCreateNote()}
                        disabled={isCreating}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        Create New Note
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Delete Note
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this note? This action cannot be undone.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors order-2 sm:order-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteNote(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors order-1 sm:order-2"
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
