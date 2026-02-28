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
 * Build transcript segments directly from word timestamps.
 * Groups consecutive words by speaker — timestamps are guaranteed correct
 * since they come straight from the word data.
 */
function buildSegmentsFromWordTimestamps(
  wordTimestamps: WordTimestamp[],
  speakers: Speaker[],
): TranscriptSegment[] {
  if (wordTimestamps.length === 0) return [];

  const speakerMap = new Map<string, Speaker>();
  for (const s of speakers) {
    speakerMap.set(s.id, s);
    speakerMap.set(s.name, s);
  }

  const segments: TranscriptSegment[] = [];
  let groupWords: WordTimestamp[] = [wordTimestamps[0]];
  let groupSpeaker = wordTimestamps[0].speaker;

  function flush(words: WordTimestamp[], speakerId: string) {
    const speaker = speakerMap.get(speakerId);
    const speakerName =
      speaker?.name ??
      speakerId.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
    segments.push({
      speakerId: speaker?.id ?? speakerId,
      speakerName,
      speakerColor: speaker?.color ?? "#a1a1aa",
      text: words.map((w) => w.word).join(" "),
      startTime: words[0].start,
      endTime: words[words.length - 1].end,
    });
  }

  for (let i = 1; i < wordTimestamps.length; i++) {
    const wt = wordTimestamps[i];
    if (wt.speaker !== groupSpeaker) {
      flush(groupWords, groupSpeaker);
      groupWords = [wt];
      groupSpeaker = wt.speaker;
    } else {
      groupWords.push(wt);
    }
  }
  flush(groupWords, groupSpeaker);

  return segments;
}

/**
 * Parse a transcript into structured segments with timing data.
 *
 * When word timestamps are available, builds segments directly from them
 * (guaranteed correct timing). Falls back to markdown parsing when no
 * word timestamps exist.
 */
export function parseTranscriptMarkdown(
  markdown: string,
  speakers: Speaker[],
  wordTimestamps: WordTimestamp[],
): TranscriptSegment[] {
  // Prefer building from word timestamps — timestamps are always correct
  if (wordTimestamps.length > 0) {
    return buildSegmentsFromWordTimestamps(wordTimestamps, speakers);
  }

  // Fallback: parse markdown (legacy transcripts without word data)
  if (!markdown.trim()) return [];

  const speakerByName = new Map<string, Speaker>();
  for (const s of speakers) {
    speakerByName.set(s.name, s);
  }

  const paragraphs = markdown
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const speakerPattern =
    /^\*\*(.+?)(?::)?\*\*(?:\s*(?:\([^)]*\)\s*)?\n?|\s*)(.*)$/s;

  const segments: TranscriptSegment[] = [];

  for (const para of paragraphs) {
    if (para.startsWith("#")) continue;

    const match = speakerPattern.exec(para);
    const speakerName = match ? match[1] : "Unknown";
    const text = match ? match[2].trim() : para;
    const speaker = speakerByName.get(speakerName);

    segments.push({
      speakerId: speaker?.id ?? "unknown",
      speakerName,
      speakerColor: speaker?.color ?? "#a1a1aa",
      text,
      startTime: 0,
      endTime: 0,
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
