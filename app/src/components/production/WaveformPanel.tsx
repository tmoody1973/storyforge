"use client";

import { Play, Pause, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { useWavesurfer } from "@/hooks/useWavesurfer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WaveformPanelProps {
  audioUrl?: string;
  duration?: number;
  currentTime: number;
  isPlaying: boolean;
  onReady?: () => void;
  wavesurferControls?: ReturnType<typeof useWavesurfer>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WaveformPanel({
  currentTime,
  isPlaying,
  wavesurferControls,
}: WaveformPanelProps) {
  const duration = wavesurferControls?.duration ?? 0;

  return (
    <div className="bg-charcoal-surface/50 border-b border-border px-4 py-3">
      <div className="flex items-center gap-3">
        {/* Play / Pause */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => wavesurferControls?.toggle()}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="size-4" />
          ) : (
            <Play className="size-4" />
          )}
        </Button>

        {/* Stop */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => wavesurferControls?.seek(0)}
          aria-label="Stop"
        >
          <Square className="size-4" />
        </Button>

        {/* Time display */}
        <span className="font-mono text-sm text-cream-muted tabular-nums">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        {/* Volume */}
        <div className="ml-auto flex items-center gap-2">
          <Volume2 className="size-4 text-cream-dim" />
          <Slider
            className="w-24"
            defaultValue={[80]}
            min={0}
            max={100}
            step={1}
            onValueChange={(val: number[]) =>
              wavesurferControls?.setVolume(val[0] / 100)
            }
          />
        </div>
      </div>
    </div>
  );
}

export default WaveformPanel;
