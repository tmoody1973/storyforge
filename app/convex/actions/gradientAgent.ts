"use node";
import { action } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";

export const callAgent = action({
  args: {
    agent: v.string(), // "coach" | "transcript" | "content" | "workflow"
    payload: v.any(),
  },
  handler: async (_ctx, args) => {
    const agentUrl = process.env.GRADIENT_AGENT_URL;

    if (!agentUrl) {
      console.log(`[STUB] Gradient Agent "${args.agent}" called`);

      switch (args.agent) {
        case "coach":
          return {
            coaching: "I see strong story angles in this interview. The emotional peak around the midpoint could anchor your air break. Consider leading with the most vivid quote.",
          };
        case "transcript":
          return {
            storyAngles: [
              { angle: "Community change", strength: 0.9, reasoning: "Strong personal narrative" },
              { angle: "Housing crisis", strength: 0.7, reasoning: "Data-supported trend" },
            ],
            keyQuotes: [
              { text: "This is a mock quote", start: 14.32, end: 14.58, theme: "loss" },
            ],
            emotionalArc: [
              { time: 0, intensity: 0.3 },
              { time: 60, intensity: 0.7 },
              { time: 120, intensity: 0.5 },
            ],
          };
        case "content":
          return {
            airBreak: { script: "Mock air break script...", estimatedSeconds: 90 },
            podcastSegment: { script: "Mock podcast segment...", estimatedSeconds: 480 },
            socialThread: { posts: ["Mock social post 1", "Mock social post 2"] },
            webArticle: { html: "<p>Mock web article...</p>" },
            newsletterCopy: { text: "Mock newsletter copy..." },
            pressRelease: { text: "Mock press release..." },
          };
        case "workflow":
          return { action: "none", message: "No workflow action needed" };
        default:
          return { error: `Unknown agent: ${args.agent}` };
      }
    }

    const response = await fetch(agentUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agent: args.agent,
        input: args.payload,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gradient Agent error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data.result ?? data;
  },
});

export const analyzeTranscript = action({
  args: {
    transcriptId: v.id("transcripts"),
    storyId: v.id("stories"),
    markdown: v.string(),
    wordTimestamps: v.any(),
  },
  handler: async (ctx, args) => {
    try {
      const result = await ctx.runAction(api.actions.gradientAgent.callAgent, {
        agent: "transcript",
        payload: {
          transcript: args.markdown,
          word_timestamps: args.wordTimestamps,
        },
      });

      await ctx.runMutation(internal.transcripts.saveAnalysis, {
        transcriptId: args.transcriptId,
        storyAngles: result.story_angles ?? result.storyAngles ?? [],
        keyQuotes: result.key_quotes ?? result.keyQuotes ?? [],
        emotionalArc: result.emotional_arc ?? result.emotionalArc ?? [],
      });
    } catch (error) {
      console.error("Transcript analysis failed:", error);
      // Non-fatal — transcript still exists, just no analysis
    }
  },
});
