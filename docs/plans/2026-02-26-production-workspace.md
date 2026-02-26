# Production Workspace Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the 3-panel Production Workspace — wavesurfer.js waveform on top, transcript + hybrid coach panel (analysis cards + chat) below — all wired to existing Convex stubs with mock data.

**Architecture:** ProductionPage orchestrates three panels in a top/bottom split layout. Waveform full-width on top. Below: transcript (left, ~55%) and coach panel (right, ~45%). A shared `currentTime` state from wavesurfer drives transcript highlighting and audio-text sync. Agent stubs provide mock analysis and coaching data. All server state via Convex useQuery/useMutation.

**Tech Stack:** React 19, wavesurfer.js v7, Tailwind CSS v4, shadcn/ui (tabs, card, badge, button, input, scroll-area, slider), Convex, lucide-react icons

---

### Task 1: Install wavesurfer.js and seed mock data

**Files:**
- Modify: `app/package.json`
- Modify: `app/convex/seed.ts`

**Step 1: Install wavesurfer.js**

```bash
cd /Users/tarikmoody/Documents/Projects/storyforge/app
npm install wavesurfer.js
```

**Step 2: Extend seed.ts to include a mock story + transcript**

Add a `seedDemoStory` mutation to `app/convex/seed.ts` that creates a demo story linked to the 88Nine station, and a transcript document with mock speakers, word timestamps, story angles, key quotes, and emotional arc data. This gives the Production Workspace real data to render.

```typescript
export const seedDemoStory = mutation({
  handler: async (ctx) => {
    // Find 88Nine station
    const station = await ctx.db
      .query("stations")
      .withIndex("by_slug", (q) => q.eq("slug", "88nine"))
      .unique();

    if (!station) {
      return { error: "Run seedStations first" };
    }

    // Check if demo story already exists
    const existing = await ctx.db
      .query("stories")
      .withIndex("by_station", (q) => q.eq("stationId", station._id))
      .first();

    if (existing) {
      return { skipped: true, storyId: existing._id };
    }

    // We need a user to be the creator. Find any user, or create a placeholder.
    let user = await ctx.db.query("users").first();
    if (!user) {
      const userId = await ctx.db.insert("users", {
        workosUserId: "demo_user",
        name: "Demo Producer",
        email: "demo@storyforge.dev",
        role: "producer",
        stations: [station._id],
      });
      user = await ctx.db.get(userId);
    }

    // Create demo story
    const storyId = await ctx.db.insert("stories", {
      title: "Milwaukee's Vanishing Jazz Clubs",
      stationId: station._id,
      creatorId: user!._id,
      status: "editing",
      audioDurationSeconds: 185,
      selectedAngle: undefined,
      themes: ["jazz", "Milwaukee", "gentrification", "community"],
      emotionalTone: undefined,
      narrativeDirection: undefined,
    });

    // Create transcript with rich mock data
    await ctx.db.insert("transcripts", {
      storyId,
      rawSttJson: {},
      markdown: `**Marcus Thompson:** You know, when I first moved to Milwaukee in the nineties, there were at least a dozen jazz clubs within walking distance of each other on the north side. Every Friday night, you could bar hop and hear world-class musicians playing for the love of it.

**Interviewer:** What happened to those places?

**Marcus Thompson:** Same story you hear everywhere — rising rents, changing demographics. But what really killed it was when the younger crowd stopped showing up. Jazz became something their grandparents listened to. And without new audiences, the clubs couldn't survive.

**Interviewer:** Do you think jazz can come back in Milwaukee?

**Marcus Thompson:** It never left. That's what people don't understand. The musicians are still here. Keyon Harold played a basement show last month — a hundred people in someone's living room. The art is alive. It just moved underground. What we need isn't a revival — we need new venues that understand how to reach people where they are. Social media, pop-up events, collaborations with hip-hop artists. The music evolves. The business model needs to catch up.

**Interviewer:** Is there hope?

