import React from 'react';
import { Clock3, FileText, ImageIcon, Link2, Table2 } from 'lucide-react';
import type { NodeTableRow, NodeToolType, TaskData } from '../types';
import { formatScheduleSummary, getNodeToolImages, getNodeToolLinks } from '../utils/nodeTools';

export interface ToolConfig {
  id: NodeToolType;
  labelZh: string;
  labelEn: string;
  descriptionZh: string;
  descriptionEn: string;
  icon: React.ReactNode;
  accentClass: string;
  quickMode: 'preview-only' | 'preview-edit';
  order: number;
}

export interface ToolSnapshot {
  enabled: boolean;
  badge: string;
  stateLabel: string;
  summary: string;
  detail: string;
  actionLabel: string;
  railBadge: {
    kind: 'disabled' | 'empty' | 'dot' | 'count';
    value?: string;
  };
}

export const TOOL_CONFIGS: ToolConfig[] = [
  {
    id: 'schedule',
    labelZh: '时间',
    labelEn: 'Schedule',
    descriptionZh: '安排关键时间点并同步到日历',
    descriptionEn: 'Schedule milestones and sync them to the calendar',
    icon: <Clock3 className="w-4 h-4" />,
    accentClass: 'bg-amber-500',
    quickMode: 'preview-edit',
    order: 10,
  },
  {
    id: 'link',
    labelZh: '链接',
    labelEn: 'Link',
    descriptionZh: '集中管理参考资料与外部资源',
    descriptionEn: 'Collect references and external resources',
    icon: <Link2 className="w-4 h-4" />,
    accentClass: 'bg-violet-500',
    quickMode: 'preview-edit',
    order: 20,
  },
  {
    id: 'document',
    labelZh: '文档',
    labelEn: 'Document',
    descriptionZh: '补充说明、SOP 与执行细节',
    descriptionEn: 'Capture notes, SOPs, and execution detail',
    icon: <FileText className="w-4 h-4" />,
    accentClass: 'bg-emerald-500',
    quickMode: 'preview-edit',
    order: 30,
  },
  {
    id: 'image',
    labelZh: '图片',
    labelEn: 'Images',
    descriptionZh: '收集参考图、草图和截图素材',
    descriptionEn: 'Collect references, mockups, and image assets',
    icon: <ImageIcon className="w-4 h-4" />,
    accentClass: 'bg-rose-500',
    quickMode: 'preview-edit',
    order: 35,
  },
  {
    id: 'table',
    labelZh: '表格',
    labelEn: 'Table',
    descriptionZh: '记录结构化数据、清单与指标',
    descriptionEn: 'Track structured data, lists, and metrics',
    icon: <Table2 className="w-4 h-4" />,
    accentClass: 'bg-sky-500',
    quickMode: 'preview-only',
    order: 40,
  },
];

export function getToolConfig(toolId: NodeToolType) {
  return TOOL_CONFIGS.find((tool) => tool.id === toolId);
}

export function getToolLabel(toolId: NodeToolType, language: 'zh' | 'en') {
  const config = getToolConfig(toolId);
  if (!config) return toolId;
  return language === 'zh' ? config.labelZh : config.labelEn;
}

export function getToolDescription(toolId: NodeToolType, language: 'zh' | 'en') {
  const config = getToolConfig(toolId);
  if (!config) return '';
  return language === 'zh' ? config.descriptionZh : config.descriptionEn;
}

export function getAvailableNodeTools(enabledTools: Record<NodeToolType, boolean>) {
  return TOOL_CONFIGS
    .filter((tool) => enabledTools[tool.id])
    .sort((left, right) => left.order - right.order);
}

function countFilledTableRows(data: TaskData) {
  const rows = Array.isArray(data.tools?.table?.rows) ? data.tools?.table?.rows : [];
  return rows.filter((row) => {
    const values = row && typeof row === 'object' && row.values && typeof row.values === 'object'
      ? Object.values(row.values as Record<string, unknown>)
      : [];
    return values.some((value) => String(value ?? '').trim().length > 0);
  }).length;
}

function countDocumentCharacters(data: TaskData) {
  const content = data.tools?.document?.content;
  return typeof content === 'string' ? content.trim().length : 0;
}

function formatCompactCount(value: number) {
  if (value <= 0) return '0';
  if (value > 99) return '99+';
  return `${value}`;
}

