# StoryForge
## AI-Powered Radio Storytelling Studio
### "Turn Every DJ Into a Producer"

**DigitalOcean Gradient AI Hackathon**
**Version 5.0 — Multi-Agent Platform with Professional Radio Production Interface**

---

## THE CRISIS OPENS THE DOOR

On January 5, 2026, the Corporation for Public Broadcasting was dissolved. $1.1 billion in federal funding—gone. 1,500+ public radio and TV stations are scrambling. Wisconsin Public Radio laid off 15 people. New Jersey PBS is closing this summer. 245 rural stations may not survive the year.

Radio Milwaukee operates four brands—88Nine, HYFIN, 414 Music, Rhythm Lab Radio—with a team that was already stretched thin. Now, every public media organization in America faces the same question: **How do you tell more stories with fewer people?**

StoryForge is the answer.

---

## TABLE OF CONTENTS

1. The Problem
2. The Solution — Multi-Agent Storytelling Studio
3. The Crisis Multiplier — Why Now, Why This
4. The Production Interface — Edit Text, Edit Audio
5. Multi-Agent Architecture — Gradient ADK Design
6. Agent Deep Dive — Four Agents, One Pipeline
7. Knowledge Base Architecture — DigitalOcean RAG
8. Core Workflow — The Complete Production Pipeline
9. Feature Specification
10. Technical Architecture — Gradient ADK + LangGraph + Production UI
11. Data Model
12. Hackathon MVP Scope
13. Demo Script — 3-Minute Presentation
14. Prize Category Alignment
15. Competitive Analysis
16. Impact Metrics & Scalability

---

## 1. THE PROBLEM

### We Want to Tell More Stories. We Can't Afford More Producers.

Radio Milwaukee operates four distinct brands—88Nine Radio Milwaukee, HYFIN, 414 Music, and Rhythm Lab Radio. We have incredible access to Milwaukee's creative community. Our DJs conduct compelling interviews every week. But turning those conversations into polished, multi-platform stories? That's producer work.

**The skills gap is real:**

**Finding the story.** A 45-minute interview contains 8,000+ words. Producers know how to spot the narrative arc, the emotional turn, the moment that makes listeners lean in. DJs often don't know where to start.

**Structuring for radio.** There's a craft to building a 90-second air break vs. a 12-minute podcast segment. How much tape? Where does narration go? What's the hook? Producers learned this over years. DJs haven't.

**Writing in broadcast voice.** Radio scripts aren't essays. They're conversational, rhythmic, designed for the ear. Without guidance, DJs write for the page, not the speaker.

**Multi-platform adaptation.** The same story needs to be an air break, a podcast, a social thread, a web article, a newsletter blurb. Producers juggle these instinctively. DJs get overwhelmed.

**Editing audio.** Even when a DJ knows which moments matter, cutting tape in traditional audio software (Hindenburg, Audacity, Adobe Audition) requires a separate technical skill. The gap between "I know what I want" and "I can make it" stops most DJs cold.

**Quality control.** How do you know if your script is good enough? Without a producer reviewing, DJs second-guess themselves—or worse, ship subpar work.

**The result:** Great interviews sit unused. Stories don't get told. Or DJs spend 8+ hours on work a producer could do in 2—and the output still isn't polished. Even when they create one piece of content, they don't have time to adapt it for social, web, and newsletter.

**The cost gap:** Hiring 2-3 producers to cover four stations would cost $150,000+ annually. We don't have that budget. Neither do most public media organizations—especially now.

---

## 2. THE SOLUTION: STORYFORGE

StoryForge is a multi-agent AI storytelling studio deployed on DigitalOcean Gradient AI Platform that gives every DJ and host the skills of an experienced producer—including a professional-grade production interface built with open-source tools from the BBC and the Web Audio community.

**The core promise:** A DJ with no production experience goes from a raw interview recording to broadcast-ready audio AND written content for ALL platforms in under one hour, with AI coaching at every step.

### What Makes StoryForge Different From Every Other AI Tool

**Edit text. Edit audio.** StoryForge brings Descript-style text-based audio editing to public radio. Delete a sentence from the transcript—the audio cuts automatically. Rearrange paragraphs—the audio reorders. Select a passage—hear it instantly. No timeline scrubbing. No waveform surgery. Just words on a screen that a DJ already knows how to edit.

**AI coaching, not just AI generation.** StoryForge doesn't just produce content—it teaches storytelling craft. A built-in CoachAgent trained on This American Life, Radiolab, and Radio Milwaukee's best work explains WHY good stories work, guiding DJs through narrative structure, tape selection, and script writing at every step.

**One interview → six formats → every platform.** Upload once. Get back an air break script, podcast segment, social thread, web article, newsletter copy, and press release—each adapted for the specific platform, in the DJ's personal writing voice, following the station's editorial guidelines.

**Human in the loop at every stage.** Five explicit approval checkpoints ensure the DJ maintains creative control and the producer can review before anything goes to air.

### Four Agents, One Pipeline

| Agent | Role | What It Does |
|-------|------|-------------|
| **CoachAgent** | Storytelling Mentor | Teaches craft, suggests structure, explains WHY good stories work. Trained on This American Life, Radiolab, and Radio Milwaukee best practices. |
| **TranscriptAgent** | Audio Intelligence | Processes audio, generates word-level transcripts, identifies speakers, discovers story angles, maps emotional arcs, highlights key quotes. |
| **ContentAgent** | Multi-Format Creator | Generates 6 content pieces from one interview—air break, podcast, social, web, newsletter, press release—in the DJ's personal voice following station guidelines. |
| **WorkflowAgent** | Production Manager | Routes stories through review/approval, manages notifications, tracks deadlines, coordinates across four stations, prevents duplicate coverage. |

---

## 3. THE CRISIS MULTIPLIER — WHY NOW, WHY THIS

This isn't just a productivity tool. It's a survival tool for local journalism.

**Before CPB dissolution (pre-January 2026):**
StoryForge solves a $150K staffing gap at Radio Milwaukee. Useful. Good ROI.

**After CPB dissolution (now):**
StoryForge is how a 3-person team tells the stories their community needs when the 10-person team they used to have no longer exists. It's the difference between local journalism surviving or going dark in hundreds of communities.

**The math is stark:**
- 1,500+ public media stations affected
- Average station has 2-3 producers
- 30-40% of stations considering staff cuts
- A tool that gives every remaining team member producer-level output doesn't just save money—it saves journalism

**StoryForge can even tell stories about the crisis itself.** The CoachAgent's knowledge base includes context about the CPB defunding. A DJ interviewing a community member about how they'll miss their local station can use StoryForge to turn that conversation into a multi-platform story about what's being lost. Meta-storytelling: a tool built to survive the crisis, telling stories about the crisis.

---

## 4. THE PRODUCTION INTERFACE — EDIT TEXT, EDIT AUDIO

### The Descript Insight, Built With Open Source

