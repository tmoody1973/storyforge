import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import StoryCard from "@/components/dashboard/StoryCard";
import NewStoryDialog from "@/components/dashboard/NewStoryDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const columns = [
  { status: "draft", label: "Draft" },
  { status: "transcribing", label: "Transcribing" },
  { status: "editing", label: "Editing" },
  { status: "published", label: "Published" },
] as const;

export default function DashboardPage() {
  const [stationFilter, setStationFilter] = useState("all");

  const stories = useQuery(api.stories.listWithSourceCounts);
  const stations = useQuery(api.stations.list);

  const filtered =
    stationFilter === "all"
      ? stories
      : stories?.filter((s) => s.stationId === stationFilter);

  const stationNameMap = new Map<string, string>(
    stations?.map((s) => [s._id as string, s.name]) ?? []
  );

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h1 className="text-xl font-bold">Story Board</h1>
        <div className="flex items-center gap-3">
          <Select value={stationFilter} onValueChange={setStationFilter}>
            <SelectTrigger className="w-48 bg-card border-charcoal-border text-sm">
              <SelectValue placeholder="All Stations" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border">
              <SelectItem value="all">All Stations</SelectItem>
              {stations?.map((station) => (
                <SelectItem key={station._id} value={station._id}>
                  {station.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <NewStoryDialog />
        </div>
      </div>

      {/* Kanban columns */}
      <div className="flex flex-1 min-h-0 overflow-x-auto">
        {columns.map((col) => {
          const colStories = filtered?.filter(
            (s) => s.status === col.status
          );

          return (
            <div
              key={col.status}
              className="flex-1 min-w-[240px] border-r border-border last:border-r-0 flex flex-col"
            >
              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-semibold uppercase text-cream-dim">
                    {col.label}
                  </h2>
                  <span className="text-[10px] text-cream-faint bg-card px-1.5 py-0.5 rounded-full">
                    {colStories?.length ?? 0}
                  </span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {colStories?.map((story) => (
                  <StoryCard
                    key={story._id}
                    id={story._id}
                    title={story.title}
                    stationName={
                      stationNameMap.get(story.stationId) ?? "Unknown"
                    }
                    status={story.status}
                    totalSources={story.totalSources}
                    readySources={story.readySources}
                    createdAt={story._creationTime}
                    publishedDate={story.publishedDate}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
