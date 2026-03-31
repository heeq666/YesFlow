import { createElement, useCallback, useRef } from 'react';
import type React from 'react';
import { addEdge, MarkerType, type Edge, type Node, type OnConnectEnd } from '@xyflow/react';
import { Check, LayoutDashboard, Tag } from 'lucide-react';

import { getHelperLines } from '../utils/helperLineUtils';
import { getNodeAbsolutePosition } from '../utils/nodeUtils';
import { createHistory, pushToHistory, type HistoryState } from '../utils/historyUtils';
import type { NodePreset, ProjectRecord, TaskData } from '../types';

type UseCanvasActionsParams = {
  nodes: Node[];
  edges: Edge[];
  language: 'zh' | 'en';
  defaultPathType: string;
  clipboard: { nodes: Node[]; edges: Edge[] } | null;
  selectedNodeId: string | null;
  screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number };
  getNodes: () => Node[];
  getEdges: () => Edge[];
  takeSnapshot: (nodes?: Node[], edges?: Edge[]) => void;
  showStatus: (text: string, icon: React.ReactNode) => void;
  hydrateTaskData: (data: Partial<TaskData>) => TaskData;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  setClipboard: React.Dispatch<React.SetStateAction<{ nodes: Node[]; edges: Edge[] } | null>>;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedEdgeId: (id: string | null) => void;
  setProjectName: (name: string) => void;
  setPrompt: (value: string) => void;
  setShowStartDialog: (value: boolean) => void;
  setCurrentRecordId: (id: string | null) => void;
  setHistory: (history: HistoryState | ((prev: HistoryState) => HistoryState)) => void;
  setIsSidebarOpen: (value: boolean) => void;
  setHelperLines: React.Dispatch<React.SetStateAction<{ horizontal: number | null; vertical: number | null }>>;
};

