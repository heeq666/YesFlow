import { useMemo } from 'react';
import type { Edge, Node } from '@xyflow/react';

type UseEdgeHighlightingParams = {
  nodes: Node[];
  edges: Edge[];
  edgeColor: string;
  edgeSelectedColor: string;
};

export function useEdgeHighlighting({
  nodes,
  edges,
  edgeColor,
  edgeSelectedColor,
}: UseEdgeHighlightingParams) {
  return useMemo(() => {
    const selectedNodeIds = nodes.filter((node) => node.selected).map((node) => node.id);
    const highlightedEdgeIds = new Set<string>();

    if (selectedNodeIds.length > 0) {
      const downstreamNodeIds = new Set<string>(selectedNodeIds);
      const queue = [...selectedNodeIds];

      while (queue.length > 0) {
        const current = queue.shift();
        if (!current) continue;

        for (const edge of edges) {
          if (edge.source !== current) continue;
          highlightedEdgeIds.add(edge.id);
          if (!downstreamNodeIds.has(edge.target)) {
            downstreamNodeIds.add(edge.target);
            queue.push(edge.target);
          }
        }
      }
    }

    return edges.map((edge) => ({
      ...edge,
      data: {
        ...edge.data,
        isHighlighted: highlightedEdgeIds.has(edge.id),
        activeColor: edgeSelectedColor,
        idleColor: edgeColor,
      },
    }));
  }, [nodes, edges, edgeColor, edgeSelectedColor]);
}

