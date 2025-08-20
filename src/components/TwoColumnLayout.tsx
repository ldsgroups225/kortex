import { Bars3Icon } from '@heroicons/react/24/outline'
import React, { useState } from 'react'

interface TwoColumnLayoutProps {
  sidebarContent: React.ReactNode
  mainContent: React.ReactNode
  pageTitle: string
}

export function TwoColumnLayout({ sidebarContent, mainContent, pageTitle }: TwoColumnLayoutProps) {
  const [isSidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="h-full flex">
      {/* Sidebar for mobile */}
      <div
        className={`fixed inset-0 z-40 lg:hidden transition-transform transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } bg-white dark:bg-gray-800 w-80 border-r border-gray-200 dark:border-gray-700`}
      >
        {sidebarContent}
      </div>
      {isSidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar for desktop */}
      <aside className="hidden lg:block w-80 flex-shrink-0 border-r border-gray-200 dark:border-gray-700">
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 lg:hidden">
          <button type="button" onClick={() => setSidebarOpen(true)} className="p-2 text-gray-500">
            <Bars3Icon className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold">{pageTitle}</h1>
          <div className="w-8"></div>
          {' '}
          {/* Spacer */}
        </div>
        {mainContent}
      </div>
    </div>
  )
}
