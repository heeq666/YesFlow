import { createElement, useCallback, useEffect, useRef } from 'react';
import type React from 'react';
import { addEdge, MarkerType, type Edge, type Node, type OnConnectEnd } from '@xyflow/react';
import { Check, LayoutDashboard, Tag, X } from 'lucide-react';

import { getTaskNodeLayout } from '../constants/taskNodeLayout';
import type { HelperLines } from '../utils/helperLineUtils';
import { getNodeAbsolutePosition, getGroupBounds } from '../utils/nodeUtils';
import { createHistory, pushToHistory, type HistoryState } from '../utils/historyUtils';
import type { ConnectionMode, NodePreset, ProjectRecord, TaskData, TaskMode } from '../types';

type UseCanvasActionsParams = {
  nodes: Node[];
  edges: Edge[];
  language: 'zh' | 'en';
  mode: TaskMode;
  defaultPathType: string;
  connectionMode: ConnectionMode;
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
  setHelperLines: (lines: HelperLines) => void;
  cancelConnection: () => void;
  isConnectionInProgress: () => boolean;
};

export function useCanvasActions({
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
  setHelperLines,
  cancelConnection,
  isConnectionInProgress,
}: UseCanvasActionsParams) {
  const taskNodeLayout = getTaskNodeLayout(mode);
  const connectStartParams = useRef<{ nodeId: string; handleId: string | null; handleType?: 'source' | 'target'; time?: number } | null>(null);
  const draggingOverGroupIdRef = useRef<string | null>(null);
  const dragHoverRafRef = useRef<number | null>(null);

  const cancelDanglingConnection = useCallback(() => {
    if (!connectStartParams.current && !isConnectionInProgress()) return;
    connectStartParams.current = null;
    if (isConnectionInProgress()) {
      cancelConnection();
    }
  }, [cancelConnection, isConnectionInProgress]);

  useEffect(() => {
    const scheduleConnectionCleanup = () => {
      window.setTimeout(() => {
        cancelDanglingConnection();
      }, 0);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        cancelDanglingConnection();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        cancelDanglingConnection();
      }
    };

    window.addEventListener('mouseup', scheduleConnectionCleanup);
    window.addEventListener('touchend', scheduleConnectionCleanup);
    window.addEventListener('blur', cancelDanglingConnection);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('mouseup', scheduleConnectionCleanup);
      window.removeEventListener('touchend', scheduleConnectionCleanup);
      window.removeEventListener('blur', cancelDanglingConnection);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [cancelDanglingConnection]);

  useEffect(() => {
    return () => {
      if (dragHoverRafRef.current !== null) {
        window.cancelAnimationFrame(dragHoverRafRef.current);
      }
    };
  }, []);

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
    const timestamp = Date.now();
    const newNodes = clipboard.nodes.map((node, index) => {
      const newId = `node-${timestamp}-${index}-${Math.random().toString(36).slice(2, 11)}`;
      idMap[node.id] = newId;
      return {
        ...node,
        id: newId,
        position: { x: node.position.x + 40, y: node.position.y + 40 },
        extent: node.parentId ? undefined : node.extent,
        selected: true,
        data: hydrateTaskData(node.data as Partial<TaskData>),
      };
    });

    const newEdges = clipboard.edges.map((edge, index) => ({
      ...edge,
      id: `e-${timestamp}-${index}-${Math.random().toString(36).slice(2, 11)}`,
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
            id: `reconnect-${incomingEdge.source}-${outgoingEdge.target}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
            source: incomingEdge.source,
            target: outgoingEdge.target,
            type: 'floating',
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
            data: { pathType: defaultPathType, connectionMode },
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
  }, [getNodes, getEdges, defaultPathType, connectionMode, setNodes, setEdges, takeSnapshot, setSelectedNodeId, setSelectedEdgeId]);

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
      const nextNodes = [...currentNodes.map((node) => ({ ...node, selected: false })), { ...newNode, selected: true }];
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

  const handleApplyConnectionModeToAll = useCallback((mode: ConnectionMode) => {
    setEdges((currentEdges) => {
      const nextEdges = currentEdges.map((edge) => ({
        ...edge,
        type: 'floating',
        data: { ...edge.data, connectionMode: mode },
      }));
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

  const onConnectStart = useCallback((_: unknown, params: { nodeId: string; handleId: string | null; handleType?: 'source' | 'target'; time?: number }) => {
    connectStartParams.current = params;
  }, []);

  const onConnect = useCallback((params: { source?: string | null; target?: string | null; sourceHandle?: string | null; targetHandle?: string | null }) => {
    if (!params.source || !params.target || params.source === params.target) return;
    connectStartParams.current = null;

    const newEdge: Edge = {
      source: params.source,
      target: params.target,
      sourceHandle: params.sourceHandle ?? undefined,
      targetHandle: params.targetHandle ?? undefined,
      id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      type: 'floating',
      animated: true,
      className: 'new-edge-animation',
      markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
      data: { pathType: defaultPathType, connectionMode },
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
  }, [defaultPathType, connectionMode, setEdges, takeSnapshot, getNodes, showStatus, language]);

  const onConnectEnd: OnConnectEnd = useCallback((event, connectionState) => {
    const startParams = connectStartParams.current;

    try {
      if (!startParams || connectionState.toNode) return;

      const eventTarget = event.target;
      const droppedOnPane = eventTarget instanceof Element && eventTarget.classList.contains('react-flow__pane');
      if (!droppedOnPane) return;

      const pointer = 'clientX' in event ? event as MouseEvent : (event as TouchEvent).changedTouches[0];
      const dropPosition = screenToFlowPosition({ x: pointer.clientX, y: pointer.clientY });
      const { nodeId, handleId, handleType } = startParams;
      const nodeIdNew = `node-${Date.now()}`;
      const newNode: Node = {
        id: nodeIdNew,
        type: 'task',
        position: {
          x: dropPosition.x - taskNodeLayout.width / 2,
          y: dropPosition.y - taskNodeLayout.height / 2,
        },
        selected: true,
        data: hydrateTaskData({ label: '', description: '', type: 'execution', status: 'pending' }),
      };
      const newEdge: Edge = {
        id: `e-${nodeId}-${nodeIdNew}-${Math.random().toString(36).slice(2, 11)}`,
        source: handleType === 'target' ? nodeIdNew : nodeId,
        target: handleType === 'target' ? nodeId : nodeIdNew,
        type: 'floating',
        sourceHandle: handleType === 'target' ? undefined : handleId ?? undefined,
        targetHandle: handleType === 'target' ? handleId ?? undefined : undefined,
        animated: true,
        className: 'new-edge-animation',
        markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
        data: { pathType: defaultPathType, connectionMode },
      };

      setNodes((currentNodes) => {
        const nextNodes = [...currentNodes.map((node) => ({ ...node, selected: false })), { ...newNode, selected: true }];
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
    } finally {
      connectStartParams.current = null;
    }
  }, [screenToFlowPosition, hydrateTaskData, defaultPathType, connectionMode, setNodes, setEdges, takeSnapshot, taskNodeLayout.height, taskNodeLayout.width]);

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
      const nextNodes = [...currentNodes.map((node) => ({ ...node, selected: false })), { ...newNode, selected: true }];
      takeSnapshot(nextNodes, edges);
      return nextNodes;
    });

    setSelectedNodeId(id);
    setIsSidebarOpen(true);
  }, [screenToFlowPosition, hydrateTaskData, setNodes, takeSnapshot, edges, setSelectedNodeId, setIsSidebarOpen]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = event.dataTransfer.files?.length ? 'copy' : 'move';
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    if (event.dataTransfer.files?.length) return;
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
        const nextNodes = [...currentNodes.map((node) => ({ ...node, selected: false })), { ...newNode, selected: true }];
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
        const nextNodes = [...currentNodes.map((node) => ({ ...node, selected: false })), { ...newNode, selected: true }];
        takeSnapshot(nextNodes, edges);
        return nextNodes;
      });
    }

    setSelectedNodeId(id);
    setIsSidebarOpen(true);
  }, [screenToFlowPosition, hydrateTaskData, setNodes, takeSnapshot, edges, language, setSelectedNodeId, setIsSidebarOpen]);

  const findGroupUnderNode = useCallback((node: Node, currentNodes: Node[]) => {
    if (node.parentId || node.type !== 'task') return null;

    const nodeAbsPos = getNodeAbsolutePosition(node, currentNodes);
    const nodeCenter = {
      x: nodeAbsPos.x + (node.measured?.width ?? 260) / 2,
      y: nodeAbsPos.y + (node.measured?.height ?? 140) / 2,
    };

    return currentNodes.find((candidate) => {
      if (candidate.type !== 'group') return false;
      const width = candidate.measured?.width ?? (typeof (candidate.style as any)?.width === 'number' ? (candidate.style as any).width : 0);
      const height = candidate.measured?.height ?? (typeof (candidate.style as any)?.height === 'number' ? (candidate.style as any).height : 0);
      if (!width || !height) return false;

      return (
        nodeCenter.x > candidate.position.x &&
        nodeCenter.x < candidate.position.x + width &&
        nodeCenter.y > candidate.position.y &&
        nodeCenter.y < candidate.position.y + height
      );
    }) ?? null;
  }, []);

  const applyDragGroupFeedback = useCallback((node: Node) => {
    const currentNodes = getNodes();
    const groupUnder = findGroupUnderNode(node, currentNodes);
    const nextGroupId = groupUnder?.id ?? null;
    if (nextGroupId === draggingOverGroupIdRef.current) return;
    draggingOverGroupIdRef.current = nextGroupId;

    setNodes((nds) =>
      nds.map((n) => {
        // Highlight the group background
        if (n.type === 'group') {
          const isTargetGroup = n.id === nextGroupId;
          if ((n.data as any)?.isDraggingOver === isTargetGroup) return n;
          return { ...n, data: { ...n.data, isDraggingOver: isTargetGroup } };
        }
        // Show bubble on the dragged node
        if (n.id === node.id) {
          const isOverAnything = !!nextGroupId;
          return { ...n, zIndex: 1000, data: { ...n.data, isDraggingOver: isOverAnything } };
        }
        return { ...n, zIndex: n.type === 'group' ? -1 : 0 };
      }),
    );
  }, [findGroupUnderNode, getNodes, setNodes]);

  const onNodeDrag = useCallback((_: unknown, node: Node) => {
    if (dragHoverRafRef.current !== null) {
      window.cancelAnimationFrame(dragHoverRafRef.current);
    }

    dragHoverRafRef.current = window.requestAnimationFrame(() => {
      dragHoverRafRef.current = null;
      applyDragGroupFeedback(node);
    });
  }, [applyDragGroupFeedback]);

  const onNodeDragStop = useCallback((_: any, node: Node) => {
    if (dragHoverRafRef.current !== null) {
      window.cancelAnimationFrame(dragHoverRafRef.current);
      dragHoverRafRef.current = null;
    }

    setHelperLines({ horizontal: null, vertical: null });
    
    // Finalize Group Join using the Ref (Sync)
    const targetGroupId = findGroupUnderNode(node, getNodes())?.id ?? draggingOverGroupIdRef.current;
    draggingOverGroupIdRef.current = null; // Reset immediately

    setNodes(nds => {
      let nextNodes = [...nds];
      let targetParentId = node.parentId; // Use existing parent by default

      // 1. Handle New Join logic
      if (!node.parentId && node.type === 'task' && targetGroupId) {
        const groupUnder = nds.find(n => n.id === targetGroupId);
        if (groupUnder) {
          const nodeAbsPos = getNodeAbsolutePosition(node, nds);
          targetParentId = groupUnder.id;
          nextNodes = nextNodes.map(n => {
            if (n.id === node.id) {
              return {
                ...n,
                parentId: targetParentId,
                position: { 
                  x: Math.round(nodeAbsPos.x - groupUnder.position.x), 
                  y: Math.round(nodeAbsPos.y - groupUnder.position.y) 
                },
                extent: undefined,
                zIndex: 0,
                data: { ...n.data, isDraggingOver: false }
              };
            }
            return n;
          });
          showStatus(language === 'zh' ? '已加入编组' : 'Joined group', createElement(LayoutDashboard, { className: 'w-3.5 h-3.5' }));
        }
      }

      // 2. Visual cleanup (isDraggingOver & zIndex)
      nextNodes = nextNodes.map(n => {
        if (n.id === node.id || n.type === 'group') {
           const isGroup = n.type === 'group';
           return { 
             ...n, 
             zIndex: isGroup ? -1 : 0,
             data: { ...n.data, isDraggingOver: false } 
           };
        }
        return n;
      });

      // 3. Auto-Resize Parent Group
      if (targetParentId) {
        const bounds = getGroupBounds(nextNodes, targetParentId);
        if (bounds) {
          const { delta, style } = bounds;
          
          // Only update if there's an actual change to prevent jitter
          if (delta.x !== 0 || delta.y !== 0 || (nextNodes.find(n => n.id === targetParentId)?.style as any)?.width !== style.width) {
            nextNodes = nextNodes.map(n => {
              if (n.id === targetParentId) {
                return {
                  ...n,
                  position: { x: n.position.x + delta.x, y: n.position.y + delta.y },
                  style: { ...n.style, ...style }
                };
              }
              if (n.parentId === targetParentId) {
                return {
                  ...n,
                  position: { x: n.position.x - delta.x, y: n.position.y - delta.y }
                };
              }
              return n;
            });
          }
        }
      }

      takeSnapshot(nextNodes, getEdges());
      setHistory((prev) => pushToHistory(prev, { nodes: nextNodes, edges: getEdges() }));
      return nextNodes;
    });
  }, [setHelperLines, setHistory, getEdges, setNodes, language, showStatus, takeSnapshot, findGroupUnderNode, getNodes]);

  const handleGroupSelection = useCallback(() => {
    const currentNodes = getNodes();
    const selectedNodes = currentNodes.filter(n => n.selected && n.type !== 'group');
    if (selectedNodes.length < 2) return;

    // 获取选中节点在画布上的绝对坐标
    const absoluteNodes = selectedNodes.map(n => ({
      ...n,
      absPos: getNodeAbsolutePosition(n, currentNodes)
    }));

    // 计算外接矩形（基于绝对坐标）
    const minX = Math.min(...absoluteNodes.map(n => n.absPos.x));
    const minY = Math.min(...absoluteNodes.map(n => n.absPos.y));
    const maxX = Math.max(...absoluteNodes.map(n => n.absPos.x + (n.measured?.width || 260)));
    const maxY = Math.max(...absoluteNodes.map(n => n.absPos.y + (n.measured?.height || 140)));

    const padding = 60;
    const groupWidth = (maxX - minX) + padding * 2;
    const groupHeight = (maxY - minY) + padding * 2;
    const groupId = `group-${Date.now()}`;
    const groupPos = { x: minX - padding, y: minY - padding };

    const groupNode: Node = {
      id: groupId,
      type: 'group',
      position: groupPos,
      style: { width: groupWidth, height: groupHeight },
      data: { 
        label: language === 'zh' ? '新编组' : 'New Group',
        description: '',
        language,
        isGroup: true,
        onUngroup: (id: string) => handleUngroup(id)
      },
      zIndex: -1, // 初始置于底层
    };

    setNodes(nds => {
      const updatedNodes = nds.map(n => {
        const selectedInfo = absoluteNodes.find(an => an.id === n.id);
        if (selectedInfo) {
          return {
            ...n,
            parentId: groupId,
            // 子节点位置 = 节点绝对位置 - 容器绝对位置
            position: { 
              x: Math.round(selectedInfo.absPos.x - groupPos.x), 
              y: Math.round(selectedInfo.absPos.y - groupPos.y) 
            },
            extent: undefined,
            selected: false
          };
        }
        return { ...n, selected: false };
      });

      // 重要：父节点需要先于子节点出现在数组中，
      // 否则在同一帧内子节点可能找不到 parentId 对应的父节点，导致位置被重置（表现为跳到左上角）。
      const nextNodes = [{ ...groupNode, selected: true }, ...updatedNodes];
      
      takeSnapshot(nextNodes, edges);
      return nextNodes;
    });

    showStatus(language === 'zh' ? '已完成编组' : 'Nodes Grouped', createElement(LayoutDashboard, { className: 'w-3.5 h-3.5' }));
  }, [nodes, edges, hydrateTaskData, language, setNodes, takeSnapshot, showStatus]);

  const handleUngroup = useCallback((groupId: string) => {
    const currentNodes = getNodes();
    const groupNode = currentNodes.find(n => n.id === groupId);
    if (!groupNode) return;

    const children = currentNodes.filter(n => n.parentId === groupId);
    
    const groupAbsPos = getNodeAbsolutePosition(groupNode, currentNodes);
    
    setNodes(nds => {
      const nextNodes = nds.filter(n => n.id !== groupId).map(n => {
        if (n.parentId === groupId) {
          return {
            ...n,
            parentId: undefined,
            // 还原到绝对坐标：父容器绝对坐标 + 节点相对偏移
            position: { 
              x: Math.round(groupAbsPos.x + n.position.x), 
              y: Math.round(groupAbsPos.y + n.position.y) 
            },
            extent: undefined
          };
        }
        return n;
      });
      takeSnapshot(nextNodes, edges);
      return nextNodes;
    });

    showStatus(language === 'zh' ? '已解除编组' : 'Ungrouped', createElement(X, { className: 'w-3.5 h-3.5' }));
  }, [getNodes, setNodes, takeSnapshot, edges, language, showStatus]);

  const handleExitSelectedFromGroup = useCallback(() => {
    const currentNodes = getNodes();
    const selectedChildren = currentNodes.filter((node) => node.selected && node.type !== 'group' && node.parentId);
    if (selectedChildren.length === 0) return;

    const selectedIds = new Set(selectedChildren.map((node) => node.id));
    const absolutePositionMap = new Map(
      selectedChildren.map((node) => [node.id, getNodeAbsolutePosition(node, currentNodes)]),
    );
    const affectedGroupIds = Array.from(
      new Set(selectedChildren.map((node) => node.parentId).filter((groupId): groupId is string => Boolean(groupId))),
    );

    setNodes((nds) => {
      let nextNodes = nds.map((node) => {
        if (!selectedIds.has(node.id)) return node;
        const absolutePosition = absolutePositionMap.get(node.id);
        if (!absolutePosition) return node;

        return {
          ...node,
          parentId: undefined,
          extent: undefined,
          position: {
            x: Math.round(absolutePosition.x),
            y: Math.round(absolutePosition.y),
          },
        };
      });

      // Keep remaining grouped nodes within updated bounds after some children leave.
      affectedGroupIds.forEach((groupId) => {
        const bounds = getGroupBounds(nextNodes, groupId);
        if (!bounds) return;
        const { delta, style } = bounds;
        nextNodes = nextNodes.map((node) => {
          if (node.id === groupId) {
            return {
              ...node,
              position: { x: node.position.x + delta.x, y: node.position.y + delta.y },
              style: { ...node.style, ...style },
            };
          }
          if (node.parentId === groupId) {
            return {
              ...node,
              position: { x: node.position.x - delta.x, y: node.position.y - delta.y },
            };
          }
          return node;
        });
      });

      takeSnapshot(nextNodes, getEdges());
      return nextNodes;
    });

    showStatus(
      language === 'zh'
        ? selectedChildren.length === 1
          ? '已退出编组'
          : `已将 ${selectedChildren.length} 个节点退出编组`
        : selectedChildren.length === 1
          ? 'Exited group'
          : `${selectedChildren.length} nodes exited group`,
      createElement(X, { className: 'w-3.5 h-3.5' }),
    );
  }, [getNodes, setNodes, getEdges, takeSnapshot, language, showStatus]);

  return {
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
  };
}
