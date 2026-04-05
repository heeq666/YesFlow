import { createElement, useCallback } from 'react';
import { LayoutDashboard, Sparkles } from 'lucide-react';
import type React from 'react';
import type { Edge, Node } from '@xyflow/react';

import { getLayoutedElements } from '../lib/flowLayout';
import type { TaskMode } from '../types';

type UseCanvasLayoutActionsParams = {
  nodes: Node[];
  edges: Edge[];
  language: 'zh' | 'en';
  mode: TaskMode;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  takeSnapshot: (nodes?: Node[], edges?: Edge[]) => void;
  showStatus: (text: string, icon: React.ReactNode) => void;
};

export function useCanvasLayoutActions({
  nodes,
  edges,
  language,
  mode,
  setNodes,
  takeSnapshot,
  showStatus,
}: UseCanvasLayoutActionsParams) {
  const alignNodes = useCallback((direction: 'horizontal' | 'vertical') => {
    setNodes((currentNodes) => {
      const selectedNodes = currentNodes.filter((node) => node.selected);
      if (selectedNodes.length < 2) return currentNodes;

      const minX = Math.min(...selectedNodes.map((node) => node.position.x));
      const maxX = Math.max(...selectedNodes.map((node) => node.position.x + (node.measured?.width || 260)));
      const minY = Math.min(...selectedNodes.map((node) => node.position.y));
      const maxY = Math.max(...selectedNodes.map((node) => node.position.y + (node.measured?.height || 140)));
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      const nextNodes = currentNodes.map((node) => {
        if (!node.selected) return node;
        const nodeWidth = node.measured?.width || 260;
        const nodeHeight = node.measured?.height || 140;

        return {
          ...node,
          position: {
            x: direction === 'vertical' ? centerX - nodeWidth / 2 : node.position.x,
            y: direction === 'horizontal' ? centerY - nodeHeight / 2 : node.position.y,
          },
        };
      });

      takeSnapshot(nextNodes, edges);
      return nextNodes;
    });

    showStatus(language === 'zh' ? '对齐完成' : 'Aligned', createElement(LayoutDashboard, { className: 'w-3.5 h-3.5' }));
  }, [edges, language, setNodes, showStatus, takeSnapshot]);

  const distributeNodes = useCallback((direction: 'horizontal' | 'vertical') => {
    setNodes((currentNodes) => {
      const selectedNodes = currentNodes.filter((node) => node.selected);
      if (selectedNodes.length < 3) return currentNodes;

      const centers = selectedNodes
        .map((node) => ({
          id: node.id,
          center: direction === 'horizontal'
            ? node.position.x + (node.measured?.width || 260) / 2
            : node.position.y + (node.measured?.height || 140) / 2,
        }))
        .sort((a, b) => a.center - b.center);

      const minCenter = centers[0].center;
      const maxCenter = centers[centers.length - 1].center;
      const step = (maxCenter - minCenter) / (centers.length - 1);

      const nextNodes = currentNodes.map((node) => {
        const centerInfo = centers.find((center) => center.id === node.id);
        if (!centerInfo) return node;

        const index = centers.indexOf(centerInfo);
        const newCenter = minCenter + index * step;
        const nodeSize = direction === 'horizontal'
          ? (node.measured?.width || 260)
          : (node.measured?.height || 140);

        return {
          ...node,
          position: {
            ...node.position,
            [direction === 'horizontal' ? 'x' : 'y']: newCenter - nodeSize / 2,
          },
        };
      });

      takeSnapshot(nextNodes, edges);
      return nextNodes;
    });

    showStatus(language === 'zh' ? '等距分布完成' : 'Distributed evenly', createElement(LayoutDashboard, { className: 'w-3.5 h-3.5' }));
  }, [edges, language, setNodes, showStatus, takeSnapshot]);

  const autoLayoutSelected = useCallback(() => {
    const selectedNodes = nodes.filter((node) => node.selected);
    if (selectedNodes.length < 2) return;

    const selectedNodeIds = selectedNodes.map((node) => node.id);
    const selectedEdges = edges.filter((edge) => selectedNodeIds.includes(edge.source) && selectedNodeIds.includes(edge.target));
    const layouted = getLayoutedElements(selectedNodes, selectedEdges, 'LR', mode);

    const nextNodes = nodes.map((node) => {
      const layoutedNode = (layouted.nodes as Node[]).find((candidate) => candidate.id === node.id);
      return layoutedNode ? { ...node, position: layoutedNode.position } : node;
    });

    setNodes(nextNodes);
    takeSnapshot(nextNodes, edges);
    showStatus(language === 'zh' ? '局部布局完成' : 'Selection layouted', createElement(Sparkles, { className: 'w-3.5 h-3.5' }));
  }, [nodes, edges, language, mode, setNodes, takeSnapshot, showStatus]);

  return {
    alignNodes,
    distributeNodes,
    autoLayoutSelected,
  };
}
