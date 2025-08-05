import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useRef, useEffect } from "react";
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

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

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
    if (!confirm("Are you sure you want to delete this task?")) return;

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
      return "Today";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
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
      case "todo": return "To Do";
      case "in_progress": return "In Progress";
      case "done": return "Done";
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
            placeholder="Task title"
          />
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Description (optional)"
            rows={2}
          />
          <div className="flex gap-2">
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as TodoStatus)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
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
              onClick={handleSaveEdit}
              className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => setEditingTodo(null)}
              className="px-3 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-3">
            <button
              onClick={() => toggleTodoStatus({ id: todo._id })}
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
                    {isOverdue(todo.dueDate) && " (Overdue)"}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleEditTodo(todo)}
                className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDeleteTodo(todo._id)}
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
          onDrop={(e) => handleDrop(e, status)}
        >
          {todos.map((todo) => (
            <TodoCard key={todo._id} todo={todo} isEditing={editingTodo === todo._id} />
          ))}
          {todos.length === 0 && (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              No tasks here
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
          Tasks
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Organize your tasks and track your progress
        </p>
      </div>

      {/* Quick Add */}
      <div className="mb-6">
        <form onSubmit={handleCreateTodo} className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={newTodoTitle}
            onChange={(e) => setNewTodoTitle(e.target.value)}
            placeholder="Add a new task..."
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          <button
            type="submit"
            disabled={!newTodoTitle.trim()}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Add Task
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
          {showCompleted ? "Hide" : "Show"} completed tasks
        </button>
      </div>

      {/* Todo Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TodoColumn
          title="To Do"
          todos={todos.todo}
          status="todo"
          color="bg-blue-100 border-blue-300 dark:bg-blue-900/20 dark:border-blue-700"
        />
        <TodoColumn
          title="In Progress"
          todos={todos.inProgress}
          status="in_progress"
          color="bg-yellow-100 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-700"
        />
        <TodoColumn
          title="Done"
          todos={showCompleted ? todos.done : []}
          status="done"
          color="bg-green-100 border-green-300 dark:bg-green-900/20 dark:border-green-700"
        />
      </div>

      {/* Empty State */}
      {todos.todo.length === 0 && todos.inProgress.length === 0 && todos.done.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <CheckIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No tasks yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Get started by adding your first task above
          </p>
        </div>
      )}
    </div>
  );
} 
