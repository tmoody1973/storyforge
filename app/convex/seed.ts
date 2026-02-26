import { mutation } from "./_generated/server";

export const seedStations = mutation({
  handler: async (ctx) => {
    const stations = [
      {
        slug: "88nine",
        name: "88Nine Radio Milwaukee",
        description: "Milwaukee's community-powered music discovery station.",
        voiceGuide: "Warm, inclusive, eclectic. Milwaukee pride without boosterism. Conversational but informed.",
        systemPrompt: "You are writing for 88Nine Radio Milwaukee. Your tone is warm, inclusive, and eclectic. You celebrate Milwaukee's creative community with genuine pride — never boosterism. Write conversationally, as if talking to a friend who's smart and curious. Reference specific Milwaukee places, people, and culture when relevant.",
      },
      {
        slug: "hyfin",
        name: "HYFIN",
        description: "Urban alternative radio — culture, music, conversation.",
        voiceGuide: "Urban alternative. Culturally specific. Centers Black experience. Unapologetic. Contemporary language.",
        systemPrompt: "You are writing for HYFIN, Milwaukee's urban alternative station. Your voice is culturally specific, centering the Black experience. Be unapologetic and direct. Use contemporary language naturally. The audience is engaged, culturally literate, and expects authenticity.",
      },
      {
        slug: "414music",
        name: "414 Music",
        description: "Milwaukee's local music spotlight.",
        voiceGuide: "Artist-first. Technical when needed, accessible always. Lets the music speak.",
        systemPrompt: "You are writing for 414 Music, Milwaukee's local music platform. Put the artist and their work first. Be technically informed when discussing craft, but always accessible. Let the music and the musician tell the story. Milwaukee's music scene is the heartbeat.",
      },
      {
        slug: "rhythmlab",
        name: "Rhythm Lab Radio",
        description: "Curated music with global perspective.",
        voiceGuide: "Curated. Global perspective. Music-nerd energy. Deep cuts and context.",
        systemPrompt: "You are writing for Rhythm Lab Radio. Your voice is curated and knowledgeable — music-nerd energy with a global perspective. Draw connections between genres, eras, and scenes. Offer context that deepens appreciation. Deep cuts welcome.",
      },
    ];

    for (const station of stations) {
      const existing = await ctx.db
        .query("stations")
        .withIndex("by_slug", (q) => q.eq("slug", station.slug))
        .unique();

      if (!existing) {
        await ctx.db.insert("stations", station);
      }
    }

    return { seeded: stations.length };
  },
});