Descript proved that the fastest way to edit audio is to edit text. StoryForge brings this paradigm to public radio production using two proven open-source libraries:

**Waveform Playlist** (naomiaro, v7) — A multi-track Web Audio editor built with React and Tone.js. Canvas waveform visualization, drag-and-drop clip editing, fades, effects, WAV export, and time-synced text annotations with keyboard navigation. 1,500+ GitHub stars. Actively maintained. The annotation system was literally built for transcript-based editing.

**BBC React Transcript Editor** (BBC News Labs) — A React component for correcting automated transcriptions, built for professional newsroom workflows. Click-to-seek audio sync, inline text editing, speaker label management, multiple STT format support, export adapters. Built by the same BBC team that produces some of the world's best audio journalism.

### How Text-Based Audio Editing Works

The key insight: Deepgram Nova-2 returns word-level timestamps. Every single word in the transcript maps to exact start and end milliseconds in the audio file.

```
"I watched my neighbors leave one by one."

word: "I"         start: 14.320s  end: 14.380s
word: "watched"   start: 14.410s  end: 14.720s
word: "my"        start: 14.750s  end: 14.880s
word: "neighbors" start: 14.920s  end: 15.340s
word: "leave"     start: 15.380s  end: 15.620s
word: "one"       start: 15.660s  end: 15.780s
word: "by"        start: 15.820s  end: 15.930s
word: "one"       start: 15.970s  end: 16.180s
```

This timestamp data is the bridge between text editing and audio editing. When the DJ interacts with the transcript, StoryForge translates every text operation into audio operations:

**Delete text → Audio cuts automatically.**
DJ selects "one by one" and presses delete. StoryForge calculates the time range (15.660s → 16.180s), removes that audio segment from the waveform, and inserts a 50ms crossfade at the edit point so the cut doesn't pop. The DJ never touches a waveform. They just edited text.

**Rearrange text → Audio reorders.**
DJ selects a paragraph and drags it above another paragraph. StoryForge recalculates the audio sequence—the corresponding audio segments swap positions on the waveform timeline. The DJ just restructured their story by moving paragraphs, like editing a Google Doc.

**Select text → Hear it instantly.**
DJ highlights a sentence. The waveform playlist seeks to that position and plays just that segment. No scrubbing, no guessing, no "where was that moment?" Just click the words.

**Mark text as off-record → Audio is excluded.**
DJ selects a passage and marks it "off-record." The audio segment grays out in the waveform view and is excluded from all AI analysis and content generation. The words remain visible in the transcript (struck through) for context, but the audio is locked.

### The Production Workspace Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  STORYFORGE PRODUCTION WORKSPACE                                │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  WAVEFORM VIEW (Waveform Playlist v7)                     │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ ▶ ■ ⏪ ⏩         00:14:32 / 00:45:12              │  │  │
│  │  │ Interview  ▓▓▓▓▓▓▓▓▓▓▓▓▓░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  │  │
│  │  │ Edit       ▓▓▓▓▓▓▓▓▓▓▓▓▓  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  │  │
│  │  │ Music Bed  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  │  │
│  │  │  ▼ annotations ────────────────────────────────     │  │  │
│  │  │  [gentrification quote]  [hope moment]  [data]     │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─────────────────────────────────┬─────────────────────────┐  │
│  │  TRANSCRIPT EDITOR              │  COACH + STEERING       │  │
│  │  (BBC React Transcript Editor)  │                         │  │
│  │                                 │  🤖 CoachAgent          │  │
│  │  [Marcus Washington]            │  "I see 4 story angles  │  │
│  │  I watched my neighbors leave   │  here. The strongest    │  │
│  │  one by one. First the ██family │  is gentrification—at   │  │
│  │  on the corner, then the couple │  14:32 Marcus describes │  │
│  │  who ran the corner store for   │  watching neighbors     │  │
│  │  thirty years. ~~[OFF RECORD]~~ │  leave. That's your     │  │
│  │  ~~They told me the landlord~~  │  emotional anchor."     │  │
│  │  ~~wanted triple the rent.~~    │                         │  │
│  │                                 │  ─────────────────────  │  │
│  │  [DJ Tarik]                     │  📐 Steering Panel     │  │
│  │  What does that feel like,      │  Angle: [Gentrification]│  │
│  │  watching your block change?    │  Tone:  ◆───○ Elegiac  │  │
│  │                                 │  Tags:  #CommunityLoss │  │
│  │  [Marcus Washington]            │  Must-include: [2 clips]│  │
│  │  ███ It's like grieving someone │                         │  │
│  │  who's still alive. The street  │  ─────────────────────  │  │
│  │  is there but the soul left. ███│  📋 Approval Status    │  │
│  │                                 │  ☑ Transcript corrected │  │
│  │  ▓ = AI-highlighted quote       │  ☑ Tape selected       │  │
│  │  ███ = DJ must-include          │  ☐ Assembly previewed   │  │
│  │  ~~strikethrough~~ = off-record │  ☐ Scripts approved     │  │
│  │                                 │  ☐ Producer sign-off    │  │
│  └─────────────────────────────────┴─────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  GENERATED CONTENT TABS                                    │  │
│  │  [Air Break] [Podcast] [Social] [Web] [Newsletter] [PR]  │  │
│  │                                                            │  │
│  │  AIR BREAK SCRIPT (88Nine Voice) — 87 seconds             │  │
│  │                                                            │  │
│  │  NARRATION: On a quiet block in Riverwest, Marcus         │  │
│  │  Washington has been counting absences.                    │  │
│  │                                                            │  │
│  │  ▶ TAPE [14:32-14:58] "I watched my neighbors leave      │  │
│  │    one by one..."                                          │  │
│  │    [click to preview in waveform]                          │  │
│  │                                                            │  │
│  │  NARRATION: Census data tells one version of the story—   │  │
│  │  Riverwest was 60% Black in 1990, now 18%. Marcus tells   │  │
│  │  the version that numbers can't capture.                   │  │
│  │                                                            │  │
│  │  ▶ TAPE [28:45-29:12] "It's like grieving someone who's  │  │
│  │    still alive..."                                         │  │
│  │    [click to preview in waveform]                          │  │
│  │                                                            │  │
│  │  🎵 Music bed suggestion: Contemplative ambient,          │  │
│  │     fade under tape, swell on final line                   │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Text-to-Audio Sync Engine — Technical Bridge

The sync engine is the core technical innovation that connects the BBC Transcript Editor to the Waveform Playlist. It maintains a bidirectional binding between text and audio:

```
BBC Transcript Editor                    Waveform Playlist
(text domain)                            (audio domain)
                                         
┌──────────────┐    Sync Engine     ┌──────────────┐
│ Word-level   │◄──────────────────►│ Clip-level   │
│ DraftJS      │    timestamp       │ Waveform     │
│ content      │    mapping         │ timeline     │
│ model        │                    │ model        │
└──────┬───────┘                    └──────┬───────┘
       │                                   │
  onChange:                           onSeek:
  - delete text → remove audio       - click waveform →
  - move text → reorder audio          highlight text
  - select text → seek audio         - select region →
  - mark off-record → gray audio       select text
```

