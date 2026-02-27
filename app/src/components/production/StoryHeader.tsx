"use client";

import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StoryHeaderProps {
  title: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Status color map
// ---------------------------------------------------------------------------

const statusColors: Record<string, string> = {
  transcribing: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  editing: "bg-brand-orange/20 text-brand-orange border-brand-orange/30",
  reviewing: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  approved: "bg-green-500/20 text-green-400 border-green-500/30",
  published: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

const defaultStatusColor = "border-charcoal-border text-cream-dim";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StoryHeader({ title, status }: StoryHeaderProps) {
  const navigate = useNavigate();

  const badgeColor = statusColors[status] ?? defaultStatusColor;

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background">
      {/* Back button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate("/")}
        aria-label="Back to stories"
      >
        <ArrowLeft className="size-4" />
      </Button>

      {/* Title */}
      <h1 className="text-lg font-semibold text-foreground truncate flex-1">
        {title}
      </h1>

      {/* Status badge */}
      <Badge variant="outline" className={cn(badgeColor)}>
        {status}
      </Badge>
    </div>
  );
}

export default StoryHeader;
