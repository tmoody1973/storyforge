# Gradient ADK Agents + Transcript Export Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire all four Gradient ADK agents with real LLM calls, add transcript markdown export, and auto-trigger transcript analysis after Deepgram transcription.

**Architecture:** Convex actions call Gradient agent router via HTTP. Python agents use Claude via Gradient SDK (or Anthropic fallback). Transcript export is client-side markdown generation.

**Tech Stack:** Convex actions, Gradient ADK, Claude Sonnet, Anthropic SDK (fallback), React

---

### Task 1: Transcript markdown export

Client-side export — no server calls. Add an export button to TranscriptPanel that downloads a formatted `.md` file.

**Files:**
- Create: `src/lib/exportTranscript.ts`
- Modify: `src/components/production/TranscriptPanel.tsx`

**Step 1: Create the export utility**

Create `src/lib/exportTranscript.ts`:

```typescript
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

  // Header
  const duration = durationSeconds
    ? `${Math.floor(durationSeconds / 60)}:${String(Math.floor(durationSeconds % 60)).padStart(2, "0")}`
    : "Unknown";

  const speakerNames = speakers.map((s) => s.name).join(", ");

  // Re-format markdown with timestamps
  const paragraphs = markdown.split(/\n\n+/).filter(Boolean);

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

  const formattedParagraphs = paragraphs.map((para, i) => {
    const group = i < timestampGroups.length ? timestampGroups[i] : undefined;
    const startTime = group ? group[0].start : 0;
    const mins = Math.floor(startTime / 60);
    const secs = Math.floor(startTime % 60);
    const timestamp = `${mins}:${String(secs).padStart(2, "0")}`;

    // Replace **Speaker N:** with **Speaker N** (timestamp)
    const formatted = para.replace(
      /^\*\*(.+?):\*\*/,
      `**$1** (${timestamp})`,
    );
    return formatted;
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

  // Download
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[^a-zA-Z0-9]/g, "_")}_transcript.md`;
  a.click();
  URL.revokeObjectURL(url);
}
```

**Step 2: Add export button to TranscriptPanel**

In `src/components/production/TranscriptPanel.tsx`, add `Download` to lucide-react imports and add props for `sourceTitle` and `durationSeconds`. Add an export button next to the "Transcript" heading:

```tsx
// New props
interface TranscriptPanelProps {
  transcriptId?: string;
  sourceTitle?: string;
  durationSeconds?: number;
  markdown: string;
  speakers: Speaker[];
  wordTimestamps: WordTimestamp[];
  currentTime: number;
  onSeek: (time: number) => void;
  fillerWords?: Array<{ word: string; start: number; end: number; speaker: string }>;
}
```

Add the button in the header div:

```tsx
<div className="px-4 py-3 shrink-0 flex items-center justify-between">
  <h2 className="text-sm font-semibold uppercase text-cream-dim">
    Transcript
  </h2>
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
```

**Step 3: Pass sourceTitle and durationSeconds from ProductionPage**

Update the TranscriptPanel usage to pass source info.

**Step 4: Commit**

```bash
git add src/lib/exportTranscript.ts src/components/production/TranscriptPanel.tsx src/pages/ProductionPage.tsx
git commit -m "feat: add transcript markdown export with timestamps"
```

---

### Task 2: Update gradientAgent.ts with real HTTP call

Replace the TODO with a real `fetch` call to the deployed agent URL. Keep stubs when no URL is set.

**Files:**
- Modify: `convex/actions/gradientAgent.ts`

**Step 1: Implement the HTTP call**

After the stub block (the `if (!agentUrl)` section), replace the TODO/throw with:

```typescript
const response = await fetch(agentUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    agent: args.agent,
    input: args.payload,
  }),
});

if (!response.ok) {
  const errorText = await response.text();
  throw new Error(`Gradient Agent error ${response.status}: ${errorText}`);
}

