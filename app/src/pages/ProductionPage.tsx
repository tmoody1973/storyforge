import { useRef, useEffect } from "react";
import { useParams } from "react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useWavesurfer } from "@/hooks/useWavesurfer";
import { StoryHeader } from "@/components/production/StoryHeader";
import { WaveformPanel } from "@/components/production/WaveformPanel";
import TranscriptPanel from "@/components/production/TranscriptPanel";
import CoachPanel from "@/components/production/CoachPanel";
import type { Speaker, WordTimestamp } from "@/lib/transcript";

export default function ProductionPage() {
  const { id } = useParams();
  const storyId = id as Id<"stories">;

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const story = useQuery(api.stories.get, { id: storyId });
  const transcript = useQuery(api.transcripts.getByStory, { storyId });

  // ---------------------------------------------------------------------------
  // Waveform
  // ---------------------------------------------------------------------------

  const waveformRef = useRef<HTMLDivElement>(null);
  const ws = useWavesurfer({
    container: waveformRef,
    placeholderDuration: story?.audioDurationSeconds ?? 120,
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
        color: "rgba(74, 158, 255, 0.15)",
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
      <div className="flex items-center justify-center h-full bg-zinc-950 text-zinc-400">
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
    <div className="flex flex-col h-full bg-zinc-950">
      <StoryHeader title={story.title} status={story.status} />

      <WaveformPanel
        wavesurferControls={ws}
        currentTime={ws.currentTime}
        isPlaying={ws.isPlaying}
        duration={ws.duration}
      />
      <div
        ref={waveformRef}
        className="px-4 pb-3 bg-zinc-900/50 border-b border-zinc-800"
      />

      <div className="flex flex-1 min-h-0">
        {/* Left panel: Transcript */}
        <div className="w-[55%] border-r border-zinc-800 overflow-hidden">
          {transcript ? (
            <TranscriptPanel
              markdown={transcript.markdown}
              speakers={speakers}
              wordTimestamps={wordTimestamps}
              currentTime={ws.currentTime}
              onSeek={ws.seek}
              fillerWords={fillerWords}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
              No transcript available yet.
            </div>
          )}
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
          />
        </div>
      </div>
    </div>
  );
}
