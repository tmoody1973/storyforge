"use node";
import { internalAction } from "../_generated/server";
import { v } from "convex/values";

export const postToSlack = internalAction({
  args: {
    message: v.string(),
    detail: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;

    if (!webhookUrl) {
      console.log(`[STUB] Slack: ${args.message}`);
      return;
    }

    throw new Error("Real Slack integration not yet implemented");
  },
});
