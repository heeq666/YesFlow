import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';
import { MarkerType, type Edge, type Node } from '@xyflow/react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

import { decomposeTask, generateGroupTasks, modifySelectedTasks } from '../services/aiService';
import { getLayoutedElements } from '../lib/flowLayout';
import { getTaskNodeLayout } from '../constants/taskNodeLayout';
import type {
  AIProjectPlan,
  ApiProvider,
  ConnectionMode,
  ProjectRecord,
  RecordAiState,
  TaskData,
  TaskMode,
} from '../types';

type RecordNodeAiRequestKind =
  | 'optimize-node'
  | 'decompose-node'
  | 'modify-selected'
  | 'generate-group';

type RuntimeTask = {
  id: string;
  recordId: string;
  nodeIds: string[];
  kind: RecordNodeAiRequestKind;
  controller: AbortController;
};

type UseRecordNodeAiTasksParams = {
  currentRecordId: string | null;
  nodes: Node[];
  edges: Edge[];
  projectName: string;
  language: 'zh' | 'en';
  mode: TaskMode;
  provider: ApiProvider;
  defaultPathType: string;
  connectionMode: ConnectionMode;
  selectedPrompt: string;
  decomposePrompt: string;
  selectedNodeId: string | null;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  setProjectName: (name: string) => void;
  takeSnapshot: (nodes?: Node[], edges?: Edge[]) => void;
  showStatus: (text: string, icon: React.ReactNode) => void;
  hydrateTaskData: (data: Partial<TaskData>) => TaskData;
  ensureCurrentRecordSnapshot: () => ProjectRecord;
  updateRecord: (recordId: string, updater: (record: ProjectRecord) => ProjectRecord | null) => ProjectRecord | null;
};

function dedupeIds(ids: string[]) {
  return ids.filter((id, index) => ids.indexOf(id) === index);
}

