import { useCallback, useState } from 'react';
import type React from 'react';
import type { Edge, Node } from '@xyflow/react';

import { createHistory, pushToHistory, redo, undo, type HistoryState } from '../utils/historyUtils';

type UseCanvasHistoryParams = {
  getNodes: () => Node[];
  getEdges: () => Edge[];
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
};

type StatusNote = {
  text: string;
  icon: React.ReactNode;
} | null;

export function useCanvasHistory({
  getNodes,
  getEdges,
  setNodes,
  setEdges,
}: UseCanvasHistoryParams) {
  const [history, setHistory] = useState<HistoryState>(createHistory({ nodes: [], edges: [] }));
  const [statusNote, setStatusNote] = useState<StatusNote>(null);

  const takeSnapshot = useCallback((currentNodes?: Node[], currentEdges?: Edge[]) => {
    setHistory((prev) => pushToHistory(prev, {
      nodes: currentNodes || getNodes(),
      edges: currentEdges || getEdges(),
    }));
  }, [getNodes, getEdges]);

  const handleUndo = useCallback(() => {
    const next = undo(history);
    if (!next) return;
    setHistory(next);
    setNodes(next.present.nodes);
    setEdges(next.present.edges);
  }, [history, setNodes, setEdges]);

  const handleRedo = useCallback(() => {
    const next = redo(history);
    if (!next) return;
    setHistory(next);
    setNodes(next.present.nodes);
    setEdges(next.present.edges);
  }, [history, setNodes, setEdges]);

  const showStatus = useCallback((text: string, icon: React.ReactNode) => {
    setStatusNote({ text, icon });
    setTimeout(() => setStatusNote(null), 2000);
  }, []);

  return {
    history,
    setHistory,
    takeSnapshot,
    handleUndo,
    handleRedo,
    statusNote,
    showStatus,
  };
}
