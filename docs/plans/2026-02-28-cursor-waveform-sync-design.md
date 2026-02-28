# Cursor-Waveform Sync Design

## Goal
Bidirectional sync between text cursor and waveform playhead, plus keyboard shortcuts for playback — matching Descript's core interaction model.

## Interaction Model

### Click Behavior
- **Single-click a word** (ScriptEditor or TranscriptPanel) → waveform playhead jumps to `word.start`, sets `cursorWordTime`
- **Alt+click a word** → toggles word exclusion (moved from current single-click)
- **Click/scrub waveform** → transcript/script auto-scrolls to nearest word, highlights it
- Double-click-to-seek removed (redundant)

### Visual Cursor
- Word matching `cursorWordTime` gets a 2px left border in brand-orange
- Distinct from playback highlight (background color) so both are visible simultaneously
- "Where I clicked" (border) vs "where it's playing" (background)

### Keyboard Shortcuts
Global listeners, suppressed when typing in input/textarea/contenteditable.

| Key | Action |
|-----|--------|
| `Space` | Toggle play/pause |
| `Shift+Space` | Play from cursor position (`cursorWordTime`) |
| `Escape` | Snap text cursor to playhead (`cursorWordTime = currentTime`) |
| `J` | Skip back 5 seconds |
| `L` | Skip forward 5 seconds |
| `K` | Pause |

### State
New `cursorWordTime: number | null` in ProductionPage — the timestamp of the last word the user clicked. Distinct from `currentTime` (continuous playhead position). `cursorWordTime` only changes on explicit user click or Escape snap.

## Files

### New: `app/src/hooks/usePlaybackShortcuts.ts`

Hook that registers global `keydown` listener.

```typescript
interface PlaybackShortcutArgs {
  isPlaying: boolean;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  cursorWordTime: number | null;
  currentTime: number;
  duration: number;
}
```

Guard logic skips shortcuts when focus is on INPUT, TEXTAREA, or contenteditable elements.

Edge cases:
- `Shift+Space` with null `cursorWordTime` falls back to `currentTime`
- `J`/`L` clamp to `[0, duration]`
- `Space` prevents default to stop page scroll

### Edit: `app/src/pages/ProductionPage.tsx`

- Add `cursorWordTime` state (`useState<number | null>(null)`)
- Create `handleCursorChange` callback that sets `cursorWordTime` and calls `ws.seek`
- Pass `cursorWordTime` and `onCursorChange` to ScriptEditor and TranscriptPanel
- Instantiate `usePlaybackShortcuts` with playback state + `cursorWordTime`

### Edit: `app/src/components/production/ScriptBlockTranscript.tsx`

WordSpan changes:
- **Single-click**: `onSeek(word.start)` + `onCursorChange(word.start)`. Remove exclude toggle.
- **Alt+click**: Toggle word exclusion (old single-click behavior behind modifier)
- **Remove**: Double-click seek handler (redundant)
- **Cursor indicator**: When `word.start === cursorWordTime`, render `border-l-2 border-brand-orange`

### Edit: `app/src/components/production/TranscriptPanel.tsx`

- Accept `onCursorChange` prop
- Segment click calls both `onSeek` and `onCursorChange`

## Verification
1. Click word in script → waveform playhead jumps, word shows orange left border
2. Click waveform → nearest word in script/transcript highlights
3. Space toggles play/pause (not when typing in input)
4. Shift+Space plays from last-clicked word
5. J/L skip 5s back/forward
6. Escape snaps cursor to playhead
7. Alt+click still toggles word exclusion
8. `npx tsc --noEmit` passes
