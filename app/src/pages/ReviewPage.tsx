import { useParams } from "react-router";

export default function ReviewPage() {
  const { id } = useParams();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Producer Review</h1>
      <p className="text-cream-dim">Story ID: {id}</p>
      <p className="text-cream-faint mt-2">
        Producer review interface with inline notes and approval controls.
      </p>
    </div>
  );
}
