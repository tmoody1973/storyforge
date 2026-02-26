"use node";
import { action } from "../_generated/server";
import { v } from "convex/values";

export const search = action({
  args: {
    query: v.string(),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.FREESOUND_API_KEY;

    if (!apiKey) {
      console.log(`[STUB] Freesound search: "${args.query}"`);
      return {
        count: 3,
        results: [
          { id: 1, name: "City Ambience", duration: 30, license: "CC0", tags: ["city", "ambient"] },
          { id: 2, name: "Rain on Roof", duration: 60, license: "CC-BY", tags: ["rain", "ambient"] },
          { id: 3, name: "Soft Piano", duration: 45, license: "CC0", tags: ["music", "piano"] },
        ],
      };
    }

    throw new Error("Real Freesound integration not yet implemented");
  },
});
