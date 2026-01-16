import { useState, useCallback } from 'react';

export interface HistoryAction {
  type: 'add' | 'update' | 'delete' | 'reorder';
  elementId?: string;
  before: any;
  after: any;
  timestamp: number;
}

const MAX_HISTORY = 50;

export function useHistory<T>(initialState: T[]) {
  const [state, setState] = useState<T[]>(initialState);
  const [history, setHistory] = useState<HistoryAction[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const pushHistory = useCallback((action: HistoryAction) => {
    setHistory((prev) => {
      // Remove any actions after current index (if we undid something and then made a new change)
      const newHistory = prev.slice(0, historyIndex + 1);
      // Add new action
      newHistory.push(action);
      // Limit history size
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY - 1));
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex >= 0) {
      const action = history[historyIndex];
      setState(action.before);
      setHistoryIndex((prev) => prev - 1);
      return action.before;
    }
    return null;
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const action = history[historyIndex + 1];
      setState(action.after);
      setHistoryIndex((prev) => prev + 1);
      return action.after;
    }
    return null;
  }, [history, historyIndex]);

  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex < history.length - 1;

  const updateState = useCallback((newState: T[], action: HistoryAction) => {
    pushHistory(action);
    setState(newState);
  }, [pushHistory]);

  return {
    state,
    setState,
    updateState,
    undo,
    redo,
    canUndo,
    canRedo,
    history,
    historyIndex,
  };
}
