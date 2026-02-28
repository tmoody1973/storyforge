import { useState } from "react";
import { GitBranch, Save, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ScriptVersion } from "@/lib/scriptTypes";

interface VersionSelectorProps {
  versions: ScriptVersion[];
  activeVersionId: string;
  onCreateVersion: (name: string) => void;
  onSwitchVersion: (versionId: string) => void;
  onRenameVersion: (versionId: string, name: string) => void;
  onDeleteVersion: (versionId: string) => void;
}

export default function VersionSelector({
  versions,
  activeVersionId,
  onCreateVersion,
  onSwitchVersion,
  onRenameVersion,
  onDeleteVersion,
}: VersionSelectorProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");

  const activeVersion = versions.find((v) => v.id === activeVersionId);

  function handleCreate() {
    const name = newName.trim() || `Version ${versions.length + 1}`;
    onCreateVersion(name);
    setNewName("");
    setCreating(false);
  }

  function handleRename(id: string) {
    if (renameText.trim()) {
      onRenameVersion(id, renameText.trim());
    }
    setRenamingId(null);
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(!open)}
        className="text-xs text-cream-muted hover:text-cream gap-1"
      >
        <GitBranch className="h-3.5 w-3.5" />
        {activeVersion?.name ?? "Version"}
        <span className="text-cream-faint">({versions.length})</span>
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-lg bg-card border border-charcoal-border shadow-lg py-1">
            {/* Version list */}
            {versions.map((v) => (
              <div
                key={v.id}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
                  v.id === activeVersionId
                    ? "bg-charcoal-surface text-cream"
                    : "text-cream-muted hover:bg-charcoal-surface/50"
                }`}
              >
                {renamingId === v.id ? (
                  <div className="flex items-center gap-1 flex-1">
                    <input
                      type="text"
                      value={renameText}
                      onChange={(e) => setRenameText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(v.id);
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      autoFocus
                      className="flex-1 bg-transparent border-b border-cream-faint text-xs text-cream outline-none"
                    />
                    <button onClick={() => handleRename(v.id)} className="text-green-400 hover:text-green-300">
                      <Check className="h-3 w-3" />
                    </button>
                    <button onClick={() => setRenamingId(null)} className="text-cream-faint hover:text-cream-muted">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        onSwitchVersion(v.id);
                        setOpen(false);
                      }}
                      className="flex-1 text-left truncate"
                    >
                      {v.name}
                    </button>
                    <button
                      onClick={() => {
                        setRenamingId(v.id);
                        setRenameText(v.name);
                      }}
                      className="text-cream-faint hover:text-cream-muted p-0.5"
                      title="Rename"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    {versions.length > 1 && (
                      <button
                        onClick={() => onDeleteVersion(v.id)}
                        className="text-cream-faint hover:text-red-400 p-0.5"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}

            {/* Create new version */}
            <div className="border-t border-charcoal-border mt-1 pt-1">
              {creating ? (
                <div className="flex items-center gap-1 px-3 py-1.5">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreate();
                      if (e.key === "Escape") setCreating(false);
                    }}
                    placeholder="Version name..."
                    autoFocus
                    className="flex-1 bg-transparent border-b border-cream-faint text-xs text-cream outline-none placeholder:text-cream-faint"
                  />
                  <button onClick={handleCreate} className="text-green-400 hover:text-green-300">
                    <Check className="h-3 w-3" />
                  </button>
                  <button onClick={() => setCreating(false)} className="text-cream-faint hover:text-cream-muted">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setCreating(true)}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-brand-orange hover:bg-charcoal-surface/50 transition-colors"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save Version
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
