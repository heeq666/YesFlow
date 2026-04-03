import type React from 'react';
import type { Edge, Node } from '@xyflow/react';

export type NodeStatus = 'pending' | 'in-progress' | 'completed' | 'failed';
export type TaskMode = 'daily' | 'professional';
export type ConnectionMode = 'auto' | 'fixed';
export type ThemeMode = 'light' | 'dark';
export type NodeToolType = 'table' | 'document' | 'link' | 'schedule' | 'image';
export type CalendarViewMode = 'month' | 'agenda';

export interface NodeTableRow {
  id: string;
  values: Record<string, string>;
}

export interface NodeTableData {
  enabled: boolean;
  columns: string[];
  rows: NodeTableRow[];
}

export interface NodeDocumentData {
  enabled: boolean;
  content: string;
}

export interface NodeLinkItem {
  id: string;
  title: string;
  url: string;
}

export interface NodeLinkData {
  enabled: boolean;
  items: NodeLinkItem[];
}

export interface NodeImageItem {
  id: string;
  title: string;
  src: string;
  alt: string;
}

export interface NodeImageData {
  enabled: boolean;
  items: NodeImageItem[];
}

export type ScheduleTimeType = 'start' | 'end' | 'custom';

// 单个时间项
export interface ScheduleTimeItem {
  id: string;
  timeType: ScheduleTimeType; // 时间类型：开始时间、完成时间、自定义
  label?: string; // 时间名称（可选）
  dateTime?: string; // 日期时间值
  allDay?: boolean; // 是否全天
}

// 节点日程配置
export interface NodeSchedule {
  enabled: boolean;
  items: ScheduleTimeItem[]; // 多个时间项
}

export interface NodeToolsState {
  activeTool?: NodeToolType;
  table?: NodeTableData;
  document?: NodeDocumentData;
  link?: NodeLinkData;
  schedule?: NodeSchedule;
  image?: NodeImageData;
}

export interface TaskData {
  [key: string]: unknown;
  label: string;
  description: string;
  type: string; // Changed to string to support dynamic professional types
  status: NodeStatus;
  language?: 'zh' | 'en';
  category?: string;
  color?: string;
  isGroup?: boolean;
  isAiProcessing?: boolean;
  typeLabel?: string;
  tools?: NodeToolsState;
  onStatusChange?: (id: string, status: NodeStatus) => void;
  onAddNode?: (e: React.MouseEvent, id: string, position: 'top' | 'bottom' | 'left' | 'right') => void;
  onUpdateData?: (id: string, updates: Partial<TaskData>) => void;
  onOpenToolPanel?: (id: string, tool: NodeToolType) => void;
  onAbortAiTask?: (id: string) => void;
  onUngroup?: (id: string) => void;
}

export interface GroupData {
  [key: string]: unknown;
  label: string;
  description: string;
  language?: 'zh' | 'en';
  color?: string;
  isGroup: true;
  isDraggingOver?: boolean;
  onUngroup?: (id: string) => void;
}

export interface HotkeyConfig {
  save: string;      // Current local save: e.g. "Ctrl+S"
  export: string;    // Export JSON: e.g. "Ctrl+Alt+S"
  open: string;      // Import JSON: e.g. "Ctrl+O"
  undo: string;      // e.g. "Ctrl+Z"
  redo: string;      // e.g. "Ctrl+Y"
  copy: string;      // e.g. "Ctrl+C"
  paste: string;     // e.g. "Ctrl+V"
  cut: string;       // e.g. "Ctrl+X"
  delete: string;    // e.g. "Delete/Backspace"
  pan: string;       // Left mouse button by default
  select: string;    // Shift by default
  group: string;     // Ctrl+G by default
  ungroup: string;   // Shift+G by default
}

export interface NodePreset {
  id: string;
  label: string;
  color: 'sky' | 'green' | 'amber' | 'indigo' | 'rose' | 'teal' | 'fuchsia' | 'orange' | 'cyan' | 'violet';
  type: string;
}

export type ProviderType = 'minimax' | 'openai-compatible';

export interface ApiProvider {
  id: string;
  name: string;
  type: ProviderType;
  apiKey: string;
  baseUrl: string;
  model: string;
  apiKeyUrl?: string;
}

export interface VisualSettings {
  nodeHighlightColor: string;
  edgeColor: string;
  edgeSelectedColor: string;
  handleColor: string;
}

export interface InteractionSettings {
  boxSelectionShortcut: string; // e.g. "Shift" or "Control"
  showCanvasGrid: boolean;
}

export interface NodeToolSettings {
  enabled: boolean;
  showToolbarOnSelect: boolean;
  panelWidth: number;
  enabledTools: Record<NodeToolType, boolean>;
  calendar: {
    enabled: boolean;
    collapsed: boolean;
    defaultView: CalendarViewMode;
    showTodayPanel: boolean;
  };
}

export interface Settings {
  language: 'zh' | 'en';
  themeMode: ThemeMode;
  hotkeys: HotkeyConfig;
  nodePresets: NodePreset[];
  categories: string[];
  completedStyle?: 'classic' | 'logo' | 'minimal';
  visuals: VisualSettings;
  customVisualPresets: (VisualSettings | null)[];
  interaction: InteractionSettings;
  nodeTools: NodeToolSettings;
  apiConfig: {
    activeProviderId: string;
    providers: ApiProvider[];
  };
  apiKey?: string; // Legacy support
  version: string;
  updateNotes: string[];
}

export interface AIProjectPlan {
  isSupported?: boolean;
  suggestion?: string;
  project_name: string;
  nodes: {
    id: string;
    label: string;
    description: string;
    type: string;
    category?: string;
    dependencies: {
      id: string;
      label?: string;
    }[];
  }[];
}

export interface ProjectRecord {
  id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
  language: 'zh' | 'en';
  mode: TaskMode;
  lastModified: number;
}

export interface RecordAiState {
  runningNodeIds: string[];
  latestStatus?: 'success' | 'error';
  latestMessage?: string;
  latestUpdatedAt?: number;
  unread?: boolean;
}
