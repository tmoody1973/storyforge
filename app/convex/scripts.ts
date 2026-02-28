import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ---------------------------------------------------------------------------
// Types (server-side)
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

// ScriptBlock stored in Convex — NO word data, just edit state
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
  placeholderDuration?: number;
  // Compact word edit state (indices refer to words in this block's time range)
  excludedWords?: number[];
  wordCorrections?: Record<string, string>; // index → corrected text
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

// ---------------------------------------------------------------------------
// Build blocks directly from word timestamps (not markdown)
// ---------------------------------------------------------------------------

function buildBlocksFromWordTimestamps(
  wordTimestamps: WordTimestamp[],
  speakers: Speaker[],
  sourceId?: string,
): ScriptBlock[] {
  if (wordTimestamps.length === 0) return [];

  const speakerById = new Map<string, Speaker>();
  for (const s of speakers) {
    // Map both formats: "speaker_0" and the speaker's actual id
    speakerById.set(s.id, s);
    speakerById.set(s.name, s);
  }

  // Group consecutive words by speaker into blocks
  const blocks: ScriptBlock[] = [];
  let groupWords: WordTimestamp[] = [wordTimestamps[0]];
  let groupSpeaker = wordTimestamps[0].speaker;

  for (let i = 1; i < wordTimestamps.length; i++) {
    const wt = wordTimestamps[i];
    if (wt.speaker !== groupSpeaker) {
      // Flush current group as a block
      blocks.push(makeBlock(groupWords, groupSpeaker, speakerById, sourceId));
      groupWords = [wt];
      groupSpeaker = wt.speaker;
    } else {
      groupWords.push(wt);
    }
  }
  // Flush last group
  blocks.push(makeBlock(groupWords, groupSpeaker, speakerById, sourceId));

  return blocks;
}

function makeBlock(
  words: WordTimestamp[],
  speakerId: string,
  speakerById: Map<string, Speaker>,
  sourceId?: string,
): ScriptBlock {
  const speaker = speakerById.get(speakerId);
  // Build display name: "Speaker 0" from "speaker_0", or use actual name
  const speakerName = speaker?.name ?? speakerId.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    id: crypto.randomUUID(),
    type: "transcript",
    speakerId,
    speakerName,
    originalText: words.map((w) => w.word).join(" "),
    startTime: words[0].start,
    endTime: words[words.length - 1].end,
    sourceId,
    excluded: false,
    source: "transcript",
  };
}

// ---------------------------------------------------------------------------
// Migration helpers
// ---------------------------------------------------------------------------

// Strip word data from blocks (clean up old 880KB documents)
function stripWordData(block: Record<string, unknown>): ScriptBlock {
  const b = { ...block } as Record<string, unknown>;

  // If block has old `words` array, extract edit state then delete
  if (Array.isArray(b.words)) {
    const words = b.words as Array<{
      excluded?: boolean;
      correctedText?: string;
      isFiller?: boolean;
    }>;
    // Extract excluded word indices
    const excludedIndices: number[] = [];
    const corrections: Record<string, string> = {};
    for (let i = 0; i < words.length; i++) {
      if (words[i].excluded) excludedIndices.push(i);
      if (words[i].correctedText) corrections[String(i)] = words[i].correctedText!;
    }
    if (excludedIndices.length > 0) b.excludedWords = excludedIndices;
    if (Object.keys(corrections).length > 0) b.wordCorrections = corrections;
    delete b.words;
  }

  return b as unknown as ScriptBlock;
}