**Marcus Thompson:** Always. I've been hosting jam sessions at my barbershop every Sunday for six years now. People come from all over. Last week we had a sixteen-year-old sit in on drums who blew everyone away. That kid is the future. Jazz doesn't need saving. It needs a stage.`,
      speakers: [
        { id: "speaker_1", name: "Marcus Thompson", color: "#4A9EFF" },
        { id: "speaker_2", name: "Interviewer", color: "#FF6B4A" },
      ],
      durationSeconds: 185,
      wordTimestamps: [
        { word: "You", start: 0.0, end: 0.15, confidence: 0.99, speaker: "speaker_1" },
        { word: "know,", start: 0.15, end: 0.35, confidence: 0.99, speaker: "speaker_1" },
        { word: "when", start: 0.35, end: 0.5, confidence: 0.99, speaker: "speaker_1" },
        { word: "I", start: 0.5, end: 0.55, confidence: 0.99, speaker: "speaker_1" },
        { word: "first", start: 0.55, end: 0.75, confidence: 0.99, speaker: "speaker_1" },
        { word: "moved", start: 0.75, end: 0.95, confidence: 0.99, speaker: "speaker_1" },
        { word: "to", start: 0.95, end: 1.05, confidence: 0.99, speaker: "speaker_1" },
        { word: "Milwaukee", start: 1.05, end: 1.55, confidence: 0.98, speaker: "speaker_1" },
        { word: "in", start: 1.55, end: 1.65, confidence: 0.99, speaker: "speaker_1" },
        { word: "the", start: 1.65, end: 1.75, confidence: 0.99, speaker: "speaker_1" },
        { word: "nineties,", start: 1.75, end: 2.15, confidence: 0.97, speaker: "speaker_1" },
        { word: "there", start: 2.15, end: 2.35, confidence: 0.99, speaker: "speaker_1" },
        { word: "were", start: 2.35, end: 2.5, confidence: 0.99, speaker: "speaker_1" },
        { word: "at", start: 2.5, end: 2.6, confidence: 0.99, speaker: "speaker_1" },
        { word: "least", start: 2.6, end: 2.8, confidence: 0.99, speaker: "speaker_1" },
        { word: "a", start: 2.8, end: 2.85, confidence: 0.99, speaker: "speaker_1" },
        { word: "dozen", start: 2.85, end: 3.15, confidence: 0.98, speaker: "speaker_1" },
        { word: "jazz", start: 3.15, end: 3.45, confidence: 0.99, speaker: "speaker_1" },
        { word: "clubs", start: 3.45, end: 3.75, confidence: 0.99, speaker: "speaker_1" },
        // Segment 1 ends ~22s (first paragraph)
        { word: "What", start: 22.0, end: 22.2, confidence: 0.99, speaker: "speaker_2" },
        { word: "happened", start: 22.2, end: 22.55, confidence: 0.99, speaker: "speaker_2" },
        { word: "to", start: 22.55, end: 22.65, confidence: 0.99, speaker: "speaker_2" },
        { word: "those", start: 22.65, end: 22.85, confidence: 0.99, speaker: "speaker_2" },
        { word: "places?", start: 22.85, end: 23.2, confidence: 0.99, speaker: "speaker_2" },
        // Segment 2: Marcus response ~24-58s
        { word: "Same", start: 24.0, end: 24.25, confidence: 0.99, speaker: "speaker_1" },
        { word: "story", start: 24.25, end: 24.55, confidence: 0.99, speaker: "speaker_1" },
        // Segment 3: Interviewer ~60s
        { word: "Do", start: 60.0, end: 60.15, confidence: 0.99, speaker: "speaker_2" },
        { word: "you", start: 60.15, end: 60.25, confidence: 0.99, speaker: "speaker_2" },
        { word: "think", start: 60.25, end: 60.45, confidence: 0.99, speaker: "speaker_2" },
        { word: "jazz", start: 60.45, end: 60.7, confidence: 0.99, speaker: "speaker_2" },
        { word: "can", start: 60.7, end: 60.85, confidence: 0.99, speaker: "speaker_2" },
        { word: "come", start: 60.85, end: 61.0, confidence: 0.99, speaker: "speaker_2" },
        { word: "back", start: 61.0, end: 61.2, confidence: 0.99, speaker: "speaker_2" },
        // Segment 4: Marcus long response ~62-150s
        { word: "It", start: 62.0, end: 62.1, confidence: 0.99, speaker: "speaker_1" },
        { word: "never", start: 62.1, end: 62.35, confidence: 0.99, speaker: "speaker_1" },
        { word: "left.", start: 62.35, end: 62.65, confidence: 0.99, speaker: "speaker_1" },
        // Segment 5: Interviewer ~152s
        { word: "Is", start: 152.0, end: 152.15, confidence: 0.99, speaker: "speaker_2" },
        { word: "there", start: 152.15, end: 152.35, confidence: 0.99, speaker: "speaker_2" },
        { word: "hope?", start: 152.35, end: 152.7, confidence: 0.99, speaker: "speaker_2" },
        // Segment 6: Marcus final ~154-185s
        { word: "Always.", start: 154.0, end: 154.4, confidence: 0.99, speaker: "speaker_1" },
        { word: "Jazz", start: 178.0, end: 178.3, confidence: 0.99, speaker: "speaker_1" },
        { word: "doesn't", start: 178.3, end: 178.6, confidence: 0.99, speaker: "speaker_1" },
        { word: "need", start: 178.6, end: 178.8, confidence: 0.99, speaker: "speaker_1" },
        { word: "saving.", start: 178.8, end: 179.2, confidence: 0.98, speaker: "speaker_1" },
        { word: "It", start: 179.5, end: 179.6, confidence: 0.99, speaker: "speaker_1" },
        { word: "needs", start: 179.6, end: 179.85, confidence: 0.99, speaker: "speaker_1" },
        { word: "a", start: 179.85, end: 179.95, confidence: 0.99, speaker: "speaker_1" },
        { word: "stage.", start: 179.95, end: 180.4, confidence: 0.99, speaker: "speaker_1" },
      ],
      fillerWords: [
        { word: "you know", start: 0.0, end: 0.35, speaker: "speaker_1" },
      ],
      storyAngles: [
        { angle: "Cultural preservation", strength: 0.92, reasoning: "Strong personal narrative about disappearing jazz venues in Milwaukee" },
        { angle: "Gentrification impact", strength: 0.78, reasoning: "Rising rents and demographic changes as drivers of cultural loss" },
        { angle: "Grassroots revival", strength: 0.85, reasoning: "Underground scenes, barbershop jam sessions, next-generation musicians" },
        { angle: "Youth engagement", strength: 0.65, reasoning: "Sixteen-year-old drummer, need to reach people where they are" },
      ],
      keyQuotes: [
        { text: "Jazz doesn't need saving. It needs a stage.", start: 178.0, end: 180.4, theme: "hope" },
        { text: "It never left. That's what people don't understand.", start: 62.0, end: 63.5, theme: "resilience" },
        { text: "The music evolves. The business model needs to catch up.", start: 120.0, end: 122.5, theme: "innovation" },
        { text: "Last week we had a sixteen-year-old sit in on drums who blew everyone away.", start: 168.0, end: 172.0, theme: "youth" },
      ],
      emotionalArc: [
        { time: 0, intensity: 0.4 },
        { time: 22, intensity: 0.3 },
        { time: 30, intensity: 0.6 },
        { time: 60, intensity: 0.5 },
        { time: 62, intensity: 0.8 },
        { time: 100, intensity: 0.7 },
        { time: 120, intensity: 0.75 },
        { time: 152, intensity: 0.5 },
        { time: 154, intensity: 0.85 },
        { time: 175, intensity: 0.95 },
        { time: 185, intensity: 0.9 },
      ],
      searchableText: "You know when I first moved to Milwaukee in the nineties there were at least a dozen jazz clubs within walking distance of each other on the north side Every Friday night you could bar hop and hear world-class musicians playing for the love of it What happened to those places Same story you hear everywhere rising rents changing demographics But what really killed it was when the younger crowd stopped showing up Jazz became something their grandparents listened to And without new audiences the clubs couldn't survive Do you think jazz can come back in Milwaukee It never left That's what people don't understand The musicians are still here Keyon Harold played a basement show last month a hundred people in someone's living room The art is alive It just moved underground What we need isn't a revival we need new venues that understand how to reach people where they are Social media pop-up events collaborations with hip-hop artists The music evolves The business model needs to catch up Is there hope Always I've been hosting jam sessions at my barbershop every Sunday for six years now People come from all over Last week we had a sixteen-year-old sit in on drums who blew everyone away That kid is the future Jazz doesn't need saving It needs a stage",
    });

    return { storyId };
  },
});
```

