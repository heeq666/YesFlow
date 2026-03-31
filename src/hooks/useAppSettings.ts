import { useEffect, useState } from 'react';

import type { Settings } from '../types';

const STORAGE_KEY = 'orchestra-ai-settings';

const DEFAULT_SETTINGS: Settings = {
  language: 'zh',
  version: '1.2.6',
  hotkeys: {
    save: 'Ctrl+S',
    export: 'Ctrl+Alt+S',
    open: 'Ctrl+O',
    undo: 'Ctrl+Z',
    redo: 'Ctrl+Y',
    copy: 'Ctrl+C',
    paste: 'Ctrl+V',
    cut: 'Ctrl+X',
    delete: 'Delete',
    pan: 'Space',
    select: 'Shift',
  },
  nodePresets: [
    { id: 'planning', label: '计划', color: 'sky', type: 'planning' },
    { id: 'execution', label: '执行', color: 'green', type: 'execution' },
    { id: 'verification', label: '验证', color: 'amber', type: 'verification' },
  ],
  categories: ['AI', '开发', '测试', '文档', '管理'],
  apiKey: '',
  completedStyle: 'logo',
  visuals: {
    nodeHighlightColor: '#3b82f6',
    edgeColor: '#94a3b8',
    edgeSelectedColor: '#8b5cf6',
    handleColor: '#8b5cf6',
  },
  customVisualPresets: [null, null],
  interaction: {
    boxSelectionShortcut: 'Shift',
  },
  updateNotes: [
    '🎨 配色槽位：预设精简为 3 个经典主题，另开放 2 个自定义存储槽位。',
    '📊 连线视觉优化：取色器新增常用专业配色色块，快速搭建高颜值编排器。',
    '⌨️ 交互热键统一：支持录入「鼠标左键」作为平移热键，不再区分专用开关。',
  ],
};

function loadSettings(): Settings {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return DEFAULT_SETTINGS;

  try {
    const parsed = JSON.parse(saved);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      hotkeys: { ...DEFAULT_SETTINGS.hotkeys, ...(parsed.hotkeys || {}) },
      visuals: { ...DEFAULT_SETTINGS.visuals, ...(parsed.visuals || {}) },
      customVisualPresets: parsed.customVisualPresets || [null, null],
      interaction: { ...DEFAULT_SETTINGS.interaction, ...(parsed.interaction || {}) },
    };
  } catch (error) {
    console.error('Failed to parse settings', error);
    return DEFAULT_SETTINGS;
  }
}

export function useAppSettings() {
  const [settings, setSettings] = useState<Settings>(loadSettings);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  return {
    settings,
    setSettings,
  };
}
