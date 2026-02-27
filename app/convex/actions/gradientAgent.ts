"use node";
import { action } from "../_generated/server";
import { v } from "convex/values";

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

    // TODO: Real HTTP call to deployed Gradient ADK agent
    throw new Error("Real Gradient Agent integration not yet implemented");
  },
});