export const seedDemoStory = mutation({
  handler: async (ctx) => {
    // 1. Find the 88Nine station by slug
    const station = await ctx.db
      .query("stations")
      .withIndex("by_slug", (q) => q.eq("slug", "88nine"))
      .unique();

    if (!station) {
      throw new Error(
        "88Nine station not found. Run seedStations first."
      );
    }

    // 2. Check if demo story already exists (skip if so)
    const existingStory = await ctx.db
      .query("stories")
      .withIndex("by_station", (q) => q.eq("stationId", station._id))
      .filter((q) =>
        q.eq(q.field("title"), "Milwaukee's Vanishing Jazz Clubs")
      )
      .first();

    if (existingStory) {
      return { skipped: true, storyId: existingStory._id };
    }

    // 3. Find or create a placeholder user
    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) =>
        q.eq("email", "demo@storyforge.app")
      )
      .unique();

    if (!user) {
      const userId = await ctx.db.insert("users", {
        workosUserId: "demo_user_001",
        name: "Demo Producer",
        email: "demo@storyforge.app",
        role: "producer",
        stations: [station._id],
      });
      user = (await ctx.db.get(userId))!;
    }

    // 4. Create the story
    const storyId = await ctx.db.insert("stories", {
      title: "Milwaukee's Vanishing Jazz Clubs",
      stationId: station._id,
      creatorId: user._id,
      status: "editing",
      audioDurationSeconds: 185,
      themes: ["jazz", "Milwaukee", "gentrification", "community"],
    });

    // 5. Create the transcript with rich mock data
    const markdown = `## Marcus Thompson on Milwaukee's Vanishing Jazz Clubs

**Interviewer** (0:00)
Marcus, thanks for sitting down with us. You've been part of Milwaukee's jazz scene for over thirty years. What's changed?

**Marcus Thompson** (0:12)
Man, where do I start? When I first picked up the saxophone in the early nineties, you could walk down Walnut Street and hear live jazz pouring out of three or four different clubs on any given Friday night. The Flame, King Solomon's, places that were institutions. Now? Most of them are condos.

**Interviewer** (0:38)
That's a common story in a lot of cities right now. What makes Milwaukee's situation unique?

**Marcus Thompson** (0:45)
What makes it unique is that these weren't just jazz clubs — they were community centers. You know, the Flame wasn't just where you went to hear music. It was where deals got made, where young people learned what excellence looked like, where the neighborhood had a living room. When you tear that down, you don't just lose a venue. You lose a whole ecosystem.

**Interviewer** (1:15)
Are there any bright spots? Anything giving you hope?

**Marcus Thompson** (1:20)
Absolutely. The kids, man. There's this group out of the Boys & Girls Club — they call themselves the MKE Jazz Collective. Fourteen, fifteen years old, playing like they've been at it for decades. And they're not just playing standards. They're mixing jazz with hip-hop, with electronic music, creating something new. That gives me hope.

**Interviewer** (1:52)
What do you think it would take to actually reverse this trend?

**Marcus Thompson** (1:58)
It takes the city deciding that culture is infrastructure. You wouldn't let someone tear down a bridge without a plan, right? But we let cultural landmarks disappear every day without blinking. We need zoning protections for historic music venues. We need a fund for independent club owners. And honestly? We need people to just show up. Buy a ticket. Support live music. That's the foundation everything else is built on.

**Interviewer** (2:40)
Marcus, thanks for your time and your passion. Keep swinging.

**Marcus Thompson** (2:45)
Always. The music doesn't stop just because the buildings come down. We'll find a way. We always do.`;

    const speakers = [
      { name: "Marcus Thompson", color: "#4A9EFF" },
      { name: "Interviewer", color: "#FF6B4A" },
    ];

    const wordTimestamps = [
      // Interviewer segment 1 (0:00)
      { word: "Marcus", start: 0.0, end: 0.5, speaker: "Interviewer" },
      { word: "thanks", start: 0.5, end: 0.8, speaker: "Interviewer" },
      { word: "for", start: 0.8, end: 0.95, speaker: "Interviewer" },
      { word: "sitting", start: 0.95, end: 1.3, speaker: "Interviewer" },
      { word: "down", start: 1.3, end: 1.55, speaker: "Interviewer" },
      { word: "with", start: 1.55, end: 1.7, speaker: "Interviewer" },
      { word: "us", start: 1.7, end: 1.9, speaker: "Interviewer" },
      { word: "jazz", start: 5.0, end: 5.4, speaker: "Interviewer" },
      { word: "scene", start: 5.4, end: 5.8, speaker: "Interviewer" },
      { word: "thirty", start: 6.5, end: 6.9, speaker: "Interviewer" },
      { word: "years", start: 6.9, end: 7.3, speaker: "Interviewer" },
      { word: "changed", start: 8.5, end: 9.0, speaker: "Interviewer" },
      // Marcus segment 1 (0:12)
      { word: "Man", start: 12.0, end: 12.3, speaker: "Marcus Thompson" },
      { word: "where", start: 12.3, end: 12.6, speaker: "Marcus Thompson" },
      { word: "do", start: 12.6, end: 12.75, speaker: "Marcus Thompson" },
      { word: "I", start: 12.75, end: 12.85, speaker: "Marcus Thompson" },
      { word: "start", start: 12.85, end: 13.2, speaker: "Marcus Thompson" },
      { word: "saxophone", start: 15.0, end: 15.6, speaker: "Marcus Thompson" },
      { word: "early", start: 16.0, end: 16.3, speaker: "Marcus Thompson" },
      { word: "nineties", start: 16.3, end: 16.9, speaker: "Marcus Thompson" },
      { word: "Walnut", start: 18.0, end: 18.4, speaker: "Marcus Thompson" },
      { word: "Street", start: 18.4, end: 18.8, speaker: "Marcus Thompson" },
      { word: "live", start: 20.0, end: 20.3, speaker: "Marcus Thompson" },
      { word: "jazz", start: 20.3, end: 20.7, speaker: "Marcus Thompson" },
      { word: "Friday", start: 22.5, end: 22.9, speaker: "Marcus Thompson" },
      { word: "night", start: 22.9, end: 23.3, speaker: "Marcus Thompson" },
      { word: "The", start: 24.0, end: 24.15, speaker: "Marcus Thompson" },
      { word: "Flame", start: 24.15, end: 24.6, speaker: "Marcus Thompson" },
      { word: "King", start: 24.8, end: 25.1, speaker: "Marcus Thompson" },
      { word: "Solomon's", start: 25.1, end: 25.7, speaker: "Marcus Thompson" },
      { word: "institutions", start: 27.0, end: 27.7, speaker: "Marcus Thompson" },
      { word: "condos", start: 30.0, end: 30.5, speaker: "Marcus Thompson" },
      // Interviewer segment 2 (0:38)
      { word: "common", start: 38.5, end: 38.9, speaker: "Interviewer" },
      { word: "story", start: 38.9, end: 39.3, speaker: "Interviewer" },
      { word: "cities", start: 40.0, end: 40.5, speaker: "Interviewer" },
      { word: "Milwaukee's", start: 42.0, end: 42.6, speaker: "Interviewer" },
      { word: "unique", start: 43.0, end: 43.5, speaker: "Interviewer" },
      // Marcus segment 2 (0:45)
      { word: "community", start: 48.0, end: 48.6, speaker: "Marcus Thompson" },
      { word: "centers", start: 48.6, end: 49.1, speaker: "Marcus Thompson" },
      { word: "you", start: 50.0, end: 50.15, speaker: "Marcus Thompson" },
      { word: "know", start: 50.15, end: 50.45, speaker: "Marcus Thompson" },
      { word: "the", start: 50.5, end: 50.6, speaker: "Marcus Thompson" },
      { word: "Flame", start: 50.6, end: 51.0, speaker: "Marcus Thompson" },
      { word: "deals", start: 54.0, end: 54.4, speaker: "Marcus Thompson" },
      { word: "young", start: 56.0, end: 56.3, speaker: "Marcus Thompson" },
      { word: "people", start: 56.3, end: 56.7, speaker: "Marcus Thompson" },
      { word: "excellence", start: 58.0, end: 58.6, speaker: "Marcus Thompson" },
      { word: "neighborhood", start: 60.0, end: 60.7, speaker: "Marcus Thompson" },
      { word: "living", start: 61.5, end: 61.9, speaker: "Marcus Thompson" },
      { word: "room", start: 61.9, end: 62.3, speaker: "Marcus Thompson" },
      { word: "tear", start: 63.5, end: 63.9, speaker: "Marcus Thompson" },
      { word: "venue", start: 66.0, end: 66.4, speaker: "Marcus Thompson" },
      { word: "ecosystem", start: 68.0, end: 68.7, speaker: "Marcus Thompson" },
      // Interviewer segment 3 (1:15)
      { word: "bright", start: 76.0, end: 76.4, speaker: "Interviewer" },
      { word: "spots", start: 76.4, end: 76.8, speaker: "Interviewer" },
      { word: "hope", start: 78.0, end: 78.4, speaker: "Interviewer" },
      // Marcus segment 3 (1:20)
      { word: "Absolutely", start: 80.0, end: 80.6, speaker: "Marcus Thompson" },
      { word: "kids", start: 81.5, end: 81.9, speaker: "Marcus Thompson" },
      { word: "Boys", start: 84.0, end: 84.3, speaker: "Marcus Thompson" },
      { word: "Girls", start: 84.5, end: 84.8, speaker: "Marcus Thompson" },
      { word: "Club", start: 84.8, end: 85.2, speaker: "Marcus Thompson" },
      { word: "MKE", start: 87.0, end: 87.4, speaker: "Marcus Thompson" },
      { word: "Jazz", start: 87.4, end: 87.7, speaker: "Marcus Thompson" },
      { word: "Collective", start: 87.7, end: 88.3, speaker: "Marcus Thompson" },
      { word: "Fourteen", start: 89.0, end: 89.5, speaker: "Marcus Thompson" },
      { word: "fifteen", start: 89.5, end: 89.9, speaker: "Marcus Thompson" },
      { word: "decades", start: 92.0, end: 92.5, speaker: "Marcus Thompson" },
      { word: "jazz", start: 96.0, end: 96.3, speaker: "Marcus Thompson" },
      { word: "hip-hop", start: 97.0, end: 97.5, speaker: "Marcus Thompson" },
      { word: "electronic", start: 98.0, end: 98.5, speaker: "Marcus Thompson" },
      { word: "hope", start: 101.0, end: 101.4, speaker: "Marcus Thompson" },
      // Interviewer segment 4 (1:52)
      { word: "reverse", start: 114.0, end: 114.5, speaker: "Interviewer" },
      { word: "trend", start: 114.5, end: 114.9, speaker: "Interviewer" },
      // Marcus segment 4 (1:58)
      { word: "culture", start: 120.0, end: 120.5, speaker: "Marcus Thompson" },
      { word: "infrastructure", start: 121.0, end: 121.8, speaker: "Marcus Thompson" },
      { word: "bridge", start: 124.0, end: 124.4, speaker: "Marcus Thompson" },
      { word: "cultural", start: 128.0, end: 128.5, speaker: "Marcus Thompson" },
      { word: "landmarks", start: 128.5, end: 129.1, speaker: "Marcus Thompson" },
      { word: "disappear", start: 129.5, end: 130.1, speaker: "Marcus Thompson" },
      { word: "zoning", start: 132.0, end: 132.4, speaker: "Marcus Thompson" },
      { word: "protections", start: 132.4, end: 133.0, speaker: "Marcus Thompson" },
      { word: "historic", start: 133.5, end: 134.0, speaker: "Marcus Thompson" },
      { word: "music", start: 134.0, end: 134.3, speaker: "Marcus Thompson" },
      { word: "venues", start: 134.3, end: 134.8, speaker: "Marcus Thompson" },
      { word: "fund", start: 136.0, end: 136.3, speaker: "Marcus Thompson" },
      { word: "independent", start: 137.0, end: 137.6, speaker: "Marcus Thompson" },
      { word: "club", start: 137.6, end: 137.9, speaker: "Marcus Thompson" },
      { word: "owners", start: 137.9, end: 138.3, speaker: "Marcus Thompson" },
      { word: "show", start: 141.0, end: 141.3, speaker: "Marcus Thompson" },
      { word: "up", start: 141.3, end: 141.5, speaker: "Marcus Thompson" },
      { word: "ticket", start: 142.5, end: 142.9, speaker: "Marcus Thompson" },
      { word: "live", start: 144.0, end: 144.3, speaker: "Marcus Thompson" },
      { word: "music", start: 144.3, end: 144.7, speaker: "Marcus Thompson" },
      { word: "foundation", start: 146.0, end: 146.6, speaker: "Marcus Thompson" },
      // Interviewer segment 5 (2:40)
      { word: "Marcus", start: 160.0, end: 160.4, speaker: "Interviewer" },
      { word: "thanks", start: 160.5, end: 160.9, speaker: "Interviewer" },
      { word: "passion", start: 163.0, end: 163.5, speaker: "Interviewer" },
      { word: "swinging", start: 165.0, end: 165.5, speaker: "Interviewer" },
      // Marcus segment 5 (2:45)
      { word: "Always", start: 165.5, end: 165.9, speaker: "Marcus Thompson" },
      { word: "music", start: 167.0, end: 167.4, speaker: "Marcus Thompson" },
      { word: "doesn't", start: 167.4, end: 167.8, speaker: "Marcus Thompson" },
      { word: "stop", start: 167.8, end: 168.2, speaker: "Marcus Thompson" },
      { word: "buildings", start: 170.0, end: 170.5, speaker: "Marcus Thompson" },
      { word: "come", start: 170.5, end: 170.7, speaker: "Marcus Thompson" },
      { word: "down", start: 170.7, end: 171.0, speaker: "Marcus Thompson" },
      { word: "find", start: 172.5, end: 172.8, speaker: "Marcus Thompson" },
      { word: "way", start: 173.0, end: 173.3, speaker: "Marcus Thompson" },
      { word: "always", start: 175.0, end: 175.3, speaker: "Marcus Thompson" },
      { word: "do", start: 175.3, end: 175.6, speaker: "Marcus Thompson" },
    ];

    const fillerWords = [
      {
        word: "you know",
        start: 50.0,
        end: 50.45,
        speaker: "Marcus Thompson",
      },
    ];

    const storyAngles = [
      {
        angle: "Cultural preservation",
        confidence: 0.92,
        description:
          "Historic jazz venues as irreplaceable cultural institutions",
      },
      {
        angle: "Gentrification impact",
        confidence: 0.78,
        description:
          "Development pressure converting music venues to condominiums",
      },
      {
        angle: "Grassroots revival",
        confidence: 0.85,
        description:
          "Young musicians creating a new jazz scene from community organizations",
      },
      {
        angle: "Youth engagement",
        confidence: 0.65,
        description:
          "MKE Jazz Collective as a model for next-generation cultural stewardship",
      },
    ];

    const keyQuotes = [
      {
        text: "When you tear that down, you don't just lose a venue. You lose a whole ecosystem.",
        speaker: "Marcus Thompson",
        start: 63.5,
        end: 68.7,
        themes: ["gentrification", "community"],
      },
      {
        text: "It takes the city deciding that culture is infrastructure.",
        speaker: "Marcus Thompson",
        start: 118.0,
        end: 121.8,
        themes: ["policy", "cultural preservation"],
      },
      {
        text: "They're mixing jazz with hip-hop, with electronic music, creating something new. That gives me hope.",
        speaker: "Marcus Thompson",
        start: 95.0,
        end: 101.4,
        themes: ["youth", "innovation", "hope"],
      },
      {
        text: "The music doesn't stop just because the buildings come down. We'll find a way. We always do.",
        speaker: "Marcus Thompson",
        start: 167.0,
        end: 175.6,
        themes: ["resilience", "community"],
      },
    ];

    const emotionalArc = [
      { time: 0, intensity: 0.3, label: "opening" },
      { time: 12, intensity: 0.5, label: "nostalgia" },
      { time: 30, intensity: 0.65, label: "loss" },
      { time: 45, intensity: 0.7, label: "passion" },
      { time: 63, intensity: 0.85, label: "grief" },
      { time: 75, intensity: 0.5, label: "transition" },
      { time: 80, intensity: 0.7, label: "hope" },
      { time: 100, intensity: 0.8, label: "inspiration" },
      { time: 118, intensity: 0.9, label: "urgency" },
      { time: 150, intensity: 0.75, label: "determination" },
      { time: 185, intensity: 0.6, label: "resolve" },
    ];

    const searchableText =
      "Marcus Thompson Milwaukee vanishing jazz clubs Walnut Street The Flame King Solomon's community centers gentrification condos MKE Jazz Collective Boys Girls Club hip-hop electronic music culture infrastructure zoning protections historic music venues independent club owners live music";

    const transcriptId = await ctx.db.insert("transcripts", {
      storyId,
      rawSttJson: {},
      markdown,
      speakers,
      durationSeconds: 185,
      wordTimestamps,
      fillerWords,
      storyAngles,
      keyQuotes,
      emotionalArc,
      searchableText,
    });

    // Link transcript back to the story
    await ctx.db.patch(storyId, { transcriptId });

    return { storyId, transcriptId };
  },
});
