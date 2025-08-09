import { authTables } from '@convex-dev/auth/server'
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

const applicationTables = {
  notes: defineTable({
    userId: v.id('users'),
    title: v.string(),
    content: v.string(),
    tags: v.array(v.string()),
    pinned: v.boolean(),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index('by_user', ['userId'])
    .index('by_user_and_pinned', ['userId', 'pinned'])
    .index('by_created_at', ['createdAt'])
    .index('by_pinned', ['pinned'])
    .searchIndex('search_title', {
      searchField: 'title',
      filterFields: ['userId'],
    })
    .searchIndex('search_content', {
      searchField: 'content',
      filterFields: ['userId'],
    }),

  // Automerge document storage for offline-first sync
  automergeDocuments: defineTable({
    userId: v.id('users'),
    documentId: v.string(), // unique document identifier
    documentType: v.union(
      v.literal('note'),
      v.literal('snippet'),
      v.literal('todo'),
      v.literal('workspace'),
    ),
    changes: v.bytes(), // Automerge binary changes
    heads: v.array(v.string()), // Automerge heads for conflict resolution
    lastSync: v.number(),
    metadata: v.optional(v.object({
      title: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
      status: v.optional(v.string()),
    })),
  })
    .index('by_user', ['userId'])
    .index('by_user_and_type', ['userId', 'documentType'])
    .index('by_document_id', ['documentId'])
    .index('by_last_sync', ['lastSync']),

  // Sync status tracking
  syncStatus: defineTable({
    userId: v.id('users'),
    lastFullSync: v.number(),
    pendingSyncs: v.array(v.object({
      documentId: v.string(),
      documentType: v.string(),
      operation: v.union(
        v.literal('create'),
        v.literal('update'),
        v.literal('delete'),
      ),
      timestamp: v.number(),
    })),
    offlineChanges: v.number(), // count of changes made while offline
    connectionState: v.union(
      v.literal('online'),
      v.literal('offline'),
      v.literal('syncing'),
      v.literal('error'),
    ),
  })
    .index('by_user', ['userId']),

  snippets: defineTable({
    userId: v.id('users'),
    title: v.string(),
    content: v.string(),
    language: v.string(),
    category: v.string(),
    pinned: v.boolean(),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index('by_user', ['userId'])
    .index('by_user_and_category', ['userId', 'category'])
    .index('by_language', ['language'])
    .index('by_category', ['category'])
    .index('by_created_at', ['createdAt'])
    .index('by_pinned', ['pinned'])
    .searchIndex('search_title', {
      searchField: 'title',
      filterFields: ['userId', 'category'],
    })
    .searchIndex('search_content', {
      searchField: 'content',
      filterFields: ['userId', 'category'],
    }),

  todos: defineTable({
    userId: v.id('users'),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal('todo'), v.literal('in_progress'), v.literal('done')),
    tags: v.optional(v.array(v.string())),
    assignedToUserId: v.optional(v.id('users')),
    dueDate: v.optional(v.number()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index('by_user', ['userId'])
    .index('by_user_and_status', ['userId', 'status'])
    .index('by_assigned_user', ['assignedToUserId'])
    .index('by_assigned_user_and_status', ['assignedToUserId', 'status'])
    .index('by_status', ['status'])
    .index('by_created_at', ['createdAt'])
    .searchIndex('search_title', {
      searchField: 'title',
      filterFields: ['userId'],
    })
    .searchIndex('search_description', {
      searchField: 'description',
      filterFields: ['userId'],
    }),

  userPreferences: defineTable({
    userId: v.id('users'),
    theme: v.union(v.literal('light'), v.literal('dark'), v.literal('system')),
    language: v.union(v.literal('en'), v.literal('fr')),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId']),

  adminLogs: defineTable({
    userId: v.optional(v.id('users')),
    action: v.string(),
    details: v.optional(v.string()),
    timestamp: v.number(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  })
    .index('by_timestamp', ['timestamp'])
    .index('by_user', ['userId'])
    .index('by_action', ['action']),
}

export default defineSchema({
  ...authTables,
  ...applicationTables,
})