**Step 3: Verify**

```bash
cd /Users/tarikmoody/Documents/Projects/storyforge/app
npx tsc --noEmit
```

Expected: No type errors.

**Step 4: Commit**

```bash
cd /Users/tarikmoody/Documents/Projects/storyforge
git add app/package.json app/package-lock.json app/convex/seed.ts
git commit -m "feat: install wavesurfer.js and add demo story seed data"
```

---

### Task 2: Build the useWavesurfer hook

**Files:**
- Create: `app/src/hooks/useWavesurfer.ts`

**Step 1: Create the hook**

This hook encapsulates all wavesurfer.js lifecycle: create instance, load audio, expose transport controls, emit currentTime, manage regions, and clean up on unmount.

```typescript
import { useRef, useState, useEffect, useCallback } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin, { type Region } from "wavesurfer.js/dist/plugins/regions.js";

interface UseWavesurferOptions {
  container: React.RefObject<HTMLDivElement | null>;
  url?: string;
  /** Duration in seconds for generating a placeholder waveform when no URL */
  placeholderDuration?: number;
}

interface WavesurferControls {
  isReady: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (timeSeconds: number) => void;
  setVolume: (volume: number) => void;
  addRegion: (opts: {
    id: string;
    start: number;
    end: number;
    color: string;
    content?: string;
  }) => void;
  clearRegions: () => void;
}

export function useWavesurfer({
  container,
  url,
  placeholderDuration = 120,
}: UseWavesurferOptions): WavesurferControls {
  const wsRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<RegionsPlugin | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!container.current) return;

    const regions = RegionsPlugin.create();
    regionsRef.current = regions;

    const ws = WaveSurfer.create({
      container: container.current,
      waveColor: "#4A9EFF",
      progressColor: "#1d4ed8",
      cursorColor: "#ffffff",
      cursorWidth: 2,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 80,
      normalize: true,
      plugins: [regions],
    });

    wsRef.current = ws;

    ws.on("ready", () => {
      setIsReady(true);
      setDuration(ws.getDuration());
    });

    ws.on("audioprocess", () => {
      setCurrentTime(ws.getCurrentTime());
    });

    ws.on("seeking", () => {
      setCurrentTime(ws.getCurrentTime());
    });

    ws.on("play", () => setIsPlaying(true));
    ws.on("pause", () => setIsPlaying(false));
    ws.on("finish", () => setIsPlaying(false));

    if (url) {
      ws.load(url);
    } else {
      // Generate silent audio blob for placeholder waveform
      const sampleRate = 8000;
      const numSamples = sampleRate * placeholderDuration;
      const audioCtx = new AudioContext({ sampleRate });
      const buffer = audioCtx.createBuffer(1, numSamples, sampleRate);
      const channelData = buffer.getChannelData(0);
      // Create fake waveform that looks like speech
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const envelope =
          0.3 +
          0.3 * Math.sin(t * 0.8) *
          Math.sin(t * 0.3) *
          (1 + 0.5 * Math.sin(t * 5.7));
        channelData[i] = (Math.random() * 2 - 1) * Math.abs(envelope) * 0.8;
      }
      // Encode to WAV blob
      const wavBlob = audioBufferToWav(buffer);
      ws.loadBlob(wavBlob);
      audioCtx.close();
    }

    return () => {
      ws.destroy();
      wsRef.current = null;
      regionsRef.current = null;
    };
  }, [container, url, placeholderDuration]);

  const play = useCallback(() => wsRef.current?.play(), []);
  const pause = useCallback(() => wsRef.current?.pause(), []);
  const toggle = useCallback(() => wsRef.current?.playPause(), []);

  const seek = useCallback((timeSeconds: number) => {
    const ws = wsRef.current;
    if (!ws) return;
    const d = ws.getDuration();
    if (d > 0) {
      ws.seekTo(timeSeconds / d);
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    wsRef.current?.setVolume(volume);
  }, []);

  const addRegion = useCallback(
    (opts: { id: string; start: number; end: number; color: string; content?: string }) => {
      regionsRef.current?.addRegion({
        id: opts.id,
        start: opts.start,
        end: opts.end,
        color: opts.color,
        content: opts.content,
        drag: false,
        resize: false,
      });
    },
    [],
  );

  const clearRegions = useCallback(() => {
    regionsRef.current?.clearRegions();
  }, []);

  return {
    isReady,
    isPlaying,
    currentTime,
    duration,
    play,
    pause,
    toggle,
    seek,
    setVolume,
    addRegion,
    clearRegions,
  };
}

/** Minimal WAV encoder for AudioBuffer */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const data = buffer.getChannelData(0);
  const dataLength = data.length * bytesPerSample;
  const headerLength = 44;
  const arrayBuffer = new ArrayBuffer(headerLength + dataLength);
  const view = new DataView(arrayBuffer);

  // WAV header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);

  // Write samples
  let offset = 44;
  for (let i = 0; i < data.length; i++) {
    const sample = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
```

