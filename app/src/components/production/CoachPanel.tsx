import type { Id } from "../../../convex/_generated/dataModel";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import AnalysisCards from "./AnalysisCards";
import CoachChat from "./CoachChat";
import SteeringControls from "./SteeringControls";

interface CoachPanelProps {
  storyId: Id<"stories">;
  storyAngles: Array<{ angle: string; strength: number; reasoning: string }>;
  keyQuotes: Array<{ text: string; start: number; end: number; theme: string }>;
  emotionalArc: Array<{ time: number; intensity: number }>;
  selectedAngle?: string;
  emotionalTone?: string;
  narrativeDirection?: string;
  onSeek: (time: number) => void;
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
}: CoachPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <Tabs defaultValue="analysis" className="flex flex-col flex-1 min-h-0">
        <TabsList className="mx-4 mt-3 bg-zinc-800/50">
          <TabsTrigger value="analysis" className="text-xs">
            Analysis
          </TabsTrigger>
          <TabsTrigger value="chat" className="text-xs">
            Coach Chat
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
          <CoachChat storyId={storyId as string} />
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
