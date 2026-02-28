import { useState } from "react";
import { Mic, Download, Undo2, Redo2, Eraser, Type, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ScriptBlock, ProducerScript, ScriptVersion } from "@/lib/scriptTypes";
import { getActiveBlocks } from "@/lib/scriptTypes";
import { countFillerWords, countExcludedFillers, computeIncludedDuration } from "@/lib/scriptHelpers";
import { formatTimestamp } from "@/lib/transcript";
import ScriptExportDialog from "./ScriptExportDialog";
import VersionSelector from "./VersionSelector";

interface ScriptToolbarProps {
  blocks: ScriptBlock[];
  storyTitle: string;
  script: ProducerScript;
  correctMode: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onInsertVoiceover: () => void;
  onToggleCorrectMode: () => void;
  onRemoveFillers: () => void;
  onRestoreFillers: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onCreateVersion: (name: string) => void;
  onSwitchVersion: (versionId: string) => void;
  onRenameVersion: (versionId: string, name: string) => void;
  onDeleteVersion: (versionId: string) => void;
}

export default function ScriptToolbar({
  blocks,
  storyTitle,
  script,
  correctMode,
  canUndo,
  canRedo,
  onInsertVoiceover,
  onToggleCorrectMode,
  onRemoveFillers,
  onRestoreFillers,
  onUndo,
  onRedo,
  onCreateVersion,
  onSwitchVersion,
  onRenameVersion,
  onDeleteVersion,
}: ScriptToolbarProps) {
  const [exportOpen, setExportOpen] = useState(false);
  const [fillerMenuOpen, setFillerMenuOpen] = useState(false);

  const totalBlocks = blocks.length;
  const excludedBlocks = blocks.filter((b) => b.excluded).length;
  const voBlocks = blocks.filter((b) => b.type === "voiceover").length;

  const fillerCount = countFillerWords(blocks);
  const excludedFillerCount = countExcludedFillers(blocks);
  const allFillersExcluded = fillerCount > 0 && excludedFillerCount === fillerCount;

  const { included, total } = computeIncludedDuration(blocks);

  return (
    <>
      <div className="px-4 py-2 shrink-0 flex items-center justify-between border-b border-charcoal-border">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase text-cream-dim">
            Script
          </h2>
          <span className="text-xs text-cream-faint">
            {totalBlocks} blocks
            {excludedBlocks > 0 && `, ${excludedBlocks} excluded`}
            {voBlocks > 0 && `, ${voBlocks} VO`}
          </span>

          {/* Duration display */}
          {total > 0 && (
            <span className="flex items-center gap-1 text-xs text-cream-faint ml-1">
              <Clock className="h-3 w-3" />
              {formatTimestamp(included)}
              <span className="text-cream-faint/50">/ {formatTimestamp(total)}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Undo / Redo */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onUndo}
            disabled={!canUndo}
            className="text-xs text-cream-muted hover:text-cream disabled:opacity-30"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRedo}
            disabled={!canRedo}
            className="text-xs text-cream-muted hover:text-cream disabled:opacity-30"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </Button>

          <div className="w-px h-4 bg-charcoal-border mx-1" />

          {/* Correct mode toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCorrectMode}
            className={`text-xs ${
              correctMode
                ? "text-green-400 bg-green-400/10 hover:bg-green-400/20"
                : "text-cream-muted hover:text-green-400"
            }`}
            title="Correct Mode — fix typos without affecting audio"
          >
            <Type className="h-3.5 w-3.5 mr-1" />
            Correct
          </Button>

          {/* Filler removal */}
          {fillerCount > 0 && (
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFillerMenuOpen(!fillerMenuOpen)}
                className="text-xs text-cream-muted hover:text-orange-400"
              >
                <Eraser className="h-3.5 w-3.5 mr-1" />
                Fillers
                <span className="ml-1 text-[10px] bg-orange-500/20 text-orange-400 rounded-full px-1.5">
                  {fillerCount}
                </span>
              </Button>
              {fillerMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setFillerMenuOpen(false)} />
                  <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-lg bg-card border border-charcoal-border shadow-lg py-1">
                    <button
                      onClick={() => {
                        onRemoveFillers();
                        setFillerMenuOpen(false);
                      }}
                      disabled={allFillersExcluded}
                      className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-cream-muted hover:bg-charcoal-surface transition-colors disabled:opacity-40"
                    >
                      Remove All
                    </button>
                    <button
                      onClick={() => {
                        onRestoreFillers();
                        setFillerMenuOpen(false);
                      }}
                      disabled={excludedFillerCount === 0}
                      className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-cream-muted hover:bg-charcoal-surface transition-colors disabled:opacity-40"
                    >
                      Restore All
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="w-px h-4 bg-charcoal-border mx-1" />

          {/* Versioning */}
          <VersionSelector
            versions={script.versions}
            activeVersionId={script.activeVersionId}
            onCreateVersion={onCreateVersion}
            onSwitchVersion={onSwitchVersion}
            onRenameVersion={onRenameVersion}
            onDeleteVersion={onDeleteVersion}
          />

          <div className="w-px h-4 bg-charcoal-border mx-1" />

          <Button
            variant="ghost"
            size="sm"
            onClick={onInsertVoiceover}
            className="text-xs text-cream-muted hover:text-blue-400"
          >
            <Mic className="h-3.5 w-3.5 mr-1" />
            Add VO
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExportOpen(true)}
            className="text-xs text-cream-muted hover:text-brand-orange"
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            Export
          </Button>
        </div>
      </div>

      <ScriptExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        script={script}
        storyTitle={storyTitle}
      />
    </>
  );
}
