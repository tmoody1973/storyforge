import type { TranscriptSegment, WordTimestamp } from "./transcript";
import type { ScriptBlock, ProducerScript, WordRef } from "./scriptTypes";
import { getActiveBlocks } from "./scriptTypes";
import { formatTimestamp } from "./transcript";

// ---------------------------------------------------------------------------
// Time range types
// ---------------------------------------------------------------------------

export interface TimeRange {
  start: number;
  end: number;
}

// Common filler words
const FILLER_WORDS = new Set([
  "um", "uh", "erm", "ah", "hmm", "like", "you know", "i mean",
  "sort of", "kind of", "basically", "actually", "literally",
  "right", "so", "well", "okay",
]);

// ---------------------------------------------------------------------------
// Client-side word hydration
// ---------------------------------------------------------------------------

/**
 * Hydrate a block's word data from the transcript's wordTimestamps.
 * Filters words by the block's time range, applies exclusions & corrections.
 */
export function hydrateBlockWords(
  block: ScriptBlock,
  allWordTimestamps: WordTimestamp[],
  fillerWords?: Array<{ word: string; start: number; end: number; speaker: string }>,
): WordRef[] {
  if (block.type !== "transcript" || block.startTime == null || block.endTime == null) {
    return [];
  }

  // Build filler set for quick lookup
  const fillerSet = new Set<string>();
  if (fillerWords) {
    for (const fw of fillerWords) {
      fillerSet.add(`${fw.start.toFixed(3)}-${fw.end.toFixed(3)}`);
    }
  }

  const excludedSet = new Set(block.excludedWords ?? []);
  const corrections = block.wordCorrections ?? {};

  // Find words that fall within this block's time range
  const blockWords: WordRef[] = [];
  for (const wt of allWordTimestamps) {
    if (wt.start >= block.startTime! - 0.01 && wt.end <= block.endTime! + 0.01) {
      const idx = blockWords.length;
      const key = `${wt.start.toFixed(3)}-${wt.end.toFixed(3)}`;
      const isFiller =
        fillerSet.has(key) ||
        FILLER_WORDS.has(wt.word.toLowerCase().replace(/[.,!?]/g, ""));

      blockWords.push({
        word: wt.word,
        start: wt.start,
        end: wt.end,
        confidence: wt.confidence,
        speaker: wt.speaker,
        excluded: excludedSet.has(idx),
        isFiller,
        correctedText: corrections[String(idx)] ?? undefined,
      });
    }
  }

  return blockWords;
}

/**
 * Hydrate all blocks in a script with word data.
 */
export function hydrateScript(
  blocks: ScriptBlock[],
  wordTimestamps: WordTimestamp[],
  fillerWords?: Array<{ word: string; start: number; end: number; speaker: string }>,
): ScriptBlock[] {
  return blocks.map((block) => ({
    ...block,
    words: hydrateBlockWords(block, wordTimestamps, fillerWords),
  }));
}

// ---------------------------------------------------------------------------
// Excluded ranges computation
// ---------------------------------------------------------------------------

/**
 * Merge overlapping/adjacent time ranges into a minimal set.
 */
export function mergeRanges(ranges: TimeRange[]): TimeRange[] {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: TimeRange[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (sorted[i].start <= last.end + 0.01) {
      last.end = Math.max(last.end, sorted[i].end);
    } else {
      merged.push({ ...sorted[i] });
    }
  }
  return merged;
}

/**
 * Compute all excluded time ranges from hydrated script blocks.
 */
export function computeExcludedRanges(blocks: ScriptBlock[]): TimeRange[] {
  const ranges: TimeRange[] = [];

  for (const block of blocks) {
    if (block.type !== "transcript") continue;

    if (block.excluded) {
      if (block.startTime != null && block.endTime != null) {
        ranges.push({ start: block.startTime, end: block.endTime });
      }
      continue;
    }

    // Word-level exclusions (from hydrated words)
    if (block.words) {
      for (const word of block.words) {
        if (word.excluded) {
          ranges.push({ start: word.start, end: word.end });
        }
      }
    }
  }

  return mergeRanges(ranges);
}

/**
 * Estimate VO duration at ~150 words per minute.
 */
export function estimateVoDuration(text: string): number {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  return (wordCount / 150) * 60;
}

/**
 * Count total filler words across hydrated blocks.
 */
export function countFillerWords(blocks: ScriptBlock[]): number {
  let count = 0;
  for (const block of blocks) {
    if (block.words) {
      for (const word of block.words) {
        if (word.isFiller) count++;
      }
    }
  }
  return count;
}

/**
 * Count excluded filler words.
 */
export function countExcludedFillers(blocks: ScriptBlock[]): number {
  let count = 0;
  for (const block of blocks) {
    if (block.words) {
      for (const word of block.words) {
        if (word.isFiller && word.excluded) count++;
      }
    }
  }
  return count;
}

/**
 * Get filler word indices per block (for mutations).
 */
