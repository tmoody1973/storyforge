import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AnalysisCardsProps {
  storyAngles: Array<{ angle: string; strength: number; reasoning: string }>;
  keyQuotes: Array<{ text: string; start: number; end: number; theme: string }>;
  emotionalArc: Array<{ time: number; intensity: number }>;
  onSeek: (time: number) => void;
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function AnalysisCards({
  storyAngles,
  keyQuotes,
  emotionalArc,
  onSeek,
}: AnalysisCardsProps) {
  // Build SVG polyline points and area polygon for the emotional arc
  const svgWidth = 280;
  const svgHeight = 60;

  const arcPoints = emotionalArc.map((point, i) => {
    const x =
      emotionalArc.length > 1
        ? (i / (emotionalArc.length - 1)) * svgWidth
        : svgWidth / 2;
    const y = svgHeight - point.intensity * svgHeight;
    return { x, y };
  });

  const polylinePoints = arcPoints.map((p) => `${p.x},${p.y}`).join(" ");

  // Area polygon: line points + bottom-right + bottom-left to close the shape
  const areaPoints =
    arcPoints.length > 0
      ? [
          ...arcPoints.map((p) => `${p.x},${p.y}`),
          `${arcPoints[arcPoints.length - 1].x},${svgHeight}`,
          `${arcPoints[0].x},${svgHeight}`,
        ].join(" ")
      : "";

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-1">
        {/* Story Angles Card */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm text-zinc-300">
              Story Angles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {storyAngles.map((item) => (
              <div key={item.angle} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-200">{item.angle}</span>
                  <span className="text-zinc-400">
                    {Math.round(item.strength * 100)}%
                  </span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${item.strength * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Key Quotes Card */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm text-zinc-300">Key Quotes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {keyQuotes.map((quote) => (
              <div
                key={`${quote.start}-${quote.text.slice(0, 20)}`}
                className="p-2 rounded bg-zinc-800/50 hover:bg-zinc-800 cursor-pointer transition-colors"
                onClick={() => onSeek(quote.start)}
              >
                <p className="text-xs text-zinc-200 italic">
                  &ldquo;{quote.text}&rdquo;
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-zinc-500">
                    {formatTimestamp(quote.start)}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-4"
                  >
                    {quote.theme}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Emotional Arc Card */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm text-zinc-300">
              Emotional Arc
            </CardTitle>
          </CardHeader>
          <CardContent>
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-16"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient
                  id="arcGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#4A9EFF" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#4A9EFF" stopOpacity={0.05} />
                </linearGradient>
              </defs>

              {arcPoints.length > 0 && (
                <>
                  {/* Area fill */}
                  <polygon
                    points={areaPoints}
                    fill="url(#arcGradient)"
                  />

                  {/* Line */}
                  <polyline
                    points={polylinePoints}
                    fill="none"
                    stroke="#4A9EFF"
                    strokeWidth={2}
                  />

                  {/* Data points */}
                  {arcPoints.map((point, i) => (
                    <circle
                      key={i}
                      cx={point.x}
                      cy={point.y}
                      r={2.5}
                      fill="#4A9EFF"
                    />
                  ))}
                </>
              )}
            </svg>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