export function getToolSnapshot(
  toolId: NodeToolType,
  nodeData: TaskData,
  language: 'zh' | 'en',
): ToolSnapshot {
  switch (toolId) {
    case 'table': {
      const table = nodeData.tools?.table;
      const rowCount = countFilledTableRows(nodeData);
      const columnCount = Array.isArray(table?.columns) ? table.columns.length : 0;
      const enabled = Boolean(table?.enabled);

      return enabled
        ? {
            enabled: true,
            badge: language === 'zh' ? `${rowCount} 行` : `${rowCount} rows`,
            stateLabel: rowCount > 0 ? (language === 'zh' ? '已有内容' : 'With content') : (language === 'zh' ? '等待填充' : 'Ready to fill'),
            summary: language === 'zh' ? '结构化数据已就位' : 'Structured data is ready',
            detail:
              rowCount > 0
                ? language === 'zh'
                  ? `${columnCount} 列结构已经建立，继续补齐数据即可。`
                  : `${columnCount} columns are set. Keep the table filled in.`
                : language === 'zh'
                  ? '表格已经创建，等待录入第一批数据。'
                  : 'The table is created and waiting for the first entries.',
            actionLabel: language === 'zh' ? '打开表格' : 'Open table',
            railBadge: rowCount > 0 ? { kind: 'count', value: formatCompactCount(rowCount) } : { kind: 'empty' },
          }
        : {
            enabled: false,
            badge: language === 'zh' ? '未启用' : 'Inactive',
            stateLabel: language === 'zh' ? '未启用' : 'Inactive',
            summary: language === 'zh' ? '尚未创建结构化数据' : 'No structured data yet',
            detail: getToolDescription(toolId, language),
            actionLabel: language === 'zh' ? '创建表格' : 'Create table',
            railBadge: { kind: 'disabled' },
          };
    }
    case 'document': {
      const enabled = Boolean(nodeData.tools?.document?.enabled);
      const characterCount = countDocumentCharacters(nodeData);

      return enabled
        ? {
            enabled: true,
            badge: language === 'zh' ? `${characterCount} 字` : `${characterCount} chars`,
            stateLabel: characterCount > 0 ? (language === 'zh' ? '已有内容' : 'With content') : (language === 'zh' ? '等待填充' : 'Ready to fill'),
            summary: language === 'zh' ? '节点文档已挂载' : 'Node document is attached',
            detail:
              characterCount > 0
                ? language === 'zh'
                  ? '上下文已经开始沉淀，继续补充说明或复盘即可。'
                  : 'Context is in place. Keep refining notes or recap content.'
                : language === 'zh'
                  ? '文档已创建，等待记录第一段内容。'
                  : 'The document is ready for the first note.',
            actionLabel: language === 'zh' ? '打开文档' : 'Open document',
            railBadge: characterCount > 0 ? { kind: 'dot' } : { kind: 'empty' },
          }
        : {
            enabled: false,
            badge: language === 'zh' ? '未启用' : 'Inactive',
            stateLabel: language === 'zh' ? '未启用' : 'Inactive',
            summary: language === 'zh' ? '还没有补充文档' : 'No supporting document yet',
            detail: getToolDescription(toolId, language),
            actionLabel: language === 'zh' ? '创建文档' : 'Create document',
            railBadge: { kind: 'disabled' },
          };
    }
    case 'link': {
      const enabled = Boolean(nodeData.tools?.link?.enabled);
      const links = getNodeToolLinks(nodeData.tools?.link);

      return enabled
        ? {
            enabled: true,
            badge: language === 'zh' ? `${links.length} 条` : `${links.length} links`,
            stateLabel: links.length > 0 ? (language === 'zh' ? '已有内容' : 'With content') : (language === 'zh' ? '等待填充' : 'Ready to fill'),
            summary: language === 'zh' ? '参考链接已集中整理' : 'References are organized',
            detail:
              links.length > 0
                ? language === 'zh'
                  ? '资料入口已经归位，切换插件时可以直接跳转。'
                  : 'References are in place so you can jump out without friction.'
                : language === 'zh'
                  ? '链接面板已开启，等待添加第一个资源。'
                  : 'The link panel is ready for the first resource.',
            actionLabel: language === 'zh' ? '管理链接' : 'Manage links',
            railBadge: links.length > 0 ? { kind: 'count', value: formatCompactCount(links.length) } : { kind: 'empty' },
          }
        : {
            enabled: false,
            badge: language === 'zh' ? '未启用' : 'Inactive',
            stateLabel: language === 'zh' ? '未启用' : 'Inactive',
            summary: language === 'zh' ? '还没有整理参考链接' : 'No curated links yet',
            detail: getToolDescription(toolId, language),
            actionLabel: language === 'zh' ? '添加链接' : 'Add links',
            railBadge: { kind: 'disabled' },
          };
    }
    case 'schedule': {
      const schedule = nodeData.tools?.schedule;
      const enabled = Boolean(schedule?.enabled);
      const scheduleItems = Array.isArray(schedule?.items) ? schedule.items : [];
      const itemCount = scheduleItems.filter((item) => Boolean(item?.dateTime)).length;
      const summaryTime = formatScheduleSummary(schedule, language);

      return enabled
        ? {
            enabled: true,
            badge: language === 'zh' ? `${itemCount} 项` : `${itemCount} items`,
            stateLabel: itemCount > 0 ? (language === 'zh' ? '已有内容' : 'With content') : (language === 'zh' ? '等待填充' : 'Ready to fill'),
            summary: summaryTime || (language === 'zh' ? '时间规划已开启' : 'Scheduling is enabled'),
            detail:
              itemCount > 0
                ? language === 'zh'
                  ? '关键时间点会同步到日历，节点和排期保持联动。'
                  : 'Milestones sync into the calendar so planning stays connected.'
                : language === 'zh'
                  ? '时间模块已开启，等待设置第一条时间。'
                  : 'The scheduler is waiting for the first milestone.',
            actionLabel: language === 'zh' ? '查看排期' : 'Open schedule',
            railBadge: itemCount > 0 ? { kind: 'count', value: formatCompactCount(itemCount) } : { kind: 'empty' },
          }
        : {
            enabled: false,
            badge: language === 'zh' ? '未启用' : 'Inactive',
            stateLabel: language === 'zh' ? '未启用' : 'Inactive',
            summary: language === 'zh' ? '节点还没有时间安排' : 'This node has no schedule yet',
            detail: getToolDescription(toolId, language),
            actionLabel: language === 'zh' ? '添加时间' : 'Add schedule',
            railBadge: { kind: 'disabled' },
          };
    }
    case 'image': {
      const enabled = Boolean(nodeData.tools?.image?.enabled);
      const images = getNodeToolImages(nodeData.tools?.image);

      return enabled
        ? {
            enabled: true,
            badge: language === 'zh' ? `${images.length} 张` : `${images.length} images`,
            stateLabel: images.length > 0 ? (language === 'zh' ? '已有内容' : 'With content') : (language === 'zh' ? '等待填充' : 'Ready to fill'),
            summary: language === 'zh' ? '图片素材已经挂载' : 'Image references are attached',
            detail:
              images.length > 0
                ? language === 'zh'
                  ? '参考图和截图已经归位，切换节点时也能持续查看。'
                  : 'References and captures stay attached as you move through nodes.'
                : language === 'zh'
                  ? '图片插件已开启，等待添加第一张素材。'
                  : 'The image tool is ready for the first visual reference.',
            actionLabel: language === 'zh' ? '管理图片' : 'Manage images',
            railBadge: images.length > 0 ? { kind: 'count', value: formatCompactCount(images.length) } : { kind: 'empty' },
          }
        : {
            enabled: false,
            badge: language === 'zh' ? '未启用' : 'Inactive',
            stateLabel: language === 'zh' ? '未启用' : 'Inactive',
            summary: language === 'zh' ? '还没有挂载图片素材' : 'No image references yet',
            detail: getToolDescription(toolId, language),
            actionLabel: language === 'zh' ? '添加图片' : 'Add images',
            railBadge: { kind: 'disabled' },
          };
    }
    default:
      return {
        enabled: false,
        badge: language === 'zh' ? '未启用' : 'Inactive',
        stateLabel: language === 'zh' ? '未启用' : 'Inactive',
        summary: getToolLabel(toolId, language),
        detail: getToolDescription(toolId, language),
        actionLabel: language === 'zh' ? '打开' : 'Open',
        railBadge: { kind: 'disabled' },
      };
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
