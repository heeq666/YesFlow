import React from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import type { Edge, Node } from '@xyflow/react';
import {
  ArrowLeftRight,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Layers3,
  Link2,
  Sparkles,
  Wrench,
} from 'lucide-react';

import SidebarCalendarView from './SidebarCalendarView';
import CustomScrollArea from './CustomScrollArea';
import { DocumentToolEmpty, DocumentToolContent } from './DocumentTool';
import { LinkToolEmpty, LinkToolContent } from './LinkTool';
import {
  getAvailableNodeTools,
  getToolConfig,
  getToolLabel,
  getToolSnapshot,
} from './NodeToolConfig';
import { ScheduleToolEmpty, ScheduleToolContent } from './ScheduleTool';
import { TableToolEmpty, TableToolContent } from './TableTool';
import type { NodeToolType, Settings, TaskData } from '../types';
import { ensureToolState, formatScheduleSummary, getNodeToolLinks } from '../utils/nodeTools';

type RightToolSidebarProps = {
  language: 'zh' | 'en';
  settings: Settings;
  selectedNode?: Node | null;
  nodeClickRevealNonce: number;
  toolPanelRequest?: { nodeId: string; tool: NodeToolType; nonce: number } | null;
  nodes: Node[];
  edges: Edge[];
  onUpdateNodeData: (id: string, updates: Partial<TaskData>) => void;
  onJumpToNode: (nodeId: string) => void;
  onPanelWidthChange: (width: number) => void;
  onCalendarCollapsedChange: (collapsed: boolean) => void;
  onToggleVisibility: (visible: boolean) => void;
};

type WorkspaceView = 'overview' | NodeToolType;
type UtilityTab = 'calendar' | 'links';

const MIN_PANEL_WIDTH = 400;
const MAX_PANEL_WIDTH = 760;
const COMPACT_PANEL_WIDTH = 420;
const WIDE_PANEL_WIDTH = 680;
const UTILITY_DOCK_LAYOUT_ID = 'right-tool-sidebar-utility-dock';
const CALENDAR_SURFACE_LAYOUT_ID = 'right-tool-sidebar-calendar-surface';

const TOOL_REGISTRY: Record<
  NodeToolType,
  {
    Empty: React.ComponentType<{ language: 'zh' | 'en'; onActivate: () => void }>;
    Content: React.ComponentType<{
      language: 'zh' | 'en';
      nodeData: TaskData;
      updateNodeTools: (tools: TaskData['tools']) => void;
    }>;
  }
> = {
  table: { Empty: TableToolEmpty, Content: TableToolContent },
  document: { Empty: DocumentToolEmpty, Content: DocumentToolContent },
  link: { Empty: LinkToolEmpty, Content: LinkToolContent },
  schedule: { Empty: ScheduleToolEmpty, Content: ScheduleToolContent },
};

const STATUS_LABELS = {
  zh: {
    pending: '待开始',
    'in-progress': '进行中',
    completed: '已完成',
    failed: '已阻塞',
  },
  en: {
    pending: 'Pending',
    'in-progress': 'In Progress',
    completed: 'Completed',
    failed: 'Blocked',
  },
} as const;

const STATUS_TONES = {
  pending: 'bg-neutral-100 text-neutral-500',
  'in-progress': 'bg-sky-50 text-sky-600',
  completed: 'bg-emerald-50 text-emerald-600',
  failed: 'bg-rose-50 text-rose-600',
} as const;

function getNodeTypeLabel(nodeData: TaskData, language: 'zh' | 'en') {
  if (nodeData.typeLabel) return nodeData.typeLabel;

  const typeMap = {
    zh: { planning: '规划', execution: '执行', verification: '验证' },
    en: { planning: 'Planning', execution: 'Execution', verification: 'Verification' },
  };

  return typeMap[language][nodeData.type as keyof typeof typeMap.zh] || nodeData.type;
}

function getRailBadgeClasses(kind: ReturnType<typeof getToolSnapshot>['railBadge']['kind']) {
  switch (kind) {
    case 'disabled':
      return 'bg-neutral-100 text-neutral-400';
    case 'empty':
      return 'bg-white text-amber-500';
    case 'dot':
      return 'bg-primary text-white';
    case 'count':
      return 'bg-neutral-900 text-white';
    default:
      return 'bg-neutral-100 text-neutral-400';
  }
}

