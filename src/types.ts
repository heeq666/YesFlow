import type React from 'react';
import type { Edge, Node } from '@xyflow/react';

export type NodeStatus = 'pending' | 'in-progress' | 'completed' | 'failed';
export type TaskMode = 'daily' | 'professional';

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
  onStatusChange?: (id: string, status: NodeStatus) => void;
  onAddNode?: (e: React.MouseEvent, id: string, position: 'top' | 'bottom' | 'left' | 'right') => void;
  onUpdateData?: (id: string, updates: Partial<TaskData>) => void;
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
  pan: string;       // Space by default
  select: string;    // Shift by default
}

export interface NodePreset {
  id: string;
  label: string;
  color: 'sky' | 'green' | 'amber' | 'indigo' | 'rose' | 'teal' | 'fuchsia' | 'orange' | 'cyan' | 'violet';
  type: string;
}

export interface VisualSettings {
  nodeHighlightColor: string;
  edgeColor: string;
  edgeSelectedColor: string;
  handleColor: string;
}

export interface InteractionSettings {
  boxSelectionShortcut: string; // e.g. "Shift" or "Control"
}

export interface Settings {
  language: 'zh' | 'en';
  hotkeys: HotkeyConfig;
  nodePresets: NodePreset[];
  categories: string[];
  completedStyle?: 'classic' | 'logo' | 'minimal';
  visuals: VisualSettings;
  customVisualPresets: (VisualSettings | null)[];
  interaction: InteractionSettings;
  apiKey?: string;
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
