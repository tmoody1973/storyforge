// ---------------------------------------------------------------------------
// Producer's Script — Type Definitions
// ---------------------------------------------------------------------------

export type BlockSource = "transcript" | "human" | "ai" | "voiceover";

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
}

export interface ProducerScript {
  version: 1;
  blocks: ScriptBlock[];
  createdAt: number;
  lastEditedAt: number;
}
