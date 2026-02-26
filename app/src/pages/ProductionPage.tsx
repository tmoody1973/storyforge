import { useParams } from "react-router";

export default function ProductionPage() {
  const { id } = useParams();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Production Workspace</h1>
      <p className="text-zinc-400">Story ID: {id}</p>
      <p className="text-zinc-500 mt-2">
        Waveform editor, transcript editor, and coaching panel will render here.
      </p>
    </div>
  );
}
