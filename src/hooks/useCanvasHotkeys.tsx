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
  handleGroupSelection: () => void;
  handleUngroup: (groupId: string) => void;
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
  handleGroupSelection,
  handleUngroup,
  deleteNodesAndReconnect,
  showStatus,
  takeSnapshot,
  setEdges,
}: UseCanvasHotkeysParams) {
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const activeKeysRef = useRef(activeKeys);
  activeKeysRef.current = activeKeys;
  const [isLmbActive, setIsLmbActive] = useState(false);

  // Refs for all values used in event listeners — avoids re-attaching listeners on every change
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const settingsRef = useRef(settings);
  const languageRef = useRef(language);
  const fileInputRef_ = fileInputRef;
  const handleUndoRef = useRef(handleUndo);
  const handleRedoRef = useRef(handleRedo);
  const handleCopyRef = useRef(handleCopy);
  const handlePasteRef = useRef(handlePaste);
  const handleCutRef = useRef(handleCut);
  const handleSaveToLocalRef = useRef(handleSaveToLocal);
  const handleSaveFileRef = useRef(handleSaveFile);
  const handleGroupSelectionRef = useRef(handleGroupSelection);
  const handleUngroupRef = useRef(handleUngroup);
  const deleteNodesAndReconnectRef = useRef(deleteNodesAndReconnect);
  const showStatusRef = useRef(showStatus);
  const takeSnapshotRef = useRef(takeSnapshot);
  const setEdgesRef = useRef(setEdges);

  // Keep refs in sync when values change
  useEffect(() => { setEdgesRef.current = setEdges; }, [setEdges]);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { languageRef.current = language; }, [language]);
  useEffect(() => { handleUndoRef.current = handleUndo; }, [handleUndo]);
  useEffect(() => { handleRedoRef.current = handleRedo; }, [handleRedo]);
  useEffect(() => { handleCopyRef.current = handleCopy; }, [handleCopy]);
  useEffect(() => { handlePasteRef.current = handlePaste; }, [handlePaste]);
  useEffect(() => { handleCutRef.current = handleCut; }, [handleCut]);
  useEffect(() => { handleSaveToLocalRef.current = handleSaveToLocal; }, [handleSaveToLocal]);
  useEffect(() => { handleSaveFileRef.current = handleSaveFile; }, [handleSaveFile]);
  useEffect(() => { handleGroupSelectionRef.current = handleGroupSelection; }, [handleGroupSelection]);
  useEffect(() => { handleUngroupRef.current = handleUngroup; }, [handleUngroup]);
  useEffect(() => { deleteNodesAndReconnectRef.current = deleteNodesAndReconnect; }, [deleteNodesAndReconnect]);
  useEffect(() => { showStatusRef.current = showStatus; }, [showStatus]);
  useEffect(() => { takeSnapshotRef.current = takeSnapshot; }, [takeSnapshot]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      setActiveKeys((prev) => new Set(prev).add(key));

      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      const s = settingsRef.current;

      if (matchesHotkey(s.hotkeys.undo, event)) { event.preventDefault(); handleUndoRef.current(); }
      if (matchesHotkey(s.hotkeys.redo, event)) { event.preventDefault(); handleRedoRef.current(); }

      if (matchesHotkey(s.hotkeys.copy, event)) handleCopyRef.current();
      if (matchesHotkey(s.hotkeys.paste, event)) handlePasteRef.current();
      if (matchesHotkey(s.hotkeys.cut, event)) handleCutRef.current();

      if (matchesHotkey(s.hotkeys.save, event)) {
        event.preventDefault();
        handleSaveToLocalRef.current();
      }

      if (matchesHotkey(s.hotkeys.export, event)) {
        event.preventDefault();
        handleSaveFileRef.current();
      }

      if (matchesHotkey(s.hotkeys.open, event)) {
        event.preventDefault();
        fileInputRef_.current?.click();
      }

      if (matchesHotkey(s.hotkeys.pan, event) || matchesHotkey(s.hotkeys.select, event)) {
        if (s.hotkeys.pan.toLowerCase().includes('space')) {
          event.preventDefault();
        }
      }

      if (matchesHotkey(s.hotkeys.group, event)) {
        event.preventDefault();
        handleGroupSelectionRef.current();
      }

      if (matchesHotkey(s.hotkeys.ungroup, event)) {
        event.preventDefault();
        const selectedGroup = nodesRef.current.find(n => n.selected && n.type === 'group');
        if (selectedGroup) {
          handleUngroupRef.current(selectedGroup.id);
        }
      }

      if (matchesHotkey(s.hotkeys.delete, event)) {
        const ns = nodesRef.current;
        const es = edgesRef.current;
        const lang = languageRef.current;
        const selectedNodeIds = ns.filter((n) => n.selected).map((n) => n.id);
        const selectedEdgeIds = es.filter((e) => e.selected).map((e) => e.id);

        if (selectedNodeIds.length > 0 || selectedEdgeIds.length > 0) {
          event.preventDefault();
        }

        if (selectedNodeIds.length > 0) {
          deleteNodesAndReconnectRef.current(selectedNodeIds);
          showStatusRef.current(lang === 'zh' ? '已删除' : 'Deleted', <Trash2 className="w-3.5 h-3.5" />);
        } else if (selectedEdgeIds.length > 0) {
          setEdgesRef.current((eds) => {
            const next = eds.filter((e) => !e.selected);
            takeSnapshotRef.current(ns, next);
            return next;
          });
          showStatusRef.current(lang === 'zh' ? '已删除' : 'Deleted', <Trash2 className="w-3.5 h-3.5" />);
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

    const handleBlur = () => {
      setActiveKeys(new Set());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [fileInputRef_]);

  return {
    activeKeys,
    activeKeysRef,
    isLmbActive,
    setIsLmbActive,
  };
}
