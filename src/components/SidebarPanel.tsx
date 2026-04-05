import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { Edge, Node } from '@xyflow/react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  CircleStop,
  Circle as CircleIcon,
  ClipboardList,
  Clock,
  ExternalLink,
  GripVertical,
  History,
  Info,
  LayoutDashboard,
  Loader2,
  PlayCircle,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  X,
  Zap,
} from 'lucide-react';

import SidebarFooter from './SidebarFooter';
import CustomScrollArea from './CustomScrollArea';
import { translations } from '../constants/translations';
import type { NodeStatus, ProjectRecord, RecordAiState, Settings, TaskData, TaskMode } from '../types';

type SidebarPanelProps = {
  language: 'zh' | 'en';
  themeMode: 'light' | 'dark';
  isBatchAiLoading: boolean;
  hasApiKey: boolean;
  activeProviderName: string;
  settings: Settings;
  selectedNode?: Node | null;
  selectedEdge?: Edge | null;
  selectedNodes: Node[];
  selectedPrompt: string;
  localRecords: ProjectRecord[];
  currentRecordId: string | null;
  nodes: Node[];
  edges: Edge[];
  mode: TaskMode;
  onNewProject: () => void;
  onDeleteSelectedEdge: () => void;
  onUpdateSelectedEdgeLabel: (value: string) => void;
  onUpdateSelectedEdgeColor: (color?: string) => void;
  onDeleteSelectedNode: () => void;
  onUpdateNodeData: (id: string, updates: Partial<TaskData>) => void;
  onStatusChange: (id: string, status: NodeStatus) => void;
  onJumpToNode: (nodeId: string) => void;
  onSelectedPromptChange: (value: string) => void;
  onModifySelected: () => void;
  onAbortSelectedAi: () => void;
  onAbortPlanGeneration: () => void;
  onLoadRecord: (record: ProjectRecord) => void;
  onDeleteRecord: (recordId: string) => void;
  onReorderRecords: (sourceId: string, targetId: string, position?: 'before' | 'after') => void;
  onSelectProvider: (id: string) => void;
  onOpenSettings: () => void;
  onToggleTheme: () => void;
  onToggleLanguage: () => void;
  isGeneratingPlan?: boolean;
  isGeneratingPlanCompleting?: boolean;
  generatingRecordId?: string | null;
  streamingContent?: string;
  hideGeneratingRecord?: boolean;
  onGeneratingCardAnchorRectChange?: (rect: { x: number; y: number; width: number; height: number } | null) => void;
  recordAiStates: Record<string, RecordAiState>;
};

const EDGE_COLORS = ['sky', 'green', 'amber', 'rose', 'indigo', 'neutral'] as const;
const NODE_COLORS = ['sky', 'green', 'amber', 'indigo', 'rose', 'teal', 'fuchsia', 'orange', 'cyan', 'violet', 'neutral'] as const;
const STATUS_OPTIONS: { id: NodeStatus; icon: React.ReactNode; color: string }[] = [
  { id: 'pending', icon: <CircleIcon className="w-3 h-3" />, color: 'text-neutral-400' },
  { id: 'in-progress', icon: <PlayCircle className="w-3 h-3" />, color: 'text-sky-500' },
  { id: 'completed', icon: <CheckCircle2 className="w-3 h-3" />, color: 'text-green-500' },
  { id: 'failed', icon: <AlertCircle className="w-3 h-3" />, color: 'text-red-500' },
];

function colorClass(color: string) {
  switch (color) {
    case 'sky': return 'bg-sky-400';
    case 'green': return 'bg-green-400';
    case 'amber': return 'bg-amber-400';
    case 'indigo': return 'bg-indigo-400';
    case 'rose': return 'bg-rose-400';
    case 'teal': return 'bg-teal-400';
    case 'fuchsia': return 'bg-fuchsia-400';
    case 'orange': return 'bg-orange-400';
    case 'cyan': return 'bg-cyan-400';
    case 'violet': return 'bg-violet-400';
    default: return 'bg-neutral-400';
  }
}

function textColorClass(color: string) {
  switch (color) {
    case 'sky': return 'text-sky-500';
    case 'green': return 'text-green-500';
    case 'amber': return 'text-amber-500';
    case 'indigo': return 'text-indigo-500';
    case 'rose': return 'text-rose-500';
    case 'teal': return 'text-teal-500';
    case 'fuchsia': return 'text-fuchsia-500';
    case 'orange': return 'text-orange-500';
    case 'cyan': return 'text-cyan-500';
    case 'violet': return 'text-violet-500';
    default: return 'text-neutral-500';
  }
}

function presetIcon(type: string) {
  if (type === 'planning') return <ClipboardList className="w-3.5 h-3.5" />;
  if (type === 'verification') return <ShieldCheck className="w-3.5 h-3.5" />;
  return <Zap className="w-3.5 h-3.5" />;
}

function getRecordModeMeta(mode: TaskMode, language: 'zh' | 'en') {
  if (mode === 'daily') {
    return {
      label: language === 'zh' ? '日常' : 'Daily',
      icon: <Clock className="w-2.5 h-2.5" />,
      className: 'bg-amber-50 text-amber-600 ring-1 ring-amber-200/80',
    };
  }

  return {
    label: language === 'zh' ? '专业' : 'Pro',
    icon: <LayoutDashboard className="w-2.5 h-2.5" />,
    className: 'bg-sky-50 text-sky-600 ring-1 ring-sky-200/80',
  };
}

