import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';
import { MarkerType, type Edge, type Node } from '@xyflow/react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

import { decomposeTask, generateGroupTasks, generatePlan, modifySelectedTasks, suggestModifications } from '../services/aiService';
import { getLayoutedElements } from '../lib/flowLayout';
import type { AIProjectPlan, ConnectionMode, TaskData, TaskMode, ApiProvider } from '../types';
import { getTaskNodeLayout } from '../constants/taskNodeLayout';

type UseAiOrchestrationParams = {
  nodes: Node[];
  edges: Edge[];
  projectName: string;
  language: 'zh' | 'en';
  mode: TaskMode;
  provider: ApiProvider;
  defaultPathType: string;
  connectionMode: ConnectionMode;
  prompt: string;
  selectedPrompt: string;
  decomposePrompt: string;
  selectedNodeId: string | null;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  setProjectName: (name: string) => void;
  setSuggestion: (value: string | null) => void;
  setShowDecomposeInput: (value: boolean) => void;
  takeSnapshot: (nodes?: Node[], edges?: Edge[]) => void;
  showStatus: (text: string, icon: React.ReactNode) => void;
  hydrateTaskData: (data: Partial<TaskData>) => TaskData;
  onStreamingChange?: (content: string) => void;
  onPlanRequestSettled?: (outcome: { status: 'success' | 'aborted' | 'error'; message?: string }) => void;
  onViewportRequest?: (request: { scope: 'all' | 'nodes'; nodeIds?: string[] }) => void;
};

type AiRequestKind =
  | 'generate-plan'
  | 'modify-plan'
  | 'optimize-node'
  | 'decompose-node'
  | 'modify-selected'
  | 'generate-group';

type AbortOptions = {
  silent?: boolean;
};

