import { getAuthUserId } from '@convex-dev/auth/server'
import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

/**
 * Get user's sync status
 */
export const getSyncStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const syncStatus = await ctx.db
      .query('syncStatus')
      .withIndex('by_user', q => q.eq('userId', userId))
      .first()

    return syncStatus || {
      userId,
      lastFullSync: 0,
      pendingSyncs: [],
      offlineChanges: 0,
      connectionState: 'offline' as const,
    }
  },
})

/**
 * Update user's sync status
 */
export const updateSyncStatus = mutation({
  args: {
    lastFullSync: v.optional(v.number()),
    connectionState: v.optional(v.union(
      v.literal('online'),
      v.literal('offline'),
      v.literal('syncing'),
      v.literal('error'),
    )),
    offlineChanges: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const existing = await ctx.db
      .query('syncStatus')
      .withIndex('by_user', q => q.eq('userId', userId))
      .first()

    const updates: any = {}
    if (args.lastFullSync !== undefined)
      updates.lastFullSync = args.lastFullSync
    if (args.connectionState !== undefined)
      updates.connectionState = args.connectionState
    if (args.offlineChanges !== undefined)
      updates.offlineChanges = args.offlineChanges

    if (existing) {
      await ctx.db.patch(existing._id, updates)
    }
    else {
      await ctx.db.insert('syncStatus', {
        userId,
        lastFullSync: args.lastFullSync || 0,
        pendingSyncs: [],
        offlineChanges: args.offlineChanges || 0,
        connectionState: args.connectionState || 'offline',
      })
    }
  },
})

/**
 * Get all Automerge documents for the user
 */
export const getUserDocuments = query({
  args: {
    documentType: v.optional(v.union(
      v.literal('note'),
      v.literal('snippet'),
      v.literal('todo'),
      v.literal('workspace'),
    )),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    let query = ctx.db
      .query('automergeDocuments')
      .withIndex('by_user', q => q.eq('userId', userId))

    if (args.documentType) {
      query = ctx.db
        .query('automergeDocuments')
        .withIndex('by_user_and_type', q =>
          q.eq('userId', userId).eq('documentType', args.documentType!))
    }

    return await query.collect()
  },
})

/**
 * Sync an Automerge document
 */
