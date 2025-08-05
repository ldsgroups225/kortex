import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  notes: defineTable({
    userId: v.id("users"),
    title: v.string(),
    content: v.string(),
    tags: v.array(v.string()),
    pinned: v.boolean(),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_pinned", ["userId", "pinned"])
    .index("by_created_at", ["createdAt"])
    .index("by_pinned", ["pinned"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["userId"],
    })
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["userId"],
    }),

  snippets: defineTable({
    userId: v.id("users"),
    title: v.string(),
    content: v.string(),
    language: v.string(),
    category: v.string(),
    pinned: v.boolean(),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_category", ["userId", "category"])
    .index("by_language", ["language"])
    .index("by_category", ["category"])
    .index("by_created_at", ["createdAt"])
    .index("by_pinned", ["pinned"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["userId", "category"],
    })
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["userId", "category"],
    }),

  todos: defineTable({
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done")),
    dueDate: v.optional(v.number()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_status", ["userId", "status"])
    .index("by_status", ["status"])
    .index("by_created_at", ["createdAt"]),

  userPreferences: defineTable({
    userId: v.id("users"),
    theme: v.union(v.literal("light"), v.literal("dark"), v.literal("system")),
    language: v.union(v.literal("en"), v.literal("fr")),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]),

  adminLogs: defineTable({
    userId: v.optional(v.id("users")),
    action: v.string(),
    details: v.optional(v.string()),
    timestamp: v.number(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_user", ["userId"])
    .index("by_action", ["action"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
