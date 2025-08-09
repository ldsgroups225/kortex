import { getAuthUserId } from '@convex-dev/auth/server'
import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

/**
 * Get all todos for the current user, grouped by status
 * This includes todos created by the user and todos assigned to the user
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
      tags: v.array(v.string()),
      assignedToUserId: v.optional(v.id('users')),
      assignedToUser: v.optional(v.object({
        _id: v.id('users'),
        name: v.optional(v.string()),
        email: v.optional(v.string()),
      })),
      createdByUser: v.object({
        _id: v.id('users'),
        name: v.optional(v.string()),
        email: v.optional(v.string()),
      }),
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
      tags: v.array(v.string()),
      assignedToUserId: v.optional(v.id('users')),
      assignedToUser: v.optional(v.object({
        _id: v.id('users'),
        name: v.optional(v.string()),
        email: v.optional(v.string()),
      })),
      createdByUser: v.object({
        _id: v.id('users'),
        name: v.optional(v.string()),
        email: v.optional(v.string()),
      }),
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
      tags: v.array(v.string()),
      assignedToUserId: v.optional(v.id('users')),
      assignedToUser: v.optional(v.object({
        _id: v.id('users'),
        name: v.optional(v.string()),
        email: v.optional(v.string()),
      })),
      createdByUser: v.object({
        _id: v.id('users'),
        name: v.optional(v.string()),
        email: v.optional(v.string()),
      }),
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

    // Get todos created by the user or assigned to the user
    const [todosByUser, todosByAssignment, inProgressByUser, inProgressByAssignment, doneByUser, doneByAssignment] = await Promise.all([
      // Todos created by user
      ctx.db
        .query('todos')
        .withIndex('by_user_and_status', q =>
          q.eq('userId', userId).eq('status', 'todo'))
        .order('asc')
        .collect(),
      // Todos assigned to user
      ctx.db
        .query('todos')
        .withIndex('by_assigned_user_and_status', q =>
          q.eq('assignedToUserId', userId).eq('status', 'todo'))
        .order('asc')
        .collect(),
      // In progress created by user
      ctx.db
        .query('todos')
        .withIndex('by_user_and_status', q =>
          q.eq('userId', userId).eq('status', 'in_progress'))
        .order('asc')
        .collect(),
      // In progress assigned to user
      ctx.db
        .query('todos')
        .withIndex('by_assigned_user_and_status', q =>
          q.eq('assignedToUserId', userId).eq('status', 'in_progress'))
        .order('asc')
        .collect(),
      // Done created by user
      ctx.db
        .query('todos')
        .withIndex('by_user_and_status', q =>
          q.eq('userId', userId).eq('status', 'done'))
        .order('asc')
        .collect(),
      // Done assigned to user
      ctx.db
        .query('todos')
        .withIndex('by_assigned_user_and_status', q =>
          q.eq('assignedToUserId', userId).eq('status', 'done'))
        .order('asc')
        .collect(),
    ])

    // Combine and deduplicate todos (in case user created and assigned to themselves)
    const allTodos = [
      ...todosByUser,
      ...todosByAssignment.filter(t => !todosByUser.some(ut => ut._id === t._id)),
      ...inProgressByUser,
      ...inProgressByAssignment.filter(t => !inProgressByUser.some(ut => ut._id === t._id)),
      ...doneByUser,
      ...doneByAssignment.filter(t => !doneByUser.some(ut => ut._id === t._id)),
    ]

    // Get all unique user IDs to fetch user details
    const userIds = new Set<string>()
    allTodos.forEach((todo) => {
      userIds.add(todo.userId)
      if (todo.assignedToUserId) {
        userIds.add(todo.assignedToUserId)
      }
    })

    // Fetch user details with proper typing
    const userPromises = Array.from(userIds).map(async (id) => {
      const doc = await ctx.db.get(id as any)
      // Type guard to ensure we only process user documents
      if (doc && '_id' in doc && typeof doc._id === 'string' && doc._id.startsWith('users')) {
        return doc as { _id: any, name?: string, email?: string, [key: string]: any }
      }
      return null
    })

    const users = await Promise.all(userPromises)
    const userMap = new Map(
      users.filter(Boolean).map(user => [user!._id, user!]),
    )

    // Transform todos to include user information
    const transformTodo = (todo: any) => {
      const createdByUser = userMap.get(todo.userId)
      const assignedToUser = todo.assignedToUserId ? userMap.get(todo.assignedToUserId) : null

      return {
        ...todo,
        tags: todo.tags || [], // Provide default empty array for existing todos without tags
        createdByUser: {
          _id: createdByUser?._id || todo.userId,
          name: createdByUser?.name || undefined,
          email: createdByUser?.email || undefined,
        },
        assignedToUser: assignedToUser
          ? {
              _id: assignedToUser._id,
              name: assignedToUser.name || undefined,
              email: assignedToUser.email || undefined,
            }
          : undefined,
      }
    }

    const todo = [...todosByUser, ...todosByAssignment.filter(t => !todosByUser.some(ut => ut._id === t._id))]
      .map(transformTodo)
    const inProgress = [...inProgressByUser, ...inProgressByAssignment.filter(t => !inProgressByUser.some(ut => ut._id === t._id))]
      .map(transformTodo)
    const done = [...doneByUser, ...doneByAssignment.filter(t => !doneByUser.some(ut => ut._id === t._id))]
      .map(transformTodo)

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
    tags: v.optional(v.array(v.string())),
    assignedToUserId: v.optional(v.id('users')),
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
      tags: args.tags || [],
      assignedToUserId: args.assignedToUserId,
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
    tags: v.optional(v.array(v.string())),
    assignedToUserId: v.optional(v.id('users')),
    dueDate: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const todo = await ctx.db.get(args.id)

    if (!todo) {
      throw new Error('Todo not found')
    }

    // Check permissions: creator can always edit, assigned user can only complete
    const isCreator = todo.userId === userId
    const isAssignedUser = todo.assignedToUserId === userId

    if (!isCreator && !isAssignedUser) {
      throw new Error('Access denied: You can only edit todos you created or are assigned to')
    }

    // If user is only assigned (not creator), they can only change status to done
    if (!isCreator && isAssignedUser) {
      if (args.status !== 'done' && args.status !== undefined) {
        throw new Error('Assigned users can only mark todos as done')
      }
      if (args.title !== undefined || args.description !== undefined || args.tags !== undefined || args.assignedToUserId !== undefined || args.dueDate !== undefined) {
        throw new Error('Assigned users can only change the status to done')
      }
    }

    const updates: any = { updatedAt: Date.now() }
    if (args.title !== undefined)
      updates.title = args.title
    if (args.description !== undefined)
      updates.description = args.description
    if (args.status !== undefined)
      updates.status = args.status
    if (args.tags !== undefined)
      updates.tags = args.tags
    if (args.assignedToUserId !== undefined)
      updates.assignedToUserId = args.assignedToUserId
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

    if (!todo) {
      throw new Error('Todo not found')
    }

    // Check permissions: creator can always toggle, assigned user can only mark as done
    const isCreator = todo.userId === userId
    const isAssignedUser = todo.assignedToUserId === userId

    if (!isCreator && !isAssignedUser) {
      throw new Error('Access denied: You can only modify todos you created or are assigned to')
    }

    const newStatus = todo.status === 'done' ? 'todo' : 'done'

    // If user is only assigned (not creator) and trying to mark as todo, prevent it
    if (!isCreator && isAssignedUser && newStatus === 'todo') {
      throw new Error('Assigned users can only mark todos as done, not reopen them')
    }

    await ctx.db.patch(args.id, {
      status: newStatus,
      updatedAt: Date.now(),
    })
    return null
  },
})
