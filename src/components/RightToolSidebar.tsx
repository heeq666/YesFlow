import React from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import type { Edge, Node } from '@xyflow/react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  ArrowLeftRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  Copy,
  ExternalLink,
  ImageIcon,
  Layers3,
  Link2,
  Play,
  Tag,
  Wrench,
  X,
} from 'lucide-react';

import SidebarCalendarView, { type EmbeddedCalendarTab } from './SidebarCalendarView';
import CustomScrollArea from './CustomScrollArea';
import { DocumentToolEmpty, DocumentToolContent } from './DocumentTool';
import { ImageToolContent, ImageToolEmpty } from './ImageTool';
import { LinkToolEmpty, LinkToolContent } from './LinkTool';
import {
  getAvailableNodeTools,
  getToolConfig,
  getToolLabel,
  getToolSnapshot,
} from './NodeToolConfig';
import { ScheduleToolEmpty, ScheduleToolContent } from './ScheduleTool';
import { TableToolEmpty, TableToolContent } from './TableTool';
import type { NodeStatus, NodeToolType, Settings, TaskData } from '../types';
import { ensureToolState, formatScheduleSummary, getNodeToolImages, getNodeToolLinks } from '../utils/nodeTools';
import { copyTextToClipboard } from '../utils/clipboard';

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
      onBackToOverview?: () => void;
    }>;
  }
> = {
  table: { Empty: TableToolEmpty, Content: TableToolContent },
  document: { Empty: DocumentToolEmpty, Content: DocumentToolContent },
  link: { Empty: LinkToolEmpty, Content: LinkToolContent },
  schedule: { Empty: ScheduleToolEmpty, Content: ScheduleToolContent },
  image: { Empty: ImageToolEmpty, Content: ImageToolContent },
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

type CompactMetaItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  toneClass: string;
  badge?: string;
  badgeClass?: string;
};

