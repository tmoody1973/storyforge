# Production Workspace Design

**Date:** 2026-02-26
**Status:** Approved

## Summary

Build the Production Workspace — the core 3-panel interface where DJs and producers work on stories. Full layout with all panels wired to existing Convex stubs and mock data. No real API integrations yet.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Layout | Top/bottom split | Waveform full-width on top, transcript + coach side-by-side below. DAW-style, matches Descript/Hindenburg |
| Waveform | wavesurfer.js v7 | Most popular browser waveform lib, built-in regions plugin, React-friendly |
| Coach UX | Hybrid cards + chat | Analysis cards (angles, quotes, arc) on one tab, conversational chat on another |
| Data | All from existing stubs | No new APIs. Convex queries + agent stubs already return mock data |
| Transcript | Read-only + click-to-seek | Inline editing deferred. Focus on audio-transcript sync |

## Layout

```
┌─────────────────────────────────────────────────┐
│  ← Back   Story Title           [Status Badge]  │  Story header bar
├─────────────────────────────────────────────────┤
│  ▶ ■  00:42 / 02:00   ════════●══════  🔊 ━━━  │  Transport controls
│  ▓▓▓▓▒▒▓▓▓▒▒▒▓▓▓▒▓▓▓▓▒▒▓▓▒▒▒▓▒▓▓▓▓▓▒▒▓▓▒▒▒▒  │  wavesurfer.js waveform
├──────────────────────┬──────────────────────────┤
│                      │  [Analysis] [Coach Chat] │  Tabs in right panel
│   TRANSCRIPT         │  ┌─ Story Angles ──────┐ │
│                      │  │ Community change 90% │ │
│  🔵 Speaker 1 0:00  │  │ Housing crisis   70% │ │
│  This is a mock...   │  └─────────────────────┘ │
│                      │  ┌─ Key Quotes ────────┐ │
│  🔴 Speaker 2 0:12  │  │ "This is a mock..." │ │
│  It includes...      │  └─────────────────────┘ │
│                      │  ┌─ Emotional Arc ─────┐ │
│                      │  │  ╱╲    ╱╲           │ │
│                      │  │ ╱  ╲__╱  ╲__        │ │
│                      │  └─────────────────────┘ │
│                      │  ── Steering ──────────  │
│                      │  Angle: [dropdown]       │
│                      │  Tone:  [input]          │
│                      ├──────────────────────────┤
│                      │  [Chat input...]    Send  │
└──────────────────────┴──────────────────────────┘
```

## Components

- **ProductionPage** — route component, fetches story + transcript, orchestrates layout
- **StoryHeader** — title, back button, status badge, workflow actions
- **WaveformPanel** — wavesurfer.js waveform + transport controls + regions
- **TranscriptPanel** — scrollable transcript with speaker labels, timestamps, click-to-seek, auto-scroll
- **CoachPanel** — tabbed panel: Analysis tab + Coach Chat tab
- **AnalysisCards** — story angles, key quotes, emotional arc visualizations
- **CoachChat** — conversational thread UI with text input
- **SteeringControls** — angle dropdown, tone, narrative direction inputs
- **EmotionalArcChart** — simple SVG line chart

## Data Flow

### Server State (Convex useQuery)

- `stories.get({ id })` — story metadata, status, steering fields
- `transcripts.getByStory({ storyId })` — transcript markdown, speakers, word timestamps, AI analysis
- `comments.listByStory({ storyId })` — comments (for future use)

### Local State (React useState)

- `currentTime` — audio playhead position (from wavesurfer `audioprocess` event)
- `isPlaying` — play/pause toggle
- `activeCoachTab` — "analysis" | "chat"
- `chatMessages` — local chat thread array

### Key Interactions

1. **Click transcript word** → seek wavesurfer to that timestamp
2. **Audio plays** → transcript auto-scrolls, highlights current segment
3. **Click "Analyze"** → `callAgent("transcript", ...)` → populates analysis cards
4. **Send coach message** → `callAgent("coach", ...)` → appends response to chat
5. **Change steering** → `stories.updateSteering` mutation → real-time update
6. **Click key quote** → seek audio to quote timestamp

### No new Convex functions needed — all queries, mutations, and action stubs exist.

## Waveform Panel

**Included:**
- wavesurfer.js v7 waveform rendering
- Transport: play/pause, stop, click-to-seek
- Time display: current / total duration
- Volume slider
- Regions plugin: key quotes highlighted on waveform, off-record ranges dimmed
- Cursor line moves during playback

**Deferred:**
- Multi-track (Sound Palette, narration takes)
- Zoom controls
- Minimap

**Implementation:** `useWavesurfer` hook that creates instance, exposes play/pause/seek/currentTime, manages regions, cleans up on unmount. Mock audio: short sample mp3 or generated silent blob.

## Transcript Panel

**Included:**
- Scrollable list of speaker segments parsed from transcript markdown
- Speaker color dot + name + timestamp per segment
- Current segment highlighted during playback (matched via wordTimestamps)
- Click segment → seek audio to start time
- Auto-scroll to keep current segment in view
- Filler words visually marked (subtle highlight)

**Deferred:**
- Inline text editing (corrections)
- Off-record range toggling from transcript
- Right-click context menus
- Comment anchoring to text

## Coach Panel

### Analysis Tab

- **Story Angles** — cards with angle name + strength progress bar
- **Key Quotes** — list with timestamps, clickable to seek audio + highlight waveform region
- **Emotional Arc** — SVG line chart showing intensity over time
- **"Analyze" button** — triggers `callAgent("transcript", ...)`, populates cards with stub data

### Coach Chat Tab

- Message thread UI (user/coach roles)
- Text input + send button
- `callAgent("coach", ...)` returns stub coaching advice
- Messages in local state only (not persisted)

### Steering Controls (visible in both tabs)

- Selected angle (dropdown populated from analysis results)
- Emotional tone (text input)
- Narrative direction (text input)
- Calls `stories.updateSteering` on blur/change
