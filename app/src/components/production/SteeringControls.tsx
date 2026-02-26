"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SteeringControlsProps {
  storyId: Id<"stories">;
  selectedAngle?: string;
  emotionalTone?: string;
  narrativeDirection?: string;
  availableAngles: Array<{ angle: string; strength: number; reasoning: string }>;
}

export default function SteeringControls({
  storyId,
  selectedAngle,
  emotionalTone,
  narrativeDirection,
  availableAngles,
}: SteeringControlsProps) {
  const updateSteering = useMutation(api.stories.updateSteering);

  const [tone, setTone] = useState(emotionalTone ?? "");
  const [direction, setDirection] = useState(narrativeDirection ?? "");

  useEffect(() => {
    setTone(emotionalTone ?? "");
  }, [emotionalTone]);

  useEffect(() => {
    setDirection(narrativeDirection ?? "");
  }, [narrativeDirection]);

  const handleAngleChange = (value: string) => {
    void updateSteering({ id: storyId, selectedAngle: value });
  };

  const handleToneBlur = () => {
    if (tone !== (emotionalTone ?? "")) {
      void updateSteering({ id: storyId, emotionalTone: tone });
    }
  };

  const handleDirectionBlur = () => {
    if (direction !== (narrativeDirection ?? "")) {
      void updateSteering({ id: storyId, narrativeDirection: direction });
    }
  };

  return (
    <div className="p-4 space-y-3 border-t border-zinc-800">
      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
        Steering
      </h3>

      {/* Angle selector */}
      <div className="space-y-1">
        <Label className="text-xs text-zinc-400">Angle</Label>
        <Select value={selectedAngle ?? ""} onValueChange={handleAngleChange}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200 h-8 text-xs">
            <SelectValue placeholder="Select angle" />
          </SelectTrigger>
          <SelectContent>
            {availableAngles.map((a) => (
              <SelectItem key={a.angle} value={a.angle}>
                {a.angle} ({Math.round(a.strength * 100)}%)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Emotional tone input */}
      <div className="space-y-1">
        <Label className="text-xs text-zinc-400">Emotional Tone</Label>
        <Input
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          onBlur={handleToneBlur}
          placeholder="e.g. hopeful, urgent, reflective"
          className="bg-zinc-800 border-zinc-700 text-zinc-200 h-8 text-xs placeholder:text-zinc-500"
        />
      </div>

      {/* Narrative direction input */}
      <div className="space-y-1">
        <Label className="text-xs text-zinc-400">Narrative Direction</Label>
        <Input
          value={direction}
          onChange={(e) => setDirection(e.target.value)}
          onBlur={handleDirectionBlur}
          placeholder="e.g. focus on community impact"
          className="bg-zinc-800 border-zinc-700 text-zinc-200 h-8 text-xs placeholder:text-zinc-500"
        />
      </div>
    </div>
  );
}
