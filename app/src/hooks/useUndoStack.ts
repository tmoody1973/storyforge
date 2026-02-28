import { useState, useCallback } from "react";
import type { EditOperation } from "@/lib/scriptTypes";

interface UndoStackResult {
  push: (op: EditOperation) => void;
  undo: () => EditOperation | undefined;
  redo: () => EditOperation | undefined;
  canUndo: boolean;
  canRedo: boolean;
  clear: () => void;
}

export function useUndoStack(maxSize = 50): UndoStackResult {
  const [undoStack, setUndoStack] = useState<EditOperation[]>([]);
  const [redoStack, setRedoStack] = useState<EditOperation[]>([]);

  const push = useCallback(
    (op: EditOperation) => {
      setUndoStack((prev) => {
        const next = [...prev, op];
        if (next.length > maxSize) next.shift();
        return next;
      });
      // New action clears redo stack
      setRedoStack([]);
    },
    [maxSize],
  );

  const undo = useCallback((): EditOperation | undefined => {
    let op: EditOperation | undefined;
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      op = next.pop();
      return next;
    });
    if (op) {
      setRedoStack((prev) => [...prev, op!]);
    }
    return op;
  }, []);

  const redo = useCallback((): EditOperation | undefined => {
    let op: EditOperation | undefined;
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      op = next.pop();
      return next;
    });
    if (op) {
      setUndoStack((prev) => [...prev, op!]);
    }
    return op;
  }, []);

  const clear = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  return {
    push,
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    clear,
  };
}
