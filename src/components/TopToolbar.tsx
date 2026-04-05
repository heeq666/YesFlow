import type React from 'react';
import { useMemo } from 'react';
import { Activity, CornerDownRight, Database, FileUp, GitMerge, Grid2x2, Minus, Plus, Pin, Redo2, Save, Undo2 } from 'lucide-react';
import { Panel } from '@xyflow/react';

import type { ConnectionMode, NodePreset, TaskMode, ThemeMode } from '../types';

const PATH_BUTTONS = [
  { id: 'bezier', icon: <Activity className="w-3.5 h-3.5" /> },
  { id: 'straight', icon: <Minus className="w-3.5 h-3.5" /> },
  { id: 'step', icon: <CornerDownRight className="w-3.5 h-3.5" /> },
];

type TopToolbarProps = {
  currentProjectLabel: string;
  projectName: string;
  onProjectNameChange: (name: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSaveToLocal: () => void;
  onSaveFile: () => void;
  onOpenFile: () => void;
  mode: TaskMode;
  onModeChange: (mode: TaskMode) => void;
  defaultPathType: string;
  onApplyPathTypeToAll: (pathType: string) => void;
  connectionMode: ConnectionMode;
  onApplyConnectionMode: (mode: ConnectionMode) => void;
  showCanvasGrid: boolean;
  onToggleCanvasGrid: () => void;
  themeMode: ThemeMode;
  language: 'zh' | 'en';
  nodePresets: NodePreset[];
  onAddPresetNode: (preset: NodePreset) => void;
  onAddNodeLocal: () => void;
  onToggleTheme: () => void;
  onToggleLanguage: () => void;
};

export default function TopToolbar({
  currentProjectLabel,
  projectName,
  onProjectNameChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSaveToLocal,
  onSaveFile,
  onOpenFile,
  mode,
  onModeChange,
  defaultPathType,
  onApplyPathTypeToAll,
  connectionMode,
  onApplyConnectionMode,
  showCanvasGrid,
  onToggleCanvasGrid,
  themeMode,
  language,
  nodePresets,
  onAddPresetNode,
  onAddNodeLocal,
  onToggleTheme,
  onToggleLanguage,
}: TopToolbarProps) {
  const connectionButtons = useMemo(() => [
    {
      id: 'auto' as ConnectionMode,
      icon: <GitMerge className="w-3.5 h-3.5" />,
      title: language === 'zh' ? '自动换边' : 'Auto switch sides',
    },
    {
      id: 'fixed' as ConnectionMode,
      icon: <Pin className="w-3.5 h-3.5" />,
      title: language === 'zh' ? '固定端口' : 'Fixed handles',
    },
  ], [language]);
  const modeButtons = useMemo(() => [
    {
      id: 'daily' as TaskMode,
      label: language === 'zh' ? '日常' : 'Daily',
      hint: language === 'zh' ? '小气泡视图，仅保留标题和状态' : 'Bubble view with title and status only',
    },
    {
      id: 'professional' as TaskMode,
      label: language === 'zh' ? '专业' : 'Pro',
      hint: language === 'zh' ? '展开完整节点信息与插件工作流' : 'Full node details and plugin workflow',
    },
  ], [language]);

  const getPresetToneClass = (color: NodePreset['color']) => {
    if (themeMode === 'dark') {
      switch (color) {
        case 'sky': return 'bg-sky-950/70 text-sky-200 border-sky-800/80 hover:border-sky-700 shadow-sky-950/35';
        case 'green': return 'bg-green-950/70 text-green-200 border-green-800/80 hover:border-green-700 shadow-green-950/35';
        case 'amber': return 'bg-amber-950/70 text-amber-200 border-amber-800/80 hover:border-amber-700 shadow-amber-950/35';
        case 'indigo': return 'bg-indigo-950/70 text-indigo-200 border-indigo-800/80 hover:border-indigo-700 shadow-indigo-950/35';
        case 'rose': return 'bg-rose-950/70 text-rose-200 border-rose-800/80 hover:border-rose-700 shadow-rose-950/35';
        case 'teal': return 'bg-teal-950/70 text-teal-200 border-teal-800/80 hover:border-teal-700 shadow-teal-950/35';
        case 'fuchsia': return 'bg-fuchsia-950/70 text-fuchsia-200 border-fuchsia-800/80 hover:border-fuchsia-700 shadow-fuchsia-950/35';
        case 'orange': return 'bg-orange-950/70 text-orange-200 border-orange-800/80 hover:border-orange-700 shadow-orange-950/35';
        case 'cyan': return 'bg-cyan-950/70 text-cyan-200 border-cyan-800/80 hover:border-cyan-700 shadow-cyan-950/35';
        default: return 'bg-violet-950/70 text-violet-200 border-violet-800/80 hover:border-violet-700 shadow-violet-950/35';
      }
    }

    switch (color) {
      case 'sky': return 'bg-sky-50 text-sky-600 border-sky-200 hover:border-sky-300 shadow-sky-100/50';
      case 'green': return 'bg-green-50 text-green-600 border-green-200 hover:border-green-300 shadow-green-100/50';
      case 'amber': return 'bg-amber-50 text-amber-600 border-amber-200 hover:border-amber-300 shadow-amber-100/50';
      case 'indigo': return 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:border-indigo-300 shadow-indigo-100/50';
      case 'rose': return 'bg-rose-50 text-rose-600 border-rose-200 hover:border-rose-300 shadow-rose-100/50';
      case 'teal': return 'bg-teal-50 text-teal-600 border-teal-200 hover:border-teal-300 shadow-teal-100/50';
      case 'fuchsia': return 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200 hover:border-fuchsia-300 shadow-fuchsia-100/50';
      case 'orange': return 'bg-orange-50 text-orange-600 border-orange-200 hover:border-orange-300 shadow-orange-100/50';
      case 'cyan': return 'bg-cyan-50 text-cyan-600 border-cyan-200 hover:border-cyan-300 shadow-cyan-100/50';
      default: return 'bg-violet-50 text-violet-600 border-violet-200 hover:border-violet-300 shadow-violet-100/50';
    }
  };

  return (
    <Panel position="top-center" className="m-4 z-50">
      <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-neutral-200 shadow-xl flex items-center gap-3">
        <div className="flex flex-col px-2 hidden lg:flex">
          <span className="text-[10px] font-bold text-neutral-400 tracking-widest uppercase">{currentProjectLabel}</span>
          <input
            type="text"
            value={projectName}
            onChange={(e) => onProjectNameChange(e.target.value)}
            className="text-sm font-bold text-neutral-900 bg-transparent outline-none border-b border-transparent focus:border-primary/20 transition-all hover:bg-black/5 rounded-md px-1 -mx-1"
          />
        </div>
        <div className="h-8 w-px bg-neutral-200 hidden lg:block" />
        <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl">
          {modeButtons.map((button) => (
            <button
              key={button.id}
              onClick={() => onModeChange(button.id)}
              title={button.hint}
              className={`px-3 py-1.5 rounded-lg text-xs font-black tracking-[0.14em] uppercase transition-all ${
                mode === button.id
                  ? 'bg-white text-primary shadow-sm ring-1 ring-primary/10'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {button.label}
            </button>
          ))}
        </div>
        <div className="h-8 w-px bg-neutral-200" />
        <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl">
          <button onClick={onUndo} disabled={!canUndo} title={language === 'zh' ? '撤销' : 'Undo'} className="p-1.5 rounded-lg text-neutral-500 hover:bg-white hover:text-primary disabled:opacity-30 transition-all"><Undo2 className="w-4 h-4" /></button>
          <button onClick={onRedo} disabled={!canRedo} title={language === 'zh' ? '重做' : 'Redo'} className="p-1.5 rounded-lg text-neutral-500 hover:bg-white hover:text-primary disabled:opacity-30 transition-all"><Redo2 className="w-4 h-4" /></button>
          <div className="w-px h-4 bg-neutral-200 mx-1" />
          <button onClick={onSaveToLocal} title={language === 'zh' ? '保存到记录' : 'Save to records'} className="p-1.5 rounded-lg text-neutral-500 hover:bg-white hover:text-indigo-600 transition-all"><Database className="w-4 h-4" /></button>
          <button onClick={onSaveFile} title={language === 'zh' ? '导出文件' : 'Export file'} className="p-1.5 rounded-lg text-neutral-500 hover:bg-white hover:text-primary transition-all"><Save className="w-4 h-4" /></button>
          <button onClick={onOpenFile} title={language === 'zh' ? '导入文件' : 'Import file'} className="p-1.5 rounded-lg text-neutral-500 hover:bg-white hover:text-primary transition-all"><FileUp className="w-4 h-4" /></button>
        </div>
        <div className="h-8 w-px bg-neutral-200" />
        <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl">
          {PATH_BUTTONS.map((button) => (
            <button
              key={button.id}
              onClick={() => onApplyPathTypeToAll(button.id)}
              title={button.id === 'bezier' ? (language === 'zh' ? '贝塞尔曲线' : 'Bezier curve') : button.id === 'straight' ? (language === 'zh' ? '直线' : 'Straight line') : (language === 'zh' ? '阶梯线' : 'Step line')}
              className={`p-1.5 rounded-lg transition-all ${defaultPathType === button.id ? 'bg-white text-primary shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}
            >
              {button.icon}
            </button>
          ))}
        </div>
        <div className="h-8 w-px bg-neutral-200" />
        <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl">
          {connectionButtons.map((button) => (
            <button
              key={button.id}
              onClick={() => onApplyConnectionMode(button.id)}
              title={button.title}
              className={`p-1.5 rounded-lg transition-all ${
                connectionMode === button.id ? 'bg-white text-primary shadow-sm' : 'text-neutral-400 hover:text-neutral-600'
              }`}
            >
              {button.icon}
            </button>
          ))}
        </div>
        <div className="h-8 w-px bg-neutral-200" />
        <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl">
          <button
            onClick={onToggleCanvasGrid}
            aria-pressed={showCanvasGrid}
            title={showCanvasGrid ? (language === 'zh' ? '隐藏网格' : 'Hide grid') : (language === 'zh' ? '显示网格' : 'Show grid')}
            style={{ pointerEvents: 'auto' }}
            className={`p-1.5 rounded-lg transition-all ${
              showCanvasGrid ? 'bg-white text-primary shadow-sm ring-1 ring-primary/10' : 'text-neutral-400 hover:text-neutral-600'
            }`}
          >
            <Grid2x2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="h-8 w-px bg-neutral-200" />
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-2 mr-1">{language === 'zh' ? '预设节点' : 'Presets'}</span>
          {nodePresets.map((preset) => (
            <div
              key={preset.id}
              onClick={() => onAddPresetNode(preset)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer active:cursor-grabbing border-2 transition-all hover:scale-105 shadow-sm ${getPresetToneClass(preset.color)}`}
              draggable
              onDragStart={(e) => {
                const pkg = JSON.stringify({ type: preset.type, label: preset.label, color: preset.color });
                e.dataTransfer.setData('application/reactflow', pkg);
                e.dataTransfer.effectAllowed = 'move';
              }}
            >
              {preset.label}
            </div>
          ))}
        </div>
        <div className="h-8 w-px bg-neutral-200" />
        <div className="flex items-center gap-2 pr-1">
          {/* 添加节点 */}
          <button onClick={onAddNodeLocal} title={language === 'zh' ? '添加节点' : 'Add node'} className="p-2 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-700 shadow-sm"><Plus className="w-4 h-4" /></button>
        </div>
      </div>
    </Panel>
  );
}