const data = await response.json();
return data.result ?? data;
```

**Step 2: Commit**

```bash
git add convex/actions/gradientAgent.ts
git commit -m "feat: wire real HTTP call to Gradient agent router"
```

---

### Task 3: Auto-trigger transcript analysis after Deepgram completes

When Deepgram finishes and `insertFromDeepgram` runs, schedule the Gradient transcript agent to analyze the transcript.

**Files:**
- Modify: `convex/transcripts.ts` — schedule analysis in insertFromDeepgram
- Modify: `convex/actions/gradientAgent.ts` — add `analyzeTranscript` action that calls the agent and saves results

**Step 1: Add analyzeTranscript action**

Add a new exported action to `convex/actions/gradientAgent.ts`:

```typescript
export const analyzeTranscript = action({
  args: {
    transcriptId: v.id("transcripts"),
    storyId: v.id("stories"),
    markdown: v.string(),
    wordTimestamps: v.any(),
  },
  handler: async (ctx, args) => {
    // Call the transcript agent
    const result = await ctx.runAction(api.actions.gradientAgent.callAgent, {
      agent: "transcript",
      payload: {
        transcript: args.markdown,
        word_timestamps: args.wordTimestamps,
      },
    });

    // Save analysis back to transcript
    await ctx.runMutation(internal.transcripts.saveAnalysis, {
      transcriptId: args.transcriptId,
      storyAngles: result.story_angles ?? result.storyAngles ?? [],
      keyQuotes: result.key_quotes ?? result.keyQuotes ?? [],
      emotionalArc: result.emotional_arc ?? result.emotionalArc ?? [],
    });
  },
});
```

Add the needed imports at the top of the file:

```typescript
import { api, internal } from "../_generated/api";
```

**Step 2: Add saveAnalysis internal mutation to transcripts.ts**

```typescript
export const saveAnalysis = internalMutation({
  args: {
    transcriptId: v.id("transcripts"),
    storyAngles: v.any(),
    keyQuotes: v.any(),
    emotionalArc: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.transcriptId, {
      storyAngles: args.storyAngles,
      keyQuotes: args.keyQuotes,
      emotionalArc: args.emotionalArc,
    });
  },
});
```

**Step 3: Schedule analysis in insertFromDeepgram**

At the end of the `insertFromDeepgram` handler, after updating source status, add:

```typescript
// Schedule AI analysis of the transcript
await ctx.scheduler.runAfter(0, api.actions.gradientAgent.analyzeTranscript, {
  transcriptId,
  storyId: args.storyId,
  markdown: args.markdown,
  wordTimestamps: args.wordTimestamps,
});
```

Add the `api` import to transcripts.ts:

```typescript
import { api } from "./_generated/api";
```

**Step 4: Commit**

```bash
git add convex/actions/gradientAgent.ts convex/transcripts.ts
git commit -m "feat: auto-trigger transcript analysis after Deepgram transcription"
```

---

### Task 4: Wire CoachChat to coach agent

The CoachChat component exists but uses hardcoded responses. Wire it to call the Gradient coach agent.

**Files:**
- Modify: `src/components/production/CoachChat.tsx`
- Modify: `convex/actions/gradientAgent.ts` — ensure callAgent is available to client

**Step 1: Read and update CoachChat.tsx**

Read the current file, then wire it to call `api.actions.gradientAgent.callAgent` with agent="coach". The chat should:
- Send user message + transcript context to the coach agent
- Display the returned coaching text
- Show loading state while waiting

**Step 2: Commit**

```bash
git add src/components/production/CoachChat.tsx
git commit -m "feat: wire CoachChat to Gradient coach agent"
```

---

### Task 5: Add content generation UI

Add a "Generate Content" button that calls the content agent and displays the 6 formats.

**Files:**
- Modify: `convex/stories.ts` — add mutation to save generated content
- Modify: `src/components/production/CoachPanel.tsx` — add Generate Content button and display

**Step 1: Add saveGeneratedContent mutation to stories.ts**

```typescript
export const saveGeneratedContent = mutation({
  args: {
    storyId: v.id("stories"),
    airBreak: v.optional(v.any()),
    podcastSegment: v.optional(v.any()),
    socialThread: v.optional(v.any()),
    webArticle: v.optional(v.any()),
    newsletterCopy: v.optional(v.any()),
    pressRelease: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { storyId, ...content } = args;
    const filtered = Object.fromEntries(
      Object.entries(content).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(storyId, filtered);
  },
});
```

**Step 2: Add Generate Content button and display in CoachPanel**

Add a "Generate Content" tab/button that:
- Calls `api.actions.gradientAgent.callAgent` with agent="content"
- Saves results to story via `saveGeneratedContent`
- Displays the 6 formats in a scrollable list with copy buttons

**Step 3: Commit**

```bash
git add convex/stories.ts src/components/production/CoachPanel.tsx
git commit -m "feat: add content generation via Gradient content agent"
```

---

### Task 6: Implement Python transcript agent

Replace stub with real Claude call in `agents/transcript.py`.

**Files:**
- Modify: `agents/agents/transcript.py`
- Modify: `agents/requirements.txt` — add anthropic

**Step 1: Implement analyze_transcript**

Replace the stub with a real LLM call that:
- Sends transcript text to Claude with a structured prompt
- Asks for: story angles (with strength 0-1 and reasoning), key quotes (with start/end timestamps and themes), emotional arc (time/intensity pairs)
- Parses structured JSON response
- Falls back to Anthropic SDK if Gradient SDK fails

**Step 2: Commit**

```bash
git add agents/agents/transcript.py agents/requirements.txt
git commit -m "feat: implement real transcript analysis agent with Claude"
```

---

### Task 7: Implement Python coach agent

**Files:**
- Modify: `agents/agents/coach.py`

**Step 1: Implement generate_coaching**

Replace stub with real Claude call using a system prompt with radio storytelling best practices. Include transcript context in the user message. Use Gradient KB for RAG when configured, fall back to hardcoded best practices.

**Step 2: Commit**

```bash
git add agents/agents/coach.py
git commit -m "feat: implement real coaching agent with Claude + RAG fallback"
```

---

### Task 8: Implement Python content agent

**Files:**
- Modify: `agents/agents/content.py`

**Step 1: Implement generate_formats**

Replace stub with real Claude call. Single prompt that generates all 6 formats using station voice guide and DJ style profile. Parse structured response into the 6 format objects.

**Step 2: Commit**

```bash
git add agents/agents/content.py
git commit -m "feat: implement real content generation agent with Claude"
```

---

### Task 9: Implement Python workflow agent

**Files:**
- Modify: `agents/agents/workflow.py`

**Step 1: Implement analyze_workflow_event**

Replace stub with Claude call that analyzes story status, suggests next actions, and checks for topic overlaps across org stories.

**Step 2: Commit**

```bash
git add agents/agents/workflow.py
git commit -m "feat: implement real workflow agent with Claude"
```

---

### Task 10: Build verification and push

**Step 1: Vite build**

Run: `npx vite build`
Expected: Clean build.

**Step 2: Convex deploy**

Run: `npx convex dev --once`
Expected: Functions deploy successfully.

**Step 3: Push**

```bash
git push origin main
```