function formatRecordSavedExact(timestamp: number, language: 'zh' | 'en') {
  return new Date(timestamp).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRecordSavedRelative(timestamp: number, language: 'zh' | 'en', now: number) {
  const diffMs = Math.max(0, now - timestamp);
  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffMs < 60 * 1000) {
    return language === 'zh' ? '刚刚保存' : 'Saved just now';
  }

  if (diffMinutes < 60) {
    return language === 'zh' ? `${diffMinutes} 分钟前保存` : `Saved ${diffMinutes} min ago`;
  }

  if (diffHours < 24) {
    return language === 'zh' ? `${diffHours} 小时前保存` : `Saved ${diffHours} hr ago`;
  }

  if (diffDays < 7) {
    return language === 'zh' ? `${diffDays} 天前保存` : `Saved ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  return language === 'zh'
    ? `保存于 ${formatRecordSavedExact(timestamp, language)}`
    : `Saved on ${formatRecordSavedExact(timestamp, language)}`;
}

export default function SidebarPanel(props: SidebarPanelProps) {
  const {
    language,
    themeMode,
    isBatchAiLoading,
    hasApiKey,
    activeProviderName,
    settings,
    selectedNode,
    selectedEdge,
    selectedNodes,
    selectedPrompt,
    localRecords,
    currentRecordId,
    nodes,
    edges,
    mode,
    onNewProject,
    onDeleteSelectedEdge,
    onUpdateSelectedEdgeLabel,
    onUpdateSelectedEdgeColor,
    onDeleteSelectedNode,
    onUpdateNodeData,
    onStatusChange,
    onJumpToNode,
    onSelectedPromptChange,
    onModifySelected,
    onAbortSelectedAi,
    onAbortPlanGeneration,
    onLoadRecord,
    onDeleteRecord,
    onReorderRecords,
    onSelectProvider,
    onOpenSettings,
    onToggleTheme,
    onToggleLanguage,
    isGeneratingPlan,
    isGeneratingPlanCompleting,
    generatingRecordId,
    streamingContent,
    hideGeneratingRecord,
    onGeneratingCardAnchorRectChange,
    recordAiStates,
  } = props;

  const t = translations[language];
  const nodeData = selectedNode?.data as TaskData | undefined;
  const [isGroupDialogOpen, setIsGroupDialogOpen] = React.useState(false);
  const [pendingDeleteRecord, setPendingDeleteRecord] = React.useState<ProjectRecord | null>(null);
  const userGroupLink = 'http://qm.qq.com/cgi-bin/qm/qr?_wv=1027&k=ZNDt7B3SH40Y_mEUaONp7_fxD5UYlAR8&authKey=eUEJYwcwXh7NxujsGeNt%2FmnB3vhFdNKDOD7yZWeS1g8%2FRZ%2Flq9uw4yT%2BpG%2FhIsgf&noverify=0&group_code=2150768356';
  const userGroupQrSrc = '/yesflow-user-group-qr.png';
  const userGroupTitle = language === 'zh' ? 'YesFlow 用户群' : 'YesFlow User Group';
  const userGroupHint = language === 'zh' ? '点击查看加群二维码' : 'Open the QR code to join';
  const userGroupDialogDescription = language === 'zh'
    ? '打开手机 QQ 扫码，即可加入 YesFlow 一键工作流用户群。'
    : 'Scan this QR code with QQ on your phone to join the YesFlow user group.';
  const userGroupLinkLabel = language === 'zh' ? '打开加群链接' : 'Open invite link';
  const recordsListRef = React.useRef<HTMLDivElement | null>(null);
  const streamingIdleText = language === 'zh'
    ? '正在理解目标并拆分执行步骤...'
    : 'Understanding the goal and splitting execution steps...';
  const streamingCompleteText = language === 'zh'
    ? '计划已生成，正在写入项目记录...'
    : 'Plan generated, writing to project record...';

  const [streamTicker, setStreamTicker] = React.useState<{ upper: string; lower: string; step: number }>({
    upper: '',
    lower: streamingIdleText,
    step: 0,
  });
  const tickerLowerRef = React.useRef(streamingIdleText);
  const tickerPendingRef = React.useRef<string | null>(null);
  const tickerAnimatingRef = React.useRef(false);
  const tickerTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickerLastCommittedLengthRef = React.useRef(0);
  const tickerLastCommittedLineRef = React.useRef(streamingIdleText);
  const tickerShiftDurationMs = 420;
  const recordSlotRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const generatingStandaloneSlotRef = React.useRef<HTMLDivElement | null>(null);
  const isGeneratingActive = Boolean(isGeneratingPlan);
  const shouldHideGeneratingTargetRecord = isGeneratingActive && Boolean(hideGeneratingRecord);
  const generatingTargetRecordId = isGeneratingActive ? (generatingRecordId ?? null) : null;
  const hasGeneratingTargetRecord = generatingTargetRecordId
    ? localRecords.some((record) => record.id === generatingTargetRecordId)
    : false;
  const canReorderRecords = !isGeneratingPlan && localRecords.length > 1;
  const [draggingRecordId, setDraggingRecordId] = React.useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = React.useState<{ recordId: string; position: 'before' | 'after' } | null>(null);
  const suppressRecordClickRef = React.useRef(false);
  const [recordsNow, setRecordsNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const intervalId = window.setInterval(() => {
      setRecordsNow(Date.now());
    }, 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const setTickerLineImmediate = React.useCallback((line: string) => {
    const safeLine = line.trim() || streamingIdleText;
    tickerLowerRef.current = safeLine;
    tickerPendingRef.current = null;
    tickerAnimatingRef.current = false;
    tickerLastCommittedLineRef.current = safeLine;
    setStreamTicker((prev) => ({
      upper: '',
      lower: safeLine,
      step: prev.step + 1,
    }));
  }, [streamingIdleText]);

  const queueTickerShift = React.useCallback((nextLineRaw: string) => {
    const nextLine = nextLineRaw.trim();
    if (!nextLine) return;
    if (!tickerLowerRef.current) {
      setTickerLineImmediate(nextLine);
      return;
    }
    if (nextLine === tickerLowerRef.current) return;
    if (tickerAnimatingRef.current) {
      tickerPendingRef.current = nextLine;
      return;
    }

    tickerAnimatingRef.current = true;
    const previousLowerLine = tickerLowerRef.current;
    tickerLowerRef.current = nextLine;
    setStreamTicker((prev) => ({
      upper: previousLowerLine,
      lower: nextLine,
      step: prev.step + 1,
    }));

    if (tickerTimerRef.current) clearTimeout(tickerTimerRef.current);
    tickerTimerRef.current = setTimeout(() => {
      tickerAnimatingRef.current = false;
      setStreamTicker((prev) => ({
        upper: '',
        lower: prev.lower,
        step: prev.step,
      }));
      if (tickerPendingRef.current && tickerPendingRef.current !== tickerLowerRef.current) {
        const pendingLine = tickerPendingRef.current;
        tickerPendingRef.current = null;
        queueTickerShift(pendingLine);
      }
    }, tickerShiftDurationMs);
  }, [setTickerLineImmediate]);

  React.useEffect(() => {
    return () => {
      if (tickerTimerRef.current) clearTimeout(tickerTimerRef.current);
    };
  }, []);

  React.useEffect(() => {
    if (!isGeneratingPlan) {
      tickerLastCommittedLengthRef.current = 0;
      tickerPendingRef.current = null;
      return;
    }

    if (isGeneratingPlanCompleting) {
      setTickerLineImmediate(streamingCompleteText);
      return;
    }

    const normalized = (streamingContent || '').replace(/\s+/g, ' ').trim();
    if (!normalized) {
      setTickerLineImmediate(streamingIdleText);
      tickerLastCommittedLengthRef.current = 0;
      return;
    }

    const recentText = normalized.length > 220 ? normalized.slice(-220) : normalized;
    const segments = recentText
      .split(/(?<=[。！？!?；;，,])/)
      .map((segment) => segment.trim())
      .filter(Boolean);
    const latestSegment = (segments.at(-1) || recentText).trim();
    const lineCandidate = latestSegment.length > 34 ? `...${latestSegment.slice(-34)}` : latestSegment;
    const grewEnough = normalized.length - tickerLastCommittedLengthRef.current >= 8;
    const hitBoundary = /[。！？!?；;，,]$/.test(normalized);
    if (!grewEnough && !hitBoundary) return;
    if (lineCandidate === tickerLastCommittedLineRef.current) return;

    tickerLastCommittedLengthRef.current = normalized.length;
    tickerLastCommittedLineRef.current = lineCandidate;
    queueTickerShift(lineCandidate);
  }, [
    isGeneratingPlan,
    isGeneratingPlanCompleting,
    streamingContent,
    streamingIdleText,
    streamingCompleteText,
    queueTickerShift,
    setTickerLineImmediate,
  ]);

  React.useLayoutEffect(() => {
    if (!onGeneratingCardAnchorRectChange) return;

    let frameId = 0;
    const updateRect = () => {
      const element = generatingTargetRecordId
        ? (recordSlotRefs.current[generatingTargetRecordId] ?? recordsListRef.current)
        : (generatingStandaloneSlotRef.current ?? recordsListRef.current);
      if (!element) {
        onGeneratingCardAnchorRectChange(null);
        return;
      }

      const rect = element.getBoundingClientRect();
      onGeneratingCardAnchorRectChange({
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: 68,
      });
    };

    const scheduleUpdate = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(updateRect);
    };

    scheduleUpdate();

    const element = recordsListRef.current;
    const targetElement = generatingTargetRecordId ? recordSlotRefs.current[generatingTargetRecordId] : null;
    const standaloneElement = !generatingTargetRecordId ? generatingStandaloneSlotRef.current : null;
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(scheduleUpdate);
      if (element) observer.observe(element);
      if (targetElement && targetElement !== element) observer.observe(targetElement);
      if (standaloneElement && standaloneElement !== element && standaloneElement !== targetElement) observer.observe(standaloneElement);
    }

    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('scroll', scheduleUpdate, true);

    return () => {
      cancelAnimationFrame(frameId);
      observer?.disconnect();
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('scroll', scheduleUpdate, true);
    };
  }, [onGeneratingCardAnchorRectChange, localRecords.length, isGeneratingPlan, generatingTargetRecordId, hideGeneratingRecord]);

  const setRecordSlotRef = React.useCallback((recordId: string, element: HTMLDivElement | null) => {
    if (element) {
      recordSlotRefs.current[recordId] = element;
      return;
    }

    delete recordSlotRefs.current[recordId];
  }, []);

  const clearRecordDragState = React.useCallback(() => {
    setDraggingRecordId(null);
    setDropIndicator(null);
  }, []);

  const handleRecordClick = React.useCallback((record: ProjectRecord) => {
    if (suppressRecordClickRef.current) {
      suppressRecordClickRef.current = false;
      return;
    }

    onLoadRecord(record);
  }, [onLoadRecord]);

  const handleRecordDragStart = React.useCallback((event: React.DragEvent<HTMLDivElement>, recordId: string) => {
    if (!canReorderRecords) {
      event.preventDefault();
      return;
    }

    setDraggingRecordId(recordId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', recordId);
  }, [canReorderRecords]);

  const handleRecordDragOver = React.useCallback((event: React.DragEvent<HTMLDivElement>, recordId: string) => {
    if (!draggingRecordId || draggingRecordId === recordId) return;

    event.preventDefault();

    const rect = event.currentTarget.getBoundingClientRect();
    const position = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    const nextIndicator = { recordId, position } as const;

    if (
      dropIndicator?.recordId === nextIndicator.recordId &&
      dropIndicator.position === nextIndicator.position
    ) {
      return;
    }

    setDropIndicator(nextIndicator);
  }, [draggingRecordId, dropIndicator]);

  const handleRecordDrop = React.useCallback((event: React.DragEvent<HTMLDivElement>, recordId: string) => {
    event.preventDefault();

    if (!draggingRecordId || draggingRecordId === recordId) {
      clearRecordDragState();
      return;
    }

    const position = dropIndicator?.recordId === recordId ? dropIndicator.position : 'before';
    suppressRecordClickRef.current = true;
    onReorderRecords(draggingRecordId, recordId, position);
    clearRecordDragState();

    window.setTimeout(() => {
      suppressRecordClickRef.current = false;
    }, 0);
  }, [clearRecordDragState, draggingRecordId, dropIndicator, onReorderRecords]);

  const handleDeleteRecordClick = React.useCallback((record: ProjectRecord, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    if (currentRecordId === record.id) {
      setPendingDeleteRecord(record);
      return;
    }

    onDeleteRecord(record.id);
  }, [currentRecordId, onDeleteRecord]);

  const confirmDeleteRecord = React.useCallback(() => {
    if (!pendingDeleteRecord) return;

    onDeleteRecord(pendingDeleteRecord.id);
    setPendingDeleteRecord(null);
  }, [onDeleteRecord, pendingDeleteRecord]);

  const renderGeneratingCard = React.useCallback(() => (
    <AnimatePresence>
      {isGeneratingPlan && (
        <motion.div
          key="ai-generating-card"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
          className={`absolute inset-0 h-[68px] overflow-hidden rounded-xl border border-primary/25 bg-primary/5 p-3 ${isGeneratingPlanCompleting ? 'generating-complete' : ''}`}
        >
          <div className="absolute inset-0 generating-shimmer" />
          <div className="relative flex h-full items-center gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className="flex min-w-0 flex-1 flex-col justify-center">
                <div className="flex min-w-0 items-center gap-2">
                  {isGeneratingPlanCompleting ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                  )}
                  <span className="text-xs font-bold text-primary truncate">
                    {isGeneratingPlanCompleting
                      ? (language === 'zh' ? 'AI 生成完成' : 'AI Plan Ready')
                      : (language === 'zh' ? 'AI 正在生成计划...' : 'AI Generating...')}
                  </span>
                  {!isGeneratingPlanCompleting && (
                    <div className="flex shrink-0 items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/55 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/55 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/55 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  )}
                </div>
                <div className="relative mt-1 h-6 overflow-hidden pr-1 text-[9.5px] leading-3 text-primary/75">
                  <AnimatePresence initial={false}>
                    {streamTicker.upper && (
                      <motion.div
                        key={`stream-upper-${streamTicker.step}`}
                        initial={{ y: 0, opacity: 0.82 }}
                        animate={{ y: -12, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: tickerShiftDurationMs / 1000, ease: [0.2, 0.8, 0.2, 1] }}
                        className="absolute left-0 right-0 top-0 h-3 overflow-hidden whitespace-nowrap text-ellipsis"
                      >
                        {streamTicker.upper}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <motion.div
                    key={`stream-lower-${streamTicker.step}-${streamTicker.lower}`}
                    initial={streamTicker.upper ? { y: 12, opacity: 0.2 } : { y: 0, opacity: 0.85 }}
                    animate={{ y: 0, opacity: 0.88 }}
                    transition={{ duration: tickerShiftDurationMs / 1000, ease: [0.2, 0.8, 0.2, 1] }}
                    className={`absolute left-0 right-0 top-0 h-3 overflow-hidden whitespace-nowrap text-ellipsis ${isGeneratingPlanCompleting ? '' : 'text-primary/70'}`}
                  >
                    {streamTicker.lower}
                  </motion.div>
                  {!isGeneratingPlanCompleting && (
                    <span className="absolute right-0 top-0 inline-block h-2.5 w-[1.5px] bg-primary/55 animate-pulse" />
                  )}
                </div>
              </div>
            </div>
            {!isGeneratingPlanCompleting && (
              <button
                type="button"
                onClick={onAbortPlanGeneration}
                aria-label={language === 'zh' ? '停止生成' : 'Stop generation'}
                title={language === 'zh' ? '停止生成' : 'Stop generation'}
                className="flex h-8 w-8 shrink-0 items-center justify-center self-center rounded-full bg-red-500 text-white shadow-[0_12px_24px_-14px_rgba(239,68,68,0.92)] ring-2 ring-white/80 transition-all hover:scale-[1.06] hover:bg-red-600 hover:shadow-[0_14px_28px_-14px_rgba(220,38,38,0.95)]"
              >
                <CircleStop className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  ), [isGeneratingPlan, isGeneratingPlanCompleting, language, onAbortPlanGeneration, streamTicker.lower, streamTicker.step, streamTicker.upper, tickerShiftDurationMs]);

  const renderRecordCard = React.useCallback((record: ProjectRecord, options?: { hidden?: boolean; entrance?: boolean }) => {
    const isHidden = options?.hidden ?? false;
    const isActive = currentRecordId === record.id;
    const isDragging = draggingRecordId === record.id;
    const showDropIndicator = dropIndicator?.recordId === record.id && draggingRecordId !== record.id;
    const modeMeta = getRecordModeMeta(record.mode, language);
    const recordAiState = recordAiStates[record.id];
    const isRecordAiRunning = (recordAiState?.runningNodeIds.length || 0) > 0;
    const hasUnreadAiResult = Boolean(recordAiState?.unread && recordAiState?.latestStatus);
    const hasAiResult = Boolean(recordAiState?.latestStatus);
    const savedRelative = formatRecordSavedRelative(record.lastModified, language, recordsNow);
    const savedExact = formatRecordSavedExact(record.lastModified, language);
    const aiResultTone = recordAiState?.latestStatus === 'error'
      ? {
          dot: 'bg-red-500',
          tint: 'text-red-500',
          ring: 'ring-red-200/80',
          sweep: 'from-transparent via-red-400/35 to-transparent',
        }
      : {
          dot: 'bg-emerald-500',
          tint: 'text-emerald-500',
          ring: 'ring-emerald-200/80',
          sweep: 'from-transparent via-emerald-400/35 to-transparent',
        };

    return (
      <div
        key={record.id}
        draggable={canReorderRecords && !isHidden}
        onDragStart={(event) => handleRecordDragStart(event, record.id)}
        onDragOver={(event) => handleRecordDragOver(event, record.id)}
        onDrop={(event) => handleRecordDrop(event, record.id)}
        onDragEnd={clearRecordDragState}
        onClick={() => {
          if (!isHidden) handleRecordClick(record);
        }}
        className={`group relative h-[68px] rounded-xl transition-all ${
          options?.entrance ? 'generating-entrance' : ''
        } ${
          isHidden ? 'opacity-0 pointer-events-none' : ''
        } ${
          canReorderRecords ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
        } ${
          isDragging ? 'scale-[0.985] opacity-70' : ''
        }`}
      >
        {showDropIndicator && (
          <span
            className={`absolute left-3 right-3 z-10 h-0.5 rounded-full bg-primary/80 ${
              dropIndicator?.position === 'before' ? '-top-1' : '-bottom-1'
            }`}
          />
        )}
        <div
          className={`relative h-full rounded-xl border p-3 transition-all ${
            isActive
              ? 'bg-primary/5 border-primary/20 ring-1 ring-primary/10'
              : 'bg-neutral-50 border-neutral-100 hover:border-neutral-200 hover:bg-white'
          }`}
        >
          {hasAiResult && (
            <div
              className="pointer-events-none absolute right-2 top-2 z-10"
              title={recordAiState?.latestMessage || (recordAiState?.latestStatus === 'error'
                ? (language === 'zh' ? 'AI 任务失败' : 'AI task failed')
                : (language === 'zh' ? 'AI 任务已完成' : 'AI task completed'))}
            >
              <span
                className={`block h-2.5 w-2.5 rounded-full ${aiResultTone.dot} ${
                  recordAiState?.unread ? 'ring-4' : ''
                } ${recordAiState?.latestStatus === 'error' ? 'ring-red-100/90' : 'ring-emerald-100/90'}`}
              />
            </div>
          )}
          {hasUnreadAiResult && (
            <motion.div
              initial={{ x: '-120%', opacity: 0 }}
              animate={{ x: '140%', opacity: [0, 0.9, 0] }}
              transition={{ duration: 0.95, ease: [0.2, 0.8, 0.2, 1] }}
              className={`pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r ${aiResultTone.sweep}`}
            />
          )}
          <div className="flex h-full items-center gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className={`flex shrink-0 items-center justify-center rounded-md border border-neutral-200/80 bg-white/90 p-1 text-neutral-300 transition-opacity ${
                canReorderRecords ? 'opacity-70 group-hover:opacity-100' : 'opacity-40'
              }`}>
                <GripVertical className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className={`min-w-0 flex-1 text-xs font-bold truncate ${isActive ? 'text-primary' : 'text-neutral-700'}`}>{record.name}</h4>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[10px] text-neutral-400" title={savedExact}>
                  <Clock className="w-2.5 h-2.5" />
                  <span>{savedRelative}</span>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 self-center">
              <span className={`inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2.5 text-[9px] font-black uppercase tracking-[0.14em] ${modeMeta.className}`}>
                {modeMeta.icon}
                <span>{modeMeta.label}</span>
              </span>
              {isRecordAiRunning ? (
                <div
                  className={`relative flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15 ${
                    isHidden ? 'pointer-events-none opacity-0' : 'opacity-100'
                  }`}
                  title={language === 'zh' ? '该记录中有 AI 任务进行中' : 'AI task running in this record'}
                >
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                </div>
              ) : (
                <button
                  onClick={(event) => handleDeleteRecordClick(record, event)}
                  className={`flex h-6 w-6 items-center justify-center rounded-lg text-neutral-300 transition-all hover:bg-red-50 hover:text-red-500 ${
                    isHidden ? 'pointer-events-none opacity-0' : 'opacity-0 group-hover:opacity-100'
                  }`}
                  title={language === 'zh' ? '删除记录' : 'Delete record'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }, [
    canReorderRecords,
    clearRecordDragState,
    currentRecordId,
    draggingRecordId,
    dropIndicator,
    handleRecordClick,
    handleDeleteRecordClick,
    handleRecordDragOver,
    handleRecordDragStart,
    handleRecordDrop,
    language,
    recordsNow,
    recordAiStates,
  ]);

  const renderEdgeList = () => {
    if (!selectedNode || !nodeData) return null;

    return (
      <div className="pt-4 border-t border-neutral-200">
        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-3">{t.edgeList}</label>
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <ArrowRight className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{t.outgoing}</span>
            </div>
            <div className="space-y-1.5 pl-4 ml-1.2 border-l-2 border-neutral-100">
              {edges.filter((edge) => edge.source === selectedNode.id).length === 0 ? (
                <span className="text-[10px] text-neutral-300 italic">{language === 'zh' ? '无' : 'None'}</span>
              ) : edges.filter((edge) => edge.source === selectedNode.id).map((edge) => {
                const targetNode = nodes.find((node) => node.id === edge.target);
                return (
                  <div key={edge.id} className="group flex items-center justify-between text-xs py-1">
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="font-bold text-neutral-700 truncate">{(targetNode?.data as TaskData | undefined)?.label || 'Unknown'}</span>
                      {edge.label && <span className="text-[9px] text-neutral-400 truncate opacity-60">[{String(edge.label)}]</span>}
                    </div>
                    <button
                      onClick={() => onJumpToNode(edge.target)}
                      className="p-1 px-2 bg-neutral-100 hover:bg-primary/10 text-[9px] font-bold text-neutral-400 hover:text-primary rounded-lg transition-all"
                    >
                      {language === 'zh' ? '跳转' : 'GOTO'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <ArrowLeft className="w-3 h-3 text-emerald-500" />
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{t.incoming}</span>
            </div>
            <div className="space-y-1.5 pl-4 ml-1.2 border-l-2 border-neutral-100">
              {edges.filter((edge) => edge.target === selectedNode.id).length === 0 ? (
                <span className="text-[10px] text-neutral-300 italic">{language === 'zh' ? '无' : 'None'}</span>
              ) : edges.filter((edge) => edge.target === selectedNode.id).map((edge) => {
                const sourceNode = nodes.find((node) => node.id === edge.source);
                return (
                  <div key={edge.id} className="group flex items-center justify-between text-xs py-1">
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="font-bold text-neutral-700 truncate">{(sourceNode?.data as TaskData | undefined)?.label || 'Unknown'}</span>
                      {edge.label && <span className="text-[9px] text-neutral-400 truncate opacity-60">[{String(edge.label)}]</span>}
                    </div>
                    <button
                      onClick={() => onJumpToNode(edge.source)}
                      className="p-1 px-2 bg-neutral-100 hover:bg-emerald-50 text-[9px] font-bold text-neutral-400 hover:text-emerald-600 rounded-lg transition-all"
                    >
                      {language === 'zh' ? '跳转' : 'GOTO'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderNodeDetailsPanel = () => {
    if (!selectedNode || !nodeData) return null;
    const isDailyTaskView = mode === 'daily' && !nodeData.isGroup;

    return (
      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{t.nodeTitle}</label>
          <input
            type="text"
            value={nodeData.label}
            onChange={(e) => onUpdateNodeData(selectedNode.id, { label: e.target.value })}
            className="w-full mt-1 px-3 py-2 text-sm border border-neutral-200 rounded-lg outline-none bg-white font-medium focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
        {!isDailyTaskView && (
          <div>
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{t.nodeDescription}</label>
            <textarea
              value={nodeData.description}
              onChange={(e) => onUpdateNodeData(selectedNode.id, { description: e.target.value })}
              className="w-full mt-1 px-3 py-2 text-xs border border-neutral-200 rounded-lg outline-none bg-white h-24 resize-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        )}
        {!nodeData.isGroup && !isDailyTaskView && (
          <div>
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-2">{t.category}</label>
            <input
              type="text"
              value={nodeData.category || ''}
              onChange={(e) => onUpdateNodeData(selectedNode.id, { category: e.target.value })}
              placeholder={language === 'zh' ? '所属模块...' : 'Module...'}
              className="w-full mt-1 px-3 py-2 text-xs border border-neutral-200 rounded-lg outline-none bg-white font-medium focus:ring-2 focus:ring-primary/20 transition-all"
              list="category-list"
            />
            <datalist id="category-list">
              {settings.categories.map((category) => <option key={category} value={category} />)}
            </datalist>
          </div>
        )}
        {!nodeData.isGroup && (
          <>
            <div className="h-px bg-neutral-200 my-2" />
            <div>
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-2">{t.nodeType}</label>
              <div className="flex flex-wrap gap-1.5 bg-neutral-100 p-1.5 rounded-xl">
                {settings.nodePresets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => onUpdateNodeData(selectedNode.id, { type: preset.type, typeLabel: preset.label, color: preset.color })}
                    className={`flex-1 min-w-[30%] py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                      nodeData.type === preset.type ? 'bg-white shadow-sm ring-1 ring-black/5' : 'hover:bg-white/50 grayscale opacity-60 hover:opacity-100'
                    }`}
                    title={preset.label}
                  >
                    <span className={textColorClass(preset.color)}>
                      {presetIcon(preset.type)}
                    </span>
                    <span className="text-[10px] font-bold text-neutral-600 whitespace-nowrap">{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        <div>
          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-2">{language === 'zh' ? '主题色' : 'Theme Color'}</label>
          <div className="flex flex-wrap gap-2">
            {NODE_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => onUpdateNodeData(selectedNode.id, { color: color === 'neutral' ? undefined : color })}
                className={`w-6 h-6 rounded-full border-2 transition-all ${
                  nodeData.color === color || (color === 'neutral' && !nodeData.color)
                    ? 'border-primary ring-2 ring-primary/20 scale-110'
                    : 'border-white shadow-sm hover:scale-110'
                } ${color === 'neutral' ? 'bg-neutral-100' : colorClass(color)}`}
              />
            ))}
          </div>
        </div>
        {!nodeData.isGroup && (
          <div>
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-2">{t.nodeStatus}</label>
            <div className="grid grid-cols-2 gap-1.5">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status.id}
                  onClick={() => onStatusChange(selectedNode.id, status.id)}
                  className={`px-2 py-1.5 rounded-lg border flex items-center gap-2 transition-all ${
                    nodeData.status === status.id
                      ? 'bg-white border-primary/20 shadow-sm ring-1 ring-primary/5'
                      : 'bg-transparent border-neutral-100 hover:border-neutral-200 grayscale opacity-60'
                  }`}
                >
                  <span className={status.color}>{status.icon}</span>
                  <span className="text-[10px] font-bold text-neutral-600">{t.statuses[status.id]}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {renderEdgeList()}
      </div>
    );
  };

  const renderFocusView = () => (
    <AnimatePresence mode="wait">
      {selectedEdge ? (
        <motion.section key={selectedEdge.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-neutral-900">{language === 'zh' ? '连线详情' : 'Edge Details'}</h3>
            <button onClick={onDeleteSelectedEdge} className="text-neutral-400 hover:text-red-500">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Label</label>
              <input
                type="text"
                value={(selectedEdge.label as string) || ''}
                onChange={(e) => onUpdateSelectedEdgeLabel(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-sm border border-neutral-200 rounded-lg outline-none bg-white font-medium"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-2">{t.color}</label>
              <div className="flex flex-wrap gap-2">
                {EDGE_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => onUpdateSelectedEdgeColor(color === 'neutral' ? undefined : color)}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${
                      ((selectedEdge.data as { color?: string } | undefined)?.color === color) || (color === 'neutral' && !(selectedEdge.data as { color?: string } | undefined)?.color)
                        ? 'border-primary ring-2 ring-primary/20 scale-110'
                        : 'border-white shadow-sm hover:scale-110'
                    } ${colorClass(color)}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </motion.section>
      ) : selectedNode && nodeData ? (
        <motion.section key={selectedNode.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">{t.nodeDetails}</h3>
              {nodeData.tools?.schedule?.enabled && nodeData.tools?.schedule?.items?.length > 0 && (() => {
                const firstItemWithTime = nodeData.tools.schedule.items.find(item => item.dateTime);
                if (!firstItemWithTime) return null;
                const { dateTime } = firstItemWithTime;
                if (!dateTime) return null;
                return (
                  <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-neutral-400 ring-1 ring-black/5">
                    <Clock className="w-2.5 h-2.5" />
                    <span>{new Date(dateTime).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: firstItemWithTime.allDay ? undefined : '2-digit',
                      minute: firstItemWithTime.allDay ? undefined : '2-digit',
                    })}</span>
                  </div>
                );
              })()}
            </div>
            <button onClick={onDeleteSelectedNode} className="text-neutral-400 hover:text-red-500">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {renderNodeDetailsPanel()}
        </motion.section>
      ) : selectedNodes.length > 1 ? (
        <motion.section key="multi" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200">
          <h3 className="text-sm font-bold text-neutral-900 mb-4">{t.selectedCount.replace('{count}', selectedNodes.length.toString())}</h3>
          <textarea
            value={selectedPrompt}
            onChange={(e) => onSelectedPromptChange(e.target.value)}
            placeholder={t.modifyPromptPlaceholder}
            className="w-full h-24 p-3 border border-neutral-200 rounded-xl text-xs outline-none bg-white"
          />
          <div className="flex gap-2 mt-2">
            <button onClick={onModifySelected} disabled={isBatchAiLoading} className="flex-1 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
              {isBatchAiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {t.modifySelected}
            </button>
            {isBatchAiLoading && (
              <button onClick={onAbortSelectedAi} className="px-3 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs font-bold hover:bg-red-100 transition-all">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </motion.section>
      ) : (
        <div className="space-y-8">
          {/* 项目记录区域 - 当有记录或正在生成时显示 */}
          {(localRecords.length > 0 || isGeneratingPlan) ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2 font-bold text-neutral-400 text-[10px] uppercase tracking-widest">
                <History className="w-3 h-3" />
                <span>{language === 'zh' ? '项目记录' : 'Project Records'} ({localRecords.length})</span>
              </div>
              <div className="space-y-2" ref={recordsListRef}>
                {isGeneratingActive && !hasGeneratingTargetRecord && (
                  <div ref={generatingStandaloneSlotRef} className="relative h-[68px]">
                    {renderGeneratingCard()}
                  </div>
                )}
                {localRecords.map((record) => {
                  const isGeneratingTarget = generatingTargetRecordId === record.id;

                  return (
                    <div
                      key={record.id}
                      ref={(element) => setRecordSlotRef(record.id, element)}
                      className="relative h-[68px]"
                    >
                      <motion.div initial={false} className="relative">
                        {renderRecordCard(record, {
                          hidden: shouldHideGeneratingTargetRecord && isGeneratingTarget,
                          entrance: !shouldHideGeneratingTargetRecord && isGeneratingTarget,
                        })}
                      </motion.div>
                      {isGeneratingTarget && renderGeneratingCard()}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 opacity-40">
              <Info className="w-8 h-8 text-neutral-300 mb-3" />
              <p className="text-xs text-neutral-500">{t.emptyNodeSelection}</p>
            </div>
          )}
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <div className="flex flex-col h-full w-[380px]">
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <LayoutDashboard className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900 tracking-tight">YesFlow</h1>
              <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">{t.subtitle}</p>
            </div>
          </div>
          <button onClick={() => setIsGroupDialogOpen(true)} className="p-2 bg-neutral-100 hover:bg-primary/10 rounded-lg text-xs font-bold transition-all flex items-center gap-1 text-neutral-500 hover:text-primary" title={userGroupHint}>
            <Users className="w-3.5 h-3.5" />
          </button>
        </div>

        <CustomScrollArea className="min-h-0 flex-1" viewportClassName="h-full p-6 pt-4">
          <div className="space-y-8">
            <button
              onClick={onNewProject}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-br from-primary to-indigo-600 rounded-2xl text-white shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md group-hover:rotate-90 transition-transform duration-300">
                  <Plus className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-bold">{t.newPlan}</h3>
                  <p className="text-[10px] text-white/60 tracking-wider">INITIATE AI BRAINSTORMING</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>

            {renderFocusView()}
          </div>
        </CustomScrollArea>

        <SidebarFooter
          language={language}
          themeMode={themeMode}
          systemStatusLabel={t.systemStatus}
          readyLabel={hasApiKey ? t.ready : (language === 'zh' ? '待配置' : 'Pending')}
          hasApiKey={hasApiKey}
          activeProviderName={activeProviderName}
          providers={settings.apiConfig.providers}
          onSelectProvider={onSelectProvider}
          onOpenSettings={onOpenSettings}
          onToggleTheme={onToggleTheme}
          onToggleLanguage={onToggleLanguage}
        />
      </div>

      <AnimatePresence>
        {isGroupDialogOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[220] flex items-center justify-center bg-white/25 p-4 backdrop-blur-xl"
            onClick={() => setIsGroupDialogOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.94 }}
              transition={{ duration: 0.2 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-sm overflow-hidden rounded-[2rem] border border-neutral-100 bg-white shadow-[0_32px_120px_-24px_rgba(15,23,42,0.35)]"
            >
              <div className="flex items-start justify-between border-b border-neutral-100 px-6 py-5">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                    <Users className="w-3.5 h-3.5" />
                    <span>{language === 'zh' ? '用户社群' : 'Community'}</span>
                  </div>
                  <h3 className="mt-3 text-xl font-bold text-neutral-900">{userGroupTitle}</h3>
                </div>
                <button
                  onClick={() => setIsGroupDialogOpen(false)}
                  className="rounded-full bg-neutral-100 p-2 text-neutral-400 transition-all hover:bg-neutral-200 hover:text-neutral-700"
                  title={language === 'zh' ? '关闭' : 'Close'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-5 px-6 py-6">
                <div className="rounded-[1.75rem] bg-neutral-50 p-4 ring-1 ring-black/5">
                  <img
                    src={userGroupQrSrc}
                    alt={userGroupTitle}
                    className="w-full rounded-2xl bg-white"
                    loading="lazy"
                  />
                </div>
                <p className="text-center text-xs leading-6 text-neutral-500">
                  {userGroupDialogDescription}
                </p>
                <a
                  href={userGroupLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-black"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{userGroupLinkLabel}</span>
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingDeleteRecord && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[230] flex items-center justify-center bg-white/25 p-4 backdrop-blur-xl"
            onClick={() => setPendingDeleteRecord(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.94 }}
              transition={{ duration: 0.2 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-sm overflow-hidden rounded-[2rem] border border-neutral-100 bg-white shadow-[0_32px_120px_-24px_rgba(15,23,42,0.35)]"
            >
              <div className="flex items-start justify-between border-b border-neutral-100 px-6 py-5">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{language === 'zh' ? '删除确认' : 'Delete Confirm'}</span>
                  </div>
                  <h3 className="mt-3 text-xl font-bold text-neutral-900">
                    {language === 'zh' ? '确认删除当前记录吗？' : 'Delete this record?'}
                  </h3>
                </div>
                <button
                  onClick={() => setPendingDeleteRecord(null)}
                  className="rounded-full bg-neutral-100 p-2 text-neutral-400 transition-all hover:bg-neutral-200 hover:text-neutral-700"
                  title={language === 'zh' ? '关闭' : 'Close'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-5 px-6 py-6">
                <div className="rounded-[1.5rem] bg-neutral-50 px-4 py-4 ring-1 ring-black/5">
                  <p className="text-sm font-semibold text-neutral-800">
                    {language === 'zh'
                      ? `确认删除「${pendingDeleteRecord.name}」记录吗？`
                      : `Are you sure you want to delete "${pendingDeleteRecord.name}"?`}
                  </p>
                  <p className="mt-2 text-xs leading-6 text-neutral-500">
                    {language === 'zh'
                      ? '删除后将从项目记录中移除，且无法恢复。'
                      : 'This will remove it from project records and cannot be undone.'}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => setPendingDeleteRecord(null)}
                    className="rounded-2xl border border-neutral-200 px-4 py-2 text-sm font-bold text-neutral-500 transition-all hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-700"
                  >
                    {language === 'zh' ? '取消' : 'Cancel'}
                  </button>
                  <button
                    onClick={confirmDeleteRecord}
                    className="rounded-2xl bg-red-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-red-500/20 transition-all hover:bg-red-600"
                  >
                    {language === 'zh' ? '确认删除' : 'Delete'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
