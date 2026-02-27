import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    workosUserId: v.string(),
    name: v.string(),
    email: v.string(),
    role: v.string(), // "admin" | "producer" | "dj" | "contributor"
    stations: v.array(v.string()),
    styleProfileId: v.optional(v.id("styleProfiles")),
    avatarUrl: v.optional(v.string()),
    lastActiveAt: v.optional(v.number()),
    notificationPrefs: v.optional(v.any()),
  })
    .index("by_workos_id", ["workosUserId"])
    .index("by_email", ["email"]),

  stations: defineTable({
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    voiceGuide: v.string(),
    systemPrompt: v.string(),
  }).index("by_slug", ["slug"]),

  stories: defineTable({
    title: v.string(),
    stationId: v.string(),
    creatorId: v.id("users"),
    status: v.string(),
    audioDurationSeconds: v.optional(v.number()),
    editedAudioFileId: v.optional(v.id("_storage")),
    previewAudioFileId: v.optional(v.id("_storage")),
    editOperations: v.optional(v.any()),
    assemblyState: v.optional(v.any()),
    generatedScript: v.optional(v.any()),
    selectedAngle: v.optional(v.string()),
    themes: v.optional(v.array(v.string())),
    emotionalTone: v.optional(v.string()),
    mustIncludeQuotes: v.optional(v.any()),
    excludeRanges: v.optional(v.any()),
    narrativeDirection: v.optional(v.string()),
    additionalContext: v.optional(v.string()),
    targetLengthSeconds: v.optional(v.number()),
    format: v.optional(v.string()),
    airBreak: v.optional(v.any()),
    podcastSegment: v.optional(v.any()),
    socialThread: v.optional(v.any()),
    webArticle: v.optional(v.any()),
    newsletterCopy: v.optional(v.any()),
    pressRelease: v.optional(v.any()),
    soundAssets: v.optional(
      v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          source: v.string(),
          fileId: v.id("_storage"),
          type: v.string(),
          prompt: v.optional(v.string()),
          freesoundId: v.optional(v.number()),
          license: v.optional(v.string()),
          attribution: v.optional(v.string()),
          durationSeconds: v.number(),
          waveformTrack: v.optional(v.number()),
        })
      )
    ),
    transcriptApprovedAt: v.optional(v.number()),
    tapeApprovedAt: v.optional(v.number()),
    assemblyApprovedAt: v.optional(v.number()),
    scriptsApprovedAt: v.optional(v.number()),
    producerApprovedAt: v.optional(v.number()),
    producerApprovedBy: v.optional(v.id("users")),
    assignedProducerId: v.optional(v.id("users")),
    scheduledDate: v.optional(v.number()),
    publishedDate: v.optional(v.number()),
  })
    .index("by_station", ["stationId"])
    .index("by_creator", ["creatorId"])
    .index("by_status", ["status"])
    .index("by_station_status", ["stationId", "status"]),

  transcripts: defineTable({
    storyId: v.id("stories"),
    rawSttJson: v.any(),
    markdown: v.string(),
    speakers: v.any(),
    durationSeconds: v.number(),
    wordTimestamps: v.any(),
    fillerWords: v.optional(v.any()),
    storyAngles: v.optional(v.any()),
    keyQuotes: v.optional(v.any()),
    emotionalArc: v.optional(v.any()),
    corrections: v.optional(v.any()),
    offRecordRanges: v.optional(v.any()),
    searchableText: v.string(),
  })
    .index("by_story", ["storyId"])
    .searchIndex("search_text", { searchField: "searchableText" }),

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

  styleProfiles: defineTable({
    userId: v.id("users"),
    samples: v.any(),
    analysis: v.any(),
  }).index("by_user", ["userId"]),

  comments: defineTable({
    storyId: v.id("stories"),
    userId: v.id("users"),
    type: v.string(),
    content: v.string(),
    scriptBlockIndex: v.optional(v.number()),
    scriptLineText: v.optional(v.string()),
    audioTimestampStart: v.optional(v.float64()),
    audioTimestampEnd: v.optional(v.float64()),
    originalText: v.optional(v.string()),
    editedText: v.optional(v.string()),
    status: v.string(),
    resolvedBy: v.optional(v.id("users")),
    resolvedAt: v.optional(v.number()),
    parentCommentId: v.optional(v.id("comments")),
    isProducerNote: v.boolean(),
    blocksProgress: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_story", ["storyId"])
    .index("by_story_status", ["storyId", "status"])
    .index("by_parent", ["parentCommentId"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: v.string(),
    storyId: v.optional(v.id("stories")),
    triggeredBy: v.optional(v.id("users")),
    message: v.string(),
    detail: v.optional(v.string()),
    deepLink: v.optional(v.any()),
    read: v.boolean(),
    emailSent: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user_unread", ["userId", "read"])
    .index("by_user_time", ["userId", "createdAt"]),

  narrationTakes: defineTable({
    storyId: v.id("stories"),
    blockIndex: v.number(),
    takeNumber: v.number(),
    audioFileId: v.id("_storage"),
    durationSeconds: v.number(),
    isSelected: v.boolean(),
    recordedBy: v.id("users"),
  })
    .index("by_story_block", ["storyId", "blockIndex"])
    .index("by_story", ["storyId"]),

  suggestions: defineTable({
    storyId: v.id("stories"),
    userId: v.id("users"),
    content: v.string(),
    attachmentUrl: v.optional(v.string()),
    attachmentFileId: v.optional(v.id("_storage")),
    parentSuggestionId: v.optional(v.id("suggestions")),
    upvotes: v.array(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_story", ["storyId"])
    .index("by_parent", ["parentSuggestionId"]),

  storyIdeas: defineTable({
    title: v.string(),
    description: v.string(),
    suggestedBy: v.id("users"),
    station: v.optional(v.string()),
    upvotes: v.array(v.id("users")),
    status: v.string(),
    claimedBy: v.optional(v.id("users")),
    createdAt: v.number(),
  }).index("by_status", ["status"]),

  editHistory: defineTable({
    storyId: v.id("stories"),
    userId: v.optional(v.id("users")),
    action: v.string(),
    details: v.any(),
    createdAt: v.number(),
  })
    .index("by_story", ["storyId"])
    .index("by_story_time", ["storyId", "createdAt"]),

  soundLibrary: defineTable({
    name: v.string(),
    description: v.string(),
    source: v.string(),
    fileId: v.id("_storage"),
    type: v.string(),
    prompt: v.optional(v.string()),
    freesoundId: v.optional(v.number()),
    license: v.optional(v.string()),
    attribution: v.optional(v.string()),
    durationSeconds: v.number(),
    tags: v.array(v.string()),
    createdBy: v.id("users"),
  })
    .index("by_type", ["type"])
    .searchIndex("search_sounds", {
      searchField: "name",
      filterFields: ["type"],
    }),

  orgSettings: defineTable({
    slackWebhookUrl: v.optional(v.string()),
    slackChannelName: v.optional(v.string()),
    slackNotifyEvents: v.optional(v.array(v.string())),
    appUrl: v.optional(v.string()),
  }),
});
