import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { Speaker, TranscriptSegment } from "@/lib/transcript";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface EditSpeakersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  speakers: Speaker[];
  segments: TranscriptSegment[];
  transcriptId?: string;
}

function getSampleQuote(
  speakerId: string,
  segments: TranscriptSegment[],
): string {
  const seg = segments.find((s) => s.speakerId === speakerId);
  if (!seg) return "";
  return seg.text.length > 100 ? seg.text.slice(0, 100) + "…" : seg.text;
}

export default function EditSpeakersModal({
  open,
  onOpenChange,
  speakers,
  segments,
  transcriptId,
}: EditSpeakersModalProps) {
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const renameSpeaker = useMutation(api.transcripts.renameSpeaker);

  function handleOpenChange(next: boolean) {
    if (!next) setEdits({});
    onOpenChange(next);
  }

  async function handleSave() {
    if (!transcriptId) return;
    const changes = Object.entries(edits).filter(
      ([id, name]) =>
        name.trim() !== "" &&
        name.trim() !== speakers.find((s) => s.id === id)?.name,
    );
    if (changes.length === 0) {
      handleOpenChange(false);
      return;
    }
    setSaving(true);
    await Promise.all(
      changes.map(([speakerId, newName]) =>
        renameSpeaker({
          transcriptId: transcriptId as Id<"transcripts">,
          speakerId,
          newName: newName.trim(),
        }),
      ),
    );
    setSaving(false);
    setEdits({});
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-charcoal-surface border-charcoal-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-cream">Edit Speakers</DialogTitle>
          <DialogDescription className="text-cream-faint">
            Rename speakers identified in the transcript.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto py-1">
          {speakers.map((speaker) => {
            const quote = getSampleQuote(speaker.id, segments);
            return (
              <div
                key={speaker.id}
                className="rounded-lg bg-charcoal-card p-3 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: speaker.color }}
                  />
                  <span className="text-sm font-semibold text-cream">
                    {speaker.name}
                  </span>
                </div>
                {quote && (
                  <p className="text-xs text-cream-faint italic truncate">
                    &ldquo;{quote}&rdquo;
                  </p>
                )}
                <Input
                  placeholder={`Enter name (e.g., John)`}
                  value={edits[speaker.id] ?? ""}
                  onChange={(e) =>
                    setEdits((prev) => ({
                      ...prev,
                      [speaker.id]: e.target.value,
                    }))
                  }
                  className="bg-charcoal-surface border-charcoal-border text-cream placeholder:text-cream-faint focus-visible:border-brand-orange focus-visible:ring-brand-orange/50"
                />
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="border-charcoal-border text-cream-muted"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-brand-orange text-white hover:bg-brand-orange/90"
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