function getAccentTone(accentClass?: string) {
  switch (accentClass) {
    case 'bg-sky-500':
      return {
        solid: 'bg-sky-500',
        soft: 'bg-sky-50',
        tint: 'bg-sky-500/12',
        text: 'text-sky-600',
        ring: 'ring-sky-200/80',
        border: 'border-sky-200',
        glow: 'shadow-[0_18px_40px_-24px_rgba(14,165,233,0.65)]',
      };
    case 'bg-emerald-500':
      return {
        solid: 'bg-emerald-500',
        soft: 'bg-emerald-50',
        tint: 'bg-emerald-500/12',
        text: 'text-emerald-600',
        ring: 'ring-emerald-200/80',
        border: 'border-emerald-200',
        glow: 'shadow-[0_18px_40px_-24px_rgba(16,185,129,0.6)]',
      };
    case 'bg-violet-500':
      return {
        solid: 'bg-violet-500',
        soft: 'bg-violet-50',
        tint: 'bg-violet-500/12',
        text: 'text-violet-600',
        ring: 'ring-violet-200/80',
        border: 'border-violet-200',
        glow: 'shadow-[0_18px_40px_-24px_rgba(139,92,246,0.6)]',
      };
    case 'bg-amber-500':
      return {
        solid: 'bg-amber-500',
        soft: 'bg-amber-50',
        tint: 'bg-amber-500/12',
        text: 'text-amber-600',
        ring: 'ring-amber-200/80',
        border: 'border-amber-200',
        glow: 'shadow-[0_18px_40px_-24px_rgba(245,158,11,0.6)]',
      };
    default:
      return {
        solid: 'bg-primary',
        soft: 'bg-primary/10',
        tint: 'bg-primary/10',
        text: 'text-primary',
        ring: 'ring-primary/20',
        border: 'border-primary/20',
        glow: 'shadow-[0_18px_40px_-24px_rgba(37,99,235,0.55)]',
      };
  }
}

