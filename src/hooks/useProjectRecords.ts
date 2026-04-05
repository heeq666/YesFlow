import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';
import type { Edge, Node } from '@xyflow/react';

import type { ProjectRecord, TaskMode } from '../types';
import { sanitizeEdgesForPersistence, sanitizeNodeForPersistence } from '../utils/nodePersistence';

type UseProjectRecordsParams = {
  nodes: Node[];
  edges: Edge[];
  projectName: string;
  language: 'zh' | 'en';
  mode: TaskMode;
  onPersistError?: (message: string) => void;
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

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNodeLike(value: unknown): value is Node {
  return isRecordObject(value) && typeof value.id === 'string' && value.id.trim().length > 0;
}

function isEdgeLike(value: unknown): value is Edge {
  return isRecordObject(value)
    && typeof value.id === 'string'
    && typeof value.source === 'string'
    && typeof value.target === 'string';
}

function sanitizeStoredRecord(value: unknown): ProjectRecord | null {
  if (!isRecordObject(value) || typeof value.id !== 'string' || value.id.trim().length === 0) {
    return null;
  }

  const sanitizedNodes = Array.isArray(value.nodes)
    ? value.nodes.filter(isNodeLike).map(sanitizeNodeForPersistence)
    : [];
  const sanitizedEdges = Array.isArray(value.edges)
    ? sanitizeEdgesForPersistence(sanitizedNodes, value.edges.filter(isEdgeLike))
    : [];

  return {
    id: value.id,
    name: typeof value.name === 'string' && value.name.trim().length > 0 ? value.name : 'Unnamed',
    nodes: sanitizedNodes,
    edges: sanitizedEdges,
    language: value.language === 'en' ? 'en' : 'zh',
    mode: value.mode === 'daily' ? 'daily' : 'professional',
    lastModified: typeof value.lastModified === 'number' ? value.lastModified : Date.now(),
  };
}

function isStorageQuotaError(error: unknown) {
  return error instanceof DOMException
    ? error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    : false;
}

function formatPersistErrorMessage(language: 'zh' | 'en', error: unknown) {
  if (isStorageQuotaError(error)) {
    return language === 'zh'
      ? '本地记录空间不足，当前更改未能完整保存。请删除部分大图片，或先导出 JSON 备份。'
      : 'Local record storage is full, so the latest changes could not be fully saved. Remove some large images or export a JSON backup first.';
  }

  return language === 'zh'
    ? '本地记录保存失败，请稍后重试。'
    : 'Saving local records failed. Please try again.';
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
  onPersistError,
}: UseProjectRecordsParams) {
  const [localRecords, setLocalRecords] = useState<ProjectRecord[]>([]);
  const [currentRecordIdState, setCurrentRecordIdState] = useState<string | null>(null);
  const currentRecordIdRef = useRef<string | null>(null);
  const localRecordsRef = useRef<ProjectRecord[]>([]);

  const setCurrentRecordId = useCallback((value: React.SetStateAction<string | null>) => {
    const nextValue = typeof value === 'function'
      ? (value as (prev: string | null) => string | null)(currentRecordIdRef.current)
      : value;

    currentRecordIdRef.current = nextValue;
    setCurrentRecordIdState(nextValue);
  }, []);

  const currentRecordId = currentRecordIdState;

  useEffect(() => {
    localRecordsRef.current = localRecords;
  }, [localRecords]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      const normalizedRecords = Array.isArray(parsed)
        ? parsed.map(sanitizeStoredRecord).filter((record): record is ProjectRecord => Boolean(record))
        : [];
      setLocalRecords(normalizedRecords);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedRecords));
      } catch (error) {
        console.error(error);
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  const persistRecords = useCallback((updater: (prev: ProjectRecord[]) => ProjectRecord[]) => {
    let persisted = true;

    setLocalRecords((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (error) {
        persisted = false;
        console.error(error);
        onPersistError?.(formatPersistErrorMessage(language, error));
      }
      return next;
    });
    return persisted;
  }, [language, onPersistError]);

  const normalizeProjectName = useCallback((name: string) => (
    name.replace(/\.(json|zip|txt)$/i, '').replace(/\s+/g, '_') || 'Unnamed'
  ), []);

  const buildRecord = useCallback((overrides: BuildRecordOverrides = {}): ProjectRecord => {
    const nextNodes = overrides.nodes ?? nodes;
    const nextEdges = overrides.edges ?? edges;
    const cleanName = normalizeProjectName(overrides.name ?? projectName);
    const sanitizedNodes = nextNodes.map(sanitizeNodeForPersistence);
    const sanitizedEdges = sanitizeEdgesForPersistence(sanitizedNodes, nextEdges);

    return {
      id: overrides.id || `rec-${Date.now()}`,
      name: cleanName,
      nodes: sanitizedNodes,
      edges: sanitizedEdges,
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
    const record = buildRecord({ id: currentRecordIdRef.current });
    const persisted = persistRecords((prev) => upsertRecord(prev, record, { insertAtFront: true }));
    setCurrentRecordId(record.id);
    return { record, persisted };
  }, [buildRecord, persistRecords, setCurrentRecordId]);

  const persistCurrentRecordImmediately = useCallback((options: { insertAtFront?: boolean } = {}) => {
    const hasCanvasContent = nodes.length > 0 || edges.length > 0;
    const activeRecordId = currentRecordIdRef.current;

    if (!activeRecordId && !hasCanvasContent) return null;

    const record = buildRecord({ id: activeRecordId });
    persistRecords((prev) => upsertRecord(prev, record, { insertAtFront: options.insertAtFront ?? !activeRecordId }));
    setCurrentRecordId(record.id);
    return record;
  }, [buildRecord, edges.length, nodes.length, persistRecords, setCurrentRecordId]);

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

  const getRecordById = useCallback((recordId: string) => (
    localRecordsRef.current.find((record) => record.id === recordId) || null
  ), []);

  const updateRecord = useCallback((recordId: string, updater: (record: ProjectRecord) => ProjectRecord | null) => {
    let updatedRecord: ProjectRecord | null = null;

    persistRecords((prev) => prev.map((record) => {
      if (record.id !== recordId) return record;

      const nextRecord = updater(record);
      if (!nextRecord) return record;

      const sanitizedNodes = nextRecord.nodes.map(sanitizeNodeForPersistence);

      updatedRecord = {
        ...nextRecord,
        id: recordId,
        nodes: sanitizedNodes,
        edges: sanitizeEdgesForPersistence(sanitizedNodes, nextRecord.edges),
        lastModified: nextRecord.lastModified || Date.now(),
      };

      return updatedRecord;
    }));

    return updatedRecord;
  }, [persistRecords]);

  useEffect(() => {
    const hasCanvasContent = nodes.length > 0 || edges.length > 0;
    const activeRecordId = currentRecordIdRef.current;

    if (!activeRecordId && !hasCanvasContent) return;

    if (!activeRecordId && hasCanvasContent) {
      persistCurrentRecordImmediately({ insertAtFront: true });
      return;
    }

    const timer = setTimeout(() => {
      const record = buildRecord({ id: currentRecordIdRef.current });
      persistRecords((prev) => upsertRecord(prev, record, { insertAtFront: false }));
    }, 2000);

    return () => clearTimeout(timer);
  }, [nodes, edges, buildRecord, persistCurrentRecordImmediately, persistRecords]);

  useEffect(() => {
    if (!currentRecordIdRef.current) return;

    persistCurrentRecordImmediately({ insertAtFront: false });
  }, [projectName, language, mode, persistCurrentRecordImmediately]);

  return {
    localRecords,
    currentRecordId,
    setCurrentRecordId,
    createRecord,
    saveToLocal,
    deleteRecord,
    reorderRecords,
    getRecordById,
    updateRecord,
  };
}
