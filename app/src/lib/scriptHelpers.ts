import type { TranscriptSegment } from "./transcript";
import type { ScriptBlock, ProducerScript } from "./scriptTypes";
import { formatTimestamp } from "./transcript";

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

  return {
    version: 1,
    blocks,
    createdAt: now,
    lastEditedAt: now,
  };
}

/**
 * Export a ProducerScript as downloadable markdown.
 */
export function exportScriptMarkdown(
  script: ProducerScript,
  title: string,
): void {
  const lines: string[] = [
    `# ${title} — Producer's Script`,
    "",
    `**Exported:** ${new Date().toLocaleString()}`,
    "",
    "---",
    "",
  ];

  for (const block of script.blocks) {
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

    // Transcript block
    const timestamp = block.startTime != null
      ? ` (${formatTimestamp(block.startTime)})`
      : "";
    const speaker = block.speakerName ?? "Unknown";
    const text = block.editedText ?? block.originalText ?? "";
    const editMarker = block.editedText ? " ✏️" : "";

    lines.push(`**${speaker}**${timestamp}${editMarker}`);
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
 * Get the display text for a script block.
 */
export function getBlockDisplayText(block: ScriptBlock): string {
  if (block.type === "voiceover") {
    return block.voDraftNarration ?? block.voCueText ?? "";
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
