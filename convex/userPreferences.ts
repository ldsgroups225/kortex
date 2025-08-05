import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getUserPreferences = query({
  args: {},
  returns: v.union(
    v.object({
      theme: v.union(v.literal("light"), v.literal("dark"), v.literal("system")),
      language: v.union(v.literal("en"), v.literal("fr")),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const preferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!preferences) {
      return null;
    }

    return {
      theme: preferences.theme,
      language: preferences.language,
    };
  },
});

export const updateUserPreferences = mutation({
  args: {
    theme: v.optional(v.union(v.literal("light"), v.literal("dark"), v.literal("system"))),
    language: v.optional(v.union(v.literal("en"), v.literal("fr"))),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return false;
    }

    const existingPreferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    const updatedPreferences = {
      userId,
      theme: args.theme ?? existingPreferences?.theme ?? "system",
      language: args.language ?? existingPreferences?.language ?? "en",
      updatedAt: Date.now(),
    };

    if (existingPreferences) {
      await ctx.db.patch(existingPreferences._id, updatedPreferences);
    } else {
      await ctx.db.insert("userPreferences", updatedPreferences);
    }

    return true;
  },
}); 
