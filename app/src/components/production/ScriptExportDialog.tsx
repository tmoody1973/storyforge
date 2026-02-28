import { FileText, Archive, Clapperboard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ProducerScript } from "@/lib/scriptTypes";
import { exportScriptMarkdown } from "@/lib/scriptHelpers";

interface ScriptExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  script: ProducerScript;
  storyTitle: string;
}

export default function ScriptExportDialog({
  open,
  onOpenChange,
  script,
  storyTitle,
}: ScriptExportDialogProps) {
  function handleDownloadScript() {
    exportScriptMarkdown(script, storyTitle);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-charcoal-border text-cream max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-cream">Export Script</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 mt-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 border-charcoal-border text-cream-muted hover:text-cream hover:bg-charcoal-surface"
            onClick={handleDownloadScript}
          >
            <FileText className="h-4 w-4 text-brand-orange" />
            <div className="text-left">
              <div className="text-sm font-medium">Download Script</div>
              <div className="text-xs text-cream-faint">Markdown with edits & VO cues</div>
            </div>
          </Button>

          <Button
            variant="outline"
            disabled
            className="w-full justify-start gap-3 border-charcoal-border text-cream-faint opacity-50"
          >
            <Archive className="h-4 w-4" />
            <div className="text-left">
              <div className="text-sm font-medium">Download Voice-Overs</div>
              <div className="text-xs">Coming soon</div>
            </div>
          </Button>

          <Button
            variant="outline"
            disabled
            className="w-full justify-start gap-3 border-charcoal-border text-cream-faint opacity-50"
          >
            <Clapperboard className="h-4 w-4" />
            <div className="text-left">
              <div className="text-sm font-medium">Auto-Assembly</div>
              <div className="text-xs">Coming soon</div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