export const syncDocument = mutation({
  args: {
    documentId: v.string(),
    documentType: v.union(
      v.literal('note'),
      v.literal('snippet'),
      v.literal('todo'),
      v.literal('workspace'),
    ),
    changes: v.bytes(),
    heads: v.array(v.string()),
    metadata: v.optional(v.object({
      title: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
      status: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const now = Date.now()

    // Check if document already exists
    const existing = await ctx.db
      .query('automergeDocuments')
      .withIndex('by_document_id', q => q.eq('documentId', args.documentId))
      .first()

    if (existing) {
      // Update existing document
      await ctx.db.patch(existing._id, {
        changes: args.changes,
        heads: args.heads,
        lastSync: now,
        metadata: args.metadata,
      })

      // Also update corresponding legacy table based on type
      await updateLegacyDocument(ctx, userId, args.documentId, args.documentType, args.metadata)
    }
    else {
      // Create new document
      await ctx.db.insert('automergeDocuments', {
        userId,
        documentId: args.documentId,
        documentType: args.documentType,
        changes: args.changes,
        heads: args.heads,
        lastSync: now,
        metadata: args.metadata,
      })

      // Also create corresponding legacy document
      await createLegacyDocument(ctx, userId, args.documentId, args.documentType, args.metadata)
    }

    return args.documentId
  },
})

/**
 * Get specific Automerge document
 */
export const getDocument = query({
  args: { documentId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const doc = await ctx.db
      .query('automergeDocuments')
      .withIndex('by_document_id', q => q.eq('documentId', args.documentId))
      .first()

    if (!doc || doc.userId !== userId) {
      return null
    }

    return doc
  },
})

/**
 * Delete an Automerge document
 */
export const deleteDocument = mutation({
  args: { documentId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const doc = await ctx.db
      .query('automergeDocuments')
      .withIndex('by_document_id', q => q.eq('documentId', args.documentId))
      .first()

    if (!doc || doc.userId !== userId) {
      throw new Error('Document not found or access denied')
    }

    await ctx.db.delete(doc._id)

    // Also delete from legacy tables
    await deleteLegacyDocument(ctx, userId, args.documentId, doc.documentType)

    return args.documentId
  },
})

/**
 * Get document changes since specific heads
 */
export const getDocumentChanges = query({
  args: {
    documentId: v.string(),
    sinceHeads: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const doc = await ctx.db
      .query('automergeDocuments')
      .withIndex('by_document_id', q => q.eq('documentId', args.documentId))
      .first()

    if (!doc || doc.userId !== userId) {
      return null
    }

    // For now, return full document changes
    // In a more sophisticated implementation, you'd compute incremental changes
    return {
      documentId: args.documentId,
      changes: doc.changes,
      heads: doc.heads,
      lastSync: doc.lastSync,
    }
  },
})

/**
 * Helper function to update legacy document tables
 */
async function updateLegacyDocument(
  ctx: any,
  userId: string,
  documentId: string,
  documentType: string,
  metadata?: any,
) {
  if (!metadata)
    return

  const updates: any = {
    updatedAt: Date.now(),
  }

  switch (documentType) {
    case 'note': {
      if (metadata.title)
        updates.title = metadata.title
      if (metadata.tags)
        updates.tags = metadata.tags

      // Find note by user and title using withIndex for better performance
      const existingNote = await ctx.db
        .query('notes')
        .withIndex('by_user', (q: any) => q.eq('userId', userId))
        .filter((q: any) => q.eq(q.field('title'), metadata.title))
        .first()

      if (existingNote) {
        await ctx.db.patch(existingNote._id, updates)
      }
      break
    }

    case 'snippet': {
      if (metadata.title)
        updates.title = metadata.title
      if (metadata.tags)
        updates.tags = metadata.tags

      const existingSnippet = await ctx.db
        .query('snippets')
        .withIndex('by_user', (q: any) => q.eq('userId', userId))
        .filter((q: any) => q.eq(q.field('title'), metadata.title))
        .first()

      if (existingSnippet) {
        await ctx.db.patch(existingSnippet._id, updates)
      }
      break
    }

    case 'todo': {
      if (metadata.title)
        updates.title = metadata.title
      if (metadata.status)
        updates.status = metadata.status
      if (metadata.tags)
        updates.tags = metadata.tags

      const existingTodo = await ctx.db
        .query('todos')
        .withIndex('by_user', (q: any) => q.eq('userId', userId))
        .filter((q: any) => q.eq(q.field('title'), metadata.title))
        .first()

      if (existingTodo) {
        await ctx.db.patch(existingTodo._id, updates)
      }
      break
    }
  }
}

/**
 * Helper function to create legacy document
 */
async function createLegacyDocument(
  ctx: any,
  userId: string,
  documentId: string,
  documentType: string,
  metadata?: any,
) {
  if (!metadata)
    return

  const now = Date.now()

  switch (documentType) {
    case 'note': {
      await ctx.db.insert('notes', {
        userId,
        title: metadata.title || 'Untitled Note',
        content: '', // Will be updated when document is fully synced
        tags: metadata.tags || [],
        pinned: false,
        createdAt: now,
        updatedAt: now,
      })
      break
    }

    case 'snippet': {
      await ctx.db.insert('snippets', {
        userId,
        title: metadata.title || 'Untitled Snippet',
        content: '', // Will be updated when document is fully synced
        language: 'javascript',
        category: 'general',
        pinned: false,
        createdAt: now,
        updatedAt: now,
      })
      break
    }

    case 'todo': {
      await ctx.db.insert('todos', {
        userId,
        title: metadata.title || 'Untitled Todo',
        status: metadata.status || 'todo',
        tags: metadata.tags || [],
        createdAt: now,
        updatedAt: now,
      })
      break
    }
  }
}

/**
 * Helper function to delete from legacy tables
 */
async function deleteLegacyDocument(
  ctx: any,
  userId: string,
  documentId: string,
  documentType: string,
) {
  // This is a simplified approach - in production, you'd want better mapping
  // between Automerge documents and legacy documents

  switch (documentType) {
    case 'note': {
      const _notes = await ctx.db
        .query('notes')
        .withIndex('by_user', (q: any) => q.eq('userId', userId))
        .collect()

      // Delete notes that might correspond to this document
      // This is simplified - you'd want better identification
      break
    }

    case 'snippet': {
      const _snippets = await ctx.db
        .query('snippets')
        .withIndex('by_user', (q: any) => q.eq('userId', userId))
        .collect()
      break
    }

    case 'todo': {
      const _todos = await ctx.db
        .query('todos')
        .withIndex('by_user', (q: any) => q.eq('userId', userId))
        .collect()
      break
    }
  }
}
