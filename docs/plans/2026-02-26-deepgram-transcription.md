# Deepgram Nova-3 Transcription Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Automatically transcribe uploaded audio sources using Deepgram Nova-3 with speaker diarization, filler words, and user-editable speaker names.

**Architecture:** When `sources.create` runs, it schedules a Convex action that sends the UploadThing audio URL to Deepgram's pre-recorded API. The action parses the response into a transcript document, updates source status, and the UI reactively reflects changes via Convex subscriptions.

**Tech Stack:** Deepgram Nova-3 pre-recorded API, Convex actions/mutations/scheduler, UploadThing URLs, React

---

### Task 1: Internal mutation for creating transcripts

The Deepgram action (a Convex action) cannot write to the database directly. It needs an internal mutation to insert transcript docs and update source status.

**Files:**
- Modify: `convex/transcripts.ts`

**Step 1: Add the internal mutation**

Add to the bottom of `convex/transcripts.ts`:

```typescript
import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";

// ... existing getByStory and search queries stay unchanged ...

export const insertFromDeepgram = internalMutation({
  args: {
    storyId: v.id("stories"),
    sourceId: v.id("sources"),
    markdown: v.string(),
    speakers: v.any(),
    durationSeconds: v.number(),
    wordTimestamps: v.any(),
    fillerWords: v.any(),
    searchableText: v.string(),
    rawSttJson: v.any(),
  },
  handler: async (ctx, args) => {
    const { sourceId, ...transcriptData } = args;

    // Insert transcript
    const transcriptId = await ctx.db.insert("transcripts", transcriptData);

    // Update source: status → ready, link transcript, set duration
    await ctx.db.patch(sourceId, {
      status: "ready",
      transcriptId,
      durationSeconds: args.durationSeconds,
    });

    // Check if all sources for this story are ready → advance story to "editing"
    const allSources = await ctx.db
      .query("sources")
      .withIndex("by_story", (q) => q.eq("storyId", args.storyId))
      .collect();

    const allReady = allSources.every((s) => s.status === "ready");
    if (allReady && allSources.length > 0) {
      const story = await ctx.db.get(args.storyId);
      if (story && story.status === "transcribing") {
        await ctx.db.patch(args.storyId, { status: "editing" });
      }
    }

    return transcriptId;
  },
});

export const markSourceFailed = internalMutation({
  args: {
    sourceId: v.id("sources"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sourceId, { status: "failed" });
  },
});
```

**Step 2: Update the import**

Change line 2 from:
```typescript
import { query } from "./_generated/server";
```
to:
```typescript
import { query, internalMutation } from "./_generated/server";
```

**Step 3: Verify Convex syncs**

Run: `npx convex dev` (should already be running)
Expected: Schema syncs, no errors. New internal mutations available at `internal.transcripts.insertFromDeepgram` and `internal.transcripts.markSourceFailed`.

**Step 4: Commit**

```bash
git add convex/transcripts.ts
git commit -m "feat: add internal mutations for transcript creation and source failure"
```

---

### Task 2: Rewrite Deepgram action with real API call

Replace the stub with a real Deepgram Nova-3 integration. The action sends the audio URL, parses the response into our transcript format, and calls the internal mutation.

**Files:**
- Modify: `convex/actions/deepgram.ts`

**Step 1: Rewrite the action**

Replace the entire file with:

