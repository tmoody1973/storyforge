# StoryForge

AI-Powered Radio Storytelling Studio — Turn Every DJ Into a Producer.

Built for the [DigitalOcean Gradient AI Hackathon](https://digitalocean.devpost.com/).

## What Is StoryForge?

StoryForge helps public radio stations turn raw interviews into broadcast-ready, multi-platform content. A DJ uploads an interview recording and gets:

- **Text-based audio editing** — edit text, edit audio (Descript-style)
- **AI storytelling coach** — craft guidance from This American Life, Radiolab, and NPR
- **6 content formats** — air break, podcast, social, web, newsletter, press release
- **Station voice switching** — same story, different brand voices
- **Editorial workflow** — 5 approval checkpoints with producer review

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Vite, Tailwind CSS, shadcn/ui |
| Backend | Convex (real-time reactive database) |
| Auth | WorkOS AuthKit (orgs, RBAC, SSO-ready) |
| AI Agents | DigitalOcean Gradient ADK, LangGraph |
| LLM | Claude Sonnet 4.5 via DO Serverless Inference |
| STT | Deepgram Nova-2 (word-level timestamps) |
| Sound Design | ElevenLabs SFX/Music API, Freesound API |
| Audio Editor | Waveform Playlist v7, BBC React Transcript Editor |

## Project Structure

```
storyforge/
├── app/           # Vite + React frontend + Convex backend
│   ├── src/       # React components, pages, hooks
│   └── convex/    # Convex schema, queries, mutations, actions
├── agents/        # Python Gradient ADK agents
│   └── agents/    # CoachAgent, TranscriptAgent, ContentAgent, WorkflowAgent
└── docs/          # Design documents and plans
```

## Setup

### Prerequisites

- Node.js 18+
- Python 3.10+
- Convex account (free)
- WorkOS account (free to 1M users)

### Frontend + Backend

```bash
cd app
npm install
cp .env.local.example .env.local
# Fill in VITE_CONVEX_URL and VITE_WORKOS_CLIENT_ID

npx convex dev    # Start Convex dev server
npm run dev       # Start Vite dev server
```

### AI Agents

```bash
cd agents
pip install -r requirements.txt
cp .env.example .env
# Fill in GRADIENT_MODEL_ACCESS_KEY and DIGITALOCEAN_API_TOKEN

gradient agent run  # Run via Gradient ADK
```

## License

MIT
