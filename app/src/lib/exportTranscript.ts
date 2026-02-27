import type { Speaker, WordTimestamp } from "./transcript";

interface ExportOptions {
  title: string;
  markdown: string;
  speakers: Speaker[];
  wordTimestamps: WordTimestamp[];
  durationSeconds?: number;
}

export function exportTranscriptMarkdown(options: ExportOptions): void {
  const { title, markdown, speakers, wordTimestamps, durationSeconds } = options;

  const duration = durationSeconds
    ? `${Math.floor(durationSeconds / 60)}:${String(Math.floor(durationSeconds % 60)).padStart(2, "0")}`
    : "Unknown";

  const speakerNames = speakers.map((s) => s.name).join(", ");

  // Group word timestamps by speaker runs to find paragraph start times
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

  // Re-format paragraphs with timestamps
  const paragraphs = markdown.split(/\n\n+/).filter(Boolean);
  const formattedParagraphs = paragraphs.map((para, i) => {
    const group = i < timestampGroups.length ? timestampGroups[i] : undefined;
    const startTime = group ? group[0].start : 0;
    const mins = Math.floor(startTime / 60);
    const secs = Math.floor(startTime % 60);
    const timestamp = `${mins}:${String(secs).padStart(2, "0")}`;

    return para.replace(/^\*\*(.+?):\*\*/, `**$1** (${timestamp})`);
  });

  const content = [
    `# ${title}`,
    ``,
    `**Duration:** ${duration} | **Speakers:** ${speakerNames}`,
    ``,
    `---`,
    ``,
    ...formattedParagraphs.map((p) => p + "\n"),
  ].join("\n");

  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[^a-zA-Z0-9]/g, "_")}_transcript.md`;
  a.click();
  URL.revokeObjectURL(url);
}