**Implementation approach:**

```typescript
// SyncEngine: bridges transcript edits to audio operations
class TranscriptAudioSync {
  
  // Word-level timestamp index from Deepgram
  private wordTimestamps: WordTimestamp[];
  
  // When DJ deletes text in transcript editor
  onTranscriptDelete(deletedWords: WordTimestamp[]) {
    const audioRange = {
      start: deletedWords[0].start,
      end: deletedWords[deletedWords.length - 1].end
    };
    
    // Split clip at edit boundaries
    this.waveformPlaylist.splitClipAt(audioRange.start);
    this.waveformPlaylist.splitClipAt(audioRange.end);
    
    // Remove the segment
    this.waveformPlaylist.removeClipInRange(audioRange);
    
    // Add crossfade at edit point (50ms default)
    this.waveformPlaylist.addCrossfade(audioRange.start, 0.05);
  }
  
  // When DJ rearranges paragraphs in transcript editor
  onTranscriptReorder(movedSegment: WordTimestamp[], newPosition: number) {
    const audioRange = {
      start: movedSegment[0].start,
      end: movedSegment[movedSegment.length - 1].end
    };
    
    // Extract audio clip
    const clip = this.waveformPlaylist.extractClip(audioRange);
    
    // Insert at new timeline position (calculated from word timestamps)
    const insertTime = this.wordTimestamps[newPosition].start;
    this.waveformPlaylist.insertClip(clip, insertTime);
    
    // Add crossfades at both edit points
    this.waveformPlaylist.addCrossfade(audioRange.start, 0.05);
    this.waveformPlaylist.addCrossfade(insertTime, 0.05);
  }
  
  // When DJ clicks/selects text in transcript editor
  onTranscriptSelect(selectedWords: WordTimestamp[]) {
    const start = selectedWords[0].start;
    const end = selectedWords[selectedWords.length - 1].end;
    
    // Seek waveform to selection and highlight region
    this.waveformPlaylist.seekTo(start);
    this.waveformPlaylist.setSelection(start, end);
  }
  
  // When DJ clicks waveform position
  onWaveformSeek(timeSeconds: number) {
    // Find nearest word and highlight in transcript
    const word = this.findNearestWord(timeSeconds);
    this.transcriptEditor.scrollToWord(word);
    this.transcriptEditor.highlightWord(word);
  }
  
  // When DJ marks text as off-record
  onMarkOffRecord(selectedWords: WordTimestamp[]) {
    const audioRange = {
      start: selectedWords[0].start,
      end: selectedWords[selectedWords.length - 1].end
    };
    
    // Gray out audio region (don't delete — just mark)
    this.waveformPlaylist.muteRegion(audioRange);
    this.waveformPlaylist.setRegionColor(audioRange, '#666');
    
    // Add to exclude list for AI agents
    this.storyState.excludeRanges.push(audioRange);
  }
}
```

**What's achievable for the hackathon vs. what Descript spent years building:**

| Feature | Descript (years of R&D) | StoryForge Hackathon MVP | Post-Hackathon |
|---------|:-:|:-:|:-:|
| Delete text → cut audio | ✅ | ✅ (word-level timestamps make this straightforward) | ✅ |
| Rearrange text → reorder audio | ✅ | ✅ (paragraph-level reordering) | Word-level |
| Click text → seek audio | ✅ | ✅ (BBC editor does this natively) | ✅ |
| Select text → hear selection | ✅ | ✅ | ✅ |
| Crossfades at edit points | ✅ Auto-tuned | ✅ Fixed 50ms default | Adaptive |
| Filler word removal ("um", "uh") | ✅ Auto-detect | ☐ Manual only | AI-assisted |
| Overdub (regenerate audio from text) | ✅ | ☐ Not in scope | Future w/ TTS |
| Multi-speaker handling | ✅ | ✅ (Deepgram diarization) | ✅ |
| Undo/redo across both editors | ✅ | ⚠️ Basic (transcript undo only) | Full sync |
| Export edited audio as WAV | ✅ | ✅ (Waveform Playlist native) | ✅ |

The 80% of Descript's value comes from delete-text-to-cut-audio and click-to-seek. Both are straightforward with word-level timestamps. The remaining 20% (overdub, auto-filler-removal, AI-tuned crossfades) are polish that comes later.

---

## 5. MULTI-AGENT ARCHITECTURE — GRADIENT ADK DESIGN

### Why Multi-Agent Instead of Monolithic

Each agent has a clear responsibility, its own knowledge context, and can be independently tested and evaluated via Gradient ADK's built-in evaluation framework.

