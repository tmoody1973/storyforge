"use node";
import { internalAction } from "../_generated/server";
import { v } from "convex/values";

export const sendNotificationEmail = internalAction({
  args: {
    to: v.string(),
    subject: v.string(),
    body: v.string(),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      console.log(`[STUB] Email to ${args.to}: "${args.subject}"`);
      return;
    }

    throw new Error("Real Resend integration not yet implemented");
  },
});
