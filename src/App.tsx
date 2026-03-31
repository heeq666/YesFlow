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
import SidebarToggle from './components/SidebarToggle';
import StartDialog from './components/StartDialog';
import StatusIndicators from './components/StatusIndicators';
import ContextualToolbar from './components/ContextualToolbar';
import FlowCanvas from './components/FlowCanvas';
import { getHelperLines, type HelperLines as HelperLinesType } from './utils/helperLineUtils';
import { getNodeAbsolutePosition } from './utils/nodeUtils';
import { createHistory, pushToHistory } from './utils/historyUtils';
import { type NodeStatus, type ProjectRecord, type TaskData, type TaskMode, type Settings, type NodePreset } from './types';
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

export default function App() {
  const [helperLines, setHelperLines] = useState<HelperLinesType>({ horizontal: null, vertical: null });
  const { screenToFlowPosition, getIntersectingNodes, getNodes, getEdges, fitView } = useReactFlow();
  const store = useStoreApi();
  const [nodes, setNodes, onNodesChangeOriginal] = useNodesState<Node>([]);

  // 2. High-Precision Change Implementation with Alignment Snapping
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const positionChange = changes.find((c): c is NodePositionChange => c.type === 'position');
    
    if (positionChange?.dragging && positionChange.position) {
      const currentNodes = getNodes();
      const node = currentNodes.find((n) => n.id === positionChange.id);
      
      if (node) {
        // Calculate helper lines and snapped position (node-to-node alignment)
        const { snappedPosition, helperLines: lines } = getHelperLines(
          { ...node, position: positionChange.position },
          currentNodes
        );

        // Apply snapping to the change object
        positionChange.position = snappedPosition;
        setHelperLines(lines);
      }
    } else if (changes.some(c => c.type === 'dimensions' || c.type === 'select')) {
      // Clear lines if not dragging
      setHelperLines({ horizontal: null, vertical: null });
    }
    
    onNodesChangeOriginal(changes);
  }, [onNodesChangeOriginal, getNodes]);
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
  const [showDecomposeInput, setShowDecomposeInput] = useState(false);
  const [decomposePrompt, setDecomposePrompt] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState<string>('');
  const [showStartDialog, setShowStartDialog] = useState(true);
  const [clipboard, setClipboard] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { settings, setSettings } = useAppSettings();
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
    saveToLocal,
    deleteRecord,
  } = useProjectRecords({
    nodes,
    edges,
    projectName,
    language,
    mode,
  });

  const selectionStartNodes = React.useRef<string[]>([]);
  const updateNodeInternals = useUpdateNodeInternals();

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
      // Use current latest edges from ref or functional manner if needed, 
      // but here we use the latest nds to ensure snapshot is accurate.
      setHistory(prev => pushToHistory(prev, { nodes: next, edges: getEdges() }));
      return next;
    });
  }, [getEdges, setNodes]);

  const handleUpdateNodeData = useCallback((id: string, updates: Partial<TaskData>) => {
    setNodes((nds) => {
      const next = nds.map((node) => node.id === id ? { ...node, data: { ...node.data, ...updates } } : node);
      setHistory(prev => pushToHistory(prev, { nodes: next, edges: getEdges() }));
      return next;
    });
  }, [getEdges, setNodes]);

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
    const pos = { 
      x: sourceNode.position.x + (position === 'right' ? 300 : position === 'left' ? -300 : 0), 
      y: sourceNode.position.y + (position === 'bottom' ? 180 : position === 'top' ? -180 : 0) 
    };
    const newNode: Node = { 
      id: newNodeId, type: 'task', position: pos, selected: true,
      data: { label: '', description: '', type: 'execution', status: 'pending', language, onStatusChange: handleStatusChange, onUpdateData: handleUpdateNodeData, onAddNode: (e, id, p) => handleNodeAdd(e, id, p) } as TaskData 
    };
    const newEdge: Edge = { id: `edge-${sourceId}-${newNodeId}`, source: sourceId, target: newNodeId, type: 'floating', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' }, data: { pathType: defaultPathType } };
    setNodes(nds => {
      const next = nds.map(n => ({ ...n, selected: false })).concat(newNode);
      setEdges(eds => { const nextEds = [...eds, newEdge]; takeSnapshot(next, nextEds); return nextEds; });
      return next;
    });
    setSelectedNodeId(newNodeId);
  }, [getNodes, language, handleStatusChange, handleUpdateNodeData, defaultPathType, takeSnapshot, setNodes, setEdges]);

  const hydrateTaskData = useCallback((data: Partial<TaskData>) => ({
    ...data,
    language,
    onStatusChange: handleStatusChange,
    onUpdateData: handleUpdateNodeData,
    onAddNode: (event: React.MouseEvent, id: string, position: 'top' | 'bottom' | 'left' | 'right') => handleNodeAdd(event, id, position),
  } as TaskData), [language, handleStatusChange, handleUpdateNodeData, handleNodeAdd]);

  const handleSaveToLocal = useCallback(() => {
    saveToLocal();
    setImportStatus('success');
    setImportMessage(language === 'zh' ? '已存至记录' : 'Saved to records');
    setTimeout(() => setImportStatus('idle'), 3000);
  }, [language, saveToLocal]);

  const handleLoadFromLocal = useCallback((record: ProjectRecord) => {
    const hydratedNodes = record.nodes.map((n: Node) => ({
      ...n,
      data: {
        ...n.data,
        language: record.language || language,
        onStatusChange: handleStatusChange,
        onUpdateData: handleUpdateNodeData,
        onAddNode: (e: any, id: string, pos: any) => handleNodeAdd(e, id, pos),
      }
    }));
    
    // Topology Sanitization: Remove edges that point to non-existent nodes
    const finalNodeIds = hydratedNodes.map((n: Node) => n.id);
    const finalEdges = record.edges.filter(e => finalNodeIds.includes(e.source) && finalNodeIds.includes(e.target));

    setNodes(hydratedNodes); 
    setEdges(finalEdges); 
    setProjectName(record.name);
    setLanguage(record.language); setMode(record.mode); setCurrentRecordId(record.id);
    setHistory(createHistory({ nodes: hydratedNodes, edges: finalEdges }));
    setShowStartDialog(false);
    setSelectedNodeId(null); setSelectedEdgeId(null); // Clear selection on switch
    setImportStatus('success'); setImportMessage(language === 'zh' ? `已载入: ${record.name}` : `Loaded: ${record.name}`);
    setTimeout(() => { setImportStatus('idle'); }, 3000);
  }, [language, handleStatusChange, handleUpdateNodeData, handleNodeAdd, setNodes, setEdges, setLanguage, setMode, setProjectName, setHistory, setShowStartDialog]);

  const handleDeleteRecord = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteRecord(id);
  }, [deleteRecord]);

  const { saveFile: handleSaveFile, loadFile: handleLoadFile } = useProjectFileIO({
    nodes,
    edges,
    projectName,
    language,
    mode,
    hydrateNodeData: {
      language,
      onStatusChange: handleStatusChange,
      onUpdateData: handleUpdateNodeData,
      onAddNode: handleNodeAdd,
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
    handleCopy,
    handleCut,
    handlePaste,
    deleteNodesAndReconnect,
    handleDeleteNodeLocal,
    handleAddNodeLocal,
    handleNewProject,
    handleApplyPathTypeToAll,
    handleSetSelectedEdgesColor,
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
    setHelperLines,
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
    apiKey: settings.apiKey,
    defaultPathType,
    prompt,
    selectedPrompt,
    decomposePrompt,
    selectedNodeId,
    setNodes,
    setEdges,
    setProjectName,
    setSuggestion,
    setShowStartDialog,
    setShowDecomposeInput,
    takeSnapshot,
    showStatus,
    hydrateTaskData,
  });

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
    handleSaveFile,
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
    <div className="relative h-screen w-full bg-neutral-50 overflow-hidden font-sans">
      {/* --- Floating Sidebar Container --- */}
      <div className="absolute inset-y-0 left-0 z-40 pointer-events-none flex flex-row items-stretch">
        <motion.aside 
          initial={false} 
          animate={{ width: isSidebarOpen ? 380 : 0 }} 
          className="flex flex-col bg-white border-r border-neutral-200 shadow-2xl overflow-hidden h-full pointer-events-auto"
        >
          <SidebarPanel
            language={language}
            isLoading={isLoading}
            settings={settings}
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            selectedNodes={selectedNodes}
            selectedPrompt={selectedPrompt}
            localRecords={localRecords}
            currentRecordId={currentRecordId}
            nodes={nodes}
            edges={edges}
            onToggleLanguage={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
            onNewProject={handleNewProject}
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
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        </motion.aside>
        <SidebarToggle
          isSidebarOpen={isSidebarOpen}
          language={language}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        />
      </div>

      <NodeSettingsContext.Provider value={{ 
        completedStyle: settings.completedStyle || 'logo',
        visuals: settings.visuals
      }}>
        <FlowCanvas
          selectionBox={selectionBox}
          transform={store.getState().transform}
          nodes={nodes}
          activeEdges={activeEdges}
          helperLines={helperLines}
          mode={mode}
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
            setIsSidebarOpen(true);
          }}
          onEdgeClick={(_, edge) => {
            setSelectedEdgeId(edge.id);
            setSelectedNodeId(null);
            setIsSidebarOpen(true);
          }}
          onPaneClick={() => {
            setNodes((currentNodes) => currentNodes.map((node) => ({ ...node, selected: false })));
            setSelectedNodeId(null);
            setSelectedEdgeId(null);
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
          onNodeDragStop={handleNodeDragStop}
          currentProjectLabel={t.currentProject}
          projectName={projectName}
          onProjectNameChange={setProjectName}
          canUndo={history.past.length > 0}
          canRedo={history.future.length > 0}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onSaveToLocal={handleSaveToLocal}
          onSaveFile={handleSaveFile}
          onOpenFile={() => fileInputRef.current?.click()}
          defaultPathType={defaultPathType}
          onApplyPathTypeToAll={handleApplyPathTypeToAll}
          language={language}
          nodePresets={settings.nodePresets}
          onAddPresetNode={handleAddPresetNode}
          onAddNodeLocal={handleAddNodeLocal}
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
              onUpdate={(newSettings) => setSettings(newSettings)}
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
        onGenerate={handleGenerate}
        onAbort={handleAbort}
        onClose={() => setShowStartDialog(false)}
      />
    </div>
  );
}

