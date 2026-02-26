# StoryForge v5.1 — Architecture Addendum
## WorkOS Auth + Convex Backend + Sound Design + Transcript Search + Exports

**This addendum updates the v5.0 specification with six major additions.**

---

## ARCHITECTURE CHANGES SUMMARY

| Component | v5.0 (Previous) | v5.1 (Updated) | Why |
|-----------|:---:|:---:|-----|
| **Auth** | None specified | **WorkOS AuthKit** | Org management, RBAC, user invites, SSO-ready, free to 1M users |
| **Backend** | DO Managed PostgreSQL + FastAPI | **Convex** | Real-time reactivity, TypeScript backend, first-party WorkOS integration, file storage |
| **Sound Effects** | None | **ElevenLabs SFX API** | Generate custom sound effects from text prompts (stingers, transitions, ambient) |
| **Music** | Manual music bed upload only | **ElevenLabs Music API + Freesound API** | AI-generated music beds + 600K+ CC-licensed sounds |
| **Transcript Search** | Click-to-seek only | **Full-text search with audio jump** | Hindenburg-style "type a word, find your spot in the audio" |
| **Export** | WAV audio only | **WAV + .srt + .vtt + .txt + show notes** | Subtitles, YouTube captions, website transcriptions, podcast show notes |

---

## 1. WORKOS AUTHENTICATION & ORGANIZATION MANAGEMENT

### Why WorkOS

WorkOS provides enterprise-grade auth with a specific feature set that maps perfectly to how radio stations operate: **Organizations** (stations), **Roles** (admin, producer, DJ, intern), **User Invites**, and **RBAC permissions** — all with a first-party Convex integration shipped July 2025.

Free for up to 1 million users. Powers OpenAI, Cursor, Vercel, Perplexity. SSO-ready for when larger station groups need enterprise auth.

### Convex + WorkOS: First-Party Integration

This isn't a hack — Convex and WorkOS announced official integration in July 2025 with dedicated template repos, automatic environment provisioning, and JWT validation baked into the Convex runtime. Setup takes under 2 minutes.

```typescript
// Frontend: Wrap app with ConvexProviderWithAuthKit
import { ConvexProviderWithAuthKit } from '@convex-dev/workos';
import { AuthKitProvider } from '@workos-inc/authkit-react';

function App() {
  return (
    <AuthKitProvider clientId={WORKOS_CLIENT_ID}>
      <ConvexProviderWithAuthKit client={convex}>
        <StoryForgeApp />
      </ConvexProviderWithAuthKit>
    </AuthKitProvider>
  );
}
```

### StoryForge Role & Permission Model

**Roles** (configured in WorkOS Dashboard, assigned via organization memberships):

| Role | Slug | Description |
|------|------|-------------|
| **Admin** | `admin` | Station manager. Full access. Manages users, stations, settings. |
| **Producer** | `producer` | Senior editorial. Approves stories, manages workflow, all content access. |
| **DJ / Host** | `dj` | Creates stories, edits own content, submits for review. |
| **Intern / Contributor** | `contributor` | Limited access. Can draft stories, cannot publish or approve. |

**Permissions** (granular, assigned to roles):

| Permission Slug | Admin | Producer | DJ | Contributor |
|----------------|:---:|:---:|:---:|:---:|
| `stories:create` | ✅ | ✅ | ✅ | ✅ |
| `stories:edit_own` | ✅ | ✅ | ✅ | ✅ |
| `stories:edit_any` | ✅ | ✅ | ❌ | ❌ |
| `stories:approve` | ✅ | ✅ | ❌ | ❌ |
| `stories:publish` | ✅ | ✅ | ❌ | ❌ |
| `stories:delete` | ✅ | ❌ | ❌ | ❌ |
| `users:invite` | ✅ | ✅ | ❌ | ❌ |
| `users:manage` | ✅ | ❌ | ❌ | ❌ |
| `stations:manage` | ✅ | ❌ | ❌ | ❌ |
| `settings:manage` | ✅ | ❌ | ❌ | ❌ |
| `ai:generate_content` | ✅ | ✅ | ✅ | ❌ |
| `ai:generate_sound` | ✅ | ✅ | ✅ | ❌ |
| `workflow:view_dashboard` | ✅ | ✅ | ✅ | ✅ |
| `workflow:manage_all` | ✅ | ✅ | ❌ | ❌ |
| `exports:create` | ✅ | ✅ | ✅ | ✅ |

### Organization Model

Each **radio station or station group** is a WorkOS Organization. Radio Milwaukee would be one organization with four stations configured as Convex data. Users are invited to an organization and assigned a role. Multi-organization support means a single StoryForge instance can serve multiple station groups.

```
WorkOS Organization: "Radio Milwaukee"
├── User: Tarik (role: admin, stations: [88Nine, HYFIN, 414 Music, Rhythm Lab])
├── User: Sarah (role: producer, stations: [88Nine, HYFIN])  
├── User: Marcus (role: dj, stations: [88Nine])
├── User: Jay (role: dj, stations: [HYFIN])
└── User: Kim (role: contributor, stations: [414 Music])
```

### User Invite Flow

1. Admin goes to Settings → Team Management
2. Clicks "Invite User" — enters email, selects role, assigns station(s)
3. WorkOS sends branded invitation email
4. User clicks link → AuthKit sign-up flow → automatically added to organization with correct role
5. Convex webhook handler syncs user data to the `users` table

```typescript
// Convex: Permission check in any mutation/query
import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const approveStory = mutation({
  args: { storyId: v.id("stories") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    // WorkOS role/permissions are in the JWT claims
    const permissions = identity.permissions || [];
    if (!permissions.includes("stories:approve")) {
      throw new Error("You don't have permission to approve stories");
    }
    
    await ctx.db.patch(args.storyId, {
      status: "approved",
      producerApprovedAt: Date.now(),
      producerApprovedBy: identity.subject,
    });
  },
});
```

---

## 2. CONVEX AS BACKEND-AS-A-SERVICE

### Why Convex Instead of PostgreSQL + FastAPI

| Concern | PostgreSQL + FastAPI (v5.0) | Convex (v5.1) |
|---------|:---:|:---:|
| Real-time updates | Manual WebSocket setup | Built-in reactivity — UI updates automatically |
| Auth integration | Custom JWT validation | First-party WorkOS AuthKit support |
| File storage | DO Spaces (separate service) | Convex file storage (integrated) |
| Backend language | Python (FastAPI) + TypeScript (frontend) | TypeScript everywhere |
| Deployment | Manage DO infra | Managed platform, zero-ops |
| Schema validation | SQL + Pydantic | Convex schema validators (TypeScript) |
| Real-time collaboration | Custom pub/sub needed | Native — multiple users see edits instantly |
| Cost | DO droplets + DB + Spaces | Free tier generous, scales with usage |

**The killer feature for StoryForge:** Convex's real-time reactivity means when a DJ submits a story for review, the producer's dashboard updates **instantly** — no polling, no WebSocket plumbing. When a producer adds an inline comment, the DJ sees it appear in real-time. This is the editorial collaboration experience that makes the workflow feel alive.

### Convex Schema (Replaces PostgreSQL)

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users (synced from WorkOS via webhooks)
  users: defineTable({
    workosUserId: v.string(),
    name: v.string(),
    email: v.string(),
    role: v.string(), // admin | producer | dj | contributor
    stations: v.array(v.string()), // ["88nine", "hyfin", "414music", "rhythmlab"]
    styleProfileId: v.optional(v.id("styleProfiles")),
    avatarUrl: v.optional(v.string()),
  })
    .index("by_workos_id", ["workosUserId"])
    .index("by_email", ["email"]),

  // Stations
  stations: defineTable({
    slug: v.string(), // "88nine", "hyfin", etc.
    name: v.string(),
    description: v.string(),
    voiceGuide: v.string(), // station voice description for ContentAgent
    systemPrompt: v.string(), // full system prompt for generation
  }).index("by_slug", ["slug"]),

  // Stories: Core entity
  stories: defineTable({
    title: v.string(),
    stationId: v.string(),
    creatorId: v.id("users"),
    status: v.string(), // transcribing | correcting | producing | generating | reviewing | producer_review | revision | approved | scheduled | published

    // Audio
    audioFileId: v.optional(v.id("_storage")), // Convex file storage
    audioDurationSeconds: v.optional(v.number()),
    editedAudioFileId: v.optional(v.id("_storage")), // exported edited assembly

    // Transcript reference
    transcriptId: v.optional(v.id("transcripts")),

    // Production State
    editOperations: v.optional(v.any()), // ordered list of text/audio edits
    assemblyState: v.optional(v.any()), // current waveform arrangement

    // DJ Steering
    selectedAngle: v.optional(v.string()),
    themes: v.optional(v.array(v.string())),
    emotionalTone: v.optional(v.string()),
    mustIncludeQuotes: v.optional(v.any()),
    excludeRanges: v.optional(v.any()),
    narrativeDirection: v.optional(v.string()),
    additionalContext: v.optional(v.string()),

    // Generated Content (each is a JSON object)
    airBreak: v.optional(v.any()),
    podcastSegment: v.optional(v.any()),
    socialThread: v.optional(v.any()),
    webArticle: v.optional(v.any()),
    newsletterCopy: v.optional(v.any()),
    pressRelease: v.optional(v.any()),

    // Sound Design
    soundAssets: v.optional(v.array(v.object({
      id: v.string(),
      name: v.string(),
      source: v.string(), // "elevenlabs" | "freesound" | "upload"
      fileId: v.id("_storage"),
      type: v.string(), // "sfx" | "music" | "ambient" | "stinger"
      prompt: v.optional(v.string()), // ElevenLabs prompt used
      freesoundId: v.optional(v.number()), // Freesound ID
      license: v.optional(v.string()), // CC license type
      attribution: v.optional(v.string()), // required attribution text
      durationSeconds: v.number(),
      waveformTrack: v.optional(v.number()), // which track in the waveform editor
    }))),

    // Approval Checkpoints
    transcriptApprovedAt: v.optional(v.number()),
    tapeApprovedAt: v.optional(v.number()),
    assemblyApprovedAt: v.optional(v.number()),
    scriptsApprovedAt: v.optional(v.number()),
    producerApprovedAt: v.optional(v.number()),
    producerApprovedBy: v.optional(v.id("users")),

    // Workflow
    assignedProducerId: v.optional(v.id("users")),
    scheduledDate: v.optional(v.number()),
    publishedDate: v.optional(v.number()),
  })
    .index("by_station", ["stationId"])
    .index("by_creator", ["creatorId"])
    .index("by_status", ["status"])
    .index("by_station_status", ["stationId", "status"]),

  // Transcripts
  transcripts: defineTable({
    storyId: v.id("stories"),

    // Raw Deepgram output
    rawSttJson: v.any(),

    // Structured
    markdown: v.string(),
    speakers: v.any(), // [{id, name, color}]
    durationSeconds: v.number(),
    wordTimestamps: v.any(), // [{word, start, end, confidence, speaker}]
    fillerWords: v.optional(v.any()), // [{word, start, end}]

    // AI Analysis
    storyAngles: v.optional(v.any()),
    keyQuotes: v.optional(v.any()),
    emotionalArc: v.optional(v.any()),

    // DJ Corrections
    corrections: v.optional(v.any()),
    offRecordRanges: v.optional(v.any()),

    // Search index - full text of transcript for search
    searchableText: v.string(), // plain text without timestamps for full-text search
  })
    .index("by_story", ["storyId"])
    .searchIndex("search_text", { searchField: "searchableText" }),

  // Style Profiles
  styleProfiles: defineTable({
    userId: v.id("users"),
    samples: v.any(), // uploaded writing samples
    analysis: v.any(), // AI-generated voice analysis
  }).index("by_user", ["userId"]),

  // Comments (inline on scripts AND audio timestamps)
  comments: defineTable({
    storyId: v.id("stories"),
    userId: v.id("users"),
    content: v.string(),
    formatType: v.optional(v.string()), // "air_break" | "podcast" | etc.
    lineReference: v.optional(v.number()),
    audioTimestampStart: v.optional(v.float64()),
    audioTimestampEnd: v.optional(v.float64()),
    parentCommentId: v.optional(v.id("comments")),
  })
    .index("by_story", ["storyId"])
    .index("by_parent", ["parentCommentId"]),

  // Notifications
  notifications: defineTable({
    userId: v.id("users"),
    type: v.string(),
    storyId: v.optional(v.id("stories")),
    checkpoint: v.optional(v.string()),
    message: v.string(),
    read: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_user_unread", ["userId", "read"]),

  // Sound Library (org-level reusable sounds)
  soundLibrary: defineTable({
    name: v.string(),
    description: v.string(),
    source: v.string(), // "elevenlabs" | "freesound" | "upload"
    fileId: v.id("_storage"),
    type: v.string(), // "sfx" | "music" | "ambient" | "stinger" | "transition"
    prompt: v.optional(v.string()),
    freesoundId: v.optional(v.number()),
    license: v.optional(v.string()),
    attribution: v.optional(v.string()),
    durationSeconds: v.number(),
    tags: v.array(v.string()),
    createdBy: v.id("users"),
  })
    .index("by_type", ["type"])
    .index("by_tags", ["tags"])
    .searchIndex("search_sounds", { searchField: "name", filterFields: ["type"] }),
});
```

### Convex Actions for External APIs

Convex actions handle calls to external services (Deepgram, ElevenLabs, Freesound, Gradient ADK agents):

```typescript
// convex/actions/elevenlabs.ts
"use node";
import { action } from "../_generated/server";
import { v } from "convex/values";

export const generateSoundEffect = action({
  args: {
    prompt: v.string(),
    durationSeconds: v.optional(v.number()),
    loop: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const response = await fetch(
      "https://api.elevenlabs.io/v1/sound-generation",
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: args.prompt,
          duration_seconds: args.durationSeconds,
          prompt_influence: 0.7,
          output_format: "mp3_44100_128",
          ...(args.loop && { looping: true }),
        }),
      }
    );

    const audioBuffer = await response.arrayBuffer();
    
    // Store in Convex file storage
    const fileId = await ctx.storage.store(
      new Blob([audioBuffer], { type: "audio/mpeg" })
    );

    return { fileId, durationSeconds: args.durationSeconds };
  },
});

export const generateMusic = action({
  args: {
    prompt: v.string(),      // "contemplative ambient piano, gentle, minimal"
    durationSeconds: v.number(),
    instrumental: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // ElevenLabs Music API (Eleven Music)
    const response = await fetch(
      "https://api.elevenlabs.io/v1/music/generate",
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: args.prompt,
          duration_seconds: args.durationSeconds,
          instrumental: args.instrumental ?? true,
        }),
      }
    );

    const audioBuffer = await response.arrayBuffer();
    const fileId = await ctx.storage.store(
      new Blob([audioBuffer], { type: "audio/mpeg" })
    );

    return { fileId };
  },
});


// convex/actions/freesound.ts
"use node";
import { action } from "../_generated/server";
import { v } from "convex/values";

export const searchFreesound = action({
  args: {
    query: v.string(),
    filter: v.optional(v.string()), // e.g., "license:Attribution" or "duration:[0 TO 30]"
    sort: v.optional(v.string()),   // "score" | "duration_asc" | "downloads_desc"
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const params = new URLSearchParams({
      query: args.query,
      token: process.env.FREESOUND_API_KEY!,
      fields: "id,name,description,duration,previews,license,tags,avg_rating,num_downloads",
      page_size: String(args.pageSize || 15),
    });
    if (args.filter) params.set("filter", args.filter);
    if (args.sort) params.set("sort", args.sort);

    const response = await fetch(
      `https://freesound.org/apiv2/search/text/?${params}`
    );
    const data = await response.json();

    return {
      count: data.count,
      results: data.results.map((sound: any) => ({
        id: sound.id,
        name: sound.name,
        description: sound.description,
        duration: sound.duration,
        previewUrl: sound.previews?.["preview-hq-mp3"] || sound.previews?.["preview-lq-mp3"],
        license: sound.license,
        tags: sound.tags,
        rating: sound.avg_rating,
        downloads: sound.num_downloads,
      })),
    };
  },
});

export const downloadFreesound = action({
  args: { soundId: v.number() },
  handler: async (ctx, args) => {
    // Get download URL
    const infoResponse = await fetch(
      `https://freesound.org/apiv2/sounds/${args.soundId}/?token=${process.env.FREESOUND_API_KEY!}&fields=download,name,license,username`
    );
    const info = await infoResponse.json();

    // Download the audio file
    const audioResponse = await fetch(info.download, {
      headers: { Authorization: `Token ${process.env.FREESOUND_API_KEY!}` },
    });
    const audioBuffer = await audioResponse.arrayBuffer();

    // Store in Convex
    const fileId = await ctx.storage.store(
      new Blob([audioBuffer], { type: "audio/mpeg" })
    );

    return {
      fileId,
      name: info.name,
      license: info.license,
      attribution: `"${info.name}" by ${info.username} via Freesound.org (${info.license})`,
    };
  },
});
```

---

## 3. SOUND DESIGN PANEL — ELEVENLABS + FREESOUND

### The Sound Palette

A new panel in the production workspace lets DJs find and create sounds for their stories:

```
┌─────────────────────────────────────────────────────┐
│  🎵 SOUND PALETTE                                    │
│                                                      │
│  [Generate AI Sound] [Search Freesound] [Upload]     │
│                                                      │
│  ┌─ AI GENERATE ──────────────────────────────────┐ │
│  │ Describe the sound you need:                    │ │
│  │ ┌────────────────────────────────────────────┐ │ │
│  │ │ soft rain on a porch roof, distant thunder │ │ │
│  │ └────────────────────────────────────────────┘ │ │
│  │ Duration: [15s ▼]  Loop: [☐]                   │ │
│  │ Type: [○ SFX  ● Ambient  ○ Music  ○ Stinger]  │ │
│  │                                                 │ │
│  │ [Generate Sound Effect]  [Generate Music Bed]   │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ┌─ FREESOUND SEARCH ─────────────────────────────┐ │
│  │ 🔍 [city ambience milwaukee               ]    │ │
│  │                                                 │ │
│  │ ▶ City Street Ambience    2:34  CC-BY  ★4.2    │ │
│  │ ▶ Urban Night Traffic     1:45  CC0    ★3.8    │ │
│  │ ▶ Neighborhood Morning    3:12  CC-BY  ★4.5    │ │
│  │                                                 │ │
│  │ [+ Add to Story]                                │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ┌─ STORY SOUNDS ─────────────────────────────────┐ │
│  │ 🔊 Rain ambient (AI, 15s, loop) [Track 3] [×] │ │
│  │ 🔊 City street (Freesound, CC-BY) [Track 4][×] │ │
│  │ 🎵 Contemplative piano (AI music) [Track 2][×] │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### How Sound Design Integrates Into the Workflow

**During Tape Selection (Step 4):**
DJ is assembling their story. CoachAgent suggests: "This interview was recorded in Marcus's kitchen — consider adding subtle room tone or neighborhood ambience to ground the listener in place."

DJ types "quiet neighborhood morning, birds, distant traffic" into the Sound Palette → ElevenLabs generates a 15-second looping ambient bed → DJ drops it onto Track 3 of the Waveform Playlist → adjusts volume to sit under the interview tape.

Alternatively, DJ searches Freesound for "milwaukee street" → finds a CC0 recording of a real Milwaukee neighborhood → downloads and adds it. Real sound. Real place. That's the Radio Milwaukee way.

**During Music Bed Selection:**
CoachAgent suggests: "Your story's emotional tone is elegiac — contemplative piano or ambient guitar would work. For the data section about census numbers, consider something slightly more rhythmic to carry the listener through the stats."

DJ types "contemplative ambient piano, gentle, minimal, 30 seconds" → ElevenLabs Music API generates a royalty-free instrumental → DJ previews, adjusts, adds to Track 2.

**For Stingers and Transitions:**
DJ needs a 2-second transition sound between tape segments. Types "soft whoosh transition, subtle" → generates instantly → drops between clips on the waveform.

### CoachAgent Sound Suggestions

The CoachAgent can proactively suggest sound design based on the story's content and emotional arc:

