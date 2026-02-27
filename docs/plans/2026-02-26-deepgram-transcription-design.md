# Deepgram Nova-3 Transcription Integration Design

## Goal

Automatically transcribe uploaded audio sources using Deepgram Nova-3, with speaker diarization, filler word detection, and user-editable speaker names.

## Architecture

When a source is created after upload, a Convex scheduled action calls Deepgram's pre-recorded API (`POST https://api.deepgram.com/v1/listen`) with the UploadThing URL. The response is parsed into our transcript format and stored. Source status updates reactively flow to the UI via Convex subscriptions.

## Deepgram API Details

- **Endpoint:** `POST https://api.deepgram.com/v1/listen`
- **Auth:** `Authorization: Token <DEEPGRAM_API_KEY>`
- **Model:** `nova-3` (54% lower WER than competitors, $0.0077/min)
- **Body:** `{ "url": "<uploadthing-url>" }`
- **Query params:** `model=nova-3&diarize=true&punctuate=true&paragraphs=true&smart_format=true&filler_words=true&utterances=true`
- **Keyterm prompting:** Pass speaker names and custom terms via `keyterm[]` params for improved accuracy on proper nouns

## Data Flow

1. User uploads audio → UploadThing returns URL
2. `sources.create` mutation inserts source (status=`"transcribing"`), schedules `deepgram.transcribe` action
3. Action sends URL to Deepgram Nova-3 with diarize + filler_words + paragraphs
4. Action parses response:
   - Builds markdown with `**Speaker 0:**` paragraph labels
   - Extracts word-level timestamps with speaker IDs and confidence
   - Extracts filler words (uh, um, mhmm, etc.)
   - Computes searchable plain text
   - Gets duration from `metadata.duration`
5. Action calls internal mutation to insert transcript and update source status to `"ready"`
6. If all sources for a story are `"ready"`, story auto-advances to `"editing"`
7. On failure: source status → `"failed"`, error logged

## Multi-Source Support

Each source gets its own independent Deepgram call and transcript. Upload 3 interviews → 3 parallel transcriptions → 3 transcripts. SourcePanel selector determines which transcript displays in TranscriptPanel.

## Speaker Identification

- Deepgram assigns `Speaker 0`, `Speaker 1`, etc. via diarization
- Users can pre-fill `speakerName` on source creation (passed as keyterm for accuracy)
- After transcription, users click speaker labels in TranscriptPanel to rename them
- Rename updates `speakers` array in transcript doc (no re-transcription)
- Speaker colors auto-assigned for visual distinction

## Error Handling

- **No API key:** Returns mock transcript data (existing stub behavior preserved)
- **Deepgram error:** Source status → `"failed"`, user can retry via button
- **Retry:** Resets source to `"transcribing"`, re-schedules Deepgram action
- **Convex 10-min action timeout:** Sufficient for interviews under ~2 hours
- **Large files:** UploadThing caps at 512MB, Deepgram supports up to 2GB

## Response Parsing

Deepgram's paragraphs response groups words by speaker:
```json
{
  "paragraphs": [{
    "speaker": 0,
    "sentences": [{ "text": "...", "start": 0.0, "end": 1.2 }]
  }]
}
```

We convert this to our markdown format:
```
**Speaker 0:**
Sentence text here.

**Speaker 1:**
Response text here.
```

Word timestamps from `results.channels[0].alternatives[0].words`:
```json
{ "word": "hello", "start": 0.0, "end": 0.5, "confidence": 0.98, "speaker": 0 }
```

## Files to Modify

- `convex/actions/deepgram.ts` — Real Deepgram API call + response parsing
- `convex/sources.ts` — Schedule transcription in `create` mutation
- `convex/transcripts.ts` — Add internal mutation for creating transcripts
- `src/components/production/SourcePanel.tsx` — Add retry button for failed sources
- `src/components/production/TranscriptPanel.tsx` — Speaker rename UI
- `src/pages/ProductionPage.tsx` — Load transcript per selected source (not per story)

## References

- [Deepgram Pre-Recorded API](https://developers.deepgram.com/reference/speech-to-text/listen-pre-recorded)
- [Deepgram Diarization](https://developers.deepgram.com/docs/diarization)
- [Deepgram Filler Words](https://developers.deepgram.com/docs/filler-words)
- [Nova-3 Announcement](https://deepgram.com/learn/introducing-nova-3-speech-to-text-api)
