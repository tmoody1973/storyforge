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
        <Card className="bg-background border-border">
          <CardHeader>
            <CardTitle className="text-sm text-cream-muted">
              Story Angles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {storyAngles.map((item) => (
              <div key={item.angle} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-cream">{item.angle}</span>
                  <span className="text-cream-dim">
                    {Math.round(item.strength * 100)}%
                  </span>
                </div>
                <div className="h-1.5 bg-card rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-orange rounded-full transition-all"
                    style={{ width: `${item.strength * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Key Quotes Card */}
        <Card className="bg-background border-border">
          <CardHeader>
            <CardTitle className="text-sm text-cream-muted">Key Quotes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {keyQuotes.map((quote) => (
              <div
                key={`${quote.start}-${quote.text.slice(0, 20)}`}
                className="p-2 rounded bg-charcoal-surface hover:bg-card cursor-pointer transition-colors"
                onClick={() => onSeek(quote.start)}
              >
                <p className="text-xs text-cream italic">
                  &ldquo;{quote.text}&rdquo;
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-cream-faint">
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
        <Card className="bg-background border-border">
          <CardHeader>
            <CardTitle className="text-sm text-cream-muted">
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
                  <stop offset="0%" stopColor="#F8971D" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#F8971D" stopOpacity={0.05} />
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
                    stroke="#F8971D"
                    strokeWidth={2}
                  />

                  {/* Data points */}
                  {arcPoints.map((point, i) => (
                    <circle
                      key={i}
                      cx={point.x}
                      cy={point.y}
                      r={2.5}
                      fill="#F8971D"
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
