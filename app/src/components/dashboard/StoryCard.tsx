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
