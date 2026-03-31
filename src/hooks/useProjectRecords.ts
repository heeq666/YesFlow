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

const STORAGE_KEY = 'orchestra-ai-records';

function stripNodeHandlers(node: Node): Node {
  const { onStatusChange, onUpdateData, onAddNode, ...cleanData } = (node.data || {}) as Record<string, unknown>;
  return { ...node, data: cleanData };
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

  const buildRecord = useCallback((recordId?: string | null): ProjectRecord => {
    const cleanName = projectName.replace(/\.(json|zip|txt)$/i, '').replace(/\s+/g, '_') || 'Unnamed';
    return {
      id: recordId || `rec-${Date.now()}`,
      name: cleanName,
      nodes: nodes.map(stripNodeHandlers),
      edges,
      language,
      mode,
      lastModified: Date.now(),
    };
  }, [projectName, nodes, edges, language, mode]);

  const saveToLocal = useCallback(() => {
    const record = buildRecord(currentRecordId);
    persistRecords((prev) => [record, ...prev.filter((item) => item.id !== record.id)]);
    setCurrentRecordId(record.id);
    return record;
  }, [buildRecord, currentRecordId, persistRecords]);

  const deleteRecord = useCallback((recordId: string) => {
    persistRecords((prev) => prev.filter((item) => item.id !== recordId));
    setCurrentRecordId((prev) => (prev === recordId ? null : prev));
  }, [persistRecords]);

  useEffect(() => {
    if (nodes.length === 0 && edges.length === 0) return;
    const timer = setTimeout(() => {
      const record = buildRecord(currentRecordId);
      persistRecords((prev) => [record, ...prev.filter((item) => item.id !== record.id)]);
      if (!currentRecordId) {
        setCurrentRecordId(record.id);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [nodes, edges, currentRecordId, buildRecord, persistRecords]);

  return {
    localRecords,
    currentRecordId,
    setCurrentRecordId,
    saveToLocal,
    deleteRecord,
  };
}
