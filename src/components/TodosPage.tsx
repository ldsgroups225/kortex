import type { Id } from '../../convex/_generated/dataModel'
import type { FilterConfig } from './FilterBar'
import {
  CalendarIcon,
  CheckIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { useMutation, useQuery } from 'convex/react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../../convex/_generated/api'
import { CopyButton } from './CopyButton'
import { FilterBar } from './FilterBar'
import { SearchBar } from './SearchBar'

type TodoStatus = 'todo' | 'in_progress' | 'done'

interface Todo {
  _id: Id<'todos'>
  _creationTime: number
  userId: Id<'users'>
  title: string
  description?: string
  status: TodoStatus
  dueDate?: number
  createdAt?: number
  updatedAt?: number
}

export function TodosPage() {
  const { t } = useTranslation()
  const todos = useQuery(api.todos.getTodos)
  const createTodo = useMutation(api.todos.createTodo)
  const updateTodo = useMutation(api.todos.updateTodo)
  const deleteTodo = useMutation(api.todos.deleteTodo)
  const toggleTodoStatus = useMutation(api.todos.toggleTodoStatus)

  const [newTodoTitle, setNewTodoTitle] = useState('')
  const [editingTodo, setEditingTodo] = useState<Id<'todos'> | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editStatus, setEditStatus] = useState<TodoStatus>('todo')
  const [editDueDate, setEditDueDate] = useState<string>('')
  const [draggedTodo, setDraggedTodo] = useState<Todo | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<TodoStatus | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, string | string[]>>({
    status: '',
  })

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  // Filter and search logic
  const getFilteredTodos = () => {
    if (!todos)
      return { todo: [], inProgress: [], done: [] }

    let filteredTodos = todos

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filteredTodos = {
        todo: todos.todo.filter(todo =>
          todo.title.toLowerCase().includes(query)
          || (todo.description && todo.description.toLowerCase().includes(query)),
        ),
        inProgress: todos.inProgress.filter(todo =>
          todo.title.toLowerCase().includes(query)
          || (todo.description && todo.description.toLowerCase().includes(query)),
        ),
        done: todos.done.filter(todo =>
          todo.title.toLowerCase().includes(query)
          || (todo.description && todo.description.toLowerCase().includes(query)),
        ),
      }
    }

    // Apply status filter
    if (activeFilters.status) {
      const status = activeFilters.status as TodoStatus
      filteredTodos = {
        todo: status === 'todo' ? filteredTodos.todo : [],
        inProgress: status === 'in_progress' ? filteredTodos.inProgress : [],
        done: status === 'done' ? filteredTodos.done : [],
      }
    }

    return filteredTodos
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
    if (!newTodoTitle.trim())
      return

    try {
      await createTodo({
        title: newTodoTitle.trim(),
        description: '',
      })
      setNewTodoTitle('')
    }
    catch (error) {
      console.error('Failed to create todo:', error)
    }
  }

  const handleEditTodo = (todo: Todo) => {
    setEditingTodo(todo._id)
    setEditTitle(todo.title)
    setEditDescription(todo.description || '')
    setEditStatus(todo.status)
    setEditDueDate(todo.dueDate ? new Date(todo.dueDate).toISOString().split('T')[0] : '')
  }

  const handleSaveEdit = async () => {
    if (!editingTodo || !editTitle.trim())
      return

    try {
      await updateTodo({
        id: editingTodo,
        title: editTitle.trim(),
        description: editDescription,
        status: editStatus,
        dueDate: editDueDate ? new Date(editDueDate).getTime() : undefined,
      })
      setEditingTodo(null)
    }
    catch (error) {
      console.error('Failed to update todo:', error)
    }
  }

  const handleDeleteTodo = async (id: Id<'todos'>) => {
    // TODO: Replace with proper confirmation dialog

    try {
      await deleteTodo({ id })
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

    try {
      await updateTodo({ id: draggedTodo._id, status })
    }
    catch (error) {
      console.error('Failed to update todo status:', error)
    }
    setDraggedTodo(null)
    setDragOverStatus(null)
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

  if (!todos) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    )
  }

  // Nested components with access to component state
  function TodoCard({ todo, isEditing }: { todo: Todo, isEditing: boolean }) {
    return (
      <div
        className={`group relative bg-white dark:bg-gray-800 rounded-lg border p-4 mb-3 transition-all duration-200 hover:shadow-md ${draggedTodo?._id === todo._id ? 'opacity-50' : ''
        } ${dragOverStatus === todo.status ? 'ring-2 ring-blue-500' : ''}`}
        draggable
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
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      void toggleTodoStatus({ id: todo._id })
                    }}
                    className={`flex-shrink-0 w-5 h-5 rounded border-2 transition-all duration-200 ${todo.status === 'done'
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300 dark:border-gray-600 hover:border-green-500'
                    }`}
                  >
                    {todo.status === 'done' && <CheckIcon className="w-3 h-3" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <h3 className={`font-medium text-gray-900 dark:text-white transition-all duration-200 ${todo.status === 'done' ? 'line-through text-gray-500 dark:text-gray-400' : ''
                    }`}
                    >
                      {todo.title}
                    </h3>
                    {todo.description && (
                      <p className={`text-sm text-gray-600 dark:text-gray-400 mt-1 ${todo.status === 'done' ? 'line-through' : ''
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
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <CopyButton
                      content={`${todo.title}${todo.description ? `\n\n${todo.description}` : ''}`}
                      size="sm"
                    />
                    <button
                      type="button"
                      onClick={() => handleEditTodo(todo)}
                      className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void handleDeleteTodo(todo._id)
                      }}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
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

  function TodoColumn({
    title,
    todos,
    status,
    color,
  }: {
    title: string
    todos: Todo[]
    status: TodoStatus
    color: string
  }) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
            {todos.length}
          </span>
        </div>
        <div
          className={`p-4 rounded-lg border-2 border-dashed ${color} min-h-[200px]`}
          onDragOver={e => handleDragOver(e, status)}
          onDrop={e => void handleDrop(e, status)}
        >
          {todos.map(todo => (
            <TodoCard key={todo._id} todo={todo} isEditing={editingTodo === todo._id} />
          ))}
          {todos.length === 0 && (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <div className="text-4xl mb-2">📝</div>
              <p className="text-sm">No todos</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {t('todos.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('dashboard.welcome')}
        </p>
      </div>

      {/* Quick Add */}
      <div className="mb-6">
        <form
          onSubmit={(e) => {
            void handleCreateTodo(e)
          }}
          className="flex gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={newTodoTitle}
            onChange={e => setNewTodoTitle(e.target.value)}
            placeholder={t('todos.addPlaceholder')}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            {t('common.add')}
          </button>
        </form>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
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

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TodoColumn
          title={t('todos.statuses.todo')}
          todos={filteredTodos.todo}
          status="todo"
          color="border-gray-300 dark:border-gray-600"
        />
        <TodoColumn
          title={t('todos.statuses.in_progress')}
          todos={filteredTodos.inProgress}
          status="in_progress"
          color="border-yellow-300 dark:border-yellow-600"
        />
        <TodoColumn
          title={t('todos.statuses.done')}
          todos={filteredTodos.done}
          status="done"
          color="border-green-300 dark:border-green-600"
        />
      </div>
    </div>
  )
}
