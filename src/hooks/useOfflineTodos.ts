import type { Id } from '../../convex/_generated/dataModel'
import * as Automerge from '@automerge/automerge'
import { useMutation, useQuery } from 'convex/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../convex/_generated/api'
import { automergeUtils } from '../lib/automergeUtils'
import { notifyAutomergeChanges, STORAGE_KEYS } from '../sw-helpers'

export type TodoStatus = 'todo' | 'in_progress' | 'done'

// Automerge document structure for todos
export interface AutomergeTodo {
  id: string
  title: string
  description?: string
  status: TodoStatus
  tags: string[]
  assignedToUserId?: string // Store as string in Automerge
  assignedToUser?: {
    id: string
    name?: string
    email?: string
  }
  createdByUser: {
    id: string
    name?: string
    email?: string
  }
  dueDate?: number
  createdAt: number
  updatedAt: number
  // Offline-specific fields
  isOfflineOnly?: boolean
  syncStatus?: 'synced' | 'pending' | 'failed'
  lastSyncAttempt?: number
  userId: string // Creator user ID
}

export interface AutomergeTodosDocument {
  todos: Record<string, AutomergeTodo>
  [key: string]: unknown // Add index signature to satisfy Record<string, unknown>
}

// Frontend todo type (matches what the component expects)
export interface Todo {
  _id: Id<'todos'> | string // Can be Convex ID or temporary ID
  userId: Id<'users'> | string
  title: string
  description?: string
  status: TodoStatus
  tags: string[]
  assignedToUserId?: Id<'users'> | string
  assignedToUser?: {
    _id: Id<'users'> | string
    name?: string
    email?: string
  }
  createdByUser: {
    _id: Id<'users'> | string
    name?: string
    email?: string
  }
  dueDate?: number
  createdAt: number
  updatedAt: number
  // Offline-specific fields
  isOfflineOnly?: boolean
  syncStatus?: 'synced' | 'pending' | 'failed'
  // Optimistic UI fields (for compatibility with existing component)
  optimistic?: boolean
  tempId?: string
  sending?: boolean
  deleting?: boolean
}

// Local storage key
const TODOS_STORAGE_KEY = 'offline-todos-automerge'

// Helper to get initial document
function getInitialDocument(): AutomergeTodosDocument {
  const stored = localStorage.getItem(TODOS_STORAGE_KEY)
  if (stored) {
    try {
      const uint8Array = new Uint8Array(JSON.parse(stored))
      return Automerge.load<AutomergeTodosDocument>(uint8Array)
    }
    catch (error) {
      console.warn('Failed to load todos from localStorage:', error)
    }
  }
  return Automerge.from<AutomergeTodosDocument>({ todos: {} })
}

// Helper to save document
function saveDocument(doc: AutomergeTodosDocument) {
  try {
    const uint8Array = Automerge.save(doc)
    const jsonArray = JSON.stringify(Array.from(uint8Array))
    localStorage.setItem(TODOS_STORAGE_KEY, jsonArray)
  }
  catch (error) {
    console.warn('Failed to save todos to localStorage:', error)
  }
}

// Helper to convert Automerge todo to frontend todo
function convertToFrontendTodo(automergeId: string, todo: AutomergeTodo): Todo {
  return {
    _id: automergeId,
    userId: todo.userId as Id<'users'>,
    title: todo.title,
    description: todo.description,
    status: todo.status,
    tags: todo.tags || [],
    assignedToUserId: todo.assignedToUserId as Id<'users'> | undefined,
    assignedToUser: todo.assignedToUser
      ? {
          _id: todo.assignedToUser.id as Id<'users'>,
          name: todo.assignedToUser.name,
          email: todo.assignedToUser.email,
        }
      : undefined,
    createdByUser: {
      _id: todo.createdByUser.id as Id<'users'>,
      name: todo.createdByUser.name,
      email: todo.createdByUser.email,
    },
    dueDate: todo.dueDate,
    createdAt: todo.createdAt,
    updatedAt: todo.updatedAt,
    isOfflineOnly: todo.isOfflineOnly,
    syncStatus: todo.syncStatus,
    // Map sync status to optimistic UI fields for compatibility
    optimistic: todo.syncStatus === 'pending' || todo.isOfflineOnly,
    sending: todo.syncStatus === 'pending',
    tempId: todo.isOfflineOnly ? automergeId : undefined,
  }
}