export function getFillerIndicesPerBlock(
  blocks: ScriptBlock[],
): Array<{ blockId: string; indices: number[] }> {
  const result: Array<{ blockId: string; indices: number[] }> = [];
  for (const block of blocks) {
    if (!block.words) continue;
    const indices: number[] = [];
    block.words.forEach((w, i) => {
      if (w.isFiller) indices.push(i);
    });
    if (indices.length > 0) {
      result.push({ blockId: block.id, indices });
    }
  }
  return result;
}

/**
 * Compute estimated duration of included content.
 */
export function computeIncludedDuration(blocks: ScriptBlock[]): {
  included: number;
  total: number;
} {
  let total = 0;
  let excluded = 0;
  let voDuration = 0;

  for (const block of blocks) {
    if (block.type === "voiceover") {
      if (!block.excluded) {
        const text = block.voDraftNarration ?? block.voCueText ?? "";
        voDuration += block.placeholderDuration ?? estimateVoDuration(text);
      }
      continue;
    }

    if (block.startTime != null && block.endTime != null) {
      const blockDur = block.endTime - block.startTime;
      total += blockDur;

      if (block.excluded) {
        excluded += blockDur;
      } else if (block.words) {
        for (const word of block.words) {
          if (word.excluded) {
            excluded += word.end - word.start;
          }
        }
      }
    }
  }

  return {
    included: total - excluded + voDuration,
    total,
  };
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

/**
 * Get the display text for a script block.
 */
export function getBlockDisplayText(block: ScriptBlock): string {
  if (block.type === "voiceover") {
    return block.voDraftNarration ?? block.voCueText ?? "";
  }
  if (block.words && block.words.length > 0) {
    return block.words
      .filter((w) => !w.excluded)
      .map((w) => w.correctedText ?? w.word)
      .join(" ");
  }
  return block.editedText ?? block.originalText ?? "";
}

/**
 * Determine the effective source for color-coding.
 */
export function getEffectiveSource(block: ScriptBlock): ScriptBlock["source"] {
  if (block.type === "voiceover") return "voiceover";
  if (block.editedText != null && block.editedText !== block.originalText) {
    return "human";
  }
  if (block.aiSuggestion && block.aiSuggestionAccepted) return "ai";
  return block.source;
}

/**
 * Find the active script block index for a given playback time.
 */
export function findActiveBlock(
  blocks: ScriptBlock[],
  currentTime: number,
): number {
  let activeIndex = 0;
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.startTime != null && block.startTime <= currentTime && !block.excluded) {
      activeIndex = i;
    }
  }
  return activeIndex;
}

/**
 * Find the active word index within a block for a given playback time.
 */
export function findActiveWord(
  words: WordRef[],
  currentTime: number,
): number {
  for (let i = words.length - 1; i >= 0; i--) {
    if (words[i].start <= currentTime && words[i].end >= currentTime) {
      return i;
    }
  }
  return -1;
}

/**
 * Export a ProducerScript as downloadable markdown.
 */
export function exportScriptMarkdown(
  script: ProducerScript,
  title: string,
): void {
  const blocks = getActiveBlocks(script);
  const lines: string[] = [
    `# ${title} — Producer's Script`,
    "",
    `**Exported:** ${new Date().toLocaleString()}`,
    "",
    "---",
    "",
  ];

  for (const block of blocks) {
    if (block.excluded) continue;

    if (block.type === "voiceover") {
      lines.push(`### [VOICE-OVER]`);
      if (block.voCueText) {
        lines.push(`*Cue: ${block.voCueText}*`);
      }
      if (block.voDraftNarration) {
        lines.push("");
        lines.push(block.voDraftNarration);
      }
      lines.push("");
      continue;
    }

    const timestamp = block.startTime != null
      ? ` (${formatTimestamp(block.startTime)})`
      : "";
    const speaker = block.speakerName ?? "Unknown";

    let text: string;
    if (block.words && block.words.length > 0) {
      text = block.words
        .filter((w) => !w.excluded)
        .map((w) => w.correctedText ?? w.word)
        .join(" ");
    } else {
      text = block.editedText ?? block.originalText ?? "";
    }

    lines.push(`**${speaker}**${timestamp}`);
    lines.push(text);

    if (block.notes) {
      lines.push(`> *Note: ${block.notes}*`);
    }

    lines.push("");
  }

  const content = lines.join("\n");
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[^a-zA-Z0-9]/g, "_")}_script.md`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Convert parsed transcript segments into an initial ProducerScript.
 */
export function initializeScriptFromTranscript(
  segments: TranscriptSegment[],
  sourceId?: string,
): ProducerScript {
  const now = Date.now();
  const blocks: ScriptBlock[] = segments.map((seg) => ({
    id: crypto.randomUUID(),
    type: "transcript" as const,
    speakerId: seg.speakerId,
    speakerName: seg.speakerName,
    originalText: seg.text,
    startTime: seg.startTime,
    endTime: seg.endTime,
    sourceId,
    excluded: false,
    source: "transcript" as const,
  }));

  const versionId = crypto.randomUUID();
  return {
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
}