function getStatusMetaToken(status: NodeStatus) {
  switch (status) {
    case 'pending':
      return {
        icon: <Circle className="h-3.5 w-3.5" />,
        toneClass: 'border-neutral-300 bg-neutral-100 text-neutral-700',
      };
    case 'in-progress':
      return {
        icon: <Play className="h-3.5 w-3.5" />,
        toneClass: 'border-sky-300 bg-sky-100 text-sky-700',
      };
    case 'completed':
      return {
        icon: <Check className="h-3.5 w-3.5" />,
        toneClass: 'border-emerald-300 bg-emerald-100 text-emerald-700',
      };
    case 'failed':
      return {
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
        toneClass: 'border-rose-300 bg-rose-100 text-rose-700',
      };
    default:
      return {
        icon: <Circle className="h-3.5 w-3.5" />,
        toneClass: 'border-neutral-300 bg-neutral-100 text-neutral-700',
      };
  }
}

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
    case 'bg-rose-500':
      return {
        solid: 'bg-rose-500',
        soft: 'bg-rose-50',
        tint: 'bg-rose-500/12',
        text: 'text-rose-600',
        ring: 'ring-rose-200/80',
        border: 'border-rose-200',
        glow: 'shadow-[0_18px_40px_-24px_rgba(244,63,94,0.55)]',
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
  onToggleVisibility,
}: RightToolSidebarProps) {
  const nodeData = selectedNode?.data as TaskData | undefined;
  // Stabilize selectedNode to prevent updateNodeTools from recreating on every App re-render.
  const selectedNodeRef = React.useRef(selectedNode);
  React.useEffect(() => {
    selectedNodeRef.current = selectedNode;
  }, [selectedNode]);
  const isDarkTheme = settings.themeMode === 'dark';
  const panelWidth = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, settings.nodeTools.panelWidth || 480));
  const isWideMode = Math.abs(panelWidth - WIDE_PANEL_WIDTH) <= Math.abs(panelWidth - COMPACT_PANEL_WIDTH);
  const isCompactMode = !isWideMode;
  const hasCalendar = settings.nodeTools.calendar.enabled && settings.nodeTools.enabledTools.schedule;
  const availableTools = React.useMemo(
    () => getAvailableNodeTools(settings.nodeTools.enabledTools),
    [settings.nodeTools.enabledTools],
  );
  const selectedLinks = React.useMemo(() => getNodeToolLinks(nodeData?.tools?.link), [nodeData?.tools?.link]);
  const selectedImages = React.useMemo(() => getNodeToolImages(nodeData?.tools?.image), [nodeData?.tools?.image]);
  const toolViews = React.useMemo(
    () =>
      availableTools.map((tool) => ({
        tool,
        snapshot: nodeData && !nodeData.isGroup ? getToolSnapshot(tool.id, nodeData, language) : null,
      })),
    [availableTools, language, nodeData],
  );
  const [workspaceView, setWorkspaceView] = React.useState<WorkspaceView>('overview');
  const [embeddedCalendarTab, setEmbeddedCalendarTab] = React.useState<EmbeddedCalendarTab>('calendar');
  const [embeddedCalendarMonth, setEmbeddedCalendarMonth] = React.useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [copiedResourceId, setCopiedResourceId] = React.useState<string | null>(null);
  const [previewResourceImage, setPreviewResourceImage] = React.useState<{ src: string; title: string; alt: string } | null>(null);
  const [previewResourceZoom, setPreviewResourceZoom] = React.useState(1);
  const portalTarget = typeof document !== 'undefined' ? document.body : null;
  const copiedResourceTimerRef = React.useRef<number | null>(null);

  const lastActiveTool = React.useMemo<NodeToolType | null>(() => {
    if (!selectedNode || !nodeData || nodeData.isGroup || availableTools.length === 0) return null;
    const preferred = nodeData.tools?.activeTool;
    return availableTools.some((tool) => tool.id === preferred) ? preferred || null : availableTools[0].id;
  }, [availableTools, nodeData, selectedNode]);

  React.useEffect(() => {
    setWorkspaceView('overview');
    setPreviewResourceImage(null);
  }, [selectedNode?.id, nodeClickRevealNonce]);

  React.useEffect(() => {
    setEmbeddedCalendarTab('calendar');
  }, [selectedNode?.id, nodeClickRevealNonce]);

  React.useEffect(() => {
    if (!toolPanelRequest || toolPanelRequest.nodeId !== selectedNode?.id) return;
    setWorkspaceView(toolPanelRequest.tool);
  }, [toolPanelRequest, selectedNode?.id]);

  React.useEffect(() => () => {
    if (copiedResourceTimerRef.current) {
      window.clearTimeout(copiedResourceTimerRef.current);
    }
  }, []);

  React.useEffect(() => {
    if (!previewResourceImage) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setPreviewResourceImage(null);
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [previewResourceImage]);

  React.useEffect(() => {
    if (!previewResourceImage) return;
    setPreviewResourceZoom(1);
  }, [previewResourceImage]);

  const updateNodeTools = React.useCallback(
    (nextTools: TaskData['tools']) => {
      const node = selectedNodeRef.current;
      if (!node) return;
      onUpdateNodeData(node.id, { tools: nextTools });
    },
    [onUpdateNodeData],
  );

  const selectTool = React.useCallback(
    (tool: NodeToolType) => {
      const node = selectedNodeRef.current;
      const data = node?.data as TaskData | undefined;
      if (!node || !data) return;
      updateNodeTools({
        ...(data.tools || {}),
        activeTool: tool,
      });
      setWorkspaceView(tool);
    },
    [updateNodeTools],
  );

  const activateTool = React.useCallback(
    (tool: NodeToolType) => {
      const data = selectedNodeRef.current?.data as TaskData | undefined;
      if (!data) return;
      updateNodeTools(ensureToolState(data, tool, language));
      setWorkspaceView(tool);
    },
    [language, updateNodeTools],
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
  const activeToolLabel = activeToolId ? getToolLabel(activeToolId, language) : '';
  const showWorkspaceHeader =
    workspaceView !== 'overview' && (!activeToolConfig || !activeToolSnapshot || !activeToolSnapshot.enabled);
  const enabledToolCount = toolViews.filter((entry) => entry.snapshot?.enabled).length;
  const resourceCount = selectedLinks.length + selectedImages.length;
  const hasResources = resourceCount > 0;
  const scheduleSummary = nodeData ? formatScheduleSummary(nodeData.tools?.schedule, language) : null;
  const compactNodeDescription = React.useMemo(() => {
    if (!nodeData) return '';
    const raw = nodeData.description?.trim();
    return raw || '';
  }, [nodeData]);
  const compactNodeMetaItems = React.useMemo<CompactMetaItem[]>(() => {
    if (!nodeData) return [];

    const statusLabel = STATUS_LABELS[language][nodeData.status];
    const statusToken = getStatusMetaToken(nodeData.status);
    const typeLabel = getNodeTypeLabel(nodeData, language);
    const items: CompactMetaItem[] = [
      {
        key: 'status',
        label: statusLabel,
        icon: statusToken.icon,
        toneClass: statusToken.toneClass,
      },
      {
        key: 'type',
        label: typeLabel,
        icon: <Layers3 className="h-3.5 w-3.5" />,
        toneClass: 'border-indigo-300 bg-indigo-100 text-indigo-700',
      },
    ];

    if (nodeData.category?.trim()) {
      items.push({
        key: 'category',
        label: nodeData.category,
        icon: <Tag className="h-3.5 w-3.5" />,
        toneClass: 'border-violet-300 bg-violet-100 text-violet-700',
      });
    }

    if (scheduleSummary) {
      items.push({
        key: 'schedule',
        label: scheduleSummary,
        icon: <Clock3 className="h-3.5 w-3.5" />,
        toneClass: 'border-amber-300 bg-amber-100 text-amber-700',
      });
    }

    items.push({
      key: 'plugins',
      label:
        language === 'zh'
          ? `插件 ${enabledToolCount}/${availableTools.length}`
          : `Plugins ${enabledToolCount}/${availableTools.length}`,
      icon: <Wrench className="h-3.5 w-3.5" />,
      toneClass: 'border-neutral-900 bg-neutral-900 text-white',
      badge: `${enabledToolCount}/${availableTools.length}`,
      badgeClass: 'bg-white text-neutral-900',
    });

    return items;
  }, [availableTools.length, enabledToolCount, language, nodeData, scheduleSummary]);
  const showStandaloneCalendar = !selectedNode && hasCalendar;
  const showNodeToolRail = Boolean(selectedNode && nodeData && !nodeData.isGroup);
  const showUtilityDock = hasCalendar && !showStandaloneCalendar;

  const queueCopiedResource = React.useCallback((resourceId: string) => {
    if (copiedResourceTimerRef.current) {
      window.clearTimeout(copiedResourceTimerRef.current);
    }

    setCopiedResourceId(resourceId);
    copiedResourceTimerRef.current = window.setTimeout(() => {
      setCopiedResourceId((current) => (current === resourceId ? null : current));
      copiedResourceTimerRef.current = null;
    }, 1600);
  }, []);

  const handleCopyResource = React.useCallback(async (resourceId: string, value: string) => {
    const copied = await copyTextToClipboard(value);
    if (!copied) return;
    queueCopiedResource(resourceId);
  }, [queueCopiedResource]);

  const handlePreviewResourceWheel = React.useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.12 : 0.88;
    setPreviewResourceZoom((current) => {
      const next = current * factor;
      return Math.min(4, Math.max(0.5, Number(next.toFixed(3))));
    });
  }, []);

  const openResourceWorkspace = React.useCallback((tool: Extract<NodeToolType, 'image' | 'link'>) => {
    selectTool(tool);
  }, [selectTool]);

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

    return (
      <toolBundle.Content
        language={language}
        nodeData={nodeData}
        updateNodeTools={updateNodeTools}
        onBackToOverview={() => setWorkspaceView('overview')}
      />
    );
  };

  const renderResourceContent = (scrollable: boolean) => {
    const content = (
      <div className="space-y-3">
        {selectedImages.length > 0 && (
          <div className="space-y-1.5">
            <div className={`px-1 font-black uppercase text-neutral-400 ${isCompactMode ? 'text-[11px] tracking-[0.12em]' : 'text-[10px] tracking-[0.16em]'}`}>
              {language === 'zh' ? '图片' : 'Images'}
            </div>
            <div className={`grid gap-2 ${isCompactMode ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {selectedImages.map((image) => (
                <div
                  key={image.id}
                  className="overflow-hidden rounded-[1rem] border border-neutral-200 bg-neutral-50 text-left transition-all hover:border-rose-200 hover:bg-rose-50"
                >
                  <button
                    type="button"
                    onClick={() => setPreviewResourceImage({
                      src: image.src,
                      title: image.title,
                      alt: image.alt || image.title,
                    })}
                    className="group relative block aspect-[1.15] w-full overflow-hidden bg-white text-left"
                    title={language === 'zh' ? '点击查看大图' : 'Click to view larger image'}
                  >
                    <img src={image.src} alt={image.alt || image.title} className="h-full w-full cursor-zoom-in object-cover transition-transform duration-200 group-hover:scale-[1.02]" loading="lazy" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white opacity-0 transition-opacity group-hover:opacity-100">
                      {language === 'zh' ? '点击查看大图' : 'View large'}
                    </div>
                  </button>
                  <div className="space-y-2 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-rose-500 shadow-sm ring-1 ring-black/5">
                        <ImageIcon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12px] font-black text-neutral-900">
                          {image.title}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => window.open(image.src, '_blank', 'noopener,noreferrer')}
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-white px-2.5 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500 shadow-sm ring-1 ring-black/5 transition-all hover:text-rose-600"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>{language === 'zh' ? '打开' : 'Open'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleCopyResource(`image-${image.id}`, image.src)}
                        className={`inline-flex items-center justify-center gap-1 rounded-xl px-2.5 py-2 text-[10px] font-black uppercase tracking-[0.14em] transition-all ${
                          copiedResourceId === `image-${image.id}`
                            ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200'
                            : 'bg-white text-neutral-500 shadow-sm ring-1 ring-black/5 hover:text-rose-600'
                        }`}
                      >
                        {copiedResourceId === `image-${image.id}` ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedResourceId === `image-${image.id}` ? (language === 'zh' ? '已复制' : 'Copied') : (language === 'zh' ? '复制' : 'Copy')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openResourceWorkspace('image')}
                        className="inline-flex items-center justify-center gap-1 rounded-xl bg-rose-50 px-2.5 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-rose-600 transition-all hover:bg-rose-100"
                      >
                        <Wrench className="h-3.5 w-3.5" />
                        <span>{language === 'zh' ? '工具' : 'Tool'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedLinks.length > 0 && (
          <div className="space-y-1.5">
            <div className={`px-1 font-black uppercase text-neutral-400 ${isCompactMode ? 'text-[11px] tracking-[0.12em]' : 'text-[10px] tracking-[0.16em]'}`}>
              {language === 'zh' ? '链接' : 'Links'}
            </div>
            {selectedLinks.map((link) => (
              <div
                key={link.id}
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
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')}
                    className="inline-flex items-center justify-center rounded-xl bg-white p-2 text-neutral-500 shadow-sm ring-1 ring-black/5 transition-all hover:text-violet-600"
                    title={language === 'zh' ? '打开链接' : 'Open link'}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCopyResource(`link-${link.id}`, link.url)}
                    className={`inline-flex items-center justify-center rounded-xl p-2 transition-all ${
                      copiedResourceId === `link-${link.id}`
                        ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200'
                        : 'bg-white text-neutral-500 shadow-sm ring-1 ring-black/5 hover:text-violet-600'
                    }`}
                    title={language === 'zh' ? '复制链接' : 'Copy link'}
                  >
                    {copiedResourceId === `link-${link.id}` ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => openResourceWorkspace('link')}
                    className="inline-flex items-center justify-center rounded-xl bg-violet-50 p-2 text-violet-600 transition-all hover:bg-violet-100"
                    title={language === 'zh' ? '打开链接工具' : 'Open link tool'}
                  >
                    <Wrench className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );

    if (!scrollable) {
      return content;
    }

    return (
      <CustomScrollArea className="min-h-0 h-full" viewportClassName="h-full pr-1">
        {content}
      </CustomScrollArea>
    );
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
                ? '右侧栏会先展示资源区，可切换到插件继续编辑。'
                : 'The workspace opens with resources first, then you can switch to plugins.'}
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
                ? '你仍然可以从下方日历区查看排期，后续也可以扩展成组级插件。'
                : 'You can still use the calendar section below, and group-level plugins can be added later.'}
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
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                <Link2 className="h-3.5 w-3.5" />
                {language === 'zh' ? '资源' : 'Resources'}
              </div>
              <span className="rounded-full bg-neutral-900 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white">
                {language === 'zh' ? `${resourceCount} 项` : `${resourceCount} items`}
              </span>
            </div>

            {hasResources ? (
              renderResourceContent(false)
            ) : (
              <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-[1rem] border border-neutral-200 bg-white text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
                  <Link2 className="h-4 w-4" />
                </div>
                <div className="text-sm font-black text-neutral-900">
                  {language === 'zh' ? '暂无资源' : 'No resources yet'}
                </div>
              </div>
            )}
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
                    <h2 className={`truncate font-black ${isCompactMode ? 'text-[23px] leading-[1.02] text-neutral-950' : 'text-[24px] leading-[1.02] text-neutral-950'}`}>
                      {selectedNode
                        ? nodeData?.label || (language === 'zh' ? '未命名节点' : 'Untitled node')
                        : language === 'zh'
                          ? '准备承接节点细节'
                          : 'Ready for node context'}
                    </h2>
                    {selectedNode && nodeData && (
                      <>
                        <p className={`mt-2.5 min-h-5 max-w-[480px] truncate font-semibold leading-5 text-neutral-600 ${
                          isCompactMode ? 'text-[12px]' : 'text-[13px]'
                        }`}>
                          {compactNodeDescription || '\u00A0'}
                        </p>
                        <div className={`mt-3.5 ${
                          isCompactMode
                            ? 'grid grid-cols-7 gap-2'
                            : 'flex flex-wrap items-center gap-2'
                        }`}>
                          {compactNodeMetaItems.map((item) => (
                            <span
                              key={item.key}
                              className={`group relative inline-flex ${isCompactMode ? 'h-8 w-8 justify-self-start px-0' : 'h-9 min-w-9 px-3'} items-center justify-center rounded-xl border shadow-[0_8px_20px_-16px_rgba(15,23,42,0.45)] ${item.toneClass}`}
                              title={item.label}
                              aria-label={item.label}
                            >
                              {item.icon}
                              {item.badge && (
                                <span className={`absolute -right-1.5 -top-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-black leading-none ring-2 ring-white ${item.badgeClass || 'bg-neutral-900 text-white'}`}>
                                  {item.badge}
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </>
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
                  title={language === 'zh' ? '资源' : 'Resources'}
                >
                  <Link2 className="h-4 w-4" />
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
                {showWorkspaceHeader && (
                  <div className="border-b border-neutral-100 px-5 py-4">
                    {!activeToolConfig || !activeToolSnapshot ? (
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
                                <div className="text-[15px] font-black text-neutral-900">{activeToolLabel}</div>
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
                            {language === 'zh' ? '返回资源' : 'Resources'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <CustomScrollArea className="min-h-0 flex-1" viewportClassName="h-full overscroll-contain px-4 py-4">
                  {renderWorkspace()}
                </CustomScrollArea>

                {showUtilityDock && (
                  <div className="border-t border-neutral-100 px-4 py-3">
                    <div className="rounded-[1rem] border border-neutral-200 bg-white p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 rounded-lg bg-neutral-100 p-1">
                          <button
                            type="button"
                            onClick={() => setEmbeddedCalendarTab('calendar')}
                            className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-all ${
                              embeddedCalendarTab === 'calendar' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'
                            }`}
                          >
                            <CalendarDays className="h-3.5 w-3.5" />
                            {language === 'zh' ? '日历' : 'Calendar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEmbeddedCalendarTab('detail')}
                            className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-all ${
                              embeddedCalendarTab === 'detail' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'
                            }`}
                          >
                            <Clock3 className="h-3.5 w-3.5" />
                            {language === 'zh' ? '日程' : 'Schedule'}
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          <p className="text-[11px] font-medium text-neutral-500">
                            {embeddedCalendarMonth.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
                              year: 'numeric',
                              month: 'short',
                            })}
                          </p>
                          <button
                            type="button"
                            onClick={() => setEmbeddedCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                            className="flex h-7 w-7 items-center justify-center rounded-xl text-neutral-400 transition-all hover:bg-neutral-200 hover:text-neutral-700"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEmbeddedCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                            className="flex h-7 w-7 items-center justify-center rounded-xl text-neutral-400 transition-all hover:bg-neutral-200 hover:text-neutral-700"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 h-[340px] rounded-[0.95rem] border border-neutral-200 bg-white p-2.5">
                        <SidebarCalendarView
                          language={language}
                          settings={settings}
                          nodes={nodes}
                          edges={edges}
                          selectedNode={selectedNode}
                          onUpdateNodeData={onUpdateNodeData}
                          onJumpToNode={onJumpToNode}
                          variant="embedded"
                          compact
                          embeddedControls={{
                            tab: embeddedCalendarTab,
                            onTabChange: (tab) => setEmbeddedCalendarTab(tab),
                            month: embeddedCalendarMonth,
                            onMonthChange: (month) => setEmbeddedCalendarMonth(month),
                          }}
                        />
                      </div>
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

      {portalTarget && previewResourceImage && createPortal(
        <div
          className="fixed inset-0 z-[3200] overflow-auto bg-black/80 pointer-events-auto"
          onClick={() => setPreviewResourceImage(null)}
          onWheelCapture={handlePreviewResourceWheel}
          role="presentation"
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setPreviewResourceImage(null);
            }}
            className="fixed right-6 top-6 z-[3202] inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/75"
            title={language === 'zh' ? '关闭预览' : 'Close preview'}
          >
            <X className="h-4 w-4" />
          </button>
          <div className="min-h-full min-w-full p-4 sm:p-8">
            <div className="flex min-h-[calc(100vh-2rem)] items-center justify-center sm:min-h-[calc(100vh-4rem)]">
              <div
                className="relative inline-flex flex-col items-center"
                onClick={(event) => event.stopPropagation()}
                role="presentation"
              >
                <img
                  src={previewResourceImage.src}
                  alt={previewResourceImage.alt}
                  className="rounded-2xl border border-white/20 object-contain shadow-[0_40px_120px_-40px_rgba(0,0,0,0.75)]"
                  style={{
                    maxHeight: '88vh',
                    maxWidth: '92vw',
                    transform: `scale(${previewResourceZoom})`,
                    transformOrigin: 'center center',
                  }}
                />
              </div>
            </div>
          </div>
          <div className="pointer-events-none fixed bottom-6 left-1/2 z-[3201] -translate-x-1/2 rounded-full bg-black/60 px-4 py-2 text-[11px] font-semibold text-white/90 backdrop-blur-sm">
            {`${previewResourceImage.title} · ${language === 'zh' ? `缩放 ${Math.round(previewResourceZoom * 100)}%（滚轮）` : `Zoom ${Math.round(previewResourceZoom * 100)}% (wheel)`}`}
          </div>
        </div>,
        portalTarget,
      )}
    </div>
  );
}