// Helper to convert Convex todo to Automerge todo
function convertToAutomergeTodo(convexTodo: any, userId: string): AutomergeTodo {
  // Build createdByUser object with only defined fields
  const createdByUser: { id: string, name?: string, email?: string } = {
    id: convexTodo.createdByUser._id,
  }

  // Only add optional fields if they have values (avoid undefined)
  if (convexTodo.createdByUser.name) {
    createdByUser.name = convexTodo.createdByUser.name
  }
  if (convexTodo.createdByUser.email) {
    createdByUser.email = convexTodo.createdByUser.email
  }

  const automergeDoc: AutomergeTodo = {
    id: convexTodo._id,
    title: convexTodo.title,
    status: convexTodo.status,
    tags: convexTodo.tags || [],
    createdByUser,
    createdAt: convexTodo.createdAt || convexTodo._creationTime,
    updatedAt: convexTodo.updatedAt || convexTodo._creationTime,
    syncStatus: 'synced',
    userId,
  }

  // Only set optional fields if they have values (avoid undefined)
  if (convexTodo.description) {
    automergeDoc.description = convexTodo.description
  }
  if (convexTodo.assignedToUserId) {
    automergeDoc.assignedToUserId = convexTodo.assignedToUserId
  }
  if (convexTodo.assignedToUser) {
    automergeDoc.assignedToUser = {
      id: convexTodo.assignedToUser._id,
      name: convexTodo.assignedToUser.name,
      email: convexTodo.assignedToUser.email,
    }
  }
  if (convexTodo.dueDate) {
    automergeDoc.dueDate = convexTodo.dueDate
  }

  return automergeDoc
}

