import { getAuthUserId } from '@convex-dev/auth/server'
import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

/**
 * Get all todos for the current user, grouped by status
 */
export const getTodos = query({
  args: {},
  returns: v.object({
    todo: v.array(v.object({
      _id: v.id('todos'),
      _creationTime: v.number(),
      userId: v.id('users'),
      title: v.string(),
      description: v.optional(v.string()),
      status: v.union(v.literal('todo'), v.literal('in_progress'), v.literal('done')),
      dueDate: v.optional(v.number()),
      createdAt: v.optional(v.number()),
      updatedAt: v.optional(v.number()),
    })),
    inProgress: v.array(v.object({
      _id: v.id('todos'),
      _creationTime: v.number(),
      userId: v.id('users'),
      title: v.string(),
      description: v.optional(v.string()),
      status: v.union(v.literal('todo'), v.literal('in_progress'), v.literal('done')),
      dueDate: v.optional(v.number()),
      createdAt: v.optional(v.number()),
      updatedAt: v.optional(v.number()),
    })),
    done: v.array(v.object({
      _id: v.id('todos'),
      _creationTime: v.number(),
      userId: v.id('users'),
      title: v.string(),
      description: v.optional(v.string()),
      status: v.union(v.literal('todo'), v.literal('in_progress'), v.literal('done')),
      dueDate: v.optional(v.number()),
      createdAt: v.optional(v.number()),
      updatedAt: v.optional(v.number()),
    })),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const [todo, inProgress, done] = await Promise.all([
      ctx.db
        .query('todos')
        .withIndex('by_user_and_status', q =>
          q.eq('userId', userId).eq('status', 'todo'))
        .order('asc')
        .collect(),
      ctx.db
        .query('todos')
        .withIndex('by_user_and_status', q =>
          q.eq('userId', userId).eq('status', 'in_progress'))
        .order('asc')
        .collect(),
      ctx.db
        .query('todos')
        .withIndex('by_user_and_status', q =>
          q.eq('userId', userId).eq('status', 'done'))
        .order('asc')
        .collect(),
    ])

    return { todo, inProgress, done }
  },
})

/**
 * Create a new todo
 */
export const createTodo = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    dueDate: v.optional(v.number()),
  },
  returns: v.id('todos'),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const now = Date.now()

    return await ctx.db.insert('todos', {
      userId,
      title: args.title,
      description: args.description,
      status: 'todo' as const,
      dueDate: args.dueDate,
      createdAt: now,
      updatedAt: now,
    })
  },
})

/**
 * Update a todo
 */
export const updateTodo = mutation({
  args: {
    id: v.id('todos'),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.union(v.literal('todo'), v.literal('in_progress'), v.literal('done'))),
    dueDate: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const todo = await ctx.db.get(args.id)

    if (!todo || todo.userId !== userId) {
      throw new Error('Todo not found or access denied')
    }

    const updates: any = { updatedAt: Date.now() }
    if (args.title !== undefined)
      updates.title = args.title
    if (args.description !== undefined)
      updates.description = args.description
    if (args.status !== undefined)
      updates.status = args.status
    if (args.dueDate !== undefined)
      updates.dueDate = args.dueDate

    await ctx.db.patch(args.id, updates)
    return null
  },
})

/**
 * Delete a todo
 */
export const deleteTodo = mutation({
  args: {
    id: v.id('todos'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const todo = await ctx.db.get(args.id)

    if (!todo || todo.userId !== userId) {
      throw new Error('Todo not found or access denied')
    }

    await ctx.db.delete(args.id)
    return null
  },
})

/**
 * Toggle todo status (todo <-> done)
 */
export const toggleTodoStatus = mutation({
  args: {
    id: v.id('todos'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const todo = await ctx.db.get(args.id)

    if (!todo || todo.userId !== userId) {
      throw new Error('Todo not found or access denied')
    }

    const newStatus = todo.status === 'done' ? 'todo' : 'done'
    await ctx.db.patch(args.id, {
      status: newStatus,
      updatedAt: Date.now(),
    })
    return null
  },
})
