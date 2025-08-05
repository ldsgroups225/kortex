import { getAuthUserId } from '@convex-dev/auth/server'
import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// Get all snippets for the current user
export const getUserSnippets = query({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    let query = ctx.db
      .query('snippets')
      .withIndex('by_user', q => q.eq('userId', userId))

    if (args.category) {
      query = ctx.db
        .query('snippets')
        .withIndex('by_user_and_category', q =>
          q.eq('userId', userId).eq('category', args.category!))
    }

    const snippets = await query.order('desc').collect()

    // Sort pinned snippets first, then by creation time
    return snippets.sort((a, b) => {
      if (a.pinned && !b.pinned)
        return -1
      if (!a.pinned && b.pinned)
        return 1
      return b._creationTime - a._creationTime
    })
  },
})

// Get a specific snippet
export const getSnippet = query({
  args: { snippetId: v.id('snippets') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const snippet = await ctx.db.get(args.snippetId)
    if (!snippet || snippet.userId !== userId) {
      return null
    }

    return snippet
  },
})

// Search snippets by title and content
export const searchSnippets = query({
  args: {
    query: v.string(),
    category: v.optional(v.string()),
  },
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
      .query('snippets')
      .withSearchIndex('search_title', (q) => {
        let search = q.search('title', args.query).eq('userId', userId)
        if (args.category) {
          search = search.eq('category', args.category)
        }
        return search
      })
      .collect()

    const contentResults = await ctx.db
      .query('snippets')
      .withSearchIndex('search_content', (q) => {
        let search = q.search('content', args.query).eq('userId', userId)
        if (args.category) {
          search = search.eq('category', args.category)
        }
        return search
      })
      .collect()

    // Combine and deduplicate results
    const allResults = [...titleResults, ...contentResults]
    const uniqueResults = allResults.filter(
      (snippet, index, self) =>
        index === self.findIndex(s => s._id === snippet._id),
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

// Create a new snippet
export const createSnippet = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    language: v.optional(v.string()),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const now = Date.now()
    const snippetId = await ctx.db.insert('snippets', {
      userId,
      title: args.title || 'Untitled Snippet',
      content: args.content || '',
      language: args.language || 'text',
      category: args.category || 'General',
      pinned: false,
      createdAt: now,
      updatedAt: now,
    })

    return snippetId
  },
})

// Update a snippet
export const updateSnippet = mutation({
  args: {
    snippetId: v.id('snippets'),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    language: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const snippet = await ctx.db.get(args.snippetId)
    if (!snippet || snippet.userId !== userId) {
      throw new Error('Snippet not found or access denied')
    }

    const updates: any = {}
    if (args.title !== undefined)
      updates.title = args.title
    if (args.content !== undefined)
      updates.content = args.content
    if (args.language !== undefined)
      updates.language = args.language
    if (args.category !== undefined)
      updates.category = args.category

    await ctx.db.patch(args.snippetId, updates)
    return args.snippetId
  },
})

// Toggle pin status
export const togglePin = mutation({
  args: { snippetId: v.id('snippets') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const snippet = await ctx.db.get(args.snippetId)
    if (!snippet || snippet.userId !== userId) {
      throw new Error('Snippet not found or access denied')
    }

    await ctx.db.patch(args.snippetId, { pinned: !snippet.pinned })
    return args.snippetId
  },
})

// Delete a snippet
export const deleteSnippet = mutation({
  args: { snippetId: v.id('snippets') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const snippet = await ctx.db.get(args.snippetId)
    if (!snippet || snippet.userId !== userId) {
      throw new Error('Snippet not found or access denied')
    }

    await ctx.db.delete(args.snippetId)
    return args.snippetId
  },
})

// Get all unique categories for the user
export const getUserCategories = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const snippets = await ctx.db
      .query('snippets')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect()

    const allCategories = snippets.map(snippet => snippet.category)
    const uniqueCategories = [...new Set(allCategories)].sort()

    return uniqueCategories
  },
})
