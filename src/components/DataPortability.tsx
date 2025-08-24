import type {
  ExportData,
  ImportData,
} from '../lib/exportUtils'
import {
  ArchiveBoxIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CheckIcon,
  DocumentArrowDownIcon,
  DocumentArrowUpIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { useQuery } from 'convex/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../../convex/_generated/api'
import {
  downloadBlob,
  downloadFile,
  exportAllAsZip,
  exportNotesAsJson,
  exportNotesAsMarkdown,
  exportSnippetsAsCodeBlocks,
  exportSnippetsAsJson,
  exportTodosAsJson,
  validateImportData,
} from '../lib/exportUtils'

export function DataPortability() {
  const { t } = useTranslation()
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importPreview, setImportPreview] = useState<ImportData | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [_error, setError] = useState<string | null>(null)
  const [_success, setSuccess] = useState<string | null>(null)

  // Queries
  const notes = useQuery(api.notes.getUserNotes) || []
  const snippets = useQuery(api.snippets.getUserSnippets, {}) || []
  const todos = useQuery(api.todos.getTodos)

  const handleExportNotes = async (format: 'markdown' | 'json') => {
    setIsExporting(true)
    try {
      if (format === 'markdown') {
        const content = exportNotesAsMarkdown(notes)
        downloadFile(content, `notes-export-${new Date().toISOString().split('T')[0]}.md`, 'text/markdown')
      }
      else {
        const content = exportNotesAsJson(notes)
        downloadFile(content, `notes-export-${new Date().toISOString().split('T')[0]}.json`, 'application/json')
      }
    }
    catch (error) {
      console.error('Export failed:', error)
    }
    finally {
      setIsExporting(false)
    }
  }

  const handleExportSnippets = async (format: 'markdown' | 'json') => {
    setIsExporting(true)
    try {
      if (format === 'markdown') {
        const content = exportSnippetsAsCodeBlocks(snippets)
        downloadFile(content, `snippets-export-${new Date().toISOString().split('T')[0]}.md`, 'text/markdown')
      }
      else {
        const content = exportSnippetsAsJson(snippets)
        downloadFile(content, `snippets-export-${new Date().toISOString().split('T')[0]}.json`, 'application/json')
      }
    }
    catch (error) {
      console.error('Export failed:', error)
    }
    finally {
      setIsExporting(false)
    }
  }

  const handleExportTodos = async () => {
    setIsExporting(true)
    try {
      const todosData = todos ? [...todos.todo, ...todos.inProgress, ...todos.done] : []
      const content = exportTodosAsJson(todosData)
      downloadFile(content, `todos-export-${new Date().toISOString().split('T')[0]}.json`, 'application/json')
    }
    catch (error) {
      console.error('Export failed:', error)
    }
    finally {
      setIsExporting(false)
    }
  }

  const handleExportAll = async () => {
    setIsExporting(true)
    try {
      const todosData = todos ? [...todos.todo, ...todos.inProgress, ...todos.done] : []
      const exportData: ExportData = {
        notes,
        snippets,
        todos: todosData,
        exportDate: new Date().toISOString(),
        version: '1.0',
      }

      const zipBlob = await exportAllAsZip(exportData)
      downloadBlob(zipBlob, `all-data-export-${new Date().toISOString().split('T')[0]}.zip`)
    }
    catch (error) {
      console.error('Export failed:', error)
    }
    finally {
      setIsExporting(false)
    }
  }

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file)
      return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const data = JSON.parse(content)
        const validatedData = validateImportData(data)

        if (validatedData) {
          setImportPreview(validatedData)
          setShowImportModal(true)
        }
        else {
          setError('Invalid import file format')
        }
      }
      catch (error) {
        console.error('Import failed:', error)
        setError('Failed to read import file')
      }
    }
    reader.readAsText(file)
  }

  const handleConfirmImport = async () => {
    if (!importPreview)
      return

    setIsImporting(true)
    try {
      // Here you would implement the actual import logic
      // For now, we'll just show a success message
      setSuccess('Import functionality will be implemented with Convex mutations')
    }
    catch (error) {
      console.error('Import failed:', error)
      setError('Import failed')
    }
    finally {
      setIsImporting(false)
      setShowImportModal(false)
      setImportPreview(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Export Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <ArrowDownTrayIcon className="h-6 w-6 text-green-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('settings.exportData')}
            </h2>
          </div>

          <div className="space-y-4">
            {/* Notes Export */}
            <div>
              <h3 className="text-md font-medium text-gray-900 dark:text-white mb-2">
                {t('notes.title')}
                {' '}
                (
                {notes.length}
                )
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleExportNotes('markdown')}
                  disabled={isExporting || notes.length === 0}
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  <DocumentArrowDownIcon className="h-4 w-4" />
                  Export as Markdown
                </button>
                <button
                  type="button"
                  onClick={() => void handleExportNotes('json')}
                  disabled={isExporting || notes.length === 0}
                  className="px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  <DocumentArrowDownIcon className="h-4 w-4" />
                  Export as JSON
                </button>
              </div>
            </div>

            {/* Snippets Export */}
            <div>
              <h3 className="text-md font-medium text-gray-900 dark:text-white mb-2">
                {t('snippets.title')}
                {' '}
                (
                {snippets.length}
                )
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleExportSnippets('markdown')}
                  disabled={isExporting || snippets.length === 0}
                  className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  <DocumentArrowDownIcon className="h-4 w-4" />
                  Export as Code Blocks
                </button>
                <button
                  type="button"
                  onClick={() => void handleExportSnippets('json')}
                  disabled={isExporting || snippets.length === 0}
                  className="px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  <DocumentArrowDownIcon className="h-4 w-4" />
                  Export as JSON
                </button>
              </div>
            </div>

            {/* Todos Export */}
            <div>
              <h3 className="text-md font-medium text-gray-900 dark:text-white mb-2">
                {t('todos.title')}
                {' '}
                (
                {todos ? todos.todo.length + todos.inProgress.length + todos.done.length : 0}
                )
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleExportTodos()}
                  disabled={isExporting || !todos || (todos.todo.length + todos.inProgress.length + todos.done.length === 0)}
                  className="px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  <DocumentArrowDownIcon className="h-4 w-4" />
                  Export as JSON
                </button>
              </div>
            </div>

            {/* Export All */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => void handleExportAll()}
                disabled={isExporting}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                <ArchiveBoxIcon className="h-5 w-5" />
                Export All Data (ZIP)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Import Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <ArrowUpTrayIcon className="h-6 w-6 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('settings.importData')}
            </h2>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Import your data from a previously exported JSON file.
            </p>

            <div className="flex gap-2">
              <input
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
                id="import-file"
              />
              <label
                htmlFor="import-file"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <DocumentArrowUpIcon className="h-4 w-4" />
                Choose Import File
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Import Preview Modal */}
      {showImportModal && importPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Import Preview
              </h3>
            </div>

            <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
                This will import the following data:
              </div>

              {importPreview.notes && importPreview.notes.length > 0 && (
                <div className="flex items-center gap-2">
                  <CheckIcon className="h-4 w-4 text-green-500" />
                  <span>
                    {importPreview.notes.length}
                    {' '}
                    notes
                  </span>
                </div>
              )}

              {importPreview.snippets && importPreview.snippets.length > 0 && (
                <div className="flex items-center gap-2">
                  <CheckIcon className="h-4 w-4 text-green-500" />
                  <span>
                    {importPreview.snippets.length}
                    {' '}
                    snippets
                  </span>
                </div>
              )}

              {importPreview.todos && importPreview.todos.length > 0 && (
                <div className="flex items-center gap-2">
                  <CheckIcon className="h-4 w-4 text-green-500" />
                  <span>
                    {importPreview.todos.length}
                    {' '}
                    todos
                  </span>
                </div>
              )}

              {importPreview.exportDate && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Originally exported:
                  {' '}
                  {new Date(importPreview.exportDate).toLocaleString()}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmImport()}
                disabled={isImporting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isImporting ? 'Importing...' : 'Confirm Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
