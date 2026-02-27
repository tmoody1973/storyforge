# Story Board & Multi-Source Audio Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the kanban Story Board dashboard, multi-source data model, UploadThing audio upload, and source management in the Production Workspace.

**Architecture:** New `sources` table links interviews to stories. UploadThing handles audio file uploads via a small Express dev server proxied through Vite. Story Board renders four kanban columns from Convex queries. Production Workspace transcript panel gains a source selector and upload button.

**Tech Stack:** Convex, UploadThing + Express, React 19, Tailwind v4, shadcn/ui, Lucide icons

---

### Task 1: Add `sources` table and update schema

**Files:**
- Modify: `app/convex/schema.ts`

**Step 1: Add the sources table to the schema**

Add the `sources` table after the `transcripts` table definition:

```typescript
sources: defineTable({
  storyId: v.id("stories"),
  title: v.string(),
  audioUrl: v.string(),
  transcriptId: v.optional(v.id("transcripts")),
  durationSeconds: v.optional(v.number()),
  status: v.string(), // "uploading" | "transcribing" | "ready" | "failed"
  speakerName: v.optional(v.string()),
  uploadedAt: v.number(),
})
  .index("by_story", ["storyId"])
  .index("by_story_status", ["storyId", "status"]),
```

**Step 2: Update the `transcripts` table**

Change the `storyId` field to be optional (since transcripts now link from sources, not stories):

Actually — keep `transcripts.storyId` as-is. A transcript still belongs to a story (via the source). No change needed here. The `sources` table's `transcriptId` provides the source→transcript link.

**Step 3: Remove `audioFileId` and `transcriptId` from stories**

In the stories table definition, remove these fields:
- `audioFileId: v.optional(v.id("_storage"))` — now on sources
- `transcriptId: v.optional(v.id("transcripts"))` — now on sources
- `editedAudioFileId: v.optional(v.id("_storage"))` — keep (this is the produced output)
- `previewAudioFileId: v.optional(v.id("_storage"))` — keep

**Step 4: Verify Convex deploys**

Run: `cd app && npx convex dev`
Expected: Schema syncs without errors. The existing demo story data will need migration (Task 6).

**Step 5: Commit**

```bash
git add app/convex/schema.ts
git commit -m "feat: add sources table, remove story-level audioFileId/transcriptId"
```

---

### Task 2: Create sources Convex functions

**Files:**
- Create: `app/convex/sources.ts`

**Step 1: Create the sources file with queries and mutations**

```typescript
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const listByStory = query({
  args: { storyId: v.id("stories") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sources")
      .withIndex("by_story", (q) => q.eq("storyId", args.storyId))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("sources") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    storyId: v.id("stories"),
    title: v.string(),
    audioUrl: v.string(),
    speakerName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sourceId = await ctx.db.insert("sources", {
      storyId: args.storyId,
      title: args.title,
      audioUrl: args.audioUrl,
      status: "transcribing",
      speakerName: args.speakerName,
      uploadedAt: Date.now(),
    });

    // If story is in draft, advance to transcribing
    const story = await ctx.db.get(args.storyId);
    if (story && story.status === "draft") {
      await ctx.db.patch(args.storyId, { status: "transcribing" });
    }

    return sourceId;
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("sources"),
    status: v.string(),
    transcriptId: v.optional(v.id("transcripts")),
    durationSeconds: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(id, filtered);

    // Check if all sources for this story are ready
    const source = await ctx.db.get(id);
    if (!source) return;

    const allSources = await ctx.db
      .query("sources")
      .withIndex("by_story", (q) => q.eq("storyId", source.storyId))
      .collect();

    const allReady = allSources.every((s) => s.status === "ready");
    if (allReady && allSources.length > 0) {
      const story = await ctx.db.get(source.storyId);
      if (story && story.status === "transcribing") {
        await ctx.db.patch(source.storyId, { status: "editing" });
      }
    }
  },
});

export const remove = mutation({
  args: { id: v.id("sources") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
```

**Step 2: Verify Convex syncs**

Run: `cd app && npx convex dev`
Expected: New functions appear in the Convex dashboard.

**Step 3: Commit**

