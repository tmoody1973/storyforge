"use node";
import { action } from "../_generated/server";
import { v } from "convex/values";

export const transcribe = action({
  args: { audioFileId: v.id("_storage") },
  handler: async (_ctx, _args) => {
    const apiKey = process.env.DEEPGRAM_API_KEY;

    if (!apiKey) {
      console.log("[STUB] Deepgram transcribe called — returning mock data");
      return {
        transcript: {
          markdown: "**Speaker 1:** This is a mock transcript for development.\n\n**Speaker 2:** It includes word-level timestamps for testing.",
          speakers: [
            { id: "speaker_1", name: "Speaker 1", color: "#4A9EFF" },
            { id: "speaker_2", name: "Speaker 2", color: "#FF6B4A" },
          ],
          durationSeconds: 120,
          wordTimestamps: [
            { word: "This", start: 0.0, end: 0.2, confidence: 0.99, speaker: "speaker_1" },
            { word: "is", start: 0.2, end: 0.3, confidence: 0.99, speaker: "speaker_1" },
            { word: "a", start: 0.3, end: 0.35, confidence: 0.99, speaker: "speaker_1" },
            { word: "mock", start: 0.35, end: 0.55, confidence: 0.99, speaker: "speaker_1" },
            { word: "transcript", start: 0.55, end: 0.9, confidence: 0.98, speaker: "speaker_1" },
          ],
          searchableText: "This is a mock transcript for development. It includes word-level timestamps for testing.",
        },
      };
    }

    // TODO: Real Deepgram API call
    throw new Error("Real Deepgram integration not yet implemented");
  },
});
