# Story Board & Multi-Source Audio Design

**Date:** 2026-02-26
**Status:** Approved

## Summary

Build the Story Board (kanban dashboard) and multi-source audio model. Producers manage stories across columns (draft → transcribing → editing → published), create stories, upload interview audio via UploadThing, and work with multiple source transcripts in the Production Workspace.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Multi-audio model | Sources as raw material | Interviews feed into one story. Matches radio production workflow |
| Story Board layout | Kanban board | Visual workflow by status. Strong hackathon demo |
| New story flow | Hybrid (create first, add audio later) | Lets producers claim a story slot without audio ready |
| Source management | Inside Production Workspace | No friction — sources visible while working |
| Status columns | draft → transcribing → editing → published | Four clean columns. Approval lives inside Production Workspace |
| File uploads | UploadThing from the start | Handles large WAV/MP3, CDN-backed, avoids migration later |
| Stations | 88Nine + HYFIN only | Two stations for hackathon scope |
| Transcript model | Two-layer: source transcripts + story script | Raw transcripts stay unchanged; story script is the living document |

## Data Model Changes

### New `sources` table

```
sources
  storyId          → references stories
  title            → "Marcus Thompson Interview"
  audioUrl         → string (UploadThing CDN URL)
  transcriptId     → references transcripts (one per source)
  durationSeconds
  status           → "uploading" | "transcribing" | "ready" | "failed"
  speakerName      → optional, for labeling
  uploadedAt
  indexes: by_story, by_story_status
```

### Stories table changes

- Add `"draft"` to status union: `draft | transcribing | editing | published`
- Remove singular `audioFileId` and `transcriptId` — now on sources
- Keep steering, themes, sound assets, generatedScript, etc.

### Transcript stays the same

One transcript per source, linked from the source row.

## Two-Layer Transcript Model

| Layer | What it is | Where it lives |
|---|---|---|
| Source transcripts | Raw Deepgram output per interview. Verbatim. Read-only. | `transcripts` table, linked from each `source` |
| Story script | Produced narrative — quotes pulled from sources, reordered, trimmed, refined by producer + AI coach | `stories.generatedScript` |

### Editing workflow

1. Producer uploads source audio → Deepgram transcribes → raw source transcripts appear
2. Producer reads source transcripts, clicks key quotes → pulled into story script
3. AI coach suggests angle, quote selection, narrative structure
4. Producer edits story script — reorder, write narration bridges, trim
5. Story script gets approved and published

Source transcripts never change. Story script is the living document.

## Story Board UI

```
┌─────────────────────────────────────────────────────────┐
│  StoryForge    [Station Filter ▾]        [+ New Story]  │
├────────────┬────────────┬────────────┬──────────────────┤
│   DRAFT    │TRANSCRIBING│  EDITING   │   PUBLISHED      │
│            │            │            │                  │
│ ┌────────┐ │ ┌────────┐ │ ┌────────┐ │ ┌────────┐      │
│ │Jazz     │ │ │Housing │ │ │Park    │ │ │Summer  │      │
│ │Clubs    │ │ │Crisis  │ │ │Concert │ │ │Fest    │      │
│ │         │ │ │        │ │ │        │ │ │        │      │
│ │88Nine   │ │ │HYFIN   │ │ │414Music│ │ │88Nine  │      │
│ │0 sources│ │ │2/3 ████│ │ │3 ready │ │ │Jun 15  │      │
│ │+ Add ▲  │ │ │        │ │ │        │ │ │        │      │
│ └────────┘ │ └────────┘ │ └────────┘ │ └────────┘      │
└────────────┴────────────┴────────────┴──────────────────┘
```

**Card contents:** Title, station (color-coded), source count + status, date. Click → Production Workspace.

**Top bar:** Station filter dropdown, "+ New Story" button → dialog (title + station picker).

**No drag-and-drop** — status changes happen inside Production Workspace.

## Production Workspace Changes

Transcript panel becomes source-aware:

```
┌──────────────────────┐
│  SOURCES             │
│  [Marcus Thompson ▾] │  ← source selector
│                      │
│  + Add Source Audio   │  ← UploadThing upload
├──────────────────────┤
│  🔵 Marcus  0:00    │  ← transcript for selected source
│  Man, where do I...  │
│                      │
│  🔴 Interviewer 0:12│
│  That's a common...  │
└──────────────────────┘
```

- Source selector: tabs for 1-3 sources, dropdown for 4+
- "Add Source Audio" triggers UploadThing upload → creates source → kicks off transcription
- Waveform switches to selected source's audio
- Coach panel analysis runs across all sources
- Clicking a quote auto-switches to the right source

## UploadThing Integration

**Config:** `.mp3, .wav, .m4a, .ogg` — max 500 MB

**Upload flow:**
1. Click "Add Source Audio"
2. UploadThing picker opens
3. Progress shown inline
4. On complete: URL returned
5. Convex mutation creates source row, status "transcribing"
6. Convex action fires Deepgram with audio URL
7. Transcript stored → source status "ready"
8. All sources ready → story advances to "editing"

**Storage:** `audioUrl` string on source row. No Convex `_storage` for audio.

## Build Scope

**Included:**
- UploadThing setup and audio upload flow
- New `sources` table + Convex functions
- Schema migration (stories status union, remove singular audioFileId/transcriptId)
- Story Board kanban with four columns
- New Story dialog (title + station)
- Source management in Production Workspace (selector, upload, transcript switching)
- Seed data cleanup (two stations: 88Nine, HYFIN)
- Deepgram transcription remains stubbed

**Deferred:**
- Real Deepgram integration
- Story script editor
- Drag-and-drop between kanban columns
- Multi-source waveform sync
- Quote pulling from sources into story script
