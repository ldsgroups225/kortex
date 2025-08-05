import { getAuthUserId } from '@convex-dev/auth/server'
import { v } from 'convex/values'
import { internalMutation, mutation, query } from './_generated/server'

// Helper function to check if user is admin
async function checkAdmin(ctx: any) {
  const userId = await getAuthUserId(ctx)
  if (!userId) {
    throw new Error('Not authenticated')
  }

  // For now, allow admin access to any authenticated user for testing
  // In production, you would check user.isAdmin field
  const user = await ctx.db.get(userId)
  if (!user) {
    throw new Error('User not found')
  }

  return userId
}

// Log admin action
async function logAdminAction(ctx: any, action: string, details?: string) {
  const userId = await getAuthUserId(ctx)
  await ctx.db.insert('adminLogs', {
    userId,
    action,
    details,
    timestamp: Date.now(),
  })
}

// Get admin dashboard analytics
export const getAdminAnalytics = query({
  args: {},
  returns: v.object({
    totalUsers: v.number(),
    totalNotes: v.number(),
    totalSnippets: v.number(),
    totalTodos: v.number(),
    activeUsers24h: v.number(),
    activeUsers7d: v.number(),
    topLanguages: v.array(v.object({
      language: v.string(),
      count: v.number(),
    })),
    topTags: v.array(v.object({
      tag: v.string(),
      count: v.number(),
    })),
    recentActivity: v.array(v.object({
      action: v.string(),
      timestamp: v.number(),
      userId: v.optional(v.id('users')),
      details: v.optional(v.string()),
    })),
  }),
  handler: async (ctx) => {
    await checkAdmin(ctx)

    // Get total counts
    const totalUsers = await ctx.db.query('users').collect()
    const totalNotes = await ctx.db.query('notes').collect()
    const totalSnippets = await ctx.db.query('snippets').collect()
    const totalTodos = await ctx.db.query('todos').collect()

    // Get active users (last 24h and 7d)
    const now = Date.now()
    const oneDayAgo = now - 24 * 60 * 60 * 1000
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000

    const recentLogs24h = await ctx.db
      .query('adminLogs')
      .withIndex('by_timestamp', q => q.gte('timestamp', oneDayAgo))
      .collect()

    const recentLogs7d = await ctx.db
      .query('adminLogs')
      .withIndex('by_timestamp', q => q.gte('timestamp', sevenDaysAgo))
      .collect()

    const activeUsers24h = new Set(recentLogs24h.map(log => log.userId).filter(Boolean)).size
    const activeUsers7d = new Set(recentLogs7d.map(log => log.userId).filter(Boolean)).size

    // Get top languages from snippets
    const languageCounts: Record<string, number> = {}
    totalSnippets.forEach((snippet) => {
      const lang = snippet.language || 'Unknown'
      languageCounts[lang] = (languageCounts[lang] || 0) + 1
    })

    const topLanguages = Object.entries(languageCounts)
      .map(([language, count]) => ({ language, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Get top tags from notes
    const tagCounts: Record<string, number> = {}
    totalNotes.forEach((note) => {
      note.tags?.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      })
    })

    const topTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Get recent activity
    const recentActivity = await ctx.db
      .query('adminLogs')
      .withIndex('by_timestamp', q => q.gte('timestamp', now - 7 * 24 * 60 * 60 * 1000))
      .order('desc')
      .take(20)

    return {
      totalUsers: totalUsers.length,
      totalNotes: totalNotes.length,
      totalSnippets: totalSnippets.length,
      totalTodos: totalTodos.length,
      activeUsers24h,
      activeUsers7d,
      topLanguages,
      topTags,
      recentActivity,
    }
  },
})

// Get notes for moderation
export const getNotesForModeration = query({
  args: {
    searchQuery: v.optional(v.string()),
    userId: v.optional(v.id('users')),
  },
  returns: v.array(v.object({
    _id: v.id('notes'),
    _creationTime: v.number(),
    userId: v.id('users'),
    title: v.string(),
    content: v.string(),
    userEmail: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    await checkAdmin(ctx)

    let items
    if (args.userId) {
      items = await ctx.db
        .query('notes')
        .withIndex('by_user', q => q.eq('userId', args.userId!))
        .collect()
    }
    else {
      items = await ctx.db.query('notes').collect()
    }

    // Get user emails for the items
    const userIds = [...new Set(items.map(item => item.userId))]
    const users = await Promise.all(userIds.map(id => ctx.db.get(id)))
    const userMap = new Map(users.map(user => [user?._id, user?.email]))

    // Filter by search query if provided
    let filteredItems = items
    if (args.searchQuery) {
      const query = args.searchQuery.toLowerCase()
      filteredItems = items.filter(item =>
        item.title.toLowerCase().includes(query)
        || item.content.toLowerCase().includes(query),
      )
    }

    return filteredItems.map(item => ({
      _id: item._id,
      _creationTime: item._creationTime,
      userId: item.userId,
      title: item.title,
      content: item.content,
      userEmail: userMap.get(item.userId),
    }))
  },
})

// Get snippets for moderation
export const getSnippetsForModeration = query({
  args: {
    searchQuery: v.optional(v.string()),
    userId: v.optional(v.id('users')),
  },
  returns: v.array(v.object({
    _id: v.id('snippets'),
    _creationTime: v.number(),
    userId: v.id('users'),
    title: v.string(),
    content: v.string(),
    language: v.string(),
    category: v.string(),
    userEmail: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    await checkAdmin(ctx)

    let items
    if (args.userId) {
      items = await ctx.db
        .query('snippets')
        .withIndex('by_user', q => q.eq('userId', args.userId!))
        .collect()
    }
    else {
      items = await ctx.db.query('snippets').collect()
    }

    // Get user emails for the items
    const userIds = [...new Set(items.map(item => item.userId))]
    const users = await Promise.all(userIds.map(id => ctx.db.get(id)))
    const userMap = new Map(users.map(user => [user?._id, user?.email]))

    // Filter by search query if provided
    let filteredItems = items
    if (args.searchQuery) {
      const query = args.searchQuery.toLowerCase()
      filteredItems = items.filter(item =>
        item.title.toLowerCase().includes(query)
        || item.content.toLowerCase().includes(query),
      )
    }

    return filteredItems.map(item => ({
      _id: item._id,
      _creationTime: item._creationTime,
      userId: item.userId,
      title: item.title,
      content: item.content,
      language: item.language,
      category: item.category,
      userEmail: userMap.get(item.userId),
    }))
  },
})

// Get todos for moderation
export const getTodosForModeration = query({
  args: {
    searchQuery: v.optional(v.string()),
    userId: v.optional(v.id('users')),
  },
  returns: v.array(v.object({
    _id: v.id('todos'),
    _creationTime: v.number(),
    userId: v.id('users'),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal('todo'), v.literal('in_progress'), v.literal('done')),
    userEmail: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    await checkAdmin(ctx)

    let items
    if (args.userId) {
      items = await ctx.db
        .query('todos')
        .withIndex('by_user', q => q.eq('userId', args.userId!))
        .collect()
    }
    else {
      items = await ctx.db.query('todos').collect()
    }

    // Get user emails for the items
    const userIds = [...new Set(items.map(item => item.userId))]
    const users = await Promise.all(userIds.map(id => ctx.db.get(id)))
    const userMap = new Map(users.map(user => [user?._id, user?.email]))

    // Filter by search query if provided
    let filteredItems = items
    if (args.searchQuery) {
      const query = args.searchQuery.toLowerCase()
      filteredItems = items.filter(item =>
        item.title.toLowerCase().includes(query)
        || (item.description && item.description.toLowerCase().includes(query)),
      )
    }

    return filteredItems.map(item => ({
      _id: item._id,
      _creationTime: item._creationTime,
      userId: item.userId,
      title: item.title,
      description: item.description,
      status: item.status,
      userEmail: userMap.get(item.userId),
    }))
  },
})

// Delete content (admin moderation)
export const deleteContent = mutation({
  args: {
    contentType: v.union(v.literal('notes'), v.literal('snippets'), v.literal('todos')),
    contentId: v.id('notes'),
    reason: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    await checkAdmin(ctx)

    try {
      await ctx.db.delete(args.contentId)

      // Log the deletion
      await logAdminAction(ctx, 'delete_content', `Deleted ${args.contentType} ${args.contentId}${args.reason ? ` - Reason: ${args.reason}` : ''}`)

      return true
    }
    catch (error) {
      console.error('Failed to delete content:', error)
      return false
    }
  },
})

// Get system logs
export const getSystemLogs = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id('adminLogs'),
    action: v.string(),
    details: v.optional(v.string()),
    timestamp: v.number(),
    userId: v.optional(v.id('users')),
    userEmail: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    await checkAdmin(ctx)

    const logs = await ctx.db
      .query('adminLogs')
      .withIndex('by_timestamp', q => q.gte('timestamp', Date.now() - 30 * 24 * 60 * 60 * 1000)) // Last 30 days
      .order('desc')
      .take(args.limit || 50)

    // Get user emails for the logs
    const userIds = [...new Set(logs.map(log => log.userId).filter(Boolean))]
    const users = await Promise.all(userIds.map(id => ctx.db.get(id!)))
    const userMap = new Map(users.map(user => [user?._id, user?.email]))

    return logs.map(log => ({
      _id: log._id,
      action: log.action,
      details: log.details,
      timestamp: log.timestamp,
      userId: log.userId,
      userEmail: log.userId ? userMap.get(log.userId) : undefined,
    }))
  },
})

// Note: Admin access is currently hardcoded for testing
// In production, you would need to:
// 1. Add isAdmin field to users table via schema migration
// 2. Create proper admin role management
// 3. Implement proper authentication checks

// Internal function to log user actions
export const logUserAction = internalMutation({
  args: {
    userId: v.optional(v.id('users')),
    action: v.string(),
    details: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert('adminLogs', {
      userId: args.userId,
      action: args.action,
      details: args.details,
      timestamp: Date.now(),
    })
    return null
  },
})
