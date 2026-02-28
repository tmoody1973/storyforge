import { useState } from "react";
import { Mic, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ScriptBlock, ProducerScript } from "@/lib/scriptTypes";
import ScriptExportDialog from "./ScriptExportDialog";

interface ScriptToolbarProps {
  blocks: ScriptBlock[];
  storyTitle: string;
  script: ProducerScript;
  onInsertVoiceover: () => void;
}

export default function ScriptToolbar({
  blocks,
  storyTitle,
  script,
  onInsertVoiceover,
}: ScriptToolbarProps) {
  const [exportOpen, setExportOpen] = useState(false);

  const totalBlocks = blocks.length;
  const excludedBlocks = blocks.filter((b) => b.excluded).length;
  const voBlocks = blocks.filter((b) => b.type === "voiceover").length;

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
        </div>

        <div className="flex items-center gap-1">
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
