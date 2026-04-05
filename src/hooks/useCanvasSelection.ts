import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getNodesInside } from '@xyflow/system';
import type { Node } from '@xyflow/react';

type SelectionBox = { x: number; y: number; width: number; height: number } | null;

type UseCanvasSelectionParams = {
  store: { getState: () => any };
  screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number };
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  activeKeysRef: React.MutableRefObject<Set<string>>;
  setIsLmbActive: React.Dispatch<React.SetStateAction<boolean>>;
};

export function useCanvasSelection({
  store,
  screenToFlowPosition,
  setNodes,
  activeKeysRef,
  setIsLmbActive,
}: UseCanvasSelectionParams) {
  const prevSelectedNodeIdsRef = useRef<Set<string>>(new Set());
  const isBoxSelectingRef = useRef(false);
  const isNodeDraggingRef = useRef(false);
  const currentSelectedIdsRef = useRef<Set<string>>(new Set());

  const [selectionBox, setSelectionBox] = useState<SelectionBox>(null);
  const [isDragSelecting, setIsDragSelecting] = useState(false);
  const selStartRef = useRef<{ x: number; y: number } | null>(null);
  const isCustomSelRef = useRef(false);

  const handleSelectionChange = useCallback((sel: { nodes?: Node[] } | null | undefined) => {
    const nextNodes = Array.isArray(sel?.nodes) ? sel.nodes : [];
    currentSelectedIdsRef.current = new Set(nextNodes.filter((n) => n.selected).map((n) => n.id));
    if (isBoxSelectingRef.current || isNodeDraggingRef.current) return;
    prevSelectedNodeIdsRef.current = new Set(currentSelectedIdsRef.current);
  }, []);

  const handleSelectionStart = useCallback(() => {
    isBoxSelectingRef.current = true;
    const prev = new Set(currentSelectedIdsRef.current);
    prevSelectedNodeIdsRef.current = prev;

    if (prev.size > 0) {
      setNodes((nds) => nds.map((n) => (prev.has(n.id) ? { ...n, selected: true } : n)));
    }
  }, [setNodes]);

  const handleNodeDragStart = useCallback((_: any, __: Node) => {
    isNodeDraggingRef.current = true;
    const storeNodes = (store.getState().nodes as Node[]) ?? [];
    const current = storeNodes.filter((n) => n.selected).map((n) => n.id);
    prevSelectedNodeIdsRef.current = new Set(current);
  }, [store]);

  const handleSelectionEnd = useCallback(() => {
    const storeNodes = (store.getState().nodes as Node[]) ?? [];
    const currentlySelected = new Set<string>(storeNodes.filter((n) => n.selected).map((n) => n.id));
    const prevIds = prevSelectedNodeIdsRef.current;
    const shiftHeld = activeKeysRef.current.has('shift');

    if (shiftHeld) {
      const mergedIds = new Set([...prevIds, ...currentlySelected]);
      setNodes((nds) => nds.map((n) => ({ ...n, selected: mergedIds.has(n.id) })));
      prevSelectedNodeIdsRef.current = mergedIds;
    } else {
      prevSelectedNodeIdsRef.current = currentlySelected;
    }

    isBoxSelectingRef.current = false;
    isNodeDraggingRef.current = false;
  }, [activeKeysRef, setNodes, store]);

  const handleNodeDragStop = useCallback(() => {
    isNodeDraggingRef.current = false;
  }, []);

  useEffect(() => {
    Object.assign(store.getState(), { isDragSelecting });
  }, [isDragSelecting, store]);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .react-flow__selection { display: none !important; }
      .react-flow__nodesselection-rect { display: none !important; }
      .react-flow__node { outline: none !important; }
      .react-flow__node.selected { box-shadow: none !important; }
      .react-flow__node:focus { outline: none !important; }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isCustomSelRef.current || !selStartRef.current) return;

      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const start = selStartRef.current;
      const x = Math.min(start.x, pos.x);
      const y = Math.min(start.y, pos.y);
      const width = Math.abs(pos.x - start.x);
      const height = Math.abs(pos.y - start.y);
      setSelectionBox({ x, y, width, height });

      const prevIds = prevSelectedNodeIdsRef.current;
      const { transform } = store.getState();
      const nodesInside = getNodesInside(
        new Map(store.getState().nodes.map((n: Node) => [n.id, n])) as any,
        { x, y, width: Math.max(width, 1), height: Math.max(height, 1) },
        transform,
        true
      );
      const boxIds = new Set(nodesInside.map((n) => n.id));
      const merged = new Set([...prevIds, ...boxIds]);
      setNodes((nds) => nds.map((n) => ({ ...n, selected: merged.has(n.id) })));
    };

    const onMouseUp = () => {
      if (!isCustomSelRef.current) return;

      prevSelectedNodeIdsRef.current = new Set(currentSelectedIdsRef.current);
      isCustomSelRef.current = false;
      selStartRef.current = null;
      setSelectionBox(null);
      setIsDragSelecting(false);
      isBoxSelectingRef.current = false;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [screenToFlowPosition, setNodes, store]);

  useEffect(() => {
    const onMouseUp = () => setIsLmbActive(false);
    window.addEventListener('mouseup', onMouseUp);
    return () => window.removeEventListener('mouseup', onMouseUp);
  }, [setIsLmbActive]);

  const handlePaneMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) setIsLmbActive(true);
    if (!e.shiftKey || e.button !== 0) return;

    const target = e.target as HTMLElement;
    if (target.closest('.react-flow__node') || target.closest('.react-flow__edge')) return;

    isBoxSelectingRef.current = true;
    isCustomSelRef.current = true;
    setIsDragSelecting(true);
    prevSelectedNodeIdsRef.current = new Set(currentSelectedIdsRef.current);

    e.preventDefault();
    e.stopPropagation();

    selStartRef.current = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    setSelectionBox({ x: selStartRef.current.x, y: selStartRef.current.y, width: 0, height: 0 });
  }, [screenToFlowPosition, setIsLmbActive]);

  return {
    selectionBox,
    handleSelectionChange,
    handleSelectionStart,
    handleSelectionEnd,
    handleNodeDragStart,
    handleNodeDragStop,
    handlePaneMouseDown,
  };
}
