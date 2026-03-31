import { Activity, CornerDownRight, Database, FileUp, Minus, Plus, Redo2, Save, Undo2 } from 'lucide-react';
import { Panel } from '@xyflow/react';

import type { NodePreset } from '../types';

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
  defaultPathType: string;
  onApplyPathTypeToAll: (pathType: string) => void;
  language: 'zh' | 'en';
  nodePresets: NodePreset[];
  onAddPresetNode: (preset: NodePreset) => void;
  onAddNodeLocal: () => void;
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
  defaultPathType,
  onApplyPathTypeToAll,
  language,
  nodePresets,
  onAddPresetNode,
  onAddNodeLocal,
}: TopToolbarProps) {
  const pathButtons = [
    { id: 'bezier', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'straight', icon: <Minus className="w-3.5 h-3.5" /> },
    { id: 'step', icon: <CornerDownRight className="w-3.5 h-3.5" /> },
  ];

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
          <button onClick={onUndo} disabled={!canUndo} className="p-1.5 rounded-lg text-neutral-500 hover:bg-white hover:text-primary disabled:opacity-30 transition-all"><Undo2 className="w-4 h-4" /></button>
          <button onClick={onRedo} disabled={!canRedo} className="p-1.5 rounded-lg text-neutral-500 hover:bg-white hover:text-primary disabled:opacity-30 transition-all"><Redo2 className="w-4 h-4" /></button>
          <div className="w-px h-4 bg-neutral-200 mx-1" />
          <button onClick={onSaveToLocal} className="p-1.5 rounded-lg text-neutral-500 hover:bg-white hover:text-indigo-600 transition-all" title="Save to records"><Database className="w-4 h-4" /></button>
          <button onClick={onSaveFile} className="p-1.5 rounded-lg text-neutral-500 hover:bg-white hover:text-primary transition-all"><Save className="w-4 h-4" /></button>
          <button onClick={onOpenFile} className="p-1.5 rounded-lg text-neutral-500 hover:bg-white hover:text-primary transition-all"><FileUp className="w-4 h-4" /></button>
        </div>
        <div className="h-8 w-px bg-neutral-200" />
        <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl">
          {pathButtons.map((button) => (
            <button
              key={button.id}
              onClick={() => onApplyPathTypeToAll(button.id)}
              className={`p-1.5 rounded-lg transition-all ${defaultPathType === button.id ? 'bg-white text-primary shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}
            >
              {button.icon}
            </button>
          ))}
        </div>
        <div className="h-8 w-px bg-neutral-200" />
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-2 mr-1">{language === 'zh' ? '预设节点' : 'Presets'}</span>
          {nodePresets.map((preset) => (
            <div
              key={preset.id}
              onClick={() => onAddPresetNode(preset)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer active:cursor-grabbing border-2 transition-all hover:scale-105 shadow-sm ${
                preset.color === 'sky' ? 'bg-sky-50 text-sky-600 border-sky-200 hover:border-sky-300 shadow-sky-100/50' :
                preset.color === 'green' ? 'bg-green-50 text-green-600 border-green-200 hover:border-green-300 shadow-green-100/50' :
                preset.color === 'amber' ? 'bg-amber-50 text-amber-600 border-amber-200 hover:border-amber-300 shadow-amber-100/50' :
                preset.color === 'indigo' ? 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:border-indigo-300 shadow-indigo-100/50' :
                preset.color === 'rose' ? 'bg-rose-50 text-rose-600 border-rose-200 hover:border-rose-300 shadow-rose-100/50' :
                preset.color === 'teal' ? 'bg-teal-50 text-teal-600 border-teal-200 hover:border-teal-300 shadow-teal-100/50' :
                preset.color === 'fuchsia' ? 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200 hover:border-fuchsia-300 shadow-fuchsia-100/50' :
                preset.color === 'orange' ? 'bg-orange-50 text-orange-600 border-orange-200 hover:border-orange-300 shadow-orange-100/50' :
                preset.color === 'cyan' ? 'bg-cyan-50 text-cyan-600 border-cyan-200 hover:border-cyan-300 shadow-cyan-100/50' :
                'bg-violet-50 text-violet-600 border-violet-200 hover:border-violet-300 shadow-violet-100/50'
              }`}
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
          <button onClick={onAddNodeLocal} className="p-2 bg-white text-neutral-600 border border-neutral-200 rounded-xl hover:bg-neutral-50 shadow-sm"><Plus className="w-4 h-4" /></button>
        </div>
      </div>
    </Panel>
  );
}
