import { useCallback, useRef, useState } from 'react';
import type React from 'react';
import { MarkerType, type Edge, type Node } from '@xyflow/react';
import { X } from 'lucide-react';

import { decomposeTask, generateGroupTasks, generatePlan, modifySelectedTasks, suggestModifications } from '../services/aiService';
import { getLayoutedElements } from '../lib/flowLayout';
import type { AIProjectPlan, TaskData, TaskMode } from '../types';

type UseAiOrchestrationParams = {
  nodes: Node[];
  edges: Edge[];
  projectName: string;
  language: 'zh' | 'en';
  mode: TaskMode;
  apiKey?: string;
  defaultPathType: string;
  prompt: string;
  selectedPrompt: string;
  decomposePrompt: string;
  selectedNodeId: string | null;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  setProjectName: (name: string) => void;
  setSuggestion: (value: string | null) => void;
  setShowStartDialog: (value: boolean) => void;
  setShowDecomposeInput: (value: boolean) => void;
  takeSnapshot: (nodes?: Node[], edges?: Edge[]) => void;
  showStatus: (text: string, icon: React.ReactNode) => void;
  hydrateTaskData: (data: Partial<TaskData>) => TaskData;
};

export function useAiOrchestration({
  nodes,
  edges,
  projectName,
  language,
  mode,
  apiKey,
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
}: UseAiOrchestrationParams) {
  const [isLoading, setIsLoading] = useState(false);
  const [isNodeAiLoading, setIsNodeAiLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

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

  const applyPlan = useCallback((plan: AIProjectPlan) => {
    const allEdges: Edge[] = [];
    plan.nodes.forEach((node) => {
      node.dependencies.forEach((dependency) => {
        allEdges.push({
          id: `edge-${dependency.id}-${node.id}`,
          source: dependency.id,
          target: node.id,
          type: 'floating',
          label: dependency.label,
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
          data: { pathType: defaultPathType },
        });
      });
    });

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      plan.nodes.map((node) => {
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
    );

    setNodes(layoutedNodes as Node[]);
    setEdges(layoutedEdges);
    takeSnapshot(layoutedNodes as Node[], layoutedEdges);
  }, [defaultPathType, nodes, hydrateTaskData, setNodes, setEdges, takeSnapshot]);

  const handleAbort = useCallback(() => {
    if (!abortControllerRef.current) return;
    abortControllerRef.current.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
    setIsNodeAiLoading(false);
    setNodes((currentNodes) => currentNodes.map((node) => ({
      ...node,
      data: { ...node.data, isAiProcessing: false },
    })));
    showStatus(language === 'zh' ? '已停止生成' : 'Generation stopped', <X className="w-3.5 h-3.5" />);
  }, [language, setNodes, showStatus]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const plan = await generatePlan(prompt, apiKey, language, mode, controller.signal);
      const allEdges: Edge[] = [];
      plan.nodes.forEach((node) => node.dependencies.forEach((dependency) => {
        allEdges.push({
          id: `e-${dependency.id}-${node.id}`,
          source: dependency.id,
          target: node.id,
          type: 'floating',
          label: dependency.label,
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
          data: { pathType: defaultPathType },
        });
      }));

      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        plan.nodes.map((node) => ({
          id: node.id,
          type: 'task',
          position: { x: 0, y: 0 },
          data: hydrateTaskData({ ...node, status: 'pending' }),
        })),
        allEdges,
      );

      setNodes(layoutedNodes as Node[]);
      setEdges(layoutedEdges);
      setProjectName(plan.project_name);
      takeSnapshot(layoutedNodes as Node[], layoutedEdges);
      setShowStartDialog(false);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error(error);
      }
    } finally {
      setIsLoading(false);
      if (abortControllerRef.current === controller) abortControllerRef.current = null;
    }
  }, [prompt, apiKey, language, mode, defaultPathType, hydrateTaskData, setNodes, setEdges, setProjectName, takeSnapshot, setShowStartDialog]);

  const handleModify = useCallback(async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setNodes((currentNodes) => currentNodes.map((node) => ({ ...node, data: { ...node.data, isAiProcessing: true } })));

    try {
      const updatedPlan = await suggestModifications(getCurrentPlan(), prompt, apiKey, language, mode, controller.signal);
      if (updatedPlan.suggestion) setSuggestion(updatedPlan.suggestion);
      if (updatedPlan.nodes && updatedPlan.nodes.length > 0) applyPlan(updatedPlan);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error(error);
      }
    } finally {
      setIsLoading(false);
      setNodes((currentNodes) => currentNodes.map((node) => ({ ...node, data: { ...node.data, isAiProcessing: false } })));
      if (abortControllerRef.current === controller) abortControllerRef.current = null;
    }
  }, [prompt, getCurrentPlan, apiKey, language, mode, setSuggestion, applyPlan, setNodes]);

  const handleDecompose = useCallback(async () => {
    if (!selectedNodeId) return;
    setIsNodeAiLoading(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setNodes((currentNodes) => currentNodes.map((node) => node.id === selectedNodeId ? { ...node, data: { ...node.data, isAiProcessing: true } } : node));

    try {
      const updatedPlan = await decomposeTask(getCurrentPlan(), selectedNodeId, decomposePrompt, apiKey, language, mode, controller.signal);
      applyPlan(updatedPlan);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error(error);
      }
    } finally {
      setIsNodeAiLoading(false);
      setNodes((currentNodes) => currentNodes.map((node) => node.id === selectedNodeId ? { ...node, data: { ...node.data, isAiProcessing: false } } : node));
      if (abortControllerRef.current === controller) abortControllerRef.current = null;
      setShowDecomposeInput(false);
    }
  }, [selectedNodeId, getCurrentPlan, decomposePrompt, apiKey, language, mode, applyPlan, setNodes, setShowDecomposeInput]);

  const handleModifySelected = useCallback(async () => {
    if (!selectedPrompt.trim()) return;
    setIsLoading(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const selectedIds = nodes.filter((node) => node.selected).map((node) => node.id);
    setNodes((currentNodes) => currentNodes.map((node) => selectedIds.includes(node.id) ? { ...node, data: { ...node.data, isAiProcessing: true } } : node));

    try {
      const updatedPlan = await modifySelectedTasks(getCurrentPlan(), selectedIds, selectedPrompt, apiKey, language, mode, controller.signal);
      applyPlan(updatedPlan);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error(error);
      }
    } finally {
      setIsLoading(false);
      setNodes((currentNodes) => currentNodes.map((node) => selectedIds.includes(node.id) ? { ...node, data: { ...node.data, isAiProcessing: false } } : node));
      if (abortControllerRef.current === controller) abortControllerRef.current = null;
    }
  }, [selectedPrompt, nodes, getCurrentPlan, apiKey, language, mode, applyPlan, setNodes]);

  const handleGenerateGroupTasks = useCallback(async () => {
    if (!selectedNodeId) return;
    const node = nodes.find((item) => item.id === selectedNodeId);
    if (!node || !(node.data as TaskData).isGroup) return;

    setIsNodeAiLoading(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setNodes((currentNodes) => currentNodes.map((item) => item.id === selectedNodeId ? { ...item, data: { ...item.data, isAiProcessing: true } } : item));

    try {
      const plan = await generateGroupTasks((node.data as TaskData).label, (node.data as TaskData).description, apiKey, language, mode, controller.signal);
      const timestamp = Date.now();
      const newNodes = plan.nodes.map((item, index) => ({
        id: `n-${timestamp}-${item.id}`,
        type: 'task',
        parentId: node.id,
        position: { x: 40, y: 80 + index * 180 },
        data: hydrateTaskData({ ...item, status: 'pending' }),
      }));

      setNodes((currentNodes) => {
        const nextNodes = currentNodes
          .map((item) => item.id === node.id ? { ...item, style: { ...item.style, height: 100 + newNodes.length * 180 } } : item)
          .concat(newNodes);
        const newEdges: Edge[] = [];
        plan.nodes.forEach((item) => item.dependencies.forEach((dependency) => {
          newEdges.push({
            id: `e-${timestamp}-${dependency.id}-${item.id}`,
            source: `n-${timestamp}-${dependency.id}`,
            target: `n-${timestamp}-${item.id}`,
            type: 'floating',
            label: dependency.label,
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
            data: { pathType: defaultPathType },
          });
        }));

        setEdges((currentEdges) => {
          const nextEdges = currentEdges.concat(newEdges);
          takeSnapshot(nextNodes, nextEdges);
          return nextEdges;
        });

        return nextNodes;
      });
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error(error);
      }
    } finally {
      setIsNodeAiLoading(false);
      setNodes((currentNodes) => currentNodes.map((item) => item.id === selectedNodeId ? { ...item, data: { ...item.data, isAiProcessing: false } } : item));
      if (abortControllerRef.current === controller) abortControllerRef.current = null;
    }
  }, [selectedNodeId, nodes, apiKey, language, mode, hydrateTaskData, defaultPathType, setNodes, setEdges, takeSnapshot]);

  return {
    isLoading,
    isNodeAiLoading,
    handleAbort,
    handleGenerate,
    handleModify,
    handleDecompose,
    handleModifySelected,
    handleGenerateGroupTasks,
  };
}
