# Gradient ADK Agents + Transcript Export Design

## Goal

Implement all four Gradient ADK agents (transcript analysis, coaching, content generation, workflow) with real LLM calls, wire them to the Convex backend, add transcript markdown export, and auto-trigger analysis after transcription.

## Architecture

Two layers:
1. **Convex actions** call the deployed Gradient agent router via HTTP POST to `GRADIENT_AGENT_URL`. When no URL is set, stubs return mock data for dev.
2. **Python agents** (deployed on DigitalOcean via Gradient ADK) use Claude Sonnet via Gradient SDK for LLM calls and Gradient Knowledge Bases for RAG. Falls back to Anthropic API directly if Gradient SDK unavailable.

## Data Flow

1. Deepgram transcription completes → source status "ready" → auto-schedule transcript agent
2. Transcript agent analyzes → saves story angles, key quotes, emotional arc to transcript doc
3. CoachPanel UI reactively displays analysis data
4. User sends chat message → coach agent called with transcript context → response displayed
5. User clicks "Generate Content" → content agent called with transcript + steering → 6 formats saved to story
6. User clicks "Export Transcript" → client-side markdown file download

## Transcript Export (Client-Side)

Generate downloadable `.md` file with:
```markdown
# Interview Transcript: [Source Title]
Duration: 5:32 | Speakers: Tarik Moody, Mayor Johnson

---

**Tarik Moody** (0:00)
Question text here...

**Mayor Johnson** (0:14)
Response text here...
```

No server call needed — `Blob` + `URL.createObjectURL` + click-to-download.

## Agent Trigger Points

| Agent | Trigger | Input | Output Stored On |
|-------|---------|-------|-----------------|
| transcript | Auto after Deepgram completes | transcript text, word timestamps | transcript doc (storyAngles, keyQuotes, emotionalArc) |
| coach | User sends chat message | query, transcript context, production state | returned to UI (not persisted) |
| content | User clicks "Generate Content" | transcript, steering controls, station voice | story doc (airBreak, podcastSegment, etc.) |
| workflow | Story status change | event, story state, org stories | returned to UI |

## Python Agent Implementation

All agents use `gradient.AsyncGradient` for LLM calls:
```python
client = AsyncGradient()
response = await client.chat.completions.create(
    model="anthropic-claude-4.5-sonnet",
    messages=[...],
)
```

Fallback: If Gradient SDK fails, use `anthropic` package directly with `ANTHROPIC_API_KEY`.

## Files to Modify

### Convex (app/)
- `convex/actions/gradientAgent.ts` — Real HTTP call to deployed agent
- `convex/transcripts.ts` — Schedule transcript analysis after Deepgram insert
- `convex/stories.ts` — Add mutation for saving generated content
- `src/components/production/TranscriptPanel.tsx` — Export button
- `src/lib/exportTranscript.ts` — NEW: Export logic
- `src/components/production/CoachChat.tsx` — Wire to coach agent
- `src/components/production/CoachPanel.tsx` — Wire content generation

### Python (agents/)
- `agents/transcript.py` — Real Claude analysis call
- `agents/coach.py` — Real Claude coaching with RAG fallback
- `agents/content.py` — Real Claude content generation
- `agents/workflow.py` — Real Claude workflow analysis
- `requirements.txt` — Add anthropic as fallback
