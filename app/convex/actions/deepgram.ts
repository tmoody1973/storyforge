"use node";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

// Deepgram speaker colors — auto-assigned by index
const SPEAKER_COLORS = [
  "#F8971D", // brand orange
  "#32588E", // brand blue
  "#4A71A8", // brand blue light
  "#FFAB42", // brand orange hover
  "#10b981", // emerald
  "#a78bfa", // violet
  "#f472b6", // pink
  "#fbbf24", // amber
];

export const transcribe = action({
  args: {
    sourceId: v.id("sources"),
    storyId: v.id("stories"),
    audioUrl: v.string(),
    keyterms: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.DEEPGRAM_API_KEY;

    // -----------------------------------------------------------------------
    // Stub mode: return mock data when no API key is configured
    // -----------------------------------------------------------------------
    if (!apiKey) {
      console.log("[STUB] Deepgram transcribe called — returning mock data");
      await ctx.runMutation(internal.transcripts.insertFromDeepgram, {
        storyId: args.storyId,
        sourceId: args.sourceId,
        markdown:
          "**Speaker 0:** This is a mock transcript for development.\n\n**Speaker 1:** It includes speaker diarization and word-level timestamps for testing the UI.",
        speakers: [
          { id: "speaker_0", name: "Speaker 0", color: SPEAKER_COLORS[0] },
          { id: "speaker_1", name: "Speaker 1", color: SPEAKER_COLORS[1] },
        ],
        durationSeconds: 120,
        wordTimestamps: [
          { word: "This", start: 0.0, end: 0.2, confidence: 0.99, speaker: "speaker_0" },
          { word: "is", start: 0.2, end: 0.3, confidence: 0.99, speaker: "speaker_0" },
          { word: "a", start: 0.3, end: 0.35, confidence: 0.99, speaker: "speaker_0" },
          { word: "mock", start: 0.35, end: 0.55, confidence: 0.99, speaker: "speaker_0" },
          { word: "transcript", start: 0.55, end: 0.9, confidence: 0.98, speaker: "speaker_0" },
        ],
        fillerWords: [],
        searchableText:
          "This is a mock transcript for development. It includes speaker diarization and word-level timestamps for testing the UI.",
        rawSttJson: {},
      });
      return;
    }

    // -----------------------------------------------------------------------
    // Real Deepgram Nova-3 API call
    // -----------------------------------------------------------------------
    try {
      const params = new URLSearchParams({
        model: "nova-3",
        diarize: "true",
        punctuate: "true",
        paragraphs: "true",
        smart_format: "true",
        filler_words: "true",
        utterances: "true",
      });

      // Add keyterms for improved accuracy on proper nouns
      if (args.keyterms) {
        for (const term of args.keyterms) {
          params.append("keyterm", term);
        }
      }

      const response = await fetch(
        `https://api.deepgram.com/v1/listen?${params.toString()}`,
        {
          method: "POST",
          headers: {
            Authorization: `Token ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: args.audioUrl }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Deepgram API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      // -------------------------------------------------------------------
      // Parse response into our transcript format
      // -------------------------------------------------------------------
      const durationSeconds = data.metadata?.duration ?? 0;
      const channel = data.results?.channels?.[0];
      const alternative = channel?.alternatives?.[0];

      if (!alternative) {
        throw new Error("Deepgram returned no transcription alternatives");
      }

      // Build speakers map from diarization
      const speakerSet = new Set<number>();
      const words: Array<{
        word: string;
        start: number;
        end: number;
        confidence: number;
        speaker: string;
        punctuated_word?: string;
      }> = [];

      for (const w of alternative.words ?? []) {
        const speakerNum = w.speaker ?? 0;
        speakerSet.add(speakerNum);
        words.push({
          word: w.punctuated_word ?? w.word,
          start: w.start,
          end: w.end,
          confidence: w.confidence,
          speaker: `speaker_${speakerNum}`,
        });
      }

      const speakers = Array.from(speakerSet)
        .sort((a, b) => a - b)
        .map((num) => ({
          id: `speaker_${num}`,
          name: `Speaker ${num}`,
          color: SPEAKER_COLORS[num % SPEAKER_COLORS.length],
        }));

      // Build markdown from paragraphs (preferred) or utterances
      let markdown = "";
      const paragraphs = alternative.paragraphs?.paragraphs;

      if (paragraphs && paragraphs.length > 0) {
        const parts: string[] = [];
        for (const para of paragraphs) {
          const speakerLabel = `Speaker ${para.speaker ?? 0}`;
          const text = para.sentences
            ?.map((s: { text: string }) => s.text)
            .join(" ") ?? "";
          parts.push(`**${speakerLabel}:** ${text}`);
        }
        markdown = parts.join("\n\n");
      } else if (data.results?.utterances) {
        // Fallback to utterances
        const parts: string[] = [];
        for (const utt of data.results.utterances) {
          const speakerLabel = `Speaker ${utt.speaker ?? 0}`;
          parts.push(`**${speakerLabel}:** ${utt.transcript}`);
        }
        markdown = parts.join("\n\n");
      } else {
        // Last resort: plain transcript, no speaker labels
        markdown = alternative.transcript ?? "";
      }

      // Extract filler words
      const FILLER_SET = new Set(["uh", "um", "mhmm", "mm-mm", "uh-uh", "uh-huh", "nuh-uh"]);
      const fillerWords = words
        .filter((w) => FILLER_SET.has(w.word.toLowerCase().replace(/[.,!?]/g, "")))
        .map((w) => ({
          word: w.word,
          start: w.start,
          end: w.end,
          speaker: w.speaker,
        }));

      // Build searchable text (no speaker labels, no filler words)
      const searchableText = words
        .filter((w) => !FILLER_SET.has(w.word.toLowerCase().replace(/[.,!?]/g, "")))
        .map((w) => w.word)
        .join(" ");

      // -------------------------------------------------------------------
      // Save transcript via internal mutation
      // -------------------------------------------------------------------
      await ctx.runMutation(internal.transcripts.insertFromDeepgram, {
        storyId: args.storyId,
        sourceId: args.sourceId,
        markdown,
        speakers,
        durationSeconds,
        wordTimestamps: words,
        fillerWords,
        searchableText,
        rawSttJson: data,
      });
    } catch (error) {
      console.error("Deepgram transcription failed:", error);
      await ctx.runMutation(internal.transcripts.markSourceFailed, {
        sourceId: args.sourceId,
      });
      throw error;
    }
  },
});
