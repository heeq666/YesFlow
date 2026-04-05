import React from 'react';
import { NodeToolbar, Position } from '@xyflow/react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Check,
  Copy,
  ExternalLink,
  GripVertical,
  Plus,
  Upload,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { createPortal } from 'react-dom';

import {
  getAvailableNodeTools,
  composeScheduleDateTime,
  getToolConfig,
  getToolLabel,
  getToolSnapshot,
  toInputDateValue,
  toInputTimeValue,
} from './NodeToolConfig';
import { NodeSettingsContext } from '../contexts/NodeSettingsContext';
import type { NodeToolType, ScheduleTimeType, TaskData } from '../types';
import {
  MAX_NODE_IMAGE_FILE_BYTES,
  SCHEDULE_TIME_TYPE_OPTIONS,
  createEmptyLinkItem,
  createImageItem,
  deriveNodeImageTitle,
  deriveNodeLinkTitle,
  ensureToolState,
  fetchNodeLinkTitle,
  getNodeToolImages,
  getScheduleTimeTypeDefaultLabel,
  moveItemById,
  moveItemToTargetId,
  normalizeNodeImageSource,
  normalizeNodeLinkUrl,
} from '../utils/nodeTools';
import { copyTextToClipboard } from '../utils/clipboard';

type NodeToolToolbarProps = {
  id: string;
  data: TaskData;
  selected: boolean;
  visible?: boolean;
  onClose?: () => void;
  quickToolRequest?: { tool: NodeToolType; nonce: number } | null;
};

