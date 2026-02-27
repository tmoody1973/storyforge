import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "react-router";
import { api } from "../../../convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle } from "lucide-react";

export default function NewStoryDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [stationId, setStationId] = useState("");
  const navigate = useNavigate();

  const stations = useQuery(api.stations.list);
  const createStory = useMutation(api.stories.create);

  const handleCreate = async () => {
    if (!title.trim() || !stationId) return;
    const id = await createStory({ title: title.trim(), stationId });
    setOpen(false);
    setTitle("");
    setStationId("");
    navigate(`/story/${id}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <PlusCircle className="h-4 w-4" />
          New Story
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle>Create a New Story</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g. Milwaukee's Vanishing Jazz Clubs"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
          <div className="space-y-2">
            <Label>Station</Label>
            <Select value={stationId} onValueChange={setStationId}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Select a station" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {stations?.map((station) => (
                  <SelectItem key={station._id} value={station._id}>
                    {station.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleCreate}
            disabled={!title.trim() || !stationId}
            className="w-full"
          >
            Create Story
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