export function useRecordNodeAiTasks({
  currentRecordId,
  nodes,
  edges,
  projectName,
  language,
  mode,
  provider,
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
}: UseRecordNodeAiTasksParams) {
  const [recordAiStates, setRecordAiStates] = useState<Record<string, RecordAiState>>({});
  const runtimeTasksRef = useRef<Record<string, RuntimeTask>>({});
  const currentRecordIdRef = useRef<string | null>(currentRecordId);
  const setNodesRef = useRef(setNodes);
  const setEdgesRef = useRef(setEdges);
  const setProjectNameRef = useRef(setProjectName);
  const takeSnapshotRef = useRef(takeSnapshot);
  const showStatusRef = useRef(showStatus);
  const hydrateTaskDataRef = useRef(hydrateTaskData);
  const taskNodeLayout = getTaskNodeLayout(mode);

  useEffect(() => { currentRecordIdRef.current = currentRecordId; }, [currentRecordId]);
  useEffect(() => { setNodesRef.current = setNodes; }, [setNodes]);
  useEffect(() => { setEdgesRef.current = setEdges; }, [setEdges]);
  useEffect(() => { setProjectNameRef.current = setProjectName; }, [setProjectName]);
  useEffect(() => { takeSnapshotRef.current = takeSnapshot; }, [takeSnapshot]);
  useEffect(() => { showStatusRef.current = showStatus; }, [showStatus]);
  useEffect(() => { hydrateTaskDataRef.current = hydrateTaskData; }, [hydrateTaskData]);

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

  const formatFailureMessage = useCallback((kind: RecordNodeAiRequestKind, error: unknown) => {
    const prefixMap = language === 'zh'
      ? {
          'optimize-node': '节点优化失败',
          'decompose-node': '任务拆解失败',
          'modify-selected': '批量修改失败',
          'generate-group': '子任务生成失败',
        }
      : {
          'optimize-node': 'Node optimization failed',
          'decompose-node': 'Task decomposition failed',
          'modify-selected': 'Batch update failed',
          'generate-group': 'Sub-task generation failed',
        };
    const detail = getAiErrorMessage(error);
    const separator = language === 'zh' ? '：' : ': ';
    return `${prefixMap[kind]}${detail ? `${separator}${detail}` : ''}`;
  }, [getAiErrorMessage, language]);

  const normalizePlanNode = useCallback((node: AIProjectPlan['nodes'][number]) => ({
    ...node,
    description: mode === 'daily' ? '' : (node.description || ''),
    category: mode === 'daily' ? '' : (node.category || ''),
  }), [mode]);

  const getPlanFromRecord = useCallback((record: ProjectRecord): AIProjectPlan => ({
    project_name: record.name,
    nodes: record.nodes.map((node) => ({
      id: node.id,
      label: (node.data as TaskData).label,
      description: (node.data as TaskData).description,
      type: (node.data as TaskData).type,
      category: (node.data as TaskData).category,
      dependencies: record.edges
        .filter((edge) => edge.target === node.id)
        .map((edge) => ({ id: edge.source, label: edge.label as string })),
    })),
  }), []);

  const layoutPlanForRecord = useCallback((record: ProjectRecord, plan: AIProjectPlan) => {
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
        const existing = record.nodes.find((existingNode) => existingNode.id === node.id);
        return {
          id: node.id,
          type: 'task',
          position: existing?.position || { x: 0, y: 0 },
          selected: existing ? existing.selected : true,
          data: hydrateTaskDataRef.current({
            ...((existing?.data as TaskData) || {}),
            ...node,
          }),
        };
      }),
      allEdges,
      'TB',
      mode,
    );

    return {
      projectName: plan.project_name || record.name,
      nodes: layoutedNodes as Node[],
      edges: layoutedEdges,
    };
  }, [connectionMode, defaultPathType, mode, normalizePlanNode]);

  const appendGroupTasksToRecord = useCallback((record: ProjectRecord, groupId: string, plan: AIProjectPlan) => {
    const groupNode = record.nodes.find((node) => node.id === groupId);
    if (!groupNode) return null;

    const timestamp = Date.now();
    const newNodes = plan.nodes.map((rawItem, index) => {
      const item = normalizePlanNode(rawItem);
      return {
        id: `n-${timestamp}-${item.id}`,
        type: 'task',
        parentId: groupId,
        position: { x: 40, y: taskNodeLayout.groupChildStartY + index * taskNodeLayout.groupChildGapY },
        data: hydrateTaskDataRef.current({ ...item, status: 'pending' }),
      } as Node;
    });

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

    return {
      projectName: record.name,
      nodes: record.nodes
        .map((item) => item.id === groupId
          ? { ...item, style: { ...item.style, height: 100 + newNodes.length * taskNodeLayout.groupChildGapY } }
          : item)
        .concat(newNodes),
      edges: record.edges.concat(newEdges),
    };
  }, [connectionMode, defaultPathType, normalizePlanNode, taskNodeLayout.groupChildGapY, taskNodeLayout.groupChildStartY]);

  const applyRecordSnapshot = useCallback((
    recordId: string,
    snapshot: { projectName: string; nodes: Node[]; edges: Edge[] },
  ) => {
    const updatedRecord = updateRecord(recordId, (record) => ({
      ...record,
      name: snapshot.projectName || record.name,
      nodes: snapshot.nodes,
      edges: snapshot.edges,
      language,
      mode,
      lastModified: Date.now(),
    }));

    if (currentRecordIdRef.current === recordId) {
      setNodesRef.current(snapshot.nodes);
      setEdgesRef.current(snapshot.edges);
      setProjectNameRef.current(snapshot.projectName);
      takeSnapshotRef.current(snapshot.nodes, snapshot.edges);
    }

    return updatedRecord;
  }, [language, mode, updateRecord]);

  const syncRecordStateFromRuntime = useCallback((
    recordId: string,
    options?: { latestStatus?: 'success' | 'error'; latestMessage?: string; unread?: boolean },
  ) => {
    const runtimeTasks = Object.values(runtimeTasksRef.current) as RuntimeTask[];
    const runningTasks = runtimeTasks.filter((task) => task.recordId === recordId);
    const runningNodeIds = dedupeIds(runningTasks.flatMap((task) => task.nodeIds));

    setRecordAiStates((prev) => {
      const current = prev[recordId] || { runningNodeIds: [] };
      const nextState: RecordAiState = {
        ...current,
        runningNodeIds,
      };

      if (options?.latestStatus) {
        nextState.latestStatus = options.latestStatus;
        nextState.latestMessage = options.latestMessage;
        nextState.latestUpdatedAt = Date.now();
        nextState.unread = options.unread;
      }

      return { ...prev, [recordId]: nextState };
    });
  }, []);

  const createRuntimeTask = useCallback((recordId: string, nodeIds: string[], kind: RecordNodeAiRequestKind) => {
    const taskId = `record-ai-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    runtimeTasksRef.current[taskId] = {
      id: taskId,
      recordId,
      nodeIds: dedupeIds(nodeIds),
      kind,
      controller: new AbortController(),
    };
    syncRecordStateFromRuntime(recordId);
    return runtimeTasksRef.current[taskId];
  }, [syncRecordStateFromRuntime]);

  const clearRuntimeTask = useCallback((taskId: string) => {
    const task = runtimeTasksRef.current[taskId];
    if (!task) return null;
    delete runtimeTasksRef.current[taskId];
    return task;
  }, []);

  const finalizeRuntimeTask = useCallback((
    taskId: string,
    options?: { latestStatus?: 'success' | 'error'; latestMessage?: string },
  ) => {
    const task = clearRuntimeTask(taskId);
    if (!task) return null;

    syncRecordStateFromRuntime(task.recordId, options?.latestStatus ? {
      latestStatus: options.latestStatus,
      latestMessage: options.latestMessage,
      unread: currentRecordIdRef.current !== task.recordId,
    } : undefined);

    return task;
  }, [clearRuntimeTask, syncRecordStateFromRuntime]);

  const abortTasksForRecordNodes = useCallback((recordId: string, nodeIds: string[], options?: { silent?: boolean }) => {
    const nodeIdSet = new Set(nodeIds);
    const matchingTaskIds = (Object.values(runtimeTasksRef.current) as RuntimeTask[])
      .filter((task) => task.recordId === recordId && task.nodeIds.some((nodeId) => nodeIdSet.has(nodeId)))
      .map((task) => task.id);

    if (matchingTaskIds.length === 0) return;

    matchingTaskIds.forEach((taskId) => {
      const task = runtimeTasksRef.current[taskId];
      if (!task) return;
      task.controller.abort();
      finalizeRuntimeTask(taskId);
    });

    if (!options?.silent) {
      showStatusRef.current(language === 'zh' ? '已停止生成' : 'Generation stopped', <X className="w-3.5 h-3.5" />);
    }
  }, [finalizeRuntimeTask, language]);

  const isRecordTaskRunning = useCallback((recordId: string | null, nodeIds?: string[]) => {
    if (!recordId) return false;

    const runningNodeIds = recordAiStates[recordId]?.runningNodeIds || [];
    if (!nodeIds || nodeIds.length === 0) {
      return runningNodeIds.length > 0;
    }

    return nodeIds.some((nodeId) => runningNodeIds.includes(nodeId));
  }, [recordAiStates]);

  const markRecordAiStateSeen = useCallback((recordId: string) => {
    setRecordAiStates((prev) => {
      const current = prev[recordId];
      if (!current?.unread) return prev;
      return {
        ...prev,
        [recordId]: {
          ...current,
          unread: false,
        },
      };
    });
  }, []);

  const handleModifySelected = useCallback(async () => {
    if (!selectedPrompt.trim()) return;

    const selectedIds = nodes.filter((node) => node.selected).map((node) => node.id);
    if (selectedIds.length === 0) return;

    const record = ensureCurrentRecordSnapshot();
    const task = createRuntimeTask(record.id, selectedIds, 'modify-selected');

    try {
      const updatedPlan = await modifySelectedTasks(
        getPlanFromRecord(record),
        selectedIds,
        selectedPrompt,
        provider,
        language,
        mode,
        task.controller.signal,
      );

      if (!runtimeTasksRef.current[task.id] || task.controller.signal.aborted) return;

      const snapshot = layoutPlanForRecord(record, updatedPlan);
      applyRecordSnapshot(record.id, snapshot);

      if (currentRecordIdRef.current === record.id) {
        showStatusRef.current(language === 'zh' ? '批量修改已完成' : 'Batch update completed', <CheckCircle2 className="w-3.5 h-3.5" />);
      }

      finalizeRuntimeTask(task.id, {
        latestStatus: 'success',
        latestMessage: language === 'zh' ? '批量修改已完成' : 'Batch update completed',
      });
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      if (!runtimeTasksRef.current[task.id]) return;

      const message = formatFailureMessage('modify-selected', error);
      if (currentRecordIdRef.current === record.id) {
        showStatusRef.current(message, <AlertCircle className="w-3.5 h-3.5" />);
      }

      finalizeRuntimeTask(task.id, {
        latestStatus: 'error',
        latestMessage: message,
      });
    }
  }, [
    selectedPrompt,
    nodes,
    ensureCurrentRecordSnapshot,
    createRuntimeTask,
    getPlanFromRecord,
    provider,
    language,
    mode,
    layoutPlanForRecord,
    applyRecordSnapshot,
    finalizeRuntimeTask,
    formatFailureMessage,
  ]);

  const handleOptimizeSelectedNode = useCallback(async () => {
    if (!selectedNodeId) return;

    const selectedNode = nodes.find((node) => node.id === selectedNodeId);
    if (!selectedNode || selectedNode.type === 'group') return;

    const record = ensureCurrentRecordSnapshot();
    const task = createRuntimeTask(record.id, [selectedNodeId], 'optimize-node');
    const feedback = language === 'zh'
      ? '请优化当前选中节点及其直接关联内容，使任务表达更清晰、结构更合理；如确有必要可微调关联关系，但保持整体流程自然。'
      : 'Optimize the currently selected node and its directly related context to make the task clearer and the structure more coherent. Adjust nearby relationships only when truly necessary.';

    try {
      const updatedPlan = await modifySelectedTasks(
        getPlanFromRecord(record),
        [selectedNodeId],
        feedback,
        provider,
        language,
        mode,
        task.controller.signal,
      );

      if (!runtimeTasksRef.current[task.id] || task.controller.signal.aborted) return;

      const snapshot = layoutPlanForRecord(record, updatedPlan);
      applyRecordSnapshot(record.id, snapshot);

      if (currentRecordIdRef.current === record.id) {
        showStatusRef.current(language === 'zh' ? '节点优化已完成' : 'Node optimization completed', <CheckCircle2 className="w-3.5 h-3.5" />);
      }

      finalizeRuntimeTask(task.id, {
        latestStatus: 'success',
        latestMessage: language === 'zh' ? '节点优化已完成' : 'Node optimization completed',
      });
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      if (!runtimeTasksRef.current[task.id]) return;

      const message = formatFailureMessage('optimize-node', error);
      if (currentRecordIdRef.current === record.id) {
        showStatusRef.current(message, <AlertCircle className="w-3.5 h-3.5" />);
      }

      finalizeRuntimeTask(task.id, {
        latestStatus: 'error',
        latestMessage: message,
      });
    }
  }, [
    selectedNodeId,
    nodes,
    ensureCurrentRecordSnapshot,
    createRuntimeTask,
    language,
    getPlanFromRecord,
    provider,
    mode,
    layoutPlanForRecord,
    applyRecordSnapshot,
    finalizeRuntimeTask,
    formatFailureMessage,
  ]);

  const handleDecompose = useCallback(async () => {
    if (!selectedNodeId) return;

    const record = ensureCurrentRecordSnapshot();
    const task = createRuntimeTask(record.id, [selectedNodeId], 'decompose-node');

    try {
      const updatedPlan = await decomposeTask(
        getPlanFromRecord(record),
        selectedNodeId,
        decomposePrompt,
        provider,
        language,
        mode,
        task.controller.signal,
      );

      if (!runtimeTasksRef.current[task.id] || task.controller.signal.aborted) return;

      const snapshot = layoutPlanForRecord(record, updatedPlan);
      applyRecordSnapshot(record.id, snapshot);

      if (currentRecordIdRef.current === record.id) {
        showStatusRef.current(language === 'zh' ? '拆解已完成' : 'Decomposition completed', <CheckCircle2 className="w-3.5 h-3.5" />);
      }

      finalizeRuntimeTask(task.id, {
        latestStatus: 'success',
        latestMessage: language === 'zh' ? '拆解已完成' : 'Decomposition completed',
      });
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      if (!runtimeTasksRef.current[task.id]) return;

      const message = formatFailureMessage('decompose-node', error);
      if (currentRecordIdRef.current === record.id) {
        showStatusRef.current(message, <AlertCircle className="w-3.5 h-3.5" />);
      }

      finalizeRuntimeTask(task.id, {
        latestStatus: 'error',
        latestMessage: message,
      });
    }
  }, [
    selectedNodeId,
    ensureCurrentRecordSnapshot,
    createRuntimeTask,
    getPlanFromRecord,
    decomposePrompt,
    provider,
    language,
    mode,
    layoutPlanForRecord,
    applyRecordSnapshot,
    finalizeRuntimeTask,
    formatFailureMessage,
  ]);

  const handleGenerateGroupTasks = useCallback(async () => {
    if (!selectedNodeId) return;

    const record = ensureCurrentRecordSnapshot();
    const recordNode = record.nodes.find((node) => node.id === selectedNodeId);
    if (!recordNode || !(recordNode.data as TaskData).isGroup) return;

    const task = createRuntimeTask(record.id, [selectedNodeId], 'generate-group');

    try {
      const plan = await generateGroupTasks(
        (recordNode.data as TaskData).label,
        (recordNode.data as TaskData).description,
        provider,
        language,
        mode,
        task.controller.signal,
      );

      if (!runtimeTasksRef.current[task.id] || task.controller.signal.aborted) return;

      const snapshot = appendGroupTasksToRecord(record, selectedNodeId, plan);
      if (!snapshot) {
        finalizeRuntimeTask(task.id);
        return;
      }

      applyRecordSnapshot(record.id, snapshot);

      if (currentRecordIdRef.current === record.id) {
        showStatusRef.current(
          language === 'zh'
            ? `已生成 ${plan.nodes.length} 个子任务`
            : `Generated ${plan.nodes.length} sub-tasks`,
          <CheckCircle2 className="w-3.5 h-3.5" />,
        );
      }

      finalizeRuntimeTask(task.id, {
        latestStatus: 'success',
        latestMessage: language === 'zh'
          ? `已生成 ${plan.nodes.length} 个子任务`
          : `Generated ${plan.nodes.length} sub-tasks`,
      });
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      if (!runtimeTasksRef.current[task.id]) return;

      const message = formatFailureMessage('generate-group', error);
      if (currentRecordIdRef.current === record.id) {
        showStatusRef.current(message, <AlertCircle className="w-3.5 h-3.5" />);
      }

      finalizeRuntimeTask(task.id, {
        latestStatus: 'error',
        latestMessage: message,
      });
    }
  }, [
    selectedNodeId,
    ensureCurrentRecordSnapshot,
    createRuntimeTask,
    provider,
    language,
    mode,
    appendGroupTasksToRecord,
    applyRecordSnapshot,
    finalizeRuntimeTask,
    formatFailureMessage,
  ]);

  return {
    recordAiStates,
    isRecordTaskRunning,
    markRecordAiStateSeen,
    abortTasksForRecordNodes,
    handleModifySelected,
    handleOptimizeSelectedNode,
    handleDecompose,
    handleGenerateGroupTasks,
  };
}
