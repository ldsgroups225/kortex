import { getAuthUserId } from '@convex-dev/auth/server'
import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// Get all Automerge documents for a user
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

    let query = ctx.db.query('automergeDocuments')
      .withIndex('by_user', q => q.eq('userId', userId))

    if (args.documentType) {
      query = ctx.db.query('automergeDocuments')
        .withIndex('by_user_and_type', q =>
          q.eq('userId', userId).eq('documentType', args.documentType!))
    }

    const documents = await query.collect()

    return documents.sort((a, b) => b.lastSync - a.lastSync)
  },
})

// Get a specific Automerge document
export const getDocument = query({
  args: { documentId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const document = await ctx.db
      .query('automergeDocuments')
      .withIndex('by_document_id', q => q.eq('documentId', args.documentId))
      .first()

    if (!document || document.userId !== userId) {
      return null
    }

    return document
  },
})

// Create or update an Automerge document
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
    const existingDoc = await ctx.db
      .query('automergeDocuments')
      .withIndex('by_document_id', q => q.eq('documentId', args.documentId))
      .first()

    if (existingDoc) {
      // Verify ownership
      if (existingDoc.userId !== userId) {
        throw new Error('Access denied')
      }

      // Update existing document
      await ctx.db.patch(existingDoc._id, {
        changes: args.changes,
        heads: args.heads,
        lastSync: now,
        metadata: args.metadata,
      })

      return existingDoc._id
    }
    else {
      // Create new document
      const docId = await ctx.db.insert('automergeDocuments', {
        userId,
        documentId: args.documentId,
        documentType: args.documentType,
        changes: args.changes,
        heads: args.heads,
        lastSync: now,
        metadata: args.metadata,
      })

      return docId
    }
  },
})

// Delete an Automerge document
export const deleteDocument = mutation({
  args: { documentId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const document = await ctx.db
      .query('automergeDocuments')
      .withIndex('by_document_id', q => q.eq('documentId', args.documentId))
      .first()

    if (!document) {
      throw new Error('Document not found')
    }

    if (document.userId !== userId) {
      throw new Error('Access denied')
    }

    await ctx.db.delete(document._id)
    return args.documentId
  },
})

// Batch sync multiple documents
export const batchSyncDocuments = mutation({
  args: {
    documents: v.array(v.object({
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
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const now = Date.now()
    const results = []

    for (const doc of args.documents) {
      try {
        // Check if document already exists
        const existingDoc = await ctx.db
          .query('automergeDocuments')
          .withIndex('by_document_id', q => q.eq('documentId', doc.documentId))
          .first()

        if (existingDoc) {
          // Verify ownership
          if (existingDoc.userId !== userId) {
            results.push({ documentId: doc.documentId, error: 'Access denied' })
            continue
          }

          // Update existing document
          await ctx.db.patch(existingDoc._id, {
            changes: doc.changes,
            heads: doc.heads,
            lastSync: now,
            metadata: doc.metadata,
          })

          results.push({ documentId: doc.documentId, success: true, id: existingDoc._id })
        }
        else {
          // Create new document
          const docId = await ctx.db.insert('automergeDocuments', {
            userId,
            documentId: doc.documentId,
            documentType: doc.documentType,
            changes: doc.changes,
            heads: doc.heads,
            lastSync: now,
            metadata: doc.metadata,
          })

          results.push({ documentId: doc.documentId, success: true, id: docId })
        }
      }
      catch (error) {
        results.push({
          documentId: doc.documentId,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return results
  },
})

// Get sync status for a user
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
      lastFullSync: 0,
      pendingSyncs: [],
      offlineChanges: 0,
      connectionState: 'offline' as const,
    }
  },
})

// Update sync status
export const updateSyncStatus = mutation({
  args: {
    lastFullSync: v.optional(v.number()),
    pendingSyncs: v.optional(v.array(v.object({
      documentId: v.string(),
      documentType: v.string(),
      operation: v.union(
        v.literal('create'),
        v.literal('update'),
        v.literal('delete'),
      ),
      timestamp: v.number(),
    }))),
    offlineChanges: v.optional(v.number()),
    connectionState: v.optional(v.union(
      v.literal('online'),
      v.literal('offline'),
      v.literal('syncing'),
      v.literal('error'),
    )),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const existingStatus = await ctx.db
      .query('syncStatus')
      .withIndex('by_user', q => q.eq('userId', userId))
      .first()

    const updateData = {
      ...(args.lastFullSync !== undefined && { lastFullSync: args.lastFullSync }),
      ...(args.pendingSyncs !== undefined && { pendingSyncs: args.pendingSyncs }),
      ...(args.offlineChanges !== undefined && { offlineChanges: args.offlineChanges }),
      ...(args.connectionState !== undefined && { connectionState: args.connectionState }),
    }

    if (existingStatus) {
      await ctx.db.patch(existingStatus._id, updateData)
      return existingStatus._id
    }
    else {
      const statusId = await ctx.db.insert('syncStatus', {
        userId,
        lastFullSync: args.lastFullSync || Date.now(),
        pendingSyncs: args.pendingSyncs || [],
        offlineChanges: args.offlineChanges || 0,
        connectionState: args.connectionState || 'offline',
      })
      return statusId
    }
  },
})

// Get documents that need syncing (modified after last sync)
export const getDocumentsToSync = query({
  args: {
    lastSyncTime: v.number(),
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

    let query = ctx.db.query('automergeDocuments')
      .withIndex('by_user', q => q.eq('userId', userId))
      .filter(q => q.gt(q.field('lastSync'), args.lastSyncTime))

    if (args.documentType) {
      query = ctx.db.query('automergeDocuments')
        .withIndex('by_user_and_type', q =>
          q.eq('userId', userId).eq('documentType', args.documentType!))
        .filter(q => q.gt(q.field('lastSync'), args.lastSyncTime))
    }

    const documents = await query.collect()

    return documents.sort((a, b) => a.lastSync - b.lastSync)
  },
})

// Health check for sync system
export const syncHealthCheck = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const documents = await ctx.db
      .query('automergeDocuments')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect()

    const syncStatus = await ctx.db
      .query('syncStatus')
      .withIndex('by_user', q => q.eq('userId', userId))
      .first()

    const now = Date.now()
    const recentDocuments = documents.filter(doc => now - doc.lastSync < 24 * 60 * 60 * 1000) // 24 hours

    return {
      totalDocuments: documents.length,
      recentlyUpdated: recentDocuments.length,
      syncStatus: syncStatus || null,
      lastSyncAge: syncStatus ? now - syncStatus.lastFullSync : null,
      isHealthy: documents.length === 0 || recentDocuments.length > 0,
    }
  },
})