function getCurrentScheduleSeed() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  const hours = `${now.getHours()}`.padStart(2, '0');
  const minutes = `${now.getMinutes()}`.padStart(2, '0');

  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`,
  };
}

function getAccentTone(toolId: NodeToolType) {
  switch (toolId) {
    case 'table':
      return {
        soft: 'bg-sky-50',
        tint: 'bg-sky-500/12',
        text: 'text-sky-600',
        border: 'border-sky-200',
        button: 'bg-sky-500 text-white hover:bg-sky-600',
        ring: 'ring-sky-200/80',
        glow: 'shadow-[0_18px_40px_-24px_rgba(14,165,233,0.65)]',
      };
    case 'document':
      return {
        soft: 'bg-emerald-50',
        tint: 'bg-emerald-500/12',
        text: 'text-emerald-600',
        border: 'border-emerald-200',
        button: 'bg-emerald-500 text-white hover:bg-emerald-600',
        ring: 'ring-emerald-200/80',
        glow: 'shadow-[0_18px_40px_-24px_rgba(16,185,129,0.6)]',
      };
    case 'link':
      return {
        soft: 'bg-violet-50',
        tint: 'bg-violet-500/12',
        text: 'text-violet-600',
        border: 'border-violet-200',
        button: 'bg-violet-500 text-white hover:bg-violet-600',
        ring: 'ring-violet-200/80',
        glow: 'shadow-[0_18px_40px_-24px_rgba(139,92,246,0.6)]',
      };
    case 'schedule':
      return {
        soft: 'bg-amber-50',
        tint: 'bg-amber-500/12',
        text: 'text-amber-600',
        border: 'border-amber-200',
        button: 'bg-amber-500 text-white hover:bg-amber-600',
        ring: 'ring-amber-200/80',
        glow: 'shadow-[0_18px_40px_-24px_rgba(245,158,11,0.6)]',
      };
    case 'image':
      return {
        soft: 'bg-rose-50',
        tint: 'bg-rose-500/12',
        text: 'text-rose-600',
        border: 'border-rose-200',
        button: 'bg-rose-500 text-white hover:bg-rose-600',
        ring: 'ring-rose-200/80',
        glow: 'shadow-[0_18px_40px_-24px_rgba(244,63,94,0.55)]',
      };
    default:
      return {
        soft: 'bg-primary/10',
        tint: 'bg-primary/10',
        text: 'text-primary',
        border: 'border-primary/20',
        button: 'bg-primary text-white hover:bg-primary/90',
        ring: 'ring-primary/20',
        glow: 'shadow-[0_18px_40px_-24px_rgba(37,99,235,0.55)]',
      };
  }
}

export default function NodeToolToolbar({
  id,
  data,
  selected,
  visible = true,
  onClose,
  quickToolRequest,
}: NodeToolToolbarProps) {
  const context = React.useContext(NodeSettingsContext);
  const isDarkTheme = context.themeMode === 'dark';
  const language = data.language || 'zh';
  const availableTools = React.useMemo(
    () => getAvailableNodeTools(context.nodeTools.enabledTools),
    [context.nodeTools.enabledTools],
  );
  const [activeTool, setActiveTool] = React.useState<NodeToolType | null>(null);
  const [openingTool, setOpeningTool] = React.useState<NodeToolType | null>(null);
  const [documentDraft, setDocumentDraft] = React.useState('');
  const [imageUrlDraft, setImageUrlDraft] = React.useState('');
  const [copiedImageId, setCopiedImageId] = React.useState<string | null>(null);
  const [draggingImageId, setDraggingImageId] = React.useState<string | null>(null);
  const [dropTargetImageId, setDropTargetImageId] = React.useState<string | null>(null);
  const [imageUploadFeedback, setImageUploadFeedback] = React.useState<string | null>(null);
  const [previewImage, setPreviewImage] = React.useState<{ src: string; title: string; alt: string } | null>(null);
  const [previewZoom, setPreviewZoom] = React.useState(1);
  const openingTimerRef = React.useRef<number | null>(null);
  const imageCopyTimerRef = React.useRef<number | null>(null);
  const imageFeedbackTimerRef = React.useRef<number | null>(null);
  const linkInputRefs = React.useRef<Record<string, HTMLInputElement | null>>({});
  const pendingLinkFocusIdRef = React.useRef<string | null>(null);
  const linkRequestControllersRef = React.useRef<Record<string, AbortController>>({});
  const imageInputRef = React.useRef<HTMLInputElement | null>(null);
  const dataRef = React.useRef(data);

  const hasToolButtons = availableTools.length > 0;

  React.useEffect(() => {
    dataRef.current = data;
  }, [data]);

  React.useEffect(() => {
    if (!selected) {
      if (openingTimerRef.current) {
        window.clearTimeout(openingTimerRef.current);
        openingTimerRef.current = null;
      }
      setOpeningTool(null);
      setActiveTool(null);
      setPreviewImage(null);
      return;
    }

    if (!visible && !activeTool) {
      if (openingTimerRef.current) {
        window.clearTimeout(openingTimerRef.current);
        openingTimerRef.current = null;
      }
      setOpeningTool(null);
    }
  }, [selected, visible, activeTool]);

  React.useEffect(() => {
    return () => {
      if (openingTimerRef.current) {
        window.clearTimeout(openingTimerRef.current);
      }
      if (imageCopyTimerRef.current) {
        window.clearTimeout(imageCopyTimerRef.current);
      }
      if (imageFeedbackTimerRef.current) {
        window.clearTimeout(imageFeedbackTimerRef.current);
      }
      for (const controller of Object.values(linkRequestControllersRef.current) as AbortController[]) {
        controller.abort();
      }
    };
  }, []);

  React.useEffect(() => {
    if (!activeTool) return;

    if (activeTool === 'document') {
      setDocumentDraft(data.tools?.document?.content || '');
      return;
    }
  }, [activeTool, data.tools]);

  React.useEffect(() => {
    const pendingId = pendingLinkFocusIdRef.current;
    if (!pendingId) return;
    const target = linkInputRefs.current[pendingId];
    if (!target) return;
    target.focus();
    pendingLinkFocusIdRef.current = null;
  }, [data.tools?.link?.items]);

  React.useEffect(() => {
    if (!visible && !activeTool) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (previewImage) {
        setPreviewImage(null);
        return;
      }
      if (activeTool) {
        commitQuickDraft(activeTool);
        setActiveTool(null);
        return;
      }
      onClose?.();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [activeTool, onClose, previewImage, visible]);

  React.useEffect(() => {
    if (!previewImage) return;
    setPreviewZoom(1);
  }, [previewImage]);

  React.useEffect(() => {
    if (!quickToolRequest || !selected) return;
    openQuickTool(quickToolRequest.tool);
  }, [quickToolRequest?.nonce, quickToolRequest, selected]);

  if (!selected || !hasToolButtons) {
    return null;
  }

  const updateTools = (tool: NodeToolType, nextTools: TaskData['tools']) => {
    data.onUpdateData?.(id, {
      tools: {
        ...nextTools,
        activeTool: tool,
      },
    });
  };

  const openWorkspace = (tool: NodeToolType) => {
    if (data.onOpenToolPanel) {
      data.onOpenToolPanel(id, tool);
    } else {
      data.onUpdateData?.(id, { tools: ensureToolState(data, tool, language) });
    }

    setActiveTool(null);
    onClose?.();
  };

  const openQuickTool = (tool: NodeToolType) => {
    if (openingTimerRef.current) {
      window.clearTimeout(openingTimerRef.current);
      openingTimerRef.current = null;
    }

    setOpeningTool(tool);
    openingTimerRef.current = window.setTimeout(() => {
      setActiveTool(tool);
      setOpeningTool(null);
      openingTimerRef.current = null;
    }, 120);
  };

  const saveDocumentQuick = () => {
    const tools = ensureToolState(data, 'document', language);
    updateTools('document', {
      ...tools,
      document: {
        ...tools.document!,
        enabled: true,
        content: documentDraft,
      },
    });
  };

  const updateLinkItems = (nextItems: Array<{ id: string; title: string; url: string }>, enabled = nextItems.length > 0) => {
    const currentData = dataRef.current;
    const tools = ensureToolState(currentData, 'link', language);
    updateTools('link', {
      ...tools,
      link: {
        enabled,
        items: nextItems,
      },
    });
  };

  const resolveLinkTitle = async (itemId: string, value: string) => {
    const normalizedUrl = normalizeNodeLinkUrl(value);
    if (!normalizedUrl) return;

    linkRequestControllersRef.current[itemId]?.abort();
    const controller = new AbortController();
    linkRequestControllersRef.current[itemId] = controller;

    const resolvedTitle = await fetchNodeLinkTitle(normalizedUrl, controller.signal);
    if (linkRequestControllersRef.current[itemId] !== controller) return;

    delete linkRequestControllersRef.current[itemId];

    if (!resolvedTitle) return;

    const currentData = dataRef.current;
    const linkItems = Array.isArray(currentData.tools?.link?.items) ? currentData.tools?.link?.items : [];
    const targetItem = linkItems.find((item) => item.id === itemId);
    if (!targetItem || normalizeNodeLinkUrl(targetItem.url) !== normalizedUrl) return;

    updateLinkItems(
      linkItems.map((item) => (item.id === itemId ? { ...item, title: resolvedTitle, url: normalizedUrl } : item)),
    );
  };

  const addEmptyLinkItem = () => {
    const currentData = dataRef.current;
    const linkItems = Array.isArray(currentData.tools?.link?.items) ? currentData.tools?.link?.items : [];
    const nextItem = createEmptyLinkItem();
    pendingLinkFocusIdRef.current = nextItem.id;
    updateLinkItems([...linkItems, nextItem], true);
  };

  const handleLinkChange = (itemId: string, value: string) => {
    const currentData = dataRef.current;
    const linkItems = Array.isArray(currentData.tools?.link?.items) ? currentData.tools?.link?.items : [];

    updateLinkItems(
      linkItems.map((item) => (item.id === itemId ? { ...item, title: '', url: value } : item)),
    );
  };

  const finalizeLinkItem = (itemId: string, value: string) => {
    const normalizedUrl = normalizeNodeLinkUrl(value);
    if (!normalizedUrl) return;

    const currentData = dataRef.current;
    const linkItems = Array.isArray(currentData.tools?.link?.items) ? currentData.tools?.link?.items : [];

    updateLinkItems(
      linkItems.map((item) => (
        item.id === itemId
          ? { ...item, title: deriveNodeLinkTitle(normalizedUrl), url: normalizedUrl }
          : item
      )),
    );
    void resolveLinkTitle(itemId, normalizedUrl);
  };

  const deleteLinkItem = (itemId: string) => {
    linkRequestControllersRef.current[itemId]?.abort();
    delete linkRequestControllersRef.current[itemId];

    const currentData = dataRef.current;
    const linkItems = Array.isArray(currentData.tools?.link?.items) ? currentData.tools?.link?.items : [];
    const nextItems = linkItems.filter((item) => item.id !== itemId);
    updateLinkItems(nextItems, nextItems.length > 0);
  };

  const updateScheduleItems = (nextItems: Array<{
    id: string;
    timeType: ScheduleTimeType;
    label?: string;
    dateTime?: string;
    allDay?: boolean;
  }>, enabled = nextItems.length > 0) => {
    const currentData = dataRef.current;
    const tools = ensureToolState(currentData, 'schedule', language);
    updateTools('schedule', {
      ...tools,
      schedule: {
        enabled,
        items: nextItems,
      },
    });
  };

  const updateImageItems = (nextItems: Array<{ id: string; title: string; src: string; alt: string }>, enabled = nextItems.length > 0) => {
    const currentData = dataRef.current;
    const tools = ensureToolState(currentData, 'image', language);
    updateTools('image', {
      ...tools,
      image: {
        enabled,
        items: nextItems,
      },
    });
  };

  const queueImageCopyFeedback = (itemId: string) => {
    if (imageCopyTimerRef.current) {
      window.clearTimeout(imageCopyTimerRef.current);
    }

    setCopiedImageId(itemId);
    imageCopyTimerRef.current = window.setTimeout(() => {
      setCopiedImageId((current) => (current === itemId ? null : current));
      imageCopyTimerRef.current = null;
    }, 1600);
  };

  const updateImageItemTitle = (itemId: string, title: string) => {
    const currentData = dataRef.current;
    const imageItems = getNodeToolImages(currentData.tools?.image);
    const cleanedTitle = title.replace(/\s+/g, ' ').trimStart();

    updateImageItems(imageItems.map((item) => (
      item.id === itemId
        ? {
            ...item,
            title: cleanedTitle,
            alt: !item.alt || item.alt === item.title ? cleanedTitle : item.alt,
          }
        : item
    )));
  };

  const handleCopyImageSource = async (itemId: string, source: string) => {
    const copied = await copyTextToClipboard(source);
    if (!copied) return;
    queueImageCopyFeedback(itemId);
  };

  const pushImageUploadFeedback = (message: string | null) => {
    if (imageFeedbackTimerRef.current) {
      window.clearTimeout(imageFeedbackTimerRef.current);
      imageFeedbackTimerRef.current = null;
    }

    setImageUploadFeedback(message);

    if (!message) return;

    imageFeedbackTimerRef.current = window.setTimeout(() => {
      setImageUploadFeedback(null);
      imageFeedbackTimerRef.current = null;
    }, 3200);
  };

  const moveImageItem = (itemId: string, direction: -1 | 1) => {
    const currentData = dataRef.current;
    const imageItems = getNodeToolImages(currentData.tools?.image);
    updateImageItems(moveItemById(imageItems, itemId, direction));
  };

  const reorderImageItem = (itemId: string, targetId: string) => {
    const currentData = dataRef.current;
    const imageItems = getNodeToolImages(currentData.tools?.image);
    updateImageItems(moveItemToTargetId(imageItems, itemId, targetId));
  };

  const resetImageDragState = () => {
    setDraggingImageId(null);
    setDropTargetImageId(null);
  };

  const addImageFromUrl = () => {
    const normalizedSource = normalizeNodeImageSource(imageUrlDraft);
    if (!normalizedSource) return;

    const fallbackTitle = language === 'zh' ? '网络图片' : 'Web image';
    const title = deriveNodeImageTitle(normalizedSource, fallbackTitle);
    const currentData = dataRef.current;
    const imageItems = getNodeToolImages(currentData.tools?.image);
    updateImageItems([
      ...imageItems,
      createImageItem(normalizedSource, title, title),
    ], true);
    setImageUrlDraft('');
  };

  const deleteImageItem = (itemId: string) => {
    const currentData = dataRef.current;
    const imageItems = getNodeToolImages(currentData.tools?.image);
    const nextItems = imageItems.filter((item) => item.id !== itemId);
    updateImageItems(nextItems, nextItems.length > 0);
  };

  const handleImageFileChange = async (fileList: FileList | null) => {
    const files = Array.from(fileList || []).filter((file) => file.type.startsWith('image/'));
    if (files.length === 0) return;
    const acceptedFiles = files.filter((file) => file.size <= MAX_NODE_IMAGE_FILE_BYTES);
    const rejectedCount = files.length - acceptedFiles.length;

    if (acceptedFiles.length === 0) {
      pushImageUploadFeedback(
        language === 'zh'
          ? `${rejectedCount || files.length} 张图片超过 15MB，已跳过，请先压缩后再上传。`
          : `${rejectedCount || files.length} image(s) were larger than 15 MB and were skipped. Please compress them first.`,
      );
      return;
    }

    const nextItems = await Promise.all(acceptedFiles.map((file) => (
      new Promise<ReturnType<typeof createImageItem>>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const source = typeof reader.result === 'string' ? reader.result : '';
          const title = file.name.replace(/\.[^.]+$/, '') || (language === 'zh' ? '本地图片' : 'Local image');
          resolve(createImageItem(source, title, title));
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      })
    )));

    const currentData = dataRef.current;
    const imageItems = getNodeToolImages(currentData.tools?.image);
    updateImageItems([...imageItems, ...nextItems], true);
    pushImageUploadFeedback(
      rejectedCount > 0
        ? (language === 'zh'
            ? `${rejectedCount} 张图片超过 15MB，已跳过，请先压缩后再上传。`
            : `${rejectedCount} image(s) were larger than 15 MB and were skipped. Please compress them first.`)
        : null,
    );
  };

  const addScheduleItemQuick = () => {
    const currentSeed = getCurrentScheduleSeed();
    const dateTime = composeScheduleDateTime(currentSeed.date, currentSeed.time, false);
    if (!dateTime) return;

    const currentData = dataRef.current;
    const scheduleItems = Array.isArray(currentData.tools?.schedule?.items) ? currentData.tools?.schedule?.items : [];
    updateScheduleItems([
      ...scheduleItems,
      {
        id: `time-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timeType: 'custom',
        label: getScheduleTimeTypeDefaultLabel('custom', language),
        dateTime,
        allDay: false,
      },
    ], true);
  };

  const updateScheduleItemQuick = (
    itemId: string,
    updates: Partial<{
      date: string;
      time: string;
      allDay: boolean;
      timeType: ScheduleTimeType;
    }>,
  ) => {
    const currentData = dataRef.current;
    const scheduleItems = Array.isArray(currentData.tools?.schedule?.items) ? currentData.tools?.schedule?.items : [];

    const nextItems = scheduleItems.map((item) => {
      if (item.id !== itemId) return item;

      const currentSeed = getCurrentScheduleSeed();
      const nextDate = updates.date ?? toInputDateValue(item.dateTime) ?? currentSeed.date;
      const nextTime = updates.time ?? toInputTimeValue(item.dateTime) ?? currentSeed.time;
      const nextAllDay = updates.allDay ?? Boolean(item.allDay);
      const nextTimeType = updates.timeType ?? item.timeType;
      const nextDateTime = composeScheduleDateTime(nextDate, nextTime, nextAllDay) || item.dateTime;

      return {
        ...item,
        dateTime: nextDateTime,
        allDay: nextAllDay,
        timeType: nextTimeType,
        label: getScheduleTimeTypeDefaultLabel(nextTimeType, language),
      };
    });

    updateScheduleItems(nextItems, nextItems.length > 0);
  };

  const deleteScheduleItemQuick = (itemId: string) => {
    const currentData = dataRef.current;
    const scheduleItems = Array.isArray(currentData.tools?.schedule?.items) ? currentData.tools?.schedule?.items : [];
    const nextItems = scheduleItems.filter((item) => item.id !== itemId);
    updateScheduleItems(nextItems, nextItems.length > 0);
  };

  const commitQuickDraft = (tool: NodeToolType | null) => {
    if (!tool) return;
    if (tool === 'document') saveDocumentQuick();
  };

  const closeQuickTool = () => {
    if (openingTimerRef.current) {
      window.clearTimeout(openingTimerRef.current);
      openingTimerRef.current = null;
    }
    setPreviewImage(null);
    setOpeningTool(null);
    commitQuickDraft(activeTool);
    setActiveTool(null);
  };

  const handlePreviewWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.12 : 0.88;
    setPreviewZoom((current) => {
      const next = current * factor;
      return Math.min(4, Math.max(0.5, Number(next.toFixed(3))));
    });
  };

  const insertDocumentSnippet = (snippet: string) => {
    setDocumentDraft((current) => {
      const base = current.trim();
      return base ? `${base}\n\n${snippet}` : snippet;
    });
  };

  const renderOverview = () => (
    <div className={`w-[252px] rounded-[22px] border p-2.5 backdrop-blur-xl ${
      isDarkTheme
        ? 'border-slate-600/50 bg-slate-900/95 shadow-[0_28px_60px_-30px_rgba(2,6,23,0.92)]'
        : 'border-white/80 bg-white/95 shadow-[0_22px_54px_-28px_rgba(15,23,42,0.42)]'
    }`}>
      <div className="grid grid-cols-4 gap-2">
        {availableTools.map((tool) => {
          const snapshot = getToolSnapshot(tool.id, data, language);
          const config = getToolConfig(tool.id);
          const tone = getAccentTone(tool.id);
          const isPreviewOnly = config?.quickMode === 'preview-only';
          const hasPreviewContent = snapshot.railBadge.kind === 'count' || snapshot.railBadge.kind === 'dot';
          const isSelected = activeTool === tool.id || openingTool === tool.id;
          const buttonStateClass = isSelected
            ? `${isPreviewOnly ? 'border-neutral-300 bg-neutral-100 text-neutral-700' : `${tone.border} ${tone.tint} ${tone.text} ${tone.glow}`}`
            : 'border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300 hover:text-neutral-700 hover:shadow-[0_16px_36px_-26px_rgba(15,23,42,0.35)]';

          return (
            <motion.button
              key={tool.id}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                if (isPreviewOnly && !hasPreviewContent) {
                  openWorkspace(tool.id);
                  return;
                }
                openQuickTool(tool.id);
              }}
              whileTap={{ scale: 0.9 }}
              animate={
                openingTool === tool.id
                  ? { scale: [1, 0.9, 1.06, 1], y: [0, 1, -1, 0] }
                  : { scale: 1, y: 0 }
              }
              transition={
                openingTool === tool.id
                  ? { duration: 0.24, times: [0, 0.25, 0.65, 1], ease: 'easeOut' }
                  : { duration: 0.12 }
              }
              className={`group relative flex h-14 w-14 items-center justify-center rounded-[18px] border transition-all ${buttonStateClass}`}
              title={getToolLabel(tool.id, language)}
              aria-label={getToolLabel(tool.id, language)}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ring-1 ${
                isSelected
                  ? `${isPreviewOnly ? 'bg-white text-neutral-700 ring-neutral-200' : `${tone.soft} ${tone.text} ${tone.ring}`}`
                  : 'bg-white text-neutral-500 ring-black/5'
              }`}>
                {tool.icon}
              </div>
              <span
                className={`absolute right-0.5 top-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-white px-1 text-[9px] font-black leading-none ${
                  snapshot.railBadge.kind === 'disabled'
                    ? 'bg-neutral-100 text-neutral-400'
                    : snapshot.railBadge.kind === 'empty'
                      ? 'bg-white text-amber-500'
                      : snapshot.railBadge.kind === 'dot'
                        ? `${tone.tint} ${tone.text}`
                        : 'bg-neutral-900 text-white'
                }`}
              >
                {snapshot.railBadge.kind === 'disabled' || snapshot.railBadge.kind === 'dot' ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                ) : snapshot.railBadge.kind === 'empty' ? (
                  <span className="h-2 w-2 rounded-full border border-current" />
                ) : (
                  snapshot.railBadge.value
                )}
              </span>
              <span className={`absolute bottom-[calc(100%+8px)] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white opacity-0 shadow-lg transition-all duration-150 pointer-events-none group-hover:opacity-100 ${tone.button.split(' ').slice(0, 2).join(' ')}`}>
                {getToolLabel(tool.id, language)}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );

  const renderTableQuickView = () => {
    const table = data.tools?.table;
    const rows = Array.isArray(table?.rows) ? table.rows.slice(0, 3) : [];
    const columns = Array.isArray(table?.columns) ? table.columns.slice(0, 3) : [];

    return (
      <div>
        <div>
          {table?.enabled ? (
            <>
              <div className="overflow-hidden rounded-[18px] border border-neutral-200 bg-white">
                <div className="grid bg-neutral-50 px-2 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-400" style={{ gridTemplateColumns: `repeat(${Math.max(columns.length, 1)}, minmax(0, 1fr))` }}>
                  {(columns.length ? columns : [language === 'zh' ? '字段' : 'Field']).map((column) => (
                    <div key={column} className="truncate px-2">{column}</div>
                  ))}
                </div>
                <div className="divide-y divide-neutral-100">
                  {rows.length > 0 ? (
                    rows.map((row) => (
                      <div key={row.id} className="grid px-2 py-2 text-[11px] text-neutral-600" style={{ gridTemplateColumns: `repeat(${Math.max(columns.length, 1)}, minmax(0, 1fr))` }}>
                        {(columns.length
                          ? columns
                          : Object.keys((row && typeof row.values === 'object' && row.values) ? row.values : {}).slice(0, 1)
                        ).map((column) => (
                          <div key={`${row.id}-${column}`} className="truncate px-2">
                            {((row && typeof row.values === 'object' && row.values) ? row.values[column] : '') || '—'}
                          </div>
                        ))}
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-3 text-[11px] text-neutral-400">
                      {language === 'zh' ? '表格已创建，但还没有录入数据。' : 'Table created, no rows entered yet.'}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-[12px] leading-6 text-neutral-500">
              {language === 'zh'
                ? '表格属于复杂编辑工具，建议直接进入工具台处理。'
                : 'Tables are complex tools. Use the workspace for editing.'}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderQuickMeta = (toolId: NodeToolType) => {
    if (toolId === 'table') {
      const table = data.tools?.table;
      const rowCount = Array.isArray(table?.rows) ? table.rows.length : 0;
      const columnCount = Array.isArray(table?.columns) ? table.columns.length : 0;
      if (!table?.enabled) return null;

      return (
        <div className="text-sm font-black text-neutral-900">
          {language === 'zh'
            ? `${rowCount} 行 / ${columnCount} 列`
            : `${rowCount} rows / ${columnCount} cols`}
        </div>
      );
    }

    if (toolId === 'document') {
      return (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => insertDocumentSnippet(language === 'zh' ? '- [ ] 待办事项' : '- [ ] Todo')}
            className="rounded-full bg-neutral-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500 transition-all hover:bg-emerald-50 hover:text-emerald-600"
          >
            {language === 'zh' ? '待办' : 'Todo'}
          </button>
          <button
            type="button"
            onClick={() => insertDocumentSnippet(language === 'zh' ? '## 小标题' : '## Heading')}
            className="rounded-full bg-neutral-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500 transition-all hover:bg-emerald-50 hover:text-emerald-600"
          >
            {language === 'zh' ? '标题' : 'Heading'}
          </button>
          <button
            type="button"
            onClick={() => insertDocumentSnippet(language === 'zh' ? '- 列表项' : '- List item')}
            className="rounded-full bg-neutral-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500 transition-all hover:bg-emerald-50 hover:text-emerald-600"
          >
            {language === 'zh' ? '列表' : 'List'}
          </button>
          <button
            type="button"
            onClick={() => setDocumentDraft('')}
            className="rounded-full bg-neutral-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500 transition-all hover:bg-red-50 hover:text-red-500"
          >
            {language === 'zh' ? '清空' : 'Clear'}
          </button>
        </div>
      );
    }

    if (toolId === 'link') {
      return (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addEmptyLinkItem}
            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 transition-all hover:bg-violet-100"
            title={language === 'zh' ? '新增链接' : 'Add link'}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      );
    }

    if (toolId === 'schedule') {
      return (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addScheduleItemQuick}
            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 transition-all hover:bg-amber-100"
            title={language === 'zh' ? '新增时间' : 'Add schedule'}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      );
    }

    if (toolId === 'image') {
      const imageCount = getNodeToolImages(data.tools?.image).length;

      return (
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm font-black text-neutral-900">
            {language === 'zh' ? `${imageCount} 张图片` : `${imageCount} images`}
          </div>
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 transition-all hover:bg-rose-100"
            title={language === 'zh' ? '上传图片' : 'Upload image'}
          >
            <Upload className="h-3.5 w-3.5" />
          </button>
        </div>
      );
    }

    return null;
  };

  const renderDocumentQuickView = () => (
    <div>
      <textarea
        value={documentDraft}
        onChange={(event) => setDocumentDraft(event.target.value)}
        placeholder={language === 'zh' ? '记录几句说明或上下文...' : 'Add a few notes or context...'}
        className="min-h-[148px] w-full rounded-[18px] border border-neutral-200 bg-white px-3 py-3 text-[12px] text-neutral-700 outline-none transition-all focus:border-emerald-200 focus:bg-white"
      />
    </div>
  );

  const renderLinkQuickView = () => (
    <div className="space-y-3">
      <div className="space-y-2">
        {(Array.isArray(data.tools?.link?.items) ? data.tools?.link?.items : []).length > 0 ? (
          (Array.isArray(data.tools?.link?.items) ? data.tools?.link?.items : []).map((item, index) => {
            const normalizedUrl = normalizeNodeLinkUrl(item.url);
            const displayTitle =
              item.title.trim()
              || deriveNodeLinkTitle(item.url)
              || (language === 'zh' ? `链接 ${index + 1}` : `Link ${index + 1}`);

            return (
              <div key={item.id} className="rounded-[16px] border border-neutral-200 bg-white px-2.5 py-2">
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[11px] font-black text-neutral-800">
                      {displayTitle}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteLinkItem(item.id)}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-300 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                    title={language === 'zh' ? '删除链接' : 'Delete link'}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    ref={(element) => {
                      linkInputRefs.current[item.id] = element;
                    }}
                    value={item.url}
                    onChange={(event) => handleLinkChange(item.id, event.target.value)}
                    onBlur={() => finalizeLinkItem(item.id, item.url)}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter') return;
                      event.preventDefault();
                      finalizeLinkItem(item.id, item.url);
                    }}
                    placeholder="https://"
                    className="min-w-0 w-full rounded-[14px] border border-neutral-200 bg-white px-3 py-2 pr-[4.9rem] text-[12px] text-neutral-700 outline-none transition-all focus:border-violet-200 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      finalizeLinkItem(item.id, item.url);
                      if (normalizedUrl) {
                        window.open(normalizedUrl, '_blank', 'noopener,noreferrer');
                      }
                    }}
                    disabled={!item.url.trim()}
                    className={`absolute right-1 top-1/2 flex h-8 -translate-y-1/2 items-center justify-center rounded-[10px] px-2.5 text-[10px] font-black uppercase tracking-[0.12em] transition-all ${
                      normalizedUrl
                        ? 'bg-violet-50 text-violet-600 hover:bg-violet-100'
                        : 'bg-neutral-100 text-neutral-400 hover:bg-neutral-200'
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {normalizedUrl
                      ? (language === 'zh' ? '访问' : 'Visit')
                      : (language === 'zh' ? '添加' : 'Add')}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-[18px] bg-neutral-50 px-3 py-3 text-[12px] text-neutral-500 ring-1 ring-black/5">
            {language === 'zh' ? '点击上方加号，直接创建一条链接。' : 'Use the plus button above to create a link.'}
          </div>
        )}
      </div>
    </div>
  );

  const renderScheduleQuickView = () => {
    const scheduleItems = Array.isArray(data.tools?.schedule?.items) ? data.tools?.schedule?.items : [];

    return (
      <div className="space-y-2.5">
        {scheduleItems.length > 0 ? (
          scheduleItems.map((item) => {
            const dateValue = toInputDateValue(item.dateTime) || getCurrentScheduleSeed().date;
            const timeValue = toInputTimeValue(item.dateTime) || getCurrentScheduleSeed().time;

            return (
              <div key={item.id} className="rounded-[16px] border border-neutral-200 bg-white px-2.5 py-2">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {SCHEDULE_TIME_TYPE_OPTIONS.map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => updateScheduleItemQuick(item.id, { timeType: type.id })}
                        className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] transition-all ${
                          item.timeType === type.id
                            ? 'bg-amber-500 text-white'
                            : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                        }`}
                      >
                        {type.icon} {language === 'zh' ? type.labelZh : type.labelEn}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteScheduleItemQuick(item.id)}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-300 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                    title={language === 'zh' ? '删除时间' : 'Delete time'}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>

                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)_auto] gap-2">
                  <input
                    type="date"
                    value={dateValue}
                    onChange={(event) => updateScheduleItemQuick(item.id, { date: event.target.value })}
                    className="rounded-[14px] border border-neutral-200 bg-white px-3 py-2 text-[12px] text-neutral-700 outline-none transition-all focus:border-amber-200 focus:bg-white"
                  />
                  <input
                    type="time"
                    value={timeValue}
                    disabled={Boolean(item.allDay)}
                    onChange={(event) => updateScheduleItemQuick(item.id, { time: event.target.value })}
                    className="rounded-[14px] border border-neutral-200 bg-white px-3 py-2 text-[12px] text-neutral-700 outline-none transition-all focus:border-amber-200 focus:bg-white disabled:opacity-40"
                  />
                  <button
                    type="button"
                    onClick={() => updateScheduleItemQuick(item.id, { allDay: !item.allDay })}
                    className={`rounded-[14px] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] transition-all ${
                      item.allDay
                        ? 'bg-amber-500 text-white'
                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                    }`}
                  >
                    {language === 'zh' ? '全天' : 'All-day'}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-[16px] bg-neutral-50 px-3 py-2.5 text-[11px] text-neutral-500 ring-1 ring-black/5">
            {language === 'zh' ? '左上角点新增，直接添加当前时间。' : 'Use Add new in the top-left to create a time entry.'}
          </div>
        )}
      </div>
    );
  };

  const renderImageQuickView = () => {
    const images = getNodeToolImages(data.tools?.image);

    return (
      <div className="space-y-3">
        <div className="relative">
          <input
            type="text"
            value={imageUrlDraft}
            onChange={(event) => setImageUrlDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              addImageFromUrl();
            }}
            placeholder="https://"
            className="min-w-0 w-full rounded-[14px] border border-neutral-200 bg-white px-3 py-2 pr-[4.9rem] text-[12px] text-neutral-700 outline-none transition-all focus:border-rose-200 focus:bg-white"
          />
          <button
            type="button"
            onClick={addImageFromUrl}
            disabled={!normalizeNodeImageSource(imageUrlDraft)}
            className={`absolute right-1 top-1/2 flex h-8 -translate-y-1/2 items-center justify-center rounded-[10px] px-2.5 text-[10px] font-black uppercase tracking-[0.12em] transition-all ${
              normalizeNodeImageSource(imageUrlDraft)
                ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                : 'bg-neutral-100 text-neutral-400 hover:bg-neutral-200'
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {language === 'zh' ? '添加' : 'Add'}
          </button>
        </div>

        {imageUploadFeedback && (
          <div className="rounded-[14px] border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold leading-5 text-amber-700">
            {imageUploadFeedback}
          </div>
        )}

        {images.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {images.map((item, index) => (
              <div
                key={item.id}
                onDragOver={(event) => {
                  if (!draggingImageId || draggingImageId === item.id) return;
                  event.preventDefault();
                  setDropTargetImageId(item.id);
                }}
                onDrop={(event) => {
                  if (!draggingImageId || draggingImageId === item.id) return;
                  event.preventDefault();
                  reorderImageItem(draggingImageId, item.id);
                  resetImageDragState();
                }}
                onDragEnd={resetImageDragState}
                className={`overflow-hidden rounded-[16px] border bg-white transition-all ${
                  dropTargetImageId === item.id && draggingImageId !== item.id
                    ? 'border-rose-200 ring-2 ring-rose-200'
                    : 'border-neutral-200'
                } ${draggingImageId === item.id ? 'opacity-70' : ''}`}
              >
                <div className="group relative aspect-square overflow-hidden bg-neutral-50">
                  <img
                    src={item.src}
                    alt={item.alt || item.title}
                    className="h-full w-full cursor-zoom-in object-cover"
                    onClick={() => setPreviewImage({
                      src: item.src,
                      title: item.title,
                      alt: item.alt || item.title,
                    })}
                    loading="lazy"
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent px-2.5 py-2 text-[9px] font-black uppercase tracking-[0.14em] text-white opacity-0 transition-opacity group-hover:opacity-100">
                    {language === 'zh' ? '点击看大图' : 'View large'}
                  </div>
                  <div className="absolute right-2 top-2 flex items-center gap-1">
                    <button
                      type="button"
                      draggable
                      onDragStart={(event) => {
                        setDraggingImageId(item.id);
                        setDropTargetImageId(item.id);
                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData('text/plain', item.id);
                      }}
                      onDragEnd={resetImageDragState}
                      className="flex h-7 w-7 cursor-grab items-center justify-center rounded-full bg-white/92 text-neutral-400 shadow-sm transition-all hover:text-rose-600 active:cursor-grabbing"
                      title={language === 'zh' ? '拖拽排序' : 'Drag to reorder'}
                    >
                      <GripVertical className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveImageItem(item.id, -1)}
                      disabled={index === 0}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-white/92 text-neutral-400 shadow-sm transition-all hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                      title={language === 'zh' ? '上移图片' : 'Move image up'}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveImageItem(item.id, 1)}
                      disabled={index === images.length - 1}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-white/92 text-neutral-400 shadow-sm transition-all hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                      title={language === 'zh' ? '下移图片' : 'Move image down'}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => window.open(item.src, '_blank', 'noopener,noreferrer')}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-white/92 text-neutral-500 shadow-sm transition-all hover:text-rose-600"
                      title={language === 'zh' ? '打开图片' : 'Open image'}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleCopyImageSource(item.id, item.src)}
                      className={`flex h-7 w-7 items-center justify-center rounded-full shadow-sm transition-all ${
                        copiedImageId === item.id
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-white/92 text-neutral-500 hover:text-rose-600'
                      }`}
                      title={language === 'zh' ? '复制图片来源' : 'Copy image source'}
                    >
                      {copiedImageId === item.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteImageItem(item.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-white/92 text-neutral-400 shadow-sm transition-all hover:text-red-500"
                      title={language === 'zh' ? '删除图片' : 'Delete image'}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2 px-2.5 py-2">
                  <input
                    type="text"
                    value={item.title}
                    onChange={(event) => updateImageItemTitle(item.id, event.target.value)}
                    placeholder={language === 'zh' ? `图片 ${index + 1}` : `Image ${index + 1}`}
                    className="min-w-0 w-full rounded-[12px] border border-neutral-200 bg-neutral-50 px-2.5 py-2 text-[11px] font-bold text-neutral-800 outline-none transition-all focus:border-rose-200 focus:bg-white"
                  />
                  <div className="text-[9px] font-black uppercase tracking-[0.14em] text-neutral-400">
                    {draggingImageId === item.id
                      ? (language === 'zh' ? '拖拽中' : 'Dragging')
                      : copiedImageId === item.id
                        ? (language === 'zh' ? '来源已复制' : 'Source copied')
                        : /^https?:\/\//i.test(item.src)
                          ? (language === 'zh' ? '外链图片' : 'Remote image')
                          : (language === 'zh' ? '本地嵌入' : 'Embedded image')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[18px] bg-neutral-50 px-3 py-3 text-[12px] text-neutral-500 ring-1 ring-black/5">
            {language === 'zh' ? '上传一张本地图片，或直接粘贴线上图片链接。' : 'Upload a local image or paste a remote image URL.'}
          </div>
        )}
      </div>
    );
  };

  const renderQuickActions = (toolId: NodeToolType) => {
    const tone = getAccentTone(toolId);
    return (
      <>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            openWorkspace(toolId);
          }}
          title={language === 'zh' ? '进入工具台' : 'Open workspace'}
          className={`flex h-9 w-9 items-center justify-center rounded-2xl shadow-sm ${tone.button}`}
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            closeQuickTool();
          }}
          title={language === 'zh' ? '返回工具总览' : 'Back to tools'}
          className="flex h-9 w-9 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-red-500 shadow-sm transition-all hover:border-red-200 hover:bg-red-100 hover:text-red-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </>
    );
  };

  const renderQuickContent = (toolId: NodeToolType) => {
    switch (toolId) {
      case 'table':
        return renderTableQuickView();
      case 'document':
        return renderDocumentQuickView();
      case 'link':
        return renderLinkQuickView();
      case 'schedule':
        return renderScheduleQuickView();
      case 'image':
        return renderImageQuickView();
      default:
        return null;
    }
  };

  const renderQuickTool = () => {
    if (!activeTool) return null;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.82, y: 64 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.82, y: 64 }}
        transition={{
          type: 'spring',
          stiffness: 360,
          damping: 30,
          mass: 0.9,
        }}
        className="w-[430px] rounded-[22px] border border-white/80 bg-white/95 p-3 shadow-[0_22px_54px_-28px_rgba(15,23,42,0.42)] backdrop-blur-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative px-2 pb-2 pt-1.5">
          <div className={`mb-2 flex items-start gap-2 pr-1 pt-0.5 ${renderQuickMeta(activeTool) ? 'justify-between' : 'justify-end'}`}>
            <div className="min-w-0 flex-1" onClick={(event) => event.stopPropagation()}>
              {renderQuickMeta(activeTool)}
            </div>
            <div className="flex items-center gap-2">
              {renderQuickActions(activeTool)}
            </div>
          </div>
          <div onClick={(event) => event.stopPropagation()}>
            {renderQuickContent(activeTool)}
          </div>
        </div>
      </motion.div>
    );
  };

  const portalTarget = typeof document !== 'undefined' ? document.body : null;

  return (
    <>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={async (event) => {
          await handleImageFileChange(event.target.files);
          event.target.value = '';
        }}
      />
      {visible && (
        <NodeToolbar isVisible position={Position.Bottom} align="center" offset={18}>
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            transition={{
              opacity: { duration: 0.16 },
              y: { duration: 0.16 },
              scale: { duration: 0.16 },
            }}
            className="overflow-visible"
          >
            {renderOverview()}
          </motion.div>
        </NodeToolbar>
      )}

      {portalTarget &&
        createPortal(
          <AnimatePresence>
            {activeTool && (
              <motion.div
                key={`tool-layer-${activeTool}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={`app-shell fixed inset-0 z-[3100] flex items-end justify-center p-4 sm:items-center sm:p-8 ${
                  isDarkTheme ? 'theme-dark' : 'theme-light'
                }`}
                onClick={closeQuickTool}
              >
                <motion.div
                  className="absolute inset-0 bg-neutral-900/35 backdrop-blur-[2px]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
                {renderQuickTool()}
                {previewImage && (
                  <div
                    className="absolute inset-0 z-[20] overflow-auto bg-black/75"
                    onClick={(event) => {
                      event.stopPropagation();
                      setPreviewImage(null);
                    }}
                    onWheelCapture={handlePreviewWheel}
                    role="presentation"
                  >
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setPreviewImage(null);
                      }}
                      className="fixed right-6 top-6 z-[26] inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/75"
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
                            src={previewImage.src}
                            alt={previewImage.alt}
                            className="rounded-2xl border border-white/20 object-contain shadow-[0_40px_120px_-40px_rgba(0,0,0,0.75)]"
                            style={{
                              maxHeight: '88vh',
                              maxWidth: '90vw',
                              transform: `scale(${previewZoom})`,
                              transformOrigin: 'center center',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[25] -translate-x-1/2 rounded-full bg-black/60 px-4 py-2 text-[11px] font-semibold text-white/90 backdrop-blur-sm">
                      {`${previewImage.title} · ${language === 'zh' ? `缩放 ${Math.round(previewZoom * 100)}%（滚轮）` : `Zoom ${Math.round(previewZoom * 100)}% (wheel)`}`}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>,
          portalTarget,
        )}
    </>
  );
}
