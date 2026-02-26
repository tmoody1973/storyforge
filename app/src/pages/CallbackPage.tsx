import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@workos-inc/authkit-react";

export default function CallbackPage() {
  const navigate = useNavigate();
  const { isLoading, user } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      navigate("/");
    }
  }, [isLoading, user, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-950 text-white">
      <p>Signing in...</p>
    </div>
  );
}