function migrateScript(raw: Record<string, unknown>): ProducerScriptV2 {
  if (raw.version === 2) {
    // Strip word data from all blocks in all versions
    const script = raw as unknown as ProducerScriptV2;
    return {
      ...script,
      versions: script.versions.map((v) => ({
        ...v,
        blocks: v.blocks.map((b) => stripWordData(b as unknown as Record<string, unknown>)),
      })),
    };
  }
  // v1 → v2
  const blocks = ((raw.blocks ?? []) as Array<Record<string, unknown>>).map(stripWordData);
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
    // Auto-migrate v1 → v2 and strip word data
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
  },
  handler: async (ctx, args) => {
    const story = await ctx.db.get(args.storyId);
    if (!story) throw new Error("Story not found");

    // If script already exists, return migrated version
    if (story.generatedScript) {
      const migrated = migrateScript(story.generatedScript as Record<string, unknown>);
      // Persist the cleaned-up version (strips word data)
      await ctx.db.patch(args.storyId, { generatedScript: migrated });
      return migrated;
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

    // Build blocks from word timestamps directly
    const blocks = buildBlocksFromWordTimestamps(wordTimestamps, speakers, args.sourceId);

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

// Force re-initialize: rebuild blocks from word timestamps
export const reinitializeScript = mutation({
  args: {
    storyId: v.id("stories"),
    sourceId: v.optional(v.id("sources")),
  },
  handler: async (ctx, args) => {
    const story = await ctx.db.get(args.storyId);
    if (!story) throw new Error("Story not found");

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

    const blocks = buildBlocksFromWordTimestamps(wordTimestamps, speakers, args.sourceId);

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
    // Strip any word data that might have leaked in from client
    const script = args.script as ProducerScriptV2;
    const cleaned: ProducerScriptV2 = {
      ...script,
      versions: (script.versions ?? []).map((v: ScriptVersion) => ({
        ...v,
        blocks: (v.blocks ?? []).map((b: ScriptBlock) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { words, ...rest } = b as ScriptBlock & { words?: unknown };
          return rest as ScriptBlock;
        }),
      })),
      lastEditedAt: Date.now(),
    };
    await ctx.db.patch(args.storyId, { generatedScript: cleaned });
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
// Word-level mutations (compact — store indices, not word data)
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
        if (b.id !== args.blockId) return b;
        const excluded = new Set(b.excludedWords ?? []);
        if (excluded.has(args.wordIndex)) {
          excluded.delete(args.wordIndex);
        } else {
          excluded.add(args.wordIndex);
        }
        return { ...b, excludedWords: [...excluded].sort((a, c) => a - c) };
      }),
    );

    await ctx.db.patch(args.storyId, { generatedScript: updated });
  },
});

export const setExcludedWords = mutation({
  args: {
    storyId: v.id("stories"),
    blockId: v.string(),
    wordIndices: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const story = await ctx.db.get(args.storyId);
    if (!story?.generatedScript) throw new Error("No script found");

    const script = migrateScript(story.generatedScript as Record<string, unknown>);
    const updated = updateActiveBlocks(script, (blocks) =>
      blocks.map((b) => {
        if (b.id !== args.blockId) return b;
        const current = new Set(b.excludedWords ?? []);
        for (const idx of args.wordIndices) current.add(idx);
        return { ...b, excludedWords: [...current].sort((a, c) => a - c) };
      }),
    );

    await ctx.db.patch(args.storyId, { generatedScript: updated });
  },
});

export const removeAllFillers = mutation({
  args: {
    storyId: v.id("stories"),
    // Client sends which word indices are fillers per block
    fillerIndices: v.array(v.object({
      blockId: v.string(),
      indices: v.array(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const story = await ctx.db.get(args.storyId);
    if (!story?.generatedScript) throw new Error("No script found");

    const script = migrateScript(story.generatedScript as Record<string, unknown>);
    const fillerMap = new Map(args.fillerIndices.map((f) => [f.blockId, new Set(f.indices)]));

    const updated = updateActiveBlocks(script, (blocks) =>
      blocks.map((b) => {
        const fillers = fillerMap.get(b.id);
        if (!fillers) return b;
        const excluded = new Set(b.excludedWords ?? []);
        for (const idx of fillers) excluded.add(idx);
        return { ...b, excludedWords: [...excluded].sort((a, c) => a - c) };
      }),
    );

    await ctx.db.patch(args.storyId, { generatedScript: updated });
  },
});

export const restoreAllFillers = mutation({
  args: {
    storyId: v.id("stories"),
    fillerIndices: v.array(v.object({
      blockId: v.string(),
      indices: v.array(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const story = await ctx.db.get(args.storyId);
    if (!story?.generatedScript) throw new Error("No script found");

    const script = migrateScript(story.generatedScript as Record<string, unknown>);
    const fillerMap = new Map(args.fillerIndices.map((f) => [f.blockId, new Set(f.indices)]));

    const updated = updateActiveBlocks(script, (blocks) =>
      blocks.map((b) => {
        const fillers = fillerMap.get(b.id);
        if (!fillers) return b;
        const excluded = new Set(b.excludedWords ?? []);
        for (const idx of fillers) excluded.delete(idx);
        return {
          ...b,
          excludedWords: excluded.size > 0 ? [...excluded].sort((a, c) => a - c) : undefined,
        };
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
        if (b.id !== args.blockId) return b;
        const corrections = { ...(b.wordCorrections ?? {}) };
        if (args.correctedText) {
          corrections[String(args.wordIndex)] = args.correctedText;
        } else {
          delete corrections[String(args.wordIndex)];
        }
        return {
          ...b,
          wordCorrections: Object.keys(corrections).length > 0 ? corrections : undefined,
        };
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
      blocks: JSON.parse(JSON.stringify(activeBlocks)),
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