```bash
git add app/convex/sources.ts
git commit -m "feat: add sources CRUD queries and mutations"
```

---

### Task 3: Update stories.create to use "draft" status

**Files:**
- Modify: `app/convex/stories.ts`

**Step 1: Update the create mutation**

Change the `stories.create` mutation to:
- Default status to `"draft"` instead of `"transcribing"`
- Look up user by Clerk subject (the `identity.subject` from Clerk is the Clerk user ID, NOT a workosUserId)

```typescript
export const create = mutation({
  args: {
    title: v.string(),
    stationId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Try finding user by email (works for both Clerk and WorkOS)
    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();

    // Auto-create user if not found
    if (!user) {
      const userId = await ctx.db.insert("users", {
        workosUserId: identity.subject,
        name: identity.name ?? "Unknown",
        email: identity.email!,
        role: "producer",
        stations: [],
        lastActiveAt: Date.now(),
      });
      user = (await ctx.db.get(userId))!;
    }

    return await ctx.db.insert("stories", {
      title: args.title,
      stationId: args.stationId,
      creatorId: user._id,
      status: "draft",
    });
  },
});
```

**Step 2: Add a `listWithSourceCounts` query** for the kanban board

Add this query to `stories.ts`:

```typescript
export const listWithSourceCounts = query({
  handler: async (ctx) => {
    const stories = await ctx.db.query("stories").order("desc").take(100);

    const withCounts = await Promise.all(
      stories.map(async (story) => {
        const sources = await ctx.db
          .query("sources")
          .withIndex("by_story", (q) => q.eq("storyId", story._id))
          .collect();

        const totalSources = sources.length;
        const readySources = sources.filter((s) => s.status === "ready").length;

        return { ...story, totalSources, readySources };
      })
    );

    return withCounts;
  },
});
```

**Step 3: Commit**

```bash
git add app/convex/stories.ts
git commit -m "feat: stories.create defaults to draft, add listWithSourceCounts"
```

---

### Task 4: Install UploadThing and set up Express server

**Files:**
- Create: `app/server/uploadthing.ts`
- Create: `app/server/index.ts`
- Modify: `app/vite.config.ts`
- Modify: `app/package.json`

**Step 1: Install packages**

```bash
cd app
npm install uploadthing @uploadthing/react express cors
npm install -D @types/express @types/cors tsx
```

**Step 2: Create the UploadThing file router**

Create `app/server/uploadthing.ts`:

```typescript
import { createUploadthing, type FileRouter } from "uploadthing/express";

const f = createUploadthing();

export const uploadRouter = {
  audioUploader: f({
    audio: {
      maxFileSize: "512MB",
      maxFileCount: 5,
    },
  }).onUploadComplete((data) => {
    console.log("Upload complete:", data.file.name, data.file.url);
  }),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
```

**Step 3: Create the Express server**

Create `app/server/index.ts`:

```typescript
import express from "express";
import cors from "cors";
import { createRouteHandler } from "uploadthing/express";
import { uploadRouter } from "./uploadthing";

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));

app.use(
  "/api/uploadthing",
  createRouteHandler({ router: uploadRouter })
);

const port = 3001;
app.listen(port, () => {
  console.log(`UploadThing server running on http://localhost:${port}`);
});
```

**Step 4: Add Vite proxy config**

Update `app/vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api/uploadthing": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
```

**Step 5: Add dev script for the upload server**

In `app/package.json`, add to scripts:

```json
"dev:upload": "tsx server/index.ts"
```

**Step 6: Create client-side UploadThing utilities**

Create `app/src/lib/uploadthing.ts`:

```typescript
import {
  generateUploadButton,
  generateUploadDropzone,
} from "@uploadthing/react";
import type { UploadRouter } from "../../server/uploadthing";

export const UploadButton = generateUploadButton<UploadRouter>({
  url: "/api/uploadthing",
});

