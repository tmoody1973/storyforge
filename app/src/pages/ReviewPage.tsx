import { useParams } from "react-router";

export default function ReviewPage() {
  const { id } = useParams();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Producer Review</h1>
      <p className="text-zinc-400">Story ID: {id}</p>
      <p className="text-zinc-500 mt-2">
        Producer review interface with inline notes and approval controls.
      </p>
    </div>
  );
}