export function useOfflineTodos() {
  // Automerge document state
  const [todosDoc, setTodosDoc] = useState<AutomergeTodosDocument>(getInitialDocument)

  // Online state
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  // Sync state
  const [syncInProgress, setSyncInProgress] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)

  // Convex queries and mutations
  const convexTodos = useQuery(api.todos.getTodos)
  const currentUser = useQuery(api.users.getCurrentUser)
  const createTodoMutation = useMutation(api.todos.createTodo)
  const updateTodoMutation = useMutation(api.todos.updateTodo)
  const deleteTodoMutation = useMutation(api.todos.deleteTodo)
  const toggleTodoStatusMutation = useMutation(api.todos.toggleTodoStatus)

  // Track online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Listen for sync-complete events from service worker
  useEffect(() => {
    const handleSyncComplete = () => {
      // Reload data after sync completes
      if (isOnline) {
        console.warn('Sync completed, revalidating todos data')
        // The sync handling is already done in the existing useEffect for convexTodos
      }
    }

    // Listen for the sync-complete event from the service worker
    window.addEventListener('kortex-sync-complete', handleSyncComplete)

    return () => {
      window.removeEventListener('kortex-sync-complete', handleSyncComplete)
    }
  }, [isOnline])

  // Save document to localStorage when it changes
  useEffect(() => {
    saveDocument(todosDoc)
  }, [todosDoc])

  // Sync pending offline changes
  const syncPendingChanges = useCallback(async (doc: AutomergeTodosDocument) => {
    if (!isOnline || !currentUser)
      return

    const pendingTodos = Object.entries(doc.todos).filter(([_, todo]) =>
      todo.syncStatus === 'pending' || todo.isOfflineOnly,
    )

    for (const [automergeId, todo] of pendingTodos) {
      try {
        if (todo.isOfflineOnly) {
          // Create new todo on server
          const createData: any = {
            title: todo.title,
            tags: todo.tags,
          }

          // Only include optional fields if they have values
          if (todo.description) {
            createData.description = todo.description
          }
          if (todo.assignedToUserId) {
            createData.assignedToUserId = todo.assignedToUserId as Id<'users'>
          }
          if (todo.dueDate) {
            createData.dueDate = todo.dueDate
          }

          const convexId = await createTodoMutation(createData)

          // Update local document with server ID and mark as synced
          setTodosDoc(current => Automerge.change(current, (draft) => {
            delete draft.todos[automergeId] // Remove old offline-only version
            draft.todos[convexId] = {
              ...todo,
              id: convexId,
              isOfflineOnly: false,
              syncStatus: 'synced',
            }
          }))

          toast.success('Todo synced to server', { duration: 2000 })
        }
        else {
          // Update existing todo on server
          const updateData: any = {
            id: automergeId as Id<'todos'>,
            title: todo.title,
            status: todo.status,
            tags: todo.tags,
          }

          // Only include optional fields if they have values
          if (todo.description) {
            updateData.description = todo.description
          }
          if (todo.assignedToUserId) {
            updateData.assignedToUserId = todo.assignedToUserId as Id<'users'>
          }
          if (todo.dueDate) {
            updateData.dueDate = todo.dueDate
          }

          await updateTodoMutation(updateData)

          // Mark as synced
          setTodosDoc(current => Automerge.change(current, (draft) => {
            if (draft.todos[automergeId]) {
              draft.todos[automergeId].syncStatus = 'synced'
            }
          }))
        }
      }
      catch (error) {
        console.error(`Failed to sync todo ${automergeId}:`, error)

        // Mark as failed
        setTodosDoc(current => Automerge.change(current, (draft) => {
          if (draft.todos[automergeId]) {
            draft.todos[automergeId].syncStatus = 'failed'
            draft.todos[automergeId].lastSyncAttempt = Date.now()
          }
        }))
      }
    }
  }, [isOnline, currentUser, createTodoMutation, updateTodoMutation])

  // Sync with Convex when online and data is available
  useEffect(() => {
    if (!isOnline || !convexTodos || !currentUser)
      return

    const syncWithConvex = async () => {
      setSyncInProgress(true)
      try {
        // Merge Convex todos into Automerge document
        const newDoc = Automerge.change(todosDoc, (doc) => {
          // Flatten all todos from Convex response
          const allConvexTodos = [
            ...convexTodos.todo,
            ...convexTodos.inProgress,
            ...convexTodos.done,
          ]

          // Update existing todos and add new ones from Convex
          allConvexTodos.forEach((convexTodo) => {
            const automergeId = convexTodo._id
            const existingTodo = doc.todos[automergeId]

            if (!existingTodo || existingTodo.syncStatus !== 'pending') {
              // Only update if not pending local changes
              doc.todos[automergeId] = convertToAutomergeTodo(convexTodo, currentUser._id)
            }
          })

          // Remove todos that no longer exist in Convex (unless they're offline-only)
          const convexTodoIds = new Set(allConvexTodos.map(t => t._id))
          Object.keys(doc.todos).forEach((id) => {
            const todo = doc.todos[id]
            if (!todo.isOfflineOnly && !convexTodoIds.has(id) && todo.syncStatus !== 'pending') {
              delete doc.todos[id]
            }
          })
        })

        setTodosDoc(newDoc)
        setLastSyncTime(new Date())

        // Attempt to sync pending offline changes
        await syncPendingChanges(newDoc)
      }
      catch (error) {
        console.error('Sync error:', error)
      }
      finally {
        setSyncInProgress(false)
      }
    }

    syncWithConvex()
  }, [convexTodos, currentUser, isOnline, syncPendingChanges, todosDoc]) // Added todosDoc back to dependencies

  // Get todos organized by status
  const todos = useMemo(() => {
    const allTodos = Object.entries(todosDoc.todos).map(([automergeId, todo]) =>
      convertToFrontendTodo(automergeId, todo),
    )

    // Sort by creation time (newest first)
    allTodos.sort((a, b) => b.createdAt - a.createdAt)

    return {
      todo: allTodos.filter(t => t.status === 'todo'),
      inProgress: allTodos.filter(t => t.status === 'in_progress'),
      done: allTodos.filter(t => t.status === 'done'),
    }
  }, [todosDoc])

  // Get all todos as a flat array
  const allTodos = useMemo(() =>
    [...todos.todo, ...todos.inProgress, ...todos.done], [todos])

  // Get unique tags from all todos
  const allTags = useMemo(() => {
    const tags = new Set<string>()
    allTodos.forEach((todo) => {
      todo.tags?.forEach(tag => tags.add(tag))
    })
    return Array.from(tags).sort()
  }, [allTodos])

  // Get sync status summary
  const syncStatus = useMemo(() => {
    const pending = allTodos.filter(t => t.syncStatus === 'pending' || t.isOfflineOnly).length
    const failed = allTodos.filter(t => t.syncStatus === 'failed').length

    // Determine connection state
    let connectionState: 'online' | 'offline' | 'syncing' | 'error'
    if (!isOnline) {
      connectionState = 'offline'
    }
    else if (syncInProgress) {
      connectionState = 'syncing'
    }
    else if (failed > 0) {
      connectionState = 'error'
    }
    else {
      connectionState = 'online'
    }

    // Return SyncStatus compatible object
    return {
      connectionState,
      lastSync: lastSyncTime ? lastSyncTime.getTime() : 0,
      isOnline,
      isSyncing: syncInProgress,
      offlineChanges: pending,
      pendingSyncs: pending,
      // Keep legacy properties for backward compatibility
      pending,
      failed,
      synced: allTodos.length - pending - failed,
    }
  }, [allTodos, isOnline, syncInProgress, lastSyncTime])

  // Create todo
  const createTodo = useCallback(async (data: {
    title: string
    description?: string
    tags?: string[]
    assignedToUserId?: Id<'users'> | string
    dueDate?: number
  }) => {
    if (!currentUser) {
      toast.error('Must be logged in to create todos')
      return
    }

    const todoId = automergeUtils.generateId()
    const now = Date.now()

    // Build createdByUser object with only defined fields
    const createdByUser: { id: string, name?: string, email?: string } = {
      id: currentUser._id,
    }

    // Only add optional fields if they have values (avoid undefined)
    if (currentUser.name) {
      createdByUser.name = currentUser.name
    }
    if (currentUser.email) {
      createdByUser.email = currentUser.email
    }

    const newTodo: AutomergeTodo = {
      id: todoId,
      title: data.title,
      status: 'todo',
      tags: data.tags || [],
      createdByUser,
      createdAt: now,
      updatedAt: now,
      isOfflineOnly: true,
      syncStatus: 'pending',
      userId: currentUser._id,
    }

    // Only set optional fields if they have values
    if (data.description) {
      newTodo.description = data.description
    }
    if (data.assignedToUserId) {
      newTodo.assignedToUserId = data.assignedToUserId as string
    }
    if (data.dueDate) {
      newTodo.dueDate = data.dueDate
    }

    // Add to local document
    setTodosDoc(current => Automerge.change(current, (doc) => {
      doc.todos[todoId] = newTodo
    }))

    // Notify service worker of the new todo and increment offline changes counter
    notifyAutomergeChanges(STORAGE_KEYS.TODOS, 'create', newTodo)

    // Update offline changes count in sync status
    const _currentPending = Object.values(todosDoc.todos).filter(t =>
      t.syncStatus === 'pending' || t.isOfflineOnly,
    ).length
    // The count will be updated in the syncStatus useMemo

    // Show immediate feedback
    toast.success(isOnline ? 'Todo created' : 'Todo created offline', {
      description: isOnline ? 'Syncing to server...' : 'Will sync when online',
      duration: 2000,
    })

    // Try to sync immediately if online
    if (isOnline) {
      try {
        const createMutationData: any = {
          title: data.title,
          tags: data.tags,
        }

        // Only include optional fields if they have values
        if (data.description) {
          createMutationData.description = data.description
        }
        if (data.assignedToUserId) {
          createMutationData.assignedToUserId = data.assignedToUserId as Id<'users'>
        }
        if (data.dueDate) {
          createMutationData.dueDate = data.dueDate
        }

        const convexId = await createTodoMutation(createMutationData)

        // Update with server ID
        setTodosDoc(current => Automerge.change(current, (draft) => {
          delete draft.todos[todoId]
          draft.todos[convexId] = {
            ...newTodo,
            id: convexId,
            isOfflineOnly: false,
            syncStatus: 'synced',
          }
        }))
      }
      catch (error) {
        console.error('Failed to create todo online:', error)
        setTodosDoc(current => Automerge.change(current, (draft) => {
          if (draft.todos[todoId]) {
            draft.todos[todoId].syncStatus = 'failed'
          }
        }))
        toast.error('Failed to sync todo')
      }
    }

    return todoId
  }, [currentUser, createTodoMutation, isOnline, todosDoc.todos]) // Added todosDoc.todos to dependencies

  // Update todo
  const updateTodo = useCallback(async (todoId: string, updates: {
    title?: string
    description?: string
    status?: TodoStatus
    tags?: string[]
    assignedToUserId?: Id<'users'> | string
    dueDate?: number
  }) => {
    const existingTodo = todosDoc.todos[todoId]
    if (!existingTodo) {
      toast.error('Todo not found')
      return
    }

    // Update local document
    setTodosDoc(current => Automerge.change(current, (doc) => {
      const todo = doc.todos[todoId]
      if (todo) {
        if (updates.title !== undefined)
          todo.title = updates.title
        if (updates.description !== undefined) {
          if (updates.description) {
            todo.description = updates.description
          }
          else {
            // Remove the property if description is empty
            delete todo.description
          }
        }
        if (updates.status !== undefined)
          todo.status = updates.status
        if (updates.tags !== undefined)
          todo.tags = updates.tags
        if (updates.assignedToUserId !== undefined) {
          if (updates.assignedToUserId) {
            todo.assignedToUserId = updates.assignedToUserId as string
          }
          else {
            // Remove the property if no user is assigned
            delete todo.assignedToUserId
            delete todo.assignedToUser
          }
        }
        if (updates.dueDate !== undefined) {
          if (updates.dueDate) {
            todo.dueDate = updates.dueDate
          }
          else {
            // Remove the property if no due date
            delete todo.dueDate
          }
        }

        todo.updatedAt = Date.now()
        todo.syncStatus = todo.isOfflineOnly ? 'pending' : 'pending'
      }
    }))

    // Notify service worker of the update and increment offline changes counter
    notifyAutomergeChanges(STORAGE_KEYS.TODOS, 'update', { id: todoId, updates })

    // The offline changes count is automatically updated via the syncStatus useMemo

    toast.success(isOnline ? 'Todo updated' : 'Todo updated offline', {
      description: isOnline ? 'Syncing to server...' : 'Will sync when online',
      duration: 2000,
    })

    // Try to sync immediately if online
    if (isOnline && !existingTodo.isOfflineOnly) {
      try {
        const mutationData: any = {
          id: todoId as Id<'todos'>,
          title: updates.title,
          status: updates.status,
          tags: updates.tags,
        }

        // Only include optional fields if they have values
        if (updates.description) {
          mutationData.description = updates.description
        }
        if (updates.dueDate) {
          mutationData.dueDate = updates.dueDate
        }
        if (updates.assignedToUserId) {
          mutationData.assignedToUserId = updates.assignedToUserId as Id<'users'>
        }

        await updateTodoMutation(mutationData)

        setTodosDoc(current => Automerge.change(current, (draft) => {
          if (draft.todos[todoId]) {
            draft.todos[todoId].syncStatus = 'synced'
          }
        }))
      }
      catch (error) {
        console.error('Failed to update todo online:', error)
        setTodosDoc(current => Automerge.change(current, (draft) => {
          if (draft.todos[todoId]) {
            draft.todos[todoId].syncStatus = 'failed'
          }
        }))
        toast.error('Failed to sync todo update')
      }
    }
  }, [todosDoc.todos, updateTodoMutation, isOnline])

  // Delete todo
  const deleteTodo = useCallback(async (todoId: string) => {
    const existingTodo = todosDoc.todos[todoId]
    if (!existingTodo) {
      toast.error('Todo not found')
      return
    }

    // Remove from local document
    setTodosDoc(current => Automerge.change(current, (doc) => {
      delete doc.todos[todoId]
    }))

    // Notify service worker of the deletion and increment offline changes counter
    notifyAutomergeChanges(STORAGE_KEYS.TODOS, 'delete', { id: todoId })

    // The offline changes count is automatically updated via the syncStatus useMemo

    toast.success('Todo deleted', { duration: 2000 })

    // Try to sync deletion if online and not offline-only
    if (isOnline && !existingTodo.isOfflineOnly) {
      try {
        await deleteTodoMutation({ id: todoId as Id<'todos'> })
      }
      catch (error) {
        console.error('Failed to delete todo online:', error)
        toast.error('Failed to sync todo deletion')

        // Re-add the todo if deletion failed
        setTodosDoc(current => Automerge.change(current, (doc) => {
          doc.todos[todoId] = existingTodo
        }))
      }
    }
  }, [todosDoc.todos, deleteTodoMutation, isOnline])

  // Toggle todo status
  const toggleTodoStatus = useCallback(async (todoId: string) => {
    const existingTodo = todosDoc.todos[todoId]
    if (!existingTodo) {
      toast.error('Todo not found')
      return
    }

    const newStatus: TodoStatus = existingTodo.status === 'done' ? 'todo' : 'done'

    // Update local document
    setTodosDoc(current => Automerge.change(current, (doc) => {
      const todo = doc.todos[todoId]
      if (todo) {
        todo.status = newStatus
        todo.updatedAt = Date.now()
        todo.syncStatus = todo.isOfflineOnly ? 'pending' : 'pending'
      }
    }))

    toast.success(`Todo marked as ${newStatus === 'done' ? 'done' : 'todo'}`, { duration: 2000 })

    // Try to sync immediately if online
    if (isOnline && !existingTodo.isOfflineOnly) {
      try {
        await toggleTodoStatusMutation({ id: todoId as Id<'todos'> })

        setTodosDoc(current => Automerge.change(current, (draft) => {
          if (draft.todos[todoId]) {
            draft.todos[todoId].syncStatus = 'synced'
          }
        }))
      }
      catch (error) {
        console.error('Failed to toggle todo status online:', error)
        setTodosDoc(current => Automerge.change(current, (draft) => {
          if (draft.todos[todoId]) {
            draft.todos[todoId].syncStatus = 'failed'
          }
        }))
        toast.error('Failed to sync todo status')
      }
    }
  }, [todosDoc.todos, toggleTodoStatusMutation, isOnline])

  // Retry failed syncs
  const retryFailedSyncs = useCallback(async () => {
    if (!isOnline) {
      toast.error('Cannot retry sync while offline')
      return
    }

    const failedTodos = Object.entries(todosDoc.todos).filter(([_, todo]) =>
      todo.syncStatus === 'failed',
    )

    if (failedTodos.length === 0) {
      toast.info('No failed syncs to retry')
      return
    }

    toast.info(`Retrying ${failedTodos.length} failed syncs...`)
    await syncPendingChanges(todosDoc)
  }, [todosDoc, isOnline, syncPendingChanges])

  // Force full sync
  const forceSyncAll = useCallback(() => {
    if (!isOnline) {
      toast.error('Cannot sync while offline')
      return
    }

    // Mark all local todos as pending to force re-sync
    setTodosDoc(current => Automerge.change(current, (doc) => {
      Object.values(doc.todos).forEach((todo) => {
        if (!todo.isOfflineOnly) {
          todo.syncStatus = 'pending'
        }
      })
    }))

    toast.info('Force syncing all todos...')
  }, [isOnline])

  // Clear all offline data (for debugging)
  const clearOfflineData = useCallback(() => {
    setTodosDoc(Automerge.from<AutomergeTodosDocument>({ todos: {} }))
    localStorage.removeItem(TODOS_STORAGE_KEY)
    toast.info('Offline todo data cleared')
  }, [])

  return {
    // Data
    todos,
    allTodos,
    allTags,

    // Status
    isOnline,
    syncInProgress,
    lastSyncTime,
    syncStatus,

    // Actions
    createTodo,
    updateTodo,
    deleteTodo,
    toggleTodoStatus,

    // Sync management
    retryFailedSyncs,
    forceSyncAll,
    clearOfflineData,
  }
}