**Step 2: Verify**

```bash
cd /Users/tarikmoody/Documents/Projects/storyforge/app
npx tsc --noEmit
```

Expected: No type errors. May need to check wavesurfer.js type exports — if the regions plugin import path doesn't resolve, try `wavesurfer.js/plugins/regions` instead of `wavesurfer.js/dist/plugins/regions.js`.

**Step 3: Commit**

```bash
cd /Users/tarikmoody/Documents/Projects/storyforge
git add app/src/hooks/useWavesurfer.ts
git commit -m "feat: add useWavesurfer hook with transport, regions, and placeholder audio"
```

---

### Task 3: Build the WaveformPanel component

**Files:**
- Create: `app/src/components/production/WaveformPanel.tsx`

**Step 1: Create WaveformPanel**

This component renders the waveform with transport controls: play/pause, stop, time display, volume slider.

```tsx
import { useRef } from "react";
import { Play, Pause, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useWavesurfer } from "@/hooks/useWavesurfer";

interface WaveformPanelProps {
  audioUrl?: string;
  duration?: number;
  currentTime: number;
  isPlaying: boolean;
  onReady?: () => void;
  wavesurferControls?: ReturnType<typeof useWavesurfer>;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function WaveformPanel({
  wavesurferControls,
}: WaveformPanelProps) {
  if (!wavesurferControls) return null;

  const {
    isReady,
    isPlaying,
    currentTime,
    duration,
    toggle,
    seek,
    setVolume,
  } = wavesurferControls;

  return (
    <div className="border-b border-zinc-800 bg-zinc-900/50 px-4 py-3">
      {/* Transport controls */}
      <div className="flex items-center gap-3 mb-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-300 hover:text-white"
          onClick={toggle}
          disabled={!isReady}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-300 hover:text-white"
          onClick={() => {
            seek(0);
          }}
          disabled={!isReady}
        >
          <Square className="h-3.5 w-3.5" />
        </Button>

        <span className="text-xs font-mono text-zinc-400 w-24 text-center">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <div className="flex-1" />

        <Volume2 className="h-4 w-4 text-zinc-500" />
        <Slider
          className="w-24"
          defaultValue={[80]}
          max={100}
          step={1}
          onValueChange={(val) => setVolume(val[0] / 100)}
        />
      </div>

      {/* Waveform container is rendered by parent (ProductionPage) and passed via ref */}
    </div>
  );
}
```

Note: The actual waveform `<div>` container must be rendered in the parent (ProductionPage) because wavesurfer.js needs a stable DOM ref. The WaveformPanel renders the transport controls above it. The parent will render:

```tsx
<WaveformPanel wavesurferControls={ws} />
<div ref={waveformRef} className="px-4 pb-2 bg-zinc-900/50 border-b border-zinc-800" />
```

**Step 2: Verify**

```bash
cd /Users/tarikmoody/Documents/Projects/storyforge/app
npx tsc --noEmit
```

**Step 3: Commit**

```bash
cd /Users/tarikmoody/Documents/Projects/storyforge
git add app/src/components/production/WaveformPanel.tsx
git commit -m "feat: add WaveformPanel with transport controls"
```

---

### Task 4: Build the TranscriptPanel component

**Files:**
- Create: `app/src/components/production/TranscriptPanel.tsx`
- Create: `app/src/lib/transcript.ts`

**Step 1: Create transcript parser utility**

Parse the markdown transcript into structured segments with speaker info and timestamp ranges.

