import { SignInButton } from "@clerk/clerk-react";

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-950">
      <div className="text-center space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-white">StoryForge</h1>
          <p className="text-zinc-400 mt-2">
            AI-Powered Radio Storytelling Studio
          </p>
        </div>
        <SignInButton mode="modal">
          <button className="px-6 py-3 bg-white text-zinc-900 font-semibold rounded-lg hover:bg-zinc-200 transition-colors">
            Sign In
          </button>
        </SignInButton>
      </div>
    </div>
  );
}
