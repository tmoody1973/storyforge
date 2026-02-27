import { SignInButton } from "@clerk/clerk-react";

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground">StoryForge</h1>
          <p className="text-cream-dim mt-2">
            AI-Powered Radio Storytelling Studio
          </p>
        </div>
        <SignInButton mode="modal">
          <button className="px-6 py-3 bg-foreground text-background font-semibold rounded-lg hover:bg-cream transition-colors">
            Sign In
          </button>
        </SignInButton>
      </div>
    </div>
  );
}