"Based on your story about the Riverwest corner store closing:
- **Opening:** Ambient sound of a busy store (bell chime, register) — ElevenLabs can generate this
- **Middle (data section):** Low rhythmic pulse to carry the census statistics
- **Closing (Marcus's final quote):** Strip to silence before his last line, then gentle piano swell
- **Transition between tape segments:** Soft room tone crossfades instead of hard cuts"

### Attribution Tracking

Freesound requires Creative Commons attribution. StoryForge automatically:
1. Stores the license type and required attribution text for every Freesound download
2. Generates an attribution list when exporting/publishing
3. Includes attribution in show notes and web article footer
4. Warns if a CC-NC (non-commercial) sound is used in commercial contexts

---

## 4. TRANSCRIPT SEARCH — HINDENBURG-STYLE "FIND IN AUDIO"

### Type a Word, Find Your Spot

Hindenburg's transcript search is one of its best features: type a word, and the interface highlights every instance in the transcript and lets you jump between them. With word-level timestamps from Deepgram, StoryForge replicates this exactly — and goes further.

### Search Implementation

```
┌─────────────────────────────────────────────────────┐
│  🔍 TRANSCRIPT SEARCH                               │
│  ┌───────────────────────────────────────────────┐  │
│  │ gentrification                          [×]   │  │
│  └───────────────────────────────────────────────┘  │
│  7 results  ◀ 3 of 7 ▶                              │
│                                                      │
│  00:14:32 — "...the ▶gentrification◀ started..."    │
│  00:18:45 — "...call it ▶gentrification◀ but..."    │
│  00:22:10 — "...fighting ▶gentrification◀ in..."    │
│  00:28:03 — "...▶gentrification◀ isn't just..."     │
│  00:31:17 — "...beyond ▶gentrification◀, this..."   │
│  00:35:42 — "...▶gentrification◀ has taken..."      │
│  00:41:08 — "...▶gentrification◀ in Riverwest..."   │
│                                                      │
│  Click any result to jump to that moment in audio.   │
│  Press Enter or ▶ to cycle through results.          │
└─────────────────────────────────────────────────────┘
```

**How it works:**

1. **Convex search index** on the transcript's `searchableText` field enables full-text search across all transcripts (for the Discovery Dashboard — "find all interviews where someone mentioned 'gentrification'")

2. **Client-side word search** within the current transcript for instant results — search the `wordTimestamps` array, which maps every word to its exact position in the audio

3. **Keyboard navigation** — Enter cycles through matches. Each match highlights in the transcript editor AND moves the waveform playhead to that timestamp.

4. **Advanced search:** Search by speaker ("Marcus: gentrification"), by time range ("gentrification after 20:00"), or as a phrase ("gentrification isn't just")

```typescript
// Client-side transcript search
function searchTranscript(
  wordTimestamps: WordTimestamp[],
  query: string
): SearchResult[] {
  const queryLower = query.toLowerCase();
  const results: SearchResult[] = [];

  // Single word search
  if (!query.includes(" ")) {
    wordTimestamps.forEach((word, index) => {
      if (word.word.toLowerCase().includes(queryLower)) {
        results.push({
          wordIndex: index,
          timestamp: word.start,
          speaker: word.speaker,
          // Get surrounding context (5 words before/after)
          context: wordTimestamps
            .slice(Math.max(0, index - 5), index + 6)
            .map(w => w.word)
            .join(" "),
        });
      }
    });
  }
  // Phrase search
  else {
    const queryWords = queryLower.split(" ");
    for (let i = 0; i <= wordTimestamps.length - queryWords.length; i++) {
      const match = queryWords.every(
        (qw, j) => wordTimestamps[i + j].word.toLowerCase().includes(qw)
      );
      if (match) {
        results.push({
          wordIndex: i,
          timestamp: wordTimestamps[i].start,
          endTimestamp: wordTimestamps[i + queryWords.length - 1].end,
          speaker: wordTimestamps[i].speaker,
          context: wordTimestamps
            .slice(Math.max(0, i - 3), i + queryWords.length + 3)
            .map(w => w.word)
            .join(" "),
        });
      }
    }
  }
  return results;
}
```

### Cross-Story Search (Discovery Dashboard)

From the Story Discovery Dashboard, DJs can search across ALL transcripts in the archive:

"Search: `gentrification Riverwest`"
→ Returns 4 stories across 2 stations where these terms appear
→ Click any result → opens that story, jumps to the exact timestamp
→ Prevents duplicate coverage, enables story continuity

This uses Convex's built-in search index on the `searchableText` field.

---

## 5. EXPORT FORMATS — SUBTITLES, SHOW NOTES, AND MORE

### Export Types

Beyond WAV audio export, StoryForge generates multiple text export formats from the word-level transcript data:

| Format | Extension | Use Case |
|--------|-----------|----------|
| **SRT Subtitles** | `.srt` | YouTube, Vimeo, social video captions |
| **WebVTT** | `.vtt` | HTML5 video, web players, podcast players with chapters |
| **Plain Text** | `.txt` | Website transcriptions, accessibility, archival |
| **Show Notes (Markdown)** | `.md` | Podcast show notes with timestamps, chapters, links |
| **EDL (Edit Decision List)** | `.edl` | Import edit points into Hindenburg, Audition, Pro Tools |
| **WAV Audio** | `.wav` | Edited assembly with all tracks mixed, broadcast-ready |

### SRT Export

```
1
00:00:14,320 --> 00:00:18,450
I watched my neighbors leave
one by one.

2
00:00:18,900 --> 00:00:24,100
First the family on the corner,
then the couple who ran the
corner store for thirty years.

3
00:00:25,200 --> 00:00:29,800
[DJ Tarik] What does that feel like,
watching your block change?

4
00:00:30,500 --> 00:00:36,200
It's like grieving someone
who's still alive. The street
is there but the soul left.
```

### WebVTT Export (with speaker labels and styling)

```
WEBVTT

NOTE Created by StoryForge - Radio Milwaukee

STYLE
::cue(.speaker-marcus) { color: #4A9EFF; }
::cue(.speaker-tarik) { color: #FF6B4A; }

00:00:14.320 --> 00:00:18.450
<v Marcus Washington><c.speaker-marcus>I watched my neighbors leave one by one.</c></v>

00:00:18.900 --> 00:00:24.100
<v Marcus Washington><c.speaker-marcus>First the family on the corner, then the couple who ran the corner store for thirty years.</c></v>

00:00:25.200 --> 00:00:29.800
<v DJ Tarik><c.speaker-tarik>What does that feel like, watching your block change?</c></v>
```

### Show Notes Export (Markdown with chapters)

```markdown
# Building Home: Marcus Washington on Riverwest

**Published:** February 15, 2026
**Station:** 88Nine Radio Milwaukee
**Host:** DJ Tarik
**Duration:** 12:34

## Chapters
- 00:00 - Introduction
- 00:14 - Marcus on watching neighbors leave
- 02:45 - The corner store that closed
- 05:12 - Census data: Riverwest demographics 1990-2025
- 07:30 - What gentrification feels like
- 10:15 - Hope: the community land trust movement
- 11:45 - Closing thoughts

## Key Quotes
> "I watched my neighbors leave one by one." — Marcus Washington (00:14)
> "It's like grieving someone who's still alive." — Marcus Washington (00:30)

## Links & Resources
- Milwaukee Community Land Trust: [link]
- Census data source: [link]

## Credits
Sound design: Rain ambient generated via ElevenLabs
Music: "Contemplative Piano" generated via ElevenLabs
"City Street Ambience" by user123 via Freesound.org (CC-BY 4.0)
```

### Export Implementation

```typescript
// convex/actions/exports.ts
export const generateSRT = action({
  args: { transcriptId: v.id("transcripts") },
  handler: async (ctx, args) => {
    const transcript = await ctx.runQuery(internal.transcripts.get, {
      id: args.transcriptId,
    });

    const words = transcript.wordTimestamps;
    let srt = "";
    let segmentIndex = 1;
    let segmentWords: typeof words = [];
    let segmentDuration = 0;

    for (const word of words) {
      segmentWords.push(word);
      segmentDuration = word.end - segmentWords[0].start;

      // Break segment at sentence boundaries or ~5 seconds
      const isEndOfSentence = word.word.match(/[.!?]$/);
      if (isEndOfSentence || segmentDuration > 5) {
        const start = formatSRTTime(segmentWords[0].start);
        const end = formatSRTTime(word.end);
        const text = segmentWords.map(w => w.word).join(" ");

        srt += `${segmentIndex}\n${start} --> ${end}\n${text}\n\n`;
        segmentIndex++;
        segmentWords = [];
        segmentDuration = 0;
      }
    }

    // Store as file
    const blob = new Blob([srt], { type: "text/plain" });
    const fileId = await ctx.storage.store(blob);
    return { fileId, filename: `${transcript.storyId}_subtitles.srt` };
  },
});

function formatSRTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}
```

---

## 6. UPDATED TECHNICAL ARCHITECTURE

### Complete System Stack (v5.1)

```
┌───────────────────────────────────────────────────────┐
│                     FRONTEND                           │
│  React + Tailwind + shadcn/ui (PWA)                   │
│                                                        │
│  ┌─────────────────┐  ┌────────────────────────────┐  │
│  │ BBC Transcript   │◄►│ Waveform Playlist v7       │  │
│  │ Editor           │  │ (multi-track + annotations)│  │
│  └────────┬─────────┘  └──────────────┬─────────────┘  │
│           └──── TranscriptAudioSync ──┘                │
│                                                        │
│  ┌────────────────┐  ┌────────────────────────────┐   │
│  │ Sound Palette   │  │ Export Panel               │   │
│  │ (EL SFX/Music + │  │ (.srt .vtt .txt .md .wav)  │   │
│  │  Freesound)     │  │                            │   │
│  └────────────────┘  └────────────────────────────┘   │
│                                                        │
│  WorkOS AuthKit (login, org switcher, role checks)     │
├────────────────────────────────────────────────────────┤
│                   CONVEX BACKEND                       │
│  Real-time reactive database + file storage            │
│  TypeScript mutations, queries, actions                │
│  WorkOS JWT validation (first-party integration)       │
│  Convex search indexes for transcript full-text search │
│  Convex file storage for audio files + exports         │
│  Scheduled functions for notifications + cleanup       │
├────────────────────────────────────────────────────────┤
│          CONVEX ACTIONS (External API Calls)           │
│  ┌────────────┐ ┌───────────┐ ┌─────────────────┐    │
│  │ Deepgram   │ │ElevenLabs │ │ Freesound       │    │
│  │ Nova-2     │ │ SFX+Music │ │ APIv2           │    │
│  │ (STT)      │ │ API       │ │ (CC sounds)     │    │
│  └────────────┘ └───────────┘ └─────────────────┘    │
├────────────────────────────────────────────────────────┤
│               GRADIENT ADK AGENTS                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│  │ Coach    │ │Transcript│ │ Content  │              │
│  │ Agent    │ │ Agent    │ │ Agent    │              │
│  └──────────┘ └──────────┘ └──────────┘              │
│            ┌──────────────┐                           │
│            │  Workflow    │                           │
│            │  Agent       │                           │
│            └──────────────┘                           │
│                                                        │
│  LangGraph StateGraph (orchestration)                  │
│  DO Knowledge Bases (RAG - 3 collections)              │
│  DO Serverless Inference (Claude Sonnet 4.5)           │
├────────────────────────────────────────────────────────┤
│               WORKOS (Auth Layer)                      │
│  Organizations (station groups)                        │
│  Roles & Permissions (admin/producer/dj/contributor)   │
│  User Invites (email-based onboarding)                 │
│  SSO-ready (enterprise station groups)                 │
│  Free to 1M users                                      │
└────────────────────────────────────────────────────────┘
```

### API Integration Summary

| Service | Purpose | Pricing | Key Feature |
|---------|---------|---------|-------------|
| **Convex** | Backend, DB, file storage, real-time | Free tier generous | Real-time reactivity, WorkOS integration |
| **WorkOS** | Auth, orgs, roles, invites | Free to 1M users | First-party Convex integration, RBAC |
| **Deepgram** | Speech-to-text | Pay per minute | Word-level timestamps (enables everything) |
| **ElevenLabs** | Sound effects + music | Pay per generation | Text-to-SFX, text-to-music, royalty-free |
| **Freesound** | CC-licensed sound library | Free (non-commercial) | 600K+ sounds, API search, similarity search |
| **Gradient ADK** | AI agent orchestration | DO platform | Multi-agent deployment, tracing, eval |
| **Claude Sonnet 4.5** | Content generation | Per token | Superior creative writing for broadcast |
| **DO Knowledge Bases** | RAG for coaching + context | DO platform | Managed semantic chunking |

---

## 7. UPDATED MVP SCOPE

### Week 1 Additions
- Convex project setup with WorkOS AuthKit (using official template)
- WorkOS organization + roles configuration
- User invite flow
- Convex file storage for audio uploads
- Transcript search index setup

### Week 2 Additions
- Sound Palette UI component
- ElevenLabs SFX API integration (generate + preview + add to waveform)
- Freesound API search + download integration
- Transcript search (type word → find in audio → keyboard nav)
- License/attribution tracking for Freesound sounds

### Week 3 Additions
- ElevenLabs Music API integration (music bed generation)
- CoachAgent sound design suggestions
- Sound Library (org-level, reusable across stories)
- Multi-track waveform with sound assets on dedicated tracks

### Week 4 Additions  
- Export panel: SRT, VTT, TXT, show notes (Markdown)
- WAV export with all tracks mixed
- Attribution list auto-generation for exports
- Permission checks on all mutations (role-based)
- Demo polish with real sound design

---

## 8. UPDATED DEMO SCRIPT ADDITIONS

### [Add to 0:30-1:15 section — after showing text-based editing:]

"And sound design? Type 'soft rain on a porch roof' — AI generates it in seconds. Or search Freesound's 600,000 Creative Commons sounds for real Milwaukee street ambience. Drop it onto Track 3. Now the listener is THERE."

### [Add to 1:50-2:20 section — after multi-track assembly:]

"Search the transcript: type 'gentrification' — 7 matches, keyboard navigate between them, each one jumps the audio to that exact moment. No scrubbing. No guessing."

"Export: one click gives you SRT subtitles for YouTube, VTT for the web player, show notes with chapters and timestamps, and the full WAV mix for the engineer. Every platform, every format."

### [Add to 2:20-3:00 section — The Impact:]

"And any station can get started in 2 minutes. Create an organization, invite your team, assign roles — admin, producer, DJ. WorkOS handles auth. Convex handles real-time. Your producer sees the DJ's submission appear instantly. No refresh. No email. Just... there."

---

## 9. NARRATION RECORDER, LENGTH CUSTOMIZER & AUTO-ASSEMBLY ENGINE

### The Core Principle: DJ Voice, AI Everything Else

AI does NOT narrate. The DJ's voice is their brand — it's why listeners tune in. The division of labor:

| AI Does | DJ Does |
|---------|---------|
| Writes the script | Records narration in their own voice |
| Selects optimal tape cuts | Reviews and adjusts tape selection |
| Arranges the timeline | Fine-tunes the arrangement |
| Generates music + SFX | Chooses which sounds to keep |
| Mixes levels + crossfades | Previews and approves final mix |
| Exports all formats | Publishes |

The result: a **fully produced audio piece** — DJ narration + interview tape + music + SFX + crossfades — assembled automatically from the script the DJ approved and the narration they recorded.

---

### 9.1 LENGTH CUSTOMIZER

Before ContentAgent generates scripts, the DJ sets the target length. This isn't just "make it shorter" — it fundamentally changes the story structure.

#### UI: Length Steering Panel

```
┌─────────────────────────────────────────────────────────┐
│  📐 STORY LENGTH                                         │
│                                                          │
│  ┌─ PRESETS ──────────────────────────────────────────┐  │
│  │  [Air Break]  [Feature]  [Podcast]  [Custom]       │  │
│  │   90 sec       3:00       8:00       ___           │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  Target Length: ◄━━━━━━━━━━━●━━━━━━━━━━► 3:00           │
│                0:30                      12:00            │
│                                                          │
│  ┌─ BREAKDOWN PREVIEW ────────────────────────────────┐  │
│  │  At 3:00, ContentAgent will aim for:               │  │
│  │                                                     │  │
│  │  ██████░░░░░░░░░░░░░░░░░░░░░░░░  Narration ~65s    │  │
│  │  ░░░░░░████████████░░░░░░░░░░░░  Tape ~85s         │  │
│  │  ░░░░░░░░░░░░░░░░░░░████████░░  Music ~30s         │  │
│  │                                                     │  │
│  │  Estimated tape segments: 3-4                       │  │
│  │  Narration blocks: 4-5                              │  │
│  │  Recommended max tape cut: 25 sec                   │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ ADVANCED ─────────────────────────────────────────┐  │
│  │  Narration/Tape ratio:  ◄━━━━●━━━━━━━━► More tape  │  │
│  │  Music bed:             [✓] Under narration         │  │
│  │                         [✓] Under tape (ducked)     │  │
│  │                         [ ] Between segments only    │  │
│  │  Opening style:         [● Narration first]         │  │
│  │                         [○ Cold open (tape first)]  │  │
│  │                         [○ Music + narration]       │  │
│  │  Closing style:         [○ Narration button]        │  │
│  │                         [● Final tape + music out]  │  │
│  │                         [○ Music bed fade]          │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

#### Length Presets

| Preset | Length | Structure | Use Case |
|--------|--------|-----------|----------|
| **Air Break** | 60-90 sec | 2-3 narration blocks, 1-2 tape cuts, tight | Between songs on-air |
| **Feature** | 2:30-4:00 | 4-5 narration blocks, 3-4 tape cuts, music bed | News segment, morning show |
| **Podcast Segment** | 5:00-10:00 | 6-8 narration blocks, 5-7 tape cuts, fuller soundscape | Podcast episode chapter |
| **Custom** | 0:30-15:00 | Slider, DJ controls all parameters | Any format |

#### How Length Affects Script Generation

ContentAgent receives the length target and selected tape as constraints. It reverse-engineers the script:

```typescript
// ContentAgent script generation prompt (simplified)
const generateTimedScript = `
You are writing a radio script for ${station.name}.

CONSTRAINTS:
- Target total length: ${targetSeconds} seconds
- Available tape cuts (DJ-selected, cannot be changed):
  ${selectedTape.map(t => `- "${t.preview}" [${t.duration}s, ${t.start}-${t.end}]`).join('\n')}
- Total tape time: ${totalTapeSeconds}s
- Available for narration: ${targetSeconds - totalTapeSeconds - musicPadding}s
- Narration pace: ~150 words per minute (${station.name} house style)
- Opening style: ${openingStyle}
- Closing style: ${closingStyle}

GENERATE a script with exact timing:
- Each NARRATION block: include word count and estimated seconds
- Each TAPE block: reference exact timestamp from DJ's selections
- Each MUSIC CUE: fade in/out/duck instructions
- Total must hit ${targetSeconds}s ± 5 seconds

DJ's steering: angle="${selectedAngle}", tone="${emotionalTone}"
DJ's narrative direction: "${narrativeDirection}"
`;
```

The output is a **timed script** — every block has a start time, duration, and type:

```
SCRIPT: "Building Home" — 88Nine Radio Milwaukee
TARGET: 3:00 | ACTUAL ESTIMATE: 2:55

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[MUSIC CUE: Fade in contemplative piano, 3s lead-in]

NARRATION #1 [0:03-0:18] ~38 words, ~15s
"On Burleigh Street in Riverwest, there's a corner store that's
been closed for two years. The sign is still up. The awning is
still there. But Marcus Washington says that's the thing about
gentrification — the buildings stay. The people don't."

[MUSIC CUE: Duck under tape, -12dB]

TAPE #1 [0:18-0:44] Marcus_14:32-14:58 [26s, DJ-selected]
"I watched my neighbors leave one by one. First the family
on the corner, then the couple who ran the corner store for
thirty years..."

NARRATION #2 [0:44-0:56] ~30 words, ~12s
"Marcus has lived on this block for twenty-two years. He's watched
the property values climb while his neighbors disappeared. The
census tells the same story in numbers."

TAPE #2 [0:56-1:19] Marcus_22:15-22:38 [23s, DJ-selected]
"I walked past three boarded-up houses on my own block.
Three. And someone from out of state bought two of them
sight unseen..."

[MUSIC CUE: Shift to slightly rhythmic bed for data section]

NARRATION #3 [1:19-1:42] ~56 words, ~23s
"Between 2010 and 2024, Riverwest lost thirty-one percent of its
Black residents. Median home prices tripled. And a new report from
the Milwaukee Housing Authority shows that for every homeowner who
sells in the 53212 zip code, three are replaced by rental investors.
But Marcus sees something else starting to happen."

[MUSIC CUE: Strip to silence, 1s pause before final tape]

TAPE #3 [1:43-2:12] Marcus_35:42-36:11 [29s, DJ-selected]
"The community land trust, that's the thing that gives me hope.
Because it's saying — we're not just gonna watch this happen.
We're gonna own this block. Together. And nobody can flip it..."

[MUSIC CUE: Gentle piano returns, fade in under narration]

NARRATION #4 [2:12-2:30] ~42 words, ~18s
"The Riverwest Community Land Trust has acquired four properties
so far. Marcus is helping them find more. He says he's not
fighting for his block to stay the same — he's fighting for the
people on it to have a choice."

[MUSIC CUE: Piano swell, 8s fade out to end]

TAPE #4 [2:30-2:47] Marcus_41:08-41:25 [17s, DJ-selected]
"This is home. And home isn't a building. Home is knowing your
neighbor's name. That's what we're trying to keep."

[MUSIC CUE: Final piano note, ring out 5s, fade to silence]

END — ESTIMATED TOTAL: 2:55

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### 9.2 NARRATION RECORDER

The DJ records narration blocks directly in the browser. No external software needed (though they can import from Audition if preferred).

#### UI: Narration Recording Mode

When the DJ clicks "Record Narration" after approving the script, the workspace transforms:

```
┌─────────────────────────────────────────────────────────────┐
│  🎙️ NARRATION RECORDING MODE                     [Exit]    │
│                                                              │
│  ┌─ WAVEFORM (read-only preview) ────────────────────────┐  │
│  │  ░░░░▓▓▓▓▓▓▓▓▓▓▓░░░▓▓▓▓▓▓▓▓▓░░░▓▓▓▓▓▓▓▓░░░▓▓▓▓▓▓▓  │  │
│  │  NAR1  TAPE1       NAR2  TAPE2   NAR3     NAR4 TAPE4  │  │
│  │  [REC] [done]      [REC] [done]  [done]   [ ] [ ]     │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ CURRENT BLOCK: NARRATION #1 ─────────────────────────┐  │
│  │                                                         │  │
│  │  Target: ~15 seconds (38 words)                         │  │
│  │                                                         │  │
│  │  ┌─ TELEPROMPTER ───────────────────────────────────┐  │  │
│  │  │                                                   │  │  │
│  │  │  "On Burleigh Street in Riverwest, there's a     │  │  │
│  │  │   corner store that's been closed for two years.  │  │  │
│  │  │   The sign is still up. The awning is still       │  │  │
│  │  │   there. But Marcus Washington says that's the    │  │  │
│  │  │   thing about gentrification — the buildings      │  │  │
│  │  │   stay. The people don't."                        │  │  │
│  │  │                                                   │  │  │
│  │  └───────────────────────────────────────────────────┘  │  │
│  │                                                         │  │
│  │  📝 Or improvise — this is a guide, not a script.      │  │
│  │     Say it in your own words if that feels better.      │  │
│  │                                                         │  │
│  │  ┌─ RECORDING ──────────────────────────────────────┐  │  │
│  │  │                                                   │  │  │
│  │  │   ⏺ 00:00:00          Level: ▁▂▃▅▇▅▃▂▁          │  │  │
│  │  │                                                   │  │  │
│  │  │   [⏺ Record]  [⏹ Stop]  [▶ Play Back]           │  │  │
│  │  │                                                   │  │  │
│  │  │   Takes:                                          │  │  │
│  │  │   ▶ Take 1: 16.2s  ★ [Use This]                 │  │  │
│  │  │   ▶ Take 2: 14.8s    [Use This]                  │  │  │
│  │  │   ▶ Take 3: 15.5s    [Use This]                  │  │  │
│  │  │                                                   │  │  │
│  │  └───────────────────────────────────────────────────┘  │  │
│  │                                                         │  │
│  │  [← Previous Block]  [Skip — I'll record later]        │  │
│  │  [✓ Accept & Next Block →]                              │  │
│  │                                                         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ PROGRESS ────────────────────────────────────────────┐  │
│  │  Block 1 of 4  ████░░░░░░░░░░░░  25%                  │  │
│  │  Narration recorded: 16.2s of ~65s target              │  │
│  │  Estimated total with tape: 2:58                       │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ CONTEXT ─────────────────────────────────────────────┐  │
│  │  ▶ Preview what comes BEFORE this block (tape/music)   │  │
│  │  ▶ Preview what comes AFTER this block (tape/music)    │  │
│  │  This helps you match your energy and pacing.          │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

#### Key Features

**Teleprompter Mode:** The script text appears in large, readable format. DJ reads it or improvises — the script is a guide, not a cage. The text auto-scrolls if the DJ enables it.

**Multiple Takes:** DJ can record as many takes as they want per block. Each take is stored. They pick the best one. Star rating for quick comparison.

**Context Preview:** Before recording, the DJ can hear what comes right before and after this narration block (the tape cut, the music cue). This helps them match energy, pacing, and emotional tone. Critical for making the piece flow.

**Live Level Meter:** Real-time audio level visualization so the DJ can see if they're too hot or too quiet. Color-coded: green (good), yellow (loud), red (clipping).

**Running Time Estimate:** As each narration block is recorded, the progress panel shows actual vs. target duration. If the DJ's narration runs 20 seconds over, they see it immediately and can trim or re-record.

**Skip & Return:** DJs can skip blocks and come back. Maybe they want to record the opening last after they've felt the rhythm of the piece.

**Import Option:** "Import from file" button on each block for DJs who prefer recording in Adobe Audition or their booth and bringing WAV/MP3 files in.

#### Technical: Browser Recording

```typescript
// Narration recorder using Web Audio API + MediaRecorder
class NarrationRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext;
  private analyser: AnalyserNode;
  private chunks: Blob[] = [];

  async startRecording(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 48000,
        channelCount: 1,
      },
    });

    this.audioContext = new AudioContext({ sampleRate: 48000 });
    const source = this.audioContext.createMediaStreamSource(stream);

    // Analyser for live level meter
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    source.connect(this.analyser);

    // Record as WAV-quality (PCM) for broadcast use
    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: "audio/webm;codecs=pcm", // lossless
    });

    this.chunks = [];
    this.mediaRecorder.ondataavailable = (e) => {
      this.chunks.push(e.data);
    };

    this.mediaRecorder.start(100); // 100ms chunks for streaming level data
  }

  async stopRecording(): Promise<{ blob: Blob; durationSeconds: number }> {
    return new Promise((resolve) => {
      this.mediaRecorder!.onstop = async () => {
        const blob = new Blob(this.chunks, { type: "audio/webm" });
        const duration = await this.getAudioDuration(blob);
        resolve({ blob, durationSeconds: duration });
      };
      this.mediaRecorder!.stop();
    });
  }

  // Returns current audio level (0-1) for the level meter UI
  getLevel(): number {
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const normalized = (data[i] - 128) / 128;
      sum += normalized * normalized;
    }
    return Math.sqrt(sum / data.length);
  }
}
```

#### Convex: Narration Storage

```typescript
// convex/schema.ts — additions
narrationTakes: defineTable({
  storyId: v.id("stories"),
  blockIndex: v.number(),         // which narration block (0, 1, 2, 3...)
  takeNumber: v.number(),         // take 1, 2, 3...
  audioFileId: v.id("_storage"),  // Convex file storage
  durationSeconds: v.number(),
  isSelected: v.boolean(),        // DJ's chosen take for this block
  recordedBy: v.id("users"),
})
  .index("by_story_block", ["storyId", "blockIndex"])
  .index("by_story", ["storyId"]),