```typescript
"use node";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

// Deepgram speaker colors — auto-assigned by index
const SPEAKER_COLORS = [
  "#F8971D", // brand orange
  "#32588E", // brand blue
  "#4A71A8", // brand blue light
  "#FFAB42", // brand orange hover
  "#10b981", // emerald
  "#a78bfa", // violet
  "#f472b6", // pink
  "#fbbf24", // amber
];

export const transcribe = action({
  args: {
    sourceId: v.id("sources"),
    storyId: v.id("stories"),
    audioUrl: v.string(),
    keyterms: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.DEEPGRAM_API_KEY;

    // -----------------------------------------------------------------------
    // Stub mode: return mock data when no API key is configured
    // -----------------------------------------------------------------------
    if (!apiKey) {
      console.log("[STUB] Deepgram transcribe called — returning mock data");
      await ctx.runMutation(internal.transcripts.insertFromDeepgram, {
        storyId: args.storyId,
        sourceId: args.sourceId,
        markdown:
          "**Speaker 0:** This is a mock transcript for development.\n\n**Speaker 1:** It includes speaker diarization and word-level timestamps for testing the UI.",
        speakers: [
          { id: "speaker_0", name: "Speaker 0", color: SPEAKER_COLORS[0] },
          { id: "speaker_1", name: "Speaker 1", color: SPEAKER_COLORS[1] },
        ],
        durationSeconds: 120,
        wordTimestamps: [
          { word: "This", start: 0.0, end: 0.2, confidence: 0.99, speaker: "speaker_0" },
          { word: "is", start: 0.2, end: 0.3, confidence: 0.99, speaker: "speaker_0" },
          { word: "a", start: 0.3, end: 0.35, confidence: 0.99, speaker: "speaker_0" },
          { word: "mock", start: 0.35, end: 0.55, confidence: 0.99, speaker: "speaker_0" },
          { word: "transcript", start: 0.55, end: 0.9, confidence: 0.98, speaker: "speaker_0" },
        ],
        fillerWords: [],
        searchableText:
          "This is a mock transcript for development. It includes speaker diarization and word-level timestamps for testing the UI.",
        rawSttJson: {},
      });
      return;
    }

    // -----------------------------------------------------------------------
    // Real Deepgram Nova-3 API call
    // -----------------------------------------------------------------------
    try {
      const params = new URLSearchParams({
        model: "nova-3",
        diarize: "true",
        punctuate: "true",
        paragraphs: "true",
        smart_format: "true",
        filler_words: "true",
        utterances: "true",
      });

      // Add keyterms for improved accuracy on proper nouns
      if (args.keyterms) {
        for (const term of args.keyterms) {
          params.append("keyterm", term);
        }
      }

      const response = await fetch(
        `https://api.deepgram.com/v1/listen?${params.toString()}`,
        {
          method: "POST",
          headers: {
            Authorization: `Token ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: args.audioUrl }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Deepgram API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      // -------------------------------------------------------------------
      // Parse response into our transcript format
      // -------------------------------------------------------------------
      const durationSeconds = data.metadata?.duration ?? 0;
      const channel = data.results?.channels?.[0];
      const alternative = channel?.alternatives?.[0];

      if (!alternative) {
        throw new Error("Deepgram returned no transcription alternatives");
      }

      // Build speakers map from diarization
      const speakerSet = new Set<number>();
      const words: Array<{
        word: string;
        start: number;
        end: number;
        confidence: number;
        speaker: string;
        punctuated_word?: string;
      }> = [];

      for (const w of alternative.words ?? []) {
        const speakerNum = w.speaker ?? 0;
        speakerSet.add(speakerNum);
        words.push({
          word: w.punctuated_word ?? w.word,
          start: w.start,
          end: w.end,
          confidence: w.confidence,
          speaker: `speaker_${speakerNum}`,
        });
      }

      const speakers = Array.from(speakerSet)
        .sort((a, b) => a - b)
        .map((num) => ({
          id: `speaker_${num}`,
          name: `Speaker ${num}`,
          color: SPEAKER_COLORS[num % SPEAKER_COLORS.length],
        }));

      // Build markdown from paragraphs (preferred) or utterances
      let markdown = "";
      const paragraphs = alternative.paragraphs?.paragraphs;

      if (paragraphs && paragraphs.length > 0) {
        const parts: string[] = [];
        for (const para of paragraphs) {
          const speakerLabel = `Speaker ${para.speaker ?? 0}`;
          const text = para.sentences
            ?.map((s: { text: string }) => s.text)
            .join(" ") ?? "";
          parts.push(`**${speakerLabel}:** ${text}`);
        }
        markdown = parts.join("\n\n");
      } else if (data.results?.utterances) {
        // Fallback to utterances
        const parts: string[] = [];
        for (const utt of data.results.utterances) {
          const speakerLabel = `Speaker ${utt.speaker ?? 0}`;
          parts.push(`**${speakerLabel}:** ${utt.transcript}`);
        }
        markdown = parts.join("\n\n");
      } else {
        // Last resort: plain transcript, no speaker labels
        markdown = alternative.transcript ?? "";
      }

      // Extract filler words
      const FILLER_SET = new Set(["uh", "um", "mhmm", "mm-mm", "uh-uh", "uh-huh", "nuh-uh"]);
      const fillerWords = words
        .filter((w) => FILLER_SET.has(w.word.toLowerCase().replace(/[.,!?]/g, "")))
        .map((w) => ({
          word: w.word,
          start: w.start,
          end: w.end,
          speaker: w.speaker,
        }));

      // Build searchable text (no speaker labels, no filler words)
      const searchableText = words
        .filter((w) => !FILLER_SET.has(w.word.toLowerCase().replace(/[.,!?]/g, "")))
        .map((w) => w.word)
        .join(" ");

      // -------------------------------------------------------------------
      // Save transcript via internal mutation
      // -------------------------------------------------------------------
      await ctx.runMutation(internal.transcripts.insertFromDeepgram, {
        storyId: args.storyId,
        sourceId: args.sourceId,
        markdown,
        speakers,
        durationSeconds,
        wordTimestamps: words,
        fillerWords,
        searchableText,
        rawSttJson: data,
      });
    } catch (error) {
      console.error("Deepgram transcription failed:", error);
      await ctx.runMutation(internal.transcripts.markSourceFailed, {
        sourceId: args.sourceId,
      });
      throw error;
    }
  },
});
```

**Step 2: Verify Convex syncs**

Run: `npx convex dev`
Expected: Action deploys, no type errors.

**Step 3: Commit**

```bash
git add convex/actions/deepgram.ts
git commit -m "feat: implement real Deepgram Nova-3 transcription with diarize + filler words"
```

---

### Task 3: Schedule transcription automatically on source creation

When a source is created after upload, schedule the Deepgram action immediately.

**Files:**
- Modify: `convex/sources.ts`

**Step 1: Update the create mutation**

Add the scheduler import and schedule the action. Replace the `create` mutation in `convex/sources.ts`:

```typescript
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { api } from "./_generated/api";

// ... listByStory and get queries stay unchanged ...

export const create = mutation({
  args: {
    storyId: v.id("stories"),
    title: v.string(),
    audioUrl: v.string(),
    speakerName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sourceId = await ctx.db.insert("sources", {
      storyId: args.storyId,
      title: args.title,
      audioUrl: args.audioUrl,
      status: "transcribing",
      speakerName: args.speakerName,
      uploadedAt: Date.now(),
    });

    // If story is in draft, advance to transcribing
    const story = await ctx.db.get(args.storyId);
    if (story && story.status === "draft") {
      await ctx.db.patch(args.storyId, { status: "transcribing" });
    }

    // Schedule Deepgram transcription immediately
    const keyterms: string[] = [];
    if (args.speakerName) keyterms.push(args.speakerName);

    await ctx.scheduler.runAfter(0, api.actions.deepgram.transcribe, {
      sourceId,
      storyId: args.storyId,
      audioUrl: args.audioUrl,
      keyterms: keyterms.length > 0 ? keyterms : undefined,
    });

    return sourceId;
  },
});

// ... updateStatus and remove stay unchanged ...
```

**Step 2: Verify Convex syncs**

Run: `npx convex dev`
Expected: No errors. Creating a source now auto-schedules transcription.

**Step 3: Commit**

```bash
git add convex/sources.ts
git commit -m "feat: auto-schedule Deepgram transcription on source creation"
```

---

### Task 4: Add retry transcription mutation

Allow users to retry a failed transcription.

**Files:**
- Modify: `convex/sources.ts`

**Step 1: Add retry mutation**

Add to the bottom of `convex/sources.ts`:

```typescript
export const retryTranscription = mutation({
  args: { id: v.id("sources") },
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.id);
    if (!source || source.status !== "failed") return;

    // Reset status
    await ctx.db.patch(args.id, { status: "transcribing" });

    // Re-schedule
    const keyterms: string[] = [];
    if (source.speakerName) keyterms.push(source.speakerName);

    await ctx.scheduler.runAfter(0, api.actions.deepgram.transcribe, {
      sourceId: args.id,
      storyId: source.storyId,
      audioUrl: source.audioUrl,
      keyterms: keyterms.length > 0 ? keyterms : undefined,
    });
  },
});
```

**Step 2: Commit**

```bash
git add convex/sources.ts
git commit -m "feat: add retry transcription mutation for failed sources"
```

---

### Task 5: Load transcript per selected source in ProductionPage

Currently `ProductionPage` loads a single transcript per story. Change it to load the transcript for the selected source.

**Files:**
- Modify: `convex/transcripts.ts` — add `getBySource` query
- Modify: `src/pages/ProductionPage.tsx` — use per-source transcript

**Step 1: Add getBySource query**

Add to `convex/transcripts.ts` (after the existing `getByStory`):

```typescript
export const getBySource = query({
  args: { sourceId: v.id("sources") },
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.sourceId);
    if (!source?.transcriptId) return null;
    return await ctx.db.get(source.transcriptId);
  },
});
```

**Step 2: Update ProductionPage to use per-source transcript**

In `src/pages/ProductionPage.tsx`, change the transcript query from:

```typescript
const transcript = useQuery(api.transcripts.getByStory, { storyId });
```

to:

```typescript
const transcript = useQuery(
  api.transcripts.getBySource,
  selectedSourceId ? { sourceId: selectedSourceId } : "skip",
);
```

**Step 3: Also load the selected source for audio URL**

Add after the `selectedSourceId` state:

```typescript
const selectedSource = useQuery(
  api.sources.get,
  selectedSourceId ? { id: selectedSourceId } : "skip",
);
```

**Step 4: Verify Convex syncs and build passes**

Run: `npx vite build`
Expected: Clean build, no type errors.

**Step 5: Commit**

```bash
git add convex/transcripts.ts src/pages/ProductionPage.tsx
git commit -m "feat: load transcript per selected source instead of per story"
```

---

### Task 6: Add retry button to SourcePanel for failed sources

**Files:**
- Modify: `src/components/production/SourcePanel.tsx`

**Step 1: Add retry button**

Import `useMutation` and add the retry call. Update the failed source's button to show a retry option:

```typescript
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { FileAudio, Loader2, CheckCircle, AlertCircle, Upload, RotateCcw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UploadButton } from "@/lib/uploadthing";

// ... keep SourcePanelProps, statusIcons, statusColors unchanged ...

export default function SourcePanel({
  storyId,
  selectedSourceId,
  onSelectSource,
  onUploadComplete,
}: SourcePanelProps) {
  const sources = useQuery(api.sources.listByStory, { storyId });
  const retryTranscription = useMutation(api.sources.retryTranscription);

  // ... rest of the component ...
```

Inside the source map, after the duration span and before the closing `</button>`, add a retry button for failed sources:

```tsx
{source.status === "failed" && (
  <button
    onClick={(e) => {
      e.stopPropagation();
      retryTranscription({ id: source._id });
    }}
    className="text-cream-faint hover:text-brand-orange transition-colors"
    title="Retry transcription"
  >
    <RotateCcw className="h-3.5 w-3.5" />
  </button>
)}
```

**Step 2: Verify build**

Run: `npx vite build`
Expected: Clean build.

**Step 3: Commit**

```bash
git add src/components/production/SourcePanel.tsx
git commit -m "feat: add retry button for failed transcriptions in SourcePanel"
```

---

### Task 7: Speaker rename UI in TranscriptPanel

Allow users to click a speaker name to rename it. The rename updates the transcript's `speakers` array.

**Files:**
- Modify: `convex/transcripts.ts` — add `renameSpeaker` mutation
- Modify: `src/components/production/TranscriptPanel.tsx` — add inline rename

**Step 1: Add renameSpeaker mutation**

Add to `convex/transcripts.ts`:

```typescript
export const renameSpeaker = mutation({
  args: {
    transcriptId: v.id("transcripts"),
    speakerId: v.string(),
    newName: v.string(),
  },
  handler: async (ctx, args) => {
    const transcript = await ctx.db.get(args.transcriptId);
    if (!transcript) return;

    const speakers = (transcript.speakers as Array<{ id: string; name: string; color: string }>);
    const updated = speakers.map((s) =>
      s.id === args.speakerId ? { ...s, name: args.newName } : s,
    );

    // Also update markdown — replace old speaker name with new one
    const oldSpeaker = speakers.find((s) => s.id === args.speakerId);
    let markdown = transcript.markdown;
    if (oldSpeaker) {
      markdown = markdown.replaceAll(
        `**${oldSpeaker.name}:**`,
        `**${args.newName}:**`,
      );
    }

    await ctx.db.patch(args.transcriptId, { speakers: updated, markdown });
  },
});
```

Note: Also add `mutation` to the import from `./_generated/server`:

```typescript
import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
```

**Step 2: Update TranscriptPanel with inline speaker rename**

Add to `TranscriptPanel.tsx` — pass `transcriptId` as a new prop and add rename functionality:

Update the props interface:

```typescript
interface TranscriptPanelProps {
  transcriptId?: string;
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
```

Add state and mutation at the top of the component:

```typescript
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

// Inside the component:
const [editingSpeaker, setEditingSpeaker] = useState<string | null>(null);
const [editName, setEditName] = useState("");
const renameSpeaker = useMutation(api.transcripts.renameSpeaker);
```

Replace the speaker name `<span>` in the segment render with:

```tsx
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
  <span
    className="text-xs font-medium text-cream-muted cursor-pointer hover:text-brand-orange transition-colors"
    onClick={(e) => {
      e.stopPropagation();
      setEditingSpeaker(segment.speakerId);
      setEditName(segment.speakerName);
    }}
    title="Click to rename speaker"
  >
    {segment.speakerName}
  </span>
)}
```

Add `useState` to the imports from React.

**Step 3: Pass transcriptId from ProductionPage**

In `src/pages/ProductionPage.tsx`, update the TranscriptPanel usage:

```tsx
<TranscriptPanel
  transcriptId={transcript?._id}
  markdown={transcript.markdown}
  speakers={speakers}
  wordTimestamps={wordTimestamps}
  currentTime={ws.currentTime}
  onSeek={ws.seek}
  fillerWords={fillerWords}
/>
```

**Step 4: Verify build**

Run: `npx vite build`
Expected: Clean build.

**Step 5: Commit**

```bash
git add convex/transcripts.ts src/components/production/TranscriptPanel.tsx src/pages/ProductionPage.tsx
git commit -m "feat: add inline speaker rename in TranscriptPanel"
```

---

### Task 8: Set DEEPGRAM_API_KEY and end-to-end test

**Step 1: Sign up for Deepgram**

Go to https://console.deepgram.com/signup — create account, get API key from the dashboard.

**Step 2: Set the env var in Convex**

Run:
```bash
npx convex env set DEEPGRAM_API_KEY <your-key>
```

**Step 3: End-to-end test**

1. Start the dev servers: `npm run dev` and `npm run dev:upload`
2. Open dashboard, create a new story
3. In the Production Workspace, click "Add Audio" and upload an MP3/WAV
4. Watch the source status: uploading → transcribing (spinner) → ready (green check)
5. Transcript should appear in the TranscriptPanel with speaker labels
6. Click a speaker name to rename it
7. Upload a second audio file — should get its own independent transcript

**Step 4: Verify the kanban board**

Go back to the dashboard. The story should have moved from "Draft" → "Transcribing" → "Editing" as sources complete.

**Step 5: Commit any fixes and push**

```bash
git push origin main
```

---

### Task 9: Build verification

**Step 1: Clean build check**

Run: `npx vite build`
Expected: Build succeeds with no errors.

**Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No type errors.

**Step 3: Final commit and push**

```bash
git add -A
git commit -m "feat: complete Deepgram Nova-3 transcription integration"
git push origin main
```
