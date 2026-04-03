/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useCallback, useState, useEffect } from 'react';
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

import SidebarPanel from './components/SidebarPanel';
import RightToolSidebar from './components/RightToolSidebar';
import SidebarToggle from './components/SidebarToggle';
import StartDialog from './components/StartDialog';
import StatusIndicators from './components/StatusIndicators';
import ContextualToolbar from './components/ContextualToolbar';
import FlowCanvas from './components/FlowCanvas';
import ConfigModal from './components/ConfigModal';
import ExportFileModal from './components/ExportFileModal';
import { getHelperLines, type HelperLines as HelperLinesType } from './utils/helperLineUtils';
import { getNodeAbsolutePosition } from './utils/nodeUtils';
import { createHistory, pushToHistory } from './utils/historyUtils';
import { ensureToolState } from './utils/nodeTools';
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

import '@xyflow/react/dist/style.css';

const SettingsModal = lazy(() => import('./components/SettingsModal'));

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
  const [generatingRecordId, setGeneratingRecordId] = useState<string | null>(null);
  const [generatingCardTargetRect, setGeneratingCardTargetRect] = useState<ViewportRect | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [hideGeneratingRecord, setHideGeneratingRecord] = useState(false);
  const [isExportFileModalOpen, setIsExportFileModalOpen] = useState(false);
  const [exportFileName, setExportFileName] = useState('YesFlow Project');
  const [clipboard, setClipboard] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const { settings, setSettings } = useAppSettings();
  const themeMode = settings.themeMode;
  const activeProvider = settings.apiConfig.providers.find(p => p.id === settings.apiConfig.activeProviderId) || settings.apiConfig.providers[0];
  const hasApiKey = Boolean(activeProvider?.apiKey);
  const activeProviderName = activeProvider?.name || 'MiniMax';

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
  } = useProjectRecords({
    nodes,
    edges,
    projectName,
    language,
    mode,
  });

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
      x: sourceNode.position.x + (position === 'right' ? 300 : position === 'left' ? -300 : 0), 
      y: sourceNode.position.y + (position === 'bottom' ? 180 : position === 'top' ? -180 : 0) 
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
      const next = nds.map(n => ({ ...n, selected: false })).concat(newNode);
      setEdges(eds => { const nextEds = [...eds, newEdge]; takeSnapshot(next, nextEds); return nextEds; });
      return next;
    });
    setSelectedNodeId(newNodeId);
  }, [getNodes, language, handleStatusChange, handleUpdateNodeData, defaultPathType, connectionMode, takeSnapshot, setNodes, setEdges]);

  const hydrateTaskData = useCallback((data: Partial<TaskData>) => ({
    ...data,
    language,
    onStatusChange: handleStatusChange,
    onUpdateData: handleUpdateNodeData,
    onOpenToolPanel: handleOpenNodeToolPanel,
    onAddNode: (event: React.MouseEvent, id: string, position: 'top' | 'bottom' | 'left' | 'right') => handleNodeAdd(event, id, position),
  } as TaskData), [language, handleStatusChange, handleUpdateNodeData, handleOpenNodeToolPanel, handleNodeAdd]);

  const handleSaveToLocal = useCallback(() => {
    saveToLocal();
    setImportStatus('success');
    setImportMessage(language === 'zh' ? '已存至记录' : 'Saved to records');
    setTimeout(() => setImportStatus('idle'), 3000);
  }, [language, saveToLocal]);

  const ensureCurrentRecord = useCallback(() => {
    if (currentRecordId) return currentRecordId;

    return createRecord({
      name: projectName || 'YesFlow Project',
      nodes,
      edges,
      language,
      mode,
    }).id;
  }, [currentRecordId, createRecord, projectName, nodes, edges, language, mode]);

  const handleLoadFromLocal = useCallback((record: ProjectRecord) => {
    const hydratedNodes = record.nodes.map((n: Node) => ({
      ...n,
      data: {
        ...n.data,
        language: record.language || language,
        onStatusChange: handleStatusChange,
        onUpdateData: handleUpdateNodeData,
        onOpenToolPanel: handleOpenNodeToolPanel,
        onAddNode: (e: any, id: string, pos: any) => handleNodeAdd(e, id, pos),
        onUngroup: n.type === 'group' ? (id: string) => handleUngroup(id) : (n.data as any)?.onUngroup,
      }
    }));
    
    const finalNodeIds = hydratedNodes.map((n: Node) => n.id);
    const finalEdges = record.edges.filter(e => finalNodeIds.includes(e.source) && finalNodeIds.includes(e.target));

    setNodes(hydratedNodes); 
    setEdges(finalEdges); 
    setProjectName(record.name);
    setLanguage(record.language); setMode(record.mode); setCurrentRecordId(record.id);
    setHistory(createHistory({ nodes: hydratedNodes, edges: finalEdges }));
    setShowStartDialog(false);
    setSelectedNodeId(null); setSelectedEdgeId(null);
    setImportStatus('success'); setImportMessage(language === 'zh' ? `已载入: ${record.name}` : `Loaded: ${record.name}`);
    setTimeout(() => { setImportStatus('idle'); }, 3000);
  }, [language, handleStatusChange, handleUpdateNodeData, handleOpenNodeToolPanel, handleNodeAdd, setNodes, setEdges, setLanguage, setMode, setProjectName, setHistory, setShowStartDialog, setCurrentRecordId]);

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

  const handleCreateNewProject = useCallback(() => {
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

    handleNewProject();
  }, [currentRecordId, localRecords, deleteRecord, handleLoadFromLocal, handleNewProject]);

  const handleStartManually = useCallback(() => {
    ensureCurrentRecord();
    setShowStartDialog(false);
  }, [ensureCurrentRecord]);

  const { saveFile: exportProjectFile, loadFile: handleLoadFile } = useProjectFileIO({
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
  });

  const {
    isLoading,
    isNodeAiLoading,
    handleAbort,
    handleGenerate,
    handleModify,
    handleDecompose,
    handleModifySelected,
    handleGenerateGroupTasks,
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
  });

  const handleGenerateWithRecord = useCallback(() => {
    if (!prompt.trim()) return;
    const recordId = ensureCurrentRecord();
    // 关闭对话框（触发 AnimatePresence exit 动画）
    setShowStartDialog(false);
    // 立即显示 AI 生成卡片
    setIsGeneratingPlanCompleting(false);
    setGeneratingRecordId(recordId);
    setStreamingContent('');
    setIsGeneratingPlan(true);
    setHideGeneratingRecord(true);
    // 开始 AI 生成
    handleGenerate();
  }, [prompt, ensureCurrentRecord, handleGenerate]);

  const handlePrepareGenerate = useCallback(() => {
    ensureCurrentRecord();
  }, [ensureCurrentRecord]);

  const {
    alignNodes,
    distributeNodes,
    autoLayoutSelected,
  } = useCanvasLayoutActions({
    nodes,
    edges,
    language,
    setNodes,
    takeSnapshot,
    showStatus,
  });

  // 监听 AI 生成完成（包括中止），清理生成中状态
  // 关键：只在 isLoading 从 true 变为 false 时触发清理
  const wasLoadingRef = React.useRef(false);
  useEffect(() => {
    if (wasLoadingRef.current && !isLoading && isGeneratingPlan) {
      // AI 生成刚完成：绿光扫过 -> 淡出 -> 新记录显现
      // 立即保存一次，确保记录卡片显现时就是最新标题/内容，而不是等待自动保存节流。
      saveToLocal();
      setIsGeneratingPlanCompleting(true);
      const timeoutId = setTimeout(() => {
        setIsGeneratingPlan(false);
        setIsGeneratingPlanCompleting(false);
        setStreamingContent(''); // 清理流式内容
        setHideGeneratingRecord(false);
        setGeneratingRecordId(null);
      }, 1150);
      return () => {
        clearTimeout(timeoutId);
      };
    }
    wasLoadingRef.current = isLoading;
  }, [isLoading, isGeneratingPlan, saveToLocal]);

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

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const selectedEdge = edges.find(e => e.id === selectedEdgeId);
  const selectedNodes = nodes.filter(n => n.selected);
  const activeEdges = useEdgeHighlighting({
    nodes,
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
    <div className={`app-shell theme-${settings.themeMode} relative h-screen w-full bg-neutral-50 overflow-hidden font-sans`}>
      {/* --- Floating Sidebar Container --- */}
      <div className="absolute inset-y-0 left-0 z-40 pointer-events-none flex flex-row items-stretch">
        <motion.aside 
          initial={false} 
          animate={{ width: isSidebarOpen ? 380 : 0 }} 
          className="flex flex-col bg-white border-r border-neutral-200 shadow-2xl overflow-hidden h-full pointer-events-auto"
        >
          <SidebarPanel
            language={language}
            themeMode={themeMode}
            isLoading={isLoading}
            hasApiKey={hasApiKey}
            activeProviderName={activeProviderName}
            settings={settings}
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            selectedNodes={selectedNodes}
            selectedPrompt={selectedPrompt}
            localRecords={localRecords}
            currentRecordId={currentRecordId}
            nodes={nodes}
            edges={edges}
            onNewProject={handleCreateNewProject}
            onDeleteSelectedEdge={handleDeleteSelectedEdge}
            onUpdateSelectedEdgeLabel={handleUpdateSelectedEdgeLabel}
            onUpdateSelectedEdgeColor={handleUpdateSelectedEdgeColor}
            onDeleteSelectedNode={handleDeleteNodeLocal}
            onUpdateNodeData={handleUpdateNodeData}
            onStatusChange={handleStatusChange}
            onJumpToNode={(nodeId) => {
              setSelectedNodeId(nodeId);
              fitView({ nodes: [{ id: nodeId }], duration: 800 });
            }}
            onSelectedPromptChange={setSelectedPrompt}
            onModifySelected={handleModifySelected}
            onAbort={handleAbort}
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
            onGeneratingCardAnchorRectChange={setGeneratingCardTargetRect}
          />
        </motion.aside>
        <SidebarToggle
          isSidebarOpen={isSidebarOpen}
          language={language}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        />
      </div>

      <div className="absolute inset-y-0 right-0 z-40 pointer-events-none flex flex-row items-stretch">
        <RightToolSidebar
          language={language}
          settings={settings}
          selectedNode={selectedNode}
          nodeClickRevealNonce={nodeClickRevealNonce}
          toolPanelRequest={toolPanelRequest}
          nodes={nodes}
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
          onJumpToNode={(nodeId) => {
            setSelectedNodeId(nodeId);
            fitView({ nodes: [{ id: nodeId }], duration: 800 });
          }}
        />
      </div>

      <NodeSettingsContext.Provider value={{ 
        completedStyle: settings.completedStyle || 'logo',
        visuals: settings.visuals,
        themeMode: settings.themeMode,
        nodeTools: settings.nodeTools,
      }}>
        <FlowCanvas
          selectionBox={selectionBox}
          transform={store.getState().transform}
          nodes={nodes}
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
          onNodeClick={(_, node) => {
            setSelectedNodeId(node.id);
            setSelectedEdgeId(null);
            setToolPanelRequest(null);
            setIsSidebarOpen(true);
            setNodeClickRevealNonce((current) => current + 1);
          }}
          onEdgeClick={(_, edge) => {
            setSelectedEdgeId(edge.id);
            setSelectedNodeId(null);
            setToolPanelRequest(null);
            setIsSidebarOpen(true);
          }}
          onPaneClick={() => {
            setNodes((currentNodes) => currentNodes.map((node) => ({ ...node, selected: false })));
            setSelectedNodeId(null);
            setSelectedEdgeId(null);
            setToolPanelRequest(null);
          }}
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
          onNodeDragStop={(event, node) => {
            handleNodeDragStop();
            onNodeDragStop(event, node);
          }}
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
          isNodeAiLoading={isNodeAiLoading}
          onGroup={handleGroupSelection}
          onUngroup={handleUngroup}
          onExitSelectedFromGroup={handleExitSelectedFromGroup}
          onGenerateGroupTasks={handleGenerateGroupTasks}
          onDeleteSelectedSingle={handleDeleteNodeLocal}
          onAlignNodes={alignNodes}
          onDistributeNodes={distributeNodes}
          onAutoLayoutSelected={autoLayoutSelected}
          selectedPrompt={selectedPrompt}
          onSelectedPromptChange={setSelectedPrompt}
          onModifySelected={handleModifySelected}
          isLoading={isLoading}
          onDeleteSelectedMany={() => deleteNodesAndReconnect(selectedNodes.map(n => n.id))}
          onAbort={handleAbort}
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

        <input type="file" ref={fileInputRef} onChange={handleLoadFile} accept=".json,application/json" style={{ display: 'none' }} />
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

      <StartDialog
        visible={showStartDialog}
        language={language}
        mode={mode}
        prompt={prompt}
        isLoading={isLoading}
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
        onAbort={handleAbort}
        onClose={handleStartManually}
      />

      <ExportFileModal
        visible={isExportFileModalOpen}
        language={language}
        fileName={exportFileName}
        onFileNameChange={setExportFileName}
        onConfirm={handleConfirmExportFile}
        onClose={() => setIsExportFileModalOpen(false)}
      />

      <ConfigModal
        visible={isConfigModalOpen}
        language={language}
        settings={settings}
        onUpdateSettings={setSettings}
        onClose={() => setIsConfigModalOpen(false)}
        onSkip={() => { setIsConfigModalOpen(false); setShowStartDialog(false); }}
      />
    </div>
  );
}
