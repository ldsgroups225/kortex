import { getAuthUserId } from '@convex-dev/auth/server'
import { v } from 'convex/values'
import { query } from './_generated/server'

/**
 * Get all users (for assignment purposes)
 */
export const getUsers = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id('users'),
    _creationTime: v.number(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
  })),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    // Get all users for assignment dropdown
    const users = await ctx.db.query('users').collect()

    // Return sanitized user data (only necessary fields for assignments)
    return users.map(user => ({
      _id: user._id,
      _creationTime: user._creationTime,
      name: user.name,
      email: user.email,
      image: user.image,
    }))
  },
})

/**
 * Get current user profile
 */
export const getCurrentUser = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id('users'),
      _creationTime: v.number(),
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      image: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return null
    }

    const user = await ctx.db.get(userId)
    if (!user) {
      return null
    }

    return {
      _id: user._id,
      _creationTime: user._creationTime,
      name: user.name,
      email: user.email,
      image: user.image,
    }
  },
})
