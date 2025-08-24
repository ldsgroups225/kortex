import type { Id } from '../../convex/_generated/dataModel'
import type { Todo, TodoStatus } from '../hooks/useOfflineTodos'
import type { FilterConfig } from './FilterBar'
import {
  Bars3Icon,
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { useMutation, usePaginatedQuery, useQuery } from 'convex/react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { api } from '../../convex/_generated/api'
import { CopyButton } from './CopyButton'
import { FilterBar } from './FilterBar'
import { PomodoroTimer } from './PomodoroTimer'
import { SearchBar } from './SearchBar'
import { TagInput } from './TagInput'
import { UserSelector } from './UserSelector'

// Extracted TodoCard component
function TodoCard({
  todo,
  isEditing,
  style,
  editTitle,
  setEditTitle,
  editDescription,
  setEditDescription,
  editStatus,
  setEditStatus,
  editTags,
  setEditTags,
  editDueDate,
  setEditDueDate,
  editAssignedTo,
  setEditAssignedTo,
  users,
  currentUser,
  handleSaveEdit,
  setEditingTodo,
  _toggleTodoStatus,
  handleEditTodo,
  handleDeleteTodo,
  handleDragStart,
  handleDragEnd,
  draggedTodo,
  dragOverStatus,
  formatDate,
  isOverdue,
  handleStartPomodoro,
  t,
}: {
  todo: Todo
  isEditing: boolean
  style?: React.CSSProperties
  editingTodo: Id<'todos'> | null
  editTitle: string
  setEditTitle: (title: string) => void
  editDescription: string
  setEditDescription: (desc: string) => void
  editStatus: TodoStatus
  setEditStatus: (status: TodoStatus) => void
  editTags: string[]
  setEditTags: (tags: string[]) => void
  editDueDate: string
  setEditDueDate: (date: string) => void
  editAssignedTo?: Id<'users'>
  setEditAssignedTo: (userId?: Id<'users'>) => void
  users: any
  currentUser: any
  handleSaveEdit: () => Promise<void>
  setEditingTodo: (id: Id<'todos'> | null) => void
  toggleTodoStatus: any
  handleEditTodo: (todo: Todo) => void
  handleDeleteTodo: (id: Id<'todos'>) => Promise<void>
  handleDragStart: (e: React.DragEvent, todo: Todo) => void
  handleDragEnd: () => void
  draggedTodo: Todo | null
  dragOverStatus: TodoStatus | null
  formatDate: (timestamp: number) => string
  isOverdue: (dueDate: number) => boolean
  handleStartPomodoro: (todo: Todo) => void
  t: any
}) {
  return (
    <div
      style={style}
      className={`group relative rounded-md p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm mb-3 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 animate-slide-in-from-bottom ${draggedTodo?._id === todo._id ? 'opacity-50' : ''
      } ${dragOverStatus === todo.status ? 'ring-2 ring-blue-500' : ''} ${todo.status === 'done' ? 'opacity-70' : ''} ${todo.sending ? 'ring-2 ring-blue-300 bg-blue-50 dark:bg-blue-900/20' : ''} ${todo.deleting ? 'opacity-50 scale-95' : ''} ${todo.optimistic ? 'border-dashed border-blue-300' : ''}`}
      draggable={!todo.sending}
      onDragStart={e => handleDragStart(e, todo)}
      onDragEnd={handleDragEnd}
    >
      {isEditing
        ? (
            <div className="space-y-3">
              <input
                type="text"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('common.title')}
              />
              <textarea
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('todos.descriptionPlaceholder')}
                rows={2}
              />
              <TagInput
                tags={editTags}
                onChange={setEditTags}
                placeholder={t('todos.tagsPlaceholder') || 'Add tags...'}
              />
              <UserSelector
                users={users}
                selectedUserId={editAssignedTo}
                onUserSelect={setEditAssignedTo}
                currentUserId={currentUser?._id}
                placeholder={t('todos.assignToPlaceholder')}
              />
              <div className="flex gap-2">
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value as TodoStatus)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="todo">{t('todos.statuses.todo')}</option>
                  <option value="in_progress">{t('todos.statuses.in_progress')}</option>
                  <option value="done">{t('todos.statuses.done')}</option>
                </select>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={e => setEditDueDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void handleSaveEdit()
                  }}
                  className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  {t('common.save')}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingTodo(null)}
                  className="px-3 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )
        : (
            <>
              {/* Grab handle - visible on hover */}
              <div className="group-hover:flex hidden absolute top-2 right-2 flex-col gap-0.5">
                <div className="w-4 h-0.5 bg-slate-400 rounded" />
                <div className="w-4 h-0.5 bg-slate-400 rounded" />
              </div>

              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => {
                    void toggleTodoStatus({ id: todo._id as Id<'todos'> })
                  }}
                  className={`flex-shrink-0 w-5 h-5 rounded border-2 transition-all duration-200 ${todo.status === 'done'
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-gray-300 dark:border-gray-600 hover:border-green-500'
                  }`}
                >
                  {todo.status === 'done' && <CheckIcon className="w-3 h-3" />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-medium text-gray-900 dark:text-white transition-all duration-200 ${todo.status === 'done' ? 'line-through opacity-70' : ''
                    }`}
                    >
                      {todo.title}
                    </h3>
                    {/* Assignment badge */}
                    {todo.assignedToUser && (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full">
                        {todo.assignedToUser._id === currentUser?._id
                          ? t('todos.collaborative.assignedToYou', { name: todo.createdByUser.name || todo.createdByUser.email || t('common.untitled') })
                          : t('todos.collaborative.assignedByYou', { name: todo.assignedToUser.name || todo.assignedToUser.email || t('common.untitled') })}
                      </span>
                    )}
                    {todo.sending && (
                      <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                        <div className="animate-spin rounded-full h-3 w-3 border border-blue-600 border-t-transparent"></div>
                        <span>Syncing...</span>
                      </div>
                    )}
                    {todo.optimistic && !todo.sending && (
                      <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-1 py-0.5 rounded">New</span>
                    )}
                  </div>
                  {todo.description && (
                    <p className={`text-sm text-gray-600 dark:text-gray-400 mt-1 ${todo.status === 'done' ? 'line-through opacity-70' : ''
                    }`}
                    >
                      {todo.description}
                    </p>
                  )}
                  {todo.dueDate && (
                    <div className="flex items-center gap-1 mt-2">
                      <CalendarIcon className="w-4 h-4 text-gray-400" />
                      <span className={`text-xs ${isOverdue(todo.dueDate) ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'
                      }`}
                      >
                        {formatDate(todo.dueDate)}
                        {isOverdue(todo.dueDate) && ` (${t('todos.overdue')})`}
                      </span>
                    </div>
                  )}
                  {/* Creator/Assignee info */}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      {t('todos.createdBy')}
                      {' '}
                      {todo.createdByUser._id === currentUser?._id
                        ? t('todos.you')
                        : (todo.createdByUser.name || todo.createdByUser.email || t('common.untitled'))}
                    </span>
                    {todo.assignedToUser && (
                      <span>
                        {t('todos.assignedTo')}
                        {' '}
                        {todo.assignedToUser._id === currentUser?._id
                          ? t('todos.you')
                          : (todo.assignedToUser.name || todo.assignedToUser.email || t('common.untitled'))}
                      </span>
                    )}
                  </div>
                  {todo.tags && todo.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {todo.tags.map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className={`flex items-center gap-1 transition-opacity ${todo.sending ? 'opacity-50 pointer-events-none' : 'opacity-0 group-hover:opacity-100'}`}>
                  <CopyButton
                    content={`${todo.title}${todo.description ? `\n\n${todo.description}` : ''}`}
                    size="sm"
                  />
                  {/* Only show play button for in-progress todos */}
                  {todo.status === 'in_progress' && (
                    <button
                      type="button"
                      onClick={() => handleStartPomodoro(todo)}
                      className="p-1 text-gray-400 hover:text-green-500 transition-colors"
                      disabled={todo.sending}
                      title={t('todos.pomodoro.startFocus')}
                    >
                      <PlayIcon className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleEditTodo(todo)}
                    className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                    disabled={todo.sending}
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleDeleteTodo(todo._id || todo.tempId)
                    }}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    disabled={todo.sending}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
    </div>
  )
}

// Extracted TodoColumn component
function TodoColumn({
  title,
  todos,
  status,
  dragOverStatus,
  handleDragOver,
  handleDrop,
  editingTodo,
  editTitle,
  setEditTitle,
  editDescription,
  setEditDescription,
  editStatus,
  setEditStatus,
  editTags,
  setEditTags,
  editDueDate,
  setEditDueDate,
  editAssignedTo,
  setEditAssignedTo,
  users,
  currentUser,
  handleSaveEdit,
  setEditingTodo,
  toggleTodoStatus,
  handleEditTodo,
  handleDeleteTodo,
  handleDragStart,
  handleDragEnd,
  draggedTodo,
  formatDate,
  isOverdue,
  handleStartPomodoro,
  t,
}: {
  title: string
  todos: Todo[]
  status: TodoStatus
  dragOverStatus: TodoStatus | null
  handleDragOver: (e: React.DragEvent, status: TodoStatus) => void
  handleDrop: (e: React.DragEvent, status: TodoStatus) => Promise<void>
  editingTodo: Id<'todos'> | null
  editTitle: string
  setEditTitle: (title: string) => void
  editDescription: string
  setEditDescription: (desc: string) => void
  editStatus: TodoStatus
  setEditStatus: (status: TodoStatus) => void
  editTags: string[]
  setEditTags: (tags: string[]) => void
  editDueDate: string
  setEditDueDate: (date: string) => void
  editAssignedTo?: Id<'users'>
  setEditAssignedTo: (userId?: Id<'users'>) => void
  users: any
  currentUser: any
  handleSaveEdit: () => Promise<void>
  setEditingTodo: (id: Id<'todos'> | null) => void
  toggleTodoStatus: any
  handleEditTodo: (todo: Todo) => void
  handleDeleteTodo: (id: Id<'todos'>) => Promise<void>
  handleDragStart: (e: React.DragEvent, todo: Todo) => void
  handleDragEnd: () => void
  draggedTodo: Todo | null
  formatDate: (timestamp: number) => string
  isOverdue: (dueDate: number) => boolean
  handleStartPomodoro: (todo: Todo) => void
  t: any
}) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const getStatusBorder = () => {
    switch (status) {
      case 'todo':
        return 'border-t-4 border-blue-500'
      case 'in_progress':
        return 'border-t-4 border-yellow-500'
      case 'done':
        return 'border-t-4 border-green-500'
      default:
        return 'border-t-4 border-gray-500'
    }
  }

  const getDragOverBorder = () => {
    if (dragOverStatus !== status)
      return ''
    switch (status) {
      case 'todo':
        return 'border-2 border-dashed border-blue-500'
      case 'in_progress':
        return 'border-2 border-dashed border-yellow-500'
      case 'done':
        return 'border-2 border-dashed border-green-500'
      default:
        return 'border-2 border-dashed border-gray-500'
    }
  }

  return (
    <div className="space-y-4">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <span className="ml-2 px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
            {todos.length}
          </span>
        </div>
        <button
          type="button"
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label={isCollapsed ? 'Expand column' : 'Collapse column'}
        >
          {isCollapsed ? <ChevronDownIcon className="h-5 w-5" /> : <ChevronUpIcon className="h-5 w-5" />}
        </button>
      </div>
      <div
        className={`p-4 rounded-lg ${getStatusBorder()} ${getDragOverBorder() || 'border border-gray-200 dark:border-gray-700'} ${isCollapsed ? 'h-0 min-h-0 p-0 overflow-hidden opacity-0' : 'min-h-[200px] opacity-100'} transition-all duration-300`}
        onDragOver={e => handleDragOver(e, status)}
        onDrop={e => void handleDrop(e, status)}
      >
        {todos.map((todo, index) => (
          <TodoCard
            key={todo._id}
            todo={todo}
            isEditing={editingTodo === todo._id}
            style={{ animationDelay: `${index * 50}ms` }}
            editingTodo={editingTodo}
            editTitle={editTitle}
            setEditTitle={setEditTitle}
            editDescription={editDescription}
            setEditDescription={setEditDescription}
            editStatus={editStatus}
            setEditStatus={setEditStatus}
            editTags={editTags}
            setEditTags={setEditTags}
            editDueDate={editDueDate}
            setEditDueDate={setEditDueDate}
            editAssignedTo={editAssignedTo}
            setEditAssignedTo={setEditAssignedTo}
            users={users}
            currentUser={currentUser}
            handleSaveEdit={handleSaveEdit}
            setEditingTodo={setEditingTodo}
            toggleTodoStatus={toggleTodoStatus}
            handleEditTodo={handleEditTodo}
            handleDeleteTodo={handleDeleteTodo}
            handleDragStart={handleDragStart}
            handleDragEnd={handleDragEnd}
            draggedTodo={draggedTodo}
            dragOverStatus={dragOverStatus}
            formatDate={formatDate}
            isOverdue={isOverdue}
            handleStartPomodoro={handleStartPomodoro}
            t={t}
          />
        ))}
        {todos.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <div className="text-4xl mb-2">📝</div>
            <p className="text-sm">{t('todos.noTodosInColumn')}</p>
          </div>
        )}
      </div>
    </div>
  )
}

interface TodosPageProps {
  sidebarOpen?: boolean
  setSidebarOpen?: () => void
}

export function TodosPage({ setSidebarOpen: setAppSidebarOpen }: TodosPageProps = {}) {
  const { t } = useTranslation()

  // Use paginated query for online-first todos
  const {
    results: todos,
    status: paginationStatus,
    loadMore,
  } = usePaginatedQuery(
    api.todos.getTodos,
    {},
    { initialNumItems: 20 },
  )
  const createTodo = useMutation(api.todos.createTodo)
  const updateTodo = useMutation(api.todos.updateTodo)
  const deleteTodo = useMutation(api.todos.deleteTodo)
  const toggleTodoStatus = useMutation(api.todos.toggleTodoStatus)

  // Still get users for UserSelector component
  const users = useQuery(api.users.getUsers)
  const currentUser = useQuery(api.users.getCurrentUser)

  // Local state for UI interactions
  const [isCreating, setIsCreating] = useState(false)

  const [newTodoTitle, setNewTodoTitle] = useState('')
  const [newTodoTags, setNewTodoTags] = useState<string[]>([])
  const [newTodoAssignedTo, setNewTodoAssignedTo] = useState<Id<'users'> | undefined>()
  const [editingTodo, setEditingTodo] = useState<Id<'todos'> | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editStatus, setEditStatus] = useState<TodoStatus>('todo')
  const [editTags, setEditTags] = useState<string[]>([])
  const [editAssignedTo, setEditAssignedTo] = useState<Id<'users'> | undefined>()
  const [editDueDate, setEditDueDate] = useState<string>('')
  const [draggedTodo, setDraggedTodo] = useState<Todo | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<TodoStatus | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, string | string[]>>({
    status: '',
  })
  const [mobileView, setMobileView] = useState<'board' | 'list'>('board')
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  // Pomodoro state
  const [activePomodoroTodo, setActivePomodoroTodo] = useState<Todo | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  // Filter and search logic with online todos
  const getFilteredTodos = () => {
    let filtered = todos || []

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(todo =>
        todo.title.toLowerCase().includes(query)
        || (todo.description && todo.description.toLowerCase().includes(query)),
      )
    }

    // Apply status filter
    if (activeFilters.status) {
      const status = activeFilters.status as TodoStatus
      filtered = filtered.filter(todo => todo.status === status)
    }

    // Group by status
    return {
      todo: filtered.filter(t => t.status === 'todo'),
      inProgress: filtered.filter(t => t.status === 'in_progress'),
      done: filtered.filter(t => t.status === 'done'),
    }
  }

  const filteredTodos = getFilteredTodos()

  // Filter configurations
  const filterConfigs: FilterConfig[] = [
    {
      key: 'status',
      label: t('common.status'),
      options: [
        { value: '', label: t('common.all') },
        { value: 'todo', label: t('todos.statuses.todo') },
        { value: 'in_progress', label: t('todos.statuses.in_progress') },
        { value: 'done', label: t('todos.statuses.done') },
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
      status: '',
    })
    setSearchQuery('')
  }

  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTodoTitle.trim() || isCreating)
      return

    const title = newTodoTitle.trim()
    setIsCreating(true)

    try {
      const createData: any = {
        title,
        tags: newTodoTags,
      }

      // Only include assignedToUserId if it has a value
      if (newTodoAssignedTo) {
        createData.assignedToUserId = newTodoAssignedTo
      }

      await createTodo(createData)

      setNewTodoTitle('')
      setNewTodoTags([])
      setNewTodoAssignedTo(undefined)
    }
    catch (error) {
      console.error('Failed to create todo:', error)
    }
    finally {
      setIsCreating(false)
    }
  }

  const handleEditTodo = (todo: Todo) => {
    setEditingTodo(todo._id)
    setEditTitle(todo.title)
    setEditDescription(todo.description || '')
    setEditStatus(todo.status)
    setEditTags(todo.tags || [])
    setEditDueDate(todo.dueDate ? new Date(todo.dueDate).toISOString().split('T')[0] : '')
    setEditAssignedTo(todo.assignedToUserId)
  }

  const handleSaveEdit = async () => {
    if (!editingTodo || !editTitle.trim())
      return

    const updates: any = {
      title: editTitle.trim(),
      status: editStatus,
      tags: editTags,
    }

    // Only include optional fields if they have meaningful values
    if (editDescription?.trim()) {
      updates.description = editDescription.trim()
    }
    if (editDueDate) {
      updates.dueDate = new Date(editDueDate).getTime()
    }
    if (editAssignedTo) {
      updates.assignedToUserId = editAssignedTo
    }

    setEditingTodo(null)

    try {
      await updateTodo({ id: editingTodo, ...updates })
    }
    catch (error) {
      console.error('Failed to update todo:', error)
    }
  }

  const handleDeleteTodo = async (id: Id<'todos'> | string) => {
    try {
      await deleteTodo({ id: id as Id<'todos'> })
    }
    catch (error) {
      console.error('Failed to delete todo:', error)
    }
  }

  const handleDragStart = (e: React.DragEvent, todo: Todo) => {
    setDraggedTodo(todo)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, status: TodoStatus) => {
    e.preventDefault()
    setDragOverStatus(status)
  }

  const handleDrop = async (e: React.DragEvent, status: TodoStatus) => {
    e.preventDefault()
    if (!draggedTodo || draggedTodo.status === status)
      return

    const todoId = draggedTodo._id || draggedTodo.tempId
    const statusLabels = {
      todo: t('todos.statuses.todo'),
      in_progress: t('todos.statuses.in_progress'),
      done: t('todos.statuses.done'),
    }

    setDraggedTodo(null)
    setDragOverStatus(null)

    try {
      await updateTodo({ id: todoId as Id<'todos'>, status })
      toast.success(t('toasts.todoMoved'), {
        description: t('toasts.todoMovedDesc', { status: statusLabels[status] }),
      })
    }
    catch (error) {
      console.error('Failed to update todo status:', error)
      toast.error(t('toasts.operationError'), {
        description: t('toasts.operationErrorDesc'),
      })
    }
  }

  const handleDragEnd = () => {
    setDraggedTodo(null)
    setDragOverStatus(null)
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) {
      return t('todos.dueToday')
    }
    else if (date.toDateString() === tomorrow.toDateString()) {
      return t('todos.dueTomorrow')
    }
    else {
      return date.toLocaleDateString()
    }
  }

  const isOverdue = (dueDate: number) => {
    return new Date(dueDate) < new Date()
  }

  // Pomodoro handlers
  const handleStartPomodoro = (todo: Todo) => {
    setActivePomodoroTodo(todo)
    toast.success(t('todos.pomodoro.focusSessionStarted'))
  }

  const handleClosePomodoro = () => {
    setActivePomodoroTodo(null)
    toast.info(t('todos.pomodoro.focusSessionStopped'))
  }

  const handleCompletePomodoroSession = () => {
    toast.success(t('todos.pomodoro.allSessionsComplete'), {
      description: t('todos.pomodoro.greatJob'),
    })
    setActivePomodoroTodo(null)
  }

  // Show loading only on initial load
  if (paginationStatus === 'LoadingInitial') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white" />
      </div>
    )
  }

  return (
    <div className="flex h-full bg-white dark:bg-gray-900 relative">
      {/* Pomodoro Timer Modal */}
      {activePomodoroTodo && (
        <PomodoroTimer
          todoTitle={activePomodoroTodo.title}
          onClose={handleClosePomodoro}
          onComplete={handleCompletePomodoroSession}
        />
      )}
      {/* Mobile filters overlay */}
      {showMobileFilters && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setShowMobileFilters(false)}
        />
      )}

      {/* Mobile Filters Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-full max-w-sm bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out
        lg:hidden
        ${showMobileFilters ? 'translate-x-0' : '-translate-x-full'}
      `}
      >
        <div className="flex flex-col h-full">
          {/* Mobile filters header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('todos.filtersAndSearch')}</h2>
            <button
              type="button"
              onClick={() => setShowMobileFilters(false)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Search and Filters - Mobile */}
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('todos.searchTasks')}
              </label>
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={t('todos.searchPlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('todos.filterByStatus')}
              </label>
              <FilterBar
                filters={filterConfigs}
                activeFilters={activeFilters}
                onFilterChange={handleFilterChange}
                onClearAll={clearAllFilters}
              />
            </div>

            {/* View Toggle - Mobile */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('todos.viewMode')}
              </label>
              <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setMobileView('board')}
                  className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                    mobileView === 'board'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {t('todos.board')}
                </button>
                <button
                  type="button"
                  onClick={() => setMobileView('list')}
                  className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                    mobileView === 'list'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {t('todos.list')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 lg:hidden">
          <button
            type="button"
            onClick={() => {
              if (setAppSidebarOpen) {
                setAppSidebarOpen()
              }
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Bars3Icon className="h-5 w-5" />
            <span className="text-sm font-medium">{t('todos.menu')}</span>
          </button>

          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('todos.title')}
          </h1>

          <button
            type="button"
            onClick={() => setShowMobileFilters(true)}
            className="p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:block p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {t('todos.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {t('todos.subtitle')}
            </p>
          </div>

          {/* Search and Filters - Desktop */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={t('todos.searchPlaceholder')}
              />
            </div>
            <FilterBar
              filters={filterConfigs}
              activeFilters={activeFilters}
              onFilterChange={handleFilterChange}
              onClearAll={clearAllFilters}
            />
          </div>

        </div>

        {/* Quick Add - Mobile */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 lg:hidden">
          <form
            onSubmit={(e) => {
              void handleCreateTodo(e)
            }}
            className="space-y-2"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={newTodoTitle}
                onChange={e => setNewTodoTitle(e.target.value)}
                placeholder={t('todos.addPlaceholder')}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <button
                type="submit"
                disabled={isCreating || !newTodoTitle.trim()}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 disabled:bg-blue-400 disabled:cursor-not-allowed"
              >
                {isCreating
                  ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    )
                  : (
                      <PlusIcon className="h-4 w-4" />
                    )}
                <span className="hidden sm:inline">{isCreating ? (t('common.adding') || 'Adding...') : t('common.add')}</span>
              </button>
            </div>
            <UserSelector
              users={users}
              selectedUserId={newTodoAssignedTo}
              onUserSelect={setNewTodoAssignedTo}
              currentUserId={currentUser?._id}
              placeholder={t('todos.assignToPlaceholder')}
              className="w-full"
            />
          </form>
        </div>

        {/* Quick Add - Desktop */}
        <div className="hidden lg:block px-4 sm:px-6 py-4">
          <form
            onSubmit={(e) => {
              void handleCreateTodo(e)
            }}
            className="space-y-3"
          >
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={newTodoTitle}
                onChange={e => setNewTodoTitle(e.target.value)}
                placeholder={t('todos.addPlaceholder')}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                data-onboarding="add-todo-input"
              />
              <button
                type="submit"
                disabled={isCreating || !newTodoTitle.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:bg-blue-400 disabled:cursor-not-allowed"
                data-onboarding="add-todo-button"
              >
                {isCreating
                  ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    )
                  : (
                      <PlusIcon className="h-4 w-4" />
                    )}
                {isCreating ? t('common.adding') || 'Adding...' : t('common.add')}
              </button>
            </div>
            <div className="flex gap-2">
              <UserSelector
                users={users}
                selectedUserId={newTodoAssignedTo}
                onUserSelect={setNewTodoAssignedTo}
                currentUserId={currentUser?._id}
                placeholder={t('todos.assignToPlaceholder')}
                className="flex-1"
              />
            </div>
          </form>
        </div>

        {/* Board Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          {/* Mobile List View */}
          {mobileView === 'list' && (
            <div className="lg:hidden space-y-4">
              {['todo', 'in_progress', 'done'].map((status) => {
                const statusTodos = filteredTodos[status as keyof typeof filteredTodos]
                const statusLabel = {
                  todo: t('todos.statuses.todo'),
                  in_progress: t('todos.statuses.in_progress'),
                  done: t('todos.statuses.done'),
                }[status]

                return (
                  <div key={status} className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center justify-between">
                      {statusLabel}
                      <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                        {statusTodos.length}
                      </span>
                    </h3>
                    <div className="space-y-2">
                      {statusTodos.map((todo, index) => (
                        <TodoCard
                          key={todo._id}
                          todo={todo}
                          isEditing={editingTodo === todo._id}
                          style={{ animationDelay: `${index * 50}ms` }}
                          editingTodo={editingTodo}
                          editTitle={editTitle}
                          setEditTitle={setEditTitle}
                          editDescription={editDescription}
                          setEditDescription={setEditDescription}
                          editStatus={editStatus}
                          setEditStatus={setEditStatus}
                          editTags={editTags}
                          setEditTags={setEditTags}
                          editDueDate={editDueDate}
                          setEditDueDate={setEditDueDate}
                          handleSaveEdit={handleSaveEdit}
                          setEditingTodo={setEditingTodo}
                          toggleTodoStatus={toggleTodoStatus}
                          handleEditTodo={handleEditTodo}
                          handleDeleteTodo={handleDeleteTodo}
                          handleDragStart={handleDragStart}
                          handleDragEnd={handleDragEnd}
                          draggedTodo={draggedTodo}
                          dragOverStatus={dragOverStatus}
                          formatDate={formatDate}
                          isOverdue={isOverdue}
                          t={t}
                          editAssignedTo={editAssignedTo}
                          setEditAssignedTo={setEditAssignedTo}
                          users={users}
                          currentUser={currentUser}
                          handleStartPomodoro={handleStartPomodoro}
                        />
                      ))}
                      {statusTodos.length === 0 && (
                        <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                          <p className="text-sm">
                            {t('todos.noTasks', { status: statusLabel.toLowerCase() })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Kanban Board View */}
          <div className={`${mobileView === 'board' ? '' : 'hidden lg:block'} grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 h-full`} data-onboarding="kanban-board">
            <TodoColumn
              title={t('todos.statuses.todo')}
              todos={filteredTodos.todo}
              status="todo"
              dragOverStatus={dragOverStatus}
              handleDragOver={handleDragOver}
              handleDrop={handleDrop}
              editingTodo={editingTodo}
              editTitle={editTitle}
              setEditTitle={setEditTitle}
              editDescription={editDescription}
              setEditDescription={setEditDescription}
              editStatus={editStatus}
              setEditStatus={setEditStatus}
              editTags={editTags}
              setEditTags={setEditTags}
              editDueDate={editDueDate}
              setEditDueDate={setEditDueDate}
              handleSaveEdit={handleSaveEdit}
              setEditingTodo={setEditingTodo}
              toggleTodoStatus={toggleTodoStatus}
              handleEditTodo={handleEditTodo}
              handleDeleteTodo={handleDeleteTodo}
              handleDragStart={handleDragStart}
              handleDragEnd={handleDragEnd}
              draggedTodo={draggedTodo}
              formatDate={formatDate}
              isOverdue={isOverdue}
              handleStartPomodoro={handleStartPomodoro}
              t={t}
            />
            <TodoColumn
              title={t('todos.statuses.in_progress')}
              todos={filteredTodos.inProgress}
              status="in_progress"
              dragOverStatus={dragOverStatus}
              handleDragOver={handleDragOver}
              handleDrop={handleDrop}
              editingTodo={editingTodo}
              editTitle={editTitle}
              setEditTitle={setEditTitle}
              editDescription={editDescription}
              setEditDescription={setEditDescription}
              editStatus={editStatus}
              setEditStatus={setEditStatus}
              editTags={editTags}
              setEditTags={setEditTags}
              editDueDate={editDueDate}
              setEditDueDate={setEditDueDate}
              handleSaveEdit={handleSaveEdit}
              setEditingTodo={setEditingTodo}
              toggleTodoStatus={toggleTodoStatus}
              handleEditTodo={handleEditTodo}
              handleDeleteTodo={handleDeleteTodo}
              handleDragStart={handleDragStart}
              handleDragEnd={handleDragEnd}
              draggedTodo={draggedTodo}
              formatDate={formatDate}
              isOverdue={isOverdue}
              handleStartPomodoro={handleStartPomodoro}
              t={t}
              editAssignedTo={editAssignedTo}
              setEditAssignedTo={setEditAssignedTo}
              users={users}
              currentUser={currentUser}
            />
            <TodoColumn
              title={t('todos.statuses.done')}
              todos={filteredTodos.done}
              status="done"
              dragOverStatus={dragOverStatus}
              handleDragOver={handleDragOver}
              handleDrop={handleDrop}
              editingTodo={editingTodo}
              editTitle={editTitle}
              setEditTitle={setEditTitle}
              editDescription={editDescription}
              setEditDescription={setEditDescription}
              editStatus={editStatus}
              setEditStatus={setEditStatus}
              editTags={editTags}
              setEditTags={setEditTags}
              editDueDate={editDueDate}
              setEditDueDate={setEditDueDate}
              handleSaveEdit={handleSaveEdit}
              setEditingTodo={setEditingTodo}
              toggleTodoStatus={toggleTodoStatus}
              handleEditTodo={handleEditTodo}
              handleDeleteTodo={handleDeleteTodo}
              handleDragStart={handleDragStart}
              handleDragEnd={handleDragEnd}
              draggedTodo={draggedTodo}
              formatDate={formatDate}
              isOverdue={isOverdue}
              handleStartPomodoro={handleStartPomodoro}
              t={t}
              editAssignedTo={editAssignedTo}
              setEditAssignedTo={setEditAssignedTo}
              users={users}
              currentUser={currentUser}
            />
          </div>

          {paginationStatus === 'CanLoadMore' && (
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => loadMore(10)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t('common.loadMore')}
              </button>
            </div>
          )}
          {paginationStatus === 'LoadingMore' && (
            <div className="text-center mt-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
