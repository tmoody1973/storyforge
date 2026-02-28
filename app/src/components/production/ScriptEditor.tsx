import { useEffect, useRef, useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ProducerScript, ProducerScriptV1, ScriptBlock, EditOperation } from "@/lib/scriptTypes";
import { migrateV1toV2, getActiveBlocks } from "@/lib/scriptTypes";
import { findActiveBlock, computeExcludedRanges } from "@/lib/scriptHelpers";
import type { TimeRange } from "@/lib/scriptHelpers";
import type { WordTimestamp } from "@/lib/transcript";
import { useUndoStack } from "@/hooks/useUndoStack";
import ScriptBlockTranscript from "./ScriptBlockTranscript";
import ScriptBlockVoiceover from "./ScriptBlockVoiceover";
import ScriptToolbar from "./ScriptToolbar";

interface ScriptEditorProps {
  storyId: Id<"stories">;
  script: ProducerScript | ProducerScriptV1 | null;
  currentTime: number;
  onSeek: (time: number) => void;
  onAskCoach: (message: string) => void;
  sourceId?: Id<"sources">;
  storyTitle: string;
  wordTimestamps?: WordTimestamp[];
  fillerWords?: Array<{ word: string; start: number; end: number; speaker: string }>;
  onExcludedRangesChange?: (ranges: TimeRange[]) => void;
}

