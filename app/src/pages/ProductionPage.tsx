import { useRef, useEffect, useState, useCallback } from "react";
import { useParams } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useWavesurfer } from "@/hooks/useWavesurfer";
import { StoryHeader } from "@/components/production/StoryHeader";
import { WaveformPanel } from "@/components/production/WaveformPanel";
import TranscriptPanel from "@/components/production/TranscriptPanel";
import CoachPanel from "@/components/production/CoachPanel";
import SourcePanel from "@/components/production/SourcePanel";
import ScriptEditor from "@/components/production/ScriptEditor";
import type { Speaker, WordTimestamp } from "@/lib/transcript";
import type { ProducerScript } from "@/lib/scriptTypes";
import type { TimeRange } from "@/lib/scriptHelpers";

type ViewMode = "transcript" | "script";

export default function ProductionPage() {
  const { id } = useParams();
  const storyId = id as Id<"stories">;

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const story = useQuery(api.stories.get, { id: storyId });
  const sources = useQuery(api.sources.listByStory, storyId ? { storyId } : "skip");
  const [selectedSourceId, setSelectedSourceId] = useState<Id<"sources"> | null>(null);
  const transcript = useQuery(
    api.transcripts.getBySource,
    selectedSourceId ? { sourceId: selectedSourceId } : "skip",
  );
  const selectedSource = useQuery(
    api.sources.get,
    selectedSourceId ? { id: selectedSourceId } : "skip",
  );
  const createSource = useMutation(api.sources.create);
  // Use getScript query which auto-migrates v1→v2
  const generatedScript = useQuery(api.scripts.getScript, { storyId }) as ProducerScript | null | undefined;

  // Auto-select first source
  useEffect(() => {
    if (sources?.length && !selectedSourceId) {
      setSelectedSourceId(sources[0]._id);
    }
  }, [sources, selectedSourceId]);

  const handleUploadComplete = async (url: string, name: string) => {
    const sourceId = await createSource({
      storyId,
      title: name.replace(/\.[^.]+$/, ""),
      audioUrl: url,
    });
    setSelectedSourceId(sourceId);
  };

  // ---------------------------------------------------------------------------
  // View mode toggle: Transcript vs Script
  // ---------------------------------------------------------------------------

  const [viewMode, setViewMode] = useState<ViewMode>("transcript");
  const [chatPrefill, setChatPrefill] = useState<string | undefined>();
  const [excludedRanges, setExcludedRanges] = useState<TimeRange[]>([]);

  const handleAskCoach = useCallback((message: string) => {
    setChatPrefill(message);
  }, []);

  const handleExcludedRangesChange = useCallback((ranges: TimeRange[]) => {
    setExcludedRanges(ranges);
  }, []);

  // ---------------------------------------------------------------------------
  // Waveform
  // ---------------------------------------------------------------------------

  const waveformRef = useRef<HTMLDivElement>(null);
  const ws = useWavesurfer({
    container: waveformRef,
    url: selectedSource?.audioUrl,
    placeholderDuration: selectedSource?.durationSeconds ?? story?.audioDurationSeconds ?? 120,
    excludedRanges,
  });

  // ---------------------------------------------------------------------------
  // Add regions for key quotes when transcript loads
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!transcript?.keyQuotes || !ws.isReady) return;
    ws.clearRegions();
    const quotes = transcript.keyQuotes as Array<{
      start: number;
      end: number;
      theme?: string;
      themes?: string[];
    }>;
    for (const q of quotes) {
      const label = q.theme ?? (q.themes ? q.themes[0] : "");
      ws.addRegion({
        id: `quote-${q.start}`,
        start: q.start,
        end: q.end,
        color: "rgba(248, 151, 29, 0.15)",
        content: label,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript?.keyQuotes, ws.isReady]);

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (!story) {
    return (
      <div className="flex items-center justify-center h-full bg-background text-cream-dim">
        Loading story...
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Cast transcript v.any() fields to their concrete types
  // ---------------------------------------------------------------------------

  const speakers = (transcript?.speakers ?? []) as Speaker[];
  const wordTimestamps = (transcript?.wordTimestamps ?? []) as WordTimestamp[];
  const rawAngles = (transcript?.storyAngles ?? []) as Array<{
    angle: string;
    strength?: number;
    confidence?: number;
    reasoning?: string;
    description?: string;
  }>;
  const storyAngles = rawAngles.map((a) => ({
    angle: a.angle,
    strength: a.strength ?? a.confidence ?? 0,
    reasoning: a.reasoning ?? a.description ?? "",
  }));

  const rawQuotes = (transcript?.keyQuotes ?? []) as Array<{
    text: string;
    start: number;
    end: number;
    theme?: string;
    themes?: string[];
  }>;
  const keyQuotes = rawQuotes.map((q) => ({
    text: q.text,
    start: q.start,
    end: q.end,
    theme: q.theme ?? (q.themes ? q.themes[0] : ""),
  }));
  const emotionalArc = (transcript?.emotionalArc ?? []) as Array<{
    time: number;
    intensity: number;
  }>;
  const fillerWords = (transcript?.fillerWords ?? []) as Array<{
    word: string;
    start: number;
    end: number;
    speaker: string;
  }>;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col h-full bg-background">
      <StoryHeader title={story.title} status={story.status} />

      <WaveformPanel
        wavesurferControls={ws}
        currentTime={ws.currentTime}
        isPlaying={ws.isPlaying}
        duration={ws.duration}
      />
      <div
        ref={waveformRef}
        className="px-4 pb-3 bg-charcoal-surface/50 border-b border-border"
      />

      <div className="flex flex-1 min-h-0">
        {/* Left panel: Sources + Transcript/Script */}
        <div className="w-[55%] border-r border-border overflow-hidden flex flex-col">
          <SourcePanel
            storyId={storyId}
            selectedSourceId={selectedSourceId}
            onSelectSource={setSelectedSourceId}
            onUploadComplete={handleUploadComplete}
          />

          {/* View mode toggle */}
          {transcript && (
            <div className="px-4 py-2 border-b border-charcoal-border shrink-0">
              <div className="inline-flex rounded-lg bg-charcoal-surface p-0.5">
                <button
                  onClick={() => setViewMode("transcript")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    viewMode === "transcript"
                      ? "bg-card text-cream shadow-sm"
                      : "text-cream-faint hover:text-cream-muted"
                  }`}
                >
                  Transcript
                </button>
                <button
                  onClick={() => setViewMode("script")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    viewMode === "script"
                      ? "bg-card text-cream shadow-sm"
                      : "text-cream-faint hover:text-cream-muted"
                  }`}
                >
                  Script
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-hidden">
            {!transcript ? (
              <div className="flex items-center justify-center h-full text-cream-faint text-sm">
                No transcript available yet.
              </div>
            ) : viewMode === "transcript" ? (
              <TranscriptPanel
                transcriptId={transcript?._id}
                markdown={transcript.markdown}
                speakers={speakers}
                wordTimestamps={wordTimestamps}
                currentTime={ws.currentTime}
                onSeek={ws.seek}
                fillerWords={fillerWords}
                sourceTitle={selectedSource?.title}
                durationSeconds={selectedSource?.durationSeconds ?? undefined}
              />
            ) : (
              <ScriptEditor
                storyId={storyId}
                script={generatedScript ?? null}
                currentTime={ws.currentTime}
                onSeek={ws.seek}
                onAskCoach={handleAskCoach}
                sourceId={selectedSourceId ?? undefined}
                storyTitle={story.title}
                wordTimestamps={wordTimestamps}
                fillerWords={fillerWords}
                onExcludedRangesChange={handleExcludedRangesChange}
              />
            )}
          </div>
        </div>

        {/* Right panel: Coach */}
        <div className="w-[45%] overflow-hidden">
          <CoachPanel
            storyId={storyId}
            storyAngles={storyAngles}
            keyQuotes={keyQuotes}
            emotionalArc={emotionalArc}
            selectedAngle={story.selectedAngle}
            emotionalTone={story.emotionalTone}
            narrativeDirection={story.narrativeDirection}
            onSeek={ws.seek}
            transcriptMarkdown={transcript?.markdown}
            chatPrefill={chatPrefill}
          />
        </div>
      </div>
    </div>
  );
}
