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
  "88Nine Radio Milwaukee": "bg-brand-orange/20 text-brand-orange",
  HYFIN: "bg-brand-blue/20 text-brand-blue-light",
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
      className="bg-background border-border hover:border-charcoal-border cursor-pointer transition-colors"
      onClick={() => navigate(`/story/${id}`)}
    >
      <CardContent className="p-3 space-y-2">
        <h3 className="text-sm font-medium text-foreground line-clamp-2">
          {title}
        </h3>

        <Badge
          variant="outline"
          className={`text-[10px] px-1.5 py-0 h-4 ${stationColors[stationName] ?? "bg-card text-cream-dim"}`}
        >
          {stationName}
        </Badge>

        <div className="flex items-center gap-1.5 text-xs text-cream-faint">
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
          <div className="h-1 bg-card rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-orange rounded-full transition-all"
              style={{ width: `${(readySources / totalSources) * 100}%` }}
            />
          </div>
        )}

        <p className="text-[10px] text-cream-faint">
          {publishedDate
            ? new Date(publishedDate).toLocaleDateString()
            : new Date(createdAt).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
}
