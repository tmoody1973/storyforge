import { useRef, useState } from "react";
import { MoreHorizontal, Undo2, MessageSquare, Mic, EyeOff, Eye, Check, X } from "lucide-react";
import type { ScriptBlock } from "@/lib/scriptTypes";
import { getEffectiveSource } from "@/lib/scriptHelpers";
import { formatTimestamp } from "@/lib/transcript";

const BORDER_COLORS: Record<string, string> = {
  transcript: "border-l-cream-dim",
  human: "border-l-green-400",
  ai: "border-l-purple-400",
  voiceover: "border-l-blue-400",
};

interface ScriptBlockTranscriptProps {
  block: ScriptBlock;
  isActive: boolean;
  onTextChange: (blockId: string, text: string) => void;
  onToggleExclude: (blockId: string) => void;
  onInsertVoiceover: (afterBlockId: string) => void;
  onAskCoach: (blockId: string, text: string) => void;
  onRevert: (blockId: string) => void;
  onAcceptSuggestion: (blockId: string) => void;
  onRejectSuggestion: (blockId: string) => void;
  onSeek: (time: number) => void;
}

export default function ScriptBlockTranscript({
  block,
  isActive,
  onTextChange,
  onToggleExclude,
  onInsertVoiceover,
  onAskCoach,
  onRevert,
  onAcceptSuggestion,
  onRejectSuggestion,
  onSeek,
}: ScriptBlockTranscriptProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const editRef = useRef<HTMLDivElement>(null);
  const effectiveSource = getEffectiveSource(block);
  const borderColor = BORDER_COLORS[effectiveSource] ?? "border-l-cream-dim";
  const displayText = block.editedText ?? block.originalText ?? "";

  function handleBlur() {
    const text = editRef.current?.innerText?.trim() ?? "";
    if (text !== displayText) {
      onTextChange(block.id, text);
    }
  }

  return (
    <div
      className={`relative border-l-4 ${borderColor} rounded-r-lg px-3 py-2 transition-all ${
        block.excluded
          ? "opacity-40"
          : isActive
            ? "bg-card ring-1 ring-charcoal-border"
            : "hover:bg-charcoal-surface/50"
      }`}
    >
      {/* Header: speaker + timestamp */}
      <div className="mb-1 flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: block.speakerName ? undefined : "#a1a1aa" }}
        />
        <span className="text-xs font-medium text-cream-muted">
          {block.speakerName ?? "Unknown"}
        </span>
        {block.startTime != null && (
          <button
            onClick={() => onSeek(block.startTime!)}
            className="text-xs text-cream-faint hover:text-brand-orange transition-colors"
          >
            {formatTimestamp(block.startTime)}
          </button>
        )}

        {/* Three-dot menu */}
        <div className="ml-auto relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-cream-faint hover:text-cream-muted transition-colors p-1"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg bg-card border border-charcoal-border shadow-lg py-1">
                <button
                  onClick={() => { onToggleExclude(block.id); setMenuOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-cream-muted hover:bg-charcoal-surface transition-colors"
                >
                  {block.excluded ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  {block.excluded ? "Include" : "Exclude"}
                </button>
                <button
                  onClick={() => { onInsertVoiceover(block.id); setMenuOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-cream-muted hover:bg-charcoal-surface transition-colors"
                >
                  <Mic className="h-3.5 w-3.5" />
                  Add VO Below
                </button>
                <button
                  onClick={() => { onAskCoach(block.id, displayText); setMenuOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-cream-muted hover:bg-charcoal-surface transition-colors"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Ask Coach
                </button>
                {block.editedText != null && (
                  <button
                    onClick={() => { onRevert(block.id); setMenuOpen(false); }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-cream-muted hover:bg-charcoal-surface transition-colors"
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                    Revert to Original
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Editable text */}
      <div
        ref={editRef}
        contentEditable={!block.excluded}
        suppressContentEditableWarning
        onBlur={handleBlur}
        className={`text-sm leading-relaxed text-cream-muted outline-none rounded px-1 -mx-1 ${
          block.excluded ? "line-through cursor-default" : "focus:bg-charcoal-surface/50"
        }`}
      >
        {displayText}
      </div>

      {/* AI suggestion inline */}
      {block.aiSuggestion && block.aiSuggestionAccepted == null && (
        <div className="mt-2 border border-purple-400/30 bg-purple-400/5 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-purple-400">AI Suggestion</span>
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => onAcceptSuggestion(block.id)}
                className="text-green-400 hover:text-green-300 p-0.5"
                title="Accept"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onRejectSuggestion(block.id)}
                className="text-red-400 hover:text-red-300 p-0.5"
                title="Reject"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <p className="text-sm text-purple-300/80">{block.aiSuggestion}</p>
        </div>
      )}
    </div>
  );
}
