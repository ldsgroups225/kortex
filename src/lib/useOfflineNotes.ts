import type { Id } from '../../convex/_generated/dataModel'
import { useMutation, useQuery } from 'convex/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../convex/_generated/api'
import { automergeUtils } from './automergeUtils'
import { useOfflineSync } from './useOfflineSync'

export interface OfflineNote {
  _id: string // Automerge document ID
  convexId?: Id<'notes'> // Optional Convex note ID for synced notes
  title: string
  content: string
  tags: string[]
  pinned: boolean
  createdAt: number
  updatedAt: number
  lastSync?: number
  isLocal: boolean // true if note exists only locally
  hasLocalChanges: boolean // true if note has unsaved changes
}

interface UseOfflineNotesReturn {
  // Note data
  notes: OfflineNote[]
  selectedNote: OfflineNote | null
  searchResults: OfflineNote[]

  // Note operations
  createNote: (noteData: Partial<OfflineNote>) => Promise<string>
  updateNote: (noteId: string, updates: Partial<OfflineNote>) => Promise<void>
  deleteNote: (noteId: string) => Promise<void>
  togglePin: (noteId: string) => Promise<void>
  selectNote: (noteId: string | null) => void

  // Search and filtering
  searchNotes: (query: string) => void
  getUserTags: () => string[]

  // Sync status
  syncStatus: {
    isOnline: boolean
    isSyncing: boolean
    offlineChanges: number
    lastSync?: Date
    connectionState: 'online' | 'offline' | 'syncing' | 'error'
  }

  // Manual operations
  forceSync: () => Promise<void>
  loadFromLocal: () => Promise<void>
  saveToLocal: () => Promise<void>
}