```
┌─────────────────────────────────────────────────────┐
│                STORYFORGE ORCHESTRATOR               │
│              (LangGraph StateGraph)                  │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ COACH    │  │TRANSCRIPT│  │ CONTENT  │          │
│  │ AGENT    │  │ AGENT    │  │ AGENT    │          │
│  │          │  │          │  │          │          │
│  │ Craft    │  │ Audio    │  │ Multi-   │          │
│  │ Guidance │  │ Analysis │  │ Format   │          │
│  │ RAG      │  │ Stories  │  │ Generate │          │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘          │
│       │              │              │                │
│       └──────────┬───┘──────────────┘                │
│                  │                                   │
│           ┌──────┴──────┐                            │
│           │  WORKFLOW   │                            │
│           │  AGENT      │                            │
│           │  Review     │                            │
│           │  Route      │                            │
│           │  Notify     │                            │
│           └─────────────┘                            │
│                                                      │
│  ┌───────────────────────────────────────────────┐  │
│  │  PRODUCTION INTERFACE (Frontend)              │  │
│  │  ┌────────────────┐  ┌─────────────────────┐ │  │
│  │  │ BBC Transcript │◄►│ Waveform Playlist   │ │  │
│  │  │ Editor         │  │ (naomiaro v7)       │ │  │
│  │  └────────────────┘  └─────────────────────┘ │  │
│  │         ▲  TranscriptAudioSync Engine  ▲      │  │
│  │         └──────────────┬───────────────┘      │  │
│  └────────────────────────┼──────────────────────┘  │
│                           │                          │
│  ┌────────────────────────┼──────────────────────┐  │
│  │     DO KNOWLEDGE BASES (RAG)                  │  │
│  │  ┌───────────┐ ┌──────────┐ ┌────────┐       │  │
│  │  │Station    │ │Story     │ │Personal│       │  │
│  │  │Knowledge  │ │Archive   │ │Style   │       │  │
│  │  └───────────┘ └──────────┘ └────────┘       │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Gradient ADK Integration Points

**Agent Deployment:** Each agent deployed as a Gradient ADK agent with `@entrypoint` decorator, enabling independent scaling, logging, and evaluation.

**Knowledge Bases:** DigitalOcean's managed Knowledge Bases provide RAG with automatic chunking, embedding, and retrieval—no manual vector DB management.

**Model Flexibility:** ADK supports any LLM provider. StoryForge uses Claude Sonnet 4.5 for content generation (superior creative writing) and DigitalOcean's serverless inference for utility tasks.

**Tracing & Evaluation:** Built-in ADK tracing captures every agent interaction. Evaluation metrics measure coaching quality, content accuracy, and style matching.

**Guardrails:** DigitalOcean guardrails scan for sensitive content—critical when processing interviews that may contain off-record information.

---

## 6. AGENT DEEP DIVE

### 6.1 CoachAgent — The Built-In Producer

**Purpose:** Always-present storytelling mentor that teaches DJs WHY good stories work while guiding them through the production process. The CoachAgent is context-aware of what the DJ is doing in the production interface and offers guidance at every step.

**Knowledge Sources (via DO Knowledge Base — station-knowledge collection):**
- Radio Milwaukee style guides (all 4 station brands)
- This American Life story structure guide
- Radiolab production techniques
- Snap Judgment narrative approaches
- NPR editorial standards
- Radio Milwaukee's best published stories (annotated)
- Production workflow documentation
- FAQ, troubleshooting, legal guardrails
- CPB crisis context and community impact data

**Coaching in the Production Context:**

During transcript correction: "I see you corrected 'Rivera' to 'Riverwest.' Good catch—place names matter in local journalism. I also noticed the speaker at 22:15 isn't labeled yet. Want me to check if we've interviewed this person before?"

During tape selection: "You've highlighted the quote at 14:32—that's a strong choice for opening. But listen to 22:15: Marcus says 'I walked past three boarded-up houses on my own block.' That's more immediate and visual. Ira Glass calls this an 'action opening'—it drops the listener into the scene instead of telling them about it."

During text-based editing: "You just cut 30 seconds from the middle of Marcus's story. The remaining audio jumps from setup to conclusion—you lost the turning point. Try keeping the sentence at 18:42 ('That's when I knew it wasn't coming back'). That's the pivot the narrative needs."

During script review: "Your air break opens with stats—60% to 18%. That works for print, but radio needs a human moment first. Try leading with Marcus's quote, then layer in the census data as context. That's the Radiolab approach: story first, information second."

**ADK Implementation:**
```python
from gradient_adk import entrypoint, trace_llm, trace_retriever, RequestContext

@trace_retriever("station_knowledge")
async def retrieve_coaching_context(query: str, context: RequestContext):
    """Retrieve relevant coaching materials from Knowledge Base."""
    results = await context.knowledge_base.search(
        collection="station-knowledge",
        query=query,
        top_k=5
    )
    return results

@trace_llm("coach_response")
async def generate_coaching(state: dict, retrieved_docs: list):
    """Generate contextual coaching based on current production state."""
    # System prompt encodes coaching personality + station voice
    # State includes: current step, transcript, DJ's edits, tape selections
    # Retrieved docs provide specific techniques and examples
    # Returns guidance referencing specific timestamps and editorial reasoning
    pass

@entrypoint
async def coach_agent(input: dict, context: RequestContext):
    """CoachAgent entry point for Gradient ADK."""
    coaching_context = await retrieve_coaching_context(
        input.get("query"), context
    )
    response = await generate_coaching(
        state=input.get("production_state"),
        retrieved_docs=coaching_context
    )
    return {"coaching": response}
