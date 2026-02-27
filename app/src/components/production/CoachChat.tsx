import { useState, useRef, useEffect, type FormEvent } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

interface ChatMessage {
  role: "user" | "coach";
  content: string;
}

interface CoachChatProps {
  storyId: string;
  transcriptMarkdown?: string;
}

const INITIAL_MESSAGE: ChatMessage = {
  role: "coach",
  content:
    "I'm your Story Coach. I can help you find the best angle, refine your narrative, and craft compelling content. What would you like to work on?",
};

export default function CoachChat({ storyId, transcriptMarkdown }: CoachChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const callAgent = useAction(api.actions.gradientAgent.callAgent);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const result = await callAgent({
        agent: "coach",
        payload: {
          query: trimmed,
          production_state: { step: "editing" },
          transcript_context: transcriptMarkdown,
        },
      });
      const coaching =
        (result as { coaching?: string }).coaching ??
        "Sorry, I couldn't generate a response. Please try again.";
      setMessages((prev) => [
        ...prev,
        { role: "coach", content: coaching },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "coach",
          content: "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="space-y-3 p-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-brand-orange text-foreground"
                    : "bg-card text-cream-muted"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg px-3 py-2 text-sm bg-card text-cream-faint">
                Thinking...
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 border-t border-border">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your coach..."
          className="bg-card border-charcoal-border text-cream placeholder:text-cream-faint"
          disabled={isLoading}
        />
        <Button type="submit" variant="ghost" size="icon" disabled={isLoading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
