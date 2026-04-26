import React from 'react';
import { Clock3, FileText, ImageIcon, Link2, Table2 } from 'lucide-react';
import type { NodeTableRow, NodeToolType, TaskData } from '../types';
import { formatScheduleSummary, getNodeToolImages, getNodeToolLinks } from '../utils/nodeTools';

type NodeLanguage = 'zh' | 'en';

export interface ToolConfig {
  id: NodeToolType;
  labelZh: string;
  labelEn: string;
  icon: React.ReactNode;
  accentClass: string;
  quickMode?: 'interactive' | 'preview-only';
}

export interface ToolSnapshot {
  enabled: boolean;
  badge: string;
  detail: string;
  railBadge: {
    kind: 'disabled' | 'empty' | 'dot' | 'count';
    value?: string;
  };
}

const TOOL_CONFIGS: ToolConfig[] = [
  {
    id: 'table',
    labelZh: '表格',
    labelEn: 'Table',
    icon: <Table2 className="w-4 h-4" />,
    accentClass: 'bg-sky-500',
  },
  {
    id: 'document',
    labelZh: '文档',
    labelEn: 'Document',
    icon: <FileText className="w-4 h-4" />,
    accentClass: 'bg-emerald-500',
  },
  {
    id: 'link',
    labelZh: '链接',
    labelEn: 'Link',
    icon: <Link2 className="w-4 h-4" />,
    accentClass: 'bg-violet-500',
  },
  {
    id: 'schedule',
    labelZh: '时间',
    labelEn: 'Schedule',
    icon: <Clock3 className="w-4 h-4" />,
    accentClass: 'bg-amber-500',
  },
  {
    id: 'image',
    labelZh: '图片',
    labelEn: 'Image',
    icon: <ImageIcon className="w-4 h-4" />,
    accentClass: 'bg-rose-500',
  },
];

function toCountValue(count: number) {
  if (!Number.isFinite(count) || count <= 0) return '0';
  return count > 99 ? '99+' : String(count);
}

function disabledSnapshot(language: NodeLanguage, detail: string): ToolSnapshot {
  return {
    enabled: false,
    badge: language === 'zh' ? '未启用' : 'Disabled',
    detail,
    railBadge: { kind: 'disabled' },
  };
}

function emptySnapshot(language: NodeLanguage, detail: string): ToolSnapshot {
  return {
    enabled: true,
    badge: language === 'zh' ? '空' : 'Empty',
    detail,
    railBadge: { kind: 'empty' },
  };
}

export function getAvailableNodeTools(enabledTools?: Partial<Record<NodeToolType, boolean>>) {
  return TOOL_CONFIGS.filter((tool) => enabledTools?.[tool.id] ?? true);
}

export function getToolConfig(toolId: NodeToolType) {
  return TOOL_CONFIGS.find((tool) => tool.id === toolId) ?? null;
}

export function getToolLabel(toolId: NodeToolType, language: NodeLanguage) {
  const config = getToolConfig(toolId);
  if (!config) return toolId;
  return language === 'zh' ? config.labelZh : config.labelEn;
}

