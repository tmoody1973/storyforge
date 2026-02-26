export interface Speaker {
  id: string;
  name: string;
  color: string;
}

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker: string;
}

export interface TranscriptSegment {
  speakerId: string;
  speakerName: string;
  speakerColor: string;
  text: string;
  startTime: number;
  endTime: number;
}

/**
 * Parse a markdown transcript into structured segments with timing data.
 *
 * Markdown format: paragraphs separated by double newlines, each starting with
 * `**SpeakerName:** rest of text`.
 *
 * Word timestamps are grouped by speaker changes and matched to paragraphs by
 * index to determine time boundaries.
 */
export function parseTranscriptMarkdown(
  markdown: string,
  speakers: Speaker[],
  wordTimestamps: WordTimestamp[],
): TranscriptSegment[] {
  if (!markdown.trim()) return [];

  const speakerByName = new Map<string, Speaker>();
  for (const s of speakers) {
    speakerByName.set(s.name, s);
  }

  // Split markdown into paragraphs by double newline
  const paragraphs = markdown
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  // Group word timestamps into contiguous speaker runs
  const timestampGroups: WordTimestamp[][] = [];
  let currentGroup: WordTimestamp[] = [];
  let currentSpeaker: string | null = null;

  for (const wt of wordTimestamps) {
    if (wt.speaker !== currentSpeaker) {
      if (currentGroup.length > 0) {
        timestampGroups.push(currentGroup);
      }
      currentGroup = [wt];
      currentSpeaker = wt.speaker;
    } else {
      currentGroup.push(wt);
    }
  }
  if (currentGroup.length > 0) {
    timestampGroups.push(currentGroup);
  }

  const speakerPattern = /^\*\*(.+?):\*\*\s*(.*)$/s;

  const segments: TranscriptSegment[] = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const match = speakerPattern.exec(para);

    const speakerName = match ? match[1] : "Unknown";
    const text = match ? match[2] : para;
    const speaker = speakerByName.get(speakerName);

    // Use matching timestamp group by paragraph index for time boundaries
    const group = i < timestampGroups.length ? timestampGroups[i] : undefined;
    const startTime = group ? group[0].start : 0;
    const endTime = group ? group[group.length - 1].end : 0;

    segments.push({
      speakerId: speaker?.id ?? "unknown",
      speakerName,
      speakerColor: speaker?.color ?? "#a1a1aa",
      text,
      startTime,
      endTime,
    });
  }

  return segments;
}

/**
 * Find the index of the active segment for a given playback time.
 * Returns the last segment whose startTime <= currentTime, or 0 by default.
 */
export function findActiveSegment(
  segments: TranscriptSegment[],
  currentTime: number,
): number {
  let activeIndex = 0;
  for (let i = 0; i < segments.length; i++) {
    if (segments[i].startTime <= currentTime) {
      activeIndex = i;
    }
  }
  return activeIndex;
}

/**
 * Format seconds into M:SS display string.
 */
export function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