```typescript
// app/src/lib/transcript.ts

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
 * Parse transcript markdown into segments.
 * Expected format: **Speaker Name:** text content
 * Uses wordTimestamps to determine segment time boundaries.
 */
export function parseTranscriptMarkdown(
  markdown: string,
  speakers: Speaker[],
  wordTimestamps: WordTimestamp[],
): TranscriptSegment[] {
  const speakerMap = new Map(speakers.map((s) => [s.name, s]));
  const lines = markdown.split("\n\n").filter((l) => l.trim());
  const segments: TranscriptSegment[] = [];

  // Group word timestamps by speaker change to find segment boundaries
  const speakerBoundaries: { speakerId: string; start: number; end: number }[] = [];
  let currentSpeaker = "";
  let segStart = 0;

  for (const wt of wordTimestamps) {
    if (wt.speaker !== currentSpeaker) {
      if (currentSpeaker) {
        speakerBoundaries.push({
          speakerId: currentSpeaker,
          start: segStart,
          end: wt.start,
        });
      }
      currentSpeaker = wt.speaker;
      segStart = wt.start;
    }
  }
  if (currentSpeaker && wordTimestamps.length > 0) {
    speakerBoundaries.push({
      speakerId: currentSpeaker,
      start: segStart,
      end: wordTimestamps[wordTimestamps.length - 1].end,
    });
  }

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^\*\*(.+?):\*\*\s*([\s\S]*)$/);
    if (!match) continue;

    const speakerName = match[1];
    const text = match[2].trim();
    const speaker = speakerMap.get(speakerName);

    // Match to boundary by index
    const boundary = speakerBoundaries[i];

    segments.push({
      speakerId: speaker?.id ?? "unknown",
      speakerName,
      speakerColor: speaker?.color ?? "#888888",
      text,
      startTime: boundary?.start ?? 0,
      endTime: boundary?.end ?? 0,
    });
  }

  return segments;
}

/**
 * Find the active segment index based on current playback time.
 */
export function findActiveSegment(
  segments: TranscriptSegment[],
  currentTime: number,
): number {
  for (let i = segments.length - 1; i >= 0; i--) {
    if (currentTime >= segments[i].startTime) {
      return i;
    }
  }
  return 0;
}
```

**Step 2: Create TranscriptPanel component**

```tsx
// app/src/components/production/TranscriptPanel.tsx

import { useRef, useEffect, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  parseTranscriptMarkdown,
  findActiveSegment,
  type Speaker,
  type WordTimestamp,
  type TranscriptSegment,
} from "@/lib/transcript";

interface TranscriptPanelProps {
  markdown: string;
  speakers: Speaker[];
  wordTimestamps: WordTimestamp[];
  currentTime: number;
  onSeek: (time: number) => void;
  fillerWords?: Array<{ word: string; start: number; end: number; speaker: string }>;
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function TranscriptPanel({
  markdown,
  speakers,
  wordTimestamps,
  currentTime,
  onSeek,
  fillerWords,
}: TranscriptPanelProps) {
  const segments = useMemo(
    () => parseTranscriptMarkdown(markdown, speakers, wordTimestamps),
    [markdown, speakers, wordTimestamps],
  );

  const activeIndex = findActiveSegment(segments, currentTime);
  const activeRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active segment
  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [activeIndex]);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          Transcript
        </h3>
        {segments.map((segment, i) => (
          <div
            key={i}
            ref={i === activeIndex ? activeRef : undefined}
            className={`p-3 rounded-lg cursor-pointer transition-colors ${
              i === activeIndex
                ? "bg-zinc-800 ring-1 ring-zinc-700"
                : "hover:bg-zinc-800/50"
            }`}
            onClick={() => onSeek(segment.startTime)}
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: segment.speakerColor }}
              />
              <span className="text-sm font-medium text-zinc-300">
                {segment.speakerName}
              </span>
              <span className="text-xs text-zinc-500">
                {formatTimestamp(segment.startTime)}
              </span>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              {segment.text}
            </p>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
```

**Step 3: Verify**

```bash
cd /Users/tarikmoody/Documents/Projects/storyforge/app
npx tsc --noEmit
```

**Step 4: Commit**

```bash
cd /Users/tarikmoody/Documents/Projects/storyforge
git add app/src/lib/transcript.ts app/src/components/production/TranscriptPanel.tsx
git commit -m "feat: add TranscriptPanel with speaker segments, click-to-seek, auto-scroll"
```

---

### Task 5: Build the AnalysisCards component

**Files:**
- Create: `app/src/components/production/AnalysisCards.tsx`

**Step 1: Create AnalysisCards**

Renders story angles (with strength bars), key quotes (clickable), and an emotional arc SVG chart.

```tsx
// app/src/components/production/AnalysisCards.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface StoryAngle {
  angle: string;
  strength: number;
  reasoning: string;
}

interface KeyQuote {
  text: string;
  start: number;
  end: number;
  theme: string;
}

interface EmotionalArcPoint {
  time: number;
  intensity: number;
}

interface AnalysisCardsProps {
  storyAngles: StoryAngle[];
  keyQuotes: KeyQuote[];
  emotionalArc: EmotionalArcPoint[];
  onSeek: (time: number) => void;
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function EmotionalArcChart({ data }: { data: EmotionalArcPoint[] }) {
  if (data.length < 2) return null;

  const width = 280;
  const height = 60;
  const padding = { top: 5, bottom: 5, left: 5, right: 5 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const maxTime = data[data.length - 1].time;
  const points = data
    .map((d) => {
      const x = padding.left + (d.time / maxTime) * innerWidth;
      const y = padding.top + (1 - d.intensity) * innerHeight;
      return `${x},${y}`;
    })
    .join(" ");

  // Create area path (fill under line)
  const areaPath =
    `M ${padding.left + (data[0].time / maxTime) * innerWidth},${padding.top + innerHeight} ` +
    data
      .map((d) => {
        const x = padding.left + (d.time / maxTime) * innerWidth;
        const y = padding.top + (1 - d.intensity) * innerHeight;
        return `L ${x},${y}`;
      })
      .join(" ") +
    ` L ${padding.left + (data[data.length - 1].time / maxTime) * innerWidth},${padding.top + innerHeight} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-16">
      <defs>
        <linearGradient id="arcGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4A9EFF" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#4A9EFF" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#arcGradient)" />
      <polyline
        points={points}
        fill="none"
        stroke="#4A9EFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.map((d, i) => (
        <circle
          key={i}
          cx={padding.left + (d.time / maxTime) * innerWidth}
          cy={padding.top + (1 - d.intensity) * innerHeight}
          r="2.5"
          fill="#4A9EFF"
        />
      ))}
    </svg>
  );
}

