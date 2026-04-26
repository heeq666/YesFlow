import { useCallback } from 'react';
import type React from 'react';
import type { Edge, Node } from '@xyflow/react';

import { createHistory, type HistoryState } from '../utils/historyUtils';
import type { TaskData, TaskMode } from '../types';
import { clearTransientNodeData, sanitizeEdgesForPersistence, sanitizeNodeForPersistence } from '../utils/nodePersistence';
import {
  createProjectExportContent,
  getProjectExportFormat,
  readYesFlowPayloadFromImport,
  stripProjectExportExtension,
  type ProjectExportFormat,
} from '../utils/projectExportFormats';

const EMBEDDED_IMAGE_WARNING_COUNT = 6;
const EMBEDDED_IMAGE_WARNING_BYTES = 6 * 1024 * 1024;

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

function isImportNodeLike(value: unknown): value is Node {
  return typeof value === 'object'
    && value !== null
    && typeof (value as Node).id === 'string'
    && (value as Node).id.trim().length > 0;
}

function isImportEdgeLike(value: unknown): value is Edge {
  return typeof value === 'object'
    && value !== null
    && typeof (value as Edge).id === 'string'
    && typeof (value as Edge).source === 'string'
    && typeof (value as Edge).target === 'string';
}

function estimateDataUrlBytes(value: string) {
  const commaIndex = value.indexOf(',');
  if (commaIndex === -1) return 0;

  const base64Payload = value.slice(commaIndex + 1);
  const padding = base64Payload.endsWith('==') ? 2 : base64Payload.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64Payload.length * 3) / 4) - padding);
}

function getEmbeddedImageImportStats(nodes: Node[]) {
  let count = 0;
  let approxBytes = 0;

  nodes.forEach((node) => {
    const items = Array.isArray((node.data as any)?.tools?.image?.items)
      ? (node.data as any).tools.image.items
      : [];

    items.forEach((item: any) => {
      const source = typeof item?.src === 'string' ? item.src : '';
      if (!/^data:image\//i.test(source)) return;
      count += 1;
      approxBytes += estimateDataUrlBytes(source);
    });
  });

  return { count, approxBytes };
}

function formatEmbeddedImageImportMessage(language: 'zh' | 'en', stats: { count: number; approxBytes: number }) {
  const approxMegabytes = (stats.approxBytes / (1024 * 1024)).toFixed(stats.approxBytes >= 10 * 1024 * 1024 ? 0 : 1);

  return language === 'zh'
    ? `导入成功，包含 ${stats.count} 张内嵌图片（约 ${approxMegabytes} MB），后续保存与切换可能会更重。`
    : `Import succeeded with ${stats.count} embedded image(s) (about ${approxMegabytes} MB). Saving and switching may feel heavier afterwards.`;
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
  const saveFile = useCallback((fileName?: string, format: ProjectExportFormat = 'json') => {
    const rawName = (fileName || projectName).trim();
    const cleanName = (rawName || 'YesFlow Project')
      .replace(/\.(json|pos|posf|vdx|vsdx|mmd|mermaid|zip|txt)$/i, '')
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
      .trim() || 'YesFlow Project';
    const exportFormat = getProjectExportFormat(format);
    const sanitizedNodes = nodes.map(sanitizeNodeForPersistence);
    const exportData = {
      projectName: cleanName,
      language,
      mode,
      nodes: sanitizedNodes,
      edges: sanitizeEdgesForPersistence(sanitizedNodes, edges),
    };
    const blob = new Blob(
      [createProjectExportContent(exportData, format)],
      { type: exportFormat.mimeType },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${stripProjectExportExtension(cleanName)}.${exportFormat.extension}`;
    link.click();
    URL.revokeObjectURL(url);
  }, [projectName, language, mode, nodes, edges]);

  const importProjectContent = useCallback((content: string) => {
    let resetDelayMs = 4000;

    try {
      const data = readYesFlowPayloadFromImport(JSON.parse(content));
      if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) throw new Error('Invalid JSON');
      if (!data.nodes.every(isImportNodeLike) || !data.edges.every(isImportEdgeLike)) {
        throw new Error('Invalid node or edge payload');
      }

      const importedNodes = data.nodes as Node[];
      const importedNodeIds = importedNodes.map((node) => node.id);
      if (new Set(importedNodeIds).size !== importedNodeIds.length) {
        throw new Error(language === 'zh' ? '导入文件包含重复节点 ID' : 'Imported file contains duplicate node ids');
      }

      const embeddedImageStats = getEmbeddedImageImportStats(data.nodes as Node[]);
      const validNodeIds = new Set(importedNodeIds);

      const hydratedNodes = importedNodes.map((node: Node) => {
        const hasValidParent = typeof node.parentId === 'string' && validNodeIds.has(node.parentId);

        return {
          ...node,
          parentId: hasValidParent ? node.parentId : undefined,
          selected: false,
          extent: hasValidParent ? undefined : node.extent,
          data: {
            ...clearTransientNodeData((node.data || {}) as Record<string, unknown>),
            language: data.language || language,
            onStatusChange: hydrateNodeData.onStatusChange,
            onUpdateData: hydrateNodeData.onUpdateData,
            onOpenToolPanel: hydrateNodeData.onOpenToolPanel,
            onAddNode: (e: any, id: string, position: any) => hydrateNodeData.onAddNode(e, id, position),
            ...(node.type === 'group' ? { onUngroup: hydrateNodeData.onUngroup } : null),
          },
        };
      });

      const finalEdges = sanitizeEdgesForPersistence(hydratedNodes, data.edges as Edge[]);

      if (data.projectName) setProjectName(data.projectName);
      setNodes(hydratedNodes);
      setEdges(finalEdges);
      setLanguage(data.language || 'zh');
      setMode(data.mode || 'professional');
      setHistory(createHistory({ nodes: hydratedNodes, edges: finalEdges }));
      setImportStatus('success');
      if (
        embeddedImageStats.count >= EMBEDDED_IMAGE_WARNING_COUNT ||
        embeddedImageStats.approxBytes >= EMBEDDED_IMAGE_WARNING_BYTES
      ) {
        setImportMessage(formatEmbeddedImageImportMessage(language, embeddedImageStats));
        resetDelayMs = 6500;
      } else {
        setImportMessage(language === 'zh' ? '导入成功' : 'Success');
      }
      onImportSuccess?.();
    } catch (error: any) {
      setImportStatus('error');
      setImportMessage(`${language === 'zh' ? '错误: ' : 'Error: '}${error.message}`);
    } finally {
      setTimeout(() => setImportStatus('idle'), resetDelayMs);
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
