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
      const outgoingBySource = new Map<string, Edge[]>();

      for (const edge of edges) {
        const list = outgoingBySource.get(edge.source);
        if (list) {
          list.push(edge);
        } else {
          outgoingBySource.set(edge.source, [edge]);
        }
      }

      while (queue.length > 0) {
        const current = queue.shift();
        if (!current) continue;

        const outgoing = outgoingBySource.get(current);
        if (!outgoing) continue;
        for (const edge of outgoing) {
          highlightedEdgeIds.add(edge.id);
          if (!downstreamNodeIds.has(edge.target)) {
            downstreamNodeIds.add(edge.target);
            queue.push(edge.target);
          }
        }
      }
    }

    let hasChanged = false;
    const nextEdges = edges.map((edge) => {
      const isHighlighted = highlightedEdgeIds.has(edge.id);
      const currentData = (edge.data ?? {}) as {
        isHighlighted?: boolean;
        activeColor?: string;
        globalColor?: string;
      };

      if (
        currentData.isHighlighted === isHighlighted &&
        currentData.activeColor === edgeSelectedColor &&
        currentData.globalColor === edgeColor
      ) {
        return edge;
      }

      hasChanged = true;
      return {
        ...edge,
        data: {
          ...currentData,
          isHighlighted,
          activeColor: edgeSelectedColor,
          globalColor: edgeColor,
        },
      };
    });

    return hasChanged ? nextEdges : edges;
  }, [nodes, edges, edgeColor, edgeSelectedColor]);
}
