import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ---------------------------------------------------------------------------
// Helpers (server-side transcript parsing for script initialization)
// ---------------------------------------------------------------------------

interface Speaker {
  id: string;
  name: string;
  color: string;
}

interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker: string;
}

interface ScriptBlock {
  id: string;
  type: "transcript" | "voiceover";
  speakerId?: string;
  speakerName?: string;
  originalText?: string;
  startTime?: number;
  endTime?: number;
  sourceId?: string;
  excluded: boolean;
  source: "transcript" | "human" | "ai" | "voiceover";
}

function parseTranscriptToBlocks(
  markdown: string,
  speakers: Speaker[],
  wordTimestamps: WordTimestamp[],
  sourceId?: string,
): ScriptBlock[] {
  if (!markdown.trim()) return [];

  const speakerByName = new Map<string, Speaker>();
  for (const s of speakers) {
    speakerByName.set(s.name, s);
  }

  const paragraphs = markdown
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  // Group word timestamps by speaker runs
  const timestampGroups: WordTimestamp[][] = [];
  let currentGroup: WordTimestamp[] = [];
  let currentSpeaker: string | null = null;

  for (const wt of wordTimestamps) {
    if (wt.speaker !== currentSpeaker) {
      if (currentGroup.length > 0) timestampGroups.push(currentGroup);
      currentGroup = [wt];
      currentSpeaker = wt.speaker;
    } else {
      currentGroup.push(wt);
    }
  }
  if (currentGroup.length > 0) timestampGroups.push(currentGroup);

  const speakerPattern =
    /^\*\*(.+?)(?::)?\*\*(?:\s*(?:\([^)]*\)\s*)?\n?|\s*)(.*)$/s;

  const blocks: ScriptBlock[] = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    if (para.startsWith("#")) continue;

    const match = speakerPattern.exec(para);
    const speakerName = match ? match[1] : "Unknown";
    const text = match ? match[2].trim() : para;
    const speaker = speakerByName.get(speakerName);

    const group = i < timestampGroups.length ? timestampGroups[i] : undefined;
    const startTime = group ? group[0].start : 0;
    const endTime = group ? group[group.length - 1].end : 0;

    blocks.push({
      id: crypto.randomUUID(),
      type: "transcript",
      speakerId: speaker?.id ?? "unknown",
      speakerName,
      originalText: text,
      startTime,
      endTime,
      sourceId,
      excluded: false,
      source: "transcript",
    });
  }

  return blocks;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getScript = query({
  args: { storyId: v.id("stories") },
  handler: async (ctx, args) => {
    const story = await ctx.db.get(args.storyId);
    return story?.generatedScript ?? null;
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const initializeScript = mutation({
  args: {
    storyId: v.id("stories"),
    sourceId: v.optional(v.id("sources")),
  },
  handler: async (ctx, args) => {
    const story = await ctx.db.get(args.storyId);
    if (!story) throw new Error("Story not found");

    // If script already exists, return it
    if (story.generatedScript) return story.generatedScript;

    // Find the transcript — try sourceId first, then by story
    let transcript = null;
    if (args.sourceId) {
      const source = await ctx.db.get(args.sourceId);
      if (source?.transcriptId) {
        transcript = await ctx.db.get(source.transcriptId);
      }
    }
    if (!transcript) {
      transcript = await ctx.db
        .query("transcripts")
        .withIndex("by_story", (q) => q.eq("storyId", args.storyId))
        .first();
    }

    if (!transcript) throw new Error("No transcript found for this story");

    const speakers = (transcript.speakers ?? []) as Speaker[];
    const wordTimestamps = (transcript.wordTimestamps ?? []) as WordTimestamp[];
    const blocks = parseTranscriptToBlocks(
      transcript.markdown,
      speakers,
      wordTimestamps,
      args.sourceId,
    );

    const now = Date.now();
    const script = {
      version: 1,
      blocks,
      createdAt: now,
      lastEditedAt: now,
    };

    await ctx.db.patch(args.storyId, { generatedScript: script });
    return script;
  },
});

export const saveScript = mutation({
  args: {
    storyId: v.id("stories"),
    script: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.storyId, {
      generatedScript: {
        ...args.script,
        lastEditedAt: Date.now(),
      },
    });
  },
});

export const updateBlockText = mutation({
  args: {
    storyId: v.id("stories"),
    blockId: v.string(),
    editedText: v.string(),
  },
  handler: async (ctx, args) => {
    const story = await ctx.db.get(args.storyId);
    if (!story?.generatedScript) throw new Error("No script found");

    const script = story.generatedScript as { blocks: ScriptBlock[]; version: number; createdAt: number; lastEditedAt: number };
    const blocks = script.blocks.map((b: ScriptBlock) =>
      b.id === args.blockId
        ? { ...b, editedText: args.editedText, source: b.editedText !== b.originalText ? "human" as const : b.source }
        : b,
    );

    await ctx.db.patch(args.storyId, {
      generatedScript: { ...script, blocks, lastEditedAt: Date.now() },
    });
  },
});

export const toggleBlockExclusion = mutation({
  args: {
    storyId: v.id("stories"),
    blockId: v.string(),
  },
  handler: async (ctx, args) => {
    const story = await ctx.db.get(args.storyId);
    if (!story?.generatedScript) throw new Error("No script found");

    const script = story.generatedScript as { blocks: ScriptBlock[]; version: number; createdAt: number; lastEditedAt: number };
    const blocks = script.blocks.map((b: ScriptBlock) =>
      b.id === args.blockId ? { ...b, excluded: !b.excluded } : b,
    );

    await ctx.db.patch(args.storyId, {
      generatedScript: { ...script, blocks, lastEditedAt: Date.now() },
    });
  },
});

export const insertVoiceoverBlock = mutation({
  args: {
    storyId: v.id("stories"),
    afterBlockId: v.optional(v.string()),
    cueText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const story = await ctx.db.get(args.storyId);
    if (!story?.generatedScript) throw new Error("No script found");

    const script = story.generatedScript as { blocks: ScriptBlock[]; version: number; createdAt: number; lastEditedAt: number };
    const voBlock: ScriptBlock = {
      id: crypto.randomUUID(),
      type: "voiceover",
      excluded: false,
      source: "voiceover",
      voCueText: args.cueText ?? "",
    } as ScriptBlock;

    const blocks = [...script.blocks];
    if (args.afterBlockId) {
      const idx = blocks.findIndex((b: ScriptBlock) => b.id === args.afterBlockId);
      blocks.splice(idx + 1, 0, voBlock);
    } else {
      blocks.push(voBlock);
    }

    await ctx.db.patch(args.storyId, {
      generatedScript: { ...script, blocks, lastEditedAt: Date.now() },
    });

    return voBlock.id;
  },
});

export const updateVoiceoverBlock = mutation({
  args: {
    storyId: v.id("stories"),
    blockId: v.string(),
    cueText: v.optional(v.string()),
    draftNarration: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const story = await ctx.db.get(args.storyId);
    if (!story?.generatedScript) throw new Error("No script found");

    const script = story.generatedScript as { blocks: ScriptBlock[]; version: number; createdAt: number; lastEditedAt: number };
    const blocks = script.blocks.map((b: ScriptBlock) => {
      if (b.id !== args.blockId) return b;
      return {
        ...b,
        ...(args.cueText !== undefined ? { voCueText: args.cueText } : {}),
        ...(args.draftNarration !== undefined ? { voDraftNarration: args.draftNarration } : {}),
      };
    });

    await ctx.db.patch(args.storyId, {
      generatedScript: { ...script, blocks, lastEditedAt: Date.now() },
    });
  },
});

export const removeBlock = mutation({
  args: {
    storyId: v.id("stories"),
    blockId: v.string(),
  },
  handler: async (ctx, args) => {
    const story = await ctx.db.get(args.storyId);
    if (!story?.generatedScript) throw new Error("No script found");

    const script = story.generatedScript as { blocks: ScriptBlock[]; version: number; createdAt: number; lastEditedAt: number };
    const block = script.blocks.find((b: ScriptBlock) => b.id === args.blockId);

    // Only voiceover blocks can be removed; transcript blocks get excluded
    if (block?.type === "transcript") {
      throw new Error("Use toggleBlockExclusion for transcript blocks");
    }

    const blocks = script.blocks.filter((b: ScriptBlock) => b.id !== args.blockId);

    await ctx.db.patch(args.storyId, {
      generatedScript: { ...script, blocks, lastEditedAt: Date.now() },
    });
  },
});

export const saveAiSuggestion = mutation({
  args: {
    storyId: v.id("stories"),
    blockId: v.string(),
    suggestion: v.string(),
  },
  handler: async (ctx, args) => {
    const story = await ctx.db.get(args.storyId);
    if (!story?.generatedScript) throw new Error("No script found");

    const script = story.generatedScript as { blocks: ScriptBlock[]; version: number; createdAt: number; lastEditedAt: number };
    const blocks = script.blocks.map((b: ScriptBlock) =>
      b.id === args.blockId
        ? { ...b, aiSuggestion: args.suggestion, aiSuggestionAccepted: undefined }
        : b,
    );

    await ctx.db.patch(args.storyId, {
      generatedScript: { ...script, blocks, lastEditedAt: Date.now() },
    });
  },
});

export const handleAiSuggestion = mutation({
  args: {
    storyId: v.id("stories"),
    blockId: v.string(),
    accepted: v.boolean(),
  },
  handler: async (ctx, args) => {
    const story = await ctx.db.get(args.storyId);
    if (!story?.generatedScript) throw new Error("No script found");

    const script = story.generatedScript as { blocks: ScriptBlock[]; version: number; createdAt: number; lastEditedAt: number };
    const blocks = script.blocks.map((b: ScriptBlock) => {
      if (b.id !== args.blockId) return b;
      if (args.accepted) {
        return {
          ...b,
          editedText: (b as { aiSuggestion?: string }).aiSuggestion ?? b.editedText,
          source: "ai" as const,
          aiSuggestionAccepted: true,
        };
      }
      return { ...b, aiSuggestion: undefined, aiSuggestionAccepted: false };
    });

    await ctx.db.patch(args.storyId, {
      generatedScript: { ...script, blocks, lastEditedAt: Date.now() },
    });
  },
});
