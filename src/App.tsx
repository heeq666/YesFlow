/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useCallback, useMemo, useState, useEffect } from 'react';
import {
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  useStoreApi,
  useUpdateNodeInternals,
  MarkerType,
  getNodesBounds,
  applyNodeChanges,
  type Edge,
  type Node,
  type NodeChange,
  type NodePositionChange,
} from '@xyflow/react';
import { 
  Send, 
  ChevronRight, 
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  Info,
  Loader2,
  Plus,
  Globe,
  AlertCircle,
  SplitSquareHorizontal,
  Wand2,
  X,
  Trash2,
  Activity,
  Minus,
  CornerDownRight,
  Save,
  FileUp,
  Undo2,
  Redo2,
  Database,
  History,
  Clock,
  ClipboardList,
  Zap,
  MousePointer2,
  ShieldCheck,
  CheckCircle2,
  Tag,
  Circle as CircleIcon,
  PlayCircle,
  Layers,
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  Rows,
  Columns
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import SidebarToggle from './components/SidebarToggle';
import StatusIndicators from './components/StatusIndicators';
import ContextualToolbar from './components/ContextualToolbar';
import FlowCanvas from './components/FlowCanvas';
import AppErrorBoundary from './components/AppErrorBoundary';
import { getHelperLines, type HelperLines as HelperLinesType } from './utils/helperLineUtils';
import { getNodeAbsolutePosition } from './utils/nodeUtils';
import { createHistory, pushToHistory } from './utils/historyUtils';
import { ensureToolState } from './utils/nodeTools';
import { clearTransientNodeData, sanitizeEdgesForPersistence } from './utils/nodePersistence';
import { getTaskNodeLayout } from './constants/taskNodeLayout';
import { type ConnectionMode, type NodeStatus, type NodeToolType, type ProjectRecord, type TaskData, type TaskMode, type Settings, type NodePreset } from './types';
import { NodeSettingsContext } from './contexts/NodeSettingsContext';
import { translations } from './constants/translations';
import { useAppSettings } from './hooks/useAppSettings';
import { useAiOrchestration } from './hooks/useAiOrchestration';
import { useCanvasActions } from './hooks/useCanvasActions';
import { useCanvasHistory } from './hooks/useCanvasHistory';
import { useCanvasInteractionConfig } from './hooks/useCanvasInteractionConfig';
import { useCanvasLayoutActions } from './hooks/useCanvasLayoutActions';
import { useCanvasSelection } from './hooks/useCanvasSelection';
import { useCanvasHotkeys } from './hooks/useCanvasHotkeys';
import { useEdgeHighlighting } from './hooks/useEdgeHighlighting';
import { useProjectFileIO } from './hooks/useProjectFileIO';
import { useProjectRecords } from './hooks/useProjectRecords';
import { useRecordNodeAiTasks } from './hooks/useRecordNodeAiTasks';

import '@xyflow/react/dist/style.css';

const SettingsModal = lazy(() => import('./components/SettingsModal'));
const SidebarPanel = lazy(() => import('./components/SidebarPanel'));
const RightToolSidebar = lazy(() => import('./components/RightToolSidebar'));
const StartDialog = lazy(() => import('./components/StartDialog'));
const ConfigModal = lazy(() => import('./components/ConfigModal'));
const ExportFileModal = lazy(() => import('./components/ExportFileModal'));

type ViewportRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export default function App() {
  const [toolPanelRequest, setToolPanelRequest] = useState<{ nodeId: string; tool: NodeToolType; nonce: number } | null>(null);
  const [nodeClickRevealNonce, setNodeClickRevealNonce] = useState(0);
  const [helperLines, setHelperLines] = useState<HelperLinesType>({ horizontal: null, vertical: null });
  const { screenToFlowPosition, getIntersectingNodes, getNodes, getEdges, fitView } = useReactFlow();
  const store = useStoreApi();
  const [nodes, setNodes, onNodesChangeOriginal] = useNodesState<Node>([]);
  const updateHelperLines = useCallback((next: HelperLinesType) => {
    setHelperLines((current) => {
      const sameHorizontal =
        current.horizontal?.y === next.horizontal?.y &&
        current.horizontal?.x1 === next.horizontal?.x1 &&
        current.horizontal?.x2 === next.horizontal?.x2;
      const sameVertical =
        current.vertical?.x === next.vertical?.x &&
        current.vertical?.y1 === next.vertical?.y1 &&
        current.vertical?.y2 === next.vertical?.y2;

      return sameHorizontal && sameVertical ? current : next;
    });
  }, []);

  // 2. High-Precision Change Implementation with Alignment Snapping
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const positionChange = changes.find((c): c is NodePositionChange => c.type === 'position');
    
    if (positionChange?.dragging && positionChange.position) {
      const currentNodes = getNodes();
      const node = currentNodes.find((n) => n.id === positionChange.id);
      
      if (node) {
        // 注意：拖拽过程中的 positionChange.position 才是“实时位置”
        // 这里需要把它换算到绝对坐标后再做吸附计算，否则会把位置覆盖回旧值，导致拖拽卡顿/只在松手时跳动。
        const parent = node.parentId ? currentNodes.find(n => n.id === node.parentId) : undefined;
        const parentAbsPos = parent ? getNodeAbsolutePosition(parent, currentNodes) : null;
        const proposedAbsPos = parentAbsPos
          ? { x: parentAbsPos.x + positionChange.position.x, y: parentAbsPos.y + positionChange.position.y }
          : positionChange.position;

        // 计算对齐辅助线和对齐后的绝对坐标
        const { snappedPosition: snappedAbsPos, helperLines: lines } = getHelperLines(
          { ...node, position: proposedAbsPos },
          currentNodes
        );

        // 如果节点有父级，需要将对齐后的绝对坐标转换回相对于父级的坐标
        if (parentAbsPos) {
          positionChange.position = {
            x: snappedAbsPos.x - parentAbsPos.x,
            y: snappedAbsPos.y - parentAbsPos.y,
          };
        } else {
          positionChange.position = snappedAbsPos;
        }

        updateHelperLines(lines);
      }
    } else if (changes.some(c => c.type === 'dimensions' || c.type === 'select')) {
      // Clear lines if not dragging
      updateHelperLines({ horizontal: null, vertical: null });
    }
    
    onNodesChangeOriginal(changes);
  }, [onNodesChangeOriginal, getNodes, updateHelperLines]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [language, setLanguage] = useState<'en' | 'zh'>('zh');
  const t = translations[language];
  const [mode, setMode] = useState<TaskMode>('professional');
  const [prompt, setPrompt] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [projectName, setProjectName] = useState('YesFlow Project');
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [defaultPathType, setDefaultPathType] = useState<string>('bezier');
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('auto');
  const [showDecomposeInput, setShowDecomposeInput] = useState(false);
  const [decomposePrompt, setDecomposePrompt] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState<string>('');
  const [showStartDialog, setShowStartDialog] = useState(true);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isGeneratingPlanCompleting, setIsGeneratingPlanCompleting] = useState(false);
  const [planGenerationOutcome, setPlanGenerationOutcome] = useState<'idle' | 'running' | 'success' | 'aborted' | 'error'>('idle');
  const [pendingAiViewportRequest, setPendingAiViewportRequest] = useState<{ nonce: number; scope: 'all' | 'nodes'; nodeIds?: string[] } | null>(null);
  const [generatingRecordId, setGeneratingRecordId] = useState<string | null>(null);
  const [generatingCardTargetRect, setGeneratingCardTargetRect] = useState<ViewportRect | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [hideGeneratingRecord, setHideGeneratingRecord] = useState(false);
  const [isExportFileModalOpen, setIsExportFileModalOpen] = useState(false);
  const [exportFileName, setExportFileName] = useState('YesFlow Project');
  const [clipboard, setClipboard] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const fileDragDepthRef = React.useRef(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isFileDragActive, setIsFileDragActive] = useState(false);
  const { settings, setSettings } = useAppSettings();
  const themeMode = settings.themeMode;
  const activeProvider = settings.apiConfig.providers.find(p => p.id === settings.apiConfig.activeProviderId) || settings.apiConfig.providers[0];
  const hasApiKey = Boolean(activeProvider?.apiKey);
  const activeProviderName = activeProvider?.name || 'MiniMax';
  const taskNodeLayout = getTaskNodeLayout(mode);

  // --- Start of Request Handlers ---
  const handleUpdateSettings = (newSettings: Settings) => {
    setSettings(newSettings);
  };

  const handleSelectProvider = (id: string) => {
    setSettings({
      ...settings,
      apiConfig: {
        ...settings.apiConfig,
        activeProviderId: id
      }
    });
  };

  const toggleTheme = useCallback(() => {
    setSettings((current) => ({
      ...current,
      themeMode: current.themeMode === 'dark' ? 'light' : 'dark',
    }));
  }, [setSettings]);

  const toggleLanguage = useCallback(() => {
    setLanguage((current) => (current === 'zh' ? 'en' : 'zh'));
  }, []);
  // --- End of Request Handlers ---

  // First Visit Check: Open dedicated ConfigModal if API Key is missing
  useEffect(() => {
    if (!hasApiKey) {
      setIsConfigModalOpen(true);
    }
  }, [hasApiKey]); // Stable check

  useEffect(() => {
    document.documentElement.style.colorScheme = settings.themeMode;
  }, [settings.themeMode]);

  const {
    history,
    setHistory,
    takeSnapshot,
    handleUndo,
    handleRedo,
    statusNote,
    showStatus,
  } = useCanvasHistory({
    getNodes,
    getEdges,
    setNodes,
    setEdges,
  });

  const {
    localRecords,
    currentRecordId,
    setCurrentRecordId,
    createRecord,
    saveToLocal,
    deleteRecord,
    reorderRecords,
    updateRecord,
  } = useProjectRecords({
    nodes,
    edges,
    projectName,
    language,
    mode,
    onPersistError: (message) => {
      setImportStatus('error');
      setImportMessage(message);
      setTimeout(() => setImportStatus('idle'), 5000);
    },
  });
  const currentRecordIdRef = React.useRef<string | null>(currentRecordId);
  const abortAiTaskHandlersRef = React.useRef<Record<string, (nodeId: string) => void>>({});
  const abortAiBeforeCanvasSwitchRef = React.useRef<() => void>(() => {});
  useEffect(() => {
    currentRecordIdRef.current = currentRecordId;
  }, [currentRecordId]);

  const resetPlanGenerationUi = useCallback(() => {
    setIsGeneratingPlan(false);
    setIsGeneratingPlanCompleting(false);
    setStreamingContent('');
    setHideGeneratingRecord(false);
    setGeneratingRecordId(null);
    setPlanGenerationOutcome('idle');
  }, []);

  const selectionStartNodes = React.useRef<string[]>([]);
  const updateNodeInternals = useUpdateNodeInternals();
  const cancelCanvasConnection = useCallback(() => {
    store.getState().cancelConnection();
  }, [store]);
  const isCanvasConnectionInProgress = useCallback(() => {
    return Boolean((store.getState().connection as { inProgress?: boolean }).inProgress);
  }, [store]);

  // 1. Sidebar Resize Synchronization: ensure canvas coordinates are consistent after UI shifts
  useEffect(() => {
    const handleResize = () => {
      window.dispatchEvent(new Event('resize'));
    };
    const timer = setTimeout(handleResize, 350); // Matches Sidebar animation duration
    return () => clearTimeout(timer);
  }, [isSidebarOpen]);

  const handleStatusChange = useCallback((id: string, status: NodeStatus) => {
    setNodes((nds) => {
      const next = nds.map((node) => node.id === id ? { ...node, data: { ...node.data, status } } : node);
      setHistory(prev => pushToHistory(prev, { nodes: next, edges: getEdges() }));
      return next;
    });
  }, [getEdges, setNodes, setHistory]);

  const handleUpdateNodeData = useCallback((id: string, updates: Partial<TaskData>) => {
    setNodes((nds) => {
      const next = nds.map((node) => node.id === id ? { ...node, data: { ...node.data, ...updates } } : node);
      setHistory(prev => pushToHistory(prev, { nodes: next, edges: getEdges() }));
      return next;
    });
  }, [getEdges, setNodes, setHistory]);

  const handleOpenNodeToolPanel = useCallback((id: string, tool: NodeToolType) => {
    const targetNode = getNodes().find((node) => node.id === id);
    const targetData = targetNode?.data as TaskData | undefined;
    if (!targetData) return;

    const shouldUpdateTools = targetData.tools?.activeTool !== tool || !targetData.tools?.[tool]?.enabled;
    if (shouldUpdateTools) {
      handleUpdateNodeData(id, { tools: ensureToolState(targetData, tool, language) });
    }

    setSelectedNodeId(id);
    setSelectedEdgeId(null);
    setSettings((current) => ({
      ...current,
      nodeTools: {
        ...current.nodeTools,
        enabled: true,
      },
    }));
    setToolPanelRequest({ nodeId: id, tool, nonce: Date.now() });
  }, [getNodes, handleUpdateNodeData, language, setSettings]);

  const handleDeleteSelectedEdge = useCallback(() => {
    if (!selectedEdgeId) return;
    setEdges((currentEdges) => {
      const nextEdges = currentEdges.filter((edge) => edge.id !== selectedEdgeId);
      setHistory((prev) => pushToHistory(prev, { nodes: getNodes(), edges: nextEdges }));
      return nextEdges;
    });
    setSelectedEdgeId(null);
  }, [selectedEdgeId, setEdges, setHistory, getNodes]);

  const handleUpdateSelectedEdgeLabel = useCallback((value: string) => {
    if (!selectedEdgeId) return;
    setEdges((currentEdges) => {
      const nextEdges = currentEdges.map((edge) => edge.id === selectedEdgeId ? { ...edge, label: value } : edge);
      setHistory((prev) => pushToHistory(prev, { nodes: getNodes(), edges: nextEdges }));
      return nextEdges;
    });
  }, [selectedEdgeId, setEdges, setHistory, getNodes]);

  const handleUpdateSelectedEdgeColor = useCallback((color?: string) => {
    if (!selectedEdgeId) return;
    setEdges((currentEdges) => {
      const nextEdges = currentEdges.map((edge) => edge.id === selectedEdgeId ? { ...edge, data: { ...edge.data, color } } : edge);
      setHistory((prev) => pushToHistory(prev, { nodes: getNodes(), edges: nextEdges }));
      return nextEdges;
    });
  }, [selectedEdgeId, setEdges, setHistory, getNodes]);

  const handleNodeAdd = useCallback((e: React.MouseEvent | null, sourceId: string, position: 'top' | 'bottom' | 'left' | 'right') => {
    const newNodeId = `task-${Date.now()}`;
    const sourceNode = getNodes().find(n => n.id === sourceId);
    if (!sourceNode) return;
    const oppositeHandleMap = {
      top: 'bottom',
      bottom: 'top',
      left: 'right',
      right: 'left',
    } as const;
    const pos = { 
      x: sourceNode.position.x + (position === 'right' ? taskNodeLayout.addOffsetX : position === 'left' ? -taskNodeLayout.addOffsetX : 0), 
      y: sourceNode.position.y + (position === 'bottom' ? taskNodeLayout.addOffsetY : position === 'top' ? -taskNodeLayout.addOffsetY : 0) 
    };
    const newNode: Node = { 
      id: newNodeId, type: 'task', position: pos, selected: true,
      data: { label: '', description: '', type: 'execution', status: 'pending', language, onStatusChange: handleStatusChange, onUpdateData: handleUpdateNodeData, onOpenToolPanel: handleOpenNodeToolPanel, onAddNode: (e, id, p) => handleNodeAdd(e, id, p) } as TaskData 
    };
    const newEdge: Edge = {
      id: `edge-${sourceId}-${newNodeId}-${Math.random().toString(36).slice(2, 11)}`,
      source: sourceId,
      target: newNodeId,
      sourceHandle: connectionMode === 'fixed' ? `${position}-source` : undefined,
      targetHandle: connectionMode === 'fixed' ? `${oppositeHandleMap[position]}-target` : undefined,
      type: 'floating',
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
      data: { pathType: defaultPathType, connectionMode },
    };
    setNodes(nds => {
      const next = [...nds.map(n => ({ ...n, selected: false })), { ...newNode, selected: true }];
      setEdges(eds => { const nextEds = [...eds, newEdge]; takeSnapshot(next, nextEds); return nextEds; });
      return next;
    });
    setSelectedNodeId(newNodeId);
  }, [getNodes, language, handleStatusChange, handleUpdateNodeData, defaultPathType, connectionMode, takeSnapshot, setNodes, setEdges, taskNodeLayout.addOffsetX, taskNodeLayout.addOffsetY]);

  const hydrateTaskData = useCallback((data: Partial<TaskData>) => ({
    label: typeof data.label === 'string' ? data.label : '',
    description: typeof data.description === 'string' ? data.description : '',
    type: typeof data.type === 'string' && data.type.trim().length > 0 ? data.type : 'execution',
    status: data.status || 'pending',
    ...data,
    language,
    onStatusChange: handleStatusChange,
    onUpdateData: handleUpdateNodeData,
    onOpenToolPanel: handleOpenNodeToolPanel,
    onAddNode: (event: React.MouseEvent, id: string, position: 'top' | 'bottom' | 'left' | 'right') => handleNodeAdd(event, id, position),
  } as TaskData), [language, handleStatusChange, handleUpdateNodeData, handleOpenNodeToolPanel, handleNodeAdd]);

  const handleSaveToLocal = useCallback(() => {
    const { persisted } = saveToLocal();
    if (!persisted) return;
    setImportStatus('success');
    setImportMessage(language === 'zh' ? '已存至记录' : 'Saved to records');
    setTimeout(() => setImportStatus('idle'), 3000);
  }, [language, saveToLocal]);

  const ensureCurrentRecord = useCallback(() => {
    if (currentRecordIdRef.current) return currentRecordIdRef.current;

    const record = createRecord({
      name: projectName || 'YesFlow Project',
      nodes,
      edges,
      language,
      mode,
    });

    currentRecordIdRef.current = record.id;
    return record.id;
  }, [createRecord, projectName, nodes, edges, language, mode]);

  const ensureCurrentRecordSnapshot = useCallback(() => {
    if (currentRecordIdRef.current) {
      const { record } = saveToLocal();
      currentRecordIdRef.current = record.id;
      return record;
    }

    const record = createRecord({
      name: projectName || 'YesFlow Project',
      nodes,
      edges,
      language,
      mode,
    });

    currentRecordIdRef.current = record.id;
    return record;
  }, [createRecord, saveToLocal, projectName, nodes, edges, language, mode]);

  const {
    recordAiStates,
    isRecordTaskRunning,
    markRecordAiStateSeen,
    abortTasksForRecordNodes,
    handleModifySelected,
    handleOptimizeSelectedNode,
    handleDecompose,
    handleGenerateGroupTasks,
  } = useRecordNodeAiTasks({
    currentRecordId,
    nodes,
    edges,
    projectName,
    language,
    mode,
    provider: activeProvider,
    defaultPathType,
    connectionMode,
    selectedPrompt,
    decomposePrompt,
    selectedNodeId,
    setNodes,
    setEdges,
    setProjectName,
    takeSnapshot,
    showStatus,
    hydrateTaskData,
    ensureCurrentRecordSnapshot,
    updateRecord,
  });

  const getAbortAiTaskHandler = useCallback((recordId: string, nodeId: string) => {
    const cacheKey = `${recordId}:${nodeId}`;
    if (!abortAiTaskHandlersRef.current[cacheKey]) {
      abortAiTaskHandlersRef.current[cacheKey] = () => {
        abortTasksForRecordNodes(recordId, [nodeId]);
      };
    }
    return abortAiTaskHandlersRef.current[cacheKey];
  }, [abortTasksForRecordNodes]);

  const decorateNodesWithAiState = useCallback((recordId: string | null, sourceNodes: Node[]) => {
    if (!recordId) return sourceNodes;

    const runningNodeIds = new Set(recordAiStates[recordId]?.runningNodeIds || []);
    let changed = false;

    const nextNodes = sourceNodes.map((node) => {
      const nodeData = (node.data || {}) as TaskData;
      const isAiProcessing = runningNodeIds.has(node.id);
      const nextAbortAction = isAiProcessing
        ? getAbortAiTaskHandler(recordId, node.id)
        : undefined;

      if (
        nodeData.isAiProcessing === isAiProcessing &&
        nodeData.onAbortAiTask === nextAbortAction
      ) {
        return node;
      }

      changed = true;
      return {
        ...node,
        data: {
          ...nodeData,
          isAiProcessing,
          onAbortAiTask: nextAbortAction,
        },
      };
    });

    return changed ? nextNodes : sourceNodes;
  }, [getAbortAiTaskHandler, recordAiStates]);

  const {
    handleCopy,
    handleCut,
    handlePaste,
    deleteNodesAndReconnect,
    handleDeleteNodeLocal,
    handleAddNodeLocal,
    handleNewProject,
    handleApplyPathTypeToAll,
    handleApplyConnectionModeToAll,
    handleSetSelectedEdgesColor,
    handleGroupSelection,
    handleUngroup,
    handleExitSelectedFromGroup,
    onConnect,
    onConnectStart,
    onConnectEnd,
    handleAddPresetNode,
    onDragOver,
    onDrop,
    onNodeDrag,
    onNodeDragStop,
  } = useCanvasActions({
    nodes,
    edges,
    language,
    mode,
    defaultPathType,
    connectionMode,
    clipboard,
    selectedNodeId,
    screenToFlowPosition,
    getNodes,
    getEdges,
    takeSnapshot,
    showStatus,
    hydrateTaskData,
    setNodes,
    setEdges,
    setClipboard,
    setSelectedNodeId,
    setSelectedEdgeId,
    setProjectName,
    setPrompt,
    setShowStartDialog,
    setCurrentRecordId,
    setHistory,
    setIsSidebarOpen,
    setHelperLines: updateHelperLines,
    cancelConnection: cancelCanvasConnection,
    isConnectionInProgress: isCanvasConnectionInProgress,
  });

  const handleLoadFromLocal = useCallback((record: ProjectRecord) => {
    abortAiBeforeCanvasSwitchRef.current();

    const hydratedNodes = record.nodes.map((node: Node) => ({
      ...node,
      selected: false,
      extent: node.parentId ? undefined : node.extent,
      data: {
        ...clearTransientNodeData((node.data || {}) as Record<string, unknown>),
        language: record.language || language,
        onStatusChange: handleStatusChange,
        onUpdateData: handleUpdateNodeData,
        onOpenToolPanel: handleOpenNodeToolPanel,
        onAddNode: (event: React.MouseEvent, id: string, position: 'top' | 'bottom' | 'left' | 'right') =>
          handleNodeAdd(event, id, position),
        onUngroup: node.type === 'group'
          ? (groupId: string) => handleUngroup(groupId)
          : (node.data as TaskData | undefined)?.onUngroup,
      },
    }));
    const finalEdges = sanitizeEdgesForPersistence(hydratedNodes, record.edges);

    setNodes(hydratedNodes);
    setEdges(finalEdges);
    setProjectName(record.name);
    setLanguage(record.language);
    setMode(record.mode);
    setCurrentRecordId(record.id);
    setHistory(createHistory({ nodes: hydratedNodes, edges: finalEdges }));
    setShowStartDialog(false);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setToolPanelRequest(null);

    const recordAiState = recordAiStates[record.id];
    if (recordAiState?.unread) {
      if (recordAiState.latestStatus && recordAiState.latestMessage) {
        showStatus(
          recordAiState.latestMessage,
          recordAiState.latestStatus === 'success'
            ? <CheckCircle2 className="w-3.5 h-3.5" />
            : <AlertCircle className="w-3.5 h-3.5" />,
        );
      }
      markRecordAiStateSeen(record.id);
    }

    setImportStatus('success');
    setImportMessage(language === 'zh' ? `已载入: ${record.name}` : `Loaded: ${record.name}`);
    setTimeout(() => {
      setImportStatus('idle');
    }, 3000);
  }, [
    language,
    handleStatusChange,
    handleUpdateNodeData,
    handleOpenNodeToolPanel,
    handleNodeAdd,
    handleUngroup,
    markRecordAiStateSeen,
    recordAiStates,
    setCurrentRecordId,
    setEdges,
    setHistory,
    setNodes,
    showStatus,
  ]);

  const handleCreateNewProject = useCallback(() => {
    abortAiBeforeCanvasSwitchRef.current();
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setToolPanelRequest(null);
    handleNewProject();
  }, [handleNewProject]);

  const handleDeleteRecord = useCallback((id: string) => {
    const isDeletingCurrent = currentRecordId === id;
    const remainingRecords = localRecords.filter((record) => record.id !== id);

    deleteRecord(id);

    if (!isDeletingCurrent) return;

    if (remainingRecords.length > 0) {
      handleLoadFromLocal(remainingRecords[0]);
      return;
    }

    handleCreateNewProject();
  }, [currentRecordId, localRecords, deleteRecord, handleLoadFromLocal, handleCreateNewProject]);

  const handleStartManually = useCallback(() => {
    // Keep manual entry lightweight; the first real canvas change will create the record lazily.
    setShowStartDialog(false);
  }, []);

  const handleDismissStartDialog = useCallback(() => {
    setShowStartDialog(false);
  }, []);

  const { saveFile: exportProjectFile, loadFile: handleLoadFile, loadProjectFile } = useProjectFileIO({
    nodes,
    edges,
    projectName,
    language,
    mode,
    hydrateNodeData: {
      language,
      onStatusChange: handleStatusChange,
      onUpdateData: handleUpdateNodeData,
      onOpenToolPanel: handleOpenNodeToolPanel,
      onAddNode: handleNodeAdd,
      onUngroup: handleUngroup,
    },
    setNodes,
    setEdges,
    setProjectName,
    setLanguage,
    setMode,
    setHistory,
    setImportStatus,
    setImportMessage,
    fileInputRef,
    onImportSuccess: () => {
      setCurrentRecordId(null);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setToolPanelRequest(null);
      setShowStartDialog(false);
    },
  });

  const handleLoadProjectFileWithAiReset = useCallback((file: File) => {
    abortAiBeforeCanvasSwitchRef.current();
    loadProjectFile(file);
  }, [loadProjectFile]);

  const handleLoadFileWithAiReset = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    abortAiBeforeCanvasSwitchRef.current();
    handleLoadFile(event);
  }, [handleLoadFile]);

  const displayNodes = useMemo(
    () => decorateNodesWithAiState(currentRecordId, nodes),
    [currentRecordId, decorateNodesWithAiState, nodes],
  );

  useEffect(() => {
    const isJsonFile = (file: File) => /\.json$/i.test(file.name) || /^(application|text)\/json$/i.test(file.type);

    const hasJsonFileCandidate = (transfer: DataTransfer) => {
      const itemFiles = Array.from(transfer.items || [])
        .filter((item) => item.kind === 'file')
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);

      if (itemFiles.length > 0) {
        return itemFiles.some(isJsonFile);
      }

      const transferFiles = Array.from(transfer.files || []);
      return transferFiles.some(isJsonFile);
    };

    const isProjectFileDrag = (transfer: DataTransfer | null) => {
      if (!transfer) return false;
      const types = Array.from(transfer.types || []);
      // React Flow internal drags have 'application/reactflow' set — those are NOT project file imports.
      const hasFiles = types.includes('Files');
      const isReactFlowDrag = types.includes('application/reactflow');
      return hasFiles && !isReactFlowDrag && hasJsonFileCandidate(transfer);
    };

    const resetFileDragState = () => {
      fileDragDepthRef.current = 0;
      setIsFileDragActive(false);
    };

    const handleDragEnter = (event: DragEvent) => {
      if (!isProjectFileDrag(event.dataTransfer)) return;
      event.preventDefault();
      fileDragDepthRef.current += 1;
      setIsFileDragActive(true);
    };

    const handleDragOver = (event: DragEvent) => {
      if (!isProjectFileDrag(event.dataTransfer)) return;
      event.preventDefault();
    };

    const handleDragLeave = (event: DragEvent) => {
      if (!isProjectFileDrag(event.dataTransfer)) return;
      event.preventDefault();
      fileDragDepthRef.current = Math.max(0, fileDragDepthRef.current - 1);
      if (fileDragDepthRef.current === 0) {
        setIsFileDragActive(false);
      }
    };

    const handleDrop = (event: DragEvent) => {
      const transfer = event.dataTransfer;
      if (!transfer) return;

      const types = Array.from(transfer.types || []);
      const hasFiles = types.includes('Files');
      const isReactFlowDrag = types.includes('application/reactflow');
      if (!hasFiles || isReactFlowDrag) return;

      const droppedFiles = Array.from(transfer.files || []);
      const file = droppedFiles.find(isJsonFile);
      if (!file) return;

      event.preventDefault();
      resetFileDragState();
      handleLoadProjectFileWithAiReset(file);
    };

    window.addEventListener('dragenter', handleDragEnter, true);
    window.addEventListener('dragover', handleDragOver, true);
    window.addEventListener('dragleave', handleDragLeave, true);
    window.addEventListener('drop', handleDrop, true);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter, true);
      window.removeEventListener('dragover', handleDragOver, true);
      window.removeEventListener('dragleave', handleDragLeave, true);
      window.removeEventListener('drop', handleDrop, true);
    };
  }, [handleLoadProjectFileWithAiReset]);

  const {
    isLoading: isPlanLoading,
    handleAbort: handleAbortPlanGeneration,
    handleGenerate,
  } = useAiOrchestration({
    nodes,
    edges,
    projectName,
    language,
    mode,
    provider: activeProvider,
    defaultPathType,
    connectionMode,
    prompt,
    selectedPrompt,
    decomposePrompt,
    selectedNodeId,
    setNodes,
    setEdges,
    setProjectName,
    setSuggestion,
    setShowDecomposeInput,
    takeSnapshot,
    showStatus,
    hydrateTaskData,
    onStreamingChange: setStreamingContent,
    onPlanRequestSettled: ({ status }) => setPlanGenerationOutcome(status),
    onViewportRequest: ({ scope, nodeIds }) => {
      setPendingAiViewportRequest({
        nonce: Date.now(),
        scope,
        nodeIds,
      });
    },
  });

  const stopAiBeforeCanvasSwitch = useCallback(() => {
    handleAbortPlanGeneration();
    resetPlanGenerationUi();
  }, [handleAbortPlanGeneration, resetPlanGenerationUi]);

  useEffect(() => {
    abortAiBeforeCanvasSwitchRef.current = stopAiBeforeCanvasSwitch;
  }, [stopAiBeforeCanvasSwitch]);

  const handleGenerateWithRecord = useCallback(() => {
    if (!prompt.trim()) return;
    const hasCanvasContent = nodes.length > 0 || edges.length > 0;
    const shouldReserveRecordSlot = Boolean(currentRecordIdRef.current) || hasCanvasContent;
    const recordId = shouldReserveRecordSlot ? ensureCurrentRecord() : null;
    // 关闭对话框（触发 AnimatePresence exit 动画）
    setShowStartDialog(false);
    // 立即显示 AI 生成卡片
    setIsGeneratingPlanCompleting(false);
    setGeneratingRecordId(recordId);
    setStreamingContent('');
    setIsGeneratingPlan(true);
    setHideGeneratingRecord(true);
    setPlanGenerationOutcome('running');
    // 开始 AI 生成
    handleGenerate();
  }, [prompt, nodes.length, edges.length, ensureCurrentRecord, handleGenerate]);

  const handlePrepareGenerate = useCallback(() => {
    const hasCanvasContent = nodes.length > 0 || edges.length > 0;
    if (currentRecordIdRef.current || hasCanvasContent) {
      ensureCurrentRecord();
    }
  }, [nodes.length, edges.length, ensureCurrentRecord]);

  const handleSingleNodeAiAction = useCallback(() => {
    const selectedNode = nodes.find((node) => node.id === selectedNodeId);
    if (!selectedNode) return;

    if (selectedNode.type === 'group') {
      handleGenerateGroupTasks();
      return;
    }

    handleOptimizeSelectedNode();
  }, [nodes, selectedNodeId, handleGenerateGroupTasks, handleOptimizeSelectedNode]);

  const {
    alignNodes,
    distributeNodes,
    autoLayoutSelected,
  } = useCanvasLayoutActions({
    nodes,
    edges,
    language,
    mode,
    setNodes,
    takeSnapshot,
    showStatus,
  });

  useEffect(() => {
    if (isPlanLoading || !isGeneratingPlan) return;

    if (planGenerationOutcome === 'success') {
      // AI 生成刚完成：绿光扫过 -> 淡出 -> 新记录显现
      // 立即保存一次，确保记录卡片显现时就是最新标题/内容，而不是等待自动保存节流。
      saveToLocal();
      setIsGeneratingPlanCompleting(true);
      const timeoutId = setTimeout(() => {
        resetPlanGenerationUi();
      }, 1150);
      return () => {
        clearTimeout(timeoutId);
      };
    }

    if (planGenerationOutcome === 'aborted' || planGenerationOutcome === 'error') {
      const timeoutId = setTimeout(() => {
        resetPlanGenerationUi();
      }, 120);
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [isPlanLoading, isGeneratingPlan, planGenerationOutcome, resetPlanGenerationUi, saveToLocal]);

  useEffect(() => {
    if (!pendingAiViewportRequest) return;

    if (nodes.length === 0) return;

    const targetIds = pendingAiViewportRequest.nodeIds?.filter((id, index, array) => array.indexOf(id) === index) ?? [];
    if (pendingAiViewportRequest.scope === 'nodes' && targetIds.length > 0) {
      const availableIds = new Set(nodes.map((node) => node.id));
      if (targetIds.some((id) => !availableIds.has(id))) return;
    }

    let firstFrame = 0;
    let secondFrame = 0;

    const runFitView = () => {
      secondFrame = window.requestAnimationFrame(() => {
        const fitOptions = pendingAiViewportRequest.scope === 'nodes' && targetIds.length > 0
          ? {
              nodes: targetIds.map((id) => ({ id })),
              duration: 560,
              padding: 0.28,
              minZoom: 0.38,
              maxZoom: 1.05,
            }
          : {
              duration: 620,
              padding: 0.24,
              minZoom: 0.32,
              maxZoom: 1.02,
            };

        void fitView(fitOptions);
        setPendingAiViewportRequest((current) => (
          current?.nonce === pendingAiViewportRequest.nonce ? null : current
        ));
      });
    };

    firstFrame = window.requestAnimationFrame(runFitView);

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [fitView, nodes, pendingAiViewportRequest]);

  const getDefaultExportFileName = useCallback(
    () => projectName.replace(/\.(json|zip|txt)$/i, '').trim() || 'YesFlow Project',
    [projectName],
  );

  const handleApplyDefaultPathType = useCallback((type: string) => {
    setDefaultPathType(type);
    handleApplyPathTypeToAll(type);
  }, [handleApplyPathTypeToAll]);

  const handleApplyConnectionMode = useCallback((mode: ConnectionMode) => {
    setConnectionMode(mode);
    handleApplyConnectionModeToAll(mode);
  }, [handleApplyConnectionModeToAll]);

  const handleOpenExportFileModal = useCallback(() => {
    setExportFileName(getDefaultExportFileName());
    setIsExportFileModalOpen(true);
  }, [getDefaultExportFileName]);

  const handleConfirmExportFile = useCallback(() => {
    exportProjectFile(exportFileName);
    setIsExportFileModalOpen(false);
    showStatus(language === 'zh' ? '已开始导出' : 'Export started', <Save className="w-3.5 h-3.5" />);
  }, [exportProjectFile, exportFileName, showStatus, language]);

  const {
    activeKeys,
    activeKeysRef,
    isLmbActive,
    setIsLmbActive,
  } = useCanvasHotkeys({
    nodes,
    edges,
    settings,
    language,
    fileInputRef,
    handleUndo,
    handleRedo,
    handleCopy,
    handlePaste,
    handleCut,
    handleSaveToLocal,
    handleSaveFile: handleOpenExportFileModal,
    handleGroupSelection,
    handleUngroup,
    deleteNodesAndReconnect,
    showStatus,
    takeSnapshot,
    setEdges,
  });
  const {
    selectionBox,
    handleSelectionChange,
    handleSelectionStart,
    handleSelectionEnd,
    handleNodeDragStart,
    handleNodeDragStop,
    handlePaneMouseDown,
  } = useCanvasSelection({
    store,
    screenToFlowPosition,
    setNodes,
    activeKeysRef,
    setIsLmbActive,
  });

  const handleJumpToNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    fitView({ nodes: [{ id: nodeId }], duration: 800 });
  }, [fitView]);

  const handleFlowNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
    setToolPanelRequest(null);
    setIsSidebarOpen(true);
    setNodeClickRevealNonce((current) => current + 1);
  }, []);

  const handleFlowEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
    setToolPanelRequest(null);
    setIsSidebarOpen(true);
  }, []);

  const handleFlowPaneClick = useCallback(() => {
    setNodes((currentNodes) => {
      if (!currentNodes.some((node) => node.selected)) {
        return currentNodes;
      }
      return currentNodes.map((node) => (
        node.selected ? { ...node, selected: false } : node
      ));
    });
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setToolPanelRequest(null);
  }, [setNodes]);

  const handleFlowNodeDragStop = useCallback((event: unknown, node: Node) => {
    handleNodeDragStop();
    onNodeDragStop(event, node);
  }, [handleNodeDragStop, onNodeDragStop]);

  const selectedNode = displayNodes.find(n => n.id === selectedNodeId);
  const selectedEdge = edges.find(e => e.id === selectedEdgeId);
  const selectedNodes = displayNodes.filter(n => n.selected);
  const selectedNodeIds = selectedNodes.map((node) => node.id);
  const isSelectedNodeAiLoading = Boolean(selectedNodeId) && isRecordTaskRunning(currentRecordId, selectedNodeId ? [selectedNodeId] : []);
  const isSelectedBatchAiLoading = selectedNodeIds.length > 0 && isRecordTaskRunning(currentRecordId, selectedNodeIds);
  const handleAbortSelectedNodeAi = useCallback(() => {
    if (!currentRecordId || selectedNodeIds.length === 0) return;
    abortTasksForRecordNodes(currentRecordId, selectedNodeIds);
  }, [abortTasksForRecordNodes, currentRecordId, selectedNodeIds]);
  const handleGeneratingCardAnchorRectChange = useCallback((nextRect: ViewportRect | null) => {
    setGeneratingCardTargetRect((currentRect) => {
      if (
        currentRect?.x === nextRect?.x &&
        currentRect?.y === nextRect?.y &&
        currentRect?.width === nextRect?.width &&
        currentRect?.height === nextRect?.height
      ) {
        return currentRect;
      }
      return nextRect;
    });
  }, []);
  const activeEdges = useEdgeHighlighting({
    nodes: displayNodes,
    edges,
    edgeColor: settings.visuals.edgeColor,
    edgeSelectedColor: settings.visuals.edgeSelectedColor,
  });
  const { interactionConfig, isSelectActive, isPanActive } = useCanvasInteractionConfig({
    panHotkey: settings.hotkeys.pan,
    selectHotkey: settings.hotkeys.select,
    activeKeys,
    isLmbActive,
  });

  return (
    <AppErrorBoundary>
      <div className={`app-shell theme-${settings.themeMode} relative h-screen w-full bg-neutral-50 overflow-hidden font-sans`}>
      <AnimatePresence>
        {isFileDragActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-4 z-[160] rounded-[2rem] border-2 border-dashed border-primary/30 bg-white/70 backdrop-blur-xl"
          >
            <div className="flex h-full items-center justify-center">
              <div className="rounded-[1.75rem] border border-primary/15 bg-white/92 px-8 py-6 text-center shadow-[0_32px_90px_-40px_rgba(37,99,235,0.45)]">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">
                  {language === 'zh' ? '拖入导入' : 'Drop To Import'}
                </div>
                <div className="mt-3 text-2xl font-black text-neutral-900">
                  {language === 'zh' ? '松开即可打开项目文件' : 'Release to open the project file'}
                </div>
                <div className="mt-2 text-sm text-neutral-500">
                  {language === 'zh' ? '支持拖入 YesFlow 导出的 JSON 文件' : 'Supports YesFlow JSON export files'}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Floating Sidebar Container --- */}
      <div className="absolute inset-y-0 left-0 z-40 pointer-events-none flex flex-row items-stretch">
        <motion.aside 
          initial={false} 
          animate={{ width: isSidebarOpen ? 380 : 0 }} 
          className="flex flex-col bg-white border-r border-neutral-200 shadow-2xl overflow-hidden h-full pointer-events-auto"
        >
          <Suspense fallback={null}>
            <SidebarPanel
              language={language}
              themeMode={themeMode}
              isBatchAiLoading={isSelectedBatchAiLoading}
              hasApiKey={hasApiKey}
              activeProviderName={activeProviderName}
              settings={settings}
              selectedNode={selectedNode}
              selectedEdge={selectedEdge}
              selectedNodes={selectedNodes}
              selectedPrompt={selectedPrompt}
              localRecords={localRecords}
              currentRecordId={currentRecordId}
              nodes={displayNodes}
              edges={edges}
              mode={mode}
              onNewProject={handleCreateNewProject}
              onDeleteSelectedEdge={handleDeleteSelectedEdge}
              onUpdateSelectedEdgeLabel={handleUpdateSelectedEdgeLabel}
              onUpdateSelectedEdgeColor={handleUpdateSelectedEdgeColor}
              onDeleteSelectedNode={handleDeleteNodeLocal}
              onUpdateNodeData={handleUpdateNodeData}
              onStatusChange={handleStatusChange}
              onJumpToNode={handleJumpToNode}
              onSelectedPromptChange={setSelectedPrompt}
              onModifySelected={handleModifySelected}
              onAbortSelectedAi={handleAbortSelectedNodeAi}
              onAbortPlanGeneration={handleAbortPlanGeneration}
              onLoadRecord={handleLoadFromLocal}
              onDeleteRecord={handleDeleteRecord}
              onReorderRecords={reorderRecords}
              onSelectProvider={handleSelectProvider}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onToggleTheme={toggleTheme}
              onToggleLanguage={toggleLanguage}
              isGeneratingPlan={isGeneratingPlan}
              isGeneratingPlanCompleting={isGeneratingPlanCompleting}
              generatingRecordId={generatingRecordId}
              streamingContent={streamingContent}
              hideGeneratingRecord={hideGeneratingRecord}
              onGeneratingCardAnchorRectChange={showStartDialog ? handleGeneratingCardAnchorRectChange : undefined}
              recordAiStates={recordAiStates}
            />
          </Suspense>
        </motion.aside>
        <SidebarToggle
          isSidebarOpen={isSidebarOpen}
          language={language}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        />
      </div>

      <div className="absolute inset-y-0 right-0 z-40 pointer-events-none flex flex-row items-stretch">
        <Suspense fallback={null}>
          <RightToolSidebar
            language={language}
            settings={settings}
            selectedNode={selectedNode}
            nodeClickRevealNonce={nodeClickRevealNonce}
            toolPanelRequest={toolPanelRequest}
            nodes={displayNodes}
            edges={edges}
            onUpdateNodeData={handleUpdateNodeData}
            onPanelWidthChange={(width) => {
              setSettings((current) => ({
                ...current,
                nodeTools: {
                  ...current.nodeTools,
                  panelWidth: width,
                },
              }));
            }}
            onCalendarCollapsedChange={(collapsed) => {
              setSettings((current) => ({
                ...current,
                nodeTools: {
                  ...current.nodeTools,
                  calendar: {
                    ...current.nodeTools.calendar,
                    collapsed,
                  },
                },
              }));
            }}
            onToggleVisibility={(visible) => {
              setSettings((current) => ({
                ...current,
                nodeTools: {
                  ...current.nodeTools,
                  enabled: visible,
                },
              }));
            }}
            onJumpToNode={handleJumpToNode}
          />
        </Suspense>
      </div>

      <NodeSettingsContext.Provider value={useMemo(() => ({
        completedStyle: settings.completedStyle || 'logo',
        visuals: settings.visuals,
        themeMode: settings.themeMode,
        nodeTools: settings.nodeTools,
        mode,
      }), [settings.completedStyle, settings.visuals, settings.themeMode, settings.nodeTools, mode])}>
        <FlowCanvas
          selectionBox={selectionBox}
          transform={store.getState().transform}
          nodes={displayNodes}
          activeEdges={activeEdges}
          helperLines={helperLines}
          mode={mode}
          themeMode={settings.themeMode}
          showCanvasGrid={settings.interaction.showCanvasGrid}
          edgeColor={settings.visuals.edgeColor}
          onMouseDown={handlePaneMouseDown}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          onNodeClick={handleFlowNodeClick}
          onEdgeClick={handleFlowEdgeClick}
          onPaneClick={handleFlowPaneClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          selectionKeyCode={interactionConfig.selectionKeyCode}
          panOnDrag={interactionConfig.panOnDrag}
          panActivationKeyCode={interactionConfig.panActivationKeyCode}
          onSelectionChange={handleSelectionChange}
          onSelectionStart={handleSelectionStart}
          onSelectionEnd={handleSelectionEnd}
          onNodeDragStart={handleNodeDragStart}
          onNodeDrag={onNodeDrag}
          onNodeDragStop={handleFlowNodeDragStop}
          currentProjectLabel={t.currentProject}
          projectName={projectName}
          onProjectNameChange={setProjectName}
          canUndo={history.past.length > 0}
          canRedo={history.future.length > 0}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onSaveToLocal={handleSaveToLocal}
          onSaveFile={handleOpenExportFileModal}
          onOpenFile={() => fileInputRef.current?.click()}
          onModeChange={setMode}
          defaultPathType={defaultPathType}
          onApplyPathTypeToAll={handleApplyDefaultPathType}
          connectionMode={connectionMode}
          onApplyConnectionMode={handleApplyConnectionMode}
          onToggleCanvasGrid={() => setSettings((current) => ({
            ...current,
            interaction: {
              ...current.interaction,
              showCanvasGrid: !current.interaction.showCanvasGrid,
            },
          }))}
          language={language}
          nodePresets={settings.nodePresets}
          onAddPresetNode={handleAddPresetNode}
          onAddNodeLocal={handleAddNodeLocal}
          onToggleTheme={() => handleUpdateSettings({ ...settings, themeMode: settings.themeMode === 'dark' ? 'light' : 'dark' })}
          onToggleLanguage={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
        />

        <ContextualToolbar
          selectedNodes={selectedNodes}
          language={language}
          showDecomposeInput={showDecomposeInput}
          decomposePrompt={decomposePrompt}
          onDecomposePromptChange={setDecomposePrompt}
          onToggleDecompose={() => setShowDecomposeInput(!showDecomposeInput)}
          onRunDecompose={() => { handleDecompose(); setShowDecomposeInput(false); }}
          isNodeAiLoading={isSelectedNodeAiLoading}
          onGroup={handleGroupSelection}
          onUngroup={handleUngroup}
          onExitSelectedFromGroup={handleExitSelectedFromGroup}
          onGenerateGroupTasks={handleSingleNodeAiAction}
          onDeleteSelectedSingle={handleDeleteNodeLocal}
          onAlignNodes={alignNodes}
          onDistributeNodes={distributeNodes}
          onAutoLayoutSelected={autoLayoutSelected}
          selectedPrompt={selectedPrompt}
          onSelectedPromptChange={setSelectedPrompt}
          onModifySelected={handleModifySelected}
          isLoading={isSelectedBatchAiLoading}
          onDeleteSelectedMany={() => deleteNodesAndReconnect(selectedNodes.map(n => n.id))}
          onAbort={handleAbortSelectedNodeAi}
        />

        <StatusIndicators
          isSidebarOpen={isSidebarOpen}
          language={language}
          settings={{ hotkeys: settings.hotkeys }}
          activeKeys={activeKeys}
          isPanActive={isPanActive}
          isSelectActive={isSelectActive}
          statusNote={statusNote}
          importStatus={importStatus}
          importMessage={importMessage}
          onDismissImport={() => setImportStatus('idle')}
        />

        <input type="file" ref={fileInputRef} onChange={handleLoadFileWithAiReset} accept=".json,application/json" style={{ display: 'none' }} />
      </NodeSettingsContext.Provider>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <Suspense fallback={null}>
            <SettingsModal 
              settings={settings} 
              language={language}
              onClose={() => setIsSettingsOpen(false)} 
              onUpdate={handleUpdateSettings}
              onToggleLanguage={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
            />
          </Suspense>
        )}
      </AnimatePresence>

      <Suspense fallback={null}>
        <StartDialog
          visible={showStartDialog}
          language={language}
          mode={mode}
          prompt={prompt}
          isLoading={isPlanLoading}
          title={t.startQuestion}
          placeholder={t.placeholderEmpty}
          dailyModeLabel={t.dailyMode}
          professionalModeLabel={t.professionalMode}
          generateLabel={t.generateButton}
          manualModeLabel={t.manualMode}
          onModeChange={setMode}
          onPromptChange={setPrompt}
          onPrepareGenerate={handlePrepareGenerate}
          targetRecordRect={generatingCardTargetRect}
          onGenerate={handleGenerateWithRecord}
          onAbort={handleAbortPlanGeneration}
          onManualStart={handleStartManually}
          onDismiss={handleDismissStartDialog}
        />
      </Suspense>

      <Suspense fallback={null}>
        <ExportFileModal
          visible={isExportFileModalOpen}
          language={language}
          fileName={exportFileName}
          onFileNameChange={setExportFileName}
          onConfirm={handleConfirmExportFile}
          onClose={() => setIsExportFileModalOpen(false)}
        />
      </Suspense>

      <Suspense fallback={null}>
        <ConfigModal
          visible={isConfigModalOpen}
          language={language}
          settings={settings}
          onUpdateSettings={setSettings}
          onClose={() => setIsConfigModalOpen(false)}
          onSkip={() => { setIsConfigModalOpen(false); setShowStartDialog(false); }}
        />
      </Suspense>
      </div>
    </AppErrorBoundary>
  );
}
