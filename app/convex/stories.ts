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

export const create = mutation({
  args: {
    title: v.string(),
    stationId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_workos_id", (q) =>
        q.eq("workosUserId", identity.subject)
      )
      .unique();

    if (!user) throw new Error("User not found");

    return await ctx.db.insert("stories", {
      title: args.title,
      stationId: args.stationId,
      creatorId: user._id,
      status: "transcribing",
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
