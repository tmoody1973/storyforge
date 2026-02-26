# StoryForge MVP Scaffold Design

**Date:** 2026-02-26
**Status:** Approved
**Hackathon:** DigitalOcean Gradient AI Hackathon (deadline March 18, 2026)

## Summary

Scaffold the full StoryForge MVP as a monorepo with three workspaces: Vite + React frontend, Convex backend, and Python Gradient ADK agents. All external integrations stubbed with mock data. Auth wired with WorkOS. Running app with routing, data layer, and page shells.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Backend | Convex (v5.1 spec) | Real-time reactivity, TypeScript, WorkOS integration, file storage |
| Frontend | Vite + React | Lightweight SPA, Convex's recommended pairing |
| UI | Tailwind + shadcn/ui | Spec-aligned, fast to build |
| Routing | React Router v7 | Client-side routing for SPA |
| Auth | WorkOS AuthKit | Orgs, RBAC, user invites, first-party Convex integration |
| AI Agents | Gradient ADK + LangGraph (Python) | Required for hackathon, uses full DO Gradient stack |
| LLM | Claude Sonnet 4.5 via DO Serverless Inference | Available as `anthropic-claude-4.5-sonnet` on Gradient |
| Package manager | npm | User preference |
| API integrations | Stubs with graceful fallback | Scaffold first, wire real APIs incrementally |

## Project Structure

```
storyforge/
├── app/                          # Vite + React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/               # shadcn/ui components
│   │   │   ├── audio/            # Waveform Playlist + BBC Transcript Editor
│   │   │   ├── production/       # Production workspace
│   │   │   ├── dashboard/        # Story Board, Discovery Dashboard
│   │   │   ├── workflow/         # Approval checkpoints, status tracking
│   │   │   └── layout/           # Shell, nav, notification bell
│   │   ├── hooks/                # Custom React hooks
│   │   ├── lib/                  # Utilities, sync engine, types
│   │   ├── pages/                # Route-level components
│   │   └── main.tsx              # Entry with ConvexProviderWithAuthKit
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── convex/                       # Convex backend
│   ├── schema.ts                 # Full data model (v5.1)
│   ├── auth.ts                   # WorkOS auth helpers
│   ├── stories.ts
│   ├── transcripts.ts
│   ├── notifications.ts
│   ├── comments.ts
│   ├── actions/
│   │   ├── deepgram.ts
│   │   ├── elevenlabs.ts
│   │   ├── freesound.ts
│   │   ├── gradientAgent.ts
│   │   ├── assembly.ts
│   │   ├── exports.ts
│   │   ├── email.ts
│   │   └── slack.ts
│   ├── crons.ts
│   └── http.ts
│
├── agents/                       # Gradient ADK Python project
│   ├── .gradient/
│   │   └── agent.yml
│   ├── agents/
│   │   ├── coach.py
│   │   ├── transcript.py
│   │   ├── content.py
│   │   └── workflow.py
│   ├── tools/
│   ├── main.py
│   ├── requirements.txt
│   └── .env
│
├── docs/plans/
├── .env.example
├── .gitignore
└── README.md
```

## Convex Schema

Full v5.1 schema with all tables:

