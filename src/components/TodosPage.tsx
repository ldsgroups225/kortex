import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useRef, useEffect } from "react";
import { SearchBar } from './SearchBar';
import { FilterBar, FilterConfig } from './FilterBar';
import { CopyButton } from './CopyButton';
import { useTranslation } from "react-i18next";
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  ClockIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from "@heroicons/react/24/outline";
import { Id } from "../../convex/_generated/dataModel";

type TodoStatus = "todo" | "in_progress" | "done";

interface Todo {
  _id: Id<"todos">;
  _creationTime: number;
  userId: Id<"users">;
  title: string;
  description?: string;
  status: TodoStatus;
  dueDate?: number;
  createdAt: number;
  updatedAt: number;
}

export function TodosPage() {
  const { t } = useTranslation();
  const todos = useQuery(api.todos.getTodos);
  const createTodo = useMutation(api.todos.createTodo);
  const updateTodo = useMutation(api.todos.updateTodo);
  const deleteTodo = useMutation(api.todos.deleteTodo);
  const toggleTodoStatus = useMutation(api.todos.toggleTodoStatus);

  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [editingTodo, setEditingTodo] = useState<Id<"todos"> | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<TodoStatus>("todo");
  const [editDueDate, setEditDueDate] = useState<string>("");
  const [showCompleted, setShowCompleted] = useState(true);
  const [draggedTodo, setDraggedTodo] = useState<Todo | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TodoStatus | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string | string[]>>({
    status: '',
  });

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Filter and search logic
  const getFilteredTodos = () => {
    if (!todos) return { todo: [], inProgress: [], done: [] };

    let filteredTodos = todos;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredTodos = {
        todo: todos.todo.filter(todo =>
          todo.title.toLowerCase().includes(query) ||
          (todo.description && todo.description.toLowerCase().includes(query))
        ),
        inProgress: todos.inProgress.filter(todo =>
          todo.title.toLowerCase().includes(query) ||
          (todo.description && todo.description.toLowerCase().includes(query))
        ),
        done: todos.done.filter(todo =>
          todo.title.toLowerCase().includes(query) ||
          (todo.description && todo.description.toLowerCase().includes(query))
        ),
      };
    }

    // Apply status filter
    if (activeFilters.status) {
      const status = activeFilters.status as TodoStatus;
      filteredTodos = {
        todo: status === 'todo' ? filteredTodos.todo : [],
        inProgress: status === 'in_progress' ? filteredTodos.inProgress : [],
        done: status === 'done' ? filteredTodos.done : [],
      };
    }

    return filteredTodos;
  };

  const displayedTodos = getFilteredTodos();

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
  ];

  const handleFilterChange = (key: string, value: string | string[]) => {
    setActiveFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearAllFilters = () => {
    setActiveFilters({
      status: '',
    });
    setSearchQuery('');
  };

  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim()) return;

    try {
      await createTodo({ title: newTodoTitle.trim() });
      setNewTodoTitle("");
    } catch (error) {
      console.error("Failed to create todo:", error);
    }
  };

  const handleEditTodo = (todo: Todo) => {
    setEditingTodo(todo._id);
    setEditTitle(todo.title);
    setEditDescription(todo.description || "");
    setEditStatus(todo.status);
    setEditDueDate(todo.dueDate ? new Date(todo.dueDate).toISOString().split('T')[0] : "");
  };

  const handleSaveEdit = async () => {
    if (!editingTodo || !editTitle.trim()) return;

    try {
      await updateTodo({
        id: editingTodo,
        title: editTitle.trim(),
        description: editDescription || undefined,
        status: editStatus,
        dueDate: editDueDate ? new Date(editDueDate).getTime() : undefined,
      });
      setEditingTodo(null);
      setEditTitle("");
      setEditDescription("");
      setEditStatus("todo");
      setEditDueDate("");
    } catch (error) {
      console.error("Failed to update todo:", error);
    }
  };

  const handleDeleteTodo = async (id: Id<"todos">) => {
    if (!confirm(t('todos.deleteConfirm'))) return;

    try {
      await deleteTodo({ id });
    } catch (error) {
      console.error("Failed to delete todo:", error);
    }
  };

  const handleDragStart = (e: React.DragEvent, todo: Todo) => {
    setDraggedTodo(todo);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, status: TodoStatus) => {
    e.preventDefault();
    setDragOverStatus(status);
  };

  const handleDrop = async (e: React.DragEvent, status: TodoStatus) => {
    e.preventDefault();
    if (!draggedTodo || draggedTodo.status === status) return;

    try {
      await updateTodo({ id: draggedTodo._id, status });
    } catch (error) {
      console.error("Failed to update todo status:", error);
    }
    setDraggedTodo(null);
    setDragOverStatus(null);
  };

  const handleDragEnd = () => {
    setDraggedTodo(null);
    setDragOverStatus(null);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return t('todos.dueToday');
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return t('todos.dueTomorrow');
    } else {
      return date.toLocaleDateString();
    }
  };

  const isOverdue = (dueDate: number) => {
    return new Date(dueDate) < new Date();
  };

  const getStatusColor = (status: TodoStatus) => {
    switch (status) {
      case "todo": return "bg-blue-100 border-blue-300 dark:bg-blue-900/20 dark:border-blue-700";
      case "in_progress": return "bg-yellow-100 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-700";
      case "done": return "bg-green-100 border-green-300 dark:bg-green-900/20 dark:border-green-700";
    }
  };

  const getStatusText = (status: TodoStatus) => {
    switch (status) {
      case "todo": return t('todos.statuses.todo');
      case "in_progress": return t('todos.statuses.in_progress');
      case "done": return t('todos.statuses.done');
    }
  };

  if (!todos) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  const TodoCard = ({ todo, isEditing }: { todo: Todo; isEditing: boolean }) => (
    <div
      className={`group relative bg-white dark:bg-gray-800 rounded-lg border p-4 mb-3 transition-all duration-200 hover:shadow-md ${draggedTodo?._id === todo._id ? "opacity-50" : ""
        } ${dragOverStatus === todo.status ? "ring-2 ring-blue-500" : ""}`}
      draggable
      onDragStart={(e) => handleDragStart(e, todo)}
      onDragEnd={handleDragEnd}
    >
      {isEditing ? (
        <div className="space-y-3">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t('common.title')}
          />
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t('todos.descriptionPlaceholder')}
            rows={2}
          />
          <div className="flex gap-2">
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as TodoStatus)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="todo">{t('todos.statuses.todo')}</option>
              <option value="in_progress">{t('todos.statuses.in_progress')}</option>
              <option value="done">{t('todos.statuses.done')}</option>
            </select>
            <input
              type="date"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                void handleSaveEdit();
              }}
              className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              {t('common.save')}
            </button>
            <button
              onClick={() => setEditingTodo(null)}
              className="px-3 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-3">
            <button
              onClick={() => {
                void toggleTodoStatus({ id: todo._id });
              }}
              className={`flex-shrink-0 w-5 h-5 rounded border-2 transition-all duration-200 ${todo.status === "done"
                ? "bg-green-500 border-green-500 text-white"
                : "border-gray-300 dark:border-gray-600 hover:border-green-500"
                }`}
            >
              {todo.status === "done" && <CheckIcon className="w-3 h-3" />}
            </button>

            <div className="flex-1 min-w-0">
              <h3 className={`font-medium text-gray-900 dark:text-white transition-all duration-200 ${todo.status === "done" ? "line-through text-gray-500 dark:text-gray-400" : ""
                }`}>
                {todo.title}
              </h3>
              {todo.description && (
                <p className={`text-sm text-gray-600 dark:text-gray-400 mt-1 ${todo.status === "done" ? "line-through" : ""
                  }`}>
                  {todo.description}
                </p>
              )}
              {todo.dueDate && (
                <div className="flex items-center gap-1 mt-2">
                  <CalendarIcon className="w-4 h-4 text-gray-400" />
                  <span className={`text-xs ${isOverdue(todo.dueDate) ? "text-red-500" : "text-gray-500 dark:text-gray-400"
                    }`}>
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
                onClick={() => handleEditTodo(todo)}
                className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  void handleDeleteTodo(todo._id);
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
  );

  const TodoColumn = ({
    title,
    todos,
    status,
    color
  }: {
    title: string;
    todos: Todo[];
    status: TodoStatus;
    color: string;
  }) => (
    <div className="flex-1 min-w-0">
      <div className={`${color} border rounded-lg p-4 mb-4`}>
        <h2 className="font-semibold text-gray-900 dark:text-white mb-3">
          {title} ({todos.length})
        </h2>

        <div
          className="min-h-[200px]"
          onDragOver={(e) => handleDragOver(e, status)}
          onDrop={(e) => {
            void handleDrop(e, status);
          }}
        >
          {todos.map((todo) => (
            <TodoCard key={todo._id} todo={todo} isEditing={editingTodo === todo._id} />
          ))}
          {todos.length === 0 && (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              {t('todos.noTodos')}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {t('todos.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('dashboard.welcome')}
        </p>
      </div>

      {/* Quick Add */}
      <div className="mb-6">
        <form onSubmit={(e) => {
          void handleCreateTodo(e);
        }} className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={newTodoTitle}
            onChange={(e) => setNewTodoTitle(e.target.value)}
            placeholder={t('todos.titlePlaceholder')}
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          <button
            type="submit"
            disabled={!newTodoTitle.trim()}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            {t('todos.addTodo')}
          </button>
        </form>
      </div>

      {/* Completed Tasks Toggle */}
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => setShowCompleted(!showCompleted)}
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          {showCompleted ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronUpIcon className="w-4 h-4" />}
          {showCompleted ? t('todos.hideCompleted') : t('todos.showCompleted')}
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <SearchBar
          placeholder={t('todos.searchTodos')}
          value={searchQuery}
          onChange={setSearchQuery}
        />
        <FilterBar
          filters={filterConfigs}
          activeFilters={activeFilters}
          onFilterChange={handleFilterChange}
          onClearAll={clearAllFilters}
        />
      </div>

      {/* Todo Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TodoColumn
          title={t('todos.columns.todo')}
          todos={displayedTodos.todo}
          status="todo"
          color="bg-blue-100 border-blue-300 dark:bg-blue-900/20 dark:border-blue-700"
        />
        <TodoColumn
          title={t('todos.columns.in_progress')}
          todos={displayedTodos.inProgress}
          status="in_progress"
          color="bg-yellow-100 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-700"
        />
        <TodoColumn
          title={t('todos.columns.done')}
          todos={showCompleted ? displayedTodos.done : []}
          status="done"
          color="bg-green-100 border-green-300 dark:bg-green-900/20 dark:border-green-700"
        />
      </div>

      {/* Empty State */}
      {displayedTodos.todo.length === 0 && displayedTodos.inProgress.length === 0 && displayedTodos.done.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <CheckIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t('todos.noTodos')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {t('todos.createFirstTodo')}
          </p>
        </div>
      )}
    </div>
  );
} 
