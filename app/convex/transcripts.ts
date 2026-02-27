import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";

export const getByStory = query({
  args: { storyId: v.id("stories") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transcripts")
      .withIndex("by_story", (q) => q.eq("storyId", args.storyId))
      .unique();
  },
});

export const getBySource = query({
  args: { sourceId: v.id("sources") },
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.sourceId);
    if (!source?.transcriptId) return null;
    return await ctx.db.get(source.transcriptId);
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

export const insertFromDeepgram = internalMutation({
  args: {
    storyId: v.id("stories"),
    sourceId: v.id("sources"),
    markdown: v.string(),
    speakers: v.any(),
    durationSeconds: v.number(),
    wordTimestamps: v.any(),
    fillerWords: v.any(),
    searchableText: v.string(),
    rawSttJson: v.any(),
  },
  handler: async (ctx, args) => {
    const { sourceId, ...transcriptFields } = args;

    // Insert the transcript record
    const transcriptId = await ctx.db.insert("transcripts", transcriptFields);

    // Patch the source: mark ready, link transcript, set duration
    await ctx.db.patch(sourceId, {
      status: "ready",
      transcriptId,
      durationSeconds: args.durationSeconds,
    });

    // Check if ALL sources for this story are now "ready"
    const pendingSources = await ctx.db
      .query("sources")
      .withIndex("by_story_status", (q) =>
        q.eq("storyId", args.storyId).eq("status", "transcribing")
      )
      .collect();

    const uploadingSources = await ctx.db
      .query("sources")
      .withIndex("by_story_status", (q) =>
        q.eq("storyId", args.storyId).eq("status", "uploading")
      )
      .collect();

    if (pendingSources.length === 0 && uploadingSources.length === 0) {
      const story = await ctx.db.get(args.storyId);
      if (story && story.status === "transcribing") {
        await ctx.db.patch(args.storyId, { status: "editing" });
      }
    }

    return transcriptId;
  },
});

export const markSourceFailed = internalMutation({
  args: {
    sourceId: v.id("sources"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sourceId, { status: "failed" });
  },
});
