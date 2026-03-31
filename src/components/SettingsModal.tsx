import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronRight,
  Globe,
  Hash,
  Info,
  Keyboard,
  Laptop,
  Loader2,
  Minus,
  Plus,
  PlusCircle,
  Rocket,
  Save,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';

import { validateApiKey } from '../services/aiService';
import { APPEARANCE_PRESETS } from '../constants/appearancePresets';
import type { HotkeyConfig, Settings } from '../types';

type SettingsModalProps = {
  settings: Settings;
  language: 'zh' | 'en';
  onClose: () => void;
  onUpdate: (settings: Settings) => void;
};

export default function SettingsModal({ settings, language, onClose, onUpdate }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'hotkeys' | 'custom' | 'api' | 'appearance' | 'about'>('hotkeys');
  const [recordingKey, setRecordingKey] = useState<keyof HotkeyConfig | null>(null);
  const [recordingKeys, setRecordingKeys] = useState<string[]>([]);
  const [isLmbRecording, setIsLmbRecording] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState('');
  const [activeColorPickerId, setActiveColorPickerId] = useState<string | null>(null);

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
        // 用 ref 读取最新 settings，避免 stale closure 问题
        const currentSettings = settingsRef.current;
        onUpdate({ ...currentSettings, hotkeys: { ...currentSettings.hotkeys, [recordingKey]: hotkeyStr } });
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
    if (!settings.apiKey) return;
    setTestStatus('testing');
    setTestError('');
    try {
      await validateApiKey(settings.apiKey);
      setTestStatus('success');
    } catch (err: any) {
      setTestStatus('error');
      setTestError(err.message || (language === 'zh' ? '连接失败' : 'Connection failed'));
    }
  };

  const tabs = [
    { id: 'hotkeys', label: language === 'zh' ? '热键设置' : 'Hotkeys', icon: <Keyboard className="w-4 h-4" /> },
    { id: 'custom', label: language === 'zh' ? '自定义类型' : 'Customization', icon: <PlusCircle className="w-4 h-4" /> },
    { id: 'api', label: language === 'zh' ? '模型配置' : 'AI Services', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'appearance', label: language === 'zh' ? '外观设置' : 'Appearance', icon: <Laptop className="w-4 h-4" /> },
    { id: 'about', label: language === 'zh' ? '关于系统' : 'About', icon: <Info className="w-4 h-4" /> },
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
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg">
              <SettingsIcon className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-extrabold text-neutral-900 tracking-tight">{language === 'zh' ? '系统设置' : 'Settings'}</h2>
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
          <div className="mt-auto pt-8">
            <button onClick={onClose} className="w-full py-3 bg-neutral-900 text-white rounded-2xl text-xs font-bold hover:bg-black transition-all">
              {language === 'zh' ? '完成设置' : 'Done'}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
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
                      select: { zh: '多选模式', en: 'Multi-select' }
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
                     {/* Node Presets Section */}
                     <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{language === 'zh' ? '节点类型预设' : 'Node Presets'}</span>
                          <button 
                            onClick={() => {
                                const newId = `custom-${Date.now()}`;
                                onUpdate({ ...settings, nodePresets: [...settings.nodePresets, { id: newId, label: language === 'zh' ? '新类型' : 'New Type', color: 'violet', type: newId }] });
                            }}
                            className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {settings.nodePresets.map((preset, idx) => (
                            <div 
                              key={preset.id} 
                              className={`relative px-3 py-1.5 rounded-xl border transition-all flex items-center justify-between group h-9 ${
                                preset.color === 'sky' ? 'bg-sky-50/40 border-sky-200 hover:border-sky-300 text-sky-700' : 
                                preset.color === 'green' ? 'bg-green-50/40 border-green-200 hover:border-green-300 text-green-700' : 
                                preset.color === 'amber' ? 'bg-amber-50/40 border-amber-200 hover:border-amber-300 text-amber-700' : 
                                preset.color === 'indigo' ? 'bg-indigo-50/40 border-indigo-200 hover:border-indigo-300 text-indigo-700' : 
                                preset.color === 'rose' ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300 text-rose-700' : 
                                preset.color === 'teal' ? 'bg-teal-50/40 border-teal-200 hover:border-teal-300 text-teal-700' : 
                                preset.color === 'fuchsia' ? 'bg-fuchsia-50/40 border-fuchsia-200 hover:border-fuchsia-300 text-fuchsia-700' : 
                                preset.color === 'orange' ? 'bg-orange-50/40 border-orange-200 hover:border-orange-300 text-orange-700' : 
                                preset.color === 'cyan' ? 'bg-cyan-50/40 border-cyan-200 hover:border-cyan-300 text-cyan-700' : 
                                'bg-violet-50/40 border-violet-200 hover:border-violet-300 text-violet-700'
                              }`}
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
                                    onClick={() => setActiveColorPickerId(activeColorPickerId === preset.id ? null : preset.id)}
                                    className={`w-2.5 h-2.5 rounded-full shadow-sm ring-1 ring-black/5 hover:scale-125 transition-all ${
                                      preset.color === 'sky' ? 'bg-sky-400' : 
                                      preset.color === 'green' ? 'bg-green-400' : 
                                      preset.color === 'amber' ? 'bg-amber-400' : 
                                      preset.color === 'indigo' ? 'bg-indigo-400' : 
                                      preset.color === 'rose' ? 'bg-rose-400' : 
                                      preset.color === 'teal' ? 'bg-teal-400' : 
                                      preset.color === 'fuchsia' ? 'bg-fuchsia-400' : 
                                      preset.color === 'orange' ? 'bg-orange-400' : 
                                      preset.color === 'cyan' ? 'bg-cyan-400' : 
                                      'bg-violet-400'
                                    }`}
                                  />

                                  <button 
                                    onClick={() => onUpdate({ ...settings, nodePresets: settings.nodePresets.filter(p => p.id !== preset.id) })}
                                    className="w-4 h-4 flex items-center justify-center text-neutral-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                              </div>

                              <AnimatePresence>
                                {activeColorPickerId === preset.id && (
                                  <motion.div 
                                    initial={{ opacity: 0, y: 5, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 5, scale: 0.9 }}
                                    className="absolute left-0 top-full mt-2 z-50 bg-white p-2 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border border-neutral-100 grid grid-cols-5 gap-1.5"
                                  >
                                     {['sky', 'green', 'amber', 'indigo', 'rose', 'violet', 'teal', 'fuchsia', 'orange', 'cyan'].map(c => (
                                        <button 
                                            key={c} 
                                            onClick={() => {
                                                const next = [...settings.nodePresets];
                                                next[idx] = { ...next[idx], color: c as any };
                                                onUpdate({ ...settings, nodePresets: next });
                                                setActiveColorPickerId(null);
                                            }}
                                            className={`w-4 h-4 rounded-full bg-${c}-400 ring-1 ring-black/5 hover:scale-125 transition-all ${preset.color === c ? 'ring-2 ring-primary ring-offset-1' : ''}`} 
                                        />
                                     ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ))}
                        </div>
                     </div>

                     {/* Categories Section */}
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
                    <p className="text-sm text-neutral-400 font-medium mb-4">{language === 'zh' ? '当任务标记为“完成”时节点的视觉表现。' : 'Visual appearance of nodes when marked as "Completed".'}</p>
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
                  <p className="text-sm text-neutral-400 font-medium">{language === 'zh' ? '在此配置您的 AI 服务凭据。手动配置的 Key 将优先于系统环境变量。' : 'Configure your AI credentials here. Manually entered keys override environment variables.'}</p>
                </div>
                
                <div className="space-y-6">
                  <div className="p-6 rounded-[2rem] bg-neutral-50 border border-neutral-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-primary" />
                        <span className="text-xs font-bold text-neutral-700">{language === 'zh' ? 'MiniMax API Key' : 'MiniMax API Key'}</span>
                      </div>
                      <a href="https://platform.minimaxi.com/" target="_blank" rel="noreferrer" className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1">
                        {language === 'zh' ? '获取 Key' : 'Get Key'} <ChevronRight className="w-3 h-3" />
                      </a>
                    </div>
                    
                    <div className="flex gap-2">
                        <div className="relative group flex-1">
                          <input 
                            type={showApiKey ? "text" : "password"}
                            className="w-full bg-white border border-neutral-200 rounded-2xl px-5 py-3.5 text-xs font-mono focus:ring-2 ring-primary/20 outline-none transition-all pr-12"
                            placeholder="sk-..."
                            value={settings.apiKey || ''}
                            onChange={e => {
                              onUpdate({ ...settings, apiKey: e.target.value });
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
                          disabled={!settings.apiKey || testStatus === 'testing'}
                          className={`px-6 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 border-2 ${
                            testStatus === 'success' ? 'bg-green-50 border-green-200 text-green-600 shadow-lg shadow-green-100/50' :
                            testStatus === 'error' ? 'bg-red-50 border-red-200 text-red-600 shadow-lg shadow-red-100/50' :
                            'bg-primary text-white border-primary hover:bg-primary/90 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:shadow-none'
                          }`}
                        >
                          {testStatus === 'testing' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 
                           testStatus === 'success' ? <ShieldCheck className="w-3.5 h-3.5" /> :
                           testStatus === 'error' ? <X className="w-3.5 h-3.5" /> : 
                           <Zap className="w-3.5 h-3.5" />}
                          {testStatus === 'testing' ? (language === 'zh' ? '正在测试...' : 'Testing...') : 
                           testStatus === 'success' ? (language === 'zh' ? '连接成功' : 'Connected') :
                           testStatus === 'error' ? (language === 'zh' ? '连接失败' : 'Failed') : 
                           (language === 'zh' ? '测试连接' : 'Test')}
                        </button>
                    </div>
                    
                    {testStatus === 'error' && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 px-4 bg-red-50 border border-red-100 text-[10px] text-red-500 font-bold rounded-xl flex items-center gap-2">
                           <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                           <span className="truncate">{testError}</span>
                        </motion.div>
                    )}

                    {testStatus === 'success' && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 px-4 bg-green-50 border border-green-100 text-[10px] text-green-600 font-bold rounded-xl flex items-center gap-2">
                           <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                           <span>{language === 'zh' ? '配置验证通过，已准备好开始编排。' : 'Configuration verified and ready for orchestration.'}</span>
                        </motion.div>
                    )}
                    
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100/50 flex gap-3">
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-amber-600 font-medium leading-relaxed">
                        {language === 'zh' 
                          ? '您的 API Key 将加密存储在浏览器的本地存储（Local Storage）中，不会上传到任何第三方服务器。请确保在公共设备上清除缓存。' 
                          : 'Your API Key is stored locally in your browser and is never uploaded to third-party servers. Clear cache on public devices.'}
                      </p>
                    </div>
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
                      {/* Presets Row */}
                      <div>
                        <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-3">{language === 'zh' ? '视觉主题与预设' : 'Visual Themes & Presets'}</h4>
                        <div className="grid grid-cols-5 gap-2">
                          {/* Built-in Presets */}
                          {APPEARANCE_PRESETS.map(p => (
                             <button
                               key={p.id}
                               onClick={() => onUpdate({ ...settings, visuals: p.visuals })}
                               className="p-1.5 rounded-xl border border-neutral-100 bg-white hover:border-primary/30 transition-all flex flex-col items-center gap-1 group"
                               title={p.name}
                             >
                                <div className="flex gap-0.5">
                                  <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: p.visuals.nodeHighlightColor }} />
                                  <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: p.visuals.edgeSelectedColor }} />
                                </div>
                                <span className="text-[9px] font-bold text-neutral-500 group-hover:text-primary truncate w-full text-center">{p.name}</span>
                             </button>
                          ))}
                          
                          {/* Custom Slots */}
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
                                className={`p-1.5 rounded-xl border transition-all flex flex-col items-center gap-1 group relative ${preset ? 'border-neutral-100 bg-white hover:border-primary/30' : 'border-dashed border-neutral-200 bg-neutral-50/50 hover:bg-neutral-50 hover:border-neutral-300'}`}
                              >
                                {preset ? (
                                  <>
                                    <div className="flex gap-0.5">
                                      <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: preset.nodeHighlightColor }} />
                                      <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: preset.edgeSelectedColor }} />
                                    </div>
                                    <span className="text-[9px] font-bold text-neutral-500 group-hover:text-primary">{language === 'zh' ? `槽位 ${idx + 1}` : `Slot ${idx + 1}`}</span>
                                    <div 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const newPresets = [...settings.customVisualPresets];
                                        newPresets[idx] = settings.visuals;
                                        onUpdate({ ...settings, customVisualPresets: newPresets });
                                      }}
                                      className="absolute -top-1 -right-1 w-4 h-4 bg-white border border-neutral-100 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                      title={language === 'zh' ? '覆盖当前' : 'Overwrite'}
                                    >
                                      <Save className="w-2 h-2 text-neutral-400" />
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

                      {/* Color Pickers */}
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { key: 'nodeHighlightColor', label: language === 'zh' ? '选中边框' : 'Highlight' },
                          { key: 'edgeColor', label: language === 'zh' ? '普通连线' : 'Edge' },
                          { key: 'edgeSelectedColor', label: language === 'zh' ? '高亮连线' : 'Selected' },
                          { key: 'handleColor', label: language === 'zh' ? '连接点' : 'Handles' }
                        ].map(item => (
                          <div key={item.key} className="flex flex-col gap-2 p-3 bg-neutral-50 rounded-2xl border border-neutral-100">
                            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none">{item.label}</span>
                            <div className="flex items-center justify-between gap-2 bg-white p-1.5 rounded-xl border border-neutral-100 shadow-sm">
                              <div className="flex items-center gap-2">
                                <input 
                                  type="color" 
                                  value={(settings.visuals as any)[item.key]}
                                  onChange={(e) => onUpdate({ ...settings, visuals: { ...settings.visuals, [item.key]: e.target.value } })}
                                  className="w-5 h-5 rounded-lg cursor-pointer border-none bg-transparent overflow-hidden"
                                />
                                <span className="text-[10px] font-mono text-neutral-400 font-bold">{(settings.visuals as any)[item.key]}</span>
                              </div>
                            </div>
                            {/* Swatches Overlay */}
                            <div className="grid grid-cols-5 gap-1.5 mt-1">
                              {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#14b8a6', '#06b6d4', '#8b5cf6', '#64748b'].map(c => (
                                <button
                                  key={c}
                                  onClick={() => onUpdate({ ...settings, visuals: { ...settings.visuals, [item.key]: c } })}
                                  className="w-full aspect-square rounded-md border border-white shadow-sm ring-1 ring-neutral-200/50 hover:scale-110 transition-transform"
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="h-px bg-neutral-100 my-1" />

                    </div>
                  </div>

                  {/* Preview Container */}
                  <div className="flex flex-col gap-4">
                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest text-center">{language === 'zh' ? '实时效果预览' : 'Live Preview'}</span>
                    <div className="flex-1 rounded-[2.5rem] bg-neutral-50 border border-neutral-100 relative overflow-hidden flex items-center justify-center p-8 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
                      {/* Preview SVG / CSS Nodes */}
                      <div className="relative w-full h-full">
                         {/* Edge line preview */}
                         <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.03))' }}>
                            <path 
                              d="M 116 116 C 160 116, 200 244, 244 244" 
                              stroke={settings.visuals.edgeSelectedColor} 
                              strokeWidth="3" 
                              fill="none" 
                              strokeDasharray="6 4"
                              className="animate-pulse"
                            />
                            {/* Target Center Dot */}
                            <circle cx="238" cy="244" r="3" fill={settings.visuals.edgeSelectedColor} />
                         </svg>

                         {/* Node 1 (Source - Offset Top-Left) */}
                         <div 
                           className="absolute left-8 top-12 w-24 h-24 rounded-2xl bg-white shadow-xl border-2 relative flex flex-col items-center justify-center gap-2"
                           style={{ borderColor: settings.visuals.nodeHighlightColor }}
                         >
                            <div className="w-8 h-1.5 bg-neutral-100 rounded-full" />
                            <div className="space-y-1">
                              <div className="w-12 h-1 bg-neutral-50 rounded-full" />
                              <div className="w-8 h-1 bg-neutral-50 rounded-full" />
                            </div>
                            {/* Handle Preview */}
                            <div 
                              className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 w-3 h-3 rounded-full border-2 border-white shadow-sm" 
                              style={{ backgroundColor: settings.visuals.handleColor }}
                            />
                         </div>

                         {/* Node 2 (Target - Offset Bottom-Right) */}
                         <div 
                           className="absolute right-8 bottom-12 w-24 h-24 rounded-2xl bg-white shadow-md border border-neutral-100 relative flex flex-col items-center justify-center gap-2"
                         >
                            <div className="w-8 h-1.5 bg-neutral-100 rounded-full" />
                            <div className="space-y-1">
                              <div className="w-12 h-1 bg-neutral-50 rounded-full" />
                              <div className="w-8 h-1 bg-neutral-50 rounded-full" />
                            </div>
                            {/* Handle Preview */}
                            <div 
                              className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-white shadow-sm" 
                              style={{ backgroundColor: settings.visuals.handleColor }}
                            />
                         </div>
                      </div>
                      <div className="absolute top-5 left-5">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/80 backdrop-blur-md border border-neutral-100 shadow-sm">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none">Live Rendering</span>
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
                  <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-indigo-200 mb-6">
                    <Rocket className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-black text-neutral-900 mb-1">YesFlow</h3>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500 mb-3">One Yes, All Flow</p>
                  <div className="flex flex-col items-center gap-1.5 bg-neutral-100 px-4 py-2 rounded-2xl">
                    <div className="flex items-center gap-2">
                       <Hash className="w-3 h-3 text-neutral-400" />
                       <span className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">Version {settings.version}</span>
                    </div>
                    <div className="flex items-center gap-2 border-t border-neutral-200 mt-1 pt-1.5 w-full justify-center">
                       <Globe className="w-2.5 h-2.5 text-neutral-400" />
                       <span className="text-[10px] font-bold text-neutral-500 lowercase tracking-tight">myheeq@foxmail.com</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                   <div className="flex items-center gap-2 text-xs font-black text-neutral-400 uppercase tracking-[0.2em] mb-4">
                     <Activity className="w-3.5 h-3.5" />
                     {language === 'zh' ? '更新日志' : 'Update Logs'}
                   </div>
                   <div className="space-y-3">
                     {settings.updateNotes.map((note, i) => (
                       <div key={i} className="flex gap-4 p-4 rounded-2xl bg-neutral-50/50 border border-neutral-100 font-medium text-sm text-neutral-600 leading-relaxed capitalize">
                         <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                         {note}
                       </div>
                     ))}
                   </div>
                </div>

                <div className="pt-8 border-t border-neutral-100 flex flex-col items-center gap-4 text-center">
                   <p className="text-xs text-neutral-400 font-medium leading-loose max-w-md">
                     {language === 'zh'
                       ? 'YesFlow 是一个致力于让 AI 工作流编排更直接、更易用的生产力工具。One Yes, All Flow.'
                       : 'YesFlow is a productivity tool built to make AI workflow orchestration more direct and more approachable. One Yes, All Flow.'}
                   </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