export default function RightToolSidebar({
  language,
  settings,
  selectedNode,
  nodeClickRevealNonce,
  toolPanelRequest,
  nodes,
  edges,
  onUpdateNodeData,
  onJumpToNode,
  onPanelWidthChange,
  onCalendarCollapsedChange,
  onToggleVisibility,
}: RightToolSidebarProps) {
  const nodeData = selectedNode?.data as TaskData | undefined;
  const isDarkTheme = settings.themeMode === 'dark';
  const panelWidth = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, settings.nodeTools.panelWidth || 480));
  const isWideMode = Math.abs(panelWidth - WIDE_PANEL_WIDTH) <= Math.abs(panelWidth - COMPACT_PANEL_WIDTH);
  const hasCalendar = settings.nodeTools.calendar.enabled && settings.nodeTools.enabledTools.schedule;
  const availableTools = React.useMemo(
    () => getAvailableNodeTools(settings.nodeTools.enabledTools),
    [settings.nodeTools.enabledTools],
  );
  const selectedLinks = React.useMemo(() => getNodeToolLinks(nodeData?.tools?.link), [nodeData?.tools?.link]);
  const toolViews = React.useMemo(
    () =>
      availableTools.map((tool) => ({
        tool,
        snapshot: nodeData && !nodeData.isGroup ? getToolSnapshot(tool.id, nodeData, language) : null,
      })),
    [availableTools, language, nodeData],
  );
  const [workspaceView, setWorkspaceView] = React.useState<WorkspaceView>('overview');
  const [activeUtilityTab, setActiveUtilityTab] = React.useState<UtilityTab>('calendar');
  const [isUtilityCollapsed, setIsUtilityCollapsed] = React.useState(settings.nodeTools.calendar.collapsed);

  const lastActiveTool = React.useMemo<NodeToolType | null>(() => {
    if (!selectedNode || !nodeData || nodeData.isGroup || availableTools.length === 0) return null;
    const preferred = nodeData.tools?.activeTool;
    return availableTools.some((tool) => tool.id === preferred) ? preferred || null : availableTools[0].id;
  }, [availableTools, nodeData, selectedNode]);

  React.useEffect(() => {
    setWorkspaceView('overview');
  }, [selectedNode?.id, nodeClickRevealNonce]);

  React.useEffect(() => {
    if (!toolPanelRequest || toolPanelRequest.nodeId !== selectedNode?.id) return;
    setWorkspaceView(toolPanelRequest.tool);
  }, [toolPanelRequest, selectedNode?.id]);

  React.useEffect(() => {
    if (hasCalendar) {
      setActiveUtilityTab('calendar');
      setIsUtilityCollapsed(workspaceView === 'overview' ? false : settings.nodeTools.calendar.collapsed);
      return;
    }

    if (selectedLinks.length > 0) {
      setActiveUtilityTab('links');
      setIsUtilityCollapsed(false);
    }
  }, [hasCalendar, selectedLinks.length, settings.nodeTools.calendar.collapsed, selectedNode?.id, workspaceView]);

  const updateNodeTools = React.useCallback(
    (nextTools: TaskData['tools']) => {
      if (!selectedNode || !nodeData) return;
      onUpdateNodeData(selectedNode.id, { tools: nextTools });
    },
    [nodeData, onUpdateNodeData, selectedNode],
  );

  const selectTool = React.useCallback(
    (tool: NodeToolType) => {
      if (!selectedNode || !nodeData) return;
      updateNodeTools({
        ...(nodeData.tools || {}),
        activeTool: tool,
      });
      setWorkspaceView(tool);
    },
    [nodeData, selectedNode, updateNodeTools],
  );

  const activateTool = React.useCallback(
    (tool: NodeToolType) => {
      if (!nodeData) return;
      updateNodeTools(ensureToolState(nodeData, tool, language));
      setWorkspaceView(tool);
    },
    [language, nodeData, updateNodeTools],
  );

  const activeToolId =
    workspaceView === 'overview'
      ? lastActiveTool
      : availableTools.some((tool) => tool.id === workspaceView)
        ? workspaceView
        : lastActiveTool;

  const activeToolConfig = activeToolId ? getToolConfig(activeToolId) : null;
  const activeToolTone = getAccentTone(activeToolConfig?.accentClass);
  const activeToolSnapshot = activeToolId && nodeData ? getToolSnapshot(activeToolId, nodeData, language) : null;
  const enabledToolCount = toolViews.filter((entry) => entry.snapshot?.enabled).length;
  const populatedToolCount = toolViews.filter((entry) => {
    const kind = entry.snapshot?.railBadge.kind;
    return kind === 'count' || kind === 'dot';
  }).length;
  const pendingToolCount = toolViews.filter((entry) => entry.snapshot?.railBadge.kind === 'empty').length;
  const hasUtilities = hasCalendar || selectedLinks.length > 0;
  const scheduleSummary = nodeData ? formatScheduleSummary(nodeData.tools?.schedule, language) : null;
  const showStandaloneCalendar = !selectedNode && hasCalendar;
  const showNodeToolRail = Boolean(selectedNode && nodeData && !nodeData.isGroup);
  const isCalendarPrimaryWorkspace = workspaceView === 'overview' && hasCalendar;
  const shouldDeEmphasizeResources = isCalendarPrimaryWorkspace && hasCalendar && selectedLinks.length > 0;
  const shouldPrioritizeUtilityDock =
    workspaceView === 'overview'
    && hasUtilities
    && !isUtilityCollapsed
    && Boolean(selectedNode && nodeData && !nodeData.isGroup);
  const showUtilityDock = hasUtilities && !showStandaloneCalendar;
  const utilityDockFrameClass = isCalendarPrimaryWorkspace
    ? isDarkTheme
      ? 'border-primary/30 shadow-[0_20px_48px_-30px_rgba(37,99,235,0.42)]'
      : 'border-primary/20 shadow-[0_18px_40px_-28px_rgba(37,99,235,0.28)]'
    : isDarkTheme
      ? 'border-slate-700/80 shadow-[0_22px_50px_-36px_rgba(2,6,23,0.92)]'
      : 'border-neutral-200';

  const handleUtilityCollapse = (nextCollapsed: boolean) => {
    setIsUtilityCollapsed(nextCollapsed);
    if (hasCalendar) {
      onCalendarCollapsedChange(nextCollapsed);
    }
  };

  const renderPanelControls = () => (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onPanelWidthChange(isWideMode ? COMPACT_PANEL_WIDTH : WIDE_PANEL_WIDTH)}
        className="flex h-10 w-10 items-center justify-center rounded-2xl border border-neutral-200 bg-white text-neutral-400 transition-all hover:border-neutral-300 hover:text-neutral-700"
        title={isWideMode ? (language === 'zh' ? '切换到紧凑宽度' : 'Switch to compact width') : (language === 'zh' ? '切换到宽幅宽度' : 'Switch to wide width')}
      >
        <ArrowLeftRight className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onToggleVisibility(false)}
        className="flex h-10 w-10 items-center justify-center rounded-2xl border border-neutral-200 bg-white text-neutral-400 transition-all hover:border-neutral-300 hover:text-neutral-700"
        title={language === 'zh' ? '收起' : 'Collapse'}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );

  const renderToolContent = (toolId: NodeToolType) => {
    if (!selectedNode || !nodeData || nodeData.isGroup) return null;

    const toolBundle = TOOL_REGISTRY[toolId];
    const isEnabled = Boolean(nodeData.tools?.[toolId]?.enabled);

    if (!isEnabled) {
      return <toolBundle.Empty language={language} onActivate={() => activateTool(toolId)} />;
    }

    return <toolBundle.Content language={language} nodeData={nodeData} updateNodeTools={updateNodeTools} />;
  };

  const renderWorkspace = () => {
    if (!selectedNode || !nodeData) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-neutral-100 text-neutral-300">
            <Wrench className="h-6 w-6" />
          </div>
          <div>
            <div className="text-base font-black text-neutral-900">
              {language === 'zh' ? '等待选择节点' : 'Select a node to begin'}
            </div>
            <p className="mt-2 text-sm text-neutral-400">
              {language === 'zh'
                ? '右侧栏会先展示节点概览，再承接文档、表格、链接和时间等插件工作区。'
                : 'The workspace starts with a node overview, then opens document, table, link, and schedule plugins.'}
            </p>
          </div>
        </div>
      );
    }

    if (nodeData.isGroup) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-neutral-100 text-neutral-300">
            <Layers3 className="h-6 w-6" />
          </div>
          <div>
            <div className="text-base font-black text-neutral-900">
              {language === 'zh' ? '分组节点暂不展示插件工作台' : 'Group nodes do not open plugin workspaces'}
            </div>
            <p className="mt-2 text-sm text-neutral-400">
              {language === 'zh'
                ? '你仍然可以从下方 utility dock 查看日历，后续也可以扩展成组级插件。'
                : 'You can still use the utility dock below, and group-level plugins can be added later.'}
            </p>
          </div>
        </div>
      );
    }

    if (workspaceView === 'overview') {
      return (
        <section className={`rounded-[1.5rem] border p-4 ${
          isDarkTheme
            ? 'border-slate-700/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(11,21,38,0.98))] shadow-[0_24px_60px_-40px_rgba(2,6,23,0.95)]'
            : 'border-neutral-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,1))]'
        }`}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  {language === 'zh' ? '节点概览' : 'Node Overview'}
                </div>
                <div className="mt-3 text-[15px] font-black text-neutral-900">
                  {language === 'zh' ? '先扫一眼状态，再决定进哪个插件。' : 'Scan the state first, then choose a plugin.'}
                </div>
                <p className="mt-1.5 max-w-[420px] text-[12px] leading-6 text-neutral-500">
                  {language === 'zh'
                    ? '轨道负责切换，下面的空间优先留给日历与资源抽屉。'
                    : 'The rail handles switching, while the space below stays open for calendar and resources.'}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-neutral-900 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white">
                  {language === 'zh' ? `${enabledToolCount}/${availableTools.length} 已启用` : `${enabledToolCount}/${availableTools.length} active`}
                </span>
                  <span className={`rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${
                    isDarkTheme ? 'bg-slate-900/70 text-slate-300 ring-1 ring-slate-700/80' : 'bg-white text-neutral-500 ring-1 ring-neutral-200'
                  }`}>
                  {language === 'zh' ? `${populatedToolCount} 个已有内容` : `${populatedToolCount} with content`}
                </span>
                <span className={`rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${
                  isDarkTheme ? 'bg-slate-900/70 text-slate-300 ring-1 ring-slate-700/80' : 'bg-white text-neutral-500 ring-1 ring-neutral-200'
                }`}>
                  {language === 'zh'
                    ? hasUtilities
                      ? scheduleSummary || `${selectedLinks.length} 条资源`
                      : '等待 utility'
                    : hasUtilities
                      ? scheduleSummary || `${selectedLinks.length} links ready`
                      : 'Waiting for utility'}
                </span>
              </div>
            </div>

            <div className={`grid gap-2.5 ${isWideMode ? 'grid-cols-3' : 'grid-cols-1 sm:grid-cols-3'}`}>
              <div className="rounded-[0.95rem] border border-neutral-200 bg-white px-4 py-3">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">
                  {language === 'zh' ? '已启用' : 'Enabled'}
                </div>
                <div className="mt-1.5 text-xl font-black text-neutral-900">{enabledToolCount}</div>
                <div className="mt-1 text-[11px] font-bold text-neutral-400">
                  {language === 'zh' ? `共 ${availableTools.length} 个插件` : `${availableTools.length} plugins total`}
                </div>
              </div>

              <div className="rounded-[0.95rem] border border-neutral-200 bg-white px-4 py-3">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">
                  {language === 'zh' ? '已有内容' : 'With Content'}
                </div>
                <div className="mt-1.5 text-xl font-black text-neutral-900">{populatedToolCount}</div>
                <div className="mt-1 text-[11px] font-bold text-neutral-400">
                  {language === 'zh' ? `${pendingToolCount} 个等待填充` : `${pendingToolCount} waiting`}
                </div>
              </div>

              <div className="rounded-[0.95rem] border border-neutral-200 bg-white px-4 py-3">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">
                  {language === 'zh' ? '实用区' : 'Utility Dock'}
                </div>
                <div className="mt-1.5 text-[13px] font-black leading-5 text-neutral-900">
                  {scheduleSummary
                    ? scheduleSummary
                    : selectedLinks.length > 0
                      ? language === 'zh'
                        ? `${selectedLinks.length} 条资源可跳转`
                        : `${selectedLinks.length} resources ready`
                      : language === 'zh'
                        ? '等待日历或资源'
                        : 'Waiting for calendar or links'}
                </div>
                <div className="mt-1 text-[11px] font-bold text-neutral-400">
                  {hasUtilities
                    ? language === 'zh'
                      ? hasCalendar
                        ? '下方日历会作为默认执行区。'
                        : '下方抽屉会承接这些内容。'
                      : hasCalendar
                        ? 'The calendar below becomes the default execution space.'
                        : 'The dock below takes over from here.'
                    : language === 'zh'
                      ? '启用时间或链接后这里会更新。'
                      : 'Enable schedule or links to enrich this.'}
                </div>
              </div>
            </div>
          </div>
        </section>
      );
    }

    if (!activeToolId || !activeToolConfig || !activeToolSnapshot) return null;

    return renderToolContent(activeToolId);
  };

  return (
    <div className="relative h-full w-0 pointer-events-none">
      <AnimatePresence initial={false}>
        {settings.nodeTools.enabled && (
          <motion.aside
            key="right-tool-sidebar"
            initial={{ x: panelWidth + 24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: panelWidth + 24, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 34, mass: 0.9 }}
            className="absolute inset-y-0 right-0 flex h-full flex-col overflow-hidden border-l border-neutral-200 bg-white shadow-2xl pointer-events-auto"
            style={{ width: panelWidth }}
          >
            <div className="relative min-h-0 flex-1">
              <LayoutGroup id="right-tool-sidebar-shell">
                <AnimatePresence initial={false} mode="sync">
                {showStandaloneCalendar ? (
                  <motion.div
                    key="standalone-calendar-shell"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className={`absolute inset-0 flex flex-col ${
                      isDarkTheme
                        ? 'bg-[linear-gradient(180deg,rgba(7,17,31,0.96),rgba(11,21,38,1))]'
                        : 'bg-[linear-gradient(180deg,rgba(248,250,252,0.82),rgba(255,255,255,1))]'
                    }`}
                  >
                    <div className="absolute right-5 top-4 z-10">
                      {renderPanelControls()}
                    </div>

                    <motion.div
                      layoutId={UTILITY_DOCK_LAYOUT_ID}
                      className="mx-3 mb-3 mt-2 flex min-h-0 flex-1 flex-col rounded-[1rem] bg-white"
                    >
                      <motion.div
                        layoutId={CALENDAR_SURFACE_LAYOUT_ID}
                        className="flex min-h-0 flex-1 flex-col rounded-[0.95rem] border border-neutral-200 bg-white p-2.5"
                      >
                        <CustomScrollArea className="min-h-0 flex-1" viewportClassName="h-full overscroll-contain">
                          <SidebarCalendarView
                            language={language}
                            settings={settings}
                            nodes={nodes}
                            edges={edges}
                            selectedNode={selectedNode}
                            onUpdateNodeData={onUpdateNodeData}
                            onJumpToNode={onJumpToNode}
                            variant="full"
                          />
                        </CustomScrollArea>
                      </motion.div>
                    </motion.div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="node-workspace-shell"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className={`absolute inset-0 flex flex-col ${isDarkTheme ? 'bg-[#0b1526]' : 'bg-white'}`}
                  >
            <div className="border-b border-neutral-100 py-4 pr-5">
              <div className="grid grid-cols-[78px_minmax(0,1fr)_auto] items-start gap-4">
                <div className="flex justify-center">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.6rem] bg-primary/10 text-primary">
                    <Wrench className="h-6 w-6" />
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="min-w-0 pt-1">
                    <h2 className="truncate text-[22px] font-black leading-none text-neutral-900">
                      {selectedNode
                        ? nodeData?.label || (language === 'zh' ? '未命名节点' : 'Untitled node')
                        : language === 'zh'
                          ? '准备承接节点细节'
                          : 'Ready for node context'}
                    </h2>
                    {selectedNode && nodeData && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${STATUS_TONES[nodeData.status]}`}>
                          {STATUS_LABELS[language][nodeData.status]}
                        </span>
                        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">
                          {getNodeTypeLabel(nodeData, language)}
                        </span>
                        {nodeData.category && (
                          <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">
                            {nodeData.category}
                          </span>
                        )}
                        {scheduleSummary && (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-600">
                            {scheduleSummary}
                          </span>
                        )}
                        <span className="rounded-full bg-neutral-900 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white">
                          {language === 'zh' ? `${enabledToolCount}/${availableTools.length} 已启用` : `${enabledToolCount}/${availableTools.length} active`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start">
                  {renderPanelControls()}
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-1">
              <div className="flex w-[78px] shrink-0 flex-col overflow-x-hidden border-r border-neutral-100 bg-neutral-50/80 px-2 py-4">
                <button
                  type="button"
                  onClick={() => setWorkspaceView('overview')}
                  className={`flex h-14 w-14 items-center justify-center self-center rounded-[1.4rem] transition-all ${
                    workspaceView === 'overview'
                      ? 'bg-neutral-900 text-white shadow-[0_18px_40px_-26px_rgba(15,23,42,0.45)]'
                      : 'text-neutral-500 hover:bg-white hover:text-neutral-700'
                  }`}
                  title={language === 'zh' ? '概览' : 'Overview'}
                >
                  <Layers3 className="h-4 w-4" />
                </button>

                {showNodeToolRail && (
                  <CustomScrollArea className="mt-4 min-h-0 flex-1" viewportClassName="h-full overflow-x-hidden">
                    <div className="flex flex-col items-center gap-2">
                      {toolViews.map(({ tool, snapshot }) => {
                        const isActive = workspaceView === tool.id;
                        const toolTone = getAccentTone(tool.accentClass);

                        return (
                          <button
                            key={tool.id}
                            type="button"
                            onClick={() => selectTool(tool.id)}
                            className={`group relative flex h-14 w-14 items-center justify-center rounded-[1.35rem] border transition-all ${
                              isActive
                                ? `${toolTone.border} ${toolTone.tint} ${toolTone.text} ${toolTone.glow}`
                                : 'border-transparent bg-transparent text-neutral-400 hover:border-neutral-200 hover:bg-white hover:text-neutral-700'
                            }`}
                            title={getToolLabel(tool.id, language)}
                            aria-label={getToolLabel(tool.id, language)}
                          >
                            {isActive && <span className={`absolute left-[-2px] top-1/2 h-8 w-1 -translate-y-1/2 rounded-full ${toolTone.solid}`} />}
                            <div className={`flex h-10 w-10 items-center justify-center rounded-2xl shadow-sm ring-1 ${
                              isActive ? `${toolTone.soft} ${toolTone.text} ${toolTone.ring}` : 'bg-white ring-black/5'
                            }`}>
                              {tool.icon}
                            </div>
                            {snapshot && (
                              <span
                                className={`absolute right-0.5 top-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-white px-1 text-[9px] font-black leading-none ${getRailBadgeClasses(snapshot.railBadge.kind)}`}
                              >
                                {snapshot.railBadge.kind === 'disabled' || snapshot.railBadge.kind === 'dot' ? (
                                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                ) : snapshot.railBadge.kind === 'empty' ? (
                                  <span className="h-2 w-2 rounded-full border border-current" />
                                ) : (
                                  snapshot.railBadge.value
                                )}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </CustomScrollArea>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="border-b border-neutral-100 px-5 py-4">
                  {workspaceView === 'overview' || !activeToolConfig || !activeToolSnapshot ? (
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-400">
                          {language === 'zh' ? '当前视图' : 'Current View'}
                        </div>
                        <div className="mt-1 text-sm font-black text-neutral-900">
                          {language === 'zh' ? '插件概览' : 'Plugin Overview'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={`rounded-[1rem] border px-4 py-4 ${activeToolTone.border} ${activeToolTone.glow} ${
                      isDarkTheme ? 'bg-slate-900/88' : 'bg-white'
                    }`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${activeToolTone.soft} ${activeToolTone.text} ring-1 ${activeToolTone.ring}`}>
                            {activeToolConfig.icon}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-400">
                              {language === 'zh' ? '当前插件' : 'Active Plugin'}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <div className="text-[15px] font-black text-neutral-900">{getToolLabel(activeToolId, language)}</div>
                              <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${activeToolTone.tint} ${activeToolTone.text}`}>
                                {language === 'zh' ? '聚焦中' : 'Focused'}
                              </span>
                              <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">
                                {activeToolSnapshot.badge}
                              </span>
                            </div>
                            <div className="mt-1 truncate text-sm text-neutral-500">{activeToolSnapshot.detail}</div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setWorkspaceView('overview')}
                          className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${
                            isDarkTheme
                              ? 'border-slate-700/80 bg-slate-900/80 text-slate-300 hover:border-slate-600 hover:text-slate-100'
                              : 'border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300 hover:text-neutral-700'
                          }`}
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                          {language === 'zh' ? '返回概览' : 'Overview'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {shouldPrioritizeUtilityDock ? (
                  <div className="px-4 py-4">
                    {renderWorkspace()}
                  </div>
                ) : (
                  <CustomScrollArea className="min-h-0 flex-1" viewportClassName="h-full overscroll-contain px-4 py-4">
                    {renderWorkspace()}
                  </CustomScrollArea>
                )}

                {showUtilityDock && (
                  <div className={`${shouldPrioritizeUtilityDock ? 'flex min-h-0 flex-1 flex-col' : ''} border-t border-neutral-100 px-4 py-3`}>
                    <div
                      className={`${shouldPrioritizeUtilityDock ? 'flex min-h-0 flex-1 flex-col' : ''} ${utilityDockFrameClass} rounded-[1rem] border bg-white`}
                    >
                      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-400">
                            Utility Dock
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <div className="text-[13px] font-black text-neutral-900">
                              {language === 'zh' ? '日历与资源抽屉' : 'Calendar and resources'}
                            </div>
                            {isCalendarPrimaryWorkspace && (
                              <span className="rounded-full bg-primary/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-primary">
                                {language === 'zh' ? '默认执行区' : 'Primary workspace'}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-[11px] font-bold text-neutral-400">
                            {isCalendarPrimaryWorkspace
                              ? language === 'zh'
                                ? '任务制定完成后，优先沿着时间维度推进。'
                                : 'Once planning is done, execution usually moves on the timeline.'
                              : language === 'zh'
                                ? selectedLinks.length > 0
                                  ? '日历常驻，资源按需展开。'
                                  : '在日历与资源之间切换。'
                                : selectedLinks.length > 0
                                  ? 'Keep the calendar in view and open resources only when needed.'
                                  : 'Switch between schedule and resource context.'}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {hasCalendar && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveUtilityTab('calendar');
                                handleUtilityCollapse(false);
                              }}
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${
                                activeUtilityTab === 'calendar'
                                  ? isCalendarPrimaryWorkspace
                                    ? 'bg-primary text-white shadow-[0_14px_30px_-20px_rgba(37,99,235,0.8)]'
                                    : 'bg-primary text-white'
                                  : 'bg-neutral-100 text-neutral-500 hover:text-neutral-700'
                              }`}
                            >
                              <CalendarDays className="h-3.5 w-3.5" />
                              {language === 'zh' ? '日历' : 'Calendar'}
                              {!isUtilityCollapsed && (
                                <span className={`rounded-full px-1.5 py-0.5 text-[9px] leading-none ${
                                  activeUtilityTab === 'calendar' ? 'bg-white/15 text-white' : 'bg-white text-neutral-400'
                                }`}>
                                  {language === 'zh' ? '排期' : 'Plan'}
                                </span>
                              )}
                            </button>
                          )}
                          {selectedLinks.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveUtilityTab('links');
                                handleUtilityCollapse(false);
                              }}
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${
                                activeUtilityTab === 'links'
                                  ? shouldDeEmphasizeResources
                                    ? 'border border-violet-200 bg-violet-50 text-violet-700'
                                    : 'bg-primary text-white'
                                  : shouldDeEmphasizeResources
                                    ? 'border border-transparent bg-transparent text-neutral-400 hover:border-neutral-200 hover:bg-neutral-50 hover:text-neutral-700'
                                    : 'bg-neutral-100 text-neutral-500 hover:text-neutral-700'
                              }`}
                            >
                              <Link2 className={`${shouldDeEmphasizeResources ? 'h-3 w-3' : 'h-3.5 w-3.5'}`} />
                              {language === 'zh' ? '资源' : 'Resources'}
                              <span className={`rounded-full px-1.5 py-0.5 text-[9px] leading-none ${
                                activeUtilityTab === 'links'
                                  ? shouldDeEmphasizeResources
                                    ? 'bg-white text-violet-500 ring-1 ring-violet-100'
                                    : 'bg-white/15 text-white'
                                  : shouldDeEmphasizeResources
                                    ? 'bg-neutral-100 text-neutral-400'
                                    : 'bg-white text-neutral-400'
                              }`}>
                                {selectedLinks.length}
                              </span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleUtilityCollapse(!isUtilityCollapsed)}
                            className="flex h-8 w-8 items-center justify-center rounded-2xl border border-neutral-200 bg-white text-neutral-400 transition-all hover:border-neutral-300 hover:text-neutral-700"
                            title={isUtilityCollapsed ? (language === 'zh' ? '展开抽屉' : 'Expand dock') : (language === 'zh' ? '收起抽屉' : 'Collapse dock')}
                          >
                            <ChevronDown className={`h-4 w-4 transition-transform ${isUtilityCollapsed ? '-rotate-90' : 'rotate-0'}`} />
                          </button>
                        </div>
                      </div>

                      {isUtilityCollapsed ? (
                        <div className="flex flex-wrap gap-2 border-t border-neutral-100 px-4 py-2.5">
                            {hasCalendar && (
                              <span className="rounded-full bg-amber-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-amber-600">
                                {language === 'zh' ? '日历已折叠' : 'Calendar collapsed'}
                              </span>
                            )}
                            {selectedLinks.length > 0 && (
                              <span className="rounded-full bg-violet-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-violet-600">
                                {language === 'zh' ? `${selectedLinks.length} 项资源` : `${selectedLinks.length} resources`}
                              </span>
                            )}
                        </div>
                      ) : (
                        <div className={`${shouldPrioritizeUtilityDock ? 'flex min-h-0 flex-1 flex-col' : ''} border-t border-neutral-100 p-2.5`}>
                          {activeUtilityTab === 'calendar' && hasCalendar ? (
                            <div
                              className={`rounded-[0.95rem] border border-neutral-200 bg-white p-2.5 ${shouldPrioritizeUtilityDock ? 'flex min-h-0 flex-1 flex-col' : isWideMode ? 'min-h-[250px]' : 'min-h-[220px]'}`}
                            >
                              <SidebarCalendarView
                                language={language}
                                settings={settings}
                                nodes={nodes}
                                edges={edges}
                                selectedNode={selectedNode}
                                onUpdateNodeData={onUpdateNodeData}
                                onJumpToNode={onJumpToNode}
                                variant="embedded"
                              />
                            </div>
                          ) : (
                            <div className={shouldPrioritizeUtilityDock ? 'min-h-0 flex-1' : 'space-y-1.5'}>
                              {shouldPrioritizeUtilityDock ? (
                                <CustomScrollArea className="min-h-0 h-full" viewportClassName="h-full pr-1">
                                  <div className="space-y-1.5">
                                    {selectedLinks.map((link) => (
                                      <button
                                        key={link.id}
                                        type="button"
                                        onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')}
                                        className="flex w-full items-center gap-3 rounded-[1rem] border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-left transition-all hover:border-violet-200 hover:bg-violet-50"
                                      >
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-violet-500 shadow-sm ring-1 ring-black/5">
                                          <ExternalLink className="h-3.5 w-3.5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <div className="truncate text-[13px] font-black text-neutral-900">
                                            {link.title || link.displayLabel}
                                          </div>
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                </CustomScrollArea>
                              ) : (
                                selectedLinks.map((link) => (
                                  <button
                                    key={link.id}
                                    type="button"
                                    onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')}
                                    className="flex w-full items-center gap-3 rounded-[1rem] border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-left transition-all hover:border-violet-200 hover:bg-violet-50"
                                  >
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-violet-500 shadow-sm ring-1 ring-black/5">
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="truncate text-[13px] font-black text-neutral-900">
                                        {link.title || link.displayLabel}
                                      </div>
                                    </div>
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </LayoutGroup>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {!settings.nodeTools.enabled && (
        <button
          type="button"
          onClick={() => onToggleVisibility(true)}
          className="-left-11 absolute top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-400 shadow-lg transition-all hover:bg-neutral-50 hover:scale-105 hover:text-neutral-700 pointer-events-auto"
          title={language === 'zh' ? '展开右侧工具栏' : 'Open right sidebar'}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
