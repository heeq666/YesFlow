import dagre from 'dagre';
import type { Edge, Node } from '@xyflow/react';
import type { TaskMode } from '../types';
import { getTaskNodeLayout } from '../constants/taskNodeLayout';

export const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB', mode: TaskMode = 'professional') => {
  const layout = getTaskNodeLayout(mode);
  const dagreGraph = new dagre.graphlib.Graph({ compound: true });
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, nodesep: 50, ranksep: 50 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: layout.layoutWidth, height: layout.layoutHeight });
  });

  edges.forEach((edge) => dagreGraph.setEdge(edge.source, edge.target));

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    let x = nodeWithPosition.x - layout.layoutWidth / 2;
    let y = nodeWithPosition.y - layout.layoutHeight / 2;

    if (node.parentId) {
      const parentWithPosition = dagreGraph.node(node.parentId);
      x = x - (parentWithPosition.x - parentWithPosition.width / 2);
      y = y - (parentWithPosition.y - parentWithPosition.height / 2);
    }

    return {
      ...node,
      targetPosition: direction === 'LR' ? ('left' as const) : ('top' as const),
      sourcePosition: direction === 'LR' ? ('right' as const) : ('bottom' as const),
      position: { x, y },
    };
  });

  return { nodes: layoutedNodes, edges };
};
