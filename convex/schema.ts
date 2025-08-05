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
  })
    .index("by_user", ["userId"])
    .index("by_user_and_pinned", ["userId", "pinned"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["userId"],
    })
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["userId"],
    }),

  snippets: defineTable({
    userId: v.id("users"),
    title: v.string(),
    content: v.string(),
    language: v.optional(v.string()),
    category: v.string(),
    pinned: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_category", ["userId", "category"])
    .index("by_user_and_pinned", ["userId", "pinned"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["userId", "category"],
    })
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["userId", "category"],
    }),

  todos: defineTable({
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done")),
    dueDate: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_status", ["userId", "status"])
    .index("by_user_and_due_date", ["userId", "dueDate"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["userId", "status"],
    })
    .searchIndex("search_description", {
      searchField: "description",
      filterFields: ["userId", "status"],
    }),

  userPreferences: defineTable({
    userId: v.id("users"),
    theme: v.union(v.literal("light"), v.literal("dark"), v.literal("system")),
    language: v.union(v.literal("en"), v.literal("fr")),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
