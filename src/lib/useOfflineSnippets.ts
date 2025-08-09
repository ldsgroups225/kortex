import type { Id } from '../../convex/_generated/dataModel'
import { useMutation, useQuery } from 'convex/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../convex/_generated/api'
import { automergeUtils } from './automergeUtils'
import { useOfflineSync } from './useOfflineSync'

export interface OfflineSnippet {
  _id: string // Automerge document ID
  convexId?: Id<'snippets'> // Optional Convex snippet ID for synced snippets
  title: string
  content: string
  language: string
  category: string
  pinned: boolean
  createdAt: number
  updatedAt: number
  lastSync?: number
  isLocal: boolean // true if snippet exists only locally
  hasLocalChanges: boolean // true if snippet has unsaved changes
}

interface UseOfflineSnippetsReturn {
  // Snippet data
  snippets: OfflineSnippet[]
  selectedSnippet: OfflineSnippet | null
  searchResults: OfflineSnippet[]

  // Snippet operations
  createSnippet: (snippetData: Partial<OfflineSnippet>) => Promise<string>
  updateSnippet: (snippetId: string, updates: Partial<OfflineSnippet>) => Promise<void>
  deleteSnippet: (snippetId: string) => Promise<void>
  togglePin: (snippetId: string) => Promise<void>
  selectSnippet: (snippetId: string | null) => void

