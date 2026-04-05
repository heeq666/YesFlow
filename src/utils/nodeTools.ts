import type { Node, Edge } from '@xyflow/react';

import type {
  NodeDocumentData,
  NodeImageData,
  NodeImageItem,
  NodeLinkData,
  NodeLinkItem,
  NodeSchedule,
  ScheduleTimeType,
  NodeTableData,
  NodeToolType,
  NodeToolsState,
  TaskData,
} from '../types';

const GENERIC_TABLE_COLUMNS_ZH = ['项目', '数值', '备注'];
const GENERIC_TABLE_COLUMNS_EN = ['Item', 'Value', 'Notes'];
const FITNESS_TABLE_COLUMNS_ZH = ['日期', '体重', '体脂', '围度', '训练内容', '睡眠', '备注'];
const FITNESS_TABLE_COLUMNS_EN = ['Date', 'Weight', 'Body Fat', 'Measurement', 'Workout', 'Sleep', 'Notes'];
export const MAX_NODE_IMAGE_FILE_BYTES = 15 * 1024 * 1024;
export const SCHEDULE_TIME_TYPE_OPTIONS: Array<{
  id: ScheduleTimeType;
  labelZh: string;
  labelEn: string;
  defaultLabelZh: string;
  defaultLabelEn: string;
  icon: string;
}> = [
  { id: 'start', labelZh: '开始', labelEn: 'Start', defaultLabelZh: '开始时间', defaultLabelEn: 'Start', icon: '▶' },
  { id: 'end', labelZh: '完成', labelEn: 'End', defaultLabelZh: '完成时间', defaultLabelEn: 'End', icon: '✓' },
  { id: 'custom', labelZh: '自定义', labelEn: 'Custom', defaultLabelZh: '自定义时间', defaultLabelEn: 'Custom', icon: '✎' },
];
export const SCHEDULE_TIME_TYPES: ScheduleTimeType[] = ['start', 'end', 'custom'];

export function getScheduleTimeTypeOption(type: ScheduleTimeType) {
  return SCHEDULE_TIME_TYPE_OPTIONS.find((entry) => entry.id === type);
}

export function getScheduleTimeTypeLabel(type: ScheduleTimeType, language: 'zh' | 'en') {
  const option = getScheduleTimeTypeOption(type);
  return option ? (language === 'zh' ? option.labelZh : option.labelEn) : '';
}

export function getScheduleTimeTypeDefaultLabel(type: ScheduleTimeType, language: 'zh' | 'en') {
  const option = getScheduleTimeTypeOption(type);
  return option ? (language === 'zh' ? option.defaultLabelZh : option.defaultLabelEn) : '';
}

export function getScheduleTimeTypeIcon(type: ScheduleTimeType) {
  return getScheduleTimeTypeOption(type)?.icon || '•';
}

function hasFitnessIntent(text: string) {
  return /(健身|训练|体重|体脂|围度|身体|fitness|workout|body|weight|measure)/i.test(text);
}

export function createDefaultTableData(label: string, description: string, language: 'zh' | 'en'): NodeTableData {
  const seedText = `${label} ${description}`;
  const columns = hasFitnessIntent(seedText)
    ? language === 'zh' ? FITNESS_TABLE_COLUMNS_ZH : FITNESS_TABLE_COLUMNS_EN
    : language === 'zh' ? GENERIC_TABLE_COLUMNS_ZH : GENERIC_TABLE_COLUMNS_EN;

  return {
    enabled: true,
    columns,
    rows: [
      {
        id: `row-${Date.now()}`,
        values: Object.fromEntries(columns.map((column) => [column, ''])),
      },
    ],
  };
}

export function createDefaultDocumentData(): NodeDocumentData {
  return {
    enabled: true,
    content: '',
  };
}

