import dagre from 'dagre';
import type { Edge, Node } from '@xyflow/react';

const NODE_WIDTH = 260;
const NODE_HEIGHT = 140;

export const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph({ compound: true });
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, nodesep: 50, ranksep: 50 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => dagreGraph.setEdge(edge.source, edge.target));

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    let x = nodeWithPosition.x - NODE_WIDTH / 2;
    let y = nodeWithPosition.y - NODE_HEIGHT / 2;

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