- **users** -- workosUserId, name, email, role (admin/producer/dj/contributor), stations[], styleProfileId, avatarUrl, notificationPrefs, lastActiveAt. Indexes: by_workos_id, by_email.
- **stations** -- slug, name, description, voiceGuide, systemPrompt. Index: by_slug.
- **stories** -- title, stationId, creatorId, status (workflow state enum), audioFileId, audioDurationSeconds, editedAudioFileId, transcriptId, editOperations, assemblyState, selectedAngle, themes[], emotionalTone, mustIncludeQuotes, excludeRanges, narrativeDirection, additionalContext, airBreak, podcastSegment, socialThread, webArticle, newsletterCopy, pressRelease, soundAssets[], approval timestamps (5 checkpoints), assignedProducerId, scheduledDate, publishedDate. Indexes: by_station, by_creator, by_status, by_station_status.
- **transcripts** -- storyId, rawSttJson, markdown, speakers, durationSeconds, wordTimestamps, fillerWords, storyAngles, keyQuotes, emotionalArc, corrections, offRecordRanges, searchableText. Indexes: by_story, search_text (Convex search index).
- **styleProfiles** -- userId, samples, analysis. Index: by_user.
- **comments** -- storyId, userId, type, content, scriptBlockIndex, scriptLineText, audioTimestampStart/End, originalText, editedText, status, resolvedBy/At, parentCommentId, isProducerNote, blocksProgress. Indexes: by_story, by_story_status, by_parent.
- **notifications** -- userId, type, storyId, triggeredBy, message, detail, deepLink, read, emailSent, createdAt. Indexes: by_user_unread, by_user_time.
- **narrationTakes** -- storyId, blockIndex, takeNumber, audioFileId, durationSeconds, isSelected, recordedBy. Indexes: by_story_block, by_story.
- **suggestions** -- storyId, userId, content, attachmentUrl, attachmentFileId, parentSuggestionId, upvotes[], createdAt. Indexes: by_story, by_parent.
- **storyIdeas** -- title, description, suggestedBy, station, upvotes[], status, claimedBy, createdAt. Index: by_status.
- **editHistory** -- storyId, userId, action, details, createdAt. Indexes: by_story, by_story_time.
- **soundLibrary** -- name, description, source, fileId, type, tags[], createdBy, prompt, freesoundId, license, attribution, durationSeconds. Indexes: by_type, by_tags, search_sounds.
- **orgSettings** -- slackWebhookUrl, slackChannelName, slackNotifyEvents[].

## Frontend Architecture

**Routes:**
- `/` -- Story Board (org dashboard)
- `/story/new` -- Upload audio, create story
- `/story/:id` -- Production Workspace
- `/story/:id/review` -- Producer review mode
- `/settings` -- User/org settings
- `/login` -- WorkOS AuthKit sign-in

**Key components:**
- ProductionWorkspace (3-panel: waveform, transcript, coach/steering)
- StoryBoard (Kanban by status, real-time via Convex)
- TranscriptAudioSync (bidirectional text-audio bridge)
- SoundPalette (ElevenLabs + Freesound)
- NarrationRecorder (browser recording, teleprompter, multi-take)
- NotificationBell (real-time, Sonner toasts)

**State:** Convex useQuery/useMutation for server state. React useState for local UI state.

## Agent Architecture

Single Gradient ADK project with router agent dispatching to four specialists:

1. **CoachAgent** -- storytelling mentor, RAG from station-knowledge KB
2. **TranscriptAgent** -- story angles, quotes, emotional arc, filler words
3. **ContentAgent** -- 6-format generator, station voice, DJ style
4. **WorkflowAgent** -- routing, overlap detection, notification triggers

Communication: Frontend -> Convex action -> HTTP POST to ADK endpoint -> agent processes -> returns JSON -> Convex writes to DB -> frontend auto-updates.

Model: `anthropic-claude-4.5-sonnet` via DO Serverless Inference.

Knowledge Bases: station-knowledge, story-archive, personal-style.

## External Integrations

All via Convex actions with stub fallbacks:

| Service | Action File | Env Var | Stub |
|---|---|---|---|
| Deepgram | deepgram.ts | DEEPGRAM_API_KEY | Sample transcript JSON |
| ElevenLabs | elevenlabs.ts | ELEVENLABS_API_KEY | Placeholder file ID |
| Freesound | freesound.ts | FREESOUND_API_KEY | Mock search results |
| Gradient ADK | gradientAgent.ts | GRADIENT_AGENT_URL | Mock agent responses |
| Resend | email.ts | RESEND_API_KEY | Console log |
| Slack | slack.ts | SLACK_WEBHOOK_URL | Console log |
| WorkOS | @convex-dev/workos | WORKOS_CLIENT_ID, WORKOS_API_KEY | Requires real keys |

## Scaffold Scope

**Included:**
- Git repo initialized
- Vite + React + Tailwind + shadcn/ui with routing
- Convex project with full schema
- WorkOS auth (ConvexProviderWithAuthKit, protected routes, login)
- All Convex action stubs
- Page shells: Dashboard, New Story, Production Workspace, Settings
- Gradient ADK skeleton with 4 agent stubs + router
- .env.example, README

**Excluded (subsequent sessions):**
- Working Waveform Playlist + BBC Transcript Editor integration
- TranscriptAudioSync engine
- Real agent logic (LLM calls, RAG)
- Sound Palette, Narration Recorder, Auto-Assembly
- Export functionality
- Notification system (email/Slack)
- Knowledge Base content
