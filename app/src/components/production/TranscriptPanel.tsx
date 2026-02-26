import { useMemo, useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  parseTranscriptMarkdown,
  findActiveSegment,
  formatTimestamp,
} from "@/lib/transcript";
import type { Speaker, WordTimestamp } from "@/lib/transcript";

interface TranscriptPanelProps {
  markdown: string;
  speakers: Speaker[];
  wordTimestamps: WordTimestamp[];
  currentTime: number;
  onSeek: (time: number) => void;
  fillerWords?: Array<{
    word: string;
    start: number;
    end: number;
    speaker: string;
  }>;
}

export default function TranscriptPanel({
  markdown,
  speakers,
  wordTimestamps,
  currentTime,
  onSeek,
}: TranscriptPanelProps) {
  const segments = useMemo(
    () => parseTranscriptMarkdown(markdown, speakers, wordTimestamps),
    [markdown, speakers, wordTimestamps],
  );

  const activeIndex = findActiveSegment(segments, currentTime);
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeIndex]);

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-3">
        <h2 className="text-sm font-semibold uppercase text-zinc-400">
          Transcript
        </h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1 px-2 pb-4">
          {segments.map((segment, i) => {
            const isActive = i === activeIndex;
            return (
              <div
                key={`${segment.speakerId}-${segment.startTime}`}
                ref={isActive ? activeRef : undefined}
                role="button"
                tabIndex={0}
                onClick={() => onSeek(segment.startTime)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSeek(segment.startTime);
                  }
                }}
                className={`cursor-pointer rounded-lg px-3 py-2 transition-colors ${
                  isActive
                    ? "bg-zinc-800 ring-1 ring-zinc-700"
                    : "hover:bg-zinc-800/50"
                }`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: segment.speakerColor }}
                  />
                  <span className="text-xs font-medium text-zinc-300">
                    {segment.speakerName}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {formatTimestamp(segment.startTime)}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-zinc-300">
                  {segment.text}
                </p>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
