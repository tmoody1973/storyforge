# StoryForge

> AI-Powered Radio Storytelling Studio — Turn Every DJ Into a Producer.

Built for [Radio Milwaukee](https://radiomilwaukee.org) (88Nine, HYFIN, 414 Music, Rhythm Lab Radio).
Submitted to the [DigitalOcean Gradient AI Hackathon](https://digitalocean.devpost.com/).

## What Is StoryForge?

StoryForge helps public radio stations turn raw interviews into broadcast-ready, multi-platform content. Upload an interview recording and get:

- **Descript-style text editing** — edit the transcript text, edit the audio
- **Word-level transcription** — Deepgram Nova-2 with speaker diarization
- **AI storytelling coach** — craft guidance drawn from This American Life, Radiolab, and NPR
- **6 content formats** — air break, podcast segment, social thread, web article, newsletter, press release
- **Station voice switching** — same story, different brand voices
- **5-checkpoint editorial workflow** — transcript → tape → assembly → scripts → producer approval

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Tailwind CSS v4, shadcn/ui |
| Backend | Convex (real-time reactive database, file storage) |
| Auth | Clerk (orgs, RBAC) |
| AI Agents | DigitalOcean Gradient ADK, LangGraph, LangChain |
| LLM | Claude Sonnet 4.5 via Gradient Serverless Inference |
| Speech-to-Text | Deepgram Nova-2 (word-level timestamps) |
| Sound Design | ElevenLabs SFX/Music API, Freesound API |
| Audio | wavesurfer.js v7 |
| File Upload | UploadThing |

## Features

### Production Workspace
The core editing interface combines a waveform player, live transcript panel, and script editor in a single view.

- **Script Editor** — Descript-style block editor with word-level playback highlighting, filler word detection, insert/delete/reorder blocks, voiceover recording, and multi-format export
- **Transcript Panel** — Real-time speaker-labeled transcript with inline renaming, Edit Speakers modal, timestamp seek, and markdown export
- **Coach Panel** — AI coaching chat with steering controls (story angle, emotional tone, narrative direction), analysis cards for story angles/key quotes/emotional arc
- **Waveform Player** — Play/pause/stop, volume control, time display via wavesurfer.js
- **Source Manager** — Upload audio files, track transcription status, retry failed jobs

### Dashboard
Kanban-style story board with four workflow columns (Draft, Transcribing, Editing, Published) and station filtering.

### AI Agents

| Agent | Role |
|-------|------|
| **CoachAgent** | Storytelling mentor — RAG from station knowledge base, TAL/Radiolab/NPR techniques |
| **TranscriptAgent** | Audio intelligence — story angles with confidence scores, key quotes with timestamps, emotional arc mapping |
| **ContentAgent** | 6-format generator — air break, podcast, social, web, newsletter, press release with station voice |
| **WorkflowAgent** | Production manager — status routing, next-action suggestions, topic overlap detection, scheduling conflict flags |

### Data Model
14 Convex tables covering users, stations, stories, transcripts, sources, style profiles, comments, notifications, narration takes, suggestions, story ideas, edit history, sound library, and org settings.

## Project Structure

```
storyforge/
├── app/                    # Vite + React frontend + Convex backend
│   ├── src/
│   │   ├── components/
│   │   │   ├── production/ # Script editor, transcript, coach, waveform, sources
│   │   │   ├── dashboard/  # Story cards, new story dialog
│   │   │   ├── layout/     # App shell
│   │   │   └── ui/         # shadcn/ui primitives
│   │   ├── pages/          # Dashboard, Production, Login, Review, Settings
│   │   └── lib/            # Transcript parsing, export utilities
│   ├── convex/             # Schema, queries, mutations, actions
│   └── server/             # Express upload server
├── agents/                 # Python Gradient ADK agents
│   ├── agents/             # CoachAgent, TranscriptAgent, ContentAgent, WorkflowAgent
│   ├── tools/              # Agent tool definitions
│   └── main.py             # Agent entry point
├── docs/                   # Design documents
└── background-docs/        # Reference materials
```

## Setup

### Prerequisites

- Node.js 18+
- Python 3.10+
- Convex account ([convex.dev](https://convex.dev))

### Frontend + Backend

```bash
cd app
npm install
cp .env.local.example .env.local
# Fill in VITE_CONVEX_URL, VITE_WORKOS_CLIENT_ID, DEEPGRAM_API_KEY
npx convex dev    # Start Convex dev server
npm run dev       # Start Vite dev server (http://localhost:5173)
```

### AI Agents

```bash
cd agents
pip install -r requirements.txt
cp .env.example .env
# Fill in GRADIENT_MODEL_ACCESS_KEY, DIGITALOCEAN_API_TOKEN
gradient agent run
```

### Available Scripts

| Script | Command |
|--------|---------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | TypeScript check + production build |
| `npm run lint` | ESLint |
| `npm run dev:upload` | Start Express upload server |
| `npm run preview` | Preview production build |

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_CONVEX_URL` | Convex deployment URL | Yes |
| `VITE_WORKOS_CLIENT_ID` | WorkOS client ID for auth | Yes |
| `DEEPGRAM_API_KEY` | Deepgram Nova-2 for transcription | Yes |
| `GRADIENT_MODEL_ACCESS_KEY` | DO Gradient AI model access | For agents |
| `DIGITALOCEAN_API_TOKEN` | DO API token | For agents |
| `ELEVENLABS_API_KEY` | Sound effects / music generation | No |
| `FREESOUND_API_KEY` | Freesound audio library | No |
| `RESEND_API_KEY` | Email notifications | No |
| `SLACK_WEBHOOK_URL` | Slack notifications | No |

## License

MIT
