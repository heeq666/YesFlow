import type { Edge, Node } from '@xyflow/react';

type NodeDataRecord = Record<string, unknown>;
type NodeIdentity = Pick<Node, 'id'>;

export function clearTransientNodeData<T extends NodeDataRecord | undefined>(data: T): T {
  if (!data) return data;

  const cleanData = { ...(data as NodeDataRecord) };
  delete cleanData.isAiProcessing;
  delete cleanData.isDraggingOver;

  return cleanData as T;
}

export function sanitizeNodeForPersistence(node: Node): Node {
  const cleanData = clearTransientNodeData((node.data || {}) as NodeDataRecord);
  const {
    onStatusChange,
    onUpdateData,
    onOpenToolPanel,
    onAddNode,
    onAbortAiTask,
    onUngroup,
    ...serializableData
  } = cleanData;

  return {
    ...node,
    selected: false,
    data: serializableData,
  };
}

export function sanitizeEdgesForPersistence(nodes: NodeIdentity[], edges: Edge[]): Edge[] {
  const nodeIds = new Set(nodes.map((node) => node.id));

  return edges
    .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
    .map((edge) => ({
      ...edge,
      selected: false,
    }));
}
