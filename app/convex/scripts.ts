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

interface WordRef {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker: string;
  excluded: boolean;
  isFiller: boolean;
  correctedText?: string;
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
  editedText?: string;
  voCueText?: string;
  voDraftNarration?: string;
  aiSuggestion?: string;
  aiSuggestionAccepted?: boolean;
  notes?: string;
  words?: WordRef[];
  placeholderDuration?: number;
}

interface ScriptVersion {
  id: string;
  name: string;
  blocks: ScriptBlock[];
  createdAt: number;
}

interface ProducerScriptV2 {
  version: 2;
  activeVersionId: string;
  versions: ScriptVersion[];
  createdAt: number;
  lastEditedAt: number;
}

// Common filler words to auto-tag
const FILLER_WORDS = new Set([
  "um", "uh", "erm", "ah", "hmm", "like", "you know", "i mean",
  "sort of", "kind of", "basically", "actually", "literally",
  "right", "so", "well", "okay",
]);

function parseTranscriptToBlocks(
  markdown: string,
  speakers: Speaker[],
  wordTimestamps: WordTimestamp[],
  fillerWords: Array<{ word: string; start: number; end: number; speaker: string }>,
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

  // Build a set of filler word time positions for quick lookup
  const fillerSet = new Set<string>();
  for (const fw of fillerWords) {
    fillerSet.add(`${fw.start.toFixed(3)}-${fw.end.toFixed(3)}`);
  }

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

    // Attach WordRef[] from timestamp group
    const words: WordRef[] = group
      ? group.map((wt) => {
          const key = `${wt.start.toFixed(3)}-${wt.end.toFixed(3)}`;
          const isFiller =
            fillerSet.has(key) ||
            FILLER_WORDS.has(wt.word.toLowerCase().replace(/[.,!?]/g, ""));
          return {
            word: wt.word,
            start: wt.start,
            end: wt.end,
            confidence: wt.confidence,
            speaker: wt.speaker,
            excluded: false,
            isFiller,
          };
        })
      : [];

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
      words,
    });
  }

  return blocks;
}

// Migrate v1 script to v2 format
function migrateScript(raw: Record<string, unknown>): ProducerScriptV2 {
  if (raw.version === 2) return raw as unknown as ProducerScriptV2;
  // v1 → v2
  const blocks = (raw.blocks ?? []) as ScriptBlock[];
  const versionId = crypto.randomUUID();
  return {
    version: 2,
    activeVersionId: versionId,
    versions: [
      {
        id: versionId,
        name: "Original",
        blocks,
        createdAt: (raw.createdAt as number) ?? Date.now(),
      },
    ],
    createdAt: (raw.createdAt as number) ?? Date.now(),
    lastEditedAt: (raw.lastEditedAt as number) ?? Date.now(),
  };
}

// Helper: get active blocks from a v2 script
function getActiveBlocks(script: ProducerScriptV2): ScriptBlock[] {
  const version = script.versions.find((v) => v.id === script.activeVersionId);
  return version?.blocks ?? [];
}

