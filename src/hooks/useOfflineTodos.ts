import type { Id } from '../../convex/_generated/dataModel'
import * as Automerge from '@automerge/automerge'
import { useMutation, useQuery } from 'convex/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../convex/_generated/api'
import { automergeUtils } from '../lib/automergeUtils'

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
  return {
    id: convexTodo._id,
    title: convexTodo.title,
    description: convexTodo.description,
    status: convexTodo.status,
    tags: convexTodo.tags || [],
    assignedToUserId: convexTodo.assignedToUserId,
    assignedToUser: convexTodo.assignedToUser
      ? {
          id: convexTodo.assignedToUser._id,
          name: convexTodo.assignedToUser.name,
          email: convexTodo.assignedToUser.email,
        }
      : undefined,
    createdByUser: {
      id: convexTodo.createdByUser._id,
      name: convexTodo.createdByUser.name,
      email: convexTodo.createdByUser.email,
    },
    dueDate: convexTodo.dueDate,
    createdAt: convexTodo.createdAt || convexTodo._creationTime,
    updatedAt: convexTodo.updatedAt || convexTodo._creationTime,
    syncStatus: 'synced',
    userId,
  }
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
          const convexId = await createTodoMutation({
            title: todo.title,
            description: todo.description,
            tags: todo.tags,
            assignedToUserId: todo.assignedToUserId as Id<'users'> | undefined,
            dueDate: todo.dueDate,
          })

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
          await updateTodoMutation({
            id: automergeId as Id<'todos'>,
            title: todo.title,
            description: todo.description,
            status: todo.status,
            tags: todo.tags,
            assignedToUserId: todo.assignedToUserId as Id<'users'> | undefined,
            dueDate: todo.dueDate,
          })

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
  }, [convexTodos, currentUser, isOnline, todosDoc, syncPendingChanges])

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
    return { pending, failed, synced: allTodos.length - pending - failed }
  }, [allTodos])

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

    const newTodo: AutomergeTodo = {
      id: todoId,
      title: data.title,
      description: data.description,
      status: 'todo',
      tags: data.tags || [],
      assignedToUserId: data.assignedToUserId as string | undefined,
      assignedToUser: undefined, // Will be populated on sync if assigned
      createdByUser: {
        id: currentUser._id,
        name: currentUser.name,
        email: currentUser.email,
      },
      dueDate: data.dueDate,
      createdAt: now,
      updatedAt: now,
      isOfflineOnly: true,
      syncStatus: 'pending',
      userId: currentUser._id,
    }

    // Add to local document
    setTodosDoc(current => Automerge.change(current, (doc) => {
      doc.todos[todoId] = newTodo
    }))

    // Show immediate feedback
    toast.success(isOnline ? 'Todo created' : 'Todo created offline', {
      description: isOnline ? 'Syncing to server...' : 'Will sync when online',
      duration: 2000,
    })

    // Try to sync immediately if online
    if (isOnline) {
      try {
        const convexId = await createTodoMutation({
          title: data.title,
          description: data.description,
          tags: data.tags,
          assignedToUserId: data.assignedToUserId as Id<'users'> | undefined,
          dueDate: data.dueDate,
        })

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
  }, [currentUser, createTodoMutation, isOnline])

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
        if (updates.description !== undefined)
          todo.description = updates.description
        if (updates.status !== undefined)
          todo.status = updates.status
        if (updates.tags !== undefined)
          todo.tags = updates.tags
        if (updates.assignedToUserId !== undefined)
          todo.assignedToUserId = updates.assignedToUserId as string | undefined
        if (updates.dueDate !== undefined)
          todo.dueDate = updates.dueDate

        todo.updatedAt = Date.now()
        todo.syncStatus = todo.isOfflineOnly ? 'pending' : 'pending'
      }
    }))

    toast.success(isOnline ? 'Todo updated' : 'Todo updated offline', {
      description: isOnline ? 'Syncing to server...' : 'Will sync when online',
      duration: 2000,
    })

    // Try to sync immediately if online
    if (isOnline && !existingTodo.isOfflineOnly) {
      try {
        await updateTodoMutation({
          id: todoId as Id<'todos'>,
          ...updates,
          assignedToUserId: updates.assignedToUserId as Id<'users'> | undefined,
        })

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
