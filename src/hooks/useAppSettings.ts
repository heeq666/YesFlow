import { useEffect, useState } from 'react';
import type { ApiProvider, Settings } from '../types';

const STORAGE_KEY = 'orchestra-ai-settings';

const DEFAULT_PROVIDERS: ApiProvider[] = [
  {
    id: 'minimax',
    name: 'MiniMax',
    type: 'minimax',
    apiKey: '',
    baseUrl: 'https://api.minimaxi.com/v1',
    model: 'MiniMax-M2.7',
    apiKeyUrl: 'https://platform.minimaxi.com/user-center/basic-information/interface-key',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    type: 'openai-compatible',
    apiKey: '',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    apiKeyUrl: 'https://platform.deepseek.com/api_keys',
  },
  {
    id: 'qwen',
    name: '通义千问',
    type: 'openai-compatible',
    apiKey: '',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
    apiKeyUrl: 'https://dashscope.console.aliyun.com/apiKey',
  },
  {
    id: 'doubao',
    name: '豆包',
    type: 'openai-compatible',
    apiKey: '',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    model: 'doubao-1-5-pro-32k',
    apiKeyUrl: 'https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey',
  },
  {
    id: 'zhipu',
    name: '智谱 AI',
    type: 'openai-compatible',
    apiKey: '',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4-flash',
    apiKeyUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
  },
];

const DEFAULT_SETTINGS: Settings = {
  language: 'zh',
  themeMode: 'light',
  version: '0.3.0',
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
    pan: '鼠标左键',
    select: 'Shift',
    group: 'Ctrl+G',
    ungroup: 'Shift+G',
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
    showCanvasGrid: false,
  },
  nodeTools: {
    enabled: true,
    showToolbarOnSelect: true,
    panelWidth: 420,
    enabledTools: {
      table: true,
      document: true,
      link: true,
      schedule: true,
    },
    calendar: {
      enabled: true,
      collapsed: false,
      defaultView: 'month',
      showTodayPanel: true,
    },
  },
  apiConfig: {
    activeProviderId: 'minimax',
    providers: DEFAULT_PROVIDERS,
  },
  updateNotes: [
    '✨ 节点工作台：现在每个任务节点都可以挂载文档、表格、链接和时间信息。',
    '🤖 多模型接入：内置支持 MiniMax、DeepSeek、通义千问、豆包、智谱与 OpenAI Compatible。',
    '🗂️ 项目记录与排期：支持本地记录、快速回载、拖拽排序，以及日历化的时间视图。',
    '🎛️ 深度可定制：快捷键、交互方式、外观预设、连线表现和节点工具都可按习惯调整。',
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
      // 强制使用最新代码中的版本号和功能介绍，不受本地缓存干扰
      version: DEFAULT_SETTINGS.version,
      updateNotes: DEFAULT_SETTINGS.updateNotes,
      hotkeys: { ...DEFAULT_SETTINGS.hotkeys, ...(parsed.hotkeys || {}) },
      visuals: { ...DEFAULT_SETTINGS.visuals, ...(parsed.visuals || {}) },
      customVisualPresets: parsed.customVisualPresets || [null, null],
      interaction: { ...DEFAULT_SETTINGS.interaction, ...(parsed.interaction || {}) },
      nodeTools: {
        ...DEFAULT_SETTINGS.nodeTools,
        ...(parsed.nodeTools || {}),
        enabledTools: {
          ...DEFAULT_SETTINGS.nodeTools.enabledTools,
          ...(parsed.nodeTools?.enabledTools || {}),
        },
        calendar: {
          ...DEFAULT_SETTINGS.nodeTools.calendar,
          ...(parsed.nodeTools?.calendar || {}),
        },
      },
      apiConfig: parsed.apiConfig ? {
        ...DEFAULT_SETTINGS.apiConfig,
        ...parsed.apiConfig,
        providers: (parsed.apiConfig.providers || DEFAULT_PROVIDERS).map((p: any) => {
          const defaultProvider = DEFAULT_PROVIDERS.find(dp => dp.id === p.id);
          return {
            ...defaultProvider,
            ...p,
            // 确保即使在旧数据中，这些关键字段也使用最新的
            apiKeyUrl: defaultProvider?.apiKeyUrl || p.apiKeyUrl
          };
        })
      } : {
        ...DEFAULT_SETTINGS.apiConfig,
        // Migration from legacy apiKey
        providers: DEFAULT_PROVIDERS.map(p => p.id === 'minimax' ? { ...p, apiKey: parsed.apiKey || '' } : p)
      }
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