export function getToolSnapshot(toolId: NodeToolType, data: TaskData, language: NodeLanguage): ToolSnapshot {
  const tools = data.tools || {};

  switch (toolId) {
    case 'table': {
      const table = tools.table;
      if (!table?.enabled) {
        return disabledSnapshot(language, language === 'zh' ? '点击启用表格工具' : 'Enable the table tool to start');
      }

      const rowCount = Array.isArray(table.rows) ? table.rows.length : 0;
      const columnCount = Array.isArray(table.columns) ? table.columns.length : 0;

      if (rowCount === 0) {
        return emptySnapshot(
          language,
          language === 'zh'
            ? `已创建 ${columnCount} 列，尚无数据行`
            : `${columnCount} column(s) ready, no rows yet`,
        );
      }

      return {
        enabled: true,
        badge: language === 'zh' ? `${rowCount} 行` : `${rowCount} rows`,
        detail: language === 'zh' ? `${columnCount} 列字段` : `${columnCount} columns`,
        railBadge: { kind: 'count', value: toCountValue(rowCount) },
      };
    }

    case 'document': {
      const documentTool = tools.document;
      if (!documentTool?.enabled) {
        return disabledSnapshot(language, language === 'zh' ? '点击启用文档工具' : 'Enable the document tool to start');
      }

      const content = (documentTool.content || '').replace(/\s+/g, ' ').trim();
      if (!content) {
        return emptySnapshot(language, language === 'zh' ? '尚未填写文档内容' : 'No document content yet');
      }

      const preview = content.slice(0, 60);
      return {
        enabled: true,
        badge: language === 'zh' ? '有内容' : 'Has content',
        detail: preview,
        railBadge: { kind: 'dot' },
      };
    }

    case 'link': {
      const linkTool = tools.link;
      if (!linkTool?.enabled) {
        return disabledSnapshot(language, language === 'zh' ? '点击启用链接工具' : 'Enable the link tool to start');
      }

      const links = getNodeToolLinks(linkTool);
      if (links.length === 0) {
        return emptySnapshot(language, language === 'zh' ? '尚未添加链接' : 'No links added yet');
      }

      const firstLabel = links[0]?.displayLabel || links[0]?.title || links[0]?.url || '';
      return {
        enabled: true,
        badge: language === 'zh' ? `${links.length} 链接` : `${links.length} links`,
        detail: links.length > 1
          ? `${firstLabel} +${links.length - 1}`
          : firstLabel,
        railBadge: { kind: 'count', value: toCountValue(links.length) },
      };
    }

    case 'schedule': {
      const schedule = tools.schedule;
      if (!schedule?.enabled) {
        return disabledSnapshot(language, language === 'zh' ? '点击启用时间工具' : 'Enable the schedule tool to start');
      }

      const items = Array.isArray(schedule.items) ? schedule.items : [];
      const activeCount = items.filter((item) => Boolean(item?.dateTime)).length;
      const summary = formatScheduleSummary(schedule, language);

      if (activeCount === 0) {
        return emptySnapshot(language, language === 'zh' ? '尚未设置时间点' : 'No scheduled times yet');
      }

      return {
        enabled: true,
        badge: language === 'zh' ? `${activeCount} 时间` : `${activeCount} times`,
        detail: summary || (language === 'zh' ? '已设置时间安排' : 'Schedule configured'),
        railBadge: { kind: 'count', value: toCountValue(activeCount) },
      };
    }

    case 'image': {
      const imageTool = tools.image;
      if (!imageTool?.enabled) {
        return disabledSnapshot(language, language === 'zh' ? '点击启用图片工具' : 'Enable the image tool to start');
      }

      const images = getNodeToolImages(imageTool);
      if (images.length === 0) {
        return emptySnapshot(language, language === 'zh' ? '尚未添加图片' : 'No images added yet');
      }

      const firstTitle = images[0]?.title || (language === 'zh' ? '图片' : 'Image');
      return {
        enabled: true,
        badge: language === 'zh' ? `${images.length} 图片` : `${images.length} images`,
        detail: images.length > 1
          ? `${firstTitle} +${images.length - 1}`
          : firstTitle,
        railBadge: { kind: 'count', value: toCountValue(images.length) },
      };
    }

    default:
      return disabledSnapshot(language, language === 'zh' ? '未知工具' : 'Unknown tool');
  }
}

export function createEmptyRow(columns: string[]): NodeTableRow {
  return {
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    values: Object.fromEntries(columns.map((column) => [column, ''])),
  };
}

export function toInputDateValue(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toInputTimeValue(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function composeScheduleDateTime(dateValue: string, timeValue: string, allDay: boolean) {
  if (!dateValue) return undefined;
  const seed = allDay ? `${dateValue}T00:00:00` : `${dateValue}T${timeValue || '09:00'}:00`;
  const date = new Date(seed);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
