import { useCallback } from 'react';
import type React from 'react';
import type { Edge, Node } from '@xyflow/react';

import { createHistory, type HistoryState } from '../utils/historyUtils';
import type { TaskData, TaskMode } from '../types';
import { clearTransientNodeData, sanitizeNodeForPersistence } from '../utils/nodePersistence';

type HydrateNodeData = {
  language: 'zh' | 'en';
  onStatusChange: (id: string, status: any) => void;
  onUpdateData: (id: string, updates: Partial<TaskData>) => void;
  onOpenToolPanel: (id: string, tool: any) => void;
  onAddNode: (event: any, id: string, position: any) => void;
  onUngroup: (groupId: string) => void;
};

type UseProjectFileIOParams = {
  nodes: Node[];
  edges: Edge[];
  projectName: string;
  language: 'zh' | 'en';
  mode: TaskMode;
  hydrateNodeData: HydrateNodeData;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setProjectName: (name: string) => void;
  setLanguage: (language: 'zh' | 'en') => void;
  setMode: (mode: TaskMode) => void;
  setHistory: (history: HistoryState) => void;
  setImportStatus: (status: 'idle' | 'loading' | 'success' | 'error') => void;
  setImportMessage: (message: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onImportSuccess?: () => void;
};

function sanitizeEdges(nodes: Node[], edges: Edge[]) {
  const nodeIds = nodes.map((node) => node.id);
  return edges.filter((edge) => nodeIds.includes(edge.source) && nodeIds.includes(edge.target));
}

export function useProjectFileIO({
  nodes,
  edges,
  projectName,
  language,
  mode,
  hydrateNodeData,
  setNodes,
  setEdges,
  setProjectName,
  setLanguage,
  setMode,
  setHistory,
  setImportStatus,
  setImportMessage,
  fileInputRef,
  onImportSuccess,
}: UseProjectFileIOParams) {
  const saveFile = useCallback((fileName?: string) => {
    const rawName = (fileName || projectName).trim();
    const cleanName = (rawName || 'YesFlow Project')
      .replace(/\.(json|zip|txt)$/i, '')
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
      .trim() || 'YesFlow Project';
    const exportData = {
      projectName: cleanName,
      language,
      mode,
      nodes: nodes.map(sanitizeNodeForPersistence),
      edges,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${cleanName}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [projectName, language, mode, nodes, edges]);

  const importProjectContent = useCallback((content: string) => {
    try {
      const data = JSON.parse(content);
      if (!data.nodes || !data.edges) throw new Error('Invalid JSON');

      const hydratedNodes = data.nodes.map((node: Node) => ({
        ...node,
        selected: false,
        extent: node.parentId ? undefined : node.extent,
        data: {
          ...clearTransientNodeData((node.data || {}) as Record<string, unknown>),
          language: data.language || language,
          onStatusChange: hydrateNodeData.onStatusChange,
          onUpdateData: hydrateNodeData.onUpdateData,
          onOpenToolPanel: hydrateNodeData.onOpenToolPanel,
          onAddNode: (e: any, id: string, position: any) => hydrateNodeData.onAddNode(e, id, position),
          ...(node.type === 'group' ? { onUngroup: hydrateNodeData.onUngroup } : null),
        },
      }));

      const finalEdges = sanitizeEdges(hydratedNodes, data.edges);

      if (data.projectName) setProjectName(data.projectName);
      setNodes(hydratedNodes);
      setEdges(finalEdges);
      setLanguage(data.language || 'zh');
      setMode(data.mode || 'professional');
      setHistory(createHistory({ nodes: hydratedNodes, edges: finalEdges }));
      setImportStatus('success');
      setImportMessage(language === 'zh' ? '导入成功' : 'Success');
      onImportSuccess?.();
    } catch (error: any) {
      setImportStatus('error');
      setImportMessage(`${language === 'zh' ? '错误: ' : 'Error: '}${error.message}`);
    } finally {
      setTimeout(() => setImportStatus('idle'), 4000);
    }
  }, [
    language,
    hydrateNodeData,
    setProjectName,
    setNodes,
    setEdges,
    setLanguage,
    setMode,
    setHistory,
    setImportStatus,
    setImportMessage,
    onImportSuccess,
  ]);

  const loadProjectFile = useCallback((file: File) => {
    if (!file) return;

    setImportStatus('loading');
    setImportMessage(language === 'zh' ? '正在导入...' : 'Importing...');

    const reader = new FileReader();
    reader.onload = (readerEvent) => importProjectContent((readerEvent.target?.result as string) || '');
    reader.onerror = () => {
      setImportStatus('error');
      setImportMessage(language === 'zh' ? '读取文件失败' : 'Failed to read file');
      setTimeout(() => setImportStatus('idle'), 4000);
    };

    reader.readAsText(file);
  }, [
    importProjectContent,
    language,
    setImportStatus,
    setImportMessage,
  ]);

  const loadFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    loadProjectFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [
    loadProjectFile,
    fileInputRef,
  ]);

  return {
    saveFile,
    loadFile,
    loadProjectFile,
  };
}