export function createEmptyLinkItem(): NodeLinkItem {
  return {
    id: `link-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: '',
    url: '',
  };
}

export function createDefaultLinkData(): NodeLinkData {
  return {
    enabled: true,
    items: [createEmptyLinkItem()],
  };
}

export function createImageItem(src: string, title: string, alt?: string): NodeImageItem {
  return {
    id: `image-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title,
    src,
    alt: alt || title,
  };
}

export function moveItemById<T extends { id: string }>(items: T[], itemId: string, direction: -1 | 1) {
  const currentIndex = items.findIndex((item) => item.id === itemId);
  if (currentIndex === -1) return items;

  const targetIndex = currentIndex + direction;
  if (targetIndex < 0 || targetIndex >= items.length) return items;

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(currentIndex, 1);
  nextItems.splice(targetIndex, 0, movedItem);
  return nextItems;
}

export function moveItemToTargetId<T extends { id: string }>(items: T[], itemId: string, targetId: string) {
  if (itemId === targetId) return items;

  const currentIndex = items.findIndex((item) => item.id === itemId);
  const targetIndex = items.findIndex((item) => item.id === targetId);

  if (currentIndex === -1 || targetIndex === -1) return items;

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(currentIndex, 1);
  const insertionIndex = currentIndex < targetIndex ? targetIndex - 1 : targetIndex;
  nextItems.splice(insertionIndex, 0, movedItem);
  return nextItems;
}

export function createDefaultImageData(): NodeImageData {
  return {
    enabled: true,
    items: [],
  };
}

