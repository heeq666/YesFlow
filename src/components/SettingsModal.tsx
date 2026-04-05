import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Download,
  Edit3,
  ExternalLink,
  FileText,
  Globe,
  Hash,
  History,
  ImageIcon,
  Info,
  Keyboard,
  Laptop,
  Layers,
  Loader2,
  Lock,
  Link2,
  Mail,
  Minus,
  Moon,
  Package,
  Plus,
  PlusCircle,
  Rocket,
  Save,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  Table2,
  Trash2,
  X,
  Zap,
} from 'lucide-react';

import { validateApiKey } from '../services/aiService';
import { APPEARANCE_PRESETS } from '../constants/appearancePresets';
import type { HotkeyConfig, Settings, ApiProvider } from '../types';
import ApiProviderSelector from './ApiProviderSelector';
import CustomScrollArea from './CustomScrollArea';

type SettingsModalProps = {
  settings: Settings;
  language: 'zh' | 'en';
  onClose: () => void;
  onUpdate: (settings: Settings) => void;
  onToggleLanguage: () => void;
};

type VisualColorKey = keyof Settings['visuals'];

const NODE_PRESET_COLOR_OPTIONS = ['sky', 'green', 'amber', 'indigo', 'rose', 'violet', 'teal', 'fuchsia', 'orange', 'cyan'] as const;
const VISUAL_COLOR_OPTIONS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#14b8a6', '#06b6d4', '#8b5cf6', '#64748b'] as const;

const NODE_PRESET_TONE_CLASSES: Record<'light' | 'dark', Record<string, string>> = {
  light: {
    sky: 'bg-sky-50/40 border-sky-200 hover:border-sky-300 text-sky-700',
    green: 'bg-green-50/40 border-green-200 hover:border-green-300 text-green-700',
    amber: 'bg-amber-50/40 border-amber-200 hover:border-amber-300 text-amber-700',
    indigo: 'bg-indigo-50/40 border-indigo-200 hover:border-indigo-300 text-indigo-700',
    rose: 'bg-rose-50/40 border-rose-200 hover:border-rose-300 text-rose-700',
    teal: 'bg-teal-50/40 border-teal-200 hover:border-teal-300 text-teal-700',
    fuchsia: 'bg-fuchsia-50/40 border-fuchsia-200 hover:border-fuchsia-300 text-fuchsia-700',
    orange: 'bg-orange-50/40 border-orange-200 hover:border-orange-300 text-orange-700',
    cyan: 'bg-cyan-50/40 border-cyan-200 hover:border-cyan-300 text-cyan-700',
    violet: 'bg-violet-50/40 border-violet-200 hover:border-violet-300 text-violet-700',
  },
  dark: {
    sky: 'bg-sky-950/60 border-sky-800/70 hover:border-sky-700 text-sky-200',
    green: 'bg-green-950/60 border-green-800/70 hover:border-green-700 text-green-200',
    amber: 'bg-amber-950/60 border-amber-800/70 hover:border-amber-700 text-amber-200',
    indigo: 'bg-indigo-950/60 border-indigo-800/70 hover:border-indigo-700 text-indigo-200',
    rose: 'bg-rose-950/60 border-rose-800/70 hover:border-rose-700 text-rose-200',
    teal: 'bg-teal-950/60 border-teal-800/70 hover:border-teal-700 text-teal-200',
    fuchsia: 'bg-fuchsia-950/60 border-fuchsia-800/70 hover:border-fuchsia-700 text-fuchsia-200',
    orange: 'bg-orange-950/60 border-orange-800/70 hover:border-orange-700 text-orange-200',
    cyan: 'bg-cyan-950/60 border-cyan-800/70 hover:border-cyan-700 text-cyan-200',
    violet: 'bg-violet-950/60 border-violet-800/70 hover:border-violet-700 text-violet-200',
  },
};

const NODE_PRESET_SWATCH_CLASSES: Record<string, string> = {
  sky: 'bg-sky-400',
  green: 'bg-green-400',
  amber: 'bg-amber-400',
  indigo: 'bg-indigo-400',
  rose: 'bg-rose-400',
  teal: 'bg-teal-400',
  fuchsia: 'bg-fuchsia-400',
  orange: 'bg-orange-400',
  cyan: 'bg-cyan-400',
  violet: 'bg-violet-400',
};

function getNodePresetToneClass(color: string, themeMode: 'light' | 'dark') {
  return NODE_PRESET_TONE_CLASSES[themeMode][color] || NODE_PRESET_TONE_CLASSES[themeMode].violet;
}

function getNodePresetSwatchClass(color: string) {
  return NODE_PRESET_SWATCH_CLASSES[color] || NODE_PRESET_SWATCH_CLASSES.violet;
}

