import type { Id } from '../../convex/_generated/dataModel'
import { ChevronDownIcon, UserIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface User {
  _id: Id<'users'>
  name?: string
  email?: string
  image?: string
}

interface UserSelectorProps {
  users: User[] | undefined
  selectedUserId?: Id<'users'>
  onUserSelect: (userId: Id<'users'> | undefined) => void
  placeholder?: string
  className?: string
  currentUserId?: Id<'users'>
}

export function UserSelector({
  users,
  selectedUserId,
  onUserSelect,
  placeholder,
  className = '',
  currentUserId,
}: UserSelectorProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)

  const selectedUser = selectedUserId && users ? users.find(u => u._id === selectedUserId) : null

  const getUserDisplayName = (user: User) => {
    if (user._id === currentUserId) {
      return t('todos.you')
    }
    return user.name || user.email || t('common.untitled')
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {selectedUser
              ? (
                  <>
                    {selectedUser.image
                      ? (
                          <img
                            src={selectedUser.image}
                            alt={getUserDisplayName(selectedUser)}
                            className="w-5 h-5 rounded-full flex-shrink-0"
                          />
                        )
                      : (
                          <div className="w-5 h-5 rounded-full bg-blue-500 flex-shrink-0 flex items-center justify-center">
                            <UserIcon className="w-3 h-3 text-white" />
                          </div>
                        )}
                    <span className="truncate text-sm">
                      {getUserDisplayName(selectedUser)}
                    </span>
                  </>
                )
              : (
                  <>
                    <div className="w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0 flex items-center justify-center">
                      <UserIcon className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                    </div>
                    <span className="text-gray-500 dark:text-gray-400 text-sm">
                      {placeholder || t('todos.assignToPlaceholder')}
                    </span>
                  </>
                )}
          </div>
          <ChevronDownIcon
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
            {/* Unassign option */}
            <button
              type="button"
              onClick={() => {
                onUserSelect(undefined)
                setIsOpen(false)
              }}
              className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <div className="w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                <UserIcon className="w-3 h-3 text-gray-500 dark:text-gray-400" />
              </div>
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                {t('todos.unassigned')}
              </span>
            </button>

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-600 my-1" />

            {/* Users list */}
            {users && users.map(user => (
              <button
                key={user._id}
                type="button"
                onClick={() => {
                  onUserSelect(user._id)
                  setIsOpen(false)
                }}
                className={`w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 ${
                  selectedUserId === user._id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                {user.image
                  ? (
                      <img
                        src={user.image}
                        alt={getUserDisplayName(user)}
                        className="w-5 h-5 rounded-full flex-shrink-0"
                      />
                    )
                  : (
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex-shrink-0 flex items-center justify-center">
                        <UserIcon className="w-3 h-3 text-white" />
                      </div>
                    )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {getUserDisplayName(user)}
                  </div>
                  {user.email && user.name && (
                    <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                      {user.email}
                    </div>
                  )}
                  {user._id === currentUserId && (
                    <div className="text-xs text-blue-600 dark:text-blue-400">
                      {t('todos.you')}
                    </div>
                  )}
                </div>
              </button>
            ))}

            {(!users || users.length === 0) && (
              <div className="px-3 py-2 text-center text-gray-500 dark:text-gray-400 text-sm">
                {t('todos.collaborative.noUsersAvailable')}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