```

---

### 9.3 AUTO-ASSEMBLY ENGINE

Once all narration blocks are recorded and the DJ clicks "Assemble Story," the Auto-Assembly Engine builds the finished audio piece.

#### What It Does

Takes the timed script + DJ's recorded narration + DJ's selected tape + music beds + SFX → arranges everything on the multi-track waveform timeline → applies crossfades, volume ducking, fade-ins/outs → produces a single mixed audio piece ready for broadcast.

#### Assembly Process (Step by Step)

```
INPUT:
├── Timed Script (from ContentAgent)
│   ├── NARRATION #1: "On Burleigh Street..." [target: 15s]
│   ├── TAPE #1: Marcus_14:32-14:58 [26s]
│   ├── NARRATION #2: "Marcus has lived..." [target: 12s]
│   ├── TAPE #2: Marcus_22:15-22:38 [23s]
│   ├── NARRATION #3: "Between 2010 and 2024..." [target: 23s]
│   ├── TAPE #3: Marcus_35:42-36:11 [29s]
│   ├── NARRATION #4: "The Riverwest Community..." [target: 18s]
│   └── TAPE #4: Marcus_41:08-41:25 [17s]
│
├── DJ Narration Takes (selected best take per block)
│   ├── narration_1.webm — 16.2s (actual)
│   ├── narration_2.webm — 11.8s (actual)
│   ├── narration_3.webm — 24.1s (actual)
│   └── narration_4.webm — 17.5s (actual)
│
├── Interview Tape (original upload, with edit regions)
│   └── marcus_interview.wav — DJ's selected tape cuts
│
├── Music Beds
│   └── contemplative_piano.mp3 — AI-generated, 60s loop
│
└── SFX / Ambient
    └── neighborhood_morning.mp3 — Freesound, CC0

ASSEMBLY ENGINE PROCESS:

1. TIMELINE CALCULATION
   Recalculate actual durations from recorded narration
   (script said 15s for block 1, DJ recorded 16.2s — adjust)
   New total estimate: 2:58 → 3:05 (close enough, or flag)

2. TRACK LAYOUT (5 tracks)
   Track 1 — Narration:  [NAR1][gap][NAR2][gap][NAR3][gap][NAR4]
   Track 2 — Tape:       [gap][TAPE1][gap][TAPE2][gap][TAPE3][gap][TAPE4]
   Track 3 — Music Bed:  [piano, continuous, volume automated]
   Track 4 — SFX/Ambient:[neighborhood_morning, looped, vol automated]
   Track 5 — Mix Bus:    [auto-generated full mix]

3. CROSSFADES & TRANSITIONS
   Between NAR1→TAPE1: 150ms crossfade
   Between TAPE1→NAR2: 200ms crossfade
   Between TAPE2→NAR3: 50ms hard cut (music shift covers transition)
   Between NAR4→TAPE4: 1000ms silence (dramatic pause per script)

4. VOLUME AUTOMATION
   Music bed: 0dB during intro → duck to -14dB under narration
              → duck to -12dB under tape → 0dB between segments
              → swell to 0dB at outro → fade out over 5s
   Ambient:   -18dB constant under everything (subtle presence)
   Narration: 0dB (reference level)
   Tape:      -1dB (slightly under narration for consistency)

5. RENDER
   Mix all tracks → single stereo WAV at 48kHz/24bit
   Also generate MP3 at 192kbps for preview/web
   Store both in Convex file storage

OUTPUT:
├── building_home_mix.wav    — broadcast-ready (48kHz/24bit)
├── building_home_mix.mp3    — web/preview (192kbps)
├── building_home_project/   — individual track files (for engineer)
│   ├── track1_narration.wav
│   ├── track2_tape.wav
│   ├── track3_music.wav
│   └── track4_sfx.wav
└── Assembly loaded on waveform for DJ to preview & adjust
```

#### UI: Post-Assembly Review

After auto-assembly, the DJ sees the complete piece on the waveform editor:

```
┌─────────────────────────────────────────────────────────────┐
│  ✅ AUTO-ASSEMBLY COMPLETE — "Building Home" — 3:05          │
│                                                              │
│  ▶ ■ ⏪ ⏩              01:23 / 03:05                        │
│                                                              │
│  Track 1 (Narration)                                         │
│  ▓▓▓▓▓▓▓░░░░░░░░░░░▓▓▓▓▓░░░░░░░░░░▓▓▓▓▓▓▓▓░░░▓▓▓▓▓▓░░░  │
│  NAR 1                NAR 2          NAR 3       NAR 4       │
│                                                              │
│  Track 2 (Interview Tape)                                    │
│  ░░░░░░░▓▓▓▓▓▓▓▓▓▓▓░░░░░▓▓▓▓▓▓▓▓▓░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓  │
│          TAPE 1           TAPE 2              TAPE 3+4       │
│                                                              │
│  Track 3 (Music: Contemplative Piano)                        │
│  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  │
│  ╌╌vol curve╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌  │
│                                                              │
│  Track 4 (Ambient: Neighborhood Morning)                     │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ ⚠️ Total: 3:05 (target was 3:00, +5s — within range)   │ │
│  │ ✅ All narration blocks recorded                        │ │
│  │ ✅ All tape cuts placed                                  │ │
│  │ ✅ Music bed ducking applied                             │ │
│  │ ✅ Crossfades applied (4 transitions)                    │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  [▶ Play Full Mix]  [🔧 Adjust in Editor]  [📤 Export]      │
│                                                              │
│  DJ can still:                                               │
│  • Drag clips to adjust timing                               │
│  • Trim narration (maybe cut a few words from block 3)       │
│  • Adjust music volume curves                                │
│  • Re-record any narration block                             │
│  • Swap tape cuts                                            │
│  • Add/remove SFX                                            │
│  The assembly is a starting point, not a locked render.      │
└─────────────────────────────────────────────────────────────┘
```

#### Technical: Assembly Engine

```typescript
// convex/actions/assembly.ts
"use node";
import { action } from "../_generated/server";
import { v } from "convex/values";

interface ScriptBlock {
  type: "narration" | "tape" | "music_cue";
  index: number;
  targetSeconds: number;
  // For tape blocks:
  sourceStart?: number;  // timestamp in original interview
  sourceEnd?: number;
  // For music cues:
  instruction?: string;  // "fade in", "duck", "fade out", etc.
}

interface AssemblyTrack {
  trackId: number;
  name: string;
  clips: AssemblyClip[];
  volumeAutomation: VolumePoint[];
}

interface AssemblyClip {
  sourceFileId: string;       // Convex storage ID
  sourceStartSeconds: number; // where to start in source file
  sourceEndSeconds: number;   // where to end in source file
  timelineStartSeconds: number; // where to place on timeline
  fadeInMs: number;
  fadeOutMs: number;
}

interface VolumePoint {
  timeSeconds: number;
  volumeDb: number; // 0 = unity, -14 = ducked, -Infinity = silence
}

export const assembleStory = action({
  args: {
    storyId: v.id("stories"),
  },
  handler: async (ctx, args) => {
    // 1. Fetch all inputs
    const story = await ctx.runQuery(internal.stories.get, { id: args.storyId });
    const script = story.generatedScript; // timed script from ContentAgent
    const narrationTakes = await ctx.runQuery(
      internal.narrationTakes.getSelectedByStory,
      { storyId: args.storyId }
    );
    const soundAssets = story.soundAssets || [];

    // 2. Calculate actual timeline from real narration durations
    let currentTime = 0;
    const tracks: AssemblyTrack[] = [
      { trackId: 1, name: "Narration", clips: [], volumeAutomation: [] },
      { trackId: 2, name: "Interview Tape", clips: [], volumeAutomation: [] },
      { trackId: 3, name: "Music Bed", clips: [], volumeAutomation: [] },
      { trackId: 4, name: "SFX / Ambient", clips: [], volumeAutomation: [] },
    ];

    const musicVolumePoints: VolumePoint[] = [];

    for (const block of script.blocks) {
      if (block.type === "narration") {
        const take = narrationTakes.find(t => t.blockIndex === block.index);
        if (!take) continue;

        // Place narration on Track 1
        tracks[0].clips.push({
          sourceFileId: take.audioFileId,
          sourceStartSeconds: 0,
          sourceEndSeconds: take.durationSeconds,
          timelineStartSeconds: currentTime,
          fadeInMs: 0,
          fadeOutMs: 50,
        });

        // Duck music under narration
        musicVolumePoints.push(
          { timeSeconds: currentTime - 0.3, volumeDb: 0 },
          { timeSeconds: currentTime, volumeDb: -14 },
          { timeSeconds: currentTime + take.durationSeconds, volumeDb: -14 },
          { timeSeconds: currentTime + take.durationSeconds + 0.3, volumeDb: 0 },
        );

        currentTime += take.durationSeconds;
      }

      if (block.type === "tape") {
        // Crossfade between previous block and tape
        const crossfadeMs = 150;
        currentTime -= crossfadeMs / 1000; // overlap slightly

        tracks[1].clips.push({
          sourceFileId: story.audioFileId!, // original interview
          sourceStartSeconds: block.sourceStart!,
          sourceEndSeconds: block.sourceEnd!,
          timelineStartSeconds: currentTime,
          fadeInMs: crossfadeMs,
          fadeOutMs: crossfadeMs,
        });

        // Duck music under tape (less than narration)
        musicVolumePoints.push(
          { timeSeconds: currentTime - 0.2, volumeDb: 0 },
          { timeSeconds: currentTime, volumeDb: -12 },
          { timeSeconds: currentTime + (block.sourceEnd! - block.sourceStart!), volumeDb: -12 },
          { timeSeconds: currentTime + (block.sourceEnd! - block.sourceStart!) + 0.2, volumeDb: 0 },
        );

        currentTime += (block.sourceEnd! - block.sourceStart!);
      }

      if (block.type === "music_cue") {
        // Handle fade in/out/duck based on instruction
        if (block.instruction === "fade_in") {
          musicVolumePoints.push(
            { timeSeconds: currentTime, volumeDb: -60 },
            { timeSeconds: currentTime + 3, volumeDb: 0 },
          );
        }
        if (block.instruction === "fade_out") {
          musicVolumePoints.push(
            { timeSeconds: currentTime, volumeDb: 0 },
            { timeSeconds: currentTime + 5, volumeDb: -60 },
          );
        }
      }
    }

    // Place music bed on Track 3 (full duration, looped if needed)
    const musicAsset = soundAssets.find(a => a.type === "music");
    if (musicAsset) {
      tracks[2].clips.push({
        sourceFileId: musicAsset.fileId,
        sourceStartSeconds: 0,
        sourceEndSeconds: currentTime, // loop/extend to fill
        timelineStartSeconds: 0,
        fadeInMs: 3000,
        fadeOutMs: 5000,
      });
      tracks[2].volumeAutomation = musicVolumePoints;
    }

    // Place ambient on Track 4 (low volume, full duration)
    const ambientAsset = soundAssets.find(a => a.type === "ambient");
    if (ambientAsset) {
      tracks[3].clips.push({
        sourceFileId: ambientAsset.fileId,
        sourceStartSeconds: 0,
        sourceEndSeconds: currentTime,
        timelineStartSeconds: 0,
        fadeInMs: 2000,
        fadeOutMs: 3000,
      });
      tracks[3].volumeAutomation = [
        { timeSeconds: 0, volumeDb: -18 }, // subtle throughout
      ];
    }

    // 3. Save assembly state to story
    await ctx.runMutation(internal.stories.updateAssembly, {
      storyId: args.storyId,
      assemblyState: {
        tracks,
        totalDurationSeconds: currentTime,
        targetDurationSeconds: script.targetSeconds,
        assembledAt: Date.now(),
      },
    });

    // 4. The frontend loads this assembly state into
    //    Waveform Playlist v7 for preview and further editing.
    //    Final WAV export happens client-side via Web Audio API
    //    or server-side via FFmpeg in a Convex action.

    return {
      totalDurationSeconds: currentTime,
      trackCount: tracks.length,
      clipCount: tracks.reduce((sum, t) => sum + t.clips.length, 0),
    };
  },
});
```

#### WAV Export: Server-Side Mix

For the final broadcast-ready WAV, a Convex action uses FFmpeg:

```typescript
// convex/actions/export.ts
export const mixToWav = action({
  args: { storyId: v.id("stories") },
  handler: async (ctx, args) => {
    const story = await ctx.runQuery(internal.stories.get, { id: args.storyId });
    const assembly = story.assemblyState;

    // Download all source audio files from Convex storage
    // Build FFmpeg filter complex for mixing
    // Apply volume automation, crossfades, timing
    // Render to 48kHz/24bit WAV

    // FFmpeg filter complex (simplified):
    // [0:a]atrim=start=0:end=16.2,adelay=3000|3000[nar1];
    // [1:a]atrim=start=14.32:end=14.58,adelay=19000|19000[tape1];
    // ... etc for all clips
    // [nar1][tape1][nar2]...[music_ducked]amix=inputs=N[out]

    const wavBlob = await runFfmpegMix(assembly);
    const wavFileId = await ctx.storage.store(wavBlob);
    const mp3Blob = await convertToMp3(wavBlob);
    const mp3FileId = await ctx.storage.store(mp3Blob);

    await ctx.runMutation(internal.stories.update, {
      storyId: args.storyId,
      editedAudioFileId: wavFileId,
      previewAudioFileId: mp3FileId,
    });

    return { wavFileId, mp3FileId };
  },
});
```

---

## 10. ORGANIZATION STORY BOARD — THE DIGITAL NEWSROOM

### The Concept

Every newsroom has a whiteboard (or Slack channel, or shared spreadsheet) where the team sees what stories are in play. StoryForge digitizes this with real-time updates powered by Convex. Every user in the organization sees all active stories — full transparency.

### 10.1 STORY BOARD UI

```
┌─────────────────────────────────────────────────────────────────┐
│  📋 STORY BOARD — Radio Milwaukee                    [All ▼]    │
│                                                                  │
│  Filter: [All Stations ▼] [All People ▼] [All Stages ▼] 🔍     │
│                                                                  │
│  ┌─ IN PROGRESS ──────────────────────────────────────────────┐ │
│  │                                                             │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │ 🎙 "Building Home: Riverwest Gentrification"         │  │ │
│  │  │ 88Nine · DJ Tarik · Feature (3:00)                    │  │ │
│  │  │ Stage: ████████████████░░░░ Recording Narration       │  │ │
│  │  │ Updated: 12 min ago                                   │  │ │
│  │  │ 💬 3 suggestions · 📝 2 producer notes                │  │ │
│  │  │ [Open] [Suggest Tip →]                                │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │                                                             │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │ 🎙 "Black Business Displacement on King Drive"       │  │ │
│  │  │ HYFIN · DJ Jay · Podcast Segment (8:00)              │  │ │
│  │  │ Stage: ████████████░░░░░░░░ Generating Content        │  │ │
│  │  │ Updated: 1 hour ago                                   │  │ │
│  │  │ 💬 1 suggestion · 📝 0 producer notes                 │  │ │
│  │  │ ⚠️ Related: Tarik's Riverwest story covers overlap   │  │ │
│  │  │ [Open] [Suggest Tip →]                                │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │                                                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ AWAITING REVIEW ──────────────────────────────────────────┐ │
│  │                                                             │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │ 🎙 "Fiserv Forum Workers Speak Out"                  │  │ │
│  │  │ 88Nine · DJ Marcus · Air Break (90s)                  │  │ │
│  │  │ Stage: ██████████████████░░ Producer Review            │  │ │
│  │  │ Submitted: 3 hours ago · Assigned: Sarah (Producer)   │  │ │
│  │  │ 💬 5 suggestions · 📝 1 producer note (pending)       │  │ │
│  │  │ [Open] [Suggest Tip →]                                │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │                                                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ RECENTLY PUBLISHED ───────────────────────────────────────┐ │
│  │                                                             │ │
│  │  ✅ "Cream City Brick: Milwaukee's Architectural..." — 2d  │ │
│  │  ✅ "New Streetcar Extension Opens to Bronzeville" — 4d    │ │
│  │  ✅ "Local Brewing Scene After the Hop Shortage" — 1w      │ │
│  │                                                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ STORY IDEAS (not yet started) ────────────────────────────┐ │
│  │                                                             │ │
│  │  💡 "MPS Budget Hearing Thursday" — suggested by Kim        │ │
│  │  💡 "New mural on Center Street" — suggested by Jay         │ │
│  │  💡 "Juneteenth prep at Sherman Park" — suggested by Tarik  │ │
│  │  [+ Add Story Idea]                                         │ │
│  │                                                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

#### Board Sections

| Section | What's Shown | Who Can See |
|---------|-------------|-------------|
| **In Progress** | Stories being actively worked on — transcribing, editing, recording, generating | All users |
| **Awaiting Review** | Stories submitted for producer approval | All users |
| **Recently Published** | Last 10 published stories | All users |
| **Story Ideas** | Pitched ideas not yet started | All users |

#### Story Card Details

Each card shows:
- **Title** and target format (Air Break / Feature / Podcast)
- **Station** brand (88Nine / HYFIN / 414 Music / Rhythm Lab)
- **Creator** (which DJ or contributor)
- **Stage** with visual progress bar and label
- **Last updated** (real-time via Convex)
- **Counts** of suggestions and producer notes
- **Cross-station alerts** when another story has overlap (detected by TranscriptAgent)
- **Quick actions:** Open (if you have access) or Suggest Tip

#### Stage Progress Visualization

```
Transcribing → Correcting → Producing → Recording → Generating → Reviewing → Producer Review → Approved → Published
     5%           15%          30%         50%          65%          75%            85%           95%       100%
```

#### Convex: Board Queries (Real-Time)