export default function ScriptEditor({
  storyId,
  script: serverScript,
  currentTime,
  onSeek,
  onAskCoach,
  sourceId,
  storyTitle,
  wordTimestamps,
  fillerWords,
  onExcludedRangesChange,
}: ScriptEditorProps) {
  const [localScript, setLocalScript] = useState<ProducerScript | null>(null);
  const [draftingBlockId, setDraftingBlockId] = useState<string | null>(null);
  const [correctMode, setCorrectMode] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef<HTMLDivElement>(null);
  const undoStack = useUndoStack(50);

  const initializeScript = useMutation(api.scripts.initializeScript);
  const saveScriptMutation = useMutation(api.scripts.saveScript);
  const updateBlockTextMutation = useMutation(api.scripts.updateBlockText);
  const toggleBlockExclusionMutation = useMutation(api.scripts.toggleBlockExclusion);
  const insertVoiceoverMutation = useMutation(api.scripts.insertVoiceoverBlock);
  const updateVoiceoverMutation = useMutation(api.scripts.updateVoiceoverBlock);
  const removeBlockMutation = useMutation(api.scripts.removeBlock);
  const handleAiSuggestionMutation = useMutation(api.scripts.handleAiSuggestion);
  const toggleWordExclusionMutation = useMutation(api.scripts.toggleWordExclusion);
  const removeAllFillersMutation = useMutation(api.scripts.removeAllFillers);
  const restoreAllFillersMutation = useMutation(api.scripts.restoreAllFillers);
  const correctWordMutation = useMutation(api.scripts.correctWord);
  const createVersionMutation = useMutation(api.scripts.createVersion);
  const switchVersionMutation = useMutation(api.scripts.switchVersion);
  const renameVersionMutation = useMutation(api.scripts.renameVersion);
  const deleteVersionMutation = useMutation(api.scripts.deleteVersion);

  // Sync server script to local (auto-migrate v1→v2)
  useEffect(() => {
    if (serverScript) {
      const migrated = migrateV1toV2(serverScript as ProducerScriptV1 | ProducerScript);
      setLocalScript(migrated);
    }
  }, [serverScript]);

  // Initialize script on mount if it doesn't exist
  useEffect(() => {
    if (serverScript === null) {
      initializeScript({
        storyId,
        sourceId,
        fillerWords: fillerWords?.map((fw) => ({
          word: fw.word,
          start: fw.start,
          end: fw.end,
          speaker: fw.speaker,
        })),
      }).catch(() => {
        // Script initialization failed — likely no transcript
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get active blocks from the current version
  const blocks = localScript ? getActiveBlocks(localScript) : [];
  const activeIndex = findActiveBlock(blocks, currentTime);

  // Compute and propagate excluded ranges
  useEffect(() => {
    if (onExcludedRangesChange) {
      const ranges = computeExcludedRanges(blocks);
      onExcludedRangesChange(ranges);
    }
  }, [blocks, onExcludedRangesChange]);

  // Auto-scroll to active block during playback
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeIndex]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Helper: update blocks in the active version of localScript
  function updateLocalBlocks(
    updater: (blocks: ScriptBlock[]) => ScriptBlock[],
  ) {
    setLocalScript((prev) => {
      if (!prev) return prev;
      const updated: ProducerScript = {
        ...prev,
        versions: prev.versions.map((v) =>
          v.id === prev.activeVersionId
            ? { ...v, blocks: updater(v.blocks) }
            : v,
        ),
        lastEditedAt: Date.now(),
      };
      scheduleSave(updated);
      return updated;
    });
  }

  // ---------------------------------------------------------------------------
  // Block action handlers
  // ---------------------------------------------------------------------------

  function handleTextChange(blockId: string, text: string) {
    const block = blocks.find((b) => b.id === blockId);
    undoStack.push({
      type: "textChange",
      blockId,
      before: block?.editedText ?? block?.originalText ?? "",
      after: text,
    });

    updateLocalBlocks((bs) =>
      bs.map((b) =>
        b.id === blockId ? { ...b, editedText: text, source: "human" as const } : b,
      ),
    );
    updateBlockTextMutation({ storyId, blockId, editedText: text });
  }

  function handleToggleExclude(blockId: string) {
    const block = blocks.find((b) => b.id === blockId);
    undoStack.push({ type: "toggleExclude", blockId, before: block?.excluded ?? false });

    updateLocalBlocks((bs) =>
      bs.map((b) => (b.id === blockId ? { ...b, excluded: !b.excluded } : b)),
    );
    toggleBlockExclusionMutation({ storyId, blockId });
  }

  function handleWordExclude(blockId: string, wordIndex: number) {
    const block = blocks.find((b) => b.id === blockId);
    const word = block?.words?.[wordIndex];
    undoStack.push({
      type: "wordExclude",
      blockId,
      wordIndex,
      before: word?.excluded ?? false,
    });

    updateLocalBlocks((bs) =>
      bs.map((b) => {
        if (b.id !== blockId || !b.words) return b;
        const words = b.words.map((w, i) =>
          i === wordIndex ? { ...w, excluded: !w.excluded } : w,
        );
        return { ...b, words };
      }),
    );
    toggleWordExclusionMutation({ storyId, blockId, wordIndex });
  }

  function handleWordCorrect(blockId: string, wordIndex: number, correctedText: string) {
    const block = blocks.find((b) => b.id === blockId);
    const word = block?.words?.[wordIndex];
    undoStack.push({
      type: "correctWord",
      blockId,
      wordIndex,
      before: word?.correctedText,
      after: correctedText,
    });

    updateLocalBlocks((bs) =>
      bs.map((b) => {
        if (b.id !== blockId || !b.words) return b;
        const words = b.words.map((w, i) =>
          i === wordIndex ? { ...w, correctedText: correctedText || undefined } : w,
        );
        return { ...b, words };
      }),
    );
    correctWordMutation({ storyId, blockId, wordIndex, correctedText });
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
    updateLocalBlocks((bs) =>
      bs.map((b) =>
        b.id === blockId ? { ...b, editedText: undefined, source: "transcript" as const } : b,
      ),
    );
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
    const block = blocks.find((b) => b.id === blockId);
    const index = blocks.findIndex((b) => b.id === blockId);
    if (block) {
      undoStack.push({ type: "removeBlock", blockId, block, index });
    }

    updateLocalBlocks((bs) => bs.filter((b) => b.id !== blockId));
    removeBlockMutation({ storyId, blockId });
  }

  // ---------------------------------------------------------------------------
  // Filler handlers
  // ---------------------------------------------------------------------------

  function handleRemoveFillers() {
    const changes: Array<{ blockId: string; wordIndex: number }> = [];
    for (const block of blocks) {
      if (block.words) {
        block.words.forEach((w, i) => {
          if (w.isFiller && !w.excluded) {
            changes.push({ blockId: block.id, wordIndex: i });
          }
        });
      }
    }
    undoStack.push({ type: "fillerRemoveAll", changes });

    updateLocalBlocks((bs) =>
      bs.map((b) => {
        if (!b.words) return b;
        const words = b.words.map((w) => (w.isFiller ? { ...w, excluded: true } : w));
        return { ...b, words };
      }),
    );
    removeAllFillersMutation({ storyId });
  }

  function handleRestoreFillers() {
    updateLocalBlocks((bs) =>
      bs.map((b) => {
        if (!b.words) return b;
        const words = b.words.map((w) => (w.isFiller ? { ...w, excluded: false } : w));
        return { ...b, words };
      }),
    );
    restoreAllFillersMutation({ storyId });
  }

  // ---------------------------------------------------------------------------
  // Undo / Redo
  // ---------------------------------------------------------------------------

  function handleUndo() {
    const op = undoStack.undo();
    if (!op) return;
    applyInverseOperation(op);
  }

  function handleRedo() {
    const op = undoStack.redo();
    if (!op) return;
    applyOperation(op);
  }

  function applyInverseOperation(op: EditOperation) {
    switch (op.type) {
      case "textChange":
        updateLocalBlocks((bs) =>
          bs.map((b) =>
            b.id === op.blockId ? { ...b, editedText: op.before || undefined } : b,
          ),
        );
        updateBlockTextMutation({ storyId, blockId: op.blockId, editedText: op.before });
        break;
      case "toggleExclude":
        updateLocalBlocks((bs) =>
          bs.map((b) =>
            b.id === op.blockId ? { ...b, excluded: op.before } : b,
          ),
        );
        toggleBlockExclusionMutation({ storyId, blockId: op.blockId });
        break;
      case "wordExclude":
        updateLocalBlocks((bs) =>
          bs.map((b) => {
            if (b.id !== op.blockId || !b.words) return b;
            const words = b.words.map((w, i) =>
              i === op.wordIndex ? { ...w, excluded: op.before } : w,
            );
            return { ...b, words };
          }),
        );
        toggleWordExclusionMutation({ storyId, blockId: op.blockId, wordIndex: op.wordIndex });
        break;
      case "correctWord":
        updateLocalBlocks((bs) =>
          bs.map((b) => {
            if (b.id !== op.blockId || !b.words) return b;
            const words = b.words.map((w, i) =>
              i === op.wordIndex ? { ...w, correctedText: op.before } : w,
            );
            return { ...b, words };
          }),
        );
        correctWordMutation({
          storyId,
          blockId: op.blockId,
          wordIndex: op.wordIndex,
          correctedText: op.before ?? "",
        });
        break;
      case "fillerRemoveAll":
        // Restore all the fillers that were excluded
        updateLocalBlocks((bs) =>
          bs.map((b) => {
            if (!b.words) return b;
            const words = b.words.map((w, i) => {
              const change = op.changes.find(
                (c) => c.blockId === b.id && c.wordIndex === i,
              );
              return change ? { ...w, excluded: false } : w;
            });
            return { ...b, words };
          }),
        );
        restoreAllFillersMutation({ storyId });
        break;
      case "removeBlock":
        // Re-insert the block at its original position
        updateLocalBlocks((bs) => {
          const newBlocks = [...bs];
          newBlocks.splice(op.index, 0, op.block);
          return newBlocks;
        });
        // Re-create via save
        setLocalScript((prev) => {
          if (prev) scheduleSave(prev);
          return prev;
        });
        break;
      case "insertVoiceover":
        updateLocalBlocks((bs) => bs.filter((b) => b.id !== op.blockId));
        removeBlockMutation({ storyId, blockId: op.blockId });
        break;
    }
  }

  function applyOperation(op: EditOperation) {
    switch (op.type) {
      case "textChange":
        updateLocalBlocks((bs) =>
          bs.map((b) =>
            b.id === op.blockId ? { ...b, editedText: op.after } : b,
          ),
        );
        updateBlockTextMutation({ storyId, blockId: op.blockId, editedText: op.after });
        break;
      case "toggleExclude":
        updateLocalBlocks((bs) =>
          bs.map((b) =>
            b.id === op.blockId ? { ...b, excluded: !op.before } : b,
          ),
        );
        toggleBlockExclusionMutation({ storyId, blockId: op.blockId });
        break;
      case "wordExclude":
        updateLocalBlocks((bs) =>
          bs.map((b) => {
            if (b.id !== op.blockId || !b.words) return b;
            const words = b.words.map((w, i) =>
              i === op.wordIndex ? { ...w, excluded: !op.before } : w,
            );
            return { ...b, words };
          }),
        );
        toggleWordExclusionMutation({ storyId, blockId: op.blockId, wordIndex: op.wordIndex });
        break;
      case "correctWord":
        updateLocalBlocks((bs) =>
          bs.map((b) => {
            if (b.id !== op.blockId || !b.words) return b;
            const words = b.words.map((w, i) =>
              i === op.wordIndex ? { ...w, correctedText: op.after || undefined } : w,
            );
            return { ...b, words };
          }),
        );
        correctWordMutation({
          storyId,
          blockId: op.blockId,
          wordIndex: op.wordIndex,
          correctedText: op.after,
        });
        break;
      case "fillerRemoveAll":
        updateLocalBlocks((bs) =>
          bs.map((b) => {
            if (!b.words) return b;
            const words = b.words.map((w) => (w.isFiller ? { ...w, excluded: true } : w));
            return { ...b, words };
          }),
        );
        removeAllFillersMutation({ storyId });
        break;
      default:
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Versioning handlers
  // ---------------------------------------------------------------------------

  function handleCreateVersion(name: string) {
    undoStack.clear();
    createVersionMutation({ storyId, name });
  }

  function handleSwitchVersion(versionId: string) {
    undoStack.clear();
    switchVersionMutation({ storyId, versionId });
  }

  function handleRenameVersion(versionId: string, name: string) {
    renameVersionMutation({ storyId, versionId, name });
  }

  function handleDeleteVersion(versionId: string) {
    deleteVersionMutation({ storyId, versionId });
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
        blocks={blocks}
        storyTitle={storyTitle}
        script={localScript}
        correctMode={correctMode}
        canUndo={undoStack.canUndo}
        canRedo={undoStack.canRedo}
        onInsertVoiceover={() => insertVoiceoverMutation({ storyId })}
        onToggleCorrectMode={() => setCorrectMode((prev) => !prev)}
        onRemoveFillers={handleRemoveFillers}
        onRestoreFillers={handleRestoreFillers}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onCreateVersion={handleCreateVersion}
        onSwitchVersion={handleSwitchVersion}
        onRenameVersion={handleRenameVersion}
        onDeleteVersion={handleDeleteVersion}
      />

      <ScrollArea className="flex-1 overflow-hidden">
        <div className="space-y-1 px-2 pb-4">
          {blocks.map((block: ScriptBlock, i: number) => {
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
                  correctMode={correctMode}
                  currentTime={currentTime}
                  onTextChange={handleTextChange}
                  onToggleExclude={handleToggleExclude}
                  onWordExclude={handleWordExclude}
                  onWordCorrect={handleWordCorrect}
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
