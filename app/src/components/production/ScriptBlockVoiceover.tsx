import { useState } from "react";
import { Trash2, Sparkles, Loader2 } from "lucide-react";
import type { ScriptBlock } from "@/lib/scriptTypes";

interface ScriptBlockVoiceoverProps {
  block: ScriptBlock;
  isActive: boolean;
  onUpdateCue: (blockId: string, cueText: string) => void;
  onDraftWithAi: (blockId: string, cueText: string) => void;
  onRemove: (blockId: string) => void;
  isDraftingAi?: boolean;
}

export default function ScriptBlockVoiceover({
  block,
  isActive,
  onUpdateCue,
  onDraftWithAi,
  onRemove,
  isDraftingAi,
}: ScriptBlockVoiceoverProps) {
  const [cueText, setCueText] = useState(block.voCueText ?? "");

  function handleCueBlur() {
    if (cueText !== (block.voCueText ?? "")) {
      onUpdateCue(block.id, cueText);
    }
  }

  return (
    <div
      className={`relative border-l-4 border-l-blue-400 rounded-r-lg px-3 py-2 transition-all ${
        block.excluded
          ? "opacity-40"
          : isActive
            ? "bg-card ring-1 ring-charcoal-border"
            : "hover:bg-charcoal-surface/50"
      }`}
    >
      {/* Header */}
      <div className="mb-1 flex items-center gap-2">
        <span className="text-xs font-semibold text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">
          VO
        </span>
        <span className="text-xs text-cream-faint">Voice-Over</span>

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => onDraftWithAi(block.id, cueText)}
            disabled={isDraftingAi || !cueText.trim()}
            className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 disabled:opacity-40 transition-colors px-1.5 py-0.5"
            title="Draft with AI"
          >
            {isDraftingAi ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            Draft
          </button>
          <button
            onClick={() => onRemove(block.id)}
            className="text-cream-faint hover:text-red-400 transition-colors p-0.5"
            title="Remove voice-over"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Cue text input */}
      <input
        type="text"
        value={cueText}
        onChange={(e) => setCueText(e.target.value)}
        onBlur={handleCueBlur}
        placeholder="Enter VO cue/direction..."
        className="w-full text-sm text-cream-muted bg-transparent border-b border-charcoal-border focus:border-blue-400 outline-none pb-1 placeholder:text-cream-faint"
      />

      {/* AI draft narration */}
      {block.voDraftNarration && (
        <div className="mt-2 border border-purple-400/30 bg-purple-400/5 rounded-lg px-3 py-2">
          <span className="text-xs font-medium text-purple-400 block mb-1">AI Draft</span>
          <p className="text-sm text-cream-muted">{block.voDraftNarration}</p>
        </div>
      )}
    </div>
  );
}
