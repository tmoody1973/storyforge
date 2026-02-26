import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const listByStory = query({
  args: { storyId: v.id("stories") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("comments")
      .withIndex("by_story", (q) => q.eq("storyId", args.storyId))
      .order("desc")
      .take(100);
  },
});