// Helper: update active version's blocks
function updateActiveBlocks(
  script: ProducerScriptV2,
  updater: (blocks: ScriptBlock[]) => ScriptBlock[],
): ProducerScriptV2 {
  return {
    ...script,
    versions: script.versions.map((v) =>
      v.id === script.activeVersionId
        ? { ...v, blocks: updater(v.blocks) }
        : v,
    ),
    lastEditedAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getScript = query({
  args: { storyId: v.id("stories") },
  handler: async (ctx, args) => {
    const story = await ctx.db.get(args.storyId);
    if (!story?.generatedScript) return null;
    // Auto-migrate v1 → v2 on read
    return migrateScript(story.generatedScript as Record<string, unknown>);
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const initializeScript = mutation({
  args: {
    storyId: v.id("stories"),
    sourceId: v.optional(v.id("sources")),
    fillerWords: v.optional(v.array(v.object({
      word: v.string(),
      start: v.number(),
      end: v.number(),
      speaker: v.string(),
    }))),
  },
  handler: async (ctx, args) => {
    const story = await ctx.db.get(args.storyId);
    if (!story) throw new Error("Story not found");

    // If script already exists, return migrated version
    if (story.generatedScript) {
      return migrateScript(story.generatedScript as Record<string, unknown>);
    }

    // Find the transcript
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
    const fillerWords = (args.fillerWords ?? (transcript as Record<string, unknown>).fillerWords ?? []) as Array<{
      word: string;
      start: number;
      end: number;
      speaker: string;
    }>;

    const blocks = parseTranscriptToBlocks(
      transcript.markdown,
      speakers,
      wordTimestamps,
      fillerWords,
      args.sourceId,
    );

    const now = Date.now();
    const versionId = crypto.randomUUID();
    const script: ProducerScriptV2 = {
      version: 2,
      activeVersionId: versionId,
      versions: [
        {
          id: versionId,
          name: "Original",
          blocks,
          createdAt: now,
        },
      ],
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

    const script = migrateScript(story.generatedScript as Record<string, unknown>);
    const updated = updateActiveBlocks(script, (blocks) =>
      blocks.map((b) =>
        b.id === args.blockId
          ? { ...b, editedText: args.editedText, source: b.editedText !== b.originalText ? "human" as const : b.source }
          : b,
      ),
    );

    await ctx.db.patch(args.storyId, { generatedScript: updated });
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

    const script = migrateScript(story.generatedScript as Record<string, unknown>);
    const updated = updateActiveBlocks(script, (blocks) =>
      blocks.map((b) =>
        b.id === args.blockId ? { ...b, excluded: !b.excluded } : b,
      ),
    );

    await ctx.db.patch(args.storyId, { generatedScript: updated });
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

    const script = migrateScript(story.generatedScript as Record<string, unknown>);
    const voBlock: ScriptBlock = {
      id: crypto.randomUUID(),
      type: "voiceover",
      excluded: false,
      source: "voiceover",
      voCueText: args.cueText ?? "",
    } as ScriptBlock;

    const updated = updateActiveBlocks(script, (blocks) => {
      const newBlocks = [...blocks];
      if (args.afterBlockId) {
        const idx = newBlocks.findIndex((b) => b.id === args.afterBlockId);
        newBlocks.splice(idx + 1, 0, voBlock);
      } else {
        newBlocks.push(voBlock);
      }
      return newBlocks;
    });

    await ctx.db.patch(args.storyId, { generatedScript: updated });
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

    const script = migrateScript(story.generatedScript as Record<string, unknown>);
    const updated = updateActiveBlocks(script, (blocks) =>
      blocks.map((b) => {
        if (b.id !== args.blockId) return b;
        return {
          ...b,
          ...(args.cueText !== undefined ? { voCueText: args.cueText } : {}),
          ...(args.draftNarration !== undefined ? { voDraftNarration: args.draftNarration } : {}),
        };
      }),
    );

    await ctx.db.patch(args.storyId, { generatedScript: updated });
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

    const script = migrateScript(story.generatedScript as Record<string, unknown>);
    const blocks = getActiveBlocks(script);
    const block = blocks.find((b) => b.id === args.blockId);

    if (block?.type === "transcript") {
      throw new Error("Use toggleBlockExclusion for transcript blocks");
    }

    const updated = updateActiveBlocks(script, (blocks) =>
      blocks.filter((b) => b.id !== args.blockId),
    );

    await ctx.db.patch(args.storyId, { generatedScript: updated });
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

    const script = migrateScript(story.generatedScript as Record<string, unknown>);
    const updated = updateActiveBlocks(script, (blocks) =>
      blocks.map((b) =>
        b.id === args.blockId
          ? { ...b, aiSuggestion: args.suggestion, aiSuggestionAccepted: undefined }
          : b,
      ),
    );

    await ctx.db.patch(args.storyId, { generatedScript: updated });
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

    const script = migrateScript(story.generatedScript as Record<string, unknown>);
    const updated = updateActiveBlocks(script, (blocks) =>
      blocks.map((b) => {
        if (b.id !== args.blockId) return b;
        if (args.accepted) {
          return {
            ...b,
            editedText: b.aiSuggestion ?? b.editedText,
            source: "ai" as const,
            aiSuggestionAccepted: true,
          };
        }
        return { ...b, aiSuggestion: undefined, aiSuggestionAccepted: false };
      }),
    );

    await ctx.db.patch(args.storyId, { generatedScript: updated });
  },
});

// ---------------------------------------------------------------------------
// Word-level mutations
// ---------------------------------------------------------------------------

export const toggleWordExclusion = mutation({
  args: {
    storyId: v.id("stories"),
    blockId: v.string(),
    wordIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const story = await ctx.db.get(args.storyId);
    if (!story?.generatedScript) throw new Error("No script found");

    const script = migrateScript(story.generatedScript as Record<string, unknown>);
    const updated = updateActiveBlocks(script, (blocks) =>
      blocks.map((b) => {
        if (b.id !== args.blockId || !b.words) return b;
        const words = b.words.map((w, i) =>
          i === args.wordIndex ? { ...w, excluded: !w.excluded } : w,
        );
        return { ...b, words };
      }),
    );

    await ctx.db.patch(args.storyId, { generatedScript: updated });
  },
});

export const removeAllFillers = mutation({
  args: {
    storyId: v.id("stories"),
  },
  handler: async (ctx, args) => {
    const story = await ctx.db.get(args.storyId);
    if (!story?.generatedScript) throw new Error("No script found");

    const script = migrateScript(story.generatedScript as Record<string, unknown>);
    const updated = updateActiveBlocks(script, (blocks) =>
      blocks.map((b) => {
        if (!b.words) return b;
        const words = b.words.map((w) =>
          w.isFiller ? { ...w, excluded: true } : w,
        );
        return { ...b, words };
      }),
    );

    await ctx.db.patch(args.storyId, { generatedScript: updated });
  },
});

export const restoreAllFillers = mutation({
  args: {
    storyId: v.id("stories"),
  },
  handler: async (ctx, args) => {
    const story = await ctx.db.get(args.storyId);
    if (!story?.generatedScript) throw new Error("No script found");

    const script = migrateScript(story.generatedScript as Record<string, unknown>);
    const updated = updateActiveBlocks(script, (blocks) =>
      blocks.map((b) => {
        if (!b.words) return b;
        const words = b.words.map((w) =>
          w.isFiller ? { ...w, excluded: false } : w,
        );
        return { ...b, words };
      }),
    );

    await ctx.db.patch(args.storyId, { generatedScript: updated });
  },
});

export const correctWord = mutation({
  args: {
    storyId: v.id("stories"),
    blockId: v.string(),
    wordIndex: v.number(),
    correctedText: v.string(),
  },
  handler: async (ctx, args) => {
    const story = await ctx.db.get(args.storyId);
    if (!story?.generatedScript) throw new Error("No script found");

    const script = migrateScript(story.generatedScript as Record<string, unknown>);
    const updated = updateActiveBlocks(script, (blocks) =>
      blocks.map((b) => {
        if (b.id !== args.blockId || !b.words) return b;
        const words = b.words.map((w, i) =>
          i === args.wordIndex
            ? { ...w, correctedText: args.correctedText || undefined }
            : w,
        );
        return { ...b, words };
      }),
    );

    await ctx.db.patch(args.storyId, { generatedScript: updated });
  },
});

// ---------------------------------------------------------------------------
// Versioning mutations
// ---------------------------------------------------------------------------

export const createVersion = mutation({
  args: {
    storyId: v.id("stories"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const story = await ctx.db.get(args.storyId);
    if (!story?.generatedScript) throw new Error("No script found");

    const script = migrateScript(story.generatedScript as Record<string, unknown>);
    const activeBlocks = getActiveBlocks(script);

    const newVersionId = crypto.randomUUID();
    const newVersion: ScriptVersion = {
      id: newVersionId,
      name: args.name,
      blocks: JSON.parse(JSON.stringify(activeBlocks)), // deep clone
      createdAt: Date.now(),
    };

    const updated: ProducerScriptV2 = {
      ...script,
      activeVersionId: newVersionId,
      versions: [...script.versions, newVersion],
      lastEditedAt: Date.now(),
    };

    await ctx.db.patch(args.storyId, { generatedScript: updated });
    return newVersionId;
  },
});

export const switchVersion = mutation({
  args: {
    storyId: v.id("stories"),
    versionId: v.string(),
  },
  handler: async (ctx, args) => {
    const story = await ctx.db.get(args.storyId);
    if (!story?.generatedScript) throw new Error("No script found");

    const script = migrateScript(story.generatedScript as Record<string, unknown>);
    const exists = script.versions.some((v) => v.id === args.versionId);
    if (!exists) throw new Error("Version not found");

    const updated: ProducerScriptV2 = {
      ...script,
      activeVersionId: args.versionId,
      lastEditedAt: Date.now(),
    };

    await ctx.db.patch(args.storyId, { generatedScript: updated });
  },
});

export const renameVersion = mutation({
  args: {
    storyId: v.id("stories"),
    versionId: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const story = await ctx.db.get(args.storyId);
    if (!story?.generatedScript) throw new Error("No script found");

    const script = migrateScript(story.generatedScript as Record<string, unknown>);
    const updated: ProducerScriptV2 = {
      ...script,
      versions: script.versions.map((v) =>
        v.id === args.versionId ? { ...v, name: args.name } : v,
      ),
      lastEditedAt: Date.now(),
    };

    await ctx.db.patch(args.storyId, { generatedScript: updated });
  },
});

export const deleteVersion = mutation({
  args: {
    storyId: v.id("stories"),
    versionId: v.string(),
  },
  handler: async (ctx, args) => {
    const story = await ctx.db.get(args.storyId);
    if (!story?.generatedScript) throw new Error("No script found");

    const script = migrateScript(story.generatedScript as Record<string, unknown>);
    if (script.versions.length <= 1) {
      throw new Error("Cannot delete the last version");
    }

    const newVersions = script.versions.filter((v) => v.id !== args.versionId);
    const newActiveId =
      script.activeVersionId === args.versionId
        ? newVersions[0].id
        : script.activeVersionId;

    const updated: ProducerScriptV2 = {
      ...script,
      activeVersionId: newActiveId,
      versions: newVersions,
      lastEditedAt: Date.now(),
    };

    await ctx.db.patch(args.storyId, { generatedScript: updated });
  },
});
