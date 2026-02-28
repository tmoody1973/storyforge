import { useEffect, useRef, useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ProducerScript, ScriptBlock } from "@/lib/scriptTypes";
import { findActiveBlock } from "@/lib/scriptHelpers";
import ScriptBlockTranscript from "./ScriptBlockTranscript";
import ScriptBlockVoiceover from "./ScriptBlockVoiceover";
import ScriptToolbar from "./ScriptToolbar";

interface ScriptEditorProps {
  storyId: Id<"stories">;
  script: ProducerScript | null;
  currentTime: number;
  onSeek: (time: number) => void;
  onAskCoach: (message: string) => void;
  sourceId?: Id<"sources">;
  storyTitle: string;
}

export default function ScriptEditor({
  storyId,
  script: serverScript,
  currentTime,
  onSeek,
  onAskCoach,
  sourceId,
  storyTitle,
}: ScriptEditorProps) {
  const [localScript, setLocalScript] = useState<ProducerScript | null>(null);
  const [draftingBlockId, setDraftingBlockId] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  const initializeScript = useMutation(api.scripts.initializeScript);
  const saveScriptMutation = useMutation(api.scripts.saveScript);
  const updateBlockTextMutation = useMutation(api.scripts.updateBlockText);
  const toggleBlockExclusionMutation = useMutation(api.scripts.toggleBlockExclusion);
  const insertVoiceoverMutation = useMutation(api.scripts.insertVoiceoverBlock);
  const updateVoiceoverMutation = useMutation(api.scripts.updateVoiceoverBlock);
  const removeBlockMutation = useMutation(api.scripts.removeBlock);
  const handleAiSuggestionMutation = useMutation(api.scripts.handleAiSuggestion);

  // Sync server script to local
  useEffect(() => {
    if (serverScript) {
      setLocalScript(serverScript);
    }
  }, [serverScript]);

  // Initialize script on mount if it doesn't exist
  useEffect(() => {
    if (serverScript === null) {
      initializeScript({ storyId, sourceId }).catch(() => {
        // Script initialization failed — likely no transcript
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll to active block during playback
  const blocks = localScript?.blocks ?? [];
  const activeIndex = findActiveBlock(blocks, currentTime);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeIndex]);

  // Debounced save
  const scheduleSave = useCallback(
    (updatedScript: ProducerScript) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveScriptMutation({ storyId, script: updatedScript });
      }, 3000);
    },
    [storyId, saveScriptMutation],
  );

  // ---------------------------------------------------------------------------
  // Block action handlers
  // ---------------------------------------------------------------------------

  function handleTextChange(blockId: string, text: string) {
    // Optimistic local update
    setLocalScript((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        blocks: prev.blocks.map((b) =>
          b.id === blockId ? { ...b, editedText: text, source: "human" as const } : b,
        ),
        lastEditedAt: Date.now(),
      };
      scheduleSave(updated);
      return updated;
    });
    // Also persist immediately for this single block
    updateBlockTextMutation({ storyId, blockId, editedText: text });
  }

  function handleToggleExclude(blockId: string) {
    setLocalScript((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        blocks: prev.blocks.map((b) =>
          b.id === blockId ? { ...b, excluded: !b.excluded } : b,
        ),
        lastEditedAt: Date.now(),
      };
    });
    toggleBlockExclusionMutation({ storyId, blockId });
  }

  function handleInsertVoiceover(afterBlockId: string) {
    insertVoiceoverMutation({ storyId, afterBlockId });
  }

  function handleAskCoach(blockId: string, text: string) {
    const block = blocks.find((b) => b.id === blockId);
    const context = block?.speakerName
      ? `[${block.speakerName}]: "${text}"`
      : `"${text}"`;
    onAskCoach(`How should I improve this? ${context}`);
  }

  function handleRevert(blockId: string) {
    setLocalScript((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        blocks: prev.blocks.map((b) =>
          b.id === blockId ? { ...b, editedText: undefined, source: "transcript" as const } : b,
        ),
        lastEditedAt: Date.now(),
      };
    });
    const block = blocks.find((b) => b.id === blockId);
    if (block?.originalText != null) {
      updateBlockTextMutation({ storyId, blockId, editedText: block.originalText });
    }
  }

  function handleAcceptSuggestion(blockId: string) {
    handleAiSuggestionMutation({ storyId, blockId, accepted: true });
  }

  function handleRejectSuggestion(blockId: string) {
    handleAiSuggestionMutation({ storyId, blockId, accepted: false });
  }

  function handleUpdateVoCue(blockId: string, cueText: string) {
    updateVoiceoverMutation({ storyId, blockId, cueText });
  }

  async function handleDraftWithAi(blockId: string, cueText: string) {
    setDraftingBlockId(blockId);
    // Send to coach for VO drafting
    const surroundingContext = blocks
      .filter((b) => !b.excluded && b.type === "transcript")
      .slice(0, 3)
      .map((b) => b.editedText ?? b.originalText)
      .join(" ");

    onAskCoach(
      `Write a concise voice-over narration for this cue: "${cueText}". Context from the interview: ${surroundingContext.slice(0, 500)}`,
    );
    setDraftingBlockId(null);
  }

  function handleRemoveBlock(blockId: string) {
    setLocalScript((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        blocks: prev.blocks.filter((b) => b.id !== blockId),
        lastEditedAt: Date.now(),
      };
    });
    removeBlockMutation({ storyId, blockId });
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!localScript) {
    return (
      <div className="flex items-center justify-center h-full text-cream-faint text-sm">
        Initializing script from transcript...
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <ScriptToolbar
        blocks={localScript.blocks}
        storyTitle={storyTitle}
        script={localScript}
        onInsertVoiceover={() => insertVoiceoverMutation({ storyId })}
      />

      <ScrollArea className="flex-1 overflow-hidden">
        <div className="space-y-1 px-2 pb-4">
          {localScript.blocks.map((block: ScriptBlock, i: number) => {
            const isActive = i === activeIndex;

            if (block.type === "voiceover") {
              return (
                <div
                  key={block.id}
                  ref={isActive ? activeRef : undefined}
                >
                  <ScriptBlockVoiceover
                    block={block}
                    isActive={isActive}
                    onUpdateCue={handleUpdateVoCue}
                    onDraftWithAi={handleDraftWithAi}
                    onRemove={handleRemoveBlock}
                    isDraftingAi={draftingBlockId === block.id}
                  />
                </div>
              );
            }

            return (
              <div
                key={block.id}
                ref={isActive ? activeRef : undefined}
              >
                <ScriptBlockTranscript
                  block={block}
                  isActive={isActive}
                  onTextChange={handleTextChange}
                  onToggleExclude={handleToggleExclude}
                  onInsertVoiceover={handleInsertVoiceover}
                  onAskCoach={handleAskCoach}
                  onRevert={handleRevert}
                  onAcceptSuggestion={handleAcceptSuggestion}
                  onRejectSuggestion={handleRejectSuggestion}
                  onSeek={onSeek}
                />
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
