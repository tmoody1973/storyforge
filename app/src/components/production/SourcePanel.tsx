import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { FileAudio, Loader2, CheckCircle, AlertCircle, Upload } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UploadButton } from "@/lib/uploadthing";

interface SourcePanelProps {
  storyId: Id<"stories">;
  selectedSourceId: Id<"sources"> | null;
  onSelectSource: (id: Id<"sources">) => void;
  onUploadComplete: (url: string, name: string) => void;
}

const statusIcons: Record<string, typeof Loader2> = {
  uploading: Loader2,
  transcribing: Loader2,
  ready: CheckCircle,
  failed: AlertCircle,
};

const statusColors: Record<string, string> = {
  uploading: "text-yellow-400",
  transcribing: "text-blue-400",
  ready: "text-green-400",
  failed: "text-red-400",
};

export default function SourcePanel({
  storyId,
  selectedSourceId,
  onSelectSource,
  onUploadComplete,
}: SourcePanelProps) {
  const sources = useQuery(api.sources.listByStory, { storyId });

  return (
    <div className="border-b border-zinc-800">
      <div className="px-4 py-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase text-zinc-400">
          Sources
        </h3>
        <UploadButton
          endpoint="audioUploader"
          onClientUploadComplete={(res) => {
            if (res?.[0]) {
              onUploadComplete(res[0].ufsUrl, res[0].name);
            }
          }}
          onUploadError={(error) => {
            console.error("Upload error:", error);
          }}
          appearance={{
            button:
              "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-2 py-1 h-7 rounded",
            allowedContent: "hidden",
          }}
          content={{
            button: "Add Audio",
          }}
        />
      </div>

      {sources && sources.length > 0 && (
        <ScrollArea className="max-h-32">
          <div className="px-2 pb-2 space-y-1">
            {sources.map((source) => {
              const isSelected = source._id === selectedSourceId;
              const StatusIcon = statusIcons[source.status] ?? FileAudio;
              const spinning =
                source.status === "uploading" ||
                source.status === "transcribing";

              return (
                <button
                  key={source._id}
                  onClick={() => onSelectSource(source._id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs transition-colors ${
                    isSelected
                      ? "bg-zinc-800 ring-1 ring-zinc-700"
                      : "hover:bg-zinc-800/50"
                  }`}
                >
                  <StatusIcon
                    className={`h-3.5 w-3.5 flex-shrink-0 ${statusColors[source.status] ?? "text-zinc-400"} ${
                      spinning ? "animate-spin" : ""
                    }`}
                  />
                  <span className="text-zinc-200 truncate flex-1">
                    {source.title}
                  </span>
                  {source.durationSeconds && (
                    <span className="text-zinc-500">
                      {Math.floor(source.durationSeconds / 60)}:
                      {String(
                        Math.floor(source.durationSeconds % 60)
                      ).padStart(2, "0")}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {(!sources || sources.length === 0) && (
        <div className="px-4 pb-3 text-xs text-zinc-500 flex items-center gap-2">
          <Upload className="h-3.5 w-3.5" />
          Upload interview audio to get started
        </div>
      )}
    </div>
  );
}
