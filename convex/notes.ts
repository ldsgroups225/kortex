import { getAuthUserId } from '@convex-dev/auth/server'
import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// Get all notes for the current user
export const getUserNotes = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const notes = await ctx.db
      .query('notes')
      .withIndex('by_user_and_pinned', q => q.eq('userId', userId))
      .order('desc')
      .collect()

    // Sort pinned notes first, then by creation time
    return notes.sort((a, b) => {
      if (a.pinned && !b.pinned)
        return -1
      if (!a.pinned && b.pinned)
        return 1
      return b._creationTime - a._creationTime
    })
  },
})

// Get a specific note
export const getNote = query({
  args: { noteId: v.id('notes') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const note = await ctx.db.get(args.noteId)
    if (!note || note.userId !== userId) {
      return null
    }

    return note
  },
})

// Search notes by title and content
export const searchNotes = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    if (!args.query.trim()) {
      return []
    }

    // Search in both title and content
    const titleResults = await ctx.db
      .query('notes')
      .withSearchIndex('search_title', q =>
        q.search('title', args.query).eq('userId', userId))
      .collect()

    const contentResults = await ctx.db
      .query('notes')
      .withSearchIndex('search_content', q =>
        q.search('content', args.query).eq('userId', userId))
      .collect()

    // Combine and deduplicate results
    const allResults = [...titleResults, ...contentResults]
    const uniqueResults = allResults.filter(
      (note, index, self) =>
        index === self.findIndex(n => n._id === note._id),
    )

    return uniqueResults.sort((a, b) => {
      if (a.pinned && !b.pinned)
        return -1
      if (!a.pinned && b.pinned)
        return 1
      return b._creationTime - a._creationTime
    })
  },
})

// Create a new note
export const createNote = mutation({
  args: {
    title: v.string(),
    content: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const now = Date.now()
    const noteId = await ctx.db.insert('notes', {
      userId,
      title: args.title || 'Untitled Note',
      content: args.content || '',
      tags: args.tags || [],
      pinned: false,
      createdAt: now,
      updatedAt: now,
    })

    // Update stats
    const counter = await ctx.db
      .query('stats')
      .withIndex('by_name', q => q.eq('name', 'totalNotes'))
      .first()
    if (counter) {
      await ctx.db.patch(counter._id, { count: counter.count + 1 })
    }
    else {
      await ctx.db.insert('stats', { name: 'totalNotes', count: 1 })
    }

    return noteId
  },
})

// Update a note
export const updateNote = mutation({
  args: {
    noteId: v.id('notes'),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const note = await ctx.db.get(args.noteId)
    if (!note || note.userId !== userId) {
      throw new Error('Note not found or access denied')
    }

    const updates: any = {}
    if (args.title !== undefined)
      updates.title = args.title
    if (args.content !== undefined)
      updates.content = args.content
    if (args.tags !== undefined)
      updates.tags = args.tags

    await ctx.db.patch(args.noteId, updates)
    return args.noteId
  },
})

// Toggle pin status
export const togglePin = mutation({
  args: { noteId: v.id('notes') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const note = await ctx.db.get(args.noteId)
    if (!note || note.userId !== userId) {
      throw new Error('Note not found or access denied')
    }

    await ctx.db.patch(args.noteId, { pinned: !note.pinned })
    return args.noteId
  },
})

// Delete a note
export const deleteNote = mutation({
  args: { noteId: v.id('notes') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const note = await ctx.db.get(args.noteId)
    if (!note || note.userId !== userId) {
      throw new Error('Note not found or access denied')
    }

    await ctx.db.delete(args.noteId)

    // Update stats
    const counter = await ctx.db
      .query('stats')
      .withIndex('by_name', q => q.eq('name', 'totalNotes'))
      .first()
    if (counter) {
      await ctx.db.patch(counter._id, { count: counter.count - 1 })
    }

    return args.noteId
  },
})

// Get all unique tags for the user
export const getUserTags = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const notes = await ctx.db
      .query('notes')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect()

    const allTags = notes.flatMap(note => note.tags)
    const uniqueTags = [...new Set(allTags)].sort()

    return uniqueTags
  },
})
