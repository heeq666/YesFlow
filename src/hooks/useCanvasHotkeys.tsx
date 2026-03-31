import React, { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { Edge, Node } from '@xyflow/react';

import { matchesHotkey } from '../lib/hotkeys';
import type { Settings } from '../types';

type UseCanvasHotkeysParams = {
  nodes: Node[];
  edges: Edge[];
  settings: Settings;
  language: 'zh' | 'en';
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleUndo: () => void;
  handleRedo: () => void;
  handleCopy: () => void;
  handlePaste: () => void;
  handleCut: () => void;
  handleSaveToLocal: () => void;
  handleSaveFile: () => void;
  deleteNodesAndReconnect: (nodeIdsToDelete: string[]) => void;
  showStatus: (text: string, icon: React.ReactNode) => void;
  takeSnapshot: (currentNodes?: Node[], currentEdges?: Edge[]) => void;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
};

export function useCanvasHotkeys({
  nodes,
  edges,
  settings,
  language,
  fileInputRef,
  handleUndo,
  handleRedo,
  handleCopy,
  handlePaste,
  handleCut,
  handleSaveToLocal,
  handleSaveFile,
  deleteNodesAndReconnect,
  showStatus,
  takeSnapshot,
  setEdges,
}: UseCanvasHotkeysParams) {
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const activeKeysRef = useRef(activeKeys);
  activeKeysRef.current = activeKeys;
  const [isLmbActive, setIsLmbActive] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      setActiveKeys((prev) => new Set(prev).add(key));

      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      if (matchesHotkey(settings.hotkeys.undo, event)) { event.preventDefault(); handleUndo(); }
      if (matchesHotkey(settings.hotkeys.redo, event)) { event.preventDefault(); handleRedo(); }

      if (matchesHotkey(settings.hotkeys.copy, event)) handleCopy();
      if (matchesHotkey(settings.hotkeys.paste, event)) handlePaste();
      if (matchesHotkey(settings.hotkeys.cut, event)) handleCut();

      if (matchesHotkey(settings.hotkeys.save, event)) {
        event.preventDefault();
        handleSaveToLocal();
      }

      if (matchesHotkey(settings.hotkeys.export, event)) {
        event.preventDefault();
        handleSaveFile();
      }

      if (matchesHotkey(settings.hotkeys.open, event)) {
        event.preventDefault();
        fileInputRef.current?.click();
      }

      if (matchesHotkey(settings.hotkeys.pan, event) || matchesHotkey(settings.hotkeys.select, event)) {
        if (settings.hotkeys.pan.toLowerCase().includes('space')) {
          event.preventDefault();
        }
      }

      if (matchesHotkey(settings.hotkeys.delete, event)) {
        const selectedNodeIds = nodes.filter((n) => n.selected).map((n) => n.id);
        const selectedEdgeIds = edges.filter((e) => e.selected).map((e) => e.id);

        if (selectedNodeIds.length > 0 || selectedEdgeIds.length > 0) {
          event.preventDefault();
        }

        if (selectedNodeIds.length > 0) {
          deleteNodesAndReconnect(selectedNodeIds);
          showStatus(language === 'zh' ? '已删除' : 'Deleted', <Trash2 className="w-3.5 h-3.5" />);
        } else if (selectedEdgeIds.length > 0) {
          setEdges((eds) => {
            const next = eds.filter((e) => !e.selected);
            takeSnapshot(nodes, next);
            return next;
          });
          showStatus(language === 'zh' ? '已删除' : 'Deleted', <Trash2 className="w-3.5 h-3.5" />);
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      setActiveKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button === 0) {
        setIsLmbActive(true);
        setActiveKeys((prev) => new Set(prev).add('lmb'));
      }
    };

    const handleMouseUp = (event: MouseEvent) => {
      if (event.button === 0) {
        setIsLmbActive(false);
        setActiveKeys((prev) => {
          const next = new Set(prev);
          next.delete('lmb');
          return next;
        });
      }
    };

    const handleBlur = () => {
      setActiveKeys(new Set());
      setIsLmbActive(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [
    nodes,
    edges,
    settings,
    language,
    fileInputRef,
    handleUndo,
    handleRedo,
    handleCopy,
    handlePaste,
    handleCut,
    handleSaveToLocal,
    handleSaveFile,
    deleteNodesAndReconnect,
    showStatus,
    takeSnapshot,
    setEdges,
  ]);

  return {
    activeKeys,
    activeKeysRef,
    isLmbActive,
    setIsLmbActive,
  };
}
