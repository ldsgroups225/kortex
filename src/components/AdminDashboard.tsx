import {
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  CodeBracketIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import { useMutation, useQuery } from 'convex/react'
import { useState } from 'react'
import { api } from '../../convex/_generated/api'

type TabType = 'analytics' | 'content' | 'logs'

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('analytics')
  const [contentType, setContentType] = useState<'notes' | 'snippets' | 'todos'>('notes')
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Queries
  const analytics = useQuery(api.admin.getAdminAnalytics)
  const notes = useQuery(api.admin.getNotesForModeration, { searchQuery })
  const snippets = useQuery(api.admin.getSnippetsForModeration, { searchQuery })
  const todos = useQuery(api.admin.getTodosForModeration, { searchQuery })
  const logs = useQuery(api.admin.getSystemLogs, { limit: 50 })

  // Mutations
  const deleteContent = useMutation(api.admin.deleteContent)

  const handleDeleteContent = async (contentId: string, contentType: 'notes' | 'snippets' | 'todos') => {
    try {
      await deleteContent({ contentId: contentId as any, contentType })
      setDeleteConfirm(null)
    }
    catch (error) {
      console.error('Failed to delete content:', error)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const getContentItems = () => {
    switch (contentType) {
      case 'notes':
        return notes || []
      case 'snippets':
        return snippets || []
      case 'todos':
        return todos || []
      default:
        return []
    }
  }

  const getItemContent = (item: any) => {
    if (contentType === 'todos') {
      return item.description || ''
    }
    return item.content || ''
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Admin Dashboard
        </h1>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <span>Admin Access Only</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'analytics', name: 'Analytics', icon: ChartBarIcon },
            { id: 'content', name: 'Content Monitoring', icon: EyeIcon },
            { id: 'logs', name: 'System Logs', icon: ClockIcon },
          ].map(tab => (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <UserGroupIcon className="h-8 w-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.totalUsers}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <DocumentTextIcon className="h-8 w-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Notes</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.totalNotes}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <CodeBracketIcon className="h-8 w-8 text-purple-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Snippets</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.totalSnippets}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <CheckCircleIcon className="h-8 w-8 text-orange-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Todos</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.totalTodos}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Active Users</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Last 24 hours</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{analytics.activeUsers24h}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Last 7 days</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{analytics.activeUsers7d}</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Languages</h3>
              <div className="space-y-2">
                {analytics.topLanguages.slice(0, 5).map(lang => (
                  <div key={lang.language} className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{lang.language}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{lang.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Tags */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Tags</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {analytics.topTags.slice(0, 8).map(tag => (
                <div key={tag.tag} className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-gray-600 dark:text-gray-400">{tag.tag}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{tag.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Content Monitoring Tab */}
      {activeTab === 'content' && (
        <div className="space-y-6">
          {/* Content Type Selector */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Content Type:</label>
            <select
              value={contentType}
              onChange={e => setContentType(e.target.value as 'notes' | 'snippets' | 'todos')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="notes">Notes</option>
              <option value="snippets">Snippets</option>
              <option value="todos">Todos</option>
            </select>

            <div className="flex-1 max-w-md">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search content..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Content Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {getContentItems().map(item => (
                    <tr key={item._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.title}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                          {getItemContent(item)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {item.userEmail}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(item._creationTime)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(item._id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* System Logs Tab */}
      {activeTab === 'logs' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent System Activity</h3>
            </div>
            <div className="overflow-y-auto max-h-96">
              {logs?.map(log => (
                <div key={log._id} className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {log.action}
                        </span>
                        {log.userEmail && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            by
                            {' '}
                            {log.userEmail}
                          </span>
                        )}
                      </div>
                      {log.details && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {log.details}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(log.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Delete Content
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this
              {' '}
              {contentType.slice(0, -1)}
              ? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteContent(deleteConfirm, contentType)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
