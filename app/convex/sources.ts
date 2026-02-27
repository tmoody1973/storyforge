import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const listByStory = query({
  args: { storyId: v.id("stories") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sources")
      .withIndex("by_story", (q) => q.eq("storyId", args.storyId))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("sources") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    storyId: v.id("stories"),
    title: v.string(),
    audioUrl: v.string(),
    speakerName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sourceId = await ctx.db.insert("sources", {
      storyId: args.storyId,
      title: args.title,
      audioUrl: args.audioUrl,
      status: "transcribing",
      speakerName: args.speakerName,
      uploadedAt: Date.now(),
    });

    // If story is in draft, advance to transcribing
    const story = await ctx.db.get(args.storyId);
    if (story && story.status === "draft") {
      await ctx.db.patch(args.storyId, { status: "transcribing" });
    }

    return sourceId;
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("sources"),
    status: v.string(),
    transcriptId: v.optional(v.id("transcripts")),
    durationSeconds: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(id, filtered);

    // Check if all sources for this story are ready
    const source = await ctx.db.get(id);
    if (!source) return;

    const allSources = await ctx.db
      .query("sources")
      .withIndex("by_story", (q) => q.eq("storyId", source.storyId))
      .collect();

    const allReady = allSources.every((s) => s.status === "ready");
    if (allReady && allSources.length > 0) {
      const story = await ctx.db.get(source.storyId);
      if (story && story.status === "transcribing") {
        await ctx.db.patch(source.storyId, { status: "editing" });
      }
    }
  },
});

export const remove = mutation({
  args: { id: v.id("sources") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