export function useOfflineNotes(userId: Id<'users'> | null): UseOfflineNotesReturn {
  const [localNotes, setLocalNotes] = useState<Map<string, OfflineNote>>(() => new Map())
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isInitialized, setIsInitialized] = useState(false)

  // Use the general offline sync hook
  const offlineSync = useOfflineSync(userId)

  // Convex queries and mutations
  const convexNotes = useQuery(api.notes.getUserNotes)
  const convexCreateNote = useMutation(api.notes.createNote)
  const convexUpdateNote = useMutation(api.notes.updateNote)
  const convexDeleteNote = useMutation(api.notes.deleteNote)
  const convexTogglePin = useMutation(api.notes.togglePin)

  // Local storage key for notes
  const storageKey = `kortex_notes_${userId || 'anonymous'}`

  // Load notes from localStorage on initialization
  const loadFromLocal = useCallback(async () => {
    if (!userId)
      return

    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const notesData = JSON.parse(stored)
        const notesMap = new Map<string, OfflineNote>()

        for (const [noteId, noteData] of Object.entries(notesData)) {
          notesMap.set(noteId, noteData as OfflineNote)
        }

        setLocalNotes(notesMap)
      }
    }
    catch (error) {
      console.error('Failed to load notes from localStorage:', error)
    }
  }, [userId, storageKey])

  // Save notes to localStorage
  const saveToLocal = useCallback(async () => {
    if (!userId)
      return

    try {
      const notesObject = Object.fromEntries(localNotes.entries())
      localStorage.setItem(storageKey, JSON.stringify(notesObject))
    }
    catch (error) {
      console.error('Failed to save notes to localStorage:', error)
    }
  }, [userId, storageKey, localNotes])

  // Initialize local notes on mount
  useEffect(() => {
    if (!isInitialized && userId) {
      loadFromLocal().then(() => {
        setIsInitialized(true)
      })
    }
  }, [isInitialized, userId, loadFromLocal])

  // Auto-save to localStorage when localNotes changes
  useEffect(() => {
    if (isInitialized) {
      saveToLocal()
    }
  }, [localNotes, isInitialized, saveToLocal])

  // Merge Convex notes with local notes
  const mergedNotes = useMemo(() => {
    const notesMap = new Map<string, OfflineNote>()

    // Add local notes
    localNotes.forEach((note, noteId) => {
      notesMap.set(noteId, note)
    })

    // Merge with Convex notes (when online)
    if (convexNotes && offlineSync.status.connectionState === 'online') {
      convexNotes.forEach((convexNote) => {
        const existingLocal = Array.from(localNotes.values())
          .find(note => note.convexId === convexNote._id)

        if (existingLocal) {
          // Update existing local note with Convex data if Convex is newer
          if (!existingLocal.lastSync || convexNote._creationTime > existingLocal.lastSync) {
            notesMap.set(existingLocal._id, {
              ...existingLocal,
              title: convexNote.title,
              content: convexNote.content,
              tags: convexNote.tags,
              pinned: convexNote.pinned,
              updatedAt: convexNote._creationTime,
              lastSync: Date.now(),
              hasLocalChanges: false,
            })
          }
        }
        else {
          // Create new local note from Convex data
          const newLocalNote: OfflineNote = {
            _id: automergeUtils.generateId(),
            convexId: convexNote._id,
            title: convexNote.title,
            content: convexNote.content,
            tags: convexNote.tags,
            pinned: convexNote.pinned,
            createdAt: convexNote._creationTime,
            updatedAt: convexNote._creationTime,
            lastSync: Date.now(),
            isLocal: false,
            hasLocalChanges: false,
          }
          notesMap.set(newLocalNote._id, newLocalNote)
        }
      })
    }

    return Array.from(notesMap.values()).sort((a, b) => {
      // Sort pinned notes first, then by updatedAt
      if (a.pinned && !b.pinned)
        return -1
      if (!a.pinned && b.pinned)
        return 1
      return b.updatedAt - a.updatedAt
    })
  }, [localNotes, convexNotes, offlineSync.status.connectionState])

  // Update localNotes when mergedNotes changes
  useEffect(() => {
    if (isInitialized) {
      const newNotesMap = new Map<string, OfflineNote>()
      mergedNotes.forEach((note) => {
        newNotesMap.set(note._id, note)
      })
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setLocalNotes(newNotesMap)
    }
  }, [mergedNotes, isInitialized])

  // Search functionality
  const searchResults = useMemo(() => {
    if (!searchQuery.trim())
      return mergedNotes

    const query = searchQuery.toLowerCase()
    return mergedNotes.filter(note =>
      note.title.toLowerCase().includes(query)
      || note.content.toLowerCase().includes(query)
      || note.tags.some(tag => tag.toLowerCase().includes(query)),
    )
  }, [mergedNotes, searchQuery])

  // Get selected note
  const selectedNote = useMemo(() => {
    if (!selectedNoteId)
      return null
    return localNotes.get(selectedNoteId) || null
  }, [selectedNoteId, localNotes])

  // Get unique tags
  const getUserTags = useCallback(() => {
    const allTags = mergedNotes.flatMap(note => note.tags)
    return Array.from(new Set(allTags)).sort()
  }, [mergedNotes])

  // Create note
  const createNote = useCallback(async (noteData: Partial<OfflineNote>) => {
    const now = Date.now()
    const noteId = automergeUtils.generateId()

    const newNote: OfflineNote = {
      _id: noteId,
      title: noteData.title || 'Untitled Note',
      content: noteData.content || '',
      tags: noteData.tags || [],
      pinned: noteData.pinned || false,
      createdAt: now,
      updatedAt: now,
      isLocal: true,
      hasLocalChanges: true,
    }

    setLocalNotes(prev => new Map(prev.set(noteId, newNote)))

    // Try to sync to Convex if online
    if (offlineSync.status.connectionState === 'online') {
      try {
        const convexNoteId = await convexCreateNote({
          title: newNote.title,
          content: newNote.content,
          tags: newNote.tags,
        })

        // Update local note with Convex ID
        setLocalNotes(prev => new Map(prev.set(noteId, {
          ...newNote,
          convexId: convexNoteId,
          isLocal: false,
          hasLocalChanges: false,
          lastSync: Date.now(),
        })))

        toast.success('Note created and synced')
      }
      catch (error) {
        console.error('Failed to sync new note to Convex:', error)
        toast.warning('Note created offline (will sync when online)')
      }
    }
    else {
      toast.info('Note created offline (will sync when online)')
    }

    return noteId
  }, [offlineSync.status.connectionState, convexCreateNote])

  // Update note
  const updateNote = useCallback(async (noteId: string, updates: Partial<OfflineNote>) => {
    const existingNote = localNotes.get(noteId)
    if (!existingNote) {
      throw new Error('Note not found')
    }

    const updatedNote: OfflineNote = {
      ...existingNote,
      ...updates,
      updatedAt: Date.now(),
      hasLocalChanges: true,
    }

    setLocalNotes(prev => new Map(prev.set(noteId, updatedNote)))

    // Try to sync to Convex if online and note has convexId
    if (offlineSync.status.connectionState === 'online' && existingNote.convexId) {
      try {
        await convexUpdateNote({
          noteId: existingNote.convexId,
          title: updatedNote.title,
          content: updatedNote.content,
          tags: updatedNote.tags,
        })

        // Mark as synced
        setLocalNotes(prev => new Map(prev.set(noteId, {
          ...updatedNote,
          hasLocalChanges: false,
          lastSync: Date.now(),
        })))
      }
      catch (error) {
        console.error('Failed to sync note update to Convex:', error)
        toast.warning('Changes saved offline (will sync when online)')
      }
    }
  }, [localNotes, offlineSync.status.connectionState, convexUpdateNote])

  // Delete note
  const deleteNote = useCallback(async (noteId: string) => {
    const existingNote = localNotes.get(noteId)
    if (!existingNote) {
      throw new Error('Note not found')
    }

    // Remove from local storage
    setLocalNotes((prev) => {
      const newMap = new Map(prev)
      newMap.delete(noteId)
      return newMap
    })

    // Clear selection if this was the selected note
    if (selectedNoteId === noteId) {
      setSelectedNoteId(null)
    }

    // Try to delete from Convex if online and note has convexId
    if (offlineSync.status.connectionState === 'online' && existingNote.convexId) {
      try {
        await convexDeleteNote({ noteId: existingNote.convexId })
        toast.success('Note deleted')
      }
      catch (error) {
        console.error('Failed to delete note from Convex:', error)
        toast.warning('Note deleted locally (will sync when online)')
      }
    }
    else {
      toast.info('Note deleted locally (will sync when online)')
    }
  }, [localNotes, selectedNoteId, offlineSync.status.connectionState, convexDeleteNote])

  // Toggle pin
  const togglePin = useCallback(async (noteId: string) => {
    const existingNote = localNotes.get(noteId)
    if (!existingNote) {
      throw new Error('Note not found')
    }

    const updatedNote: OfflineNote = {
      ...existingNote,
      pinned: !existingNote.pinned,
      updatedAt: Date.now(),
      hasLocalChanges: true,
    }

    setLocalNotes(prev => new Map(prev.set(noteId, updatedNote)))

    // Try to sync to Convex if online and note has convexId
    if (offlineSync.status.connectionState === 'online' && existingNote.convexId) {
      try {
        await convexTogglePin({ noteId: existingNote.convexId })

        // Mark as synced
        setLocalNotes(prev => new Map(prev.set(noteId, {
          ...updatedNote,
          hasLocalChanges: false,
          lastSync: Date.now(),
        })))

        toast.success(updatedNote.pinned ? 'Note pinned' : 'Note unpinned')
      }
      catch (error) {
        console.error('Failed to sync pin toggle to Convex:', error)
        toast.warning('Pin status changed offline (will sync when online)')
      }
    }
  }, [localNotes, offlineSync.status.connectionState, convexTogglePin])

  // Select note
  const selectNote = useCallback((noteId: string | null) => {
    setSelectedNoteId(noteId)
  }, [])

  // Search notes
  const searchNotes = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  // Force sync
  const forceSync = useCallback(async () => {
    if (!userId)
      return

    // Use the general offline sync force sync
    await offlineSync.forceSyncAll()

    // Additional note-specific sync logic
    const unsyncedNotes = Array.from(localNotes.values()).filter(note => note.hasLocalChanges)

    for (const note of unsyncedNotes) {
      try {
        if (!note.convexId) {
          // Create new note in Convex
          const convexNoteId = await convexCreateNote({
            title: note.title,
            content: note.content,
            tags: note.tags,
          })

          // Update local note with Convex ID
          setLocalNotes(prev => new Map(prev.set(note._id, {
            ...note,
            convexId: convexNoteId,
            isLocal: false,
            hasLocalChanges: false,
            lastSync: Date.now(),
          })))
        }
        else {
          // Update existing note in Convex
          await convexUpdateNote({
            noteId: note.convexId,
            title: note.title,
            content: note.content,
            tags: note.tags,
          })

          // Mark as synced
          setLocalNotes(prev => new Map(prev.set(note._id, {
            ...note,
            hasLocalChanges: false,
            lastSync: Date.now(),
          })))
        }
      }
      catch (error) {
        console.error('Failed to sync note during force sync:', error)
      }
    }
  }, [userId, offlineSync, localNotes, convexCreateNote, convexUpdateNote])

  return {
    // Note data
    notes: searchQuery ? searchResults : mergedNotes,
    selectedNote,
    searchResults,

    // Note operations
    createNote,
    updateNote,
    deleteNote,
    togglePin,
    selectNote,

    // Search and filtering
    searchNotes,
    getUserTags,

    // Sync status
    syncStatus: offlineSync.status,

    // Manual operations
    forceSync,
    loadFromLocal,
    saveToLocal,
  }
}