export function useCanvasActions({
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
}: UseCanvasActionsParams) {
  const connectStartParams = useRef<{ nodeId: string; handleId: string; time: number } | null>(null);

  const handleCopy = useCallback(() => {
    const selectedNodes = nodes.filter((node) => node.selected);
    const selectedEdges = edges.filter((edge) =>
      selectedNodes.some((node) => node.id === edge.source) &&
      selectedNodes.some((node) => node.id === edge.target),
    );

    if (selectedNodes.length === 0) return;
    setClipboard({
      nodes: JSON.parse(JSON.stringify(selectedNodes)),
      edges: JSON.parse(JSON.stringify(selectedEdges)),
    });
    showStatus(
      language === 'zh' ? `已复制 ${selectedNodes.length} 个节点` : `Copied ${selectedNodes.length} nodes`,
      createElement(Check, { className: 'w-3.5 h-3.5' }),
    );
  }, [nodes, edges, setClipboard]);

  const handleCut = useCallback(() => {
    const selectedNodes = nodes.filter((node) => node.selected);
    const selectedEdges = edges.filter((edge) =>
      selectedNodes.some((node) => node.id === edge.source) &&
      selectedNodes.some((node) => node.id === edge.target),
    );

    if (selectedNodes.length === 0) return;

    setClipboard({
      nodes: JSON.parse(JSON.stringify(selectedNodes)),
      edges: JSON.parse(JSON.stringify(selectedEdges)),
    });
    setNodes((currentNodes) => currentNodes.filter((node) => !node.selected));
    setEdges((currentEdges) => currentEdges.filter((edge) =>
      !selectedNodes.some((node) => node.id === edge.source) &&
      !selectedNodes.some((node) => node.id === edge.target),
    ));
    showStatus(
      language === 'zh' ? `已剪切 ${selectedNodes.length} 个节点` : `Cut ${selectedNodes.length} nodes`,
      createElement(Check, { className: 'w-3.5 h-3.5' }),
    );
    takeSnapshot(
      nodes.filter((node) => !node.selected),
      edges.filter((edge) =>
        !selectedNodes.some((node) => node.id === edge.source) &&
        !selectedNodes.some((node) => node.id === edge.target),
      ),
    );
  }, [nodes, edges, language, setClipboard, setNodes, setEdges, showStatus, takeSnapshot]);

  const handlePaste = useCallback(() => {
    if (!clipboard) return;

    const idMap: Record<string, string> = {};
    const newNodes = clipboard.nodes.map((node) => {
      const newId = `node-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      idMap[node.id] = newId;
      return {
        ...node,
        id: newId,
        position: { x: node.position.x + 40, y: node.position.y + 40 },
        selected: true,
        data: hydrateTaskData(node.data as Partial<TaskData>),
      };
    });

    const newEdges = clipboard.edges.map((edge) => ({
      ...edge,
      id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      source: idMap[edge.source],
      target: idMap[edge.target],
      selected: true,
    }));

    const updatedNodes = nodes.map((node) => ({ ...node, selected: false })).concat(newNodes);
    const updatedEdges = edges.map((edge) => ({ ...edge, selected: false })).concat(newEdges);

    setNodes(updatedNodes);
    setEdges(updatedEdges);
    takeSnapshot(updatedNodes, updatedEdges);
    showStatus(
      language === 'zh' ? '已粘贴' : 'Pasted',
      createElement(Check, { className: 'w-3.5 h-3.5' }),
    );
  }, [clipboard, hydrateTaskData, nodes, edges, language, setNodes, setEdges, showStatus, takeSnapshot]);

  const deleteNodesAndReconnect = useCallback((nodeIdsToDelete: string[]) => {
    if (nodeIdsToDelete.length === 0) return;

    const currentNodes = getNodes();
    const currentEdges = getEdges();
    const childrenIds = currentNodes
      .filter((node) => node.parentId && nodeIdsToDelete.includes(node.parentId))
      .map((node) => node.id);

    const allDeletedIds = [...new Set([...nodeIdsToDelete, ...childrenIds])];
    const nextNodes = currentNodes.filter((node) => !allDeletedIds.includes(node.id));
    let workingEdges = [...currentEdges];

    nodeIdsToDelete.forEach((id) => {
      const incoming = workingEdges.filter((edge) => edge.target === id);
      const outgoing = workingEdges.filter((edge) => edge.source === id);

      incoming.forEach((incomingEdge) => {
        outgoing.forEach((outgoingEdge) => {
          const isSelf = incomingEdge.source === outgoingEdge.target;
          const sourceSoonDeleted = allDeletedIds.includes(incomingEdge.source);
          const targetSoonDeleted = allDeletedIds.includes(outgoingEdge.target);

          if (isSelf || sourceSoonDeleted || targetSoonDeleted) return;

          const alreadyExists = workingEdges.some((edge) => edge.source === incomingEdge.source && edge.target === outgoingEdge.target);
          if (alreadyExists) return;

          workingEdges.push({
            id: `reconnect-${incomingEdge.source}-${outgoingEdge.target}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            source: incomingEdge.source,
            target: outgoingEdge.target,
            type: 'floating',
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
            data: { pathType: defaultPathType },
          });
        });
      });
    });

    const nextNodeIds = nextNodes.map((node) => node.id);
    const finalEdges = workingEdges.filter((edge) => nextNodeIds.includes(edge.source) && nextNodeIds.includes(edge.target));

    setNodes(nextNodes);
    setEdges(finalEdges);
    takeSnapshot(nextNodes, finalEdges);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, [getNodes, getEdges, defaultPathType, setNodes, setEdges, takeSnapshot, setSelectedNodeId, setSelectedEdgeId]);

  const handleDeleteNodeLocal = useCallback(() => {
    if (!selectedNodeId) return;
    deleteNodesAndReconnect([selectedNodeId]);
    setSelectedNodeId(null);
  }, [selectedNodeId, deleteNodesAndReconnect, setSelectedNodeId]);

  const handleAddNodeLocal = useCallback(() => {
    const id = `node-${Date.now()}`;
    const position = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const newNode: Node = {
      id,
      type: 'task',
      position,
      selected: true,
      data: hydrateTaskData({ label: 'New Task', description: '', type: 'execution', status: 'pending' }),
    };

    setNodes((currentNodes) => {
      const nextNodes = currentNodes.map((node) => ({ ...node, selected: false })).concat(newNode);
      takeSnapshot(nextNodes, edges);
      return nextNodes;
    });
    setSelectedNodeId(id);
  }, [screenToFlowPosition, hydrateTaskData, setNodes, takeSnapshot, edges, setSelectedNodeId]);

  const handleNewProject = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setProjectName('YesFlow Project');
    setCurrentRecordId(null);
    setPrompt('');
    setShowStartDialog(true);
    setHistory(createHistory({ nodes: [], edges: [] }));
  }, [setNodes, setEdges, setProjectName, setCurrentRecordId, setPrompt, setShowStartDialog, setHistory]);

  const handleApplyPathTypeToAll = useCallback((type: string) => {
    setEdges((currentEdges) => {
      const nextEdges = currentEdges.map((edge) => ({ ...edge, type: 'floating', data: { ...edge.data, pathType: type } }));
      takeSnapshot(nodes, nextEdges);
      return nextEdges;
    });
  }, [setEdges, takeSnapshot, nodes]);

  const handleSetSelectedEdgesColor = useCallback((color: string) => {
    setEdges((currentEdges) => {
      const nextEdges = currentEdges.map((edge) => edge.selected ? { ...edge, data: { ...edge.data, color } } : edge);
      takeSnapshot(getNodes(), nextEdges);
      return nextEdges;
    });
    showStatus(
      language === 'zh' ? '连线颜色已更新' : 'Edge colors updated',
      createElement(Tag, { className: 'w-3.5 h-3.5' }),
    );
  }, [setEdges, takeSnapshot, getNodes, language, showStatus]);

  const onConnectStart = useCallback((_: unknown, params: { nodeId: string; handleId: string; time: number }) => {
    connectStartParams.current = params;
  }, []);

  const onConnect = useCallback((params: { source?: string | null; target?: string | null }) => {
    if (!params.source || !params.target || params.source === params.target) return;

    const newEdge: Edge = {
      source: params.source,
      target: params.target,
      id: `e-${Date.now()}`,
      type: 'floating',
      animated: true,
      className: 'new-edge-animation',
      markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
      data: { pathType: defaultPathType },
    };

    setEdges((currentEdges) => {
      const nextEdges = addEdge(newEdge, currentEdges);
      takeSnapshot(getNodes(), nextEdges);
      return nextEdges;
    });

    showStatus(
      language === 'zh' ? '已连接' : 'Connected',
      createElement(Check, { className: 'w-3.5 h-3.5' }),
    );

    setTimeout(() => {
      setEdges((currentEdges) => currentEdges.map((edge) => edge.id === newEdge.id ? { ...edge, className: '' } : edge));
    }, 3000);
  }, [defaultPathType, setEdges, takeSnapshot, getNodes, showStatus, language]);

  const onConnectEnd: OnConnectEnd = useCallback((event, connectionState) => {
    if (!connectStartParams.current || connectionState.toNode) return;
    const { nodeId, handleId } = connectStartParams.current;

    if ((event.target as Element).classList?.contains('react-flow__pane')) {
      const { clientX, clientY } = 'clientX' in event ? (event as MouseEvent) : (event as TouchEvent).changedTouches[0];
      const dropPosition = screenToFlowPosition({ x: clientX, y: clientY });
      const nodeIdNew = `node-${Date.now()}`;
      const newNode: Node = {
        id: nodeIdNew,
        type: 'task',
        position: { x: dropPosition.x - 130, y: dropPosition.y - 70 },
        selected: true,
        data: hydrateTaskData({ label: '', description: '', type: 'execution', status: 'pending' }),
      };
      const newEdge: Edge = {
        id: `e-${nodeId}-${nodeIdNew}`,
        source: nodeId,
        target: nodeIdNew,
        type: 'floating',
        sourceHandle: handleId,
        animated: true,
        className: 'new-edge-animation',
        markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
        data: { pathType: defaultPathType },
      };

      setNodes((currentNodes) => {
        const nextNodes = currentNodes.map((node) => ({ ...node, selected: false })).concat(newNode);
        setEdges((currentEdges) => {
          const nextEdges = [...currentEdges, newEdge];
          takeSnapshot(nextNodes, nextEdges);
          return nextEdges;
        });
        return nextNodes;
      });

      setTimeout(() => {
        setEdges((currentEdges) => currentEdges.map((edge) => edge.id === newEdge.id ? { ...edge, className: '' } : edge));
      }, 3000);
    }

    connectStartParams.current = null;
  }, [screenToFlowPosition, hydrateTaskData, defaultPathType, setNodes, setEdges, takeSnapshot]);

  const handleAddPresetNode = useCallback((preset: NodePreset) => {
    const id = `node-${Date.now()}`;
    const position = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const newNode: Node = {
      id,
      type: 'task',
      position,
      selected: true,
      data: hydrateTaskData({
        label: preset.label === '计划' || preset.label === '执行' || preset.label === '验证' ? '新任务' : preset.label,
        description: '',
        type: preset.type,
        typeLabel: preset.label,
        color: preset.color,
        status: 'pending',
      }),
    };

    setNodes((currentNodes) => {
      const nextNodes = currentNodes.map((node) => ({ ...node, selected: false })).concat(newNode);
      takeSnapshot(nextNodes, edges);
      return nextNodes;
    });

    setSelectedNodeId(id);
    setIsSidebarOpen(true);
  }, [screenToFlowPosition, hydrateTaskData, setNodes, takeSnapshot, edges, setSelectedNodeId, setIsSidebarOpen]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const rawData = event.dataTransfer.getData('application/reactflow');
    if (!rawData) return;

    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const id = `node-${Date.now()}`;

    try {
      const parsed = JSON.parse(rawData);
      const newNode: Node = {
        id,
        type: 'task',
        position,
        selected: true,
        data: hydrateTaskData({
          label: parsed.label === '计划' || parsed.label === '执行' || parsed.label === '验证' ? '新任务' : parsed.label,
          description: '',
          type: parsed.type,
          typeLabel: parsed.label,
          color: parsed.color,
          status: 'pending',
        }),
      };

      setNodes((currentNodes) => {
        const nextNodes = currentNodes.map((node) => ({ ...node, selected: false })).concat(newNode);
        takeSnapshot(nextNodes, edges);
        return nextNodes;
      });
    } catch {
      const newNode: Node = {
        id,
        type: 'task',
        position,
        selected: true,
        data: hydrateTaskData({
          label: language === 'zh' ? '新任务' : 'New Task',
          description: '',
          type: rawData,
          status: 'pending',
        }),
      };

      setNodes((currentNodes) => {
        const nextNodes = currentNodes.map((node) => ({ ...node, selected: false })).concat(newNode);
        takeSnapshot(nextNodes, edges);
        return nextNodes;
      });
    }

    setSelectedNodeId(id);
    setIsSidebarOpen(true);
  }, [screenToFlowPosition, hydrateTaskData, setNodes, takeSnapshot, edges, language, setSelectedNodeId, setIsSidebarOpen]);

  const onNodeDrag = useCallback((_: unknown, node: Node) => {
    const currentNodes = getNodes();
    const absolutePosition = getNodeAbsolutePosition(node, currentNodes);
    const { helperLines } = getHelperLines({ ...node, position: absolutePosition }, currentNodes);
    setHelperLines(helperLines);
  }, [getNodes, setHelperLines]);

  const onNodeDragStop = useCallback(() => {
    setHelperLines({ horizontal: null, vertical: null });
    setHistory((prev) => pushToHistory(prev, { nodes: getNodes(), edges: getEdges() }));
  }, [setHelperLines, setHistory, getNodes, getEdges]);

  return {
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
  };
}