export default function AnalysisCards({
  storyAngles,
  keyQuotes,
  emotionalArc,
  onSeek,
}: AnalysisCardsProps) {
  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Story Angles */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm text-zinc-300">Story Angles</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-2">
            {storyAngles.map((angle, i) => (
              <div key={i}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-zinc-300">{angle.angle}</span>
                  <span className="text-zinc-500">
                    {Math.round(angle.strength * 100)}%
                  </span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${angle.strength * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Key Quotes */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm text-zinc-300">Key Quotes</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-2">
            {keyQuotes.map((quote, i) => (
              <div
                key={i}
                className="p-2 rounded bg-zinc-800/50 cursor-pointer hover:bg-zinc-800 transition-colors"
                onClick={() => onSeek(quote.start)}
              >
                <p className="text-xs text-zinc-300 italic">
                  &ldquo;{quote.text}&rdquo;
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-zinc-500">
                    {formatTimestamp(quote.start)}
                  </span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-zinc-700 text-zinc-400">
                    {quote.theme}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Emotional Arc */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm text-zinc-300">Emotional Arc</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <EmotionalArcChart data={emotionalArc} />
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
```

**Step 2: Verify**

```bash
cd /Users/tarikmoody/Documents/Projects/storyforge/app
npx tsc --noEmit
```

**Step 3: Commit**

```bash
cd /Users/tarikmoody/Documents/Projects/storyforge
git add app/src/components/production/AnalysisCards.tsx
git commit -m "feat: add AnalysisCards with story angles, key quotes, emotional arc chart"
```

---

### Task 6: Build the CoachChat component

**Files:**
- Create: `app/src/components/production/CoachChat.tsx`

**Step 1: Create CoachChat**

Simple chat thread UI with text input. Calls the Gradient Agent coach stub via Convex action.

```tsx
// app/src/components/production/CoachChat.tsx

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface ChatMessage {
  role: "user" | "coach";
  content: string;
}

interface CoachChatProps {
  storyId: string;
}

export default function CoachChat({ storyId }: CoachChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "coach",
      content:
        "I'm your Story Coach. I can help you find the best angle, refine your narrative, and craft compelling content. What would you like to work on?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const callAgent = useAction(api.actions.gradientAgent.callAgent);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const result = await callAgent({
        agent: "coach",
        payload: { storyId, message: userMessage },
      });
      setMessages((prev) => [
        ...prev,
        { role: "coach", content: result.coaching ?? "I'm not sure how to help with that." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "coach", content: "Something went wrong. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-800 text-zinc-300"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-zinc-800 text-zinc-400 px-3 py-2 rounded-lg text-sm">
                Thinking...
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="p-3 border-t border-zinc-800">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your coach..."
            className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            variant="ghost"
            className="text-zinc-400 hover:text-white"
            disabled={isLoading || !input.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
```

**Step 2: Verify**

```bash
cd /Users/tarikmoody/Documents/Projects/storyforge/app
npx tsc --noEmit
```

Note: The import path for the Convex API may need adjustment. It should be `../../../convex/_generated/api` from `src/components/production/` or the project may use a path alias. Check and adjust if needed. The correct import might be:
```typescript
import { api } from "convex/_generated/api";
```
depending on how Convex resolves in this project.

**Step 3: Commit**

```bash
cd /Users/tarikmoody/Documents/Projects/storyforge
git add app/src/components/production/CoachChat.tsx
git commit -m "feat: add CoachChat with message thread and Gradient Agent integration"
```

---

### Task 7: Build the SteeringControls component

**Files:**
- Create: `app/src/components/production/SteeringControls.tsx`

**Step 1: Create SteeringControls**

Inputs for selected angle, emotional tone, and narrative direction. Calls `updateSteering` mutation on blur.

```tsx
// app/src/components/production/SteeringControls.tsx

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Id } from "../../../convex/_generated/dataModel";

interface StoryAngle {
  angle: string;
  strength: number;
  reasoning: string;
}

interface SteeringControlsProps {
  storyId: Id<"stories">;
  selectedAngle?: string;
  emotionalTone?: string;
  narrativeDirection?: string;
  availableAngles: StoryAngle[];
}

export default function SteeringControls({
  storyId,
  selectedAngle,
  emotionalTone,
  narrativeDirection,
  availableAngles,
}: SteeringControlsProps) {
  const updateSteering = useMutation(api.stories.updateSteering);

  const [tone, setTone] = useState(emotionalTone ?? "");
  const [direction, setDirection] = useState(narrativeDirection ?? "");

  // Sync from props when they change externally
  useEffect(() => setTone(emotionalTone ?? ""), [emotionalTone]);
  useEffect(() => setDirection(narrativeDirection ?? ""), [narrativeDirection]);

  return (
    <div className="p-4 space-y-3 border-t border-zinc-800">
      <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
        Steering
      </h4>

      <div className="space-y-1.5">
        <Label className="text-xs text-zinc-400">Angle</Label>
        <Select
          value={selectedAngle ?? ""}
          onValueChange={(val) =>
            updateSteering({ id: storyId, selectedAngle: val })
          }
        >
          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200 h-8 text-xs">
            <SelectValue placeholder="Select an angle..." />
          </SelectTrigger>
          <SelectContent>
            {availableAngles.map((a) => (
              <SelectItem key={a.angle} value={a.angle}>
                {a.angle} ({Math.round(a.strength * 100)}%)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-zinc-400">Emotional Tone</Label>
        <Input
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          onBlur={() => updateSteering({ id: storyId, emotionalTone: tone })}
          placeholder="e.g. hopeful, urgent, reflective"
          className="bg-zinc-800 border-zinc-700 text-zinc-200 h-8 text-xs placeholder:text-zinc-500"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-zinc-400">Narrative Direction</Label>
        <Input
          value={direction}
          onChange={(e) => setDirection(e.target.value)}
          onBlur={() =>
            updateSteering({ id: storyId, narrativeDirection: direction })
          }
          placeholder="e.g. lead with the barbershop scene"
          className="bg-zinc-800 border-zinc-700 text-zinc-200 h-8 text-xs placeholder:text-zinc-500"
        />
      </div>
    </div>
  );
}
```

**Step 2: Verify**

```bash
cd /Users/tarikmoody/Documents/Projects/storyforge/app
npx tsc --noEmit
```

Again, check the Convex import path and adjust if needed.

**Step 3: Commit**

```bash
cd /Users/tarikmoody/Documents/Projects/storyforge
git add app/src/components/production/SteeringControls.tsx
git commit -m "feat: add SteeringControls with angle, tone, and direction inputs"
```

---

### Task 8: Build the CoachPanel (tabbed container)

**Files:**
- Create: `app/src/components/production/CoachPanel.tsx`

**Step 1: Create CoachPanel**

Combines Analysis tab + Coach Chat tab using shadcn Tabs, with SteeringControls below.

```tsx
// app/src/components/production/CoachPanel.tsx

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AnalysisCards from "./AnalysisCards";
import CoachChat from "./CoachChat";
import SteeringControls from "./SteeringControls";
import type { Id } from "../../../convex/_generated/dataModel";

interface StoryAngle {
  angle: string;
  strength: number;
  reasoning: string;
}

interface KeyQuote {
  text: string;
  start: number;
  end: number;
  theme: string;
}

interface EmotionalArcPoint {
  time: number;
  intensity: number;
}

interface CoachPanelProps {
  storyId: Id<"stories">;
  storyAngles: StoryAngle[];
  keyQuotes: KeyQuote[];
  emotionalArc: EmotionalArcPoint[];
  selectedAngle?: string;
  emotionalTone?: string;
  narrativeDirection?: string;
  onSeek: (time: number) => void;
}

export default function CoachPanel({
  storyId,
  storyAngles,
  keyQuotes,
  emotionalArc,
  selectedAngle,
  emotionalTone,
  narrativeDirection,
  onSeek,
}: CoachPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <Tabs defaultValue="analysis" className="flex flex-col flex-1 min-h-0">
        <TabsList className="mx-4 mt-3 bg-zinc-800/50">
          <TabsTrigger value="analysis" className="text-xs">
            Analysis
          </TabsTrigger>
          <TabsTrigger value="chat" className="text-xs">
            Coach Chat
          </TabsTrigger>
        </TabsList>
        <TabsContent value="analysis" className="flex-1 min-h-0 mt-0">
          <AnalysisCards
            storyAngles={storyAngles}
            keyQuotes={keyQuotes}
            emotionalArc={emotionalArc}
            onSeek={onSeek}
          />
        </TabsContent>
        <TabsContent value="chat" className="flex-1 min-h-0 mt-0">
          <CoachChat storyId={storyId} />
        </TabsContent>
      </Tabs>
      <SteeringControls
        storyId={storyId}
        selectedAngle={selectedAngle}
        emotionalTone={emotionalTone}
        narrativeDirection={narrativeDirection}
        availableAngles={storyAngles}
      />
    </div>
  );
}
```

**Step 2: Verify**

```bash
cd /Users/tarikmoody/Documents/Projects/storyforge/app
npx tsc --noEmit
```

**Step 3: Commit**

```bash
cd /Users/tarikmoody/Documents/Projects/storyforge
git add app/src/components/production/CoachPanel.tsx
git commit -m "feat: add CoachPanel with Analysis/Chat tabs and SteeringControls"
```

---

### Task 9: Build the StoryHeader component

**Files:**
- Create: `app/src/components/production/StoryHeader.tsx`

**Step 1: Create StoryHeader**

Displays story title, back button, and status badge.

```tsx
// app/src/components/production/StoryHeader.tsx

import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const statusColors: Record<string, string> = {
  transcribing: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  editing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  reviewing: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  approved: "bg-green-500/20 text-green-400 border-green-500/30",
  published: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

interface StoryHeaderProps {
  title: string;
  status: string;
}

export default function StoryHeader({ title, status }: StoryHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800 bg-zinc-950">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-zinc-400 hover:text-white"
        onClick={() => navigate("/")}
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <h1 className="text-lg font-semibold text-white truncate flex-1">
        {title}
      </h1>
      <Badge
        variant="outline"
        className={statusColors[status] ?? "border-zinc-700 text-zinc-400"}
      >
        {status}
      </Badge>
    </div>
  );
}
```

**Step 2: Verify**

```bash
cd /Users/tarikmoody/Documents/Projects/storyforge/app
npx tsc --noEmit
```

**Step 3: Commit**

```bash
cd /Users/tarikmoody/Documents/Projects/storyforge
git add app/src/components/production/StoryHeader.tsx
git commit -m "feat: add StoryHeader with back button and status badge"
```

---

### Task 10: Wire up ProductionPage

**Files:**
- Modify: `app/src/pages/ProductionPage.tsx`

**Step 1: Rewrite ProductionPage**

This is the orchestrator. Fetches story + transcript from Convex, creates the wavesurfer instance, and wires all panels together.

```tsx
// app/src/pages/ProductionPage.tsx

import { useRef, useEffect } from "react";
import { useParams } from "react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useWavesurfer } from "@/hooks/useWavesurfer";
import StoryHeader from "@/components/production/StoryHeader";
import WaveformPanel from "@/components/production/WaveformPanel";
import TranscriptPanel from "@/components/production/TranscriptPanel";
import CoachPanel from "@/components/production/CoachPanel";

export default function ProductionPage() {
  const { id } = useParams();
  const storyId = id as Id<"stories">;

  const story = useQuery(api.stories.get, { id: storyId });
  const transcript = useQuery(api.transcripts.getByStory, { storyId });

  const waveformRef = useRef<HTMLDivElement>(null);
  const ws = useWavesurfer({
    container: waveformRef,
    placeholderDuration: story?.audioDurationSeconds ?? 120,
  });

  // Add regions for key quotes when transcript loads
  useEffect(() => {
    if (!transcript?.keyQuotes || !ws.isReady) return;
    ws.clearRegions();
    for (const quote of transcript.keyQuotes as Array<{
      text: string;
      start: number;
      end: number;
      theme: string;
    }>) {
      ws.addRegion({
        id: `quote-${quote.start}`,
        start: quote.start,
        end: quote.end,
        color: "rgba(74, 158, 255, 0.15)",
        content: quote.theme,
      });
    }
  }, [transcript?.keyQuotes, ws.isReady]);

  if (!story) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-400">
        Loading story...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      <StoryHeader title={story.title} status={story.status} />

      {/* Waveform section */}
      <WaveformPanel
        currentTime={ws.currentTime}
        isPlaying={ws.isPlaying}
        duration={ws.duration}
        wavesurferControls={ws}
      />
      <div
        ref={waveformRef}
        className="px-4 pb-3 bg-zinc-900/50 border-b border-zinc-800"
      />

      {/* Bottom split: Transcript | Coach */}
      <div className="flex flex-1 min-h-0">
        {/* Transcript panel - left */}
        <div className="w-[55%] border-r border-zinc-800 overflow-hidden">
          {transcript ? (
            <TranscriptPanel
              markdown={transcript.markdown}
              speakers={transcript.speakers as Array<{ id: string; name: string; color: string }>}
              wordTimestamps={
                transcript.wordTimestamps as Array<{
                  word: string;
                  start: number;
                  end: number;
                  confidence: number;
                  speaker: string;
                }>
              }
              currentTime={ws.currentTime}
              onSeek={ws.seek}
              fillerWords={transcript.fillerWords as Array<{ word: string; start: number; end: number; speaker: string }> | undefined}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
              No transcript yet. Upload audio to begin.
            </div>
          )}
        </div>

        {/* Coach panel - right */}
        <div className="w-[45%] overflow-hidden">
          <CoachPanel
            storyId={storyId}
            storyAngles={
              (transcript?.storyAngles as Array<{
                angle: string;
                strength: number;
                reasoning: string;
              }>) ?? []
            }
            keyQuotes={
              (transcript?.keyQuotes as Array<{
                text: string;
                start: number;
                end: number;
                theme: string;
              }>) ?? []
            }
            emotionalArc={
              (transcript?.emotionalArc as Array<{
                time: number;
                intensity: number;
              }>) ?? []
            }
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
```

**Step 2: Verify the build**

```bash
cd /Users/tarikmoody/Documents/Projects/storyforge/app
npx tsc --noEmit && npx vite build
```

Expected: Clean type check and successful build. If there are import path issues with Convex API, fix them (likely need to use relative paths from `src/pages/` to `convex/_generated/`).

**Step 3: Commit**

```bash
cd /Users/tarikmoody/Documents/Projects/storyforge
git add app/src/pages/ProductionPage.tsx
git commit -m "feat: wire up ProductionPage with waveform, transcript, and coach panels"
```

---

### Task 11: Verify full build and visual check

**Step 1: Build**

```bash
cd /Users/tarikmoody/Documents/Projects/storyforge/app
npx vite build
```

Expected: Clean build, no errors.

**Step 2: Run the dev server**

```bash
cd /Users/tarikmoody/Documents/Projects/storyforge/app
npx vite --port 5173
```

**Step 3: Seed demo data**

In a separate terminal, or via the Convex dashboard:
1. Run `seedStations` if not already done
2. Run `seedDemoStory` to create the demo story + transcript

**Step 4: Visual verification**

Navigate to `http://localhost:5173/story/<storyId>` (get the storyId from the Convex dashboard or the seed result). Verify:
- Story header shows "Milwaukee's Vanishing Jazz Clubs" with "editing" badge
- Waveform renders with play/pause/stop controls
- Transcript shows speaker segments with color dots
- Clicking a transcript segment seeks the waveform
- Analysis tab shows story angles, key quotes, emotional arc
- Clicking a key quote seeks the waveform
- Coach Chat tab shows initial message, can send messages
- Steering controls (angle dropdown, tone, direction) are visible
- Key quote regions are highlighted on the waveform

**Step 5: Final commit if any fixes needed**

```bash
cd /Users/tarikmoody/Documents/Projects/storyforge
git add -A
git commit -m "fix: production workspace adjustments from visual verification"
```
