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
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
