// ---------------------------------------------------------------------------
// Producer's Script — Type Definitions (v2)
// ---------------------------------------------------------------------------

export type BlockSource = "transcript" | "human" | "ai" | "voiceover";

// Word-level data for rendering (hydrated client-side, NOT stored in Convex)
export interface WordRef {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker: string;
  excluded: boolean;
  isFiller: boolean;
  correctedText?: string;
}

export interface ScriptBlock {
  id: string;
  type: "transcript" | "voiceover";
  speakerId?: string;
  speakerName?: string;
  originalText?: string;
  editedText?: string;
  startTime?: number;
  endTime?: number;
  sourceId?: string;
  excluded: boolean;
  source: BlockSource;
  voCueText?: string;
  voDraftNarration?: string;
  aiSuggestion?: string;
  aiSuggestionAccepted?: boolean;
  notes?: string;
  placeholderDuration?: number;
  // Compact word edit state stored in Convex
  excludedWords?: number[];
  wordCorrections?: Record<string, string>;
  // Hydrated at render time (NOT stored in Convex)
  words?: WordRef[];
}

export interface ScriptVersion {
  id: string;
  name: string;
  blocks: ScriptBlock[];
  createdAt: number;
}

export interface ProducerScript {
  version: 2;
  activeVersionId: string;
  versions: ScriptVersion[];
  createdAt: number;
  lastEditedAt: number;
}

// v1 shape for migration
export interface ProducerScriptV1 {
  version: 1;
  blocks: ScriptBlock[];
  createdAt: number;
  lastEditedAt: number;
}

// Undo operation types (client-side only)
export type EditOperation =
  | { type: "textChange"; blockId: string; before: string; after: string }
  | { type: "toggleExclude"; blockId: string; before: boolean }
  | { type: "wordExclude"; blockId: string; wordIndex: number; before: boolean }
  | { type: "insertVoiceover"; blockId: string }
  | { type: "removeBlock"; blockId: string; block: ScriptBlock; index: number }
  | { type: "fillerRemoveAll"; changes: Array<{ blockId: string; wordIndex: number }> }
  | { type: "correctWord"; blockId: string; wordIndex: number; before?: string; after: string };

// Helper to get blocks from v2 script
export function getActiveBlocks(script: ProducerScript): ScriptBlock[] {
  const version = script.versions.find((v) => v.id === script.activeVersionId);
  return version?.blocks ?? [];
}

// Migrate v1 script to v2 format
export function migrateV1toV2(raw: ProducerScriptV1 | ProducerScript): ProducerScript {
  if (raw.version === 2) return raw as ProducerScript;
  const v1 = raw as ProducerScriptV1;
  const versionId = crypto.randomUUID();
  return {
    version: 2,
    activeVersionId: versionId,
    versions: [
      {
        id: versionId,
        name: "Original",
        blocks: v1.blocks,
        createdAt: v1.createdAt,
      },
    ],
    createdAt: v1.createdAt,
    lastEditedAt: v1.lastEditedAt,
  };
}
