import type { Node } from '@xyflow/react';

type NodeDataRecord = Record<string, unknown>;

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
