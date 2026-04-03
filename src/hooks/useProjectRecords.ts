import { useCallback, useEffect, useState } from 'react';
import type { Edge, Node } from '@xyflow/react';

import type { ProjectRecord, TaskMode } from '../types';

type UseProjectRecordsParams = {
  nodes: Node[];
  edges: Edge[];
  projectName: string;
  language: 'zh' | 'en';
  mode: TaskMode;
};

type BuildRecordOverrides = {
  id?: string | null;
  name?: string;
  nodes?: Node[];
  edges?: Edge[];
  language?: 'zh' | 'en';
  mode?: TaskMode;
};

const STORAGE_KEY = 'orchestra-ai-records';

function stripNodeHandlers(node: Node): Node {
  const { onStatusChange, onUpdateData, onOpenToolPanel, onAddNode, onUngroup, ...cleanData } = (node.data || {}) as Record<string, unknown>;
  return { ...node, data: cleanData };
}

function upsertRecord(
  prev: ProjectRecord[],
  record: ProjectRecord,
  options: { insertAtFront?: boolean } = {},
) {
  const existingIndex = prev.findIndex((item) => item.id === record.id);
  if (existingIndex === -1) {
    return options.insertAtFront ? [record, ...prev] : [...prev, record];
  }

  const next = [...prev];
  next[existingIndex] = record;
  return next;
}

export function useProjectRecords({
  nodes,
  edges,
  projectName,
  language,
  mode,
}: UseProjectRecordsParams) {
  const [localRecords, setLocalRecords] = useState<ProjectRecord[]>([]);
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      setLocalRecords(JSON.parse(saved));
    } catch (error) {
      console.error(error);
    }
  }, []);

  const persistRecords = useCallback((updater: (prev: ProjectRecord[]) => ProjectRecord[]) => {
    setLocalRecords((prev) => {
      const next = updater(prev);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const normalizeProjectName = useCallback((name: string) => (
    name.replace(/\.(json|zip|txt)$/i, '').replace(/\s+/g, '_') || 'Unnamed'
  ), []);

  const buildRecord = useCallback((overrides: BuildRecordOverrides = {}): ProjectRecord => {
    const nextNodes = overrides.nodes ?? nodes;
    const nextEdges = overrides.edges ?? edges;
    const cleanName = normalizeProjectName(overrides.name ?? projectName);

    return {
      id: overrides.id || `rec-${Date.now()}`,
      name: cleanName,
      nodes: nextNodes.map(stripNodeHandlers),
      edges: nextEdges,
      language: overrides.language ?? language,
      mode: overrides.mode ?? mode,
      lastModified: Date.now(),
    };
  }, [projectName, nodes, edges, language, mode, normalizeProjectName]);

  const createRecord = useCallback((overrides: Omit<BuildRecordOverrides, 'id'> = {}) => {
    const record = buildRecord(overrides);
    persistRecords((prev) => upsertRecord(prev, record, { insertAtFront: true }));
    setCurrentRecordId(record.id);
    return record;
  }, [buildRecord, persistRecords]);

  const saveToLocal = useCallback(() => {
    const record = buildRecord({ id: currentRecordId });
    persistRecords((prev) => upsertRecord(prev, record, { insertAtFront: true }));
    setCurrentRecordId(record.id);
    return record;
  }, [buildRecord, currentRecordId, persistRecords]);

  const deleteRecord = useCallback((recordId: string) => {
    persistRecords((prev) => prev.filter((item) => item.id !== recordId));
    setCurrentRecordId((prev) => (prev === recordId ? null : prev));
  }, [persistRecords]);

  const reorderRecords = useCallback((sourceId: string, targetId: string, position: 'before' | 'after' = 'before') => {
    if (sourceId === targetId) return;

    persistRecords((prev) => {
      const sourceIndex = prev.findIndex((item) => item.id === sourceId);
      const targetIndex = prev.findIndex((item) => item.id === targetId);

      if (sourceIndex === -1 || targetIndex === -1) return prev;

      const next = [...prev];
      const [moved] = next.splice(sourceIndex, 1);
      let insertIndex = targetIndex + (position === 'after' ? 1 : 0);

      if (sourceIndex < insertIndex) insertIndex -= 1;

      next.splice(insertIndex, 0, moved);
      return next;
    });
  }, [persistRecords]);

  useEffect(() => {
    const hasCanvasContent = nodes.length > 0 || edges.length > 0;

    if (!currentRecordId && !hasCanvasContent) return;

    if (!currentRecordId && hasCanvasContent) {
      const record = buildRecord();
      persistRecords((prev) => upsertRecord(prev, record, { insertAtFront: true }));
      setCurrentRecordId(record.id);
      return;
    }

    const timer = setTimeout(() => {
      const record = buildRecord({ id: currentRecordId });
      persistRecords((prev) => upsertRecord(prev, record, { insertAtFront: false }));
    }, 2000);

    return () => clearTimeout(timer);
  }, [nodes, edges, currentRecordId, buildRecord, persistRecords]);

  return {
    localRecords,
    currentRecordId,
    setCurrentRecordId,
    createRecord,
    saveToLocal,
    deleteRecord,
    reorderRecords,
  };
}