export function useAiOrchestration({
  nodes,
  edges,
  projectName,
  language,
  mode,
  provider,
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
  onStreamingChange,
  onPlanRequestSettled,
  onViewportRequest,
}: UseAiOrchestrationParams) {
  const [isLoading, setIsLoading] = useState(false);
  const [isNodeAiLoading, setIsNodeAiLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeRequestRef = useRef<AiRequestKind | null>(null);
  const requestVersionRef = useRef(0);
  const taskNodeLayout = getTaskNodeLayout(mode);

  // Refs for all callbacks to avoid stale closures in async handlers
  const setNodesRef = useRef(setNodes);
  const setEdgesRef = useRef(setEdges);
  const setProjectNameRef = useRef(setProjectName);
  const setSuggestionRef = useRef(setSuggestion);
  const setShowDecomposeInputRef = useRef(setShowDecomposeInput);
  const takeSnapshotRef = useRef(takeSnapshot);
  const showStatusRef = useRef(showStatus);
  const hydrateTaskDataRef = useRef(hydrateTaskData);
  const onStreamingChangeRef = useRef(onStreamingChange);
  const onPlanRequestSettledRef = useRef(onPlanRequestSettled);
  const onViewportRequestRef = useRef(onViewportRequest);

  useEffect(() => { setNodesRef.current = setNodes; }, [setNodes]);
  useEffect(() => { setEdgesRef.current = setEdges; }, [setEdges]);
  useEffect(() => { setProjectNameRef.current = setProjectName; }, [setProjectName]);
  useEffect(() => { setSuggestionRef.current = setSuggestion; }, [setSuggestion]);
  useEffect(() => { setShowDecomposeInputRef.current = setShowDecomposeInput; }, [setShowDecomposeInput]);
  useEffect(() => { takeSnapshotRef.current = takeSnapshot; }, [takeSnapshot]);
  useEffect(() => { showStatusRef.current = showStatus; }, [showStatus]);
  useEffect(() => { hydrateTaskDataRef.current = hydrateTaskData; }, [hydrateTaskData]);
  useEffect(() => { onStreamingChangeRef.current = onStreamingChange; }, [onStreamingChange]);
  useEffect(() => { onPlanRequestSettledRef.current = onPlanRequestSettled; }, [onPlanRequestSettled]);
  useEffect(() => { onViewportRequestRef.current = onViewportRequest; }, [onViewportRequest]);

  const getAiErrorMessage = useCallback((error: unknown) => {
    if (error instanceof Error) {
      const compactMessage = error.message.replace(/\s+/g, ' ').trim();
      if (compactMessage) {
        return compactMessage.length > 180 ? `${compactMessage.slice(0, 177)}...` : compactMessage;
      }
    }

    return language === 'zh'
      ? '请检查模型配置或稍后重试。'
      : 'Please check your model settings or try again later.';
  }, [language]);

  const showAiFailure = useCallback((kind: AiRequestKind, error: unknown) => {
    const prefixMap = language === 'zh'
      ? {
          'generate-plan': 'AI 生成失败',
          'modify-plan': 'AI 修改失败',
          'optimize-node': '节点优化失败',
          'decompose-node': '任务拆解失败',
          'modify-selected': '批量修改失败',
          'generate-group': '子任务生成失败',
        }
      : {
          'generate-plan': 'AI generation failed',
          'modify-plan': 'AI modification failed',
          'optimize-node': 'Node optimization failed',
          'decompose-node': 'Task decomposition failed',
          'modify-selected': 'Batch update failed',
          'generate-group': 'Sub-task generation failed',
        };
    const detail = getAiErrorMessage(error);
    const separator = language === 'zh' ? '：' : ': ';
    showStatusRef.current(`${prefixMap[kind]}${detail ? `${separator}${detail}` : ''}`, <AlertCircle className="w-3.5 h-3.5" />);
    return detail;
  }, [getAiErrorMessage, language]);

  const normalizePlanNode = useCallback((node: AIProjectPlan['nodes'][number]) => ({
    ...node,
    description: mode === 'daily' ? '' : (node.description || ''),
    category: mode === 'daily' ? '' : (node.category || ''),
  }), [mode]);

  const getCurrentPlan = useCallback((): AIProjectPlan => ({
    project_name: projectName,
    nodes: nodes.map((node) => ({
      id: node.id,
      label: (node.data as TaskData).label,
      description: (node.data as TaskData).description,
      type: (node.data as TaskData).type,
      category: (node.data as TaskData).category,
      dependencies: edges
        .filter((edge) => edge.target === node.id)
        .map((edge) => ({ id: edge.source, label: edge.label as string })),
    })),
  }), [nodes, edges, projectName]);

  const applyPlan = useCallback((plan: AIProjectPlan, viewportRequest?: { scope: 'all' | 'nodes'; nodeIds?: string[] } | null) => {
    const allEdges: Edge[] = [];
    const edgeTimestamp = Date.now();
    plan.nodes.forEach((node, nodeIndex) => {
      node.dependencies.forEach((dependency, depIndex) => {
        allEdges.push({
          id: `edge-${edgeTimestamp}-${nodeIndex}-${depIndex}`,
          source: dependency.id,
          target: node.id,
          type: 'floating',
          label: dependency.label,
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
          data: { pathType: defaultPathType, connectionMode },
        });
      });
    });

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      plan.nodes.map((rawNode) => {
        const node = normalizePlanNode(rawNode);
        const existing = nodes.find((existingNode) => existingNode.id === node.id);
        return {
          id: node.id,
          type: 'task',
          position: existing?.position || { x: 0, y: 0 },
          selected: existing ? existing.selected : true,
          data: hydrateTaskData({
            ...((existing?.data as TaskData) || {}),
            ...node,
          }),
        };
      }),
      allEdges,
      'TB',
      mode,
    );

    setNodesRef.current(layoutedNodes as Node[]);
    setEdgesRef.current(layoutedEdges);
    takeSnapshotRef.current(layoutedNodes as Node[], layoutedEdges);
    if (viewportRequest) {
      onViewportRequestRef.current?.(viewportRequest);
    }
  }, [connectionMode, defaultPathType, hydrateTaskDataRef, mode, nodes, normalizePlanNode]);

  const beginRequest = useCallback((kind: AiRequestKind) => {
    const controller = new AbortController();
    requestVersionRef.current += 1;
    const requestVersion = requestVersionRef.current;
    abortControllerRef.current = controller;
    activeRequestRef.current = kind;
    return { controller, requestVersion };
  }, []);

  const isRequestCurrent = useCallback((controller: AbortController, requestVersion: number, kind?: AiRequestKind) => {
    if (requestVersionRef.current !== requestVersion) return false;
    if (abortControllerRef.current !== controller) return false;
    if (kind && activeRequestRef.current !== kind) return false;
    return !controller.signal.aborted;
  }, []);

  const clearAllNodeAiProcessing = useCallback(() => {
    setNodesRef.current((currentNodes) => currentNodes.map((node) => (
      node.data?.isAiProcessing
        ? { ...node, data: { ...node.data, isAiProcessing: false } }
        : node
    )));
  }, []);

  const clearNodeAiProcessingByIds = useCallback((nodeIds: string[]) => {
    if (nodeIds.length === 0) return;

    const nodeIdSet = new Set(nodeIds);
    setNodesRef.current((currentNodes) => currentNodes.map((node) => (
      nodeIdSet.has(node.id) && node.data?.isAiProcessing
        ? { ...node, data: { ...node.data, isAiProcessing: false } }
        : node
    )));
  }, []);

  const handleAbort = useCallback((options: AbortOptions = {}) => {
    const controller = abortControllerRef.current;
    const activeRequest = activeRequestRef.current;
    if (!controller && !activeRequest) return;

    controller?.abort();
    requestVersionRef.current += 1;
    abortControllerRef.current = null;
    activeRequestRef.current = null;
    setIsLoading(false);
    setIsNodeAiLoading(false);
    clearAllNodeAiProcessing();

    if (activeRequest === 'generate-plan') {
      onPlanRequestSettledRef.current?.({ status: 'aborted' });
    }

    if (!options.silent) {
      showStatusRef.current(language === 'zh' ? '已停止生成' : 'Generation stopped', <X className="w-3.5 h-3.5" />);
    }
  }, [clearAllNodeAiProcessing, language]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    const { controller, requestVersion } = beginRequest('generate-plan');

    try {
      const plan = await generatePlan(prompt, provider, language, mode, controller.signal, onStreamingChangeRef.current);
      if (!isRequestCurrent(controller, requestVersion, 'generate-plan')) return;
      const allEdges: Edge[] = [];
      const edgeTimestamp = Date.now();
      plan.nodes.forEach((node, nodeIndex) => node.dependencies.forEach((dependency, depIndex) => {
        allEdges.push({
          id: `e-${edgeTimestamp}-${nodeIndex}-${depIndex}`,
          source: dependency.id,
          target: node.id,
          type: 'floating',
          label: dependency.label,
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
          data: { pathType: defaultPathType, connectionMode },
        });
      }));

      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        plan.nodes.map((rawNode) => {
          const node = normalizePlanNode(rawNode);
          return {
          id: node.id,
          type: 'task',
          position: { x: 0, y: 0 },
          data: hydrateTaskDataRef.current({ ...node, status: 'pending' }),
          };
        }),
        allEdges,
        'TB',
        mode,
      );

      setNodesRef.current(layoutedNodes as Node[]);
      setEdgesRef.current(layoutedEdges);
      setProjectNameRef.current(plan.project_name);
      takeSnapshotRef.current(layoutedNodes as Node[], layoutedEdges);
      onViewportRequestRef.current?.({ scope: 'all', nodeIds: layoutedNodes.map((node) => node.id) });
      onPlanRequestSettledRef.current?.({ status: 'success' });
      // 注意：setShowStartDialog(false) 已在 StartDialog 动画逻辑中处理
    } catch (error: any) {
      if (error.name === 'AbortError') {
        if (isRequestCurrent(controller, requestVersion, 'generate-plan')) {
          onPlanRequestSettledRef.current?.({ status: 'aborted' });
        }
      } else if (isRequestCurrent(controller, requestVersion, 'generate-plan')) {
        console.error(error);
        const message = showAiFailure('generate-plan', error);
        onPlanRequestSettledRef.current?.({ status: 'error', message });
      }
    } finally {
      if (isRequestCurrent(controller, requestVersion, 'generate-plan')) {
        setIsLoading(false);
        abortControllerRef.current = null;
        activeRequestRef.current = null;
      }
    }
  }, [prompt, provider, language, mode, defaultPathType, connectionMode, normalizePlanNode, showAiFailure, beginRequest, isRequestCurrent]);

  const handleModify = useCallback(async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    const { controller, requestVersion } = beginRequest('modify-plan');
    setNodesRef.current((currentNodes) => currentNodes.map((node) => ({ ...node, data: { ...node.data, isAiProcessing: true } })));

    try {
      const updatedPlan = await suggestModifications(getCurrentPlan(), prompt, provider, language, mode, controller.signal);
      if (!isRequestCurrent(controller, requestVersion, 'modify-plan')) return;
      if (updatedPlan.suggestion) setSuggestionRef.current(updatedPlan.suggestion);
      if (updatedPlan.nodes && updatedPlan.nodes.length > 0) applyPlan(updatedPlan, { scope: 'all', nodeIds: updatedPlan.nodes.map((node) => node.id) });
    } catch (error: any) {
      if (error.name !== 'AbortError' && isRequestCurrent(controller, requestVersion, 'modify-plan')) {
        console.error(error);
        showAiFailure('modify-plan', error);
      }
    } finally {
      if (isRequestCurrent(controller, requestVersion, 'modify-plan')) {
        setIsLoading(false);
        clearAllNodeAiProcessing();
        abortControllerRef.current = null;
        activeRequestRef.current = null;
      }
    }
  }, [prompt, getCurrentPlan, provider, language, mode, applyPlan, showAiFailure, beginRequest, clearAllNodeAiProcessing, isRequestCurrent]);

  const handleDecompose = useCallback(async () => {
    if (!selectedNodeId) return;
    setIsNodeAiLoading(true);
    const { controller, requestVersion } = beginRequest('decompose-node');
    setNodesRef.current((currentNodes) => currentNodes.map((node) => node.id === selectedNodeId ? { ...node, data: { ...node.data, isAiProcessing: true } } : node));

    try {
      const updatedPlan = await decomposeTask(getCurrentPlan(), selectedNodeId, decomposePrompt, provider, language, mode, controller.signal);
      if (!isRequestCurrent(controller, requestVersion, 'decompose-node')) return;
      applyPlan(updatedPlan, null);
      showStatusRef.current(language === 'zh' ? '拆解已完成' : 'Decomposition completed', <CheckCircle2 className="w-3.5 h-3.5" />);
    } catch (error: any) {
      if (error.name !== 'AbortError' && isRequestCurrent(controller, requestVersion, 'decompose-node')) {
        console.error(error);
        showAiFailure('decompose-node', error);
      }
    } finally {
      if (isRequestCurrent(controller, requestVersion, 'decompose-node')) {
        setIsNodeAiLoading(false);
        clearNodeAiProcessingByIds([selectedNodeId]);
        abortControllerRef.current = null;
        activeRequestRef.current = null;
        setShowDecomposeInputRef.current(false);
      }
    }
  }, [selectedNodeId, getCurrentPlan, decomposePrompt, provider, language, mode, applyPlan, showAiFailure, beginRequest, clearNodeAiProcessingByIds, isRequestCurrent]);

  const handleModifySelected = useCallback(async () => {
    if (!selectedPrompt.trim()) return;
    setIsLoading(true);
    const { controller, requestVersion } = beginRequest('modify-selected');
    const selectedIds = nodes.filter((node) => node.selected).map((node) => node.id);
    setNodesRef.current((currentNodes) => currentNodes.map((node) => selectedIds.includes(node.id) ? { ...node, data: { ...node.data, isAiProcessing: true } } : node));

    try {
      const updatedPlan = await modifySelectedTasks(getCurrentPlan(), selectedIds, selectedPrompt, provider, language, mode, controller.signal);
      if (!isRequestCurrent(controller, requestVersion, 'modify-selected')) return;
      applyPlan(updatedPlan, { scope: 'all', nodeIds: updatedPlan.nodes.map((node) => node.id) });
    } catch (error: any) {
      if (error.name !== 'AbortError' && isRequestCurrent(controller, requestVersion, 'modify-selected')) {
        console.error(error);
        showAiFailure('modify-selected', error);
      }
    } finally {
      if (isRequestCurrent(controller, requestVersion, 'modify-selected')) {
        setIsLoading(false);
        clearNodeAiProcessingByIds(selectedIds);
        abortControllerRef.current = null;
        activeRequestRef.current = null;
      }
    }
  }, [selectedPrompt, nodes, getCurrentPlan, provider, language, mode, applyPlan, showAiFailure, beginRequest, clearNodeAiProcessingByIds, isRequestCurrent]);

  const handleOptimizeSelectedNode = useCallback(async () => {
    if (!selectedNodeId) return;

    const selectedNode = nodes.find((node) => node.id === selectedNodeId);
    if (!selectedNode || selectedNode.type === 'group') return;

    const feedback = language === 'zh'
      ? '请优化当前选中节点及其直接关联内容，使任务表达更清晰、结构更合理；如确有必要可微调关联关系，但保持整体流程自然。'
      : 'Optimize the currently selected node and its directly related context to make the task clearer and the structure more coherent. Adjust nearby relationships only when truly necessary.';

    setIsNodeAiLoading(true);
    const { controller, requestVersion } = beginRequest('optimize-node');
    setNodesRef.current((currentNodes) => currentNodes.map((node) => node.id === selectedNodeId ? { ...node, data: { ...node.data, isAiProcessing: true } } : node));

    try {
      const updatedPlan = await modifySelectedTasks(getCurrentPlan(), [selectedNodeId], feedback, provider, language, mode, controller.signal);
      if (!isRequestCurrent(controller, requestVersion, 'optimize-node')) return;
      applyPlan(updatedPlan, null);
      showStatusRef.current(language === 'zh' ? '节点优化已完成' : 'Node optimization completed', <CheckCircle2 className="w-3.5 h-3.5" />);
    } catch (error: any) {
      if (error.name !== 'AbortError' && isRequestCurrent(controller, requestVersion, 'optimize-node')) {
        console.error(error);
        showAiFailure('optimize-node', error);
      }
    } finally {
      if (isRequestCurrent(controller, requestVersion, 'optimize-node')) {
        setIsNodeAiLoading(false);
        clearNodeAiProcessingByIds([selectedNodeId]);
        abortControllerRef.current = null;
        activeRequestRef.current = null;
      }
    }
  }, [selectedNodeId, nodes, getCurrentPlan, provider, language, mode, applyPlan, showAiFailure, beginRequest, clearNodeAiProcessingByIds, isRequestCurrent]);

  const handleGenerateGroupTasks = useCallback(async () => {
    if (!selectedNodeId) return;
    const node = nodes.find((item) => item.id === selectedNodeId);
    if (!node || !(node.data as TaskData).isGroup) return;

    setIsNodeAiLoading(true);
    const { controller, requestVersion } = beginRequest('generate-group');
    setNodesRef.current((currentNodes) => currentNodes.map((item) => item.id === selectedNodeId ? { ...item, data: { ...item.data, isAiProcessing: true } } : item));

    try {
      const plan = await generateGroupTasks((node.data as TaskData).label, (node.data as TaskData).description, provider, language, mode, controller.signal);
      if (!isRequestCurrent(controller, requestVersion, 'generate-group')) return;
      const timestamp = Date.now();
      const newNodes = plan.nodes.map((rawItem, index) => {
        const item = normalizePlanNode(rawItem);
        return {
        id: `n-${timestamp}-${item.id}`,
        type: 'task',
        parentId: node.id,
        position: { x: 40, y: taskNodeLayout.groupChildStartY + index * taskNodeLayout.groupChildGapY },
        data: hydrateTaskDataRef.current({ ...item, status: 'pending' }),
        };
      });

      setNodesRef.current((currentNodes) => {
        const nextNodes = currentNodes
          .map((item) => item.id === node.id ? { ...item, style: { ...item.style, height: 100 + newNodes.length * taskNodeLayout.groupChildGapY } } : item)
          .concat(newNodes);
        const newEdges: Edge[] = [];
        const edgeTimestamp = Date.now();
        plan.nodes.forEach((item, itemIndex) => item.dependencies.forEach((dependency, depIndex) => {
          newEdges.push({
            id: `e-${edgeTimestamp}-${itemIndex}-${depIndex}`,
            source: `n-${timestamp}-${dependency.id}`,
            target: `n-${timestamp}-${item.id}`,
            type: 'floating',
            label: dependency.label,
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
            data: { pathType: defaultPathType, connectionMode },
          });
        }));

        setEdgesRef.current((currentEdges) => {
          const nextEdges = currentEdges.concat(newEdges);
          takeSnapshotRef.current(nextNodes, nextEdges);
          return nextEdges;
        });

        return nextNodes;
      });
      showStatusRef.current(
        language === 'zh'
          ? `已生成 ${newNodes.length} 个子任务`
          : `Generated ${newNodes.length} sub-tasks`,
        <CheckCircle2 className="w-3.5 h-3.5" />,
      );
    } catch (error: any) {
      if (error.name !== 'AbortError' && isRequestCurrent(controller, requestVersion, 'generate-group')) {
        console.error(error);
        showAiFailure('generate-group', error);
      }
    } finally {
      if (isRequestCurrent(controller, requestVersion, 'generate-group')) {
        setIsNodeAiLoading(false);
        clearNodeAiProcessingByIds([selectedNodeId]);
        abortControllerRef.current = null;
        activeRequestRef.current = null;
      }
    }
  }, [selectedNodeId, nodes, provider, language, mode, defaultPathType, connectionMode, normalizePlanNode, taskNodeLayout.groupChildGapY, taskNodeLayout.groupChildStartY, showAiFailure, beginRequest, clearNodeAiProcessingByIds, isRequestCurrent]);

  return {
    isLoading,
    isNodeAiLoading,
    handleAbort,
    handleGenerate,
    handleModify,
    handleOptimizeSelectedNode,
    handleDecompose,
    handleModifySelected,
    handleGenerateGroupTasks,
  };
}