export const UploadDropzone = generateUploadDropzone<UploadRouter>({
  url: "/api/uploadthing",
});
```

**Step 7: Add UPLOADTHING_TOKEN to `.env.local`**

Add to `app/.env.local`:
```
UPLOADTHING_TOKEN=<get from uploadthing.com dashboard>
```

Note: the Express server reads this from `process.env.UPLOADTHING_TOKEN`. Use `dotenv` or run with `--env-file=.env.local` flag:

Update the dev:upload script:
```json
"dev:upload": "tsx --env-file=.env.local server/index.ts"
```

**Step 8: Commit**

```bash
git add app/server/ app/src/lib/uploadthing.ts app/vite.config.ts app/package.json
git commit -m "feat: UploadThing server + client setup with Express and Vite proxy"
```

---

### Task 5: Clean up seed data — two stations only

**Files:**
- Modify: `app/convex/seed.ts`

**Step 1: Update seedStations to only include 88Nine and HYFIN**

Remove the `414music` and `rhythmlab` station objects from the `stations` array in the `seedStations` mutation. Keep only:

```typescript
const stations = [
  {
    slug: "88nine",
    name: "88Nine Radio Milwaukee",
    description: "Milwaukee's community-powered music discovery station.",
    voiceGuide: "Warm, inclusive, eclectic. Milwaukee pride without boosterism. Conversational but informed.",
    systemPrompt: "You are writing for 88Nine Radio Milwaukee...",
  },
  {
    slug: "hyfin",
    name: "HYFIN",
    description: "Urban alternative radio — culture, music, conversation.",
    voiceGuide: "Urban alternative. Culturally specific. Centers Black experience. Unapologetic. Contemporary language.",
    systemPrompt: "You are writing for HYFIN...",
  },
];
```

**Step 2: Update seedDemoStory to create a source instead of direct transcript link**

After creating the story and transcript, also create a source that links them:

```typescript
// After creating the transcript, create a source linking them
await ctx.db.insert("sources", {
  storyId,
  title: "Marcus Thompson Interview",
  audioUrl: "https://placeholder.storyforge.app/demo-jazz-clubs.mp3",
  transcriptId,
  durationSeconds: 185,
  status: "ready",
  speakerName: "Marcus Thompson",
  uploadedAt: Date.now(),
});
```

Remove the line that patches the story with `transcriptId` (since that field is removed from stories).

Also update the story creation to use `status: "editing"` (since the source is already "ready"):

```typescript
const storyId = await ctx.db.insert("stories", {
  title: "Milwaukee's Vanishing Jazz Clubs",
  stationId: station._id,
  creatorId: user._id,
  status: "editing",
  audioDurationSeconds: 185,
  themes: ["jazz", "Milwaukee", "gentrification", "community"],
});
```

**Step 3: Commit**

```bash
git add app/convex/seed.ts
git commit -m "feat: trim to 2 stations, seed demo source for multi-source model"
```

---

### Task 6: StoryCard component

**Files:**
- Create: `app/src/components/dashboard/StoryCard.tsx`

**Step 1: Build the StoryCard component**

```typescript
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileAudio, Plus } from "lucide-react";
import { useNavigate } from "react-router";
import type { Id } from "../../../convex/_generated/dataModel";

interface StoryCardProps {
  id: Id<"stories">;
  title: string;
  stationName: string;
  status: string;
  totalSources: number;
  readySources: number;
  createdAt: number;
  publishedDate?: number;
}

const stationColors: Record<string, string> = {
  "88Nine Radio Milwaukee": "bg-blue-500/20 text-blue-400",
  HYFIN: "bg-purple-500/20 text-purple-400",
};

function sourceLabel(status: string, total: number, ready: number): string {
  if (status === "draft" && total === 0) return "No sources yet";
  if (status === "transcribing") return `${ready}/${total} sources ready`;
  return `${total} source${total !== 1 ? "s" : ""}`;
}

