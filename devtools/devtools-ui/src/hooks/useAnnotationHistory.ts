import { useState, useCallback } from 'react';
import { GroundTruthAreaUi } from '../types/annotation';

const MAX_HISTORY_LENGTH = 50;

function cloneAreas(areas: GroundTruthAreaUi[]): GroundTruthAreaUi[] {
  return areas.map((a) => ({
    ...a,
    polygon: a.polygon.map((p) => ({ ...p })),
  }));
}

export function useAnnotationHistory(initialAreas: GroundTruthAreaUi[] = []) {
  const [history, setHistory] = useState<GroundTruthAreaUi[][]>([cloneAreas(initialAreas)]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const currentAreas = history[historyIndex] || [];

  const pushState = useCallback((newAreas: GroundTruthAreaUi[]) => {
    setHistory((prev) => {
      // Truncate future redo stack
      const nextHistory = prev.slice(0, historyIndex + 1);
      nextHistory.push(cloneAreas(newAreas));
      if (nextHistory.length > MAX_HISTORY_LENGTH) {
        nextHistory.shift();
      }
      return nextHistory;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY_LENGTH - 1));
  }, [historyIndex]);

  const undo = useCallback(() => {
    setHistoryIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const redo = useCallback(() => {
    setHistoryIndex((prev) => Math.min(history.length - 1, prev + 1));
  }, [history.length]);

  const resetHistory = useCallback((initial: GroundTruthAreaUi[]) => {
    setHistory([cloneAreas(initial)]);
    setHistoryIndex(0);
  }, []);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return {
    areas: currentAreas,
    pushState,
    undo,
    redo,
    canUndo,
    canRedo,
    resetHistory,
  };
}