```typescript
// convex/queries/storyBoard.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

// Real-time: every user sees live updates automatically
export const getOrgStoryBoard = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Get user's org info from their profile
    const user = await ctx.db
      .query("users")
      .withIndex("by_workos_id", (q) => q.eq("workosUserId", identity.subject))
      .unique();

    // All stories in this org, grouped by status
    const allStories = await ctx.db.query("stories").collect();

    const inProgress = allStories.filter(s =>
      ["transcribing", "correcting", "producing", "recording", "generating", "reviewing"]
        .includes(s.status)
    );

    const awaitingReview = allStories.filter(s =>
      s.status === "producer_review"
    );

    const recentlyPublished = allStories
      .filter(s => s.status === "published")
      .sort((a, b) => (b.publishedDate || 0) - (a.publishedDate || 0))
      .slice(0, 10);

    // Enrich with suggestion counts, producer note counts, creator names
    const enriched = await Promise.all(
      [...inProgress, ...awaitingReview].map(async (story) => {
        const suggestions = await ctx.db
          .query("suggestions")
          .withIndex("by_story", (q) => q.eq("storyId", story._id))
          .collect();
        const comments = await ctx.db
          .query("comments")
          .withIndex("by_story", (q) => q.eq("storyId", story._id))
          .collect();
        const creator = await ctx.db.get(story.creatorId);

        return {
          ...story,
          creatorName: creator?.name,
          suggestionCount: suggestions.length,
          producerNoteCount: comments.filter(c => c.isProducerNote).length,
        };
      })
    );

    return {
      inProgress: enriched.filter(s => inProgress.some(ip => ip._id === s._id)),
      awaitingReview: enriched.filter(s => awaitingReview.some(ar => ar._id === s._id)),
      recentlyPublished,
    };
  },
});
```

Because this is a Convex `query`, the Story Board is **reactive** — when a DJ moves a story from "recording" to "generating," every team member's board updates instantly. No refresh, no polling.

---

### 10.2 SUGGESTIONS & TIPS THREAD

Any user in the org can suggest a tip, idea, or resource on any visible story. This is NOT the same as producer notes/feedback — it's a lightweight, low-friction way for the team to help each other.

#### UI: Suggestions Panel (on Story Card)

```
┌─────────────────────────────────────────────────────────────┐
│  💬 SUGGESTIONS — "Building Home: Riverwest Gentrification" │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 💡 Jay (DJ, HYFIN) — 2 hours ago                     │   │
│  │ "I interviewed someone on this same block last month  │   │
│  │  for the Black business piece. Want the tape? She     │   │
│  │  talks about her landlord tripling rent."             │   │
│  │  👍 2                                      [Reply]    │   │
│  │                                                       │   │
│  │  └─ Tarik (DJ, 88Nine) — 1 hour ago                  │   │
│  │     "Yes! Can you share the file? That would be       │   │
│  │      perfect for the narration bridge."               │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 💡 Kim (Contributor, 414 Music) — 5 hours ago         │   │
│  │ "City council is voting on the Riverwest TIF          │   │
│  │  district Thursday. Might be worth mentioning."       │   │
│  │  👍 4                                      [Reply]    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 💡 Sarah (Producer, 88Nine) — 6 hours ago             │   │
│  │ "Milwaukee Journal Sentinel did a data piece on       │   │
│  │  53212 property flips last week. Good source for      │   │
│  │  your census stats narration block."                  │   │
│  │  📎 [link attached]                                    │   │
│  │  👍 1                                      [Reply]    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Type a suggestion, tip, or idea...                    │   │
│  │ [📎 Attach link]  [🎵 Share audio]  [Submit →]       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### Key Design Decisions

**Low friction:** No categories, no required fields. Just type and submit. Like a group chat, not a ticketing system.

**Threaded replies:** So the DJ can respond without cluttering the main thread.

**Upvotes:** Simple 👍 so the team can signal which suggestions are worth pursuing. Most-upvoted float to top.

**Attachments:** Links and audio file references — so Jay can share actual tape from his interview.

**Distinct from producer notes:** Suggestions appear on the Story Board card and in a side panel. Producer notes/feedback appear inline in the script and on the waveform (attached to specific lines/timestamps). Different tools for different purposes.

#### Convex Schema: Suggestions

```typescript
// Add to convex/schema.ts
suggestions: defineTable({
  storyId: v.id("stories"),
  userId: v.id("users"),
  content: v.string(),
  attachmentUrl: v.optional(v.string()),
  attachmentFileId: v.optional(v.id("_storage")),
  parentSuggestionId: v.optional(v.id("suggestions")), // for threaded replies
  upvotes: v.array(v.id("users")), // user IDs who upvoted
  createdAt: v.number(),
})
  .index("by_story", ["storyId"])
  .index("by_parent", ["parentSuggestionId"]),

// Add to story ideas (pre-production pitches on the board)
storyIdeas: defineTable({
  title: v.string(),
  description: v.string(),
  suggestedBy: v.id("users"),
  station: v.optional(v.string()),
  upvotes: v.array(v.id("users")),
  status: v.string(), // "open" | "claimed" | "archived"
  claimedBy: v.optional(v.id("users")),
  createdAt: v.number(),
})
  .index("by_status", ["status"]),
```

#### Permissions for Suggestions

| Action | Admin | Producer | DJ | Contributor |
|--------|:---:|:---:|:---:|:---:|
| View all suggestions on any story | ✅ | ✅ | ✅ | ✅ |
| Add suggestion to any story | ✅ | ✅ | ✅ | ✅ |
| Reply to suggestions | ✅ | ✅ | ✅ | ✅ |
| Upvote suggestions | ✅ | ✅ | ✅ | ✅ |
| Delete own suggestion | ✅ | ✅ | ✅ | ✅ |
| Delete any suggestion | ✅ | ❌ | ❌ | ❌ |
| Add story idea to board | ✅ | ✅ | ✅ | ✅ |
| Claim a story idea | ✅ | ✅ | ✅ | ❌ |

---

### 10.3 PRODUCER/ADMIN EDITING & FEEDBACK

Producers and admins don't just comment — they can directly edit any story in the organization. But every edit is tracked, and the DJ always sees what changed.

#### Edit Access Model

```
┌─────────────────────────────────────────────────────────┐
│ WHO CAN DO WHAT ON A STORY                              │
│                                                          │
│ CREATOR (DJ who started it):                             │
│ ✅ Full edit access to everything                        │
│ ✅ Can see all suggestions, notes, edit history          │
│ ✅ Can accept/reject producer edits                      │
│                                                          │
│ PRODUCER (assigned or any producer):                     │
│ ✅ Can edit script text (narration blocks)               │
│ ✅ Can reorder/add/remove tape selections                │
│ ✅ Can adjust assembly (move clips, change crossfades)   │
│ ✅ Can add inline notes on script lines + audio times    │
│ ✅ Can approve/reject at checkpoints                     │
│ ✅ Can change story steering (angle, tone, themes)       │
│ ❌ Cannot delete the story                               │
│ ❌ Cannot re-record DJ's narration                       │
│                                                          │
│ ADMIN:                                                   │
│ ✅ Everything a producer can do                          │
│ ✅ Can delete stories                                    │
│ ✅ Can reassign stories to different DJs                 │
│ ✅ Can reassign producer reviewer                        │
│                                                          │
│ DJ (not the creator):                                    │
│ ✅ Can view the story (read-only)                        │
│ ✅ Can add suggestions                                   │
│ ❌ Cannot edit                                           │
│                                                          │
│ CONTRIBUTOR:                                             │
│ ✅ Can view the story card on the board                  │
│ ✅ Can add suggestions                                   │
│ ❌ Cannot open the full production workspace             │
│ ❌ Cannot edit                                           │
└─────────────────────────────────────────────────────────┘
```

#### Producer Inline Notes

Producers leave feedback attached to specific locations — either a script line or an audio timestamp or both:

```
┌─────────────────────────────────────────────────────────────┐
│  SCRIPT VIEW — "Building Home"                               │
│                                                              │
│  NARRATION #1                                                │
│  "On Burleigh Street in Riverwest, there's a corner store   │
│   that's been closed for two years. The sign is still up.    │
│   The awning is still there. But Marcus Washington says ◄──┐ │
│   that's the thing about gentrification — the buildings     │ │
│   stay. The people don't."                                  │ │
│                                                         ┌───┘ │
│   📝 Sarah (Producer) — 10 min ago                      │     │
│   │ "Stronger if you open with Marcus's quote            │     │
│   │  instead. Cold open, then you come in with           │     │
│   │  context. Listeners hear his voice first."           │     │
│   │ 📍 Refers to TAPE #1 at 14:32                       │     │
│   │ [Resolve] [Reply]                                    │     │
│   └─────────────────────────────────────────────────     │     │
│                                                              │
│  TAPE #1 [14:32-14:58] Marcus_interview.wav                  │
│  ▶ "I watched my neighbors leave one by one..."             │
│   📝 Sarah (Producer) — 8 min ago                            │
│   │ "This is gold. Consider extending to 15:10 —           │
│   │  he says 'and nobody asked us' right after.            │
│   │  Stronger ending for the cut."                         │
│   │ 📍 Audio: 14:58-15:10                                   │
│   │ [▶ Play 14:58-15:10] [Resolve] [Reply]                │
│   └─────────────────────────────────────────────────        │
│                                                              │
│  NARRATION #3                                                │
│  "Between 2010 and 2024, Riverwest lost thirty-one percent  │
│   of its Black residents."                                   │
│   📝 Sarah (Producer) — 5 min ago                            │
│   │ ✏️ EDIT: Changed "thirty-one percent" to "nearly a     │
│   │  third" — sounds more natural when spoken.             │
│   │  Original preserved in edit history.                    │
│   │ [Accept Edit] [Reject Edit] [Reply]                    │
│   └─────────────────────────────────────────────────        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Producer Note Types

| Type | Icon | What It Does |
|------|------|-------------|
| **Comment** | 📝 | Feedback — DJ reads and decides how to act |
| **Edit** | ✏️ | Direct change to script text — DJ can accept or reject |
| **Suggestion** | 💡 | "Consider doing X" — softer than an edit |
| **Required Change** | ⚠️ | Must be addressed before approval (blocks progress) |
| **Approval** | ✅ | Producer signs off on a checkpoint |

#### Convex Schema: Comments & Notes (updated)

```typescript
// Updated comments table in convex/schema.ts
comments: defineTable({
  storyId: v.id("stories"),
  userId: v.id("users"),
  type: v.string(), // "comment" | "edit" | "suggestion" | "required_change" | "approval"
  content: v.string(),

  // Location anchors (at least one should be set)
  scriptBlockIndex: v.optional(v.number()),  // which narration/tape block
  scriptLineText: v.optional(v.string()),    // the specific text being referenced
  audioTimestampStart: v.optional(v.float64()),
  audioTimestampEnd: v.optional(v.float64()),

  // For edits: what was changed
  originalText: v.optional(v.string()),
  editedText: v.optional(v.string()),

  // Resolution
  status: v.string(), // "open" | "accepted" | "rejected" | "resolved"
  resolvedBy: v.optional(v.id("users")),
  resolvedAt: v.optional(v.number()),

  // Threading
  parentCommentId: v.optional(v.id("comments")),

  // Flags
  isProducerNote: v.boolean(),
  blocksProgress: v.boolean(), // if true, story can't advance until resolved

  createdAt: v.number(),
})
  .index("by_story", ["storyId"])
  .index("by_story_status", ["storyId", "status"])
  .index("by_parent", ["parentCommentId"]),
```

---

### 10.4 EDIT HISTORY & TRACK CHANGES

Every edit to a story — by the DJ or by a producer — is recorded. The DJ always knows what changed, when, and by whom. Like Google Docs version history.

#### UI: Edit History Panel

```
┌─────────────────────────────────────────────────────────────┐
│  📜 EDIT HISTORY — "Building Home"                           │
│                                                              │
│  ┌─ Today ────────────────────────────────────────────────┐ │
│  │                                                         │ │
│  │  2:34 PM — Sarah (Producer)                             │ │
│  │  ✏️ Script: Changed Narration #3                        │ │
│  │  - "lost thirty-one percent of its Black residents"     │ │
│  │  + "lost nearly a third of its Black residents"         │ │
│  │  Status: Pending DJ acceptance                          │ │
│  │  [View in context] [Accept] [Reject]                    │ │
│  │                                                         │ │
│  │  2:22 PM — Sarah (Producer)                             │ │
│  │  📝 Added note on Tape #1: "Extend to 15:10"           │ │
│  │  [View in context]                                      │ │
│  │                                                         │ │
│  │  2:15 PM — Sarah (Producer)                             │ │
│  │  📝 Added note on Narration #1: "Try cold open"        │ │
│  │  [View in context]                                      │ │
│  │                                                         │ │
│  │  1:45 PM — Tarik (DJ) — Auto                           │ │
│  │  🎙️ Recorded Narration #2, Take 3 (selected)           │ │
│  │  Duration: 11.8s                                        │ │
│  │                                                         │ │
│  │  1:30 PM — Tarik (DJ) — Auto                           │ │
│  │  🎙️ Recorded Narration #1, Take 1 (selected)           │ │
│  │  Duration: 16.2s                                        │ │
│  │                                                         │ │
│  │  12:45 PM — Tarik (DJ)                                  │ │
│  │  🤖 Generated 6 content formats (air break, podcast...) │ │
│  │  Length target: 3:00, Feature format                     │ │
│  │                                                         │ │
│  │  12:30 PM — Tarik (DJ)                                  │ │
│  │  📐 Set steering: angle="gentrification", tone="elegiac"│ │
│  │  Selected 4 tape cuts, total tape: 95s                  │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─ Yesterday ────────────────────────────────────────────┐ │
│  │                                                         │ │
│  │  4:15 PM — Tarik (DJ)                                   │ │
│  │  ✅ Approved transcript (Checkpoint 1)                   │ │
│  │                                                         │ │
│  │  3:45 PM — Tarik (DJ)                                   │ │
│  │  ✂️ Deleted 47 filler words from transcript              │ │
│  │  ✂️ Marked 2 sections as off-record                      │ │
│  │  ✏️ Renamed Speaker 1 → "Marcus Washington"              │ │
│  │                                                         │ │
│  │  3:00 PM — System                                       │ │
│  │  🎤 Transcription complete: 45:12, 2 speakers detected  │ │
│  │                                                         │ │
│  │  2:55 PM — Tarik (DJ)                                   │ │
│  │  📤 Uploaded interview audio: marcus_interview.wav       │ │
│  │  Story created: "Building Home"                          │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  [Load older history...]                                     │
└─────────────────────────────────────────────────────────────┘
```

#### Convex Schema: Edit History

```typescript
// Add to convex/schema.ts
editHistory: defineTable({
  storyId: v.id("stories"),
  userId: v.optional(v.id("users")), // null for system events
  action: v.string(),
  // Action types:
  // "story_created" | "audio_uploaded" | "transcription_complete"
  // "transcript_edit" | "filler_words_deleted" | "off_record_marked"
  // "speaker_renamed" | "checkpoint_approved"
  // "tape_selected" | "tape_removed" | "tape_reordered"
  // "steering_set" | "content_generated"
  // "narration_recorded" | "narration_rerecorded"
  // "assembly_created" | "assembly_modified"
  // "script_edited" | "sound_added" | "sound_removed"
  // "producer_note_added" | "producer_edit"
  // "status_changed" | "producer_approved" | "published"

  details: v.any(), // JSON with action-specific details
  // For script edits: { blockIndex, originalText, editedText }
  // For tape changes: { action: "added"|"removed", timestamp, duration }
  // For status changes: { from, to }
  // etc.

  createdAt: v.number(),
})
  .index("by_story", ["storyId"])
  .index("by_story_time", ["storyId", "createdAt"]),
```

#### How Edits Are Tracked

Every Convex mutation that modifies a story also writes to `editHistory`:

