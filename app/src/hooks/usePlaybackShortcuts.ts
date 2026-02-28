import { useEffect } from "react";

interface PlaybackShortcutArgs {
  isPlaying: boolean;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  cursorWordTime: number | null;
  currentTime: number;
  duration: number;
}

/**
 * Global keyboard shortcuts for audio playback.
 * Suppressed when the user is typing in an input, textarea, or contenteditable.
 */
export function usePlaybackShortcuts({
  isPlaying,
  play,
  pause,
  seek,
  cursorWordTime,
  currentTime,
  duration,
}: PlaybackShortcutArgs) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      const editable = (e.target as HTMLElement).isContentEditable;
      if (tag === "INPUT" || tag === "TEXTAREA" || editable) return;

      switch (e.key) {
        case " ": {
          e.preventDefault();
          if (e.shiftKey) {
            // Shift+Space: play from cursor position
            const time = cursorWordTime ?? currentTime;
            seek(time);
            play();
          } else {
            // Space: toggle play/pause
            if (isPlaying) {
              pause();
            } else {
              play();
            }
          }
          break;
        }
        case "Escape":
          // Snap text cursor to playhead
          // Handled by the component via onCursorChange callback
          break;
        case "j":
        case "J":
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            seek(Math.max(0, currentTime - 5));
          }
          break;
        case "l":
        case "L":
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            seek(Math.min(duration, currentTime + 5));
          }
          break;
        case "k":
        case "K":
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            pause();
          }
          break;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, play, pause, seek, cursorWordTime, currentTime, duration]);
}
