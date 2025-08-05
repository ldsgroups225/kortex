import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { SearchBar } from './SearchBar';
import { FilterBar, FilterConfig } from './FilterBar';
import { TagBadge } from './TagBadge';
import { CopyButton } from './CopyButton';
import { useTranslation } from 'react-i18next';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  StarIcon,
  TrashIcon,
  ClockIcon,
  DocumentDuplicateIcon,
  PencilIcon,
  TagIcon,
  CodeBracketIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  { value: 'typescript', label: 'TypeScript', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  { value: 'python', label: 'Python', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  { value: 'java', label: 'Java', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  { value: 'css', label: 'CSS', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  { value: 'html', label: 'HTML', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  { value: 'sql', label: 'SQL', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' },
  { value: 'bash', label: 'Bash', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
  { value: 'json', label: 'JSON', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200' },
  { value: 'markdown', label: 'Markdown', color: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200' },
  { value: 'text', label: 'Text', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
];

const DEFAULT_CATEGORIES = ['General', 'Code', 'Prompts', 'Templates', 'Commands'];

export function SnippetsPage() {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<Id<"snippets"> | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Id<"snippets"> | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState<Id<"snippets"> | null>(null);
  const [activeFilters, setActiveFilters] = useState<Record<string, string | string[]>>({
    language: '',
    category: '',
    pinned: '',
  });

  // Queries
  const snippets = useQuery(api.snippets.getUserSnippets, {
    category: selectedCategory || undefined
  });
  const searchResults = useQuery(api.snippets.searchSnippets, {
    query: searchQuery,
    category: selectedCategory || undefined
  });
  const userCategories = useQuery(api.snippets.getUserCategories) || [];
  const editingSnippetData = useQuery(api.snippets.getSnippet,
    editingSnippet ? { snippetId: editingSnippet } : "skip"
  );

  // Mutations
  const createSnippet = useMutation(api.snippets.createSnippet);
  const updateSnippet = useMutation(api.snippets.updateSnippet);
  const deleteSnippet = useMutation(api.snippets.deleteSnippet);
  const togglePin = useMutation(api.snippets.togglePin);

  // Filter and search logic
  const getFilteredSnippets = () => {
    let filteredSnippets = searchQuery.trim() ? searchResults : snippets;

    if (!filteredSnippets) return [];

    // Apply filters
    if (activeFilters.language) {
      filteredSnippets = filteredSnippets.filter(snippet => snippet.language === activeFilters.language);
    }

    if (activeFilters.category) {
      filteredSnippets = filteredSnippets.filter(snippet => snippet.category === activeFilters.category);
    }

    if (activeFilters.pinned === 'pinned') {
      filteredSnippets = filteredSnippets.filter(snippet => snippet.pinned);
    } else if (activeFilters.pinned === 'unpinned') {
      filteredSnippets = filteredSnippets.filter(snippet => !snippet.pinned);
    }

    return filteredSnippets;
  };

  const displayedSnippets = getFilteredSnippets();
  const allCategories = [...new Set([...DEFAULT_CATEGORIES, ...userCategories])].sort();

  // Filter configurations
  const filterConfigs: FilterConfig[] = [
    {
      key: 'language',
      label: t('common.language'),
      options: [
        { value: '', label: t('common.all') },
        ...LANGUAGES.map(lang => ({ value: lang.value, label: lang.label })),
      ],
    },
    {
      key: 'category',
      label: t('common.category'),
      options: [
        { value: '', label: t('common.all') },
        ...allCategories.map(cat => ({ value: cat, label: cat })),
      ],
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
  ];

  const handleFilterChange = (key: string, value: string | string[]) => {
    setActiveFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearAllFilters = () => {
    setActiveFilters({
      language: '',
      category: '',
      pinned: '',
    });
    setSearchQuery('');
  };

  const getLanguageStyle = (language?: string) => {
    const lang = LANGUAGES.find(l => l.value === language);
    return lang ? lang.color : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  };

  const copyToClipboard = async (content: string, snippetId: Id<"snippets">) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedSnippet(snippetId);
      setTimeout(() => setCopiedSnippet(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleCreateSnippet = () => {
    setEditingSnippet(null);
    setShowEditor(true);
  };

  const handleEditSnippet = (snippetId: Id<"snippets">) => {
    setEditingSnippet(snippetId);
    setShowEditor(true);
  };

  const handleDeleteSnippet = async (snippetId: Id<"snippets">) => {
    try {
      await deleteSnippet({ snippetId });
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete snippet:', error);
    }
  };

  const handleTogglePin = async (snippetId: Id<"snippets">) => {
    try {
      await togglePin({ snippetId });
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('snippets.title')}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {displayedSnippets?.length || 0} {t('snippets.title').toLowerCase()}
          </p>
        </div>
        <button
          onClick={handleCreateSnippet}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <PlusIcon className="h-4 w-4" />
          {t('snippets.addSnippet')}
        </button>
      </div>

      {/* Search */}
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder={t('snippets.searchSnippets')}
        className="w-full"
      />

      {/* Filters */}
      <FilterBar
        filters={filterConfigs}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
        onClearAll={clearAllFilters}
        className="w-full"
      />

      {/* Snippets Grid */}
      {displayedSnippets?.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-center">
          <CodeBracketIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchQuery ? 'No snippets found' : 'No snippets yet'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {searchQuery ? 'Try adjusting your search terms' : 'Save your first code snippet or prompt'}
          </p>
          {!searchQuery && (
            <button
              onClick={handleCreateSnippet}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Create First Snippet
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayedSnippets?.map((snippet) => (
            <div
              key={snippet._id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-shadow group"
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-white truncate flex-1">
                    {snippet.title}
                  </h4>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => void handleTogglePin(snippet._id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-opacity"
                      title={snippet.pinned ? 'Unpin' : 'Pin'}
                    >
                      {snippet.pinned ? (
                        <StarIconSolid className="h-4 w-4 text-yellow-500" />
                      ) : (
                        <StarIcon className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                    <button
                      onClick={() => handleEditSnippet(snippet._id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-opacity"
                      title="Edit"
                    >
                      <PencilIcon className="h-4 w-4 text-gray-400" />
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(snippet._id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-opacity"
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  {snippet.language && (
                    <span className={`px-2 py-1 rounded-full ${getLanguageStyle(snippet.language)}`}>
                      {LANGUAGES.find(l => l.value === snippet.language)?.label || snippet.language}
                    </span>
                  )}
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full flex items-center gap-1">
                    <TagIcon className="h-3 w-3" />
                    {snippet.category}
                  </span>
                </div>
              </div>

              {/* Content Preview */}
              <div className="p-4">
                <pre className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-3 rounded border overflow-hidden">
                  <code className="line-clamp-4">
                    {snippet.content.length > 200
                      ? snippet.content.substring(0, 200) + '...'
                      : snippet.content
                    }
                  </code>
                </pre>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <ClockIcon className="h-3 w-3" />
                  {formatDate(snippet._creationTime)}
                </div>

                <CopyButton
                  content={snippet.content}
                  variant="button"
                  size="sm"
                  showText={true}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Snippet Editor Modal */}
      {showEditor && (
        <SnippetEditor
          snippet={editingSnippetData}
          categories={allCategories}
          onSave={async (data) => {
            try {
              if (editingSnippet) {
                await updateSnippet({ snippetId: editingSnippet, ...data });
              } else {
                await createSnippet(data);
              }
              setShowEditor(false);
              setEditingSnippet(null);
            } catch (error) {
              console.error('Failed to save snippet:', error);
            }
          }}
          onCancel={() => {
            setShowEditor(false);
            setEditingSnippet(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Delete Snippet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this snippet? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleDeleteSnippet(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface SnippetEditorProps {
  snippet?: any;
  categories: string[];
  onSave: (data: {
    title: string;
    content: string;
    language?: string;
    category: string;
  }) => Promise<void>;
  onCancel: () => void;
}

function SnippetEditor({ snippet, categories, onSave, onCancel }: SnippetEditorProps) {
  const [title, setTitle] = useState(snippet?.title || '');
  const [content, setContent] = useState(snippet?.content || '');
  const [language, setLanguage] = useState(snippet?.language || '');
  const [category, setCategory] = useState(snippet?.category || 'General');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (snippet) {
      setTitle(snippet.title || '');
      setContent(snippet.content || '');
      setLanguage(snippet.language || '');
      setCategory(snippet.category || 'General');
    }
  }, [snippet]);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return;

    setIsSaving(true);
    try {
      await onSave({
        title: title.trim(),
        content: content.trim(),
        language: language || undefined,
        category: isCustomCategory ? customCategory.trim() : category,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {snippet ? 'Edit Snippet' : 'Create New Snippet'}
          </h3>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter snippet title..."
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
            />
          </div>

          {/* Language and Category Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Language */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
              >
                <option value="">Select language...</option>
                {LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category *
              </label>
              <div className="space-y-2">
                <select
                  value={isCustomCategory ? '' : category}
                  onChange={(e) => {
                    if (e.target.value) {
                      setCategory(e.target.value);
                      setIsCustomCategory(false);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
                >
                  <option value="">Select category...</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="customCategory"
                    checked={isCustomCategory}
                    onChange={(e) => setIsCustomCategory(e.target.checked)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <label htmlFor="customCategory" className="text-sm text-gray-700 dark:text-gray-300">
                    Create new category
                  </label>
                </div>
                {isCustomCategory && (
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Enter new category..."
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Content *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter your code snippet or prompt..."
              rows={12}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none font-mono text-sm resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={!title.trim() || !content.trim() || isSaving}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Snippet'}
          </button>
        </div>
      </div>
    </div>
  );
}