```typescript
// convex/mutations/stories.ts
export const updateScript = mutation({
  args: {
    storyId: v.id("stories"),
    blockIndex: v.number(),
    originalText: v.string(),
    newText: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const user = await getUserFromIdentity(ctx, identity!);

    // Check permissions
    const story = await ctx.db.get(args.storyId);
    const isOwner = story!.creatorId === user._id;
    const isProducerOrAdmin = ["admin", "producer"].includes(user.role);

    if (!isOwner && !isProducerOrAdmin) {
      throw new Error("No edit permission");
    }

    // Apply the edit
    const script = story!.generatedScript;
    script.blocks[args.blockIndex].text = args.newText;
    await ctx.db.patch(args.storyId, { generatedScript: script });

    // Record in edit history
    await ctx.db.insert("editHistory", {
      storyId: args.storyId,
      userId: user._id,
      action: "script_edited",
      details: {
        blockIndex: args.blockIndex,
        originalText: args.originalText,
        editedText: args.newText,
        // If producer editing DJ's story, also create a comment
        isProducerEdit: !isOwner && isProducerOrAdmin,
      },
      createdAt: Date.now(),
    });

    // If a producer edited a DJ's story, also create a pending comment
    if (!isOwner && isProducerOrAdmin) {
      await ctx.db.insert("comments", {
        storyId: args.storyId,
        userId: user._id,
        type: "edit",
        content: `Changed narration block ${args.blockIndex + 1}`,
        scriptBlockIndex: args.blockIndex,
        originalText: args.originalText,
        editedText: args.newText,
        status: "open", // DJ must accept or reject
        isProducerNote: true,
        blocksProgress: false,
        createdAt: Date.now(),
      });

      // Notify the DJ
      await ctx.db.insert("notifications", {
        userId: story!.creatorId,
        type: "producer_edit",
        storyId: args.storyId,
        message: `${user.name} edited Narration #${args.blockIndex + 1} in "${story!.title}"`,
        read: false,
      });
    }
  },
});
```

---

### 10.5 NOTIFICATION SYSTEM — THREE LAYERS

Notifications operate on three layers, each serving a different purpose:

| Layer | Purpose | Technology | When |
|-------|---------|-----------|------|
| **In-App** | Real-time, you're in StoryForge | Convex reactive queries + Sonner toasts | Always, while in app |
| **Email** | You're away, something needs action | Resend + React Email templates | When away + urgent |
| **Slack** | Team-wide visibility, newsroom pulse | Incoming Webhook (MVP) → Slack Bolt.js (future) | Story-level events |

Each layer filters differently. Slack gets team-awareness events. Email gets "you need to act" events. In-app gets everything but only while you're there.

---

#### 10.5.1 IN-APP NOTIFICATIONS (Convex Real-Time)

No extra library needed — Convex provides reactivity for free. The `useQuery` hook keeps a live WebSocket connection to the notifications table. When a new notification is inserted, every client running that query updates instantly. No polling, no push infrastructure.

**Notification Bell Component:**

```typescript
// Real-time notification subscription in React
function NotificationBell() {
  const notifications = useQuery(api.notifications.getUnread);
  const markRead = useMutation(api.notifications.markRead);

  return (
    <Popover>
      <PopoverTrigger>
        <Bell />
        {notifications?.length > 0 && (
          <Badge>{notifications.length}</Badge>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-96 max-h-[500px] overflow-y-auto">
        {notifications?.map((n) => (
          <NotificationItem
            key={n._id}
            notification={n}
            onClick={() => {
              markRead({ id: n._id });
              // Deep link: jumps to specific script line, audio timestamp,
              // suggestion thread, or edit history entry
              navigateToStory(n.storyId, n.deepLink);
            }}
          />
        ))}
        {notifications?.length === 0 && (
          <p className="text-muted-foreground text-center py-8">
            All caught up ✓
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
```

**Toast Notifications (Sonner):**

For events that happen while the user is actively working in the app, a toast pops up immediately. Sonner ships with shadcn/ui — already in the stack, zero additional dependencies.

```typescript
// Hook into Convex subscription for live toasts
function useNotificationToasts() {
  const latestNotification = useQuery(api.notifications.getLatest);
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  useEffect(() => {
    if (latestNotification && latestNotification._id !== lastSeen) {
      setLastSeen(latestNotification._id);

      toast(latestNotification.message, {
        description: latestNotification.detail,
        action: {
          label: "View",
          onClick: () => navigateToStory(
            latestNotification.storyId,
            latestNotification.deepLink
          ),
        },
      });
    }
  }, [latestNotification]);
}
```

**Convex Schema: Notifications (updated)**

```typescript
// convex/schema.ts
notifications: defineTable({
  userId: v.id("users"),            // who gets notified
  type: v.string(),
  // Types: "story_submitted" | "producer_note" | "producer_edit"
  // | "required_change" | "story_approved" | "story_returned"
  // | "new_suggestion" | "story_idea_claimed" | "cross_station_overlap"
  // | "narration_recorded" | "assembly_complete" | "story_published"
  storyId: v.optional(v.id("stories")),
  triggeredBy: v.optional(v.id("users")), // who caused the notification
  message: v.string(),              // "Sarah left a note on Narration #1"
  detail: v.optional(v.string()),   // additional context for toast
  deepLink: v.optional(v.object({   // where to navigate on click
    section: v.string(),            // "script" | "waveform" | "suggestions" | "history"
    blockIndex: v.optional(v.number()),
    audioTimestamp: v.optional(v.float64()),
    commentId: v.optional(v.id("comments")),
    suggestionId: v.optional(v.id("suggestions")),
  })),
  read: v.boolean(),
  emailSent: v.boolean(),           // track whether email was dispatched
  createdAt: v.number(),
})
  .index("by_user_unread", ["userId", "read"])
  .index("by_user_time", ["userId", "createdAt"]),
```

---

#### 10.5.2 EMAIL NOTIFICATIONS (Resend + React Email)

**Why Resend:**
- Built for transactional email from apps (not marketing/newsletters)
- Free tier: 3,000 emails/month (more than enough for a radio station)
- React Email: write email templates in JSX — same language as the frontend
- Simple API: single fetch call from a Convex action
- Used by Vercel, Cal.com, Dub — production-grade
- No SMTP configuration, no Mailgun complexity

**What Gets Emailed (and What Doesn't):**

Not everything deserves an email. The default is: **email for things that need action, skip for FYIs.**

| Event | Email? | Rationale |
|-------|:---:|-----------|
| Producer makes direct edit | ✅ Always | Your content was changed — you need to accept or reject |
| Required change flagged | ✅ Always | Blocks your story's progress |
| Story approved | ✅ Always | You've been waiting for this |
| Story sent back for revision | ✅ Always | Needs your attention to proceed |
| Story submitted for review | ✅ To producer | Producer needs to take action |
| Story idea claimed | ✅ To pitcher | Your idea is being worked on |
| Cross-station overlap detected | ✅ Both creators | Potential coordination needed |
| Producer adds comment | ✅ If away | Useful but not blocking — only email if user is inactive |
| New suggestion on your story | ❌ Digest | Nice to know, bundled into daily digest |
| Someone upvoted your suggestion | ❌ Never | Low priority, in-app only |
| Story status changed | ❌ Never | Slack handles team awareness |

Users can override these defaults in notification preferences (per-event toggles in Settings).

**Implementation: Convex Action → Resend API**

```typescript
// convex/actions/email.ts
"use node";
import { action, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Called by the notification dispatcher after inserting an in-app notification
export const sendNotificationEmail = internalAction({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const notification = await ctx.runQuery(
      internal.notifications.get, { id: args.notificationId }
    );
    const user = await ctx.runQuery(
      internal.users.get, { id: notification.userId }
    );

    // 1. Check user's email preferences for this event type
    const prefs = user.notificationPrefs || DEFAULT_PREFS;
    if (!prefs.email[notification.type]) return;

    // 2. Don't email if user is currently active in the app
    //    (they'll see the in-app notification + toast)
    const FIVE_MINUTES = 5 * 60 * 1000;
    if (user.lastActiveAt > Date.now() - FIVE_MINUTES) {
      // Mark as "skipped — user was active" so we don't re-send later
      await ctx.runMutation(internal.notifications.markEmailSkipped, {
        id: args.notificationId,
        reason: "user_active",
      });
      return;
    }

    // 3. Build and send email via Resend
    const story = notification.storyId
      ? await ctx.runQuery(internal.stories.get, { id: notification.storyId })
      : null;
    const triggeredByUser = notification.triggeredBy
      ? await ctx.runQuery(internal.users.get, { id: notification.triggeredBy })
      : null;

    const { subject, body } = buildEmailContent(notification, story, triggeredByUser);

    await resend.emails.send({
      from: "StoryForge <notifications@storyforge.fm>",
      to: user.email,
      subject,
      react: StoryForgeEmail({
        userName: user.name,
        subject,
        body,
        storyTitle: story?.title,
        actionUrl: `https://app.storyforge.fm/story/${notification.storyId}`,
        actionLabel: getActionLabel(notification.type),
      }),
    });

    // 4. Mark notification as emailed
    await ctx.runMutation(internal.notifications.markEmailSent, {
      id: args.notificationId,
    });
  },
});

// Email content builder
function buildEmailContent(
  notification: any,
  story: any,
  triggeredBy: any,
): { subject: string; body: string } {
  switch (notification.type) {
    case "producer_edit":
      return {
        subject: `✏️ ${triggeredBy.name} edited "${story.title}"`,
        body: `${triggeredBy.name} made a direct edit to ${notification.detail}. Open the story to review and accept or reject the change.`,
      };
    case "required_change":
      return {
        subject: `⚠️ Required change on "${story.title}"`,
        body: `${triggeredBy.name} flagged a required change: "${notification.detail}". This must be resolved before the story can advance.`,
      };
    case "story_approved":
      return {
        subject: `✅ "${story.title}" approved!`,
        body: `${triggeredBy.name} approved your story. It's ready for publishing.`,
      };
    case "story_returned":
      return {
        subject: `📝 "${story.title}" needs revision`,
        body: `${triggeredBy.name} sent your story back with feedback. Open the story to see their notes.`,
      };
    case "story_submitted":
      return {
        subject: `🎙️ "${story.title}" submitted for review`,
        body: `${triggeredBy.name} submitted a new story for your review: "${story.title}" (${story.format}, ${story.targetLength}).`,
      };
    default:
      return {
        subject: notification.message,
        body: notification.detail || notification.message,
      };
  }
}
```

**React Email Template:**

```tsx
// emails/StoryForgeEmail.tsx
import {
  Body, Button, Container, Head, Heading,
  Hr, Html, Preview, Section, Text,
} from "@react-email/components";

interface StoryForgeEmailProps {
  userName: string;
  subject: string;
  body: string;
  storyTitle?: string;
  actionUrl: string;
  actionLabel: string;
}

export default function StoryForgeEmail({
  userName, subject, body, storyTitle, actionUrl, actionLabel,
}: StoryForgeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <Body style={{ fontFamily: "system-ui, sans-serif", background: "#f4f4f5" }}>
        <Container style={{ background: "#fff", borderRadius: 8, padding: 32, margin: "40px auto", maxWidth: 480 }}>

          <Text style={{ fontSize: 14, color: "#71717a" }}>StoryForge</Text>

          <Heading style={{ fontSize: 20, marginBottom: 8 }}>
            {subject}
          </Heading>

          <Text style={{ fontSize: 15, color: "#27272a", lineHeight: 1.6 }}>
            Hey {userName},
          </Text>

          <Text style={{ fontSize: 15, color: "#27272a", lineHeight: 1.6 }}>
            {body}
          </Text>

          <Section style={{ textAlign: "center", margin: "24px 0" }}>
            <Button
              href={actionUrl}
              style={{
                background: "#18181b",
                color: "#fff",
                padding: "12px 24px",
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {actionLabel}
            </Button>
          </Section>

          <Hr style={{ borderColor: "#e4e4e7" }} />

          <Text style={{ fontSize: 12, color: "#a1a1aa" }}>
            You received this because of your notification settings in StoryForge.
            Manage preferences in Settings → Notifications.
          </Text>

        </Container>
      </Body>
    </Html>
  );
}
```

**Daily Digest (Low-Priority Batching):**

Suggestions and other non-urgent notifications get bundled into a daily digest email instead of individual messages. A Convex cron job collects unread non-urgent notifications per user and sends one summary email.

```typescript
// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "notification-digest",
  { hourUTC: 14, minuteUTC: 0 }, // 9:00 AM Central (Milwaukee)
  internal.actions.email.sendDailyDigest
);

export default crons;
```

```typescript
// convex/actions/email.ts (digest action)
export const sendDailyDigest = internalAction({
  handler: async (ctx) => {
    // Get all users who have unread, non-urgent, un-emailed notifications
    const users = await ctx.runQuery(internal.users.listWithPendingDigest);

    for (const user of users) {
      const pendingNotifications = await ctx.runQuery(
        internal.notifications.getPendingDigest,
        { userId: user._id }
      );

      if (pendingNotifications.length === 0) continue;

      // Group by story
      const byStory = groupBy(pendingNotifications, "storyId");

      await resend.emails.send({
        from: "StoryForge <digest@storyforge.fm>",
        to: user.email,
        subject: `📋 StoryForge Daily Update — ${pendingNotifications.length} new items`,
        react: DigestEmail({
          userName: user.name,
          storySummaries: byStory,
        }),
      });

      // Mark all as digested
      for (const n of pendingNotifications) {
        await ctx.runMutation(internal.notifications.markEmailSent, { id: n._id });
      }
    }
  },
});
```

**User Notification Preferences:**

```typescript
// Add to users table in convex/schema.ts
// notificationPrefs field:
notificationPrefs: v.optional(v.object({
  email: v.object({
    producer_edit: v.boolean(),       // default: true
    required_change: v.boolean(),     // default: true
    story_approved: v.boolean(),      // default: true
    story_returned: v.boolean(),      // default: true
    story_submitted: v.boolean(),     // default: true (producers only)
    story_idea_claimed: v.boolean(),  // default: true
    cross_station_overlap: v.boolean(), // default: true
    producer_note: v.boolean(),       // default: true (if away)
    new_suggestion: v.boolean(),      // default: false (digest only)
  }),
  slack_dm: v.optional(v.object({
    required_change: v.boolean(),     // default: true
    story_approved: v.boolean(),      // default: true
  })),
  digestEnabled: v.boolean(),         // default: true
  digestTime: v.optional(v.string()), // "09:00" local time preference
})),
```

---

#### 10.5.3 SLACK INTEGRATION

Slack is the team-wide awareness layer. The whole channel sees story progress without opening StoryForge. Even people without StoryForge accounts see what the team is producing.

**MVP: Incoming Webhook (1 hour to implement)**

An Incoming Webhook is the fastest path. Create one in Slack admin (30 seconds), get a URL, StoryForge posts to it via fetch. No OAuth, no bot tokens, no Slack app review process.

The webhook URL gets stored as an org setting in Convex. Admin pastes it during org setup.

**What Gets Posted to the Channel:**

```
🎙️ Tarik started a new story: "Building Home: Riverwest Gentrification"
   88Nine · Feature (3:00) · Interview with Marcus Washington
   [View in StoryForge]

📝 Sarah left feedback on "Building Home"
   "Stronger if you lead with Marcus's quote" — Narration #1

⚠️ Required change on "Building Home"
   Sarah: "Need to verify the census stat in Narration #3 — 31% doesn't
   match the MHA report"
   [View in StoryForge]

✅ "Building Home" approved for air
   88Nine · 3:05 final length · 4 tape cuts · DJ Tarik
   [View in StoryForge]

🎙️ Jay started a new story: "Black Business Displacement on King Drive"
   HYFIN · Podcast Segment (8:00)
   ⚠️ Overlap detected with Tarik's Riverwest story

🎉 PUBLISHED: "Building Home: Riverwest Gentrification"
   88Nine · DJ Tarik · 3:05 Feature
   [Listen] [View Show Notes]

💡 New story idea: "MPS Budget Hearing Thursday"
   Suggested by Kim · Not yet claimed
   [Claim in StoryForge]
```

**Implementation: Convex Action → Slack Webhook**

```typescript
// convex/actions/slack.ts
"use node";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

export const postToSlack = internalAction({
  args: {
    eventType: v.string(),
    storyId: v.optional(v.id("stories")),
    message: v.string(),
    detail: v.optional(v.string()),
    triggeredByName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get org's Slack webhook URL
    const orgSettings = await ctx.runQuery(internal.settings.getOrgSettings);
    if (!orgSettings?.slackWebhookUrl) return; // Slack not configured

    const story = args.storyId
      ? await ctx.runQuery(internal.stories.get, { id: args.storyId })
      : null;

    const payload = buildSlackPayload(args, story, orgSettings);

    await fetch(orgSettings.slackWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
});

function buildSlackPayload(args: any, story: any, orgSettings: any) {
  const appUrl = orgSettings.appUrl || "https://app.storyforge.fm";

  // Slack Block Kit for rich formatting
  const blocks: any[] = [];

  // Main message
  blocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      text: args.message,
    },
  });

  // Story context line (station, format, creator)
  if (story) {
    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: [
            story.station,
            story.format ? `${story.format} (${story.targetLength})` : null,
            story.sourceDescription,
          ].filter(Boolean).join(" · "),
        },
      ],
    });
  }

  // Detail text (producer's note content, etc.)
  if (args.detail) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `> ${args.detail}`,
      },
    });
  }

  // Action button — deep link to StoryForge
  if (story) {
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "View in StoryForge", emoji: true },
          url: `${appUrl}/story/${story._id}`,
          style: "primary",
        },
      ],
    });
  }

  // Divider for visual separation
  blocks.push({ type: "divider" });

  return { blocks };
}
```

**Slack Event Examples (Block Kit rendered):**

Story created:
```json
{
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "🎙️ *Tarik* started a new story: *Building Home: Riverwest Gentrification*"
      }
    },
    {
      "type": "context",
      "elements": [{
        "type": "mrkdwn",
        "text": "88Nine · Feature (3:00) · Interview with Marcus Washington"
      }]
    },
    {
      "type": "actions",
      "elements": [{
        "type": "button",
        "text": { "type": "plain_text", "text": "View in StoryForge" },
        "url": "https://app.storyforge.fm/story/abc123",
        "style": "primary"
      }]
    }
  ]
}
```

Story published (celebratory):
```json
{
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "🎉 *PUBLISHED:* \"Building Home: Riverwest Gentrification\""
      }
    },
    {
      "type": "context",
      "elements": [{
        "type": "mrkdwn",
        "text": "88Nine · DJ Tarik · 3:05 Feature · 4 tape cuts"
      }]
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "🎧 Listen" },
          "url": "https://app.storyforge.fm/story/abc123/listen"
        },
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "📝 Show Notes" },
          "url": "https://app.storyforge.fm/story/abc123/notes"
        }
      ]
    }
  ]
}
```

**Org Settings: Slack Configuration**

```typescript
// Add to convex/schema.ts
orgSettings: defineTable({
  slackWebhookUrl: v.optional(v.string()),    // Incoming webhook URL
  slackChannelName: v.optional(v.string()),    // Display reference (e.g., "#storyforge-updates")
  slackNotifyEvents: v.optional(v.array(v.string())), // Which events post to Slack
  // Default Slack events:
  // ["story_created", "story_submitted", "story_approved",
  //  "story_returned", "story_published", "required_change",
  //  "story_idea_pitched", "cross_station_overlap"]
}),
```

**Admin UI: Slack Setup**

```
┌─────────────────────────────────────────────────────────────┐
│  ⚙️ SETTINGS — Slack Integration                            │
│                                                              │
│  Status: ✅ Connected                                        │
│                                                              │
│  Webhook URL: https://hooks.slack.com/services/T0.../B0.../  │
│  Channel: #storyforge-updates                                │
│  [Test Connection] [Disconnect]                              │
│                                                              │
│  ┌─ EVENTS TO POST ──────────────────────────────────────┐  │
│  │  [✓] New story created                                 │  │
│  │  [✓] Story submitted for review                        │  │
│  │  [✓] Story approved                                    │  │
│  │  [✓] Story sent back for revision                      │  │
│  │  [✓] Story published                                   │  │
│  │  [✓] Required change flagged                           │  │
│  │  [✓] New story idea pitched                            │  │
│  │  [✓] Cross-station overlap detected                    │  │
│  │  [ ] Producer notes added (can be noisy)               │  │
│  │  [ ] Narration recorded (can be noisy)                 │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ SETUP INSTRUCTIONS ──────────────────────────────────┐  │
│  │  1. In Slack, go to your workspace settings            │  │
│  │  2. Apps → Incoming Webhooks → Add New Webhook         │  │
│  │  3. Choose a channel (e.g., #storyforge-updates)       │  │
│  │  4. Copy the Webhook URL and paste above               │  │
│  │  5. Click "Test Connection" to verify                  │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Future: Full Slack App with Bot (Post-Hackathon)**

A full Slack app unlocks two-way interaction. The bot doesn't just post updates — team members interact from Slack directly:

- `/storyforge board` — shows the current Story Board summary right in Slack
- `/storyforge suggest "Building Home" "Check the MJS data piece from last week"` — adds a suggestion without opening StoryForge
- Reply in a story update's thread → posts as a suggestion on the story
- Bot DMs you for required changes (in addition to email)
- `/storyforge ideas` — lists unclaimed story ideas
- `/storyforge claim "MPS Budget Hearing"` — claims an idea from Slack

This requires a Slack App with Bot Token, OAuth scopes (`chat:write`, `commands`, `incoming-webhook`), and an events subscription endpoint. The endpoint would be a Convex HTTP action:

```typescript
// convex/http.ts — Slack event receiver (post-hackathon)
import { httpRouter } from "convex/server";

const http = httpRouter();

http.route({
  path: "/slack/events",
  method: "POST",
  handler: async (ctx, request) => {
    const body = await request.json();

    // Slack URL verification challenge
    if (body.type === "url_verification") {
      return new Response(JSON.stringify({ challenge: body.challenge }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle slash commands
    if (body.command === "/storyforge") {
      const subcommand = body.text.split(" ")[0];

      if (subcommand === "board") {
        await ctx.runAction(internal.slack.handleBoardCommand, {
          responseUrl: body.response_url,
        });
      }

      if (subcommand === "suggest") {
        const [_, storyName, ...suggestionParts] = body.text.split('"').filter(Boolean);
        await ctx.runAction(internal.slack.handleSuggestCommand, {
          storyName: storyName.trim(),
          suggestion: suggestionParts.join('"').trim(),
          slackUserId: body.user_id,
          responseUrl: body.response_url,
        });
      }
    }

    return new Response("ok");
  },
});

export default http;
```

For the hackathon, the Incoming Webhook approach takes about an hour to implement and gives the team real-time Slack visibility. The full Slack app is a post-hackathon enhancement.

---

#### 10.5.4 NOTIFICATION DISPATCHER (Unified Pipeline)

All three layers are triggered from a single dispatcher. When any event happens in StoryForge, one function determines who gets notified, through which channels, and dispatches accordingly.

```typescript
// convex/mutations/notificationDispatcher.ts
import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

// Master notification config: which events go to which channels
const NOTIFICATION_CONFIG: Record<string, {
  inApp: boolean;
  email: "always" | "if_away" | "digest" | "never";
  slack: boolean;
  getRecipients: string; // function name to determine who gets notified
}> = {
  story_created:          { inApp: false, email: "never",   slack: true,  getRecipients: "none" },
  story_submitted:        { inApp: true,  email: "always",  slack: true,  getRecipients: "producers" },
  producer_note:          { inApp: true,  email: "if_away", slack: false, getRecipients: "story_creator" },
  producer_edit:          { inApp: true,  email: "always",  slack: false, getRecipients: "story_creator" },
  required_change:        { inApp: true,  email: "always",  slack: true,  getRecipients: "story_creator" },
  story_approved:         { inApp: true,  email: "always",  slack: true,  getRecipients: "story_creator" },
  story_returned:         { inApp: true,  email: "always",  slack: true,  getRecipients: "story_creator" },
  story_published:        { inApp: true,  email: "always",  slack: true,  getRecipients: "story_creator" },
  new_suggestion:         { inApp: true,  email: "digest",  slack: false, getRecipients: "story_creator" },
  story_idea_pitched:     { inApp: false, email: "never",   slack: true,  getRecipients: "none" },
  story_idea_claimed:     { inApp: true,  email: "always",  slack: true,  getRecipients: "idea_pitcher" },
  cross_station_overlap:  { inApp: true,  email: "always",  slack: true,  getRecipients: "both_creators" },
};

export const dispatch = internalMutation({
  args: {
    eventType: v.string(),
    storyId: v.optional(v.id("stories")),
    triggeredBy: v.optional(v.id("users")),
    message: v.string(),
    detail: v.optional(v.string()),
    deepLink: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const config = NOTIFICATION_CONFIG[args.eventType];
    if (!config) return;

    // 1. Determine recipients
    const recipientIds = await getRecipients(ctx, config.getRecipients, args);

    // 2. In-app notifications
    if (config.inApp && recipientIds.length > 0) {
      for (const userId of recipientIds) {
        const notificationId = await ctx.db.insert("notifications", {
          userId,
          type: args.eventType,
          storyId: args.storyId,
          triggeredBy: args.triggeredBy,
          message: args.message,
          detail: args.detail,
          deepLink: args.deepLink,
          read: false,
          emailSent: false,
          createdAt: Date.now(),
        });

        // 3. Email (scheduled as action — runs outside the transaction)
        if (config.email === "always" || config.email === "if_away") {
          await ctx.scheduler.runAfter(0, internal.actions.email.sendNotificationEmail, {
            notificationId,
          });
        }
        // "digest" notifications are picked up by the daily cron
        // "never" notifications skip email entirely
      }
    }

    // 4. Slack (always runs as action for external HTTP call)
    if (config.slack) {
      await ctx.scheduler.runAfter(0, internal.actions.slack.postToSlack, {
        eventType: args.eventType,
        storyId: args.storyId,
        message: args.message,
        detail: args.detail,
        triggeredByName: args.triggeredBy
          ? (await ctx.db.get(args.triggeredBy))?.name
          : undefined,
      });
    }
  },
});

// Recipient resolution
async function getRecipients(
  ctx: any,
  recipientType: string,
  args: any,
): Promise<string[]> {
  switch (recipientType) {
    case "story_creator": {
      const story = await ctx.db.get(args.storyId);
      return story ? [story.creatorId] : [];
    }
    case "producers": {
      const producers = await ctx.db
        .query("users")
        .filter((q: any) => q.or(
          q.eq(q.field("role"), "producer"),
          q.eq(q.field("role"), "admin"),
        ))
        .collect();
      return producers.map((p: any) => p._id);
    }
    case "both_creators": {
      // For cross-station overlap — notify creators of both stories
      return args.detail?.relatedCreatorIds || [];
    }
    case "idea_pitcher": {
      return args.detail?.pitcherId ? [args.detail.pitcherId] : [];
    }
    case "none":
    default:
      return [];
  }
}
```

**How Other Mutations Use the Dispatcher:**

```typescript
// Example: Producer leaves a required change
export const addRequiredChange = mutation({
  args: { storyId: v.id("stories"), content: v.string(), blockIndex: v.number() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const user = await getUserFromIdentity(ctx, identity!);

    // Insert the comment
    await ctx.db.insert("comments", {
      storyId: args.storyId,
      userId: user._id,
      type: "required_change",
      content: args.content,
      scriptBlockIndex: args.blockIndex,
      status: "open",
      isProducerNote: true,
      blocksProgress: true,
      createdAt: Date.now(),
    });

    // One call dispatches in-app + email + Slack
    await ctx.scheduler.runAfter(0, internal.notificationDispatcher.dispatch, {
      eventType: "required_change",
      storyId: args.storyId,
      triggeredBy: user._id,
      message: `⚠️ *${user.name}* flagged a required change on "${(await ctx.db.get(args.storyId))!.title}"`,
      detail: args.content,
      deepLink: {
        section: "script",
        blockIndex: args.blockIndex,
      },
    });
  },
});
```

---

#### 10.5.5 NOTIFICATION EVENT ROUTING MATRIX

Complete routing of which events go to which channels:

| Event | In-App | Email | Slack | Recipients |
|-------|:---:|:---:|:---:|-----------|
| Story created | — | — | ✅ | Team channel |
| Story submitted for review | ✅ | ✅ Always | ✅ | Producers |
| Producer comment | ✅ | ✅ If away | — | Story creator |
| Producer direct edit | ✅ | ✅ Always | — | Story creator |
| Required change flagged | ✅ | ✅ Always | ✅ | Story creator |
| Story approved | ✅ | ✅ Always | ✅ | Story creator |
| Story sent back | ✅ | ✅ Always | ✅ | Story creator |
| Story published | ✅ | ✅ Always | ✅ 🎉 | Story creator |
| New suggestion | ✅ | 📋 Digest | — | Story creator |
| Suggestion upvoted | ✅ | — | — | Suggestion author |
| Story idea pitched | — | — | ✅ | Team channel |
| Story idea claimed | ✅ | ✅ Always | ✅ | Idea pitcher |
| Cross-station overlap | ✅ | ✅ Always | ✅ | Both story creators |
| Assembly complete | ✅ | — | — | Story creator |
| Narration recorded (all blocks) | ✅ | — | — | Story creator |

---

#### 10.5.6 LIBRARIES & SERVICES SUMMARY

| Layer | Library / Service | Cost | Role |
|-------|------------------|------|------|
| In-app real-time | **Convex** (already in stack) | Included | `useQuery` reactivity, live notification count |
| In-app toasts | **Sonner** (ships with shadcn/ui) | Free | Toast popups for active-session events |
| Email delivery | **Resend** | Free: 3K emails/mo | Transactional email API, simple fetch call |
| Email templates | **React Email** (comes with Resend) | Free | JSX email templates, same language as frontend |
| Slack (MVP) | **Incoming Webhook** | Free | One-way posting, no Slack app needed |
| Slack (future) | **Slack Bolt.js** | Free | Full bot: slash commands, interactive messages, thread replies |
| Cron scheduling | **Convex Crons** (built-in) | Included | Daily digest email scheduling |
| Notification dispatcher | **Custom Convex mutation** | Included | Unified routing: one event → correct channels |

---

## 11. UPDATED PERMISSION TABLE (COMPLETE)

| Action | Admin | Producer | DJ (own) | DJ (other's) | Contributor |
|--------|:---:|:---:|:---:|:---:|:---:|
| **Stories** | | | | | |
| Create story | ✅ | ✅ | ✅ | — | ✅ |
| View any story (full workspace) | ✅ | ✅ | ✅ | read-only | ❌ |
| View story card on board | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit story (script, tape, assembly) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Record narration | ✅ | ❌ | ✅ | ❌ | ❌ |
| Delete story | ✅ | ❌ | ✅ | ❌ | ❌ |
| Reassign story to different DJ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **AI Features** | | | | | |
| Generate content (scripts) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Generate sound effects / music | ✅ | ✅ | ✅ | ❌ | ❌ |
| Auto-assemble story | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Workflow** | | | | | |
| Approve checkpoints (own story) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Producer review (approve/reject) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Add producer notes / inline edits | ✅ | ✅ | ❌ | ❌ | ❌ |
| Add required changes | ✅ | ✅ | ❌ | ❌ | ❌ |
| Reassign producer reviewer | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Collaboration** | | | | | |
| View Story Board | ✅ | ✅ | ✅ | — | ✅ |
| Add suggestions/tips | ✅ | ✅ | ✅ | ✅ | ✅ |
| Upvote suggestions | ✅ | ✅ | ✅ | ✅ | ✅ |
| Add story ideas | ✅ | ✅ | ✅ | — | ✅ |
| Claim story ideas | ✅ | ✅ | ✅ | — | ❌ |
| View edit history (any story) | ✅ | ✅ | own only | ❌ | ❌ |
| **Exports** | | | | | |
| Export own story (WAV, SRT, etc.) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Export any story | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Administration** | | | | | |
| Invite users | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage users (roles, stations) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage stations | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage org settings | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 12. UPDATED DEMO SCRIPT ADDITIONS

### [Add to 1:15-1:50 section — After content generation:]

"Now watch. The script says NARRATION #1, 15 seconds. I click Record — teleprompter shows me what to say — and I just talk. My voice. My style. I can improvise, I can read it straight, I can do five takes and pick the best one. I hear what comes before and after so I match the energy."

"All four narration blocks recorded. I hit Assemble. StoryForge takes my voice, the tape I selected, the music bed, the ambient sound — and builds the finished piece. Three minutes. Mixed. Crossfaded. Music ducked under my narration. Ready for air."

"And I didn't touch a single audio editing tool."

### [Add to 1:50-2:20 section — After multi-track:]

"Now here's the newsroom part. Every person on my team sees the Story Board — what stories are in play, who's working on what, what stage they're at. Jay at HYFIN sees my Riverwest story and drops a suggestion: 'I interviewed someone on that same block. Want the tape?' Kim the intern sees the council vote on Thursday and flags it. The whole team is helping each other."

"My producer Sarah opens my story, reads the script, clicks a tape reference and hears it, and leaves a note: 'Stronger if you lead with Marcus's quote.' She edits one line directly — changes 'thirty-one percent' to 'nearly a third' because it sounds more natural. I see exactly what she changed. I accept the edit. She approves. Done."

---

## 13. UPDATED MVP SCOPE

### Week 1 Additions
- Convex schema: `narrationTakes`, `suggestions`, `storyIdeas`, `editHistory` tables
- Narration recorder: Web Audio API recording, level meter, multiple takes
- Story Board: basic card view with status grouping (Convex real-time query)

### Week 2 Additions
- Length customizer UI (presets + slider + breakdown preview)
- Teleprompter mode for narration recording
- Context preview (hear tape before/after narration block)
- Suggestions thread on story cards

### Week 3 Additions
- Auto-Assembly Engine (timeline calculation, track layout, volume automation)
- Producer inline notes + direct edits with accept/reject
- Edit history panel
- Notification dispatcher (unified pipeline — one event → correct channels)
- In-app notifications (Convex real-time query + Sonner toasts)
- Resend email integration (transactional emails for urgent events)
- React Email templates (story approved, required change, producer edit, etc.)

### Week 4 Additions
- WAV/MP3 export from assembly (FFmpeg server-side mix)
- Story Board filters (station, person, stage)
- Story ideas section on board
- Cross-station overlap detection
- Slack Incoming Webhook integration (admin setup UI + event posting)
- Daily digest cron job (Convex crons → Resend batch email)
- User notification preferences (per-event email toggles in Settings)
- Polish: notification deep links, edit history "view in context"

---

---

## 14. COACHAGENT — NPR TRAINING METHODOLOGY INTEGRATION

### The Problem CoachAgent Solves

Most DJs have never been trained in narrative audio production. They know how to talk between songs and run a board. They don't know how to structure a 3-minute produced piece, write narration that works for the ear instead of the page, select tape that carries emotional weight, or design a soundscape that puts the listener in a place. They've never had an NPR editor sitting next to them saying "keep subjects cozy with their verbs" or "this tape cut is trying to make two points — split it."

StoryForge's CoachAgent fills that gap. It coaches in real-time at every stage of the production workflow, applying editorial principles derived from NPR's training methodology — the same principles that trained the on-air staff at All Things Considered, Morning Edition, and the entire NPR network.

For solo podcasters, the CoachAgent is even more critical: it's the editor they've never had.

### 14.1 KNOWLEDGE ARCHITECTURE: TWO LAYERS

The CoachAgent's knowledge operates on two layers that serve different purposes:

```
┌──────────────────────────────────────────────────────┐
│                   COACHAGENT                          │
│                                                       │
│  ┌─ LAYER 1: SYSTEM PROMPT ───────────────────────┐  │
│  │                                                 │  │
│  │  20 distilled editorial principles              │  │
│  │  Organized by production stage                  │  │
│  │  Always loaded — every interaction              │  │
│  │  Enables instant, instinctive coaching          │  │
│  │                                                 │  │
│  │  "Think like an NPR editor on every call"       │  │
│  └─────────────────────────────────────────────────┘  │
│                         │                             │
│                    applies rules                      │
│                         │                             │
│                         ▼                             │
│  ┌─ LAYER 2: KNOWLEDGE BASE (RAG) ────────────────┐  │
│  │                                                 │  │
│  │  Full NPR Training articles (curated)           │  │
│  │  Sound Reporting textbook principles            │  │
│  │  Station-specific style guides                  │  │
│  │  Example scripts from great radio stories       │  │
│  │                                                 │  │
│  │  Retrieved on demand when DJ asks "why?"        │  │
│  │  or when deeper explanation is needed           │  │
│  └─────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

**Layer 1 (System Prompt)** gives the agent its editorial instincts. It thinks like an NPR editor on every interaction without needing to look anything up. Fast, always-on, opinionated.

**Layer 2 (Knowledge Base / RAG)** gives the agent depth. When the DJ asks "why should I keep subjects close to verbs?" or "what's a cold open and when should I use one?", the agent retrieves the full teaching content — examples, techniques, rationale. The DO Knowledge Base stores curated NPR Training content as indexed documents.

Together: Layer 1 catches the problem instantly. Layer 2 teaches the DJ how to fix it and why it matters.

---

### 14.2 LAYER 1: SYSTEM PROMPT — EDITORIAL PRINCIPLES

The following system prompt is loaded on every CoachAgent invocation. It is NOT a summary of articles — it is a set of instructions to the agent about how to think, organized by when each principle applies in the StoryForge workflow.

```python
# agents/coach_agent.py

COACH_SYSTEM_PROMPT = """
You are the CoachAgent for StoryForge, a production tool for radio
stations and podcasters. You coach creators through audio storytelling
using principles derived from NPR's editorial training methodology.

You are NOT a generic writing assistant. You are a radio editor.
You think in sound, not text. The script is a tool — it's not the
story. The story is made of sounds.

Your coaching style: Direct but encouraging. Like the best editors,
you push creators to do better while making them feel capable. You
never rewrite their work without explaining why. You ask questions
more than you give orders. You celebrate what works before flagging
what doesn't.

You adapt to the creator's context:
- {context_type} = "radio_station" → Coach for broadcast standards,
  time constraints, station voice, producer expectations
- {context_type} = "podcast" → Coach for listener retention, episode
  flow, conversational tone, solo production challenges
- {format} = "air_break" → Tight, punchy, every word earns its place
- {format} = "feature" → Room for scenes and development
- {format} = "podcast_segment" → Conversational depth, longer tape runs
- {format} = "podcast_episode" → Full narrative arc, multiple chapters
- {skill_level} = "beginner" → Explain principles, give examples
- {skill_level} = "intermediate" → Flag issues, trust them to fix
- {skill_level} = "advanced" → Peer-level notes, subtle observations

═══════════════════════════════════════════════════════════
CORE EDITORIAL PRINCIPLES (apply at every stage)
═══════════════════════════════════════════════════════════

1. THE DRIVING QUESTION
   Every story needs a single driving question that propels the
   narrative. If the creator can't state it in one sentence, the
   story isn't focused enough.
   Ask: "What is the one question this story answers?"
   If the answer is vague, push back. Better to discover this now
   than after the script is written.

2. THE DACS LINE (2-3 Sentence Contract)
   The creator should be able to describe the story in 2-3 lines.
   This description is a contract — a test of the idea's strength.
   If it's hard to write, the story isn't focused enough.
   Return to this description whenever the story drifts.
   Flag drift: "Your narration block 3 introduces rent prices,
   but your driving question was about community ownership. Are
   you telling one story or two?"

3. THE EDITOR IS THE PROXY FOR THE AUDIENCE
   Your job is to be "dumb about everything." Not because the
   audience is dumb, but because creators — especially experienced
   beat reporters and subject-matter DJs — know far more than their
   listeners. Flag jargon, assumed knowledge, unexplained acronyms,
   inside references. If YOU don't understand it on first listen,
   the audience won't either.
   Ask: "If someone tuned in right at this moment with zero
   context, would they follow this sentence?"

4. FRONT-END EDITING, NOT TRIAGE
   Editing begins BEFORE the story is written. The conversation
   about what the story IS (and isn't) should happen during the
   steering phase, not after a draft exists. Push the creator to
   articulate the story's mission early. This avoids surprises
   and makes the whole process more efficient.
   Never say: "This draft has problems." Instead, catch problems
   before the draft exists.

═══════════════════════════════════════════════════════════
WRITING FOR THE EAR (apply when reviewing narration scripts)
═══════════════════════════════════════════════════════════

5. ONE IDEA PER SENTENCE
   Human ears can only process one fact or idea per sentence.
   Sentences that look short on the page sound natural when spoken.
   If a narration sentence contains a dependent clause, flag it.
   Dependent clauses are toxic to radio/podcast writing.
   BAD: "Marcus Washington, who has lived on this block for
   twenty-two years, says gentrification isn't just about buildings."
   GOOD: "Marcus Washington has lived on this block for twenty-two
   years. He says gentrification isn't just about buildings."
   Two sentences. Two ideas. Each one lands.

6. KEEP SUBJECTS COZY WITH THEIR VERBS
   Measure the word distance between subject and verb. If they're
   separated by more than 8-10 words (~5 seconds on air), the
   listener loses track of what the sentence is about.
   Flag: "Your subject 'The Riverwest Community Land Trust' is
   separated from the verb 'has acquired' by 14 words. That's
   9 seconds where the listener is wondering what happened. Move
   them together."

7. WRITE HOW YOU TALK
   If it feels unnatural to say out loud, it needs rewriting.
   Trust the mouth. Coach creators to:
   - Round numbers: "nearly a third" not "thirty-one percent"
   - Minimize statistics: ears hate numbers
   - Use conversational contractions: "don't" not "do not"
   - Drop titles on second reference: "Marcus" not "Mr. Washington"
   - Avoid big fancy words: use everyday language
   Test: "Read this sentence out loud. Does it sound like
   something you'd say to a friend?"

8. ONE-TO-ONE MEDIUM
   Audio is intimate. The creator is not performing for a crowd
   — they're talking to one person through earbuds. Flag any
   narration that sounds like a press release, academic paper,
   news wire copy, or newspaper article.
   "This sentence sounds like it was written to be read, not
   heard. Who are you talking to? Picture one listener. Now
   tell THEM."

9. START STRONG — EARN THE FIRST 10 SECONDS
   Listeners decide in the first 10 seconds whether to keep
   listening. For podcasts, this is even more critical — they
   will literally skip to the next episode. The opening must
   hook immediately through:
   - A compelling tape cut (cold open)
   - A vivid scene that places the listener somewhere
   - A provocative question or surprising fact
   - A personal moment of connection
   Never open with background context, definitions, or
   "Today we're going to talk about..."
   Flag weak openings aggressively. This is the highest-stakes
   writing in the entire piece.

═══════════════════════════════════════════════════════════
TAPE CRAFT (apply when selecting and arranging tape)
═══════════════════════════════════════════════════════════

10. THE SIX TAPE TRANSITION TECHNIQUES
    When writing narration that leads INTO tape:
    a) SET UP — Introduce what the listener is about to hear.
       "Marcus remembers the day his neighbor left."
    b) RAISE A QUESTION — Create curiosity the tape answers.
       "So what does gentrification sound like from the inside?"
    c) CONTRAST — Create tension the tape resolves.
       "The city says Riverwest is thriving. Marcus disagrees."

    When writing narration that comes OUT OF tape:
    d) ECHO — Pick up on what was said, carry it forward.
       TAPE: "...nobody asked us."
       NARRATION: "Nobody asked. And that's the part that stays
       with Marcus."
    e) EMPHASIZE/REPEAT — Underline something the listener
       might have missed or that deserves emphasis.
       TAPE: "...the DroughtShame app."
       NARRATION: "Yeah. There IS a drought shame app."
    f) COMPLETE THE THOUGHT — Finish what the tape started.
       TAPE: "They don't want to talk about that."
       NARRATION: "Because the story of the Swiss Cheese Union
       is a cautionary tale."

    Flag transitions that don't use any technique. Dead
    transitions (narration that just moves to the next topic
    with no connection to the tape before or after it) break
    the listener's flow.

11. REAL PEOPLE vs EXPERTS
    "Real people" tape has humanity — rough edges, emotion,
    natural speech patterns, vulnerability. Expert tape often
    sounds flat, rehearsed, media-trained. Always favor real
    people when possible.
    If expert tape is necessary, coach the creator to humanize
    the expert — treat them as a character, not just a source.
    Ask about their personal experience, not just their
    professional opinion.

12. NON-VERBAL TAPE IS GOLD
    A sigh, a laugh, a pause, a crack in the voice — these
    moments communicate more than any words. Flag moments in
    the transcript where non-verbal tape carries emotional
    weight. Never cut around these moments. Never smooth
    them out.
    "At 14:47, Marcus pauses for three seconds before saying
    'home.' That pause IS the story. Keep it."

13. ONE TAPE CUT = ONE POINT
    Each actuality should make exactly one point. If an interview
    segment contains two important ideas, use two separate cuts
    with narration between them. Don't try to pack too much into
    a single tape segment — the listener will only remember the
    last thing they heard.

═══════════════════════════════════════════════════════════
SOUND DESIGN (apply when suggesting music, SFX, ambient)
═══════════════════════════════════════════════════════════

14. ACTIVE SOUND vs GENERIC AMBIENCE
    "Street sounds" = generic and meaningless.
    "The scrape of a metal gate rolling up at 6 AM on Burleigh
    Street" = active sound that tells the story.
    Always push for specific, story-relevant sound. Sound should
    substitute for words, not fill silence. If you can remove
    the sound and the story doesn't lose anything, the sound
    doesn't belong.
    Ask: "What does this PLACE sound like? What does this
    MOMENT sound like? Not 'city noise' — what specific sound
    puts the listener on this corner, in this room, at this
    table?"

15. SOUND TELLS THE STORY
    The right sound can substitute for dozens of words and be as
    evocative as a photograph. Before writing a narration block,
    ask: "Can sound communicate this instead?"
    A 3-second audio clip of a boarded-up storefront's padlock
    rattling says more about abandonment than a whole paragraph
    of narration.

16. MUSIC SERVES THE STORY, NOT THE PRODUCER
    Music beds should be invisible when they're working. The
    listener shouldn't notice the music — they should feel it.
    Flag music choices that:
    - Compete with the narration for attention
    - Have a mood that contradicts the content
    - Are too on-the-nose (sad piano under sad content)
    - Change too abruptly between sections
    Suggest music as emotional undertow, not soundtrack.

═══════════════════════════════════════════════════════════
STORY STRUCTURE (apply when building narrative arc)
═══════════════════════════════════════════════════════════

17. DON'T DOUBLE BACK
    Radio and podcasts are linear. Time moves forward. Make one
    point, move to the next. Never return to something already
    covered. If the script circles back to an earlier theme
    without new information, flag it.
    "Narration block 4 returns to the census data you covered
    in block 2. The listener already has this. Cut it or add
    something new."

18. RAISE QUESTIONS, THEN ANSWER THEM
    The listener should always be asking "what happened next?"
    or "why does that matter?" Structure the story so each
    section creates curiosity that the next section satisfies.
    This is the "campfire" principle — seduce and tease,
    reveal bit by bit, hold attention to the very end.
    Flag any section where the listener has no reason to keep
    listening.

19. THE ENDING MATTERS AS MUCH AS THE OPENING
    Don't just stop. Don't summarize. Don't moralize. The
    strongest endings:
    - Return to the opening image/person with new meaning
    - Let the last tape cut carry the emotional weight
    - Leave the listener with a question, not an answer
    - End with a specific image, not an abstraction
    Flag endings that feel like a term paper conclusion.

═══════════════════════════════════════════════════════════
DELIVERY COACHING (apply during narration recording)
═══════════════════════════════════════════════════════════

20. MARK YOUR COPY
    When reading from scripts, natural speech rhythm disappears.
    Coach creators to mark their teleprompter text:
    - // for pauses
    - CAPS or underline for emphasis
    - ↑ for rising inflection (questions)
    - (breath) for planned breath points
    - [slow] for sections that need deliberate pacing
    Generate a marked-up version of each narration block
    when the creator enters recording mode.

21. PRESENCE, TONE, PACING, ENERGY
    Delivery is the difference between a story that resonates
    and one that gets skipped. Listen for and flag:
    - MONOTONE: Needs vocal variety. "Vary your pitch on
      this line — you're revealing something surprising."
    - RACING: Needs to breathe. "Slow down at 'that's the
      thing about gentrification.' Let it land."
    - DISCONNECTION: Not feeling the words. "You're reading.
      Stop. Close your eyes. Remember what Marcus told you.
      Now say it."
    - OVER-PERFORMANCE: Sounds fake. "Pull back. You're
      telling a friend, not performing on stage."

22. MATCH ENERGY TO CONTENT
    The narration after a powerful tape cut should honor what
    was just said. Don't barrel in with upbeat energy after
    someone shares something painful. Don't go flat after
    something joyful.
    "Marcus just told you he watched his neighbors disappear.
    Your next line can't sound like a news update. Bring the
    weight of what he said into your delivery."

23. THE AIRCHECK FRAMEWORK (post-recording review)
    After all narration is recorded, offer a structured
    review using NPR's aircheck methodology:
    - What worked? (Always lead with strengths)
    - Where did the energy drop?
    - Which transitions felt smooth and which felt jarring?
    - Did the opening hook immediately?
    - Did the ending land?
    - Overall: does this sound like a conversation or a
      performance?
"""
```

---

### 14.3 LAYER 2: KNOWLEDGE BASE — CURATED NPR TRAINING CONTENT

The DigitalOcean Knowledge Base stores the full teaching content from NPR Training, organized by topic domain. This is retrieved via RAG when the CoachAgent needs deeper explanation, examples, or when the creator asks "why?"

#### Knowledge Base Document Structure

```
knowledge_base/
├── 01_editorial_process/
│   ├── front_end_editing.md          # The "secret ingredient" — editorial 
│   │                                   # process as collaboration, not triage
│   ├── driving_question_exercise.md  # Razor-sharp focus exercise, group 
│   │                                   # prompts for finding the story's core
│   ├── dacs_line.md                  # 2-3 sentence story contract
│   └── story_pitching.md            # What makes a pitch vs an idea
│
├── 02_writing_for_ear/
│   ├── print_to_radio.md            # Subject-verb distance, dependent clauses,
│   │                                   # one idea per sentence, inverted pyramid 
│   │                                   # doesn't work, short sentences
│   ├── campfire_storytelling.md      # Story structure, raising questions,
│   │                                   # no doubling back, each act = one point
│   ├── how_stories_begin.md          # Opening techniques, cold opens, scenes,
│   │                                   # first-person usage, when to use "I"
│   ├── writing_through_sound.md      # The 6 tape transition techniques with
│   │                                   # real NPR examples (set up, echo, 
│   │                                   # contrast, emphasize, complete, montage)
│   └── numbers_and_data.md           # How to handle statistics, percentages,
│                                       # dates on air — round everything
│
├── 03_tape_craft/
│   ├── selecting_tape.md             # Real people vs experts, humanizing 
│   │                                   # sources, non-verbal tape as gold
│   ├── interview_techniques.md       # Pre-interview prep, getting natural tape,
│   │                                   # when to stop asking questions
│   ├── tape_editing.md               # Preserving natural speech patterns,
│   │                                   # ethical editing, what you can/can't cut
│   └── montage_and_waterfall.md      # Using multiple voices for variety,
│                                       # sameness, shared themes
│
├── 04_sound_design/
│   ├── active_vs_generic_sound.md    # Sound that tells the story vs ambient fill
│   ├── mixing_handbook.md            # Loudness, EQ, compression, levels,
│   │                                   # meters, broadcast standards
│   ├── music_in_stories.md           # Techniques for mixing songs into stories,
│   │                                   # music beds, ducking, emotional undertow
│   └── field_recording.md            # Gathering good sound in the field,
│                                       # equipment, technique
│
├── 05_delivery/
│   ├── marking_copy.md               # Script marking for natural delivery,
│   │                                   # pauses, emphasis, breath points
│   ├── vocal_presence.md             # Presence, tone, pacing, energy —
│   │                                   # the difference between resonance and skip
│   ├── aircheck_framework.md         # Structured feedback for on-air critique,
│   │                                   # what NPR looks for in an aircheck
│   └── vocal_warmups.md              # Physical warmup exercises for voice
│
├── 06_podcast_specific/
│   ├── podcast_structure.md          # Episode arc, chapter breaks, cold opens,
│   │                                   # listener retention curves
│   ├── conversational_tone.md        # How podcast delivery differs from 
│   │                                   # broadcast — more intimate, less formal
│   ├── solo_hosting.md               # Techniques for solo narration without
│   │                                   # a co-host or producer
│   ├── episode_pacing.md             # Managing energy across 20-60 minutes,
│   │                                   # when to give the listener a break
│   └── audience_building.md          # Hooks, cliffhangers, series structure,
│                                       # making listeners come back next week
│
└── 07_reference/
    ├── audio_production_glossary.md   # Technical lingo: actuality, nat sound,
    │                                    # track, mix, bed, bump, kicker, etc.
    ├── style_guide_template.md        # How to build a station/show style guide
    └── great_examples.md              # Annotated scripts from award-winning
                                        # radio/podcast pieces with analysis
                                        # of WHY they work
```

#### How RAG Retrieval Works

```python
# agents/coach_agent.py — RAG retrieval integration

from gradient import KnowledgeBase

kb = KnowledgeBase(id=os.environ["DO_KB_NPR_TRAINING"])

class CoachAgent:
    def __init__(self, context_type: str, format: str, skill_level: str):
        self.system_prompt = COACH_SYSTEM_PROMPT.format(
            context_type=context_type,   # "radio_station" or "podcast"
            format=format,               # "air_break", "feature", "podcast_segment", "podcast_episode"
            skill_level=skill_level,     # "beginner", "intermediate", "advanced"
        )

    async def coach(self, stage: str, content: dict, question: str = None):
        """
        Main coaching method. Called at each production stage.

        stage: "steering" | "tape_selection" | "script_review" | 
               "narration_recording" | "sound_design" | "assembly_review"
        content: stage-specific data (transcript, script, tape selections, etc.)
        question: optional DJ question ("why should I do X?")
        """

        # Layer 1: System prompt provides instant coaching instincts
        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": self._build_stage_prompt(stage, content)},
        ]

        # Layer 2: If DJ asked a question, retrieve relevant training content
        rag_context = ""
        if question:
            results = kb.search(question, top_k=3)
            rag_context = "\n\n".join([
                f"--- NPR Training Reference ---\n{r.text}\n--- End Reference ---"
                for r in results
            ])
            messages.append({
                "role": "user",
                "content": f"The creator asked: '{question}'\n\n"
                           f"Use these references to provide a deeper answer:\n{rag_context}"
            })

        # Also retrieve RAG for stage-specific coaching even without a question
        # (enriches the coaching with examples and techniques)
        if not question:
            stage_queries = {
                "steering": "driving question story focus editorial process",
                "tape_selection": "selecting tape real people actuality one point",
                "script_review": "writing for ear subject verb one idea per sentence transitions",
                "narration_recording": "marking copy delivery presence tone pacing",
                "sound_design": "active sound ambient music bed storytelling",
                "assembly_review": "aircheck feedback story structure opening ending",
            }
            results = kb.search(stage_queries.get(stage, "audio storytelling"), top_k=2)
            rag_context = "\n\n".join([r.text for r in results])
            messages[0]["content"] += f"\n\nReference material for this stage:\n{rag_context}"

        response = await self.llm.generate(messages)
        return response
```

---

### 14.4 STAGE-BY-STAGE COACHING BEHAVIOR

The CoachAgent behaves differently at each stage of the StoryForge workflow, applying the relevant subset of principles:

#### Stage 1: STEERING (before any content is generated)

```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 COACHAGENT — STEERING PHASE                              │
│                                                              │
│ Principles active: #1 (Driving Question), #2 (DACS Line),   │
│ #3 (Audience Proxy), #4 (Front-End Editing), #9 (Start      │
│ Strong), #18 (Raise Questions)                               │
│                                                              │
│ DJ sets angle to "gentrification" and tone to "elegiac"      │
│                                                              │
│ 💬 CoachAgent:                                               │
│ "Good angle. Before we generate anything, let me push you    │
│  on focus. What's the ONE question this story answers?        │
│                                                              │
│  Right now I see a few possibilities in your tape:            │
│  • 'Why are Black homeowners disappearing from Riverwest?'   │
│  • 'Can community land trusts stop gentrification?'          │
│  • 'What does it feel like to watch your block change?'      │
│                                                              │
│  These are three different stories. Which one are you         │
│  telling? The answer shapes everything — which tape we        │
│  select, how we open, where we end.                          │
│                                                              │
│  Try writing it as a DACS line — 2-3 sentences that          │
│  describe the piece. If it's hard to write, we need to       │
│  focus more."                                                │
│                                                              │
│  [This is front-end editing. Better to figure it out now     │
│   than after the script is written.]                         │
└─────────────────────────────────────────────────────────────┘
```

#### Stage 2: TAPE SELECTION (after transcript review)

```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 COACHAGENT — TAPE SELECTION                               │
│                                                              │
│ Principles active: #10 (Tape Transitions), #11 (Real People │
│ vs Experts), #12 (Non-Verbal Gold), #13 (One Cut = One      │
│ Point), #9 (Start Strong)                                    │
│                                                              │
│ DJ selected 4 tape cuts from Marcus interview                │
│                                                              │
│ 💬 CoachAgent:                                               │
│ "Strong selections. A few notes:                             │
│                                                              │
│  ✅ Your first cut [14:32-14:58] is emotionally powerful.    │
│  Marcus's voice cracks slightly at 14:45 when he says        │
│  'one by one.' That non-verbal moment IS the story. Make     │
│  sure the edit doesn't clip it.                              │
│                                                              │
│  ⚠️ Your third cut [35:42-36:11] is trying to make two      │
│  points — the community land trust AND hope for the future.  │
│  Consider splitting it. End the first cut at 35:58 after     │
│  'own this block. Together.' Then use the hope line           │
│  ('nobody can flip it') as a separate cut later with         │
│  narration between them. Each cut lands harder when it        │
│  makes one point.                                            │
│                                                              │
│  💡 Cold open possibility: Have you considered opening with   │
│  Marcus's tape instead of narration? His line at 14:32       │
│  — 'I watched my neighbors leave one by one' — would         │
│  grab the listener immediately. Then you come in with         │
│  context. Strongest stories often start with a voice, not     │
│  a narrator."                                                │
└─────────────────────────────────────────────────────────────┘
```

#### Stage 3: SCRIPT REVIEW (after ContentAgent generates script)

```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 COACHAGENT — SCRIPT REVIEW                                │
│                                                              │
│ Principles active: #5 (One Idea), #6 (Subject-Verb), #7     │
│ (Write How You Talk), #8 (One-to-One), #10 (Transitions),   │
│ #17 (Don't Double Back), #19 (Ending)                        │
│                                                              │
│ ContentAgent generated a 3:00 feature script                 │
│                                                              │
│ 💬 CoachAgent:                                               │
│ "Script review — here's what works and what needs attention:  │
│                                                              │
│  ✅ Strong opening. The Burleigh Street image puts the        │
│  listener in a place immediately. Good.                      │
│                                                              │
│  ✅ Transition into Tape #1 uses the 'contrast' technique    │
│  — you set up 'the buildings stay' and Marcus's tape          │
│  shows 'the people don't.' Clean.                            │
│                                                              │
│  ⚠️ Narration #3, sentence 2:                                │
│  'Median home prices, which had remained relatively stable   │
│  through the 2008 recession and its aftermath, have since    │
│  tripled in the 53212 zip code.'                             │
│  — Subject ('prices') is 14 words from verb ('tripled')     │
│  — Dependent clause is toxic to the ear                      │
│  — Two facts crammed into one sentence                       │
│  Try: 'Home prices in the 53212 zip code have tripled.       │
│  They barely moved during the recession. The spike came       │
│  after.' Three sentences. Three facts. Each one lands.        │
│                                                              │
│  ⚠️ Narration #3 also doubles back to census data from       │
│  block 1. The listener already knows residents are leaving.  │
│  Can you replace the census reference with something new —   │
│  maybe the investor stat from the MHA report?                │
│                                                              │
│  ⚠️ Transition out of Tape #2 is dead — you move to new     │
│  information without connecting to what Marcus just said.    │
│  He said 'sight unseen.' Echo it: 'Sight unseen. That's     │
│  the part that stings — someone buying your neighbor's       │
│  home without ever walking the block.'                       │
│                                                              │
│  ✅ Ending is strong. Final tape carries the weight.          │
│  'Home is knowing your neighbor's name' — that's the line    │
│  the listener will remember."                                │
└─────────────────────────────────────────────────────────────┘
```

#### Stage 4: NARRATION RECORDING (real-time in teleprompter)

```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 COACHAGENT — NARRATION RECORDING                          │
│                                                              │
│ Principles active: #20 (Mark Your Copy), #21 (Presence),     │
│ #22 (Match Energy)                                           │
│                                                              │
│ DJ is about to record Narration #1                           │
│                                                              │
│ 💬 CoachAgent:                                               │
│ "Before you hit record — here's your copy marked up for      │
│  delivery:                                                   │
│                                                              │
│  'On Burleigh Street in Riverwest, // there's a corner       │
│  store that's been CLOSED for two years. // The sign is       │
│  still up. The awning is still there. // (breath) But        │
│  Marcus Washington says THAT'S the thing about               │
│  gentrification — // the buildings STAY. // [slow] The       │
│  people DON'T.'                                              │
│                                                              │
│  // = pause  CAPS = emphasis  (breath) = take a breath       │
│  [slow] = deliberate pacing                                  │
│                                                              │
│  Energy note: You're setting a scene. Think 'walking the     │
│  listener down the street.' Warm, observational, not         │
│  urgent. The punch comes at the end — 'The people don't.'   │
│  Let those three words carry all the weight.                 │
│                                                              │
│  The tape that follows is Marcus at his most emotional.      │
│  Your energy at the end of this block needs to create        │
│  space for his voice to enter."                              │
│                                                              │
│ ──── After recording Take 1 ────                             │
│                                                              │
│ 💬 CoachAgent:                                               │
│ "Take 1 — 16.2 seconds. A few notes:                        │
│  ✅ Pacing in the first half was great — conversational.     │
│  ✅ The pause before 'But Marcus Washington' worked.          │
│  ⚠️ You sped up on the last line. 'The people don't'        │
│  landed too fast. This is the line that should ring in the   │
│  listener's ear. Give it space. Try another take and         │
│  slow down just on those last three words."                  │
└─────────────────────────────────────────────────────────────┘
```

#### Stage 5: SOUND DESIGN (when browsing Sound Palette)

```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 COACHAGENT — SOUND DESIGN                                 │
│                                                              │
│ Principles active: #14 (Active vs Generic), #15 (Sound       │
│ Tells Story), #16 (Music Serves Story)                       │
│                                                              │
│ DJ is browsing sounds for the opening section                │
│                                                              │
│ 💬 CoachAgent:                                               │
│ "For the opening — you're placing the listener on Burleigh   │
│  Street. Think about what this specific corner sounds like.  │
│                                                              │
│  Not 'city ambience' — that's generic and tells the          │
│  listener nothing.                                           │
│                                                              │
│  What's ACTIVE on this corner? A bus passing? A screen door  │
│  closing? Morning birds in a quiet neighborhood? The hum     │
│  of a window AC unit? Each of those tells a different        │
│  story about this place.                                     │
│                                                              │
│  Try Freesound: 'quiet residential street morning birds      │
│  distant traffic.' Or generate via ElevenLabs: 'morning      │
│  ambience on a quiet residential block, distant traffic,     │
│  birds, occasional car passing slowly.'                      │
│                                                              │
│  For the music bed — your tone is 'elegiac.' That doesn't    │
│  mean sad piano. It means something with WEIGHT that         │
│  doesn't compete with Marcus's voice. The music should be    │
│  invisible when it's working. The listener shouldn't notice  │
│  it — they should FEEL it.                                   │
│                                                              │
│  Try: 'minimal ambient guitar, contemplative, sparse, warm   │
│  low end, no drums, no melody.' The emptiness in the music   │
│  mirrors the emptiness on the block."                        │
└─────────────────────────────────────────────────────────────┘
```

#### Stage 6: ASSEMBLY REVIEW (aircheck-style, after auto-assembly)

```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 COACHAGENT — ASSEMBLY REVIEW (AIRCHECK)                   │
│                                                              │
│ Principles active: #23 (Aircheck Framework) — comprehensive  │
│ review of the finished assembled piece                       │
│                                                              │
│ Auto-assembly complete, 3:05 total                           │
│                                                              │
│ 💬 CoachAgent:                                               │
│ "Full piece review — here's my aircheck:                     │
│                                                              │
│  WHAT WORKS:                                                 │
│  • Opening image (Burleigh Street) + ambient puts the        │
│    listener in a specific place immediately. Strong.         │
│  • Marcus's voice enters at exactly the right moment.        │
│    The transition from your narration into his first cut     │
│    is seamless — the contrast technique works perfectly.     │
│  • Music bed is doing its job — I forgot it was there,       │
│    which means it's perfect.                                 │
│  • Final tape cut ('Home is knowing your neighbor's name')   │
│    is the right ending. It lingers. The 5-second piano       │
│    ring-out gives the listener space to feel it.             │
│                                                              │
│  WHAT NEEDS ATTENTION:                                       │
│  • Energy dip at 1:19 — Narration #3 (the data section).    │
│    Your delivery flattened when you hit the statistics.       │
│    This is the 'broccoli' section. Consider re-recording     │
│    with more conversational energy, or trimming to just       │
│    one stat instead of three.                                │
│  • Crossfade from Tape #2 into Narration #3 is slightly     │
│    abrupt. Try extending to 250ms — the music bed shift      │
│    will cover the transition better.                         │
│  • At 2:12, there's a 1.8-second gap that feels dead.       │
│    Either tighten it to 0.5s or fill it with the ambient     │
│    bed rising briefly — silence on the radio makes            │
│    listeners think something broke.                          │
│                                                              │
│  OVERALL:                                                    │
│  This sounds like a produced piece, not an AI project.       │
│  Your voice carries it. Marcus carries it. The listener      │
│  will remember the ending. That's the test.                  │
│                                                              │
│  Two tweaks and this is ready for Sarah to review."          │
└─────────────────────────────────────────────────────────────┘
```

---

### 14.5 KNOWLEDGE BASE CONTENT SOURCES

| Source | Content Type | How to Acquire | Priority |
|--------|-------------|---------------|----------|
| **NPR Training Archive** (training.npr.org / npr.org/sections/npr-training) | ~80 articles on audio storytelling, editing, writing, production | Manual curation — read articles, extract principles and techniques into structured markdown | **Critical** |
| **Sound Reporting** (Jonathan Kern, U Chicago Press) | Comprehensive textbook — writing for ear, story structure, production, ethics | Purchase book, create structured summaries by chapter (respect copyright — principles and techniques, not full text reproduction) | **Critical** |
| **Transom.org** | Advanced production techniques, essays on craft by audio producers | Curate key articles on mixing, sound design, storytelling | High |
| **AIR (Association of Independents in Radio)** | Independent producer resources, mentorship guides | Curate production guides | Medium |
| **Radio Milwaukee style guides** | Station-specific voice, values, audience, formatting | Created internally by Tarik / team | **Critical** (for station-specific coaching) |
| **Award-winning scripts** | Annotated examples from Peabody, duPont, Edward R. Murrow winners | Compile with analysis annotations (what makes them work) | High |

#### Content Curation Process

Each NPR Training article gets processed into a structured markdown document:

```markdown
# Writing for the Ear: One Idea Per Sentence

## Source
NPR Training — "The journey from print to radio storytelling"
By Alison MacAdam, NPR Training Audio Storytelling Specialist

## Core Principle
Human ears can process only one fact or idea per sentence when
listening. Sentences that seem short on the page sound natural
when spoken.

## The Problem
Print-trained writers pack information into dense sentences with
dependent clauses, nested facts, and long subject-verb distances.
This works for eyes. It fails for ears.

## Techniques

### Keep subjects close to their verbs
- Measure word distance between subject and main verb
- More than 8-10 words = listener loses track
- Radio rule: "Keep subjects cozy with their verbs"

### Eliminate dependent clauses
- Dependent clauses are "toxic to radio writing"
- Split compound sentences into simple sentences
- Each sentence = one idea

### Numbers are poison for ears
- Round everything: "about a third" not "31.7%"
- Minimize statistics: one number per paragraph maximum
- Convert data to human terms: "enough to fill Fiserv Forum"

## Examples

BAD (print-style):
"Jimmy Piersall, the often outrageous outfielder and broadcaster
whose emotional breakdown while a rookie with the Boston Red Sox
was portrayed in the 1957 movie Fear Strikes Out, died on Saturday."
→ 37 words between subject and verb = 15 seconds of confusion

GOOD (radio-style):
"Jimmy Piersall has died. He was the outfielder whose rookie
breakdown became the movie Fear Strikes Out."
→ Clear, two sentences, two ideas

## When CoachAgent Should Apply This
- Script review: Flag any sentence with >1 idea or >10 words
  between subject and verb
- Narration recording: If DJ stumbles reading a sentence, it's
  probably too complex for the ear
- Content generation: ContentAgent should follow these rules;
  CoachAgent should verify

## Tags
writing, ear, sentences, subject-verb, dependent-clauses, radio-style
```

This format gives the RAG retrieval system structured content with tags, examples, and explicit CoachAgent application instructions.

---

### 14.6 COACHAGENT TECHNICAL IMPLEMENTATION

```python
# agents/coach_agent.py — Full Gradient ADK implementation

import os
from gradient import Agent, Tool, KnowledgeBase
from typing import Literal

# Knowledge Base connection
kb = KnowledgeBase(id=os.environ["DO_KB_NPR_TRAINING"])

# Stage-specific RAG queries for proactive coaching
STAGE_RAG_QUERIES = {
    "steering": [
        "driving question story focus",
        "front-end editing editorial process",
    ],
    "tape_selection": [
        "selecting tape actuality real people",
        "non-verbal tape emotional moments",
    ],
    "script_review": [
        "writing for ear sentences subject verb",
        "tape transitions writing into out of tape",
        "story structure opening ending",
    ],
    "narration_recording": [
        "marking copy delivery rhythm",
        "vocal presence tone pacing energy",
    ],
    "sound_design": [
        "active sound ambient storytelling",
        "music bed mixing levels",
    ],
    "assembly_review": [
        "aircheck feedback critique",
        "story structure pacing energy",
    ],
}


class CoachAgent(Agent):
    """
    NPR-methodology audio storytelling coach for StoryForge.

    Operates on two knowledge layers:
    - System prompt: 23 distilled editorial principles (always loaded)
    - Knowledge Base: Full NPR Training content (retrieved on demand)

    Adapts coaching to:
    - Context: radio station vs podcast
    - Format: air break, feature, podcast segment, full episode
    - Skill level: beginner, intermediate, advanced
    - Stage: steering, tape selection, script review, recording,
             sound design, assembly review
    """

    name = "CoachAgent"
    description = "Coaches creators through audio storytelling production"
    model = "claude-sonnet-4-5"  # via DO Serverless Inference

    def __init__(
        self,
        context_type: Literal["radio_station", "podcast"] = "radio_station",
        format: Literal["air_break", "feature", "podcast_segment", "podcast_episode"] = "feature",
        skill_level: Literal["beginner", "intermediate", "advanced"] = "intermediate",
        station_style: dict = None,  # station/show-specific style preferences
    ):
        self.context_type = context_type
        self.format = format
        self.skill_level = skill_level
        self.station_style = station_style or {}

        # Build system prompt with context variables
        self.system_prompt = COACH_SYSTEM_PROMPT.format(
            context_type=context_type,
            format=format,
            skill_level=skill_level,
        )

        # Append station-specific style if provided
        if station_style:
            self.system_prompt += f"""

═══════════════════════════════════════════════════════════
STATION/SHOW STYLE GUIDE
═══════════════════════════════════════════════════════════
Station: {station_style.get('name', 'Unknown')}
Voice: {station_style.get('voice', 'Not specified')}
Audience: {station_style.get('audience', 'Not specified')}
Tone guidelines: {station_style.get('tone', 'Not specified')}
Formatting rules: {station_style.get('formatting', 'Not specified')}
Things to avoid: {station_style.get('avoid', 'Not specified')}

Apply these station-specific preferences alongside the
universal editorial principles. When they conflict, the
station style takes precedence for stylistic choices,
but core editorial principles (one idea per sentence,
subject-verb proximity, etc.) always apply.
"""

    async def coach_at_stage(
        self,
        stage: str,
        content: dict,
        creator_question: str = None,
    ) -> dict:
        """
        Main coaching entry point. Called by WorkflowAgent or directly by UI.

        Returns:
        {
            "feedback": str,          # The coaching response
            "flags": [                # Specific issues flagged
                {
                    "type": "warning" | "suggestion" | "praise",
                    "principle": int,  # Which principle (1-23)
                    "location": str,   # Where in the content
                    "message": str,    # Specific feedback
                }
            ],
            "marked_copy": str | None,  # For recording stage: marked-up script
            "rag_sources": [str],       # Which KB docs were referenced
        }
        """

        # 1. Retrieve stage-relevant knowledge (proactive)
        rag_context = await self._retrieve_for_stage(stage)

        # 2. If creator asked a question, also retrieve for that
        question_context = ""
        if creator_question:
            question_results = kb.search(creator_question, top_k=3)
            question_context = "\n\n".join([
                f"[KB Reference] {r.metadata.get('title', 'Untitled')}:\n{r.text}"
                for r in question_results
            ])

        # 3. Build the prompt
        messages = [
            {"role": "system", "content": self.system_prompt + f"\n\nReference material:\n{rag_context}"},
            {"role": "user", "content": self._build_stage_prompt(stage, content, creator_question, question_context)},
        ]

        # 4. Generate coaching response
        response = await self.llm.generate(
            messages,
            response_format={
                "type": "json",
                "schema": {
                    "feedback": "string",
                    "flags": [{
                        "type": "string",
                        "principle": "number",
                        "location": "string",
                        "message": "string",
                    }],
                    "marked_copy": "string or null",
                }
            }
        )

        return response

    async def _retrieve_for_stage(self, stage: str) -> str:
        """Proactively retrieve relevant KB content for this stage."""
        queries = STAGE_RAG_QUERIES.get(stage, ["audio storytelling"])
        all_results = []
        for query in queries:
            results = kb.search(query, top_k=2)
            all_results.extend(results)

        # Deduplicate by doc ID
        seen = set()
        unique = []
        for r in all_results:
            doc_id = r.metadata.get("doc_id", r.text[:50])
            if doc_id not in seen:
                seen.add(doc_id)
                unique.append(r)

        return "\n\n".join([r.text for r in unique[:4]])  # Max 4 docs per stage

    def _build_stage_prompt(self, stage: str, content: dict, question: str, question_context: str) -> str:
        """Build the stage-specific user prompt."""

        base = f"STAGE: {stage}\nFORMAT: {self.format}\nCONTEXT: {self.context_type}\n\n"

        if stage == "steering":
            base += f"""The creator is setting up their story.
Selected angle: {content.get('angle', 'not set')}
Selected tone: {content.get('tone', 'not set')}
Available tape summary: {content.get('tape_summary', 'none')}
Narrative direction: {content.get('narrative_direction', 'none')}

Coach them on focus: driving question, DACS line, story mission.
Push back if the angle is too broad or unfocused.
Suggest opening strategies based on the tape available."""

        elif stage == "tape_selection":
            base += f"""The creator selected these tape cuts:
{content.get('tape_cuts', 'none')}

Full transcript highlights:
{content.get('transcript_highlights', 'none')}

Review each cut: Does it make one point? Is there non-verbal gold?
Suggest better alternatives if you see stronger moments in the transcript.
Consider opening strategy — cold open with tape?"""

        elif stage == "script_review":
            base += f"""ContentAgent generated this script:

{content.get('script', 'no script')}

Review every narration block for:
- One idea per sentence violations
- Subject-verb distance > 8 words
- Dependent clauses
- Unnatural/print-style language
- Dead transitions (no technique used)
- Doubling back to already-covered information
- Weak opening or ending

Review tape transitions for which of the 6 techniques they use.
Flag any transition that doesn't use a technique."""

        elif stage == "narration_recording":
            base += f"""The creator is about to record narration block #{content.get('block_index', 0) + 1}:

Script text: {content.get('block_text', '')}
What comes BEFORE: {content.get('before_context', 'start of piece')}
What comes AFTER: {content.get('after_context', 'end of piece')}

Generate marked-up copy with //, CAPS, (breath), [slow] markers.
Provide energy and delivery guidance based on surrounding context."""

            # Post-recording feedback if take audio was analyzed
            if content.get('take_analysis'):
                base += f"""

TAKE ANALYSIS (from audio):
Duration: {content['take_analysis'].get('duration', '?')}s
Target: {content['take_analysis'].get('target', '?')}s
Pace: {content['take_analysis'].get('pace', '?')} wpm
Energy notes: {content['take_analysis'].get('energy', 'none')}

Provide feedback on this take. What worked? What to adjust?"""

        elif stage == "sound_design":
            base += f"""The creator is choosing sounds for their piece.
Story setting: {content.get('setting', 'unknown')}
Story tone: {content.get('tone', 'unknown')}
Current sound selections: {content.get('current_sounds', 'none')}
Sections needing sound: {content.get('sections', 'none')}

Suggest specific, active sounds — not generic ambience.
For music beds, suggest prompts that serve the story without competing.
Flag any sounds that feel generic or disconnected from the narrative."""

        elif stage == "assembly_review":
            base += f"""The auto-assembly is complete. Full piece details:
Total duration: {content.get('duration', '?')}s (target: {content.get('target_duration', '?')}s)
Track count: {content.get('track_count', '?')}
Narration blocks: {content.get('narration_count', '?')}
Tape cuts: {content.get('tape_count', '?')}
Transitions: {content.get('transitions', 'none')}
Music: {content.get('music', 'none')}

Perform a full aircheck review:
1. What works? (lead with strengths)
2. Where does energy drop?
3. Which transitions feel smooth / jarring?
4. Does the opening hook immediately?
5. Does the ending land?
6. Overall: conversation or performance?"""

        if question:
            base += f"\n\nThe creator asked: '{question}'\n\nAdditional reference:\n{question_context}\n\nAnswer their question with depth, using the reference material."

        return base
```

---

### 14.7 COACHING INTERACTION EXAMPLES

**Beginner podcaster asking "why?":**

```
Podcaster: "Why can't I just start with background context? I need 
to explain what a community land trust is before the interview."

CoachAgent:
"Great question. Here's the thing — when you start with context,
you're asking the listener to care about something before they
have a reason to care.

NPR's training calls this 'starting with broccoli.' You're telling
the listener to eat their vegetables before they even know there's
a meal.

Instead, start with a PERSON. Start with Marcus saying 'I watched
my neighbors leave one by one.' Now the listener cares. Now they're
asking 'who is this guy? What happened?' THEN you explain what a
community land trust is, because now they have a reason to want
to know.

The rule: earn the listener's attention first, explain second.
In podcasts this is even more critical than radio — your listener
has a skip button and 2 million other shows waiting."
```

**Advanced DJ getting peer-level notes:**

```
CoachAgent:
"Quick notes on the script:

Narration #2 → Tape #2 transition: you're using 'set up' but the
set-up gives away what Marcus is about to say. Let the tape
surprise the listener. Try 'raise a question' instead — something
like 'But Marcus sees it differently' and then let his words land.

Block 3 data section: three stats in 23 seconds. Even rounded,
that's a lot. Pick the one that hits hardest — the investor ratio
— and cut the other two. Your tape is doing the emotional work.
The data just needs to validate it, not replace it.

Ending: the piano ring-out works, but consider losing the final
narration block entirely. Let Marcus's last line BE the ending.
'Home is knowing your neighbor's name.' Full stop. Music out.
Your narration after it softens the impact. Trust the tape."
```

---

## 15. PODCAST MARKET EXPANSION

### 15.1 WHY PODCASTERS ARE A NATURAL FIT

StoryForge's workflow maps directly to podcast production:

| StoryForge Stage | Radio Use | Podcast Use |
|-----------------|-----------|-------------|
| Upload & Transcribe | Interview for news segment | Interview for episode |
| Text-Based Editing | Cut filler, tighten for time | Cut filler, tighten for quality |
| Tape Selection | Select 3-4 cuts for 3-min piece | Select 8-15 cuts for 30-min episode |
| Steering | Angle for broadcast audience | Angle for show's niche audience |
| Script Generation | 90s air break, 3-min feature | Segment script, full episode script |
| Narration Recording | DJ records in booth/browser | Host records in browser/DAW |
| Sound Design | Ambient + music bed | Intro/outro, chapter beds, sound design |
| Auto-Assembly | 3-minute produced piece | Full episode with chapters |
| Export | WAV for broadcast + SRT for web | MP3 for RSS + show notes for hosting |

The core workflow is identical. The differences are scale (longer content), style (more conversational), and distribution (RSS feeds vs broadcast).

### 15.2 WHAT PODCASTERS NEED THAT RADIO DOESN'T

The architecture already supports most podcast needs. A few additions:

#### Longer Format Support

The Length Customizer already goes to 15 minutes. For podcasts, extend to 60 minutes with multi-chapter support:

```
┌─────────────────────────────────────────────────────────────┐
│  📐 EPISODE LENGTH                                           │
│                                                              │
│  ┌─ PRESETS ──────────────────────────────────────────────┐  │
│  │  [Micro]  [Standard]  [Deep Dive]  [Custom]            │  │
│  │   5-10m     20-30m      45-60m       ___               │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  Episode Length: ◄━━━━━━━━━━━━━━●━━━━━━━━━━━━► 28:00       │
│                 5:00                           60:00         │
│                                                              │
│  ┌─ CHAPTERS ─────────────────────────────────────────────┐  │
│  │  ☑ Multi-chapter episode                               │  │
│  │                                                         │  │
│  │  Chapter 1: "The Corner Store" ............. ~8:00      │  │
│  │    Source: Marcus interview [14:00-22:00]               │  │
│  │  Chapter 2: "The Numbers" .................. ~7:00      │  │
│  │    Source: Marcus interview [30:00-38:00] +             │  │
│  │            Housing Authority data                       │  │
│  │  Chapter 3: "The Land Trust" ............... ~10:00     │  │
│  │    Source: Marcus interview [35:00-45:00] +             │  │
│  │            Sarah (land trust director) interview        │  │
│  │  Intro/Outro: .............................. ~3:00      │  │
│  │                                                         │  │
│  │  [+ Add Chapter]                                        │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

#### Multi-Source Episodes

Podcasters often use multiple interviews in a single episode. StoryForge needs to support uploading and transcribing multiple source files per story, with the ContentAgent weaving between them:

```typescript
// Updated stories table — support multiple sources
stories: defineTable({
  // ... existing fields ...

  // Multiple source files (radio stories typically have 1, podcasts may have 3-5)
  sources: v.array(v.object({
    audioFileId: v.id("_storage"),
    transcriptId: v.id("transcripts"),
    label: v.string(),              // "Marcus Washington interview"
    recordedDate: v.optional(v.string()),
    speakerMap: v.optional(v.any()), // speaker ID → name mapping
  })),
}),
```

#### Podcast-Specific Export Formats

| Format | Radio Needs? | Podcast Needs? | Details |
|--------|:---:|:---:|---------|
| WAV (48kHz/24bit) | ✅ | ❌ | Broadcast standard |
| MP3 (192kbps stereo) | Preview only | ✅ **Primary** | Podcast RSS distribution |
| MP3 (128kbps mono) | ❌ | ✅ | Bandwidth-optimized for speech |
| Show notes (Markdown) | ✅ | ✅ | Chapters + timestamps + key quotes + links |
| Chapter markers (MP3) | ❌ | ✅ | ID3v2 CHAP frames for podcast apps |
| RSS snippet (XML) | ❌ | ✅ | Ready to paste into hosting platform |
| Audiogram (MP4) | ❌ | ✅ | Waveform + quote + captions for social promotion |
| SRT / VTT | ✅ | ✅ | YouTube/web captions |

**Chapter markers** are embedded in the MP3 file so podcast apps (Apple Podcasts, Overcast, Pocket Casts) display a clickable chapter list:

```typescript
// convex/actions/export.ts — podcast chapter markers
export const exportPodcastMp3 = action({
  args: { storyId: v.id("stories") },
  handler: async (ctx, args) => {
    const story = await ctx.runQuery(internal.stories.get, { id: args.storyId });

    // Build chapter list from script structure
    const chapters = story.generatedScript.chapters.map((ch, i) => ({
      title: ch.title,
      startMs: ch.startTimeSeconds * 1000,
      endMs: ch.endTimeSeconds * 1000,
      // Optional: chapter artwork, URL
    }));

    // FFmpeg + ID3v2 chapter encoding
    // mp3 encoding at target bitrate
    // Embed chapters as ID3v2 CHAP frames

    const mp3FileId = await ctx.storage.store(mp3Blob);
    return { mp3FileId };
  },
});
```

**Audiogram** is a short video clip (15-60 seconds) with a waveform animation, a key quote overlaid as text, and captions — designed for Instagram Reels, TikTok, X. This is how podcasters promote episodes on social media.

```typescript
// convex/actions/audiogram.ts
export const generateAudiogram = action({
  args: {
    storyId: v.id("stories"),
    tapeStart: v.float64(),
    tapeEnd: v.float64(),
    quoteText: v.string(),
    style: v.string(), // "waveform" | "quote_card" | "captions"
  },
  handler: async (ctx, args) => {
    // Extract audio clip
    // Generate waveform visualization
    // Overlay quote text + show branding
    // Burn in captions from word-level timestamps
    // Render as MP4 (1080x1080 for Instagram, 1080x1920 for Reels)
    // FFmpeg: audio + waveform image sequence + text overlay → MP4
  },
});
```

#### Podcast Organization Model

Radio stations use WorkOS Organizations with roles (admin/producer/DJ/contributor). Podcasters need a simpler structure:

| Radio Concept | Podcast Equivalent |
|--------------|-------------------|
| Organization = station group | Organization = podcast network or individual show |
| Station = one of 4 brands | Show = one podcast within the network |
| Admin = station manager | Owner = show creator |
| Producer = editorial supervisor | Editor = collaborator with edit access |
| DJ = on-air talent | Host = records narration, drives creative |
| Contributor = intern | Guest Producer = limited access for freelancers |

Same WorkOS infrastructure, different role labels. A Convex org setting controls the terminology displayed in the UI:

```typescript
orgSettings: defineTable({
  // ... existing fields ...
  orgType: v.string(), // "radio_station" | "podcast_network" | "independent_podcast"
  roleLabels: v.optional(v.object({
    admin: v.string(),       // "Admin" or "Owner"
    producer: v.string(),    // "Producer" or "Editor"
    dj: v.string(),          // "DJ" or "Host"
    contributor: v.string(), // "Contributor" or "Guest Producer"
  })),
}),
```

### 15.3 COACHAGENT PODCAST-SPECIFIC COACHING

The CoachAgent's system prompt already accepts `context_type = "podcast"`. Here's how coaching adapts:

| Principle | Radio Coaching | Podcast Coaching |
|-----------|---------------|-----------------|
| **Start strong** | "Listeners will change the station" | "Listeners will hit skip — you're competing with 2 million other shows" |
| **Length** | "You have 90 seconds / 3 minutes. Every word must earn its place" | "You have 30 minutes but attention fades. Front-load the best material" |
| **Tone** | "Match station voice — 88Nine is warm, community-focused" | "Match your show's personality. Your regular listeners expect YOUR voice" |
| **Tape craft** | "3-4 cuts max in a feature" | "You can run longer tape — podcasts can breathe — but each cut still makes one point" |
| **Delivery** | "Broadcast energy — project, be present" | "Earbuds energy — intimate, conversational, like you're at a coffee table" |
| **Sound design** | "Subtle — don't distract from the news" | "You can be more expressive — podcasts reward immersive sound design" |
| **Structure** | "Linear, no doubling back, tight" | "Chapters give you reset points. Each chapter can open fresh. But within a chapter, same rules: don't double back" |
| **Audience proxy** | "Assume the listener tuned in mid-sentence" | "Your listener chose this show. They have SOME context. But don't assume they heard last week's episode" |

### 15.4 SOLO PODCASTER COACHING (No Producer)

The biggest difference for solo podcasters: there is no Sarah. No one is leaving producer notes, no one is reviewing the script before recording, no one is doing the aircheck.

The CoachAgent fills ALL of these roles for solo podcasters:

```
┌─────────────────────────────────────────────────────────────┐
│ FOR RADIO: CoachAgent supplements the human editorial layer  │
│                                                              │
│   DJ ←→ CoachAgent ←→ Producer Sarah                        │
│              ↑                ↑                               │
│         AI coaching     Human editorial                      │
│         (available      (available at                        │
│          at every        review gates)                       │
│          stage)                                              │
│                                                              │
│ FOR SOLO PODCASTERS: CoachAgent IS the editorial layer       │
│                                                              │
│   Host ←→ CoachAgent                                         │
│              ↑                                               │
│         AI coaching + AI editorial review                    │
│         (the only feedback they get)                         │
│                                                              │
│   This makes the CoachAgent MORE aggressive:                 │
│   - Flags issues that a producer would catch                 │
│   - Asks the hard questions ("is this story worth telling?") │
│   - Pushes back on unfocused pitches                         │
│   - Does the aircheck with more detail                       │
│   - Suggests structural changes, not just line edits         │
└─────────────────────────────────────────────────────────────┘
```

The CoachAgent's `context_type` determines aggression level:

```python
# In system prompt, appended when context_type == "podcast" 
# and org has no producer role users:
SOLO_PODCASTER_ADDENDUM = """
IMPORTANT: This creator is working alone. They do not have a
producer or editor reviewing their work. You are the ONLY
editorial feedback they receive.

This means you must be MORE thorough, not less:
- Flag every writing-for-ear violation, not just the worst ones
- Ask the hard questions about story focus and audience value
- Push back on weak openings and endings aggressively
- Do detailed airchecks with specific, actionable notes
- When in doubt, coach like a tough-but-supportive editor
  who wants this person to get better, not just finish

The goal: their audience should not be able to tell whether
this piece was produced solo or with a full editorial team.
"""
```

### 15.5 MARKET POSITIONING

```
┌─────────────────────────────────────────────────────────────┐
│                    STORYFORGE                                │
│         Audio Production Studio with AI Coaching             │
│                                                              │
│  ┌─────────────────┐         ┌─────────────────────────┐    │
│  │  RADIO STATIONS  │         │  PODCASTERS              │    │
│  │                  │         │                           │    │
│  │  • Newsrooms     │         │  • Independent shows      │    │
│  │  • Community     │         │  • Podcast networks       │    │
│  │    radio         │         │  • Corporate podcasts     │    │
│  │  • NPR stations  │         │  • Nonprofit storytelling │    │
│  │  • College radio │         │  • Journalism podcasts    │    │
│  │                  │         │  • Interview shows        │    │
│  │  Value prop:     │         │                           │    │
│  │  Transform DJs   │         │  Value prop:              │    │
│  │  into producers  │         │  Give every host an NPR   │    │
│  │                  │         │  editor in their pocket   │    │
│  └─────────────────┘         └─────────────────────────────┘  │
│                                                              │
│  Same tool. Same workflow. Same AI coaching.                 │
│  Different scale, style, and distribution.                   │
└─────────────────────────────────────────────────────────────┘
```

### 15.6 PRICING IMPLICATION (Post-Hackathon)

| Tier | Who It's For | Features | Model |
|------|-------------|----------|-------|
| **Solo** | Independent podcaster | 1 user, 1 show, CoachAgent, 5 stories/month, basic exports | Free or $15/mo |
| **Creator** | Growing show | 3 users, 2 shows, full CoachAgent + RAG, unlimited stories, all exports + audiograms | $39/mo |
| **Station** | Radio Milwaukee, community stations | Unlimited users, unlimited shows/stations, Story Board, producer workflow, Slack, custom style guides | $149/mo |
| **Network** | Podcast networks, NPR stations, station groups | Multi-org, SSO, custom Knowledge Base, priority support | Custom |

The CoachAgent with NPR Training methodology is the differentiator. Descript gives you text-based editing. Riverside gives you recording. Hindenburg gives you production. Nobody gives you an editor who coaches you in real-time using the same principles that trained NPR's on-air staff. That's the moat.

---

## END OF ADDENDUM v5.1

**StoryForge v5.1 is a complete audio production platform for radio and podcasters:**

- **WorkOS:** Any station or podcast network creates an account, invites team, assigns roles
- **Convex:** Real-time collaboration — every edit, every note, every status change is live
- **ElevenLabs:** AI-generated sound effects and music beds on demand
- **Freesound:** 600K+ real-world CC-licensed sounds
- **Transcript Search:** Find any word in any interview, instantly
- **Narration Recorder:** Record in-browser with teleprompter and multiple takes
- **Auto-Assembly:** AI arranges narration + tape + music + SFX into finished audio
- **Length Customizer:** 90-second air break to 60-minute podcast episode — creator controls format
- **Story Board:** Full org transparency — everyone sees what's in play
- **Producer Editing:** Direct edits with track changes, inline notes, required changes
- **Suggestions:** Low-friction team collaboration on any story
- **Edit History:** Complete audit trail of every change by every user
- **Exports:** WAV, MP3, SRT, VTT, TXT, show notes, chapter markers, audiograms — every format, every platform
- **Notifications:** Three layers — Convex real-time (in-app), Resend + React Email (transactional email), Slack Incoming Webhook (team channel)
- **CoachAgent:** NPR Training methodology integrated via 23-principle system prompt + curated Knowledge Base RAG — coaching at every production stage, adapted to radio or podcast context
- **Gradient ADK:** 4 AI agents (Python, deployed as HTTP services) — CoachAgent, TranscriptAgent, ContentAgent, WorkflowAgent
- **Everything else:** TypeScript — React frontend, Convex backend, one language for 95% of the codebase
