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