```

**Evaluation Metrics:**
- Correctness: Does coaching reference actual timestamps from transcript?
- Context quality: Are retrieved examples relevant to the DJ's current task?
- Safety: Does coaching respect off-record sections?
- Pedagogical value: Does coaching explain WHY, not just WHAT?

---

### 6.2 TranscriptAgent — Audio Intelligence

**Purpose:** Processes raw audio into word-level structured transcripts and performs deep analysis to discover story angles, emotional arcs, and key moments. Its output feeds both the production interface and the other agents.

**Capabilities:**

**Transcription:** Audio → word-level JSON via Deepgram Nova-2, then structured into Markdown with timestamps, speaker diarization, and paragraph segmentation. Word-level timestamps enable the text-based audio editing system.

**Story Discovery:** Analyzes full transcript and suggests 4-5 story angles ranked by narrative strength, with reasoning for each. These become visual highlights in both the transcript editor and the waveform annotations.

**Emotional Arc Mapping:** Charts emotional intensity across the interview timeline, identifying peaks (conflict, revelation, vulnerability) and valleys (exposition, context). Rendered as a color gradient overlay on the waveform.

**Quote Extraction:** Pulls the 10-15 strongest quotes with context, tagged by theme and emotional register. Rendered as highlighted passages in the transcript editor. "This opens a podcast" vs. "This is a social media pull quote" vs. "This anchors an air break."

**Filler Word Detection:** Identifies "um," "uh," "like," "you know" with timestamps. These are visually marked in the transcript editor—the DJ can delete them all at once, and the audio cuts follow automatically.

**Prior Coverage Search:** Queries the Story Archive Knowledge Base for related coverage to prevent duplicates and enable story continuity.

---

### 6.3 ContentAgent — The Multi-Format Engine

**Purpose:** Generates all six content formats from a single interview, adapted for each platform's constraints, the specific station's voice, and the individual DJ's personal style. Critically, the ContentAgent works with DJ-verified inputs: a corrected transcript, hand-selected tape segments with precise timestamps, and explicit creative direction.

**The key difference from v4:** With the production interface, the ContentAgent doesn't guess which tape to use. The DJ has already selected specific audio segments by editing the transcript and the waveform. Generated scripts reference the DJ's actual selections, not AI approximations.

**Six Formats:**

**Air Break Script (60-90 seconds):**
- Opens with DJ-selected strongest tape moment
- 2-3 narration bridges written for the ear
- Tape timestamps from DJ's actual waveform selections: "TAPE: Marcus_14:32-14:58 [DJ-selected, 26s]"
- Music bed suggestions based on emotional tone
- Precise timing to hit broadcast window

**Podcast Segment (8-12 minutes):**
- Extended narration with scene-setting
- 4-6 tape segments from DJ's edit assembly
- Chapter markers for podcast platforms
- Ambient sound suggestions
- Natural transitions between sections

**Social Thread (4-6 posts):**
- Hook-driven opening (scroll-stopping first line)
- Quote graphics suggested (text + attribution)
- Each post stands alone but threads tell a story
- Platform-specific: character limits, hashtag strategy
- CTA to full story/podcast

**Web Article (500-800 words):**
- SEO-optimized headline and subhead
- Embedded audio player reference (can embed the DJ's edited audio export)
- Pull quotes formatted for web
- Related story links from archive
- Photo/image suggestions

**Newsletter Copy (2-3 paragraphs):**
- Teaser that creates curiosity without spoiling
- Personal tone matching newsletter voice
- CTA to listen/read full story

**Press Release (standard format):**
- News angle (not feature angle)
- Station quotes and attribution
- Boilerplate + contact info

**Station Voice Switching:**
Same interview, different stations:
- **88Nine** (warm, eclectic): "Milwaukee's Riverwest neighborhood has always been a place where cultures collide in the best possible way..."
- **HYFIN** (urban, culturally-specific): "The displacement happening in Riverwest isn't new—it's the latest chapter in a story Black Milwaukee knows too well..."
- **414 Music** (artist-focused): "When Marcus plays his guitar on the porch these days, the audience has changed..."
- **Rhythm Lab** (curated, music-nerd): "There's a sonic history to every neighborhood. In Riverwest, the sound of community is getting quieter..."

**Personal Style Library:**
DJs upload 5-10 writing samples. The ContentAgent analyzes: sentence rhythm, vocabulary, transitions, opening hooks, signature phrases. Generated content sounds like the specific DJ, not generic AI. Same interview → different DJs → different scripts.

---

### 6.4 WorkflowAgent — Production Manager

**Purpose:** Manages the editorial workflow across four stations with five human-in-the-loop approval checkpoints.

**Five Approval Checkpoints:**

| # | Checkpoint | Who Approves | What's Verified |
|---|-----------|-------------|-----------------|
| 1 | Transcript Corrected | DJ | Speaker names correct, STT errors fixed, off-record sections marked |
| 2 | Tape Selected | DJ | Audio segments selected via text editing and waveform, assembly previewed |
| 3 | Assembly Previewed | DJ | Multi-track arrangement sounds right, crossfades clean, timing works |
| 4 | Scripts Approved | DJ | All 6 generated formats reviewed and edited, voice/tone correct |
| 5 | Producer Sign-Off | Producer | Editorial standards met, facts verified, ready for broadcast |

**Workflow States:**
- **Transcribing** — Audio processing. Automatic.
- **Correcting** — DJ editing transcript. Checkpoint 1.
- **Producing** — DJ selecting tape, editing audio via text. Checkpoints 2-3.
- **Generating** — AI creating multi-format content. Automatic.
- **Reviewing** — DJ reviewing generated scripts. Checkpoint 4.
- **Producer Review** — Submitted for editorial sign-off. Checkpoint 5.
- **Revision** — Changes requested by producer. DJ addressing feedback.
- **Approved** — Ready for production. Locked for editing.
- **Scheduled** — Air date set. Notifications queued.
- **Published** — Live. Added to Story Archive Knowledge Base.
- **Urgent Review** — Breaking news. Skips queue. All producers notified.

**Cross-Station Coordination:**
WorkflowAgent maintains awareness across all four stations. When a DJ at 88Nine starts a story about Riverwest gentrification, it alerts: "HYFIN is also covering displacement in Riverwest—different angle (Black business impact). Consider coordinating or differentiating."

---

## 7. KNOWLEDGE BASE ARCHITECTURE — DIGITALOCEAN RAG

### Three Knowledge Base Collections

**Collection 1: station-knowledge**
Style guides (all 4 brands), storytelling craft guides (This American Life, Radiolab, Snap Judgment), NPR editorial standards, production workflow docs, FAQ/legal guardrails, CPB crisis context.
Chunking: Section-based (style guides have clear sections).
Used by: CoachAgent (primary), ContentAgent (station voices).

**Collection 2: story-archive**
All published Radio Milwaukee transcripts, scripts, and metadata. Growing corpus—every published StoryForge story is added automatically.
Chunking: Semantic (preserves narrative flow).
Used by: TranscriptAgent (prior coverage), CoachAgent (examples), ContentAgent (continuity).

**Collection 3: personal-style**
Per-DJ writing samples, style analysis, and previously approved scripts.
Chunking: Hierarchical (document-level style + paragraph-level patterns).
Used by: ContentAgent (voice matching).

---

## 8. CORE WORKFLOW — THE COMPLETE PRODUCTION PIPELINE

### Step 1: Upload & Transcribe
DJ uploads audio file (MP3, WAV, FLAC). TranscriptAgent sends to Deepgram Nova-2 for word-level transcription with speaker diarization. Returns structured JSON with every word's start/end timestamp.

The transcript loads into the BBC Transcript Editor. The waveform loads into Waveform Playlist. The TranscriptAudioSync engine binds them together.

### Step 2: Correct Transcript ← CHECKPOINT 1
**DJ works in the transcript editor.** They:
- Fix STT errors (click word, retype)
- Name speakers ("Speaker 1" → "Marcus Washington")
- Mark off-record sections (select text → right-click → "Mark Off-Record")
- Delete filler words ("um," "uh," "like") — audio cuts automatically
- Click any word to hear it in the waveform player

**The CoachAgent is available** but doesn't interrupt. DJ can ask: "How long should my tape segments be for an air break?" or "Should I keep the part where he talks about the landlord?"

DJ clicks **"Transcript Approved"** to proceed.

### Step 3: Discover Story
TranscriptAgent analyzes the corrected transcript and presents:
- 4-5 story angles, highlighted in both transcript and waveform annotations
- 10-15 key quotes with color-coded annotations (green = strongest, yellow = supporting, blue = data/facts)
- Emotional arc visualization overlaid on waveform
- Prior coverage check results

CoachAgent provides framing: "The gentrification angle is strongest because Marcus's story has a clear arc: before → turning point → after. The emotional peak at 28:45 ('It's like grieving someone who's still alive') is the kind of moment that makes listeners stop what they're doing."

### Step 4: Select Tape & Assemble ← CHECKPOINTS 2 & 3
**This is the Descript-style editing moment.** DJ edits the transcript as text, and the audio follows:

- **Delete everything except the keeper moments.** DJ selects and deletes the long setups, the tangents, the repeated questions. Audio cuts to match. What's left is the curated tape.
- **Rearrange for narrative.** DJ drags the strongest quote to the top. Moves the hopeful ending to the end. Puts the data context in the middle. Audio reorders automatically.
- **Fine-tune in the waveform.** For precise edits—trimming a breath, adjusting a crossfade—DJ works directly in the Waveform Playlist. Changes are reflected in the transcript.
- **Add a music bed.** DJ loads a music track into a second waveform track. Adjusts volume, adds fade-in under the opening tape.
- **Preview the assembly.** DJ hits play and hears the whole piece—edited tape, narration gaps (silence where script will go), music bed. This is what it'll sound like on air.

DJ clicks **"Assembly Approved"** and sets steering controls:
- Selected angle
- Theme tags
- Emotional tone
- Must-include quotes (already highlighted from selection)
- Narrative direction

### Step 5: Generate All Content ← CHECKPOINT 4
ContentAgent generates all six formats using the DJ's verified inputs: corrected transcript, selected tape with exact timestamps from the waveform, and steering parameters. Every tape reference in every script points to the DJ's actual edits.

CoachAgent reviews: "Your air break is 95 seconds—trim the census data bridge to hit 90. Save detailed stats for the podcast version."

DJ reviews, edits, and clicks **"Scripts Approved."**

### Step 6: Producer Review ← CHECKPOINT 5
WorkflowAgent routes to assigned producer. Producer opens the story in the same production workspace:
- Reads generated scripts
- Clicks tape references to hear them in the waveform
- Adds inline comments on specific script lines
- Can listen to the full assembly with music bed
- Approves or sends back with notes

Published stories are automatically added to the Story Archive Knowledge Base.

---

## 9. FEATURE SPECIFICATION

### 9.1 Text-Based Audio Editing (Core Innovation)

**Delete text → cut audio.** Select words or sentences in transcript, press delete. Audio removes corresponding segment. 50ms crossfade inserted at edit point.

**Rearrange text → reorder audio.** Drag paragraphs to new positions. Audio segments reorder on the waveform timeline. Crossfades at all edit points.

**Click text → seek audio.** Click any word in transcript. Waveform seeks to that timestamp. Audio plays from that point.

**Select text → preview audio.** Highlight a passage. Press spacebar. Hear just that selection. Essential for evaluating quotes before committing.

**Mark off-record → exclude from AI.** Select passage, mark as off-record. Text shows strikethrough. Audio shows grayed region. AI agents ignore entirely.

**Filler word cleanup.** TranscriptAgent marks all filler words ("um," "uh," "like," "you know"). DJ can review and delete all at once. Audio cuts automatically with crossfades.

**Multi-track assembly.** Edited interview on Track 1. Music bed on Track 2. Future: narration recording on Track 3. Full multitrack timeline with per-track volume, mute, solo.

**WAV export.** Export the edited audio assembly as a WAV file for the broadcast engineer or podcast upload. Full offline rendering with effects via Waveform Playlist.

### 9.2 Story Discovery Dashboard

All stories across all stations, filterable by station, status, creator, topic tags, neighborhood, date range. Full-text search across transcripts and generated content. Visual status board tracking all five approval checkpoints. Cross-station coordination to prevent duplicate coverage.

### 9.3 DJ Story Steering Controls

**Story Angle Selector:** AI suggests 4-5 angles. DJ picks one or writes custom.
**Theme Tags:** Predefined + custom. AI weights narrative toward tagged themes.
**Emotional Tone Slider:** Celebratory ↔ Elegiac ↔ Investigative ↔ Hopeful.
**Must-Include Quotes:** Highlighted in transcript; appear in ALL generated formats.
**Exclude Sections:** Marked off-record in transcript editor.
**Narrative Direction:** Free-text guidance for specific structural choices.

### 9.4 Personal Style Library

Upload 5-10 writing samples. AI analyzes voice: sentence rhythm, vocabulary, transitions, opening hooks, signature phrases. Profile stored: "Warm conversational tone. 14 words/sentence average. Opens with scene-setting. Uses 'here's the thing...' Avoids jargon." All ContentAgent output matches the active DJ's profile. Continuous learning from DJ edits.

### 9.5 Station System Prompts

**88Nine:** Warm, inclusive, eclectic. Milwaukee pride without boosterism. Conversational but informed.
**HYFIN:** Urban alternative. Culturally specific. Centers Black experience. Unapologetic. Contemporary language.
**414 Music:** Artist-first. Technical when needed, accessible always. Lets the music speak.
**Rhythm Lab Radio:** Curated. Global perspective. Music-nerd energy. Deep cuts and context.

### 9.6 Context & Source Integration

Facts/data (AI cites in narration). Source documents (PDFs, reports). Prior coverage links. Research notes. Web URLs. All woven into scripts with proper attribution.

### 9.7 Workflow & Collaboration

Threaded discussions on stories + inline comments on specific script lines AND audio timestamps. Producer can click a tape reference in the script and hear it. Activity feed. Slack webhook notifications. Five approval checkpoints tracked visually.

---

## 10. TECHNICAL ARCHITECTURE

### System Stack

```
┌───────────────────────────────────────────────────────┐
│                     FRONTEND                           │
│  React + Tailwind + shadcn/ui                         │
│  ┌─────────────────┐  ┌────────────────────────────┐ │
│  │ @bbc/react-     │  │ @waveform-playlist/browser │ │
│  │ transcript-     │◄►│ (naomiaro v7)              │ │
│  │ editor          │  │                            │ │
│  └────────┬────────┘  └─────────────┬──────────────┘ │
│           │   TranscriptAudioSync   │                 │
│           └────────────┬────────────┘                 │
│                        │                              │
│  PWA for mobile push notifications                    │
├───────────────────────────────────────────────────────┤
│                    API LAYER                           │
│  FastAPI (Python) + WebSocket for real-time updates   │
├───────────────────────────────────────────────────────┤
│               GRADIENT ADK AGENTS                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│  │ Coach    │ │Transcript│ │ Content  │             │
│  │ Agent    │ │ Agent    │ │ Agent    │             │
│  └──────────┘ └──────────┘ └──────────┘             │
│            ┌──────────────┐                          │
│            │  Workflow    │                          │
│            │  Agent       │                          │
│            └──────────────┘                          │
├───────────────────────────────────────────────────────┤
│             ORCHESTRATION                             │
│  LangGraph StateGraph                                │
│  (State management, routing, human-in-loop pauses)   │
├───────────────────────────────────────────────────────┤
│               INFRASTRUCTURE                          │
│  ┌───────────────┐  ┌─────────────────────────────┐  │
│  │ DO Knowledge  │  │ DO Managed PostgreSQL       │  │
│  │ Bases (RAG)   │  │                             │  │
│  └───────────────┘  └─────────────────────────────┘  │
│  ┌───────────────┐  ┌─────────────────────────────┐  │
│  │ DO Spaces     │  │ Deepgram Nova-2 API         │  │
│  │ (Audio/Files) │  │ (Word-level transcription)  │  │
│  └───────────────┘  └─────────────────────────────┘  │
│  ┌───────────────┐                                   │
│  │ DO Serverless │                                   │
│  │ Inference     │                                   │
│  └───────────────┘                                   │
└───────────────────────────────────────────────────────┘
```

### Key Technical Decisions

**Why LangGraph:** Explicit state management for a multi-step creative workflow where humans intervene between agent actions. The five approval checkpoints are natural graph pause points.

**Why Claude Sonnet 4.5 for content generation:** Creative writing quality matters for radio scripts. Claude produces more natural broadcast voice. ADK's framework-agnostic approach lets us pick the best model per task.

**Why Waveform Playlist v7:** Current, maintained, React hooks API. Annotations system built for transcript work. Multi-track for music beds. WAV export for broadcast. The alternative (building custom audio editing) would take months.

**Why BBC React Transcript Editor:** Proven in professional newsroom workflows. Click-to-seek audio sync. Multiple STT format support. DraftJS performance is fine for 30-45 minute interviews (Radio Milwaukee's typical length). BBC brand credibility. Post-hackathon, can migrate to Slate-based implementation for longer content if needed.

**Why Deepgram Nova-2:** Word-level timestamps enable text-based audio editing. Superior speaker diarization for multi-person interviews. Faster-than-real-time processing. The word-level timestamps are the technical foundation that makes the entire production interface possible.

**Why PostgreSQL over Convex:** DigitalOcean Managed PostgreSQL integrates natively with the Gradient platform. Real-time features handled via WebSocket.

---

## 11. DATA MODEL

### PostgreSQL Schema

```sql
-- Stories: Core entity tracking full production pipeline
CREATE TABLE stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500),
    station_id VARCHAR(50) NOT NULL,
    creator_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'transcribing',
    
    -- Audio & Transcript
    audio_file_url TEXT,
    audio_duration_seconds INTEGER,
    transcript_id UUID REFERENCES transcripts(id),
    
    -- Production State (tracks DJ's edits in production interface)
    edit_operations JSONB,        -- ordered list of text/audio edits
    assembly_state JSONB,         -- current waveform arrangement
    edited_audio_url TEXT,        -- exported WAV of DJ's assembly
    
    -- DJ Steering
    selected_angle TEXT,
    themes TEXT[],
    emotional_tone VARCHAR(50),
    must_include_quotes JSONB,
    exclude_ranges JSONB,
    narrative_direction TEXT,
    additional_context TEXT,
    
    -- Generated Content
    air_break JSONB,
    podcast_segment JSONB,
    social_thread JSONB,
    web_article JSONB,
    newsletter_copy JSONB,
    press_release JSONB,
    
    -- Approval Checkpoints
    transcript_approved_at TIMESTAMP,
    tape_approved_at TIMESTAMP,
    assembly_approved_at TIMESTAMP,
    scripts_approved_at TIMESTAMP,
    producer_approved_at TIMESTAMP,
    producer_approved_by UUID REFERENCES users(id),
    
    -- Workflow
    assigned_producer_id UUID REFERENCES users(id),
    scheduled_date TIMESTAMP,
    published_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Transcripts: Word-level structured data
CREATE TABLE transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID REFERENCES stories(id),
    
    -- Raw Deepgram output (word-level timestamps)
    raw_stt_json JSONB NOT NULL,
    
    -- Structured output
    markdown TEXT NOT NULL,
    speakers JSONB,
    duration_seconds INTEGER,
    word_timestamps JSONB,     -- [{word, start, end, confidence, speaker}]
    filler_words JSONB,        -- [{word, start, end}] for batch cleanup
    
    -- AI Analysis
    story_angles JSONB,
    key_quotes JSONB,
    emotional_arc JSONB,
    
    -- DJ Corrections
    corrections JSONB,         -- [{original, corrected, timestamp}]
    off_record_ranges JSONB,   -- [{start, end, marked_by, marked_at}]
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Style Profiles
CREATE TABLE style_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) UNIQUE,
    samples JSONB,
    analysis JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Comments: Inline on scripts AND audio timestamps
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID REFERENCES stories(id),
    user_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    -- Can reference a script line OR an audio timestamp OR both
    format_type VARCHAR(50),
    line_reference INTEGER,
    audio_timestamp_start FLOAT,
    audio_timestamp_end FLOAT,
    parent_comment_id UUID REFERENCES comments(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    story_id UUID REFERENCES stories(id),
    checkpoint VARCHAR(50),    -- which approval checkpoint triggered this
    message TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    email VARCHAR(300) UNIQUE NOT NULL,
    role VARCHAR(50) DEFAULT 'dj',
    stations TEXT[],
    style_profile_id UUID REFERENCES style_profiles(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 12. HACKATHON MVP SCOPE

### What Gets Built (4-Week Sprint to Demo)

**Week 1: Production Interface Foundation**
- Gradient ADK project + LangGraph orchestration scaffold
- PostgreSQL schema on DigitalOcean Managed Database
- Deepgram integration: audio upload → word-level JSON
- BBC React Transcript Editor: load transcript, click-to-seek, inline editing
- Waveform Playlist v7: load audio, waveform visualization, playback controls
- TranscriptAudioSync engine: click text → seek audio, click waveform → highlight text

**Week 2: Text-Based Audio Editing + AI Analysis**
- Delete text → cut audio (core Descript-style interaction)
- Select text → preview audio segment
- Mark off-record sections (text strikethrough + waveform gray)
- Filler word detection and batch deletion
- TranscriptAgent: story angles, key quotes, emotional arc
- Annotations rendered in both transcript editor and waveform
- CoachAgent with Knowledge Base RAG

**Week 3: Content Generation + Steering**
- DJ Steering Panel (angle, themes, tone, must-include, narrative direction)
- ContentAgent multi-format generation (all 6 formats)
- Station voice switching (88Nine ↔ HYFIN ↔ 414 Music ↔ Rhythm Lab)
- Personal style profile upload and matching
- Tape references in scripts link back to waveform (click to preview)
- Music bed support (load second track, volume control)

**Week 4: Workflow + Demo**
- Five approval checkpoints with visual progress tracking
- WorkflowAgent: status transitions, notifications, producer comments
- Inline comments on scripts + audio timestamps
- Story Discovery Dashboard with cross-station search
- WAV export of edited assembly
- Demo video with real Radio Milwaukee interview
- ADK evaluation suite
- UI polish and bug fixes

### What Gets Deferred (Post-Hackathon)
- Paragraph-level drag reordering of audio (text deletion works for MVP; reordering is polish)
- Adaptive crossfade duration (fixed 50ms for MVP)
- Slate-based transcript editor (for interviews longer than 45 minutes)
- Narration recording directly in Waveform Playlist Track 3
- Automated filler word removal (manual review for MVP)
- Slack webhook integration
- Mobile PWA push notifications
- Automated publishing to CMS/social platforms

---

## 13. DEMO SCRIPT — 3-Minute Presentation

### [0:00-0:30] The Crisis + The Problem

"Five weeks ago, public media lost $1.1 billion in federal funding. Stations across America are cutting staff. At Radio Milwaukee, we operate four stations with a team that was already stretched thin. Our DJs conduct incredible interviews every week—but turning those conversations into polished stories requires producer skills, audio editing expertise, and time nobody has. We can't afford more producers. Neither can most public media organizations—especially now."

### [0:30-1:15] Upload + Edit Like Descript + Coach Guidance

Upload a real 45-minute interview with Marcus Washington, a Riverwest community member.

Transcript appears instantly—word-synced to the waveform above. Click any word; the audio jumps there.

"Watch this. I'm going to edit this interview the same way I'd edit a Google Doc."

Select a rambling 2-minute section. Delete. The audio cuts automatically—you can see the waveform update in real-time. No Hindenburg. No Audacity. Just delete the text.

Select filler words flagged by AI—all the "ums" and "uhs" highlighted in yellow. Delete all. Audio tightens up instantly.

Mark an off-record section—text goes strikethrough, waveform grays out. AI will never see it.

CoachAgent appears: "I found 4 story angles. The strongest is gentrification—at 14:32, Marcus describes watching his neighbors leave. That's your emotional anchor. At 22:15, he says 'I walked past three boarded-up houses on my own block'—that's a stronger opening. More visual, more immediate."

Click the quote in the coach's suggestion—waveform jumps there. You hear Marcus say it.

### [1:15-1:50] Steer + Generate + Station Switch

DJ steers: selects "gentrification" angle, tags #CommunityLoss, slides tone to "elegiac," adds census data showing Riverwest's demographic shift.

Clicks "Generate All Content."

Six formats appear—air break with tape timestamps that match the DJ's actual edited audio, podcast with chapter markers, social thread with hooks, web article with SEO headline, newsletter teaser, press release.

Click any tape reference in the air break script—hear it play in the waveform above. The script and the audio are connected.

Switch station from 88Nine to HYFIN. Regenerate. Same story, completely different voice: "The displacement happening in Riverwest isn't new—it's the latest chapter in a story Black Milwaukee knows too well..."

### [1:50-2:20] Multi-Track Assembly + Producer Handoff

Load a music bed onto Track 2 of the waveform. Adjust volume. Preview the air break with tape AND music together—this is what it sounds like on air.

Export assembly as WAV for the engineer.

Open Story Discovery Dashboard. Search: "What else are we covering in Riverwest?" See: 88Nine has this story, HYFIN has an approved piece on Black business displacement. Cross-station coordination, instant.

Submit for producer review. Check off the approval checklist: transcript corrected ✓, tape selected ✓, assembly previewed ✓, scripts approved ✓. Waiting on: producer sign-off.

Producer gets notification. Opens the story. Clicks a tape reference, hears it. Adds inline comment: "Stronger if you lead with Marcus's quote instead of narration." Comment appears in real-time.

### [2:20-3:00] The Impact

"A DJ with no production experience just edited audio by editing text—no Hindenburg, no Audacity. Built a multi-track assembly with music. Created broadcast-ready content for every platform in 20 minutes. With an AI coach teaching storytelling craft at every step. And a human approval chain ensuring nothing goes to air without editorial review.

That's how public media survives the funding crisis. Not by replacing producers with AI—but by giving every DJ the tools and coaching to do what producers do. One interview. Six formats. Four station voices. Five approval checkpoints. That's StoryForge."

---

## 14. PRIZE CATEGORY ALIGNMENT

### Best Agent Persona — CoachAgent

The CoachAgent isn't a chatbot. It's a producer with 20 years of experience encoded into a knowledge base. It's context-aware of the DJ's current production state—it sees what they're editing, what tape they're selecting, and offers guidance rooted in narrative craft from This American Life, Radiolab, and Radio Milwaukee's own best work. It explains WHY, references specific timestamps, and respects the DJ's creative authority. This is what agent persona looks like when the stakes are real.

### Best Program for the People

Public media just lost its federal funding. 1,500+ stations are cutting staff. StoryForge means a 3-person team can produce what used to require 10—keeping local journalism alive in communities about to lose their only source of local news. The five approval checkpoints ensure AI augments human judgment rather than replacing it.

### Best Use of DigitalOcean Platform

Full Gradient AI stack: ADK agents (4), Knowledge Bases (3 collections with semantic chunking), Serverless Inference (Claude Sonnet 4.5), Managed PostgreSQL, Spaces (audio storage), Tracing & Evaluation, Guardrails. Plus professional-grade open-source production tools (Waveform Playlist, BBC Transcript Editor) integrated into a cohesive platform.

### Technical Innovation

Three layers of innovation that no other tool combines: (1) Descript-style text-based audio editing built from open-source components with a novel sync engine, (2) multi-agent AI orchestration with human-in-the-loop approval at five checkpoints, and (3) multi-format content generation with station voice switching and personal style matching. The production interface is the differentiator—this isn't another AI wrapper.

---

## 15. COMPETITIVE ANALYSIS

| Capability | StoryForge | Descript | Hindenburg | Adobe Podcast | ChatGPT/Claude | Riverside |
|-----------|:---:|:---:|:---:|:---:|:---:|:---:|
| Text-based audio editing | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Multi-track audio | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| AI story discovery | ✅ | ❌ | ❌ | ❌ | Partial | ❌ |
| Storytelling coaching | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Multi-format generation (6) | ✅ | ❌ | ❌ | ❌ | Partial | ❌ |
| Station voice switching | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Personal style matching | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Editorial workflow | ✅ | Basic | Basic | ❌ | ❌ | ❌ |
| Human approval chain | ✅ (5 checkpoints) | ❌ | ❌ | ❌ | ❌ | ❌ |
| Cross-station coordination | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Music bed support | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| WAV export | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Open source components | ✅ | ❌ Proprietary | ❌ | ❌ | ❌ | ❌ |
| Built for public radio | ✅ | ❌ Generic | Partial | ❌ | ❌ | ❌ |

**The gap:** Descript does text-based audio editing but has no storytelling intelligence, no coaching, no multi-format generation, no editorial workflow. Hindenburg is a professional DAW but has no AI. ChatGPT can write but can't edit audio or understand radio production. No tool on the market combines production interface + AI coaching + multi-format generation + editorial workflow. Because no one has built a tool specifically for public radio storytelling—until now.

---

## 16. IMPACT METRICS & SCALABILITY

### Measurable Impact

| Metric | Current State | With StoryForge |
|--------|:---:|:---:|
| Time per story (all platforms) | 8+ hours | Under 1 hour |
| Content pieces per interview | 1-2 | 6 |
| Audio editing tool required | Hindenburg ($400) or Audacity | Browser (free, built-in) |
| Annual producer staffing gap | $150,000+ | $0 (tool cost) |
| Stories published per week | 3-5 | 15-30 |
| DJ audio editing skill required | Intermediate | None (edit text) |
| Approval checkpoints | Informal / email | 5 explicit checkpoints |
| Cross-station coordination | Manual | Automated dashboard |
| DJ skill development | Trial and error | AI coaching at every step |

### Scalability Path

**Phase 1 — Radio Milwaukee (Hackathon).** Four stations, real content, immediate deployment.

**Phase 2 — Wisconsin Public Media.** CPB crisis has Wisconsin stations actively seeking solutions.

**Phase 3 — National Public Media.** 1,500+ stations. Station voice system means any organization configures their own brand DNA.

**Phase 4 — Beyond Radio.** Any organization conducting interviews for multi-platform content: university communications, nonprofit storytelling, corporate content teams, independent journalism.

### Business Case

At $99/month per station, StoryForge costs Radio Milwaukee $4,752/year across four stations. That replaces a $150,000+ staffing gap. 31x ROI before counting the 6x content multiplication.

At scale: 500 stations × $99/month = $594,000 ARR.

---

## END OF SPECIFICATION

**StoryForge: Turn every DJ into a producer.**
**Edit text. Edit audio. Six formats. Every platform.**
**Built on DigitalOcean Gradient AI. Built with BBC and Waveform Playlist open source.**
**Built for the crisis. Built to last.**
