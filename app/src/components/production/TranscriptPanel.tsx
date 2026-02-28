import { useMemo, useEffect, useRef, useState } from "react";
import { Download, Users } from "lucide-react";
import EditSpeakersModal from "./EditSpeakersModal";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  parseTranscriptMarkdown,
  findActiveSegment,
  formatTimestamp,
} from "@/lib/transcript";
import type { Speaker, WordTimestamp } from "@/lib/transcript";
import { exportTranscriptMarkdown } from "@/lib/exportTranscript";

interface TranscriptPanelProps {
  transcriptId?: string;
  markdown: string;
  speakers: Speaker[];
  wordTimestamps: WordTimestamp[];
  currentTime: number;
  isPlaying: boolean;
  onSeek: (time: number) => void;
  fillerWords?: Array<{
    word: string;
    start: number;
    end: number;
    speaker: string;
  }>;
  sourceTitle?: string;
  durationSeconds?: number;
}

export default function TranscriptPanel({
  transcriptId,
  markdown,
  speakers,
  wordTimestamps,
  currentTime,
  isPlaying,
  onSeek,
  sourceTitle,
  durationSeconds,
}: TranscriptPanelProps) {
  const [editingSpeaker, setEditingSpeaker] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [speakersModalOpen, setSpeakersModalOpen] = useState(false);
  const renameSpeaker = useMutation(api.transcripts.renameSpeaker);

  const segments = useMemo(
    () => parseTranscriptMarkdown(markdown, speakers, wordTimestamps),
    [markdown, speakers, wordTimestamps],
  );

  const activeIndex = findActiveSegment(segments, currentTime);
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPlaying) return;
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeIndex, isPlaying]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="px-4 py-3 shrink-0 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase text-cream-dim">
          Transcript
        </h2>
        <div className="flex items-center gap-2">
          {transcriptId && (
            <button
              onClick={() => setSpeakersModalOpen(true)}
              className="text-cream-faint hover:text-brand-orange transition-colors"
              title="Edit Speakers"
            >
              <Users className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() =>
              exportTranscriptMarkdown({
                title: sourceTitle ?? "Transcript",
                markdown,
                speakers,
                wordTimestamps,
                durationSeconds,
              })
            }
            className="text-cream-faint hover:text-brand-orange transition-colors"
            title="Export as Markdown"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1 overflow-hidden">
        <div className="space-y-1 px-2 pb-4">
          {segments.map((segment, i) => {
            const isActive = i === activeIndex;
            return (
              <div
                key={`${segment.speakerId}-${i}`}
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
                    ? "bg-card ring-1 ring-charcoal-border"
                    : "hover:bg-charcoal-surface"
                }`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: segment.speakerColor }}
                  />
                  {editingSpeaker === segment.speakerId && transcriptId ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => {
                        if (editName.trim() && editName !== segment.speakerName) {
                          renameSpeaker({
                            transcriptId: transcriptId as Id<"transcripts">,
                            speakerId: segment.speakerId,
                            newName: editName.trim(),
                          });
                        }
                        setEditingSpeaker(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        if (e.key === "Escape") setEditingSpeaker(null);
                      }}
                      autoFocus
                      className="text-xs font-medium text-cream bg-transparent border-b border-brand-orange outline-none w-24"
                    />
                  ) : (
                    <button
                      type="button"
                      className="text-xs font-medium text-cream-muted hover:text-brand-orange hover:underline transition-colors px-1 -mx-1 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setEditingSpeaker(segment.speakerId);
                        setEditName(segment.speakerName);
                      }}
                      title="Click to rename speaker"
                    >
                      {segment.speakerName}
                    </button>
                  )}
                  <span className="text-xs text-cream-faint">
                    {formatTimestamp(segment.startTime)}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-cream-muted">
                  {segment.text}
                </p>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <EditSpeakersModal
        open={speakersModalOpen}
        onOpenChange={setSpeakersModalOpen}
        speakers={speakers}
        segments={segments}
        transcriptId={transcriptId}
      />
    </div>
  );
}
