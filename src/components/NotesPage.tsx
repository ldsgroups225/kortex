import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { RichTextEditor } from './RichTextEditor';
import { TagInput } from './TagInput';
import { SearchBar } from './SearchBar';
import { FilterBar, FilterConfig } from './FilterBar';
import { TagBadge } from './TagBadge';
import { useTranslation } from 'react-i18next';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  StarIcon,
  TrashIcon,
  ClockIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

export function NotesPage() {
  const { t } = useTranslation();
  const [selectedNoteId, setSelectedNoteId] = useState<Id<"notes"> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Id<"notes"> | null>(null);
  const [activeFilters, setActiveFilters] = useState<Record<string, string | string[]>>({
    tags: [],
    pinned: '',
  });

  // Queries
  const notes = useQuery(api.notes.getUserNotes);
  const searchResults = useQuery(api.notes.searchNotes, { query: searchQuery });
  const selectedNote = useQuery(api.notes.getNote,
    selectedNoteId ? { noteId: selectedNoteId } : "skip"
  );
  const userTags = useQuery(api.notes.getUserTags) || [];

  // Mutations
  const createNote = useMutation(api.notes.createNote);
  const updateNote = useMutation(api.notes.updateNote);
  const deleteNote = useMutation(api.notes.deleteNote);
  const togglePin = useMutation(api.notes.togglePin);

  // Auto-save functionality
  const [pendingChanges, setPendingChanges] = useState<{
    title?: string;
    content?: string;
    tags?: string[];
  }>({});

  const saveChanges = useCallback(async () => {
    if (!selectedNoteId || Object.keys(pendingChanges).length === 0) return;

    try {
      await updateNote({
        noteId: selectedNoteId,
        ...pendingChanges,
      });
      setPendingChanges({});
    } catch (error) {
      console.error('Failed to save changes:', error);
    }
  }, [selectedNoteId, pendingChanges, updateNote]);

  // Auto-save every 2 seconds
  useEffect(() => {
    const timer = setTimeout(saveChanges, 2000);
    return () => clearTimeout(timer);
  }, [saveChanges]);

  // Save on unmount
  useEffect(() => {
    return () => {
      saveChanges();
    };
  }, [saveChanges]);

  // Filter and search logic
  const getFilteredNotes = () => {
    let filteredNotes = searchQuery.trim() ? searchResults : notes;

    if (!filteredNotes) return [];

    // Apply filters
    if (activeFilters.tags && Array.isArray(activeFilters.tags) && activeFilters.tags.length > 0) {
      filteredNotes = filteredNotes.filter(note =>
        note.tags && (activeFilters.tags as string[]).some((tag: string) => note.tags.includes(tag))
      );
    }

    if (activeFilters.pinned === 'pinned') {
      filteredNotes = filteredNotes.filter(note => note.pinned);
    } else if (activeFilters.pinned === 'unpinned') {
      filteredNotes = filteredNotes.filter(note => !note.pinned);
    }

    return filteredNotes;
  };

  const displayedNotes = getFilteredNotes();

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
  ];

  const handleFilterChange = (key: string, value: string | string[]) => {
    setActiveFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearAllFilters = () => {
    setActiveFilters({
      tags: [],
      pinned: '',
    });
    setSearchQuery('');
  };

  const handleTagClick = (tag: string) => {
    const currentTags = Array.isArray(activeFilters.tags) ? activeFilters.tags : [];
    if (!currentTags.includes(tag)) {
      handleFilterChange('tags', [...currentTags, tag]);
    }
  };

  const handleCreateNote = async () => {
    if (isCreating) return;

    setIsCreating(true);
    try {
      const noteId = await createNote({
        title: 'Untitled Note',
        content: '',
        tags: [],
      });
      setSelectedNoteId(noteId);
    } catch (error) {
      console.error('Failed to create note:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteNote = async (noteId: Id<"notes">) => {
    try {
      await deleteNote({ noteId });
      if (selectedNoteId === noteId) {
        setSelectedNoteId(null);
      }
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const handleTogglePin = async (noteId: Id<"notes">) => {
    try {
      await togglePin({ noteId });
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  const updateTitle = (title: string) => {
    setPendingChanges(prev => ({ ...prev, title }));
  };

  const updateContent = (content: string) => {
    setPendingChanges(prev => ({ ...prev, content }));
  };

  const updateTags = (tags: string[]) => {
    setPendingChanges(prev => ({ ...prev, tags }));
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
    <div className="flex h-full bg-white dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('notes.title')}</h2>
            <button
              onClick={() => void handleCreateNote()}
              disabled={isCreating}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Search */}
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t('notes.searchNotes')}
            className="mb-4"
          />

          {/* Filters */}
          <FilterBar
            filters={filterConfigs}
            activeFilters={activeFilters}
            onFilterChange={handleFilterChange}
            onClearAll={clearAllFilters}
            className="mb-4"
          />
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto">
          {displayedNotes?.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No notes found' : 'No notes yet'}
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {displayedNotes?.map((note) => (
                <div
                  key={note._id}
                  onClick={() => setSelectedNoteId(note._id)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors group ${selectedNoteId === note._id
                    ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate flex-1">
                      {note.title || 'Untitled Note'}
                    </h3>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleTogglePin(note._id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-opacity"
                      >
                        {note.pinned ? (
                          <StarIconSolid className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <StarIcon className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirm(note._id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-opacity"
                      >
                        <TrashIcon className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                    {note.content.replace(/<[^>]*>/g, '').substring(0, 100) || 'No content'}
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <ClockIcon className="h-3 w-3" />
                      {formatDate(note._creationTime)}
                    </div>
                    {note.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {note.tags.slice(0, 3).map((tag) => (
                          <TagBadge
                            key={tag}
                            tag={tag}
                            onClick={() => handleTagClick(tag)}
                            clickable={true}
                            className="text-xs"
                          />
                        ))}
                        {note.tags.length > 3 && (
                          <span className="text-gray-400 text-xs">+{note.tags.length - 3}</span>
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

      {/* Main Editor */}
      <div className="flex-1 flex flex-col">
        {selectedNote ? (
          <>
            {/* Note Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 space-y-4">
              <input
                type="text"
                value={pendingChanges.title ?? selectedNote.title}
                onChange={(e) => updateTitle(e.target.value)}
                className="w-full text-2xl font-bold bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-500"
                placeholder="Note title..."
              />

              <TagInput
                tags={pendingChanges.tags ?? selectedNote.tags}
                onChange={updateTags}
                suggestions={userTags}
                placeholder="Add tags..."
              />

              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span>Created: {formatDate(selectedNote._creationTime)}</span>
                <span>•</span>
                <span>Updated: {formatDate(selectedNote._creationTime)}</span>
                {Object.keys(pendingChanges).length > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-blue-600 dark:text-blue-400">Saving...</span>
                  </>
                )}
              </div>
            </div>

            {/* Editor */}
            <div className="flex-1 p-6">
              <RichTextEditor
                content={pendingChanges.content ?? selectedNote.content}
                onChange={updateContent}
                placeholder="Start writing your note..."
                className="h-full"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                Select a note to start editing
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Choose a note from the sidebar or create a new one
              </p>
              <button
                onClick={() => void handleCreateNote()}
                disabled={isCreating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Create New Note
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Delete Note
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this note? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteNote(showDeleteConfirm)}
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