export default function StoryCard({
  id,
  title,
  stationName,
  status,
  totalSources,
  readySources,
  createdAt,
  publishedDate,
}: StoryCardProps) {
  const navigate = useNavigate();

  return (
    <Card
      className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 cursor-pointer transition-colors"
      onClick={() => navigate(`/story/${id}`)}
    >
      <CardContent className="p-3 space-y-2">
        <h3 className="text-sm font-medium text-zinc-100 line-clamp-2">
          {title}
        </h3>

        <Badge
          variant="outline"
          className={`text-[10px] px-1.5 py-0 h-4 ${stationColors[stationName] ?? "bg-zinc-800 text-zinc-400"}`}
        >
          {stationName}
        </Badge>

        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          {status === "draft" && totalSources === 0 ? (
            <>
              <Plus className="h-3 w-3" />
              <span>Add audio</span>
            </>
          ) : (
            <>
              <FileAudio className="h-3 w-3" />
              <span>{sourceLabel(status, totalSources, readySources)}</span>
            </>
          )}
        </div>

        {status === "transcribing" && totalSources > 0 && (
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${(readySources / totalSources) * 100}%` }}
            />
          </div>
        )}

        <p className="text-[10px] text-zinc-600">
          {publishedDate
            ? new Date(publishedDate).toLocaleDateString()
            : new Date(createdAt).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add app/src/components/dashboard/StoryCard.tsx
git commit -m "feat: add StoryCard component for kanban board"
```

---

### Task 7: NewStoryDialog component

**Files:**
- Create: `app/src/components/dashboard/NewStoryDialog.tsx`

**Step 1: Build the dialog component**

```typescript
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "react-router";
import { api } from "../../../convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle } from "lucide-react";

export default function NewStoryDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [stationId, setStationId] = useState("");
  const navigate = useNavigate();

  const stations = useQuery(api.stations.list);
  const createStory = useMutation(api.stories.create);

  const handleCreate = async () => {
    if (!title.trim() || !stationId) return;
    const id = await createStory({ title: title.trim(), stationId });
    setOpen(false);
    setTitle("");
    setStationId("");
    navigate(`/story/${id}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <PlusCircle className="h-4 w-4" />
          New Story
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle>Create a New Story</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g. Milwaukee's Vanishing Jazz Clubs"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
          <div className="space-y-2">
            <Label>Station</Label>
            <Select value={stationId} onValueChange={setStationId}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Select a station" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {stations?.map((station) => (
                  <SelectItem key={station._id} value={station._id}>
                    {station.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleCreate}
            disabled={!title.trim() || !stationId}
            className="w-full"
          >
            Create Story
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Ensure Select is installed from shadcn**

Run: `cd app && npx shadcn@latest add select`
If already installed, this is a no-op.

**Step 3: Commit**

```bash
git add app/src/components/dashboard/NewStoryDialog.tsx
git commit -m "feat: add NewStoryDialog with title and station picker"
```

---

### Task 8: Story Board kanban DashboardPage

**Files:**
- Modify: `app/src/pages/DashboardPage.tsx`

**Step 1: Rewrite DashboardPage with kanban columns**

```typescript
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import StoryCard from "@/components/dashboard/StoryCard";
import NewStoryDialog from "@/components/dashboard/NewStoryDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const columns = [
  { status: "draft", label: "Draft" },
  { status: "transcribing", label: "Transcribing" },
  { status: "editing", label: "Editing" },
  { status: "published", label: "Published" },
] as const;

export default function DashboardPage() {
  const [stationFilter, setStationFilter] = useState("all");

  const stories = useQuery(api.stories.listWithSourceCounts);
  const stations = useQuery(api.stations.list);

  const filtered =
    stationFilter === "all"
      ? stories
      : stories?.filter((s) => s.stationId === stationFilter);

  const stationNameMap = new Map(
    stations?.map((s) => [s._id, s.name]) ?? []
  );

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <h1 className="text-xl font-bold">Story Board</h1>
        <div className="flex items-center gap-3">
          <Select value={stationFilter} onValueChange={setStationFilter}>
            <SelectTrigger className="w-48 bg-zinc-800 border-zinc-700 text-sm">
              <SelectValue placeholder="All Stations" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="all">All Stations</SelectItem>
              {stations?.map((station) => (
                <SelectItem key={station._id} value={station._id}>
                  {station.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <NewStoryDialog />
        </div>
      </div>

      {/* Kanban columns */}
      <div className="flex flex-1 min-h-0 overflow-x-auto">
        {columns.map((col) => {
          const colStories = filtered?.filter(
            (s) => s.status === col.status
          );

          return (
            <div
              key={col.status}
              className="flex-1 min-w-[240px] border-r border-zinc-800 last:border-r-0 flex flex-col"
            >
              <div className="px-4 py-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-semibold uppercase text-zinc-400">
                    {col.label}
                  </h2>
                  <span className="text-[10px] text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded-full">
                    {colStories?.length ?? 0}
                  </span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {colStories?.map((story) => (
                  <StoryCard
                    key={story._id}
                    id={story._id}
                    title={story.title}
                    stationName={
                      stationNameMap.get(story.stationId) ?? "Unknown"
                    }
                    status={story.status}
                    totalSources={story.totalSources}
                    readySources={story.readySources}
                    createdAt={story._creationTime}
                    publishedDate={story.publishedDate}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 2: Verify build**

Run: `cd app && npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add app/src/pages/DashboardPage.tsx
git commit -m "feat: kanban Story Board with four columns and station filter"
```

---

### Task 9: Source panel in Production Workspace

**Files:**
- Create: `app/src/components/production/SourcePanel.tsx`
- Modify: `app/src/pages/ProductionPage.tsx`

**Step 1: Create the SourcePanel component**

```typescript
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileAudio, Loader2, CheckCircle, AlertCircle, Upload } from "lucide-react";
import { UploadButton } from "@/lib/uploadthing";

interface SourcePanelProps {
  storyId: Id<"stories">;
  selectedSourceId: Id<"sources"> | null;
  onSelectSource: (id: Id<"sources">) => void;
  onUploadComplete: (url: string, name: string) => void;
}

const statusIcons: Record<string, typeof Loader2> = {
  uploading: Loader2,
  transcribing: Loader2,
  ready: CheckCircle,
  failed: AlertCircle,
};

const statusColors: Record<string, string> = {
  uploading: "text-yellow-400",
  transcribing: "text-blue-400",
  ready: "text-green-400",
  failed: "text-red-400",
};

export default function SourcePanel({
  storyId,
  selectedSourceId,
  onSelectSource,
  onUploadComplete,
}: SourcePanelProps) {
  const sources = useQuery(api.sources.listByStory, { storyId });

  return (
    <div className="border-b border-zinc-800">
      <div className="px-4 py-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase text-zinc-400">
          Sources
        </h3>
        <UploadButton
          endpoint="audioUploader"
          onClientUploadComplete={(res) => {
            if (res?.[0]) {
              onUploadComplete(res[0].ufsUrl, res[0].name);
            }
          }}
          onUploadError={(error) => {
            console.error("Upload error:", error);
          }}
          appearance={{
            button:
              "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-2 py-1 h-7 rounded",
            allowedContent: "hidden",
          }}
          content={{
            button: "Add Audio",
          }}
        />
      </div>

      {sources && sources.length > 0 && (
        <ScrollArea className="max-h-32">
          <div className="px-2 pb-2 space-y-1">
            {sources.map((source) => {
              const isSelected = source._id === selectedSourceId;
              const StatusIcon = statusIcons[source.status] ?? FileAudio;
              const spinning =
                source.status === "uploading" ||
                source.status === "transcribing";

              return (
                <button
                  key={source._id}
                  onClick={() => onSelectSource(source._id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs transition-colors ${
                    isSelected
                      ? "bg-zinc-800 ring-1 ring-zinc-700"
                      : "hover:bg-zinc-800/50"
                  }`}
                >
                  <StatusIcon
                    className={`h-3.5 w-3.5 flex-shrink-0 ${statusColors[source.status] ?? "text-zinc-400"} ${
                      spinning ? "animate-spin" : ""
                    }`}
                  />
                  <span className="text-zinc-200 truncate flex-1">
                    {source.title}
                  </span>
                  {source.durationSeconds && (
                    <span className="text-zinc-500">
                      {Math.floor(source.durationSeconds / 60)}:
                      {String(
                        Math.floor(source.durationSeconds % 60)
                      ).padStart(2, "0")}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {(!sources || sources.length === 0) && (
        <div className="px-4 pb-3 text-xs text-zinc-500 flex items-center gap-2">
          <Upload className="h-3.5 w-3.5" />
          Upload interview audio to get started
        </div>
      )}
    </div>
  );
}
```

**Step 2: Update ProductionPage to use SourcePanel and multi-source data**

Modify `app/src/pages/ProductionPage.tsx`:

- Import `SourcePanel` and `sources` query
- Add `selectedSourceId` state
- Query sources for the story
- Auto-select the first source
- Load transcript for the selected source (via source's transcriptId)
- Pass waveform the selected source's audioUrl

Key changes to ProductionPage:

```typescript
// Add imports
import { useState, useRef, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import SourcePanel from "@/components/production/SourcePanel";

// Inside the component, after story query:
const sources = useQuery(api.sources.listByStory, storyId ? { storyId } : "skip");
const [selectedSourceId, setSelectedSourceId] = useState<Id<"sources"> | null>(null);

// Auto-select first source
useEffect(() => {
  if (sources?.length && !selectedSourceId) {
    setSelectedSourceId(sources[0]._id);
  }
}, [sources, selectedSourceId]);

const selectedSource = sources?.find((s) => s._id === selectedSourceId);

// Load transcript for selected source (by its transcriptId)
// For now, fall back to querying by storyId for backwards compat with seeded data
const transcript = useQuery(
  api.transcripts.getByStory,
  storyId ? { storyId } : "skip"
);

// Source upload handler
const createSource = useMutation(api.sources.create);
const handleUploadComplete = async (url: string, name: string) => {
  const sourceId = await createSource({
    storyId,
    title: name.replace(/\.[^.]+$/, ""),
    audioUrl: url,
  });
  setSelectedSourceId(sourceId);
};
```

In the render, add `SourcePanel` above the transcript in the left panel:

```tsx
<div className="w-[55%] border-r border-zinc-800 overflow-hidden flex flex-col">
  <SourcePanel
    storyId={storyId}
    selectedSourceId={selectedSourceId}
    onSelectSource={setSelectedSourceId}
    onUploadComplete={handleUploadComplete}
  />
  <div className="flex-1 overflow-hidden">
    {transcript ? (
      <TranscriptPanel ... />
    ) : (
      <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
        No transcript available yet.
      </div>
    )}
  </div>
</div>
```

**Step 3: Verify build**

Run: `cd app && npx tsc --noEmit`
Expected: No errors.

**Step 4: Commit**

```bash
git add app/src/components/production/SourcePanel.tsx app/src/pages/ProductionPage.tsx
git commit -m "feat: add SourcePanel with upload and multi-source selection"
```

---

### Task 10: Install missing shadcn components and verify full build

**Step 1: Ensure all required shadcn components are installed**

```bash
cd app
npx shadcn@latest add select dialog label
```

**Step 2: Import UploadThing styles**

Add to `app/src/index.css` (after the existing tailwind import):

```css
@import "~@uploadthing/react/styles.css";
```

If that import path doesn't work with Tailwind v4, add the UploadThing CSS directly or skip the default styles (the SourcePanel uses custom `appearance` overrides anyway).

**Step 3: Full build check**

Run: `cd app && npm run build`
Expected: Build succeeds with no TypeScript errors.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: add missing shadcn components, verify full build"
```

---

### Task 11: Re-seed data and verify end-to-end

**Step 1: Clear old seed data if needed**

From the Convex dashboard or via the CLI, clear any stale stations (414 Music, Rhythm Lab).

**Step 2: Run seed mutations**

```bash
cd app
npx convex run seed:seedStations
npx convex run seed:seedDemoStory
```

**Step 3: Manual testing checklist**

Start both servers:
```bash
# Terminal 1
cd app && npm run dev

# Terminal 2
cd app && npm run dev:upload
```

Test the following:
- [ ] Dashboard loads with kanban columns
- [ ] Demo story appears in the "editing" column
- [ ] Station filter works (All / 88Nine / HYFIN)
- [ ] Click "+ New Story" → dialog opens with title + station picker
- [ ] Create a story → navigates to Production Workspace → story appears in "draft" column when navigating back
- [ ] Click demo story card → opens Production Workspace
- [ ] Source panel shows "Marcus Thompson Interview" source
- [ ] Transcript displays correctly below the source panel
- [ ] UploadThing "Add Audio" button appears in source panel

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "chore: re-seed data, verify Story Board end-to-end"
```

---

### Task 12: Push to GitHub

```bash
git push
```
