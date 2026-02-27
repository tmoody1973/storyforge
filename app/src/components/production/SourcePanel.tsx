import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { FileAudio, Loader2, CheckCircle, AlertCircle, Upload, RotateCcw } from "lucide-react";
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
  transcribing: "text-brand-orange",
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
  const retryTranscription = useMutation(api.sources.retryTranscription);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  return (
    <div className="border-b border-border">
      <div className="px-4 py-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase text-cream-dim">
          Sources
        </h3>
        <UploadButton
          endpoint="audioUploader"
          onUploadBegin={() => {
            setIsUploading(true);
            setUploadProgress(0);
          }}
          onUploadProgress={(progress) => {
            setUploadProgress(progress);
          }}
          onClientUploadComplete={(res) => {
            setIsUploading(false);
            setUploadProgress(0);
            if (res?.[0]) {
              onUploadComplete(res[0].ufsUrl, res[0].name);
            }
          }}
          onUploadError={(error) => {
            setIsUploading(false);
            setUploadProgress(0);
            console.error("Upload error:", error);
          }}
          appearance={{
            button:
              "bg-card hover:bg-charcoal-hover text-cream-muted text-xs px-2 py-1 h-7 rounded",
            allowedContent: "hidden",
          }}
          content={{
            button: isUploading ? `${uploadProgress}%` : "Add Audio",
          }}
        />
      </div>

      {isUploading && (
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2 text-xs text-cream-dim mb-1">
            <Loader2 className="h-3 w-3 animate-spin text-brand-orange" />
            Uploading... {uploadProgress}%
          </div>
          <div className="h-1 bg-charcoal-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-orange rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

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
                <div
                  key={source._id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectSource(source._id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelectSource(source._id); }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-card ring-1 ring-charcoal-border"
                      : "hover:bg-charcoal-surface"
                  }`}
                >
                  <StatusIcon
                    className={`h-3.5 w-3.5 flex-shrink-0 ${statusColors[source.status] ?? "text-cream-dim"} ${
                      spinning ? "animate-spin" : ""
                    }`}
                  />
                  <span className="text-cream truncate flex-1">
                    {source.title}
                  </span>
                  {source.durationSeconds && (
                    <span className="text-cream-faint">
                      {Math.floor(source.durationSeconds / 60)}:
                      {String(
                        Math.floor(source.durationSeconds % 60)
                      ).padStart(2, "0")}
                    </span>
                  )}
                  {source.status === "failed" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        retryTranscription({ id: source._id });
                      }}
                      className="text-cream-faint hover:text-brand-orange transition-colors"
                      title="Retry transcription"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {(!sources || sources.length === 0) && (
        <div className="px-4 pb-3 text-xs text-cream-faint flex items-center gap-2">
          <Upload className="h-3.5 w-3.5" />
          Upload interview audio to get started
        </div>
      )}
    </div>
  );
}
