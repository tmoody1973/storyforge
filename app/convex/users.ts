import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";

export const getMe = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_workos_id", (q) =>
        q.eq("workosUserId", identity.subject)
      )
      .unique();
  },
});

export const upsertFromAuth = internalMutation({
  args: {
    workosUserId: v.string(),
    name: v.string(),
    email: v.string(),
    role: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_workos_id", (q) =>
        q.eq("workosUserId", args.workosUserId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        email: args.email,
        lastActiveAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      workosUserId: args.workosUserId,
      name: args.name,
      email: args.email,
      role: args.role ?? "dj",
      stations: [],
      lastActiveAt: Date.now(),
    });
  },
});

export const updateLastActive = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;

    const user = await ctx.db
      .query("users")
      .withIndex("by_workos_id", (q) =>
        q.eq("workosUserId", identity.subject)
      )
      .unique();

    if (user) {
      await ctx.db.patch(user._id, { lastActiveAt: Date.now() });
    }
  },
});