export default function SettingsModal({ settings, language, onClose, onUpdate, onToggleLanguage }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'hotkeys' | 'custom' | 'nodeTools' | 'api' | 'appearance' | 'about'>('hotkeys');
  const [recordingKey, setRecordingKey] = useState<keyof HotkeyConfig | null>(null);
  const [recordingKeys, setRecordingKeys] = useState<string[]>([]);
  const [isLmbRecording, setIsLmbRecording] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState('');
  const [activeColorPickerId, setActiveColorPickerId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  useEffect(() => {
    if (!activeColorPickerId) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('[data-color-picker-root="true"]')) {
        setActiveColorPickerId(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveColorPickerId(null);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [activeColorPickerId]);

  const hotkeyLabels: Record<string, string> = {
    save: language === 'zh' ? '保存项目' : 'Save Project',
    export: language === 'zh' ? '导出 JSON' : 'Export JSON',
    open: language === 'zh' ? '导入 JSON' : 'Import JSON',
    undo: language === 'zh' ? '撤销' : 'Undo',
    redo: language === 'zh' ? '重做' : 'Redo',
    copy: language === 'zh' ? '复制节点' : 'Copy',
    paste: language === 'zh' ? '粘贴节点' : 'Paste',
    cut: language === 'zh' ? '剪切节点' : 'Cut',
    delete: language === 'zh' ? '删除节点' : 'Delete',
    pan: language === 'zh' ? '画布平移' : 'Pan Canvas',
    select: language === 'zh' ? '多选模式' : 'Multi-select',
    group: language === 'zh' ? '编组节点' : 'Group Nodes',
    ungroup: language === 'zh' ? '解除编组' : 'Ungroup'
  };

  const activeProvider = settings.apiConfig.providers.find(p => p.id === settings.apiConfig.activeProviderId) || settings.apiConfig.providers[0];
  const isDarkTheme = settings.themeMode === 'dark';
  const visualSettingItems: { key: VisualColorKey; label: string }[] = [
    { key: 'nodeHighlightColor', label: language === 'zh' ? '选中边框' : 'Highlight' },
    { key: 'edgeColor', label: language === 'zh' ? '普通连线' : 'Edge' },
    { key: 'edgeSelectedColor', label: language === 'zh' ? '高亮连线' : 'Selected' },
    { key: 'handleColor', label: language === 'zh' ? '连接点' : 'Handles' },
  ];

  // 用 ref 避免 stale closure：确保 event listener 里永远读到最新的 settings
  const settingsRef = React.useRef(settings);
  settingsRef.current = settings;
  const languageRef = React.useRef(language);
  languageRef.current = language;

  useEffect(() => {
    if (!recordingKey) {
      setRecordingKeys([]);
      setIsLmbRecording(false);
      return;
    }
    
    const handleKeyDown = (e: KeyboardEvent) => {
      e.stopPropagation();
      e.preventDefault();
      
      const parts: string[] = [];
      if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');
      
      const key = e.key === ' ' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key;
      const isModifier = ['Control', 'Alt', 'Shift', 'Meta', 'OS'].includes(key);
      
      const currentParts = [...parts];
      if (!isModifier) {
        currentParts.push(key);
      }
      setRecordingKeys(currentParts);

      if (!isModifier) {
        const hotkeyStr = currentParts.join('+');
        const currentSettings = settingsRef.current;
        onUpdate({ ...currentSettings, hotkeys: { ...currentSettings.hotkeys, [recordingKey]: hotkeyStr } });
        setFeedback(`${hotkeyLabels[recordingKey]} - ${hotkeyStr} ${language === 'zh' ? '已生效' : 'Active'}`);
        setRecordingKey(null);
        setRecordingKeys([]);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
        e.stopPropagation();
        e.preventDefault();
        
        const parts: string[] = [];
        if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
        if (e.altKey) parts.push('Alt');
        if (e.shiftKey) parts.push('Shift');
        setRecordingKeys(parts);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        e.stopPropagation();
        e.preventDefault();
        const currentSettings = settingsRef.current;
        const currentLanguage = languageRef.current;
        onUpdate({ ...currentSettings, hotkeys: { ...currentSettings.hotkeys, [recordingKey]: currentLanguage === 'zh' ? '鼠标左键' : 'LMB' } });
        setFeedback(`${hotkeyLabels[recordingKey]} - ${currentLanguage === 'zh' ? '鼠标左键' : 'LMB'} ${currentLanguage === 'zh' ? '已生效' : 'Active'}`);
        setRecordingKey(null);
        setRecordingKeys([]);
      }
    };

    const handleMouseUp = () => window.removeEventListener('mouseup', handleMouseUp);
    const handleMouseLeave = () => window.removeEventListener('mouseleave', handleMouseUp);

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });
    window.addEventListener('mousedown', handleMouseDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
      window.removeEventListener('mousedown', handleMouseDown, { capture: true });
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [recordingKey, onUpdate]);

  const handleTestConnection = async () => {
    if (!activeProvider.apiKey) return;
    setTestStatus('testing');
    setTestError('');
    try {
      await validateApiKey(activeProvider);
      setTestStatus('success');
    } catch (err: any) {
      setTestStatus('error');
      setTestError(err.message || (language === 'zh' ? '连接失败' : 'Connection failed'));
    }
  };

  const handleUpdateProviderKey = (id: string, key: string) => {
    const newProviders = settings.apiConfig.providers.map(p => 
      p.id === id ? { ...p, apiKey: key } : p
    );
    onUpdate({
      ...settings,
      apiConfig: { ...settings.apiConfig, providers: newProviders }
    });
    setFeedback(`${language === 'zh' ? '密钥更新已生效' : 'API Key Updated'}`);
  };

  const handleAddCustomProvider = () => {
    const newId = `custom-${Date.now()}`;
    const newProvider: ApiProvider = {
      id: newId,
      name: language === 'zh' ? '自定义模型' : 'Custom Model',
      type: 'openai-compatible',
      apiKey: '',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-3.5-turbo'
    };
    onUpdate({
      ...settings,
      apiConfig: {
        ...settings.apiConfig,
        activeProviderId: newId,
        providers: [...settings.apiConfig.providers, newProvider]
      }
    });
    setFeedback(`${language === 'zh' ? '模型：新添加已生效' : 'Provider: Added Successfully'}`);
  };

  const handleDeleteProvider = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (settings.apiConfig.providers.length <= 1) return;
    const newProviders = settings.apiConfig.providers.filter(p => p.id !== id);
    const newActiveId = id === settings.apiConfig.activeProviderId ? newProviders[0].id : settings.apiConfig.activeProviderId;
    onUpdate({
      ...settings,
      apiConfig: { activeProviderId: newActiveId, providers: newProviders }
    });
  };

  const tabs = [
    { id: 'hotkeys', label: language === 'zh' ? '热键设置' : 'Hotkeys', icon: <Keyboard className="w-4 h-4" /> },
    { id: 'custom', label: language === 'zh' ? '自定义类型' : 'Customization', icon: <PlusCircle className="w-4 h-4" /> },
    { id: 'nodeTools', label: language === 'zh' ? '节点功能' : 'Node Tools', icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'api', label: language === 'zh' ? '模型配置' : 'AI Services', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'appearance', label: language === 'zh' ? '外观设置' : 'Appearance', icon: <Laptop className="w-4 h-4" /> },
    { id: 'about', label: language === 'zh' ? '关于项目' : 'About', icon: <Layers className="w-4 h-4" /> },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/20 backdrop-blur-xl p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }} 
        animate={{ scale: 1, y: 0 }} 
        exit={{ scale: 0.95, y: 20 }}
        className="w-full max-w-4xl h-[600px] bg-white rounded-[2.5rem] shadow-[0_32px_128px_-32px_rgba(0,0,0,0.3)] border border-neutral-100 flex overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Sidebar */}
        <div className="w-64 bg-neutral-50/50 border-r border-neutral-100 p-8 flex flex-col gap-2">
          <div className="flex items-center justify-between mb-10 px-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg">
                <SettingsIcon className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-extrabold text-neutral-900 tracking-tight">{language === 'zh' ? '系统设置' : 'Settings'}</h2>
            </div>
            <button 
              onClick={onToggleLanguage} 
              className="p-2 bg-neutral-100 hover:bg-primary/10 rounded-lg text-xs font-bold transition-all flex items-center gap-1 text-neutral-500 hover:text-primary"
              title={language === 'zh' ? '切换到英文' : 'Switch to Chinese'}
            >
              <Globe className="w-3.5 h-3.5" />
              {language === 'zh' ? 'EN' : '中'}
            </button>
          </div>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                activeTab === tab.id ? 'bg-white text-primary shadow-sm ring-1 ring-black/5' : 'text-neutral-400 hover:text-neutral-600'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
          <div className="mt-auto pt-8 flex flex-col gap-4">
            <AnimatePresence mode="wait">
              {feedback ? (
                <motion.div 
                  key="feedback"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-center gap-3"
                >
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse shrink-0" />
                  <span className="text-[10px] font-black text-primary uppercase tracking-wider leading-tight">
                    {feedback}
                  </span>
                </motion.div>
              ) : (
                <motion.div 
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 bg-neutral-100/50 border border-neutral-100 rounded-2xl flex items-center gap-3 opacity-60"
                >
                  <div className="w-2 h-2 bg-neutral-300 rounded-full shrink-0" />
                  <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider leading-tight">
                    {language === 'zh' ? '所有设置实时保存' : 'All settings saved in real-time'}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
            
            <button 
              onClick={onClose} 
              className="w-full py-3 bg-neutral-900 text-white rounded-2xl text-xs font-bold hover:bg-black transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-neutral-900/10"
            >
              {language === 'zh' ? '关闭' : 'Close'}
            </button>
          </div>
        </div>

        {/* Content */}
        <CustomScrollArea className="min-h-0 flex-1" viewportClassName="h-full p-12">
          <AnimatePresence mode="wait">
            {activeTab === 'hotkeys' && (
              <motion.div key="hotkeys" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-8">
                <div>
                  <h3 className="text-xl font-extrabold text-neutral-900 mb-2">{language === 'zh' ? '全局快捷键' : 'Global Hotkeys'}</h3>
                  <p className="text-sm text-neutral-400 font-medium">{language === 'zh' ? '点击任何按键组合进行重新录制绑定。' : 'Click any key combination to re-record the binding.'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(settings.hotkeys).map(([key, value]) => {
                    const labels: Record<string, { zh: string, en: string }> = {
                      save: { zh: '保存项目', en: 'Save Project' },
                      export: { zh: '导出 JSON', en: 'Export JSON' },
                      open: { zh: '导入 JSON', en: 'Import JSON' },
                      undo: { zh: '撤销', en: 'Undo' },
                      redo: { zh: '重做', en: 'Redo' },
                      copy: { zh: '复制节点', en: 'Copy' },
                      paste: { zh: '粘贴节点', en: 'Paste' },
                      cut: { zh: '剪切节点', en: 'Cut' },
                      delete: { zh: '删除节点', en: 'Delete' },
                      pan: { zh: '画布平移', en: 'Pan Canvas' },
                      select: { zh: '多选模式', en: 'Multi-select' },
                      group: { zh: '编组节点', en: 'Group Nodes' },
                      ungroup: { zh: '解除编组', en: 'Ungroup' }
                    };
                    const label = labels[key]?.[language] || key;
                    
                    return (
                      <div key={key} className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-between group">
                        <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">{label}</span>
                        <button 
                          onClick={() => setRecordingKey(key as any)}
                          className={`min-w-[80px] px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all relative overflow-hidden ${
                            recordingKey === key ? 'bg-primary text-white scale-105 shadow-xl ring-2 ring-primary/20' : 'bg-white text-neutral-700 border border-neutral-200 group-hover:border-primary/30'
                          }`}
                        >
                          {recordingKey === key ? (
                            <div className="flex items-center gap-1.5 justify-center">
                                {recordingKeys.length > 0 ? (
                                    recordingKeys.map((k, i) => (
                                        <React.Fragment key={i}>
                                            <motion.span initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white/20 px-1.5 py-0.5 rounded-md border border-white/30 text-[10px] shadow-sm">{k}</motion.span>
                                            {i < recordingKeys.length - 1 && <span className="opacity-50">+</span>}
                                        </React.Fragment>
                                    ))
                                ) : (
                                    <span className="animate-pulse">{language === 'zh' ? '请按键...' : 'Press Key...'}</span>
                                )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                                {value.split('+').map((k, i) => (
                                     <React.Fragment key={i}>
                                        <span className="px-1.5 py-0.5 bg-neutral-100 rounded-md border border-neutral-200 text-[9px] shadow-sm">{k}</span>
                                        {i < value.split('+').length - 1 && <span className="text-neutral-300">+</span>}
                                    </React.Fragment>
                                ))}
                            </div>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
            {activeTab === 'custom' && (
                <motion.div key="custom" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-8 pb-4">
                  <div>
                    <h3 className="text-xl font-extrabold text-neutral-900 mb-2">{language === 'zh' ? '预设管理' : 'Preset Management'}</h3>
                    <p className="text-sm text-neutral-400 font-medium">{language === 'zh' ? '自定义顶部栏显示的节点类型及其主题色，或管理全局类别。' : 'Customize top bar node types and theme colors, or manage global categories.'}</p>
                  </div>

                  <div className="space-y-8">
                     <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{language === 'zh' ? '节点类型预设' : 'Node Presets'}</span>
                          <button 
                            onClick={() => {
                                const newId = `custom-${Date.now()}`;
                                onUpdate({ ...settings, nodePresets: [...settings.nodePresets, { id: newId, label: language === 'zh' ? '新类型' : 'New Type', color: 'violet', type: newId }] });
                                setFeedback(`${language === 'zh' ? '节点：新添加已生效' : 'Node: Added Successfully'}`);
                            }}
                            className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {settings.nodePresets.map((preset, idx) => {
                            const pickerId = `node-preset:${preset.id}`;

                            return (
                            <div 
                              key={preset.id} 
                              data-color-picker-root="true"
                              className={`relative px-3 py-1.5 rounded-xl border transition-all flex items-center justify-between group h-9 ${getNodePresetToneClass(preset.color, isDarkTheme ? 'dark' : 'light')}`}
                            >
                              <input 
                                className="w-full bg-transparent border-none outline-none text-[10px] font-black tracking-tight placeholder:opacity-50"
                                value={preset.label}
                                onChange={e => {
                                  const next = [...settings.nodePresets];
                                  next[idx] = { ...next[idx], label: e.target.value };
                                  onUpdate({ ...settings, nodePresets: next });
                                }}
                              />
                              
                              <div className="flex items-center gap-1.5 shrink-0 ml-1">
                                  <button 
                                    type="button"
                                    onClick={() => setActiveColorPickerId(activeColorPickerId === pickerId ? null : pickerId)}
                                    className={`w-2.5 h-2.5 rounded-full shadow-sm ring-1 ring-black/5 hover:scale-125 transition-all ${getNodePresetSwatchClass(preset.color)}`}
                                  />

                                  <button 
                                    type="button"
                                    onClick={() => onUpdate({ ...settings, nodePresets: settings.nodePresets.filter(p => p.id !== preset.id) })}
                                    className="w-4 h-4 flex items-center justify-center text-neutral-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                              </div>

                              <AnimatePresence>
                                {activeColorPickerId === pickerId && (
                                  <motion.div 
                                    initial={{ opacity: 0, y: 5, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 5, scale: 0.9 }}
                                    onClick={(e) => {
                                      if (e.target === e.currentTarget) {
                                        setActiveColorPickerId(null);
                                      }
                                    }}
                                    className="absolute left-0 top-full mt-2 z-50 bg-white p-2 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border border-neutral-100 grid grid-cols-5 gap-1.5"
                                  >
                                     {NODE_PRESET_COLOR_OPTIONS.map(c => (
                                        <button 
                                            key={c} 
                                            type="button"
                                            onClick={() => {
                                                const next = [...settings.nodePresets];
                                                next[idx] = { ...next[idx], color: c as any };
                                                onUpdate({ ...settings, nodePresets: next });
                                                setActiveColorPickerId(null);
                                            }}
                                            className={`w-4 h-4 rounded-full ring-1 ring-black/5 hover:scale-125 transition-all ${getNodePresetSwatchClass(c)} ${preset.color === c ? 'ring-2 ring-primary ring-offset-1' : ''}`} 
                                        />
                                     ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                            );
                          })}
                        </div>
                     </div>

                     <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{language === 'zh' ? '全局类别预设' : 'Category Presets'}</span>
                          <button 
                            onClick={() => {
                                const newCat = language === 'zh' ? '新类别' : 'New Category';
                                onUpdate({ ...settings, categories: [...settings.categories, newCat] });
                            }}
                            className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all font-bold"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-2">
                          {settings.categories.map((cat, i) => (
                             <div key={i} className="group relative px-3 py-1.5 bg-white border border-neutral-100 rounded-xl shadow-sm hover:border-primary/20 transition-all flex items-center justify-between h-9">
                                <input 
                                  className="w-full bg-transparent border-none outline-none text-[10px] font-black text-neutral-700 tracking-tight placeholder:opacity-50 truncate mr-1"
                                  value={cat}
                                  onChange={e => {
                                    const next = [...settings.categories];
                                    next[i] = e.target.value;
                                    onUpdate({ ...settings, categories: next });
                                  }}
                                />
                                <button 
                                  onClick={() => onUpdate({ ...settings, categories: settings.categories.filter((_, idx) => idx !== i) })}
                                  className="w-4 h-4 flex items-center justify-center text-neutral-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                                >
                                   <X className="w-3.5 h-3.5" />
                                 </button>
                             </div>
                          ))}
                        </div>
                     </div>
                  </div>

                  <div className="h-px bg-neutral-100 my-4" />
                  
                  <div>
                    <h3 className="text-xl font-extrabold text-neutral-900 mb-2">{language === 'zh' ? '完成节点样式' : 'Completion Style'}</h3>
                    <p className="text-sm text-neutral-400 font-medium mb-4">{language === 'zh' ? '当任务标记为"完成"时节点的视觉表现。' : 'Visual appearance of nodes when marked as "Completed".'}</p>
                    <div className="flex gap-3">
                      {[
                        { id: 'classic', label: language === 'zh' ? '经典 (淡化)' : 'Classic', icon: <Minus className="w-4 h-4" /> },
                        { id: 'logo', label: language === 'zh' ? 'Logo (大勾)' : 'Logo Icon', icon: <CheckCircle2 className="w-4 h-4" /> },
                        { id: 'minimal', label: language === 'zh' ? '极简 (标准)' : 'Minimal', icon: <Check className="w-4 h-4" /> }
                      ].map(style => (
                        <button
                          key={style.id}
                          onClick={() => onUpdate({ ...settings, completedStyle: style.id as any })}
                          className={`flex-1 flex flex-col items-center gap-3 p-4 rounded-3xl border-2 transition-all ${
                            (settings.completedStyle || 'logo') === style.id 
                              ? 'bg-primary/5 border-primary text-primary shadow-lg shadow-primary/10' 
                              : 'bg-white border-neutral-100 text-neutral-400 hover:border-neutral-200 hover:bg-neutral-50'
                          }`}
                        >
                          <div className={`p-3 rounded-2xl ${ (settings.completedStyle || 'logo') === style.id ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'bg-neutral-100' }`}>
                            {style.icon}
                          </div>
                          <span className="text-xs font-bold">{style.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            {activeTab === 'api' && (
              <motion.div key="api" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-8">
                <div>
                  <h3 className="text-xl font-extrabold text-neutral-900 mb-2">{language === 'zh' ? '模型与 API 配置' : 'AI Service Configuration'}</h3>
                  <p className="text-sm text-neutral-400 font-medium">{language === 'zh' ? '在此配置您的 AI 服务凭据。支持主流预设及自定义 OpenAI 兼容接口。' : 'Configure your AI credentials here. Supports presets and custom OpenAI-compatible interfaces.'}</p>
                </div>
                
                <div className="space-y-6">
                  <ApiProviderSelector
                    providers={settings.apiConfig.providers}
                    activeProviderId={settings.apiConfig.activeProviderId}
                    language={language}
                    onSelect={(id) => {
                      onUpdate({ ...settings, apiConfig: { ...settings.apiConfig, activeProviderId: id } });
                      setTestStatus('idle');
                    }}
                    onAddCustom={handleAddCustomProvider}
                  />

                  <div className="p-8 rounded-[2.5rem] bg-neutral-50 border border-neutral-100 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-sm">
                          <Zap className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-neutral-900 leading-none mb-1">{activeProvider.name}</h4>
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{activeProvider.model}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {activeProvider.baseUrl && (
                          <a href={activeProvider.baseUrl} target="_blank" rel="noreferrer" className="p-2 hover:bg-neutral-200/50 rounded-xl text-neutral-400 transition-colors">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        {!['minimax', 'deepseek', 'qwen', 'doubao', 'zhipu'].includes(activeProvider.id) && (
                           <button 
                             onClick={(e) => handleDeleteProvider(activeProvider.id, e)}
                             className="p-2 hover:bg-red-50 rounded-xl text-red-400 transition-colors"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      {activeProvider.type === 'openai-compatible' && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">{language === 'zh' ? '接口地址 (Base URL)' : 'Base URL'}</label>
                          <input 
                            type="text"
                            value={activeProvider.baseUrl}
                            onChange={(e) => {
                              const newProviders = settings.apiConfig.providers.map(p => 
                                p.id === activeProvider.id ? { ...p, baseUrl: e.target.value } : p
                              );
                              onUpdate({ ...settings, apiConfig: { ...settings.apiConfig, providers: newProviders } });
                            }}
                            className="w-full bg-white border border-neutral-200 rounded-2xl px-5 py-3.5 text-xs font-mono focus:ring-4 ring-primary/10 outline-none transition-all"
                            placeholder="https://api..."
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">{language === 'zh' ? '模型名称 (Model)' : 'Model Name'}</label>
                        <input 
                          type="text"
                          value={activeProvider.model}
                          onChange={(e) => {
                            const newProviders = settings.apiConfig.providers.map(p => 
                              p.id === activeProvider.id ? { ...p, model: e.target.value } : p
                            );
                            onUpdate({ ...settings, apiConfig: { ...settings.apiConfig, providers: newProviders } });
                          }}
                          className="w-full bg-white border border-neutral-200 rounded-2xl px-5 py-3.5 text-xs font-mono focus:ring-4 ring-primary/10 outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                          <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none">{language === 'zh' ? '授权密钥 (API Key)' : 'API Key'}</label>
                          <a href={activeProvider.apiKeyUrl || activeProvider.baseUrl} target="_blank" rel="noreferrer" className="text-[9px] font-bold text-primary hover:underline">
                            {language === 'zh' ? '获取 Key' : 'Get Key'}
                          </a>
                        </div>
                        <div className="flex gap-2">
                          <div className="relative group flex-1">
                            <input 
                              type={showApiKey ? "text" : "password"}
                              className="w-full bg-white border border-neutral-200 rounded-2xl px-5 py-3.5 text-xs font-mono focus:ring-4 ring-primary/10 outline-none transition-all pr-12"
                              placeholder="sk-..."
                              value={activeProvider.apiKey || ''}
                              onChange={e => {
                                handleUpdateProviderKey(activeProvider.id, e.target.value);
                                if (testStatus !== 'idle') setTestStatus('idle');
                              }}
                            />
                            <button 
                              onMouseDown={() => setShowApiKey(true)}
                              onMouseUp={() => setShowApiKey(false)}
                              onMouseLeave={() => setShowApiKey(false)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                            >
                              {showApiKey ? <Check className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                            </button>
                          </div>
                          <button 
                            onClick={handleTestConnection}
                            disabled={!activeProvider.apiKey || testStatus === 'testing'}
                            className={`px-8 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 border-2 ${
                              testStatus === 'success'
                                ? isDarkTheme
                                  ? 'bg-green-950/70 border-green-800/80 text-green-200 shadow-xl shadow-black/20'
                                  : 'bg-green-50 border-green-200 text-green-600 shadow-xl shadow-green-100/30'
                                : testStatus === 'error'
                                  ? isDarkTheme
                                    ? 'bg-red-950/70 border-red-800/80 text-red-200 shadow-xl shadow-black/20'
                                    : 'bg-red-50 border-red-200 text-red-600 shadow-xl shadow-red-100/30'
                                :
                              'bg-primary text-white border-primary hover:bg-black hover:border-black shadow-xl shadow-primary/20 disabled:scale-100 disabled:opacity-50 disabled:shadow-none'
                            }`}
                          >
                            {testStatus === 'testing' ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                             testStatus === 'success' ? <ShieldCheck className="w-4 h-4" /> :
                             testStatus === 'error' ? <X className="w-4 h-4" /> : 
                             <Zap className="w-4 h-4" />}
                            {testStatus === 'testing' ? (language === 'zh' ? '测试中' : 'Testing') : 
                             testStatus === 'success' ? (language === 'zh' ? '连接成功' : 'Connected') :
                             testStatus === 'error' ? (language === 'zh' ? '连接失败' : 'Failed') : 
                             (language === 'zh' ? '连接模型' : 'Connect')}
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {testStatus === 'error' && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`p-4 text-[10px] font-bold rounded-2xl flex items-start gap-2 ${
                            isDarkTheme
                              ? 'bg-red-950/45 border border-red-900/70 text-red-200'
                              : 'bg-red-50 border border-red-100 text-red-500'
                          }`}
                        >
                           <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                           <span className="leading-relaxed">{testError}</span>
                        </motion.div>
                    )}

                    {testStatus === 'success' && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`p-4 text-[10px] font-bold rounded-2xl flex items-center gap-2 ${
                            isDarkTheme
                              ? 'bg-green-950/45 border border-green-900/70 text-green-200'
                              : 'bg-green-50 border border-green-100 text-green-600'
                          }`}
                        >
                           <CheckCircle2 className="w-4 h-4 shrink-0" />
                           <span>{language === 'zh' ? '配置验证通过，已准备好开始编排。' : 'Configuration verified and ready for orchestration.'}</span>
                        </motion.div>
                    )}
                    
                    <div className={`p-5 rounded-[1.5rem] flex gap-4 ${
                      isDarkTheme
                        ? 'bg-amber-950/35 border border-amber-900/55'
                        : 'bg-amber-50/50 border border-amber-100/50'
                    }`}>
                      <ShieldCheck className={`w-5 h-5 shrink-0 mt-0.5 ${isDarkTheme ? 'text-amber-300' : 'text-amber-500'}`} />
                      <p className={`text-[10px] font-medium leading-relaxed ${isDarkTheme ? 'text-amber-100/90' : 'text-amber-700'}`}>
                        {language === 'zh' 
                          ? '您的 API Key 将加密存储在浏览器的本地存储中，不会上传到任何第三方服务器。支持自定义 Base URL。' 
                          : 'Your API Key is stored locally in your browser. Supports custom Base URL.'}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            {activeTab === 'nodeTools' && (
              <motion.div key="node-tools" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-8">
                {/* Header */}
                <div className="flex items-end justify-between">
                  <div>
                    <h3 className="text-xl font-extrabold text-neutral-900 mb-2">{language === 'zh' ? '工具插件' : 'Tool Plugins'}</h3>
                    <p className="text-sm text-neutral-400 font-medium">
                      {language === 'zh'
                        ? '为节点安装增强工具，打造专属工作流。'
                        : 'Install powerful tools for your nodes. Build your perfect workflow.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                      {Object.values(settings.nodeTools.enabledTools).filter(Boolean).length}/{Object.keys(settings.nodeTools.enabledTools).length} {language === 'zh' ? '已启用' : 'Active'}
                    </span>
                  </div>
                </div>

                {/* Built-in Plugins Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Sparkles className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{language === 'zh' ? '内置插件' : 'Built-in Plugins'}</span>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      {
                        key: 'table',
                        label: language === 'zh' ? '表格登记' : 'Table',
                        desc: language === 'zh' ? '数据记录、预算追踪、实验日志' : 'Data logging, budgets, metrics',
                        icon: <Table2 className="w-5 h-5" />,
                        color: 'bg-emerald-500',
                      },
                      {
                        key: 'document',
                        label: language === 'zh' ? '节点文档' : 'Document',
                        desc: language === 'zh' ? '笔记、草稿、SOP 说明' : 'Notes, drafts, SOPs',
                        icon: <FileText className="w-5 h-5" />,
                        color: 'bg-blue-500',
                      },
                      {
                        key: 'link',
                        label: language === 'zh' ? '链接资料' : 'Links',
                        desc: language === 'zh' ? '参考链接、资源入口、资料跳转' : 'References, resources, quick access',
                        icon: <Link2 className="w-5 h-5" />,
                        color: 'bg-violet-500',
                      },
                      {
                        key: 'schedule',
                        label: language === 'zh' ? '时间日期' : 'Schedule',
                        desc: language === 'zh' ? '日程规划、截止提醒' : 'Scheduling, deadlines',
                        icon: <CalendarDays className="w-5 h-5" />,
                        color: 'bg-amber-500',
                      },
                      {
                        key: 'image',
                        label: language === 'zh' ? '图片素材' : 'Images',
                        desc: language === 'zh' ? '截图、草图、参考图与视觉素材' : 'Screenshots, references, and visual assets',
                        icon: <ImageIcon className="w-5 h-5" />,
                        color: 'bg-rose-500',
                      },
                    ].map((plugin) => (
                      <div
                        key={plugin.key}
                        className={`rounded-2xl border p-5 transition-all flex flex-col ${
                          settings.nodeTools.enabledTools[plugin.key as keyof typeof settings.nodeTools.enabledTools]
                            ? 'bg-white border-primary/20 shadow-lg shadow-primary/5'
                            : 'bg-neutral-50/50 border-neutral-100'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          {/* Icon */}
                          <div className={`w-12 h-12 rounded-2xl ${plugin.color} flex items-center justify-center text-white shadow-lg shadow-black/10`}>
                            {plugin.icon}
                          </div>
                          
                          {/* Toggle */}
                          <button
                            type="button"
                            onClick={() => onUpdate({
                              ...settings,
                              nodeTools: {
                                ...settings.nodeTools,
                                enabledTools: {
                                  ...settings.nodeTools.enabledTools,
                                  [plugin.key]: !settings.nodeTools.enabledTools[plugin.key as keyof typeof settings.nodeTools.enabledTools],
                                },
                              },
                            })}
                            className={`w-12 h-7 rounded-full transition-all relative flex-shrink-0 ${
                              settings.nodeTools.enabledTools[plugin.key as keyof typeof settings.nodeTools.enabledTools]
                                ? 'bg-primary'
                                : 'bg-neutral-200'
                            }`}
                          >
                            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition-all ${
                              settings.nodeTools.enabledTools[plugin.key as keyof typeof settings.nodeTools.enabledTools]
                                ? 'left-6'
                                : 'left-1'
                            }`} />
                          </button>
                        </div>

                        {/* Info */}
                        <div className="flex-1">
                          <h4 className={`text-sm font-black mb-1 ${settings.nodeTools.enabledTools[plugin.key as keyof typeof settings.nodeTools.enabledTools] ? 'text-neutral-900' : 'text-neutral-400'}`}>
                            {plugin.label}
                          </h4>
                          <p className="text-[11px] text-neutral-400 leading-relaxed">{plugin.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Community Plugins Section (Coming Soon) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-lg bg-neutral-100 flex items-center justify-center">
                        <Package className="w-3 h-3 text-neutral-400" />
                      </div>
                      <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{language === 'zh' ? '社区插件' : 'Community Plugins'}</span>
                      <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-[9px] font-black text-neutral-400 uppercase tracking-wider">
                        {language === 'zh' ? '即将推出' : 'Coming Soon'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {/* Placeholder Cards */}
                    {[
                      { label: language === 'zh' ? '思维导图' : 'Mind Map', icon: <Sparkles className="w-5 h-5" />, color: 'bg-violet-500' },
                      { label: language === 'zh' ? '代码运行' : 'Code Runner', icon: <Activity className="w-5 h-5" />, color: 'bg-cyan-500' },
                      { label: language === 'zh' ? '文件管理' : 'File Manager', icon: <FileText className="w-5 h-5" />, color: 'bg-rose-500' },
                    ].map((placeholder, idx) => (
                      <div
                        key={idx}
                        className="relative rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/30 p-5 opacity-60"
                      >
                        {/* Lock Icon */}
                        <div className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center">
                          <Lock className="w-4 h-4 text-neutral-300" />
                        </div>

                        {/* Icon */}
                        <div className={`w-12 h-12 rounded-2xl ${placeholder.color} flex items-center justify-center text-white mb-4 opacity-50`}>
                          {placeholder.icon}
                        </div>

                        {/* Info */}
                        <h4 className="text-sm font-black text-neutral-400 mb-1">{placeholder.label}</h4>
                        <p className="text-[11px] text-neutral-300 leading-relaxed">
                          {language === 'zh' ? '即将支持' : 'Coming Soon'}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Browse Store Button */}
                  <button
                    type="button"
                    className="w-full py-4 rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50/50 hover:bg-white hover:border-primary/30 transition-all flex items-center justify-center gap-3 group"
                  >
                    <Download className="w-4 h-4 text-neutral-400 group-hover:text-primary transition-colors" />
                    <span className="text-sm font-bold text-neutral-400 group-hover:text-neutral-600 transition-colors">
                      {language === 'zh' ? '浏览插件商店' : 'Browse Plugin Store'}
                    </span>
                    <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </button>
                </div>

                {/* Settings Row */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-lg bg-neutral-100 flex items-center justify-center">
                      <SettingsIcon className="w-3 h-3 text-neutral-400" />
                    </div>
                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{language === 'zh' ? '工具栏设置' : 'Sidebar Settings'}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Sidebar Toggle */}
                    <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-100 space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="text-sm font-black text-neutral-900">{language === 'zh' ? '启用工具栏' : 'Enable Sidebar'}</h4>
                          <p className="text-[11px] text-neutral-400 mt-1">
                            {language === 'zh' ? '显示右侧节点工具面板' : 'Show the right node tool panel'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onUpdate({
                            ...settings,
                            nodeTools: { ...settings.nodeTools, enabled: !settings.nodeTools.enabled },
                          })}
                          className={`w-14 h-8 rounded-full transition-all relative ${settings.nodeTools.enabled ? 'bg-primary' : 'bg-neutral-200'}`}
                        >
                          <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-md transition-all ${settings.nodeTools.enabled ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>
                    </div>

                    {/* Width Preset */}
                    <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-100 space-y-3">
                      <h4 className="text-sm font-black text-neutral-900">{language === 'zh' ? '工具栏宽度' : 'Sidebar Width'}</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { width: 420, label: language === 'zh' ? '紧凑' : 'Compact' },
                          { width: 680, label: language === 'zh' ? '宽幅' : 'Wide' },
                        ].map((preset) => (
                          <button
                            key={preset.width}
                            type="button"
                            onClick={() => onUpdate({
                              ...settings,
                              nodeTools: { ...settings.nodeTools, panelWidth: preset.width },
                            })}
                            className={`rounded-xl border px-3 py-2 text-left transition-all ${
                              settings.nodeTools.panelWidth === preset.width
                                ? 'bg-primary text-white border-primary shadow-sm'
                                : 'bg-white border-neutral-200 text-neutral-500 hover:border-primary/20'
                            }`}
                          >
                            <div className="text-xs font-black">{preset.label}</div>
                            <div className={`text-[10px] font-bold ${settings.nodeTools.panelWidth === preset.width ? 'text-white/70' : 'text-neutral-300'}`}>{preset.width}px</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Calendar Settings */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-lg bg-amber-100 flex items-center justify-center">
                      <CalendarDays className="w-3 h-3 text-amber-600" />
                    </div>
                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{language === 'zh' ? '日历设置' : 'Calendar Settings'}</span>
                  </div>

                  <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-100 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-black text-neutral-900">{language === 'zh' ? '侧边栏日历' : 'Sidebar Calendar'}</h4>
                        <p className="text-[11px] text-neutral-400 mt-1">
                          {language === 'zh' ? '汇总所有带时间的节点' : 'Aggregate all scheduled nodes'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onUpdate({
                          ...settings,
                          nodeTools: {
                            ...settings.nodeTools,
                            calendar: { ...settings.nodeTools.calendar, enabled: !settings.nodeTools.calendar.enabled },
                          },
                        })}
                        className={`w-14 h-8 rounded-full transition-all relative ${settings.nodeTools.calendar.enabled ? 'bg-primary' : 'bg-neutral-200'}`}
                      >
                        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-md transition-all ${settings.nodeTools.calendar.enabled ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {[ 
                        { id: 'month', label: language === 'zh' ? '月历' : 'Month', desc: language === 'zh' ? '适合看整体排期' : 'Broad planning' },
                        { id: 'agenda', label: language === 'zh' ? '日程列表' : 'Agenda', desc: language === 'zh' ? '适合看近期待办' : 'Upcoming work' },
                      ].map((view) => (
                        <button
                          key={view.id}
                          type="button"
                          onClick={() => onUpdate({
                            ...settings,
                            nodeTools: {
                              ...settings.nodeTools,
                              calendar: { ...settings.nodeTools.calendar, defaultView: view.id as typeof settings.nodeTools.calendar.defaultView },
                            },
                          })}
                          className={`rounded-xl border px-4 py-3 text-left transition-all ${
                            settings.nodeTools.calendar.defaultView === view.id
                              ? isDarkTheme
                                ? 'bg-slate-900/90 border-primary/30 shadow-[0_16px_36px_-26px_rgba(37,99,235,0.55)]'
                                : 'bg-white border-primary/20 shadow-sm'
                              : isDarkTheme
                                ? 'bg-slate-900/40 border-slate-700/80 hover:border-slate-600'
                                : 'bg-white/60 border-neutral-200'
                          }`}
                        >
                          <div className="text-xs font-bold text-neutral-800">{view.label}</div>
                          <div className="text-[11px] text-neutral-400 mt-0.5">{view.desc}</div>
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => onUpdate({
                        ...settings,
                        nodeTools: {
                          ...settings.nodeTools,
                          calendar: { ...settings.nodeTools.calendar, showTodayPanel: !settings.nodeTools.calendar.showTodayPanel },
                        },
                      })}
                      className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
                        settings.nodeTools.calendar.showTodayPanel
                          ? isDarkTheme
                            ? 'bg-slate-900/90 border-primary/30 shadow-[0_16px_36px_-26px_rgba(37,99,235,0.55)]'
                            : 'bg-white border-primary/20 shadow-sm'
                          : isDarkTheme
                            ? 'bg-slate-900/40 border-slate-700/80 hover:border-slate-600'
                            : 'bg-white/60 border-neutral-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-xs font-bold text-neutral-800">{language === 'zh' ? '显示今日聚焦' : 'Show Today Focus'}</div>
                          <div className="text-[11px] text-neutral-400 mt-0.5">{language === 'zh' ? '在日历页顶部显示今天的节点' : "Highlight today's nodes at top"}</div>
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${settings.nodeTools.calendar.showTodayPanel ? 'text-primary' : 'text-neutral-300'}`}>
                          {settings.nodeTools.calendar.showTodayPanel ? (language === 'zh' ? '开启' : 'On') : (language === 'zh' ? '关闭' : 'Off')}
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'appearance' && (
              <motion.div key="appearance" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-8 h-full flex flex-col">
                <div className="grid grid-cols-2 gap-8 flex-1">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-extrabold text-neutral-900 mb-2">{language === 'zh' ? '视效定制' : 'Visual Customization'}</h3>
                      <p className="text-sm text-neutral-400 font-medium">{language === 'zh' ? '调配您的专属编排色调，并在右侧实时预览效果。' : 'Adjust your theme colors and see live changes in the preview.'}</p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-3">
                          {language === 'zh' ? '界面模式' : 'Interface Mode'}
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            {
                              id: 'light' as const,
                              label: language === 'zh' ? '亮色' : 'Light',
                              hint: language === 'zh' ? '通透画布' : 'Crisp canvas',
                              icon: <Sun className="w-4 h-4" />,
                            },
                            {
                              id: 'dark' as const,
                              label: language === 'zh' ? '黑夜' : 'Dark',
                              hint: language === 'zh' ? '沉浸夜间' : 'Night focus',
                              icon: <Moon className="w-4 h-4" />,
                            },
                          ].map((themeOption) => (
                            <button
                              key={themeOption.id}
                              onClick={() => onUpdate({ ...settings, themeMode: themeOption.id })}
                              className={`p-3 rounded-2xl border text-left transition-all ${
                                settings.themeMode === themeOption.id
                                  ? 'bg-white text-primary shadow-sm ring-1 ring-primary/15 border-primary/20'
                                  : 'bg-neutral-50 border-neutral-100 text-neutral-500 hover:border-neutral-200'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                                  settings.themeMode === themeOption.id ? 'bg-primary/10' : 'bg-neutral-100'
                                }`}>
                                  {themeOption.icon}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-black">{themeOption.label}</div>
                                  <div className="text-[10px] font-bold uppercase tracking-wider opacity-70">{themeOption.hint}</div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-3">{language === 'zh' ? '视觉主题与预设' : 'Visual Themes & Presets'}</h4>
                        <div className="grid grid-cols-5 gap-2">
                          {APPEARANCE_PRESETS.map(p => (
                             <button
                               key={p.id}
                               onClick={() => onUpdate({ ...settings, visuals: p.visuals })}
                               className="p-1.5 h-12 rounded-xl border border-neutral-100 bg-white hover:border-primary/30 transition-all flex flex-col items-center justify-center gap-1 group"
                               title={p.name}
                             >
                                <div className="flex gap-0.5">
                                  <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: p.visuals.nodeHighlightColor }} />
                                  <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: p.visuals.edgeSelectedColor }} />
                                </div>
                                <span className="text-[9px] font-bold text-neutral-500 group-hover:text-primary truncate w-full text-center">{p.name}</span>
                             </button>
                          ))}
                          
                          {[0, 1].map(idx => {
                            const preset = settings.customVisualPresets[idx];
                            return (
                              <button
                                key={`slot-${idx}`}
                                onClick={() => {
                                  if (preset) {
                                    onUpdate({ ...settings, visuals: preset });
                                  } else {
                                    const newPresets = [...settings.customVisualPresets];
                                    newPresets[idx] = settings.visuals;
                                    onUpdate({ ...settings, customVisualPresets: newPresets });
                                  }
                                }}
                                className={`p-1.5 h-12 rounded-xl border transition-all flex flex-col items-center justify-center gap-1 group relative ${preset ? 'border-neutral-100 bg-white hover:border-primary/30' : 'border-dashed border-neutral-200 bg-neutral-50/50 hover:bg-neutral-50 hover:border-neutral-300'}`}
                              >
                                {preset ? (
                                  <>
                                    <div className="flex gap-0.5">
                                      <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: preset.nodeHighlightColor }} />
                                      <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: preset.edgeSelectedColor }} />
                                    </div>
                                    <span className="text-[9px] font-bold text-neutral-500 group-hover:text-primary">{language === 'zh' ? `槽位 ${idx + 1}` : `Slot ${idx + 1}`}</span>
                                    <div className="absolute -top-1 -right-1 flex gap-1 items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                      <div 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const newPresets = [...settings.customVisualPresets];
                                          newPresets[idx] = settings.visuals;
                                          onUpdate({ ...settings, customVisualPresets: newPresets });
                                          setFeedback(`${language === 'zh' ? `外观：槽位 ${idx + 1} 已覆盖` : `Visual: Slot ${idx + 1} Overwritten`}`);
                                        }}
                                        className="w-4 h-4 bg-white border border-neutral-100 rounded-full flex items-center justify-center shadow-sm"
                                        title={language === 'zh' ? '覆盖当前' : 'Overwrite'}
                                      >
                                        <Save className="w-2 h-2 text-neutral-400" />
                                      </div>
                                      <div 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const newPresets = [...settings.customVisualPresets];
                                          newPresets[idx] = null;
                                          onUpdate({ ...settings, customVisualPresets: newPresets });
                                          setFeedback(`${language === 'zh' ? `外观：槽位 ${idx + 1} 已清除` : `Visual: Slot ${idx + 1} Cleared`}`);
                                        }}
                                        className="w-4 h-4 bg-white border border-neutral-100 rounded-full flex items-center justify-center shadow-sm hover:text-red-500"
                                        title={language === 'zh' ? '删除' : 'Delete'}
                                      >
                                        <X className="w-2.5 h-2.5" />
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-4 h-4 text-neutral-300 group-hover:text-neutral-400" />
                                    <span className="text-[9px] font-bold text-neutral-300 group-hover:text-neutral-400">{language === 'zh' ? '存当前' : 'Save'}</span>
                                  </>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="h-px bg-neutral-100 my-1" />

                      <div className="grid grid-cols-2 gap-3">
                        {visualSettingItems.map(item => {
                          const pickerId = `visual:${item.key}`;
                          const currentColor = settings.visuals[item.key];
                          const isCustomColor = !VISUAL_COLOR_OPTIONS.includes(currentColor as typeof VISUAL_COLOR_OPTIONS[number]);

                          return (
                          <div key={item.key} className="relative flex flex-col gap-2 p-3 bg-neutral-50 rounded-2xl border border-neutral-100">
                            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none">{item.label}</span>
                            <div data-color-picker-root="true" className="relative">
                              <button
                                type="button"
                                onClick={() => setActiveColorPickerId(activeColorPickerId === pickerId ? null : pickerId)}
                                className="w-full flex items-center justify-between gap-2 bg-white p-1.5 rounded-xl border border-neutral-100 shadow-sm hover:border-primary/20 transition-all"
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className="w-5 h-5 rounded-full ring-1 ring-black/5 shadow-sm shrink-0"
                                    style={{ backgroundColor: currentColor }}
                                  />
                                  <span className="text-[10px] font-mono text-neutral-400 font-bold">{currentColor}</span>
                                </div>
                                <ChevronRight className={`w-3.5 h-3.5 text-neutral-300 transition-transform ${activeColorPickerId === pickerId ? 'rotate-90 text-neutral-500' : ''}`} />
                              </button>

                              <AnimatePresence>
                                {activeColorPickerId === pickerId && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 5, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 5, scale: 0.96 }}
                                    onClick={(e) => {
                                      if (e.target === e.currentTarget) {
                                        setActiveColorPickerId(null);
                                      }
                                    }}
                                    className="absolute left-0 top-full mt-2 z-50 min-w-[152px] bg-white p-2.5 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border border-neutral-100"
                                  >
                                    <div
                                      className="grid grid-cols-5 gap-2"
                                      onClick={(e) => {
                                        if (e.target === e.currentTarget) {
                                          setActiveColorPickerId(null);
                                        }
                                      }}
                                    >
                                      {VISUAL_COLOR_OPTIONS.map(color => (
                                        <button
                                          key={color}
                                          type="button"
                                          onClick={() => {
                                            onUpdate({ ...settings, visuals: { ...settings.visuals, [item.key]: color } });
                                            setActiveColorPickerId(null);
                                          }}
                                          className={`relative w-5 h-5 rounded-full border border-white shadow-sm ring-1 ring-neutral-200/50 hover:scale-110 transition-transform ${currentColor === color ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                                          style={{ backgroundColor: color }}
                                          title={color}
                                        >
                                          {currentColor === color && (
                                            <Check className="absolute inset-0 m-auto w-3 h-3 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]" />
                                          )}
                                        </button>
                                      ))}

                                      <label
                                        className={`relative flex items-center justify-center w-5 h-5 rounded-full border border-white shadow-sm ring-1 ring-neutral-200/50 hover:scale-110 transition-transform cursor-pointer overflow-hidden ${isCustomColor ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                                        title={language === 'zh' ? '自定义颜色' : 'Custom color'}
                                      >
                                        <span
                                          className="absolute inset-0 rounded-full"
                                          style={{
                                            background: isCustomColor
                                              ? currentColor
                                              : 'conic-gradient(from 180deg, #ef4444, #f59e0b, #10b981, #06b6d4, #6366f1, #ec4899, #ef4444)',
                                          }}
                                        />
                                        <span className="absolute inset-[4px] rounded-full bg-white/88 backdrop-blur-[1px]" />
                                        <Edit3 className="relative w-2.5 h-2.5 text-neutral-600" />
                                        <input
                                          type="color"
                                          value={currentColor}
                                          onChange={(e) => {
                                            onUpdate({ ...settings, visuals: { ...settings.visuals, [item.key]: e.target.value } });
                                            setActiveColorPickerId(null);
                                          }}
                                          className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                      </label>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest text-center">{language === 'zh' ? '实时效果预览' : 'Live Preview'}</span>
                    <div className={`flex-1 rounded-[2.5rem] border relative overflow-hidden flex items-center justify-center p-8 [background-size:16px_16px] ${
                      isDarkTheme
                        ? 'bg-[#0f1829] border-[#24344f] bg-[radial-gradient(#24344f_1px,transparent_1px)]'
                        : 'bg-neutral-50 border-neutral-100 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)]'
                    }`}>
                      <div className="relative w-full h-full">
                         <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.03))' }}>
                            <path 
                              d="M 116 116 C 160 116, 200 244, 244 244" 
                              stroke={settings.visuals.edgeSelectedColor} 
                              strokeWidth="3" 
                              fill="none" 
                              strokeDasharray="6 4"
                              className="animate-pulse"
                            />
                            <circle cx="238" cy="244" r="3" fill={settings.visuals.edgeSelectedColor} />
                         </svg>
                         <div 
                           className={`absolute left-8 top-12 w-24 h-24 rounded-2xl shadow-xl border-2 relative flex flex-col items-center justify-center gap-2 ${
                             isDarkTheme ? 'bg-[#162338]' : 'bg-white'
                           }`}
                           style={{ borderColor: settings.visuals.nodeHighlightColor }}
                         >
                            <div className={`w-8 h-1.5 rounded-full ${isDarkTheme ? 'bg-[#22324c]' : 'bg-neutral-100'}`} />
                            <div className="space-y-1">
                              <div className={`w-12 h-1 rounded-full ${isDarkTheme ? 'bg-[#1b2a42]' : 'bg-neutral-50'}`} />
                              <div className={`w-8 h-1 rounded-full ${isDarkTheme ? 'bg-[#1b2a42]' : 'bg-neutral-50'}`} />
                            </div>
                            <div 
                              className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 w-3 h-3 rounded-full border-2 border-white shadow-sm" 
                              style={{ backgroundColor: settings.visuals.handleColor }}
                            />
                          </div>
                          <div 
                            className={`absolute right-8 bottom-12 w-24 h-24 rounded-2xl shadow-md border relative flex flex-col items-center justify-center gap-2 ${
                              isDarkTheme ? 'bg-[#162338] border-[#24344f]' : 'bg-white border-neutral-100'
                            }`}
                          >
                            <div className={`w-8 h-1.5 rounded-full ${isDarkTheme ? 'bg-[#22324c]' : 'bg-neutral-100'}`} />
                            <div className="space-y-1">
                              <div className={`w-12 h-1 rounded-full ${isDarkTheme ? 'bg-[#1b2a42]' : 'bg-neutral-50'}`} />
                              <div className={`w-8 h-1 rounded-full ${isDarkTheme ? 'bg-[#1b2a42]' : 'bg-neutral-50'}`} />
                            </div>
                            <div 
                              className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-white shadow-sm" 
                              style={{ backgroundColor: settings.visuals.handleColor }}
                            />
                         </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'about' && (
              <motion.div key="about" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-10">
                <div className="flex flex-col items-center py-6 text-center">
                  <div className={`w-20 h-20 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-[2rem] flex items-center justify-center text-white mb-6 ${
                    isDarkTheme ? 'shadow-[0_24px_60px_-28px_rgba(79,70,229,0.9)]' : 'shadow-2xl shadow-indigo-200'
                  }`}>
                    <Rocket className="w-10 h-10" />
                  </div>
                  <h3 className={`text-2xl font-black mb-1 ${isDarkTheme ? 'text-slate-50' : 'text-neutral-900'}`}>YesFlow</h3>
                  <p className={`text-xs font-bold uppercase tracking-[0.2em] mb-4 ${isDarkTheme ? 'text-slate-300' : 'text-neutral-500'}`}>One Yes, All Flow</p>
                  <p className={`max-w-xl text-sm leading-7 mb-6 ${isDarkTheme ? 'text-slate-300' : 'text-neutral-500'}`}>
                    {language === 'zh'
                      ? 'YesFlow 0.3.2 重点强化了图片资料管理、项目导入完整性与本地记录可靠性，让复杂目标在同一张画布上推进时更稳、更快、更可控。'
                      : 'YesFlow 0.3.2 improves image management, import integrity checks, and local record reliability so complex goals can move forward more smoothly on one canvas.'}
                  </p>
                  
                  <div className="flex flex-col items-center gap-3">
                    <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border ${
                      isDarkTheme ? 'bg-slate-900/70 border-slate-700/80' : 'bg-neutral-100 border-transparent'
                    }`}>
                       <Hash className={`w-3 h-3 ${isDarkTheme ? 'text-slate-400' : 'text-neutral-400'}`} />
                       <span className={`text-[10px] font-black uppercase tracking-widest leading-none ${isDarkTheme ? 'text-slate-300' : 'text-neutral-500'}`}>VERSION {settings.version}</span>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                      <div className={`flex items-center gap-1.5 text-[10px] font-bold ${isDarkTheme ? 'text-slate-300' : 'text-neutral-500'}`}>
                        <span>{language === 'zh' ? '作者：' : 'Author: '}</span>
                        <span className="text-primary font-black uppercase tracking-widest">heeq</span>
                      </div>
                      <a href="mailto:myheeq@foxmail.com" className={`flex items-center gap-1.5 text-[9px] font-bold hover:text-primary transition-colors ${
                        isDarkTheme ? 'text-slate-400' : 'text-neutral-400'
                      }`}>
                        <Mail className="w-3 h-3" />
                        <span>myheeq@foxmail.com</span>
                      </a>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                   <div className={`flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] mb-4 ${
                     isDarkTheme ? 'text-slate-400' : 'text-neutral-400'
                   }`}>
                     <Sparkles className="w-3.5 h-3.5" />
                     {language === 'zh' ? '项目功能介绍' : 'Project Features'}
                   </div>
                   <div className="space-y-3">
                     {settings.updateNotes.map((note, i) => (
                       <div key={i} className={`flex gap-4 p-4 rounded-2xl border font-medium text-sm leading-relaxed capitalize ${
                         isDarkTheme
                           ? 'bg-slate-900/55 border-slate-700/80 text-slate-200 shadow-[0_18px_44px_-32px_rgba(15,23,42,0.95)]'
                           : 'bg-neutral-50/50 border-neutral-100 text-neutral-600'
                       }`}>
                         <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                         {note}
                       </div>
                     ))}
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CustomScrollArea>
      </motion.div>
    </motion.div>
  );
}
