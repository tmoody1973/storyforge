import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ProducerScript, ProducerScriptV1, ScriptBlock, EditOperation } from "@/lib/scriptTypes";
import { migrateV1toV2, getActiveBlocks } from "@/lib/scriptTypes";
import {
  findActiveBlock,
  computeExcludedRanges,
  hydrateScript,
  getFillerIndicesPerBlock,
} from "@/lib/scriptHelpers";
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
  isPlaying: boolean;
  onSeek: (time: number) => void;
  onCursorChange?: (time: number) => void;
  cursorWordTime?: number | null;
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
  isPlaying,
  onSeek,
  onCursorChange,
  cursorWordTime,
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
  const reinitializeScript = useMutation(api.scripts.reinitializeScript);
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
  // Or reinitialize if existing script has broken timestamps (pre-v2 blocks built from markdown)
  const reinitializedRef = useRef(false);
  useEffect(() => {
    if (serverScript === null) {
      initializeScript({ storyId, sourceId }).catch(() => {
        // Script initialization failed — likely no transcript
      });
    } else if (!reinitializedRef.current) {
      const migrated = migrateV1toV2(serverScript as ProducerScriptV1 | ProducerScript);
      const blocks = getActiveBlocks(migrated);
      const transcriptBlocks = blocks.filter((b) => b.type === "transcript");
      const hasValidTimestamps = transcriptBlocks.some(
        (b) => b.startTime != null && b.startTime > 0,
      );
      if (transcriptBlocks.length > 0 && !hasValidTimestamps) {
        reinitializedRef.current = true;
        reinitializeScript({ storyId, sourceId }).catch(() => {});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverScript]);

  // Get active blocks from the current version, hydrated with word data
  const blocks = useMemo(() => {
    if (!localScript) return [];
    const raw = getActiveBlocks(localScript);
    return hydrateScript(raw, wordTimestamps ?? [], fillerWords);
  }, [localScript, wordTimestamps, fillerWords]);
  const activeIndex = findActiveBlock(blocks, currentTime);

  // Compute and propagate excluded ranges
  useEffect(() => {
    if (onExcludedRangesChange) {
      const ranges = computeExcludedRanges(blocks);
      onExcludedRangesChange(ranges);
    }
  }, [blocks, onExcludedRangesChange]);

  // Auto-scroll to active block during playback — only when activeIndex changes,
  // not when isPlaying transitions (avoids jumping when user presses play)
  const prevActiveIndex = useRef(activeIndex);
  useEffect(() => {
    if (!isPlaying || activeIndex === prevActiveIndex.current) {
      prevActiveIndex.current = activeIndex;
      return;
    }
    prevActiveIndex.current = activeIndex;
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeIndex, isPlaying]);

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

    // Update compact excludedWords format (words are hydrated from this)
    updateLocalBlocks((bs) =>
      bs.map((b) => {
        if (b.id !== blockId) return b;
        const excluded = new Set(b.excludedWords ?? []);
        if (excluded.has(wordIndex)) {
          excluded.delete(wordIndex);
        } else {
          excluded.add(wordIndex);
        }
        return {
          ...b,
          excludedWords: excluded.size > 0 ? [...excluded].sort((a, c) => a - c) : undefined,
        };
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

    // Update compact wordCorrections format (words are hydrated from this)
    updateLocalBlocks((bs) =>
      bs.map((b) => {
        if (b.id !== blockId) return b;
        const corrections = { ...(b.wordCorrections ?? {}) };
        if (correctedText) {
          corrections[String(wordIndex)] = correctedText;
        } else {
          delete corrections[String(wordIndex)];
        }
        return {
          ...b,
          wordCorrections: Object.keys(corrections).length > 0 ? corrections : undefined,
        };
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
    // Collect undo changes from hydrated blocks
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

    // Compute filler indices from hydrated blocks for mutation
    const fillerIndices = getFillerIndicesPerBlock(blocks);

    // Update compact excludedWords format
    updateLocalBlocks((bs) =>
      bs.map((b) => {
        const entry = fillerIndices.find((f) => f.blockId === b.id);
        if (!entry) return b;
        const excluded = new Set(b.excludedWords ?? []);
        for (const idx of entry.indices) excluded.add(idx);
        return { ...b, excludedWords: [...excluded].sort((a, c) => a - c) };
      }),
    );
    removeAllFillersMutation({ storyId, fillerIndices });
  }

  function handleRestoreFillers() {
    const fillerIndices = getFillerIndicesPerBlock(blocks);

    updateLocalBlocks((bs) =>
      bs.map((b) => {
        const entry = fillerIndices.find((f) => f.blockId === b.id);
        if (!entry) return b;
        const excluded = new Set(b.excludedWords ?? []);
        for (const idx of entry.indices) excluded.delete(idx);
        return {
          ...b,
          excludedWords: excluded.size > 0 ? [...excluded].sort((a, c) => a - c) : undefined,
        };
      }),
    );
    restoreAllFillersMutation({ storyId, fillerIndices });
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
            if (b.id !== op.blockId) return b;
            const excluded = new Set(b.excludedWords ?? []);
            if (op.before) {
              excluded.add(op.wordIndex);
            } else {
              excluded.delete(op.wordIndex);
            }
            return {
              ...b,
              excludedWords: excluded.size > 0 ? [...excluded].sort((a, c) => a - c) : undefined,
            };
          }),
        );
        toggleWordExclusionMutation({ storyId, blockId: op.blockId, wordIndex: op.wordIndex });
        break;
      case "correctWord":
        updateLocalBlocks((bs) =>
          bs.map((b) => {
            if (b.id !== op.blockId) return b;
            const corrections = { ...(b.wordCorrections ?? {}) };
            if (op.before) {
              corrections[String(op.wordIndex)] = op.before;
            } else {
              delete corrections[String(op.wordIndex)];
            }
            return {
              ...b,
              wordCorrections: Object.keys(corrections).length > 0 ? corrections : undefined,
            };
          }),
        );
        correctWordMutation({
          storyId,
          blockId: op.blockId,
          wordIndex: op.wordIndex,
          correctedText: op.before ?? "",
        });
        break;
      case "fillerRemoveAll": {
        // Restore all the fillers that were excluded — group by block
        const byBlock = new Map<string, number[]>();
        for (const c of op.changes) {
          const arr = byBlock.get(c.blockId) ?? [];
          arr.push(c.wordIndex);
          byBlock.set(c.blockId, arr);
        }
        const restoreIndices = [...byBlock.entries()].map(([blockId, indices]) => ({
          blockId,
          indices,
        }));
        updateLocalBlocks((bs) =>
          bs.map((b) => {
            const entry = restoreIndices.find((r) => r.blockId === b.id);
            if (!entry) return b;
            const excluded = new Set(b.excludedWords ?? []);
            for (const idx of entry.indices) excluded.delete(idx);
            return {
              ...b,
              excludedWords: excluded.size > 0 ? [...excluded].sort((a, c) => a - c) : undefined,
            };
          }),
        );
        restoreAllFillersMutation({ storyId, fillerIndices: restoreIndices });
        break;
      }
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
            if (b.id !== op.blockId) return b;
            const excluded = new Set(b.excludedWords ?? []);
            if (!op.before) {
              excluded.add(op.wordIndex);
            } else {
              excluded.delete(op.wordIndex);
            }
            return {
              ...b,
              excludedWords: excluded.size > 0 ? [...excluded].sort((a, c) => a - c) : undefined,
            };
          }),
        );
        toggleWordExclusionMutation({ storyId, blockId: op.blockId, wordIndex: op.wordIndex });
        break;
      case "correctWord":
        updateLocalBlocks((bs) =>
          bs.map((b) => {
            if (b.id !== op.blockId) return b;
            const corrections = { ...(b.wordCorrections ?? {}) };
            if (op.after) {
              corrections[String(op.wordIndex)] = op.after;
            } else {
              delete corrections[String(op.wordIndex)];
            }
            return {
              ...b,
              wordCorrections: Object.keys(corrections).length > 0 ? corrections : undefined,
            };
          }),
        );
        correctWordMutation({
          storyId,
          blockId: op.blockId,
          wordIndex: op.wordIndex,
          correctedText: op.after,
        });
        break;
      case "fillerRemoveAll": {
        const fillerIndices = getFillerIndicesPerBlock(blocks);
        updateLocalBlocks((bs) =>
          bs.map((b) => {
            const entry = fillerIndices.find((f) => f.blockId === b.id);
            if (!entry) return b;
            const excluded = new Set(b.excludedWords ?? []);
            for (const idx of entry.indices) excluded.add(idx);
            return { ...b, excludedWords: [...excluded].sort((a, c) => a - c) };
          }),
        );
        removeAllFillersMutation({ storyId, fillerIndices });
        break;
      }
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
        onInsertVoiceover={() => insertVoiceoverMutation({ storyId, afterBlockId: blocks[activeIndex]?.id })}
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
                  cursorWordTime={cursorWordTime ?? null}
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
                  onCursorChange={onCursorChange}
                />
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
