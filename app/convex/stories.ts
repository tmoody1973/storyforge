import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("stories").order("desc").take(100);
  },
});

export const listByStation = query({
  args: { stationId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("stories")
      .withIndex("by_station", (q) => q.eq("stationId", args.stationId))
      .order("desc")
      .take(100);
  },
});

export const listByStatus = query({
  args: { status: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("stories")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .order("desc")
      .take(100);
  },
});

export const get = query({
  args: { id: v.id("stories") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const listWithSourceCounts = query({
  handler: async (ctx) => {
    const stories = await ctx.db.query("stories").order("desc").take(100);

    const withCounts = await Promise.all(
      stories.map(async (story) => {
        const sources = await ctx.db
          .query("sources")
          .withIndex("by_story", (q) => q.eq("storyId", story._id))
          .collect();

        const totalSources = sources.length;
        const readySources = sources.filter((s) => s.status === "ready").length;

        return { ...story, totalSources, readySources };
      })
    );

    return withCounts;
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    stationId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Try finding user by email (works for both Clerk and WorkOS)
    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();

    // Auto-create user if not found
    if (!user) {
      const userId = await ctx.db.insert("users", {
        workosUserId: identity.subject,
        name: identity.name ?? "Unknown",
        email: identity.email!,
        role: "producer",
        stations: [],
        lastActiveAt: Date.now(),
      });
      user = (await ctx.db.get(userId))!;
    }

    return await ctx.db.insert("stories", {
      title: args.title,
      stationId: args.stationId,
      creatorId: user._id,
      status: "draft",
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("stories"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
  },
});

export const updateSteering = mutation({
  args: {
    id: v.id("stories"),
    selectedAngle: v.optional(v.string()),
    themes: v.optional(v.array(v.string())),
    emotionalTone: v.optional(v.string()),
    narrativeDirection: v.optional(v.string()),
    targetLengthSeconds: v.optional(v.number()),
    format: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(id, filtered);
  },
});

export const remove = mutation({
  args: { id: v.id("stories") },
  handler: async (ctx, args) => {
    // Delete all sources for this story
    const sources = await ctx.db
      .query("sources")
      .withIndex("by_story", (q) => q.eq("storyId", args.id))
      .collect();
    for (const source of sources) {
      // Delete transcript if linked
      if (source.transcriptId) {
        await ctx.db.delete(source.transcriptId);
      }
      await ctx.db.delete(source._id);
    }
    // Delete any transcripts linked by storyId
    const transcripts = await ctx.db
      .query("transcripts")
      .withIndex("by_story", (q) => q.eq("storyId", args.id))
      .collect();
    for (const t of transcripts) {
      await ctx.db.delete(t._id);
    }
    // Delete the story
    await ctx.db.delete(args.id);
  },
});

export const saveGeneratedContent = mutation({
  args: {
    storyId: v.id("stories"),
    airBreak: v.optional(v.any()),
    podcastSegment: v.optional(v.any()),
    socialThread: v.optional(v.any()),
    webArticle: v.optional(v.any()),
    newsletterCopy: v.optional(v.any()),
    pressRelease: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { storyId, ...content } = args;
    const filtered = Object.fromEntries(
      Object.entries(content).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(storyId, filtered);
  },
});