export function createDefaultScheduleData(language: 'zh' | 'en'): NodeSchedule {
  return {
    enabled: true,
    items: [
      {
        id: `time-${Date.now()}`,
        timeType: 'start',
        label: getScheduleTimeTypeDefaultLabel('start', language),
        dateTime: '',
        allDay: false,
      },
    ],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeTableData(table: NodeTableData | undefined): NodeTableData | undefined {
  if (!table) return undefined;

  const normalizedColumns = Array.isArray(table.columns)
    ? table.columns.filter((column): column is string => typeof column === 'string' && column.trim().length > 0)
    : [];
  const normalizedRows = Array.isArray(table.rows)
    ? table.rows.map((row, index) => {
      const values = isRecord(row?.values) ? row.values : {};
      const normalizedValues: Record<string, string> = {};
      Object.entries(values).forEach(([key, value]) => {
        normalizedValues[key] = typeof value === 'string' ? value : String(value ?? '');
      });

      return {
        id: typeof row?.id === 'string' && row.id.trim().length > 0 ? row.id : `row-item-${index}`,
        values: normalizedValues,
      };
    })
    : [];

  const derivedColumns = normalizedColumns.length > 0
    ? normalizedColumns
    : Array.from(new Set(normalizedRows.flatMap((row) => Object.keys(row.values))));

  const rowsWithColumns = normalizedRows.map((row) => {
    if (derivedColumns.length === 0) return row;

    const nextValues: Record<string, string> = {};
    derivedColumns.forEach((column) => {
      nextValues[column] = row.values[column] || '';
    });

    return {
      ...row,
      values: nextValues,
    };
  });

  return {
    enabled: Boolean(table.enabled),
    columns: derivedColumns,
    rows: rowsWithColumns,
  };
}

function normalizeDocumentData(documentTool: NodeDocumentData | undefined): NodeDocumentData | undefined {
  if (!documentTool) return undefined;

  return {
    enabled: Boolean(documentTool.enabled),
    content: typeof documentTool.content === 'string' ? documentTool.content : '',
  };
}

function normalizeLinkData(linkTool: NodeLinkData | undefined): NodeLinkData | undefined {
  if (!linkTool) return undefined;

  const items = Array.isArray(linkTool.items)
    ? linkTool.items.map((item, index) => ({
      id: typeof item?.id === 'string' && item.id.trim().length > 0 ? item.id : `link-item-${index}`,
      title: typeof item?.title === 'string' ? item.title : '',
      url: typeof item?.url === 'string' ? item.url : '',
    }))
    : [];

  return {
    enabled: Boolean(linkTool.enabled),
    items,
  };
}

function normalizeImageData(imageTool: NodeImageData | undefined): NodeImageData | undefined {
  if (!imageTool) return undefined;

  const items = Array.isArray(imageTool.items)
    ? imageTool.items.map((item, index) => ({
      id: typeof item?.id === 'string' && item.id.trim().length > 0 ? item.id : `image-item-${index}`,
      title: typeof item?.title === 'string' ? item.title : '',
      src: typeof item?.src === 'string' ? item.src : '',
      alt: typeof item?.alt === 'string' ? item.alt : '',
    }))
    : [];

  return {
    enabled: Boolean(imageTool.enabled),
    items,
  };
}

function normalizeScheduleData(scheduleTool: NodeSchedule | undefined): NodeSchedule | undefined {
  if (!scheduleTool) return undefined;

  const items = Array.isArray(scheduleTool.items)
    ? scheduleTool.items.map((item, index) => ({
      id: typeof item?.id === 'string' && item.id.trim().length > 0 ? item.id : `time-item-${index}`,
      timeType: SCHEDULE_TIME_TYPES.includes(item?.timeType as any) ? item.timeType : 'custom',
      label: typeof item?.label === 'string' ? item.label : '',
      dateTime: typeof item?.dateTime === 'string' ? item.dateTime : '',
      allDay: Boolean(item?.allDay),
    }))
    : [];

  return {
    enabled: Boolean(scheduleTool.enabled),
    items,
  };
}

export function normalizeNodeLinkUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    return /^https?:$/i.test(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export function normalizeNodeImageSource(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^data:image\//i.test(trimmed)) {
    return trimmed;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    return /^https?:$/i.test(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function cleanupNodeLinkTitle(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function decodeUrlSegment(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function formatUrlSegmentLabel(value: string) {
  return cleanupNodeLinkTitle(
    decodeUrlSegment(value)
      .replace(/\.(html?|php|aspx?)$/i, '')
      .replace(/[-_]+/g, ' '),
  );
}

export function deriveNodeLinkTitle(value: string) {
  const normalizedUrl = normalizeNodeLinkUrl(value);
  if (!normalizedUrl) return '';

  try {
    const url = new URL(normalizedUrl);
    const hostname = cleanupNodeLinkTitle(url.hostname.replace(/^www\./i, ''));
    const segments = url.pathname.split('/').filter(Boolean);
    const lastSegment = formatUrlSegmentLabel(segments[segments.length - 1] || '');

    if (lastSegment && !/^(index|home|default)$/i.test(lastSegment)) {
      return `${hostname} / ${lastSegment}`;
    }

    return hostname;
  } catch {
    return cleanupNodeLinkTitle(normalizedUrl.replace(/^https?:\/\/(www\.)?/i, ''));
  }
}

export function deriveNodeImageTitle(value: string, fallback: string) {
  const normalizedSource = normalizeNodeImageSource(value);
  if (!normalizedSource) return fallback;

  if (/^data:image\//i.test(normalizedSource)) {
    return fallback;
  }

  try {
    const url = new URL(normalizedSource);
    const segments = url.pathname.split('/').filter(Boolean);
    const lastSegment = formatUrlSegmentLabel(segments[segments.length - 1] || '');
    return lastSegment || cleanupNodeLinkTitle(url.hostname.replace(/^www\./i, '')) || fallback;
  } catch {
    return fallback;
  }
}

export async function fetchNodeLinkTitle(value: string, signal?: AbortSignal) {
  const normalizedUrl = normalizeNodeLinkUrl(value);
  if (!normalizedUrl) return null;

  try {
    const response = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(normalizedUrl)}`, {
      signal,
    });
    if (!response.ok) return null;

    const payload = await response.json() as { title?: string };
    const title = cleanupNodeLinkTitle(payload.title || '');
    return title || null;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return null;
    }
    return null;
  }
}

export function getNodeToolLinks(linkTool: NodeLinkData | undefined) {
  const normalizedLinkTool = normalizeLinkData(linkTool);
  if (!normalizedLinkTool?.enabled) return [];

  const uniqueLinks = new Map<string, { id: string; title: string; url: string; displayLabel: string }>();

  normalizedLinkTool.items.forEach((item) => {
    const normalizedUrl = normalizeNodeLinkUrl(item.url);
    if (!normalizedUrl || uniqueLinks.has(normalizedUrl)) return;

    const title = item.title.trim() || deriveNodeLinkTitle(normalizedUrl);
    uniqueLinks.set(normalizedUrl, {
      id: item.id,
      title,
      url: normalizedUrl,
      displayLabel: title || normalizedUrl.replace(/^https?:\/\/(www\.)?/i, ''),
    });
  });

  return Array.from(uniqueLinks.values());
}

export function getNodeToolImages(imageTool: NodeImageData | undefined) {
  const normalizedImageTool = normalizeImageData(imageTool);
  if (!normalizedImageTool?.enabled) return [];

  return normalizedImageTool.items
    .map((item, index) => {
      const normalizedSrc = normalizeNodeImageSource(item.src);
      if (!normalizedSrc) return null;

      const fallbackTitle = `Image ${index + 1}`;
      const title = item.title.trim() || deriveNodeImageTitle(normalizedSrc, fallbackTitle);

      return {
        ...item,
        src: normalizedSrc,
        title,
        alt: item.alt.trim() || title,
      };
    })
    .filter((item): item is NodeImageItem => Boolean(item));
}

export function ensureToolState(
  data: TaskData,
  tool: NodeToolType,
  language: 'zh' | 'en',
): NodeToolsState {
  const tools = data.tools || {};
  const normalizedTable = normalizeTableData(tools.table);
  const normalizedDocument = normalizeDocumentData(tools.document);
  const normalizedLink = normalizeLinkData(tools.link);
  const normalizedSchedule = normalizeScheduleData(tools.schedule);
  const normalizedImage = normalizeImageData(tools.image);

  return {
    ...tools,
    activeTool: tool,
    table: tool === 'table'
      ? normalizedTable && normalizedTable.columns.length > 0
        ? normalizedTable
        : createDefaultTableData(data.label, data.description, language)
      : normalizedTable,
    document: tool === 'document'
      ? normalizedDocument || createDefaultDocumentData()
      : normalizedDocument,
    link: tool === 'link'
      ? normalizedLink || createDefaultLinkData()
      : normalizedLink,
    schedule: tool === 'schedule'
      ? normalizedSchedule || createDefaultScheduleData(language)
      : normalizedSchedule,
    image: tool === 'image'
      ? normalizedImage || createDefaultImageData()
      : normalizedImage,
  };
}

export function formatScheduleSummary(schedule: NodeSchedule | undefined, language: 'zh' | 'en') {
  const normalizedSchedule = normalizeScheduleData(schedule);
  if (!normalizedSchedule?.enabled || normalizedSchedule.items.length === 0) return null;

  // 获取第一个有时间值的项
  const firstItemWithTime = normalizedSchedule.items.find(item => item.dateTime);
  if (!firstItemWithTime) return null;
  const { dateTime } = firstItemWithTime;
  if (!dateTime) return null;

  const date = new Date(dateTime);
  if (Number.isNaN(date.getTime())) return null;

  if (firstItemWithTime.allDay) {
    return date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric',
    });
  }

  return date.toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getNodeColorValue(color?: string) {
  switch (color) {
    case 'sky': return '#38bdf8';
    case 'green': return '#34d399';
    case 'amber': return '#fbbf24';
    case 'indigo': return '#818cf8';
    case 'rose': return '#fb7185';
    case 'teal': return '#2dd4bf';
    case 'fuchsia': return '#e879f9';
    case 'orange': return '#fb923c';
    case 'cyan': return '#22d3ee';
    case 'violet': return '#a78bfa';
    default: return '#94a3b8';
  }
}

export function getNodeTypeColorValue(type?: string) {
  const normalized = String(type || '').toLowerCase();
  if (normalized === 'planning' || normalized === '规划') return '#38bdf8';
  if (normalized === 'execution' || normalized === '执行') return '#34d399';
  if (normalized === 'verification' || normalized === '验证') return '#fbbf24';
  return '#818cf8';
}

export type ScheduledNodeEvent = {
  id: string;
  nodeId: string;
  timeItemId: string;
  title: string;
  label: string;
  color: string;
  startAt: string;
  endAt?: string;
  allDay: boolean;
  timeType: 'start' | 'end' | 'custom';
};

export type ScheduledNodeRange = {
  id: string;
  nodeId: string;
  title: string;
  color: string;
  startAt: string;
  endAt: string;
  startItemId: string;
  endItemId: string;
  allDay: boolean;
};

export function extractScheduledNodeEvents(nodes: Node[], edges: Edge[]): ScheduledNodeEvent[] {
  void edges;

  const events: ScheduledNodeEvent[] = [];

  nodes
    .filter((node) => node.type !== 'group')
    .forEach((node) => {
      const data = node.data as TaskData | undefined;
      const schedule = normalizeScheduleData(data?.tools?.schedule);

      if (!data?.label || !schedule?.enabled || !schedule.items?.length) return;

      schedule.items.forEach((item) => {
        if (!item.dateTime) return;

        events.push({
          id: `event-${node.id}-${item.id}`,
          nodeId: node.id,
          timeItemId: item.id,
          title: data.label,
          label: item.label || '',
          color: getNodeTypeColorValue(data.type),
          startAt: item.dateTime,
          allDay: Boolean(item.allDay),
          timeType: item.timeType,
        });
      });
    });

  return events.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
}

export function extractScheduledNodeRanges(nodes: Node[], edges: Edge[]): ScheduledNodeRange[] {
  const events = extractScheduledNodeEvents(nodes, edges);
  const ranges: ScheduledNodeRange[] = [];
  const eventsByNode = new Map<string, ScheduledNodeEvent[]>();

  events.forEach((event) => {
    if (!eventsByNode.has(event.nodeId)) {
      eventsByNode.set(event.nodeId, []);
    }
    eventsByNode.get(event.nodeId)?.push(event);
  });

  eventsByNode.forEach((nodeEvents) => {
    const startEvents = nodeEvents
      .filter((event) => event.timeType === 'start')
      .sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime());
    const endEvents = nodeEvents
      .filter((event) => event.timeType === 'end')
      .sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime());

    const usedEndIds = new Set<string>();

    startEvents.forEach((startEvent) => {
      const matchingEnd = endEvents.find((endEvent) => {
        if (usedEndIds.has(endEvent.id)) return false;
        return new Date(endEvent.startAt).getTime() >= new Date(startEvent.startAt).getTime();
      });

      if (!matchingEnd) return;

      usedEndIds.add(matchingEnd.id);

      const startTime = new Date(startEvent.startAt).getTime();
      const endTime = new Date(matchingEnd.startAt).getTime();
      const rangeStart = startTime <= endTime ? startEvent.startAt : matchingEnd.startAt;
      const rangeEnd = startTime <= endTime ? matchingEnd.startAt : startEvent.startAt;

      ranges.push({
        id: `range-${startEvent.nodeId}-${startEvent.timeItemId}-${matchingEnd.timeItemId}`,
        nodeId: startEvent.nodeId,
        title: startEvent.title,
        color: startEvent.color,
        startAt: rangeStart,
        endAt: rangeEnd,
        startItemId: startEvent.timeItemId,
        endItemId: matchingEnd.timeItemId,
        allDay: Boolean(startEvent.allDay && matchingEnd.allDay),
      });
    });
  });

  return ranges.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
}

export function toDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function getMonthGridStart(date: Date) {
  const firstDay = startOfMonth(date);
  const dayIndex = (firstDay.getDay() + 6) % 7;
  return addDays(firstDay, -dayIndex);
}
