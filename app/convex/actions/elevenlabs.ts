"use node";
import { action } from "../_generated/server";
import { v } from "convex/values";

export const generateSoundEffect = action({
  args: {
    prompt: v.string(),
    durationSeconds: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      console.log(`[STUB] ElevenLabs SFX: "${args.prompt}" (${args.durationSeconds}s)`);
      return { fileId: null, durationSeconds: args.durationSeconds ?? 10 };
    }

    throw new Error("Real ElevenLabs integration not yet implemented");
  },
});

export const generateMusic = action({
  args: {
    prompt: v.string(),
    durationSeconds: v.number(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      console.log(`[STUB] ElevenLabs Music: "${args.prompt}" (${args.durationSeconds}s)`);
      return { fileId: null };
    }

    throw new Error("Real ElevenLabs integration not yet implemented");
  },
});
