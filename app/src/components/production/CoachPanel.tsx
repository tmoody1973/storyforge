import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Copy, Check, Loader2, Sparkles } from "lucide-react";
import AnalysisCards from "./AnalysisCards";
import CoachChat from "./CoachChat";
import SteeringControls from "./SteeringControls";

// ---------------------------------------------------------------------------
// Content format definitions
// ---------------------------------------------------------------------------

const CONTENT_FORMATS = [
  { key: "airBreak", label: "Air Break" },
  { key: "podcastSegment", label: "Podcast Segment" },
  { key: "socialThread", label: "Social Posts" },
  { key: "webArticle", label: "Web Article" },
  { key: "newsletterCopy", label: "Newsletter" },
  { key: "pressRelease", label: "Press Release" },
] as const;

type ContentKey = (typeof CONTENT_FORMATS)[number]["key"];
type GeneratedContent = Partial<Record<ContentKey, string>>;

// ---------------------------------------------------------------------------
// ContentCard
// ---------------------------------------------------------------------------

function ContentCard({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-card border border-charcoal-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-cream-muted text-sm font-semibold">{label}</h4>
        <button
          onClick={handleCopy}
          className="text-cream-faint hover:text-brand-orange transition-colors"
          title="Copy to clipboard"
        >
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      </div>
      <p className="text-cream-muted text-sm whitespace-pre-wrap">{text}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CoachPanel
// ---------------------------------------------------------------------------

interface CoachPanelProps {
  storyId: Id<"stories">;
  storyAngles: Array<{ angle: string; strength: number; reasoning: string }>;
  keyQuotes: Array<{ text: string; start: number; end: number; theme: string }>;
  emotionalArc: Array<{ time: number; intensity: number }>;
  selectedAngle?: string;
  emotionalTone?: string;
  narrativeDirection?: string;
  onSeek: (time: number) => void;
  transcriptMarkdown?: string;
}

export default function CoachPanel({
  storyId,
  storyAngles,
  keyQuotes,
  emotionalArc,
  selectedAngle,
  emotionalTone,
  narrativeDirection,
  onSeek,
  transcriptMarkdown,
}: CoachPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] =
    useState<GeneratedContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const callAgent = useAction(api.actions.gradientAgent.callAgent);
  const saveContent = useMutation(api.stories.saveGeneratedContent);

  // -------------------------------------------------------------------------
  // Generate content via Gradient content agent
  // -------------------------------------------------------------------------

  async function handleGenerate() {
    if (!transcriptMarkdown) return;

    setIsGenerating(true);
    setError(null);

    try {
      const result = await callAgent({
        agent: "content",
        payload: {
          transcript: transcriptMarkdown,
          steering: {
            selectedAngle,
            emotionalTone,
            narrativeDirection,
          },
          station: {},
          style_profile: "",
        },
      });

      const content = result as GeneratedContent;
      setGeneratedContent(content);

      // Persist generated content to the story
      await saveContent({
        storyId,
        airBreak: content.airBreak,
        podcastSegment: content.podcastSegment,
        socialThread: content.socialThread,
        webArticle: content.webArticle,
        newsletterCopy: content.newsletterCopy,
        pressRelease: content.pressRelease,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate content."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col h-full">
      <Tabs defaultValue="analysis" className="flex flex-col flex-1 min-h-0">
        <TabsList className="mx-4 mt-3 bg-charcoal-surface">
          <TabsTrigger value="analysis" className="text-xs">
            Analysis
          </TabsTrigger>
          <TabsTrigger value="chat" className="text-xs">
            Coach Chat
          </TabsTrigger>
          <TabsTrigger value="content" className="text-xs">
            Content
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="flex-1 min-h-0">
          <AnalysisCards
            storyAngles={storyAngles}
            keyQuotes={keyQuotes}
            emotionalArc={emotionalArc}
            onSeek={onSeek}
          />
        </TabsContent>

        <TabsContent value="chat" className="flex-1 min-h-0">
          <CoachChat
            storyId={storyId as string}
            transcriptMarkdown={transcriptMarkdown}
          />
        </TabsContent>

        <TabsContent value="content" className="flex-1 min-h-0">
          <div className="flex flex-col h-full">
            {/* Generate button */}
            <div className="p-4 border-b border-charcoal-border">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !transcriptMarkdown}
                className="w-full bg-brand-orange text-background hover:bg-brand-orange-hover disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Content
                  </>
                )}
              </Button>
              {!transcriptMarkdown && (
                <p className="text-cream-faint text-xs mt-2 text-center">
                  A transcript is required to generate content.
                </p>
              )}
            </div>

            {/* Error state */}
            {error && (
              <div className="px-4 pt-3">
                <div className="bg-red-900/20 border border-red-800/40 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Generated content list */}
            {generatedContent && (
              <ScrollArea className="flex-1">
                <div className="space-y-3 p-4">
                  {CONTENT_FORMATS.map(({ key, label }) => {
                    const text = generatedContent[key];
                    if (!text) return null;
                    const display =
                      typeof text === "string"
                        ? text
                        : JSON.stringify(text, null, 2);
                    return (
                      <ContentCard key={key} label={label} text={display} />
                    );
                  })}
                </div>
              </ScrollArea>
            )}

            {/* Empty state */}
            {!generatedContent && !isGenerating && !error && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-cream-faint text-sm text-center px-6">
                  Generate multi-format content from your transcript using the
                  Gradient content agent.
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <SteeringControls
        storyId={storyId}
        selectedAngle={selectedAngle}
        emotionalTone={emotionalTone}
        narrativeDirection={narrativeDirection}
        availableAngles={storyAngles}
      />
    </div>
  );
}