  // Search and filtering
  searchSnippets: (query: string) => void
  getUserCategories: () => string[]
  getUserLanguages: () => string[]

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

export function useOfflineSnippets(userId: Id<'users'> | null): UseOfflineSnippetsReturn {
  const [localSnippets, setLocalSnippets] = useState<Map<string, OfflineSnippet>>(() => new Map())
  const [selectedSnippetId, setSelectedSnippetId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isInitialized, setIsInitialized] = useState(false)

  // Use the general offline sync hook
  const offlineSync = useOfflineSync(userId)

  // Convex queries and mutations
  const convexSnippets = useQuery(api.snippets.getUserSnippets, { category: undefined })
  const convexCreateSnippet = useMutation(api.snippets.createSnippet)
  const convexUpdateSnippet = useMutation(api.snippets.updateSnippet)
  const convexDeleteSnippet = useMutation(api.snippets.deleteSnippet)
  const convexTogglePin = useMutation(api.snippets.togglePin)

  // Local storage key for snippets
  const storageKey = `kortex_snippets_${userId || 'anonymous'}`

  // Load snippets from localStorage on initialization
  const loadFromLocal = useCallback(async () => {
    if (!userId)
      return

    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const snippetsData = JSON.parse(stored)
        const snippetsMap = new Map<string, OfflineSnippet>()

        for (const [snippetId, snippetData] of Object.entries(snippetsData)) {
          snippetsMap.set(snippetId, snippetData as OfflineSnippet)
        }

        setLocalSnippets(snippetsMap)
      }
    }
    catch (error) {
      console.error('Failed to load snippets from localStorage:', error)
    }
  }, [userId, storageKey])

  // Save snippets to localStorage
  const saveToLocal = useCallback(async () => {
    if (!userId)
      return

    try {
      const snippetsObject = Object.fromEntries(localSnippets.entries())
      localStorage.setItem(storageKey, JSON.stringify(snippetsObject))
    }
    catch (error) {
      console.error('Failed to save snippets to localStorage:', error)
    }
  }, [userId, storageKey, localSnippets])

  // Initialize local snippets on mount
  useEffect(() => {
    if (!isInitialized && userId) {
      loadFromLocal().then(() => {
        setIsInitialized(true)
      })
    }
  }, [isInitialized, userId, loadFromLocal])

  // Auto-save to localStorage when localSnippets changes
  useEffect(() => {
    if (isInitialized) {
      saveToLocal()
    }
  }, [localSnippets, isInitialized, saveToLocal])

  // Merge Convex snippets with local snippets
  const mergedSnippets = useMemo(() => {
    const snippetsMap = new Map<string, OfflineSnippet>()

    // Add local snippets
    localSnippets.forEach((snippet, snippetId) => {
      snippetsMap.set(snippetId, snippet)
    })

    // Merge with Convex snippets (when online)
    if (convexSnippets && offlineSync.status.connectionState === 'online') {
      convexSnippets.forEach((convexSnippet) => {
        const existingLocal = Array.from(localSnippets.values())
          .find(snippet => snippet.convexId === convexSnippet._id)

        if (existingLocal) {
          // Update existing local snippet with Convex data if Convex is newer
          if (!existingLocal.lastSync || convexSnippet._creationTime > existingLocal.lastSync) {
            snippetsMap.set(existingLocal._id, {
              ...existingLocal,
              title: convexSnippet.title,
              content: convexSnippet.content,
              language: convexSnippet.language,
              category: convexSnippet.category,
              pinned: convexSnippet.pinned,
              updatedAt: convexSnippet._creationTime,
              lastSync: Date.now(),
              hasLocalChanges: false,
            })
          }
        }
        else {
          // Create new local snippet from Convex data
          const newLocalSnippet: OfflineSnippet = {
            _id: automergeUtils.generateId(),
            convexId: convexSnippet._id,
            title: convexSnippet.title,
            content: convexSnippet.content,
            language: convexSnippet.language,
            category: convexSnippet.category,
            pinned: convexSnippet.pinned,
            createdAt: convexSnippet._creationTime,
            updatedAt: convexSnippet._creationTime,
            lastSync: Date.now(),
            isLocal: false,
            hasLocalChanges: false,
          }
          snippetsMap.set(newLocalSnippet._id, newLocalSnippet)
        }
      })
    }

    return Array.from(snippetsMap.values()).sort((a, b) => {
      // Sort pinned snippets first, then by updatedAt
      if (a.pinned && !b.pinned)
        return -1
      if (!a.pinned && b.pinned)
        return 1
      return b.updatedAt - a.updatedAt
    })
  }, [localSnippets, convexSnippets, offlineSync.status.connectionState])

  // Update localSnippets when mergedSnippets changes
  useEffect(() => {
    if (isInitialized) {
      const newSnippetsMap = new Map<string, OfflineSnippet>()
      mergedSnippets.forEach((snippet) => {
        newSnippetsMap.set(snippet._id, snippet)
      })
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setLocalSnippets(newSnippetsMap)
    }
  }, [mergedSnippets, isInitialized])

  // Search functionality
  const searchResults = useMemo(() => {
    if (!searchQuery.trim())
      return mergedSnippets

    const query = searchQuery.toLowerCase()
    return mergedSnippets.filter(snippet =>
      snippet.title.toLowerCase().includes(query)
      || snippet.content.toLowerCase().includes(query)
      || snippet.language.toLowerCase().includes(query)
      || snippet.category.toLowerCase().includes(query),
    )
  }, [mergedSnippets, searchQuery])

  // Get selected snippet
  const selectedSnippet = useMemo(() => {
    if (!selectedSnippetId)
      return null
    return localSnippets.get(selectedSnippetId) || null
  }, [selectedSnippetId, localSnippets])

  // Get unique categories
  const getUserCategories = useCallback(() => {
    const allCategories = mergedSnippets.map(snippet => snippet.category)
    return Array.from(new Set(allCategories)).sort()
  }, [mergedSnippets])

  // Get unique languages
  const getUserLanguages = useCallback(() => {
    const allLanguages = mergedSnippets.map(snippet => snippet.language)
    return Array.from(new Set(allLanguages)).sort()
  }, [mergedSnippets])

  // Create snippet
  const createSnippet = useCallback(async (snippetData: Partial<OfflineSnippet>) => {
    const now = Date.now()
    const snippetId = automergeUtils.generateId()

    const newSnippet: OfflineSnippet = {
      _id: snippetId,
      title: snippetData.title || 'Untitled Snippet',
      content: snippetData.content || '',
      language: snippetData.language || 'javascript',
      category: snippetData.category || 'general',
      pinned: snippetData.pinned || false,
      createdAt: now,
      updatedAt: now,
      isLocal: true,
      hasLocalChanges: true,
    }

    setLocalSnippets(prev => new Map(prev.set(snippetId, newSnippet)))

    // Try to sync to Convex if online
    if (offlineSync.status.connectionState === 'online') {
      try {
        const convexSnippetId = await convexCreateSnippet({
          title: newSnippet.title,
          content: newSnippet.content,
          language: newSnippet.language,
          category: newSnippet.category,
        })

        // Update local snippet with Convex ID
        setLocalSnippets(prev => new Map(prev.set(snippetId, {
          ...newSnippet,
          convexId: convexSnippetId,
          isLocal: false,
          hasLocalChanges: false,
          lastSync: Date.now(),
        })))

        toast.success('Snippet created and synced')
      }
      catch (error) {
        console.error('Failed to sync new snippet to Convex:', error)
        toast.warning('Snippet created offline (will sync when online)')
      }
    }
    else {
      toast.info('Snippet created offline (will sync when online)')
    }

    return snippetId
  }, [offlineSync.status.connectionState, convexCreateSnippet])

  // Update snippet
  const updateSnippet = useCallback(async (snippetId: string, updates: Partial<OfflineSnippet>) => {
    const existingSnippet = localSnippets.get(snippetId)
    if (!existingSnippet) {
      throw new Error('Snippet not found')
    }

    const updatedSnippet: OfflineSnippet = {
      ...existingSnippet,
      ...updates,
      updatedAt: Date.now(),
      hasLocalChanges: true,
    }

    setLocalSnippets(prev => new Map(prev.set(snippetId, updatedSnippet)))

    // Try to sync to Convex if online and snippet has convexId
    if (offlineSync.status.connectionState === 'online' && existingSnippet.convexId) {
      try {
        await convexUpdateSnippet({
          snippetId: existingSnippet.convexId,
          title: updatedSnippet.title,
          content: updatedSnippet.content,
          language: updatedSnippet.language,
          category: updatedSnippet.category,
        })

        // Mark as synced
        setLocalSnippets(prev => new Map(prev.set(snippetId, {
          ...updatedSnippet,
          hasLocalChanges: false,
          lastSync: Date.now(),
        })))
      }
      catch (error) {
        console.error('Failed to sync snippet update to Convex:', error)
        toast.warning('Changes saved offline (will sync when online)')
      }
    }
  }, [localSnippets, offlineSync.status.connectionState, convexUpdateSnippet])

  // Delete snippet
  const deleteSnippet = useCallback(async (snippetId: string) => {
    const existingSnippet = localSnippets.get(snippetId)
    if (!existingSnippet) {
      throw new Error('Snippet not found')
    }

    // Remove from local storage
    setLocalSnippets((prev) => {
      const newMap = new Map(prev)
      newMap.delete(snippetId)
      return newMap
    })

    // Clear selection if this was the selected snippet
    if (selectedSnippetId === snippetId) {
      setSelectedSnippetId(null)
    }

    // Try to delete from Convex if online and snippet has convexId
    if (offlineSync.status.connectionState === 'online' && existingSnippet.convexId) {
      try {
        await convexDeleteSnippet({ snippetId: existingSnippet.convexId })
        toast.success('Snippet deleted')
      }
      catch (error) {
        console.error('Failed to delete snippet from Convex:', error)
        toast.warning('Snippet deleted locally (will sync when online)')
      }
    }
    else {
      toast.info('Snippet deleted locally (will sync when online)')
    }
  }, [localSnippets, selectedSnippetId, offlineSync.status.connectionState, convexDeleteSnippet])

  // Toggle pin
  const togglePin = useCallback(async (snippetId: string) => {
    const existingSnippet = localSnippets.get(snippetId)
    if (!existingSnippet) {
      throw new Error('Snippet not found')
    }

    const updatedSnippet: OfflineSnippet = {
      ...existingSnippet,
      pinned: !existingSnippet.pinned,
      updatedAt: Date.now(),
      hasLocalChanges: true,
    }

    setLocalSnippets(prev => new Map(prev.set(snippetId, updatedSnippet)))

    // Try to sync to Convex if online and snippet has convexId
    if (offlineSync.status.connectionState === 'online' && existingSnippet.convexId) {
      try {
        await convexTogglePin({ snippetId: existingSnippet.convexId })

        // Mark as synced
        setLocalSnippets(prev => new Map(prev.set(snippetId, {
          ...updatedSnippet,
          hasLocalChanges: false,
          lastSync: Date.now(),
        })))

        toast.success(updatedSnippet.pinned ? 'Snippet pinned' : 'Snippet unpinned')
      }
      catch (error) {
        console.error('Failed to sync pin toggle to Convex:', error)
        toast.warning('Pin status changed offline (will sync when online)')
      }
    }
  }, [localSnippets, offlineSync.status.connectionState, convexTogglePin])

  // Select snippet
  const selectSnippet = useCallback((snippetId: string | null) => {
    setSelectedSnippetId(snippetId)
  }, [])

  // Search snippets
  const searchSnippets = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  // Force sync
  const forceSync = useCallback(async () => {
    await offlineSync.forceSync()

    // Additional snippet-specific sync logic
    const unsyncedSnippets = Array.from(localSnippets.values()).filter(snippet => snippet.hasLocalChanges)

    for (const snippet of unsyncedSnippets) {
      try {
        if (!snippet.convexId) {
          // Create new snippet in Convex
          const convexSnippetId = await convexCreateSnippet({
            title: snippet.title,
            content: snippet.content,
            language: snippet.language,
            category: snippet.category,
          })

          // Update local snippet with Convex ID
          setLocalSnippets(prev => new Map(prev.set(snippet._id, {
            ...snippet,
            convexId: convexSnippetId,
            isLocal: false,
            hasLocalChanges: false,
            lastSync: Date.now(),
          })))
        }
        else {
          // Update existing snippet in Convex
          await convexUpdateSnippet({
            snippetId: snippet.convexId,
            title: snippet.title,
            content: snippet.content,
            language: snippet.language,
            category: snippet.category,
          })

          // Mark as synced
          setLocalSnippets(prev => new Map(prev.set(snippet._id, {
            ...snippet,
            hasLocalChanges: false,
            lastSync: Date.now(),
          })))
        }
      }
      catch (error) {
        console.error('Failed to sync snippet during force sync:', error)
      }
    }
  }, [offlineSync, localSnippets, convexCreateSnippet, convexUpdateSnippet])

  return {
    // Snippet data
    snippets: searchQuery ? searchResults : mergedSnippets,
    selectedSnippet,
    searchResults,

    // Snippet operations
    createSnippet,
    updateSnippet,
    deleteSnippet,
    togglePin,
    selectSnippet,

    // Search and filtering
    searchSnippets,
    getUserCategories,
    getUserLanguages,

    // Sync status
    syncStatus: offlineSync.status,

    // Manual operations
    forceSync,
    loadFromLocal,
    saveToLocal,
  }
}
