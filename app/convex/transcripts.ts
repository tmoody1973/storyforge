import { v } from "convex/values";
import { query } from "./_generated/server";

export const getByStory = query({
  args: { storyId: v.id("stories") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transcripts")
      .withIndex("by_story", (q) => q.eq("storyId", args.storyId))
      .unique();
  },
});

export const search = query({
  args: { searchText: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transcripts")
      .withSearchIndex("search_text", (q) =>
        q.search("searchableText", args.searchText)
      )
      .take(20);
  },
});
