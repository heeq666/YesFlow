import type React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { Edge, Node } from '@xyflow/react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Circle as CircleIcon,
  ClipboardList,
  Clock,
  Globe,
  History,
  Info,
  LayoutDashboard,
  Loader2,
  PlayCircle,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
  Zap,
} from 'lucide-react';

import SidebarFooter from './SidebarFooter';
import { translations } from '../constants/translations';
import type { NodeStatus, ProjectRecord, Settings, TaskData } from '../types';

type SidebarPanelProps = {
  language: 'zh' | 'en';
  isLoading: boolean;
  settings: Settings;
  selectedNode?: Node | null;
  selectedEdge?: Edge | null;
  selectedNodes: Node[];
  selectedPrompt: string;
  localRecords: ProjectRecord[];
  currentRecordId: string | null;
  nodes: Node[];
  edges: Edge[];
  onToggleLanguage: () => void;
  onNewProject: () => void;
  onDeleteSelectedEdge: () => void;
  onUpdateSelectedEdgeLabel: (value: string) => void;
  onUpdateSelectedEdgeColor: (color?: string) => void;
  onDeleteSelectedNode: () => void;
  onUpdateNodeData: (id: string, updates: Partial<TaskData>) => void;
  onStatusChange: (id: string, status: NodeStatus) => void;
  onJumpToNode: (nodeId: string) => void;
  onSelectedPromptChange: (value: string) => void;
  onModifySelected: () => void;
  onAbort: () => void;
  onLoadRecord: (record: ProjectRecord) => void;
  onDeleteRecord: (recordId: string, event: React.MouseEvent<HTMLButtonElement>) => void;
  onOpenSettings: () => void;
};

const EDGE_COLORS = ['sky', 'green', 'amber', 'rose', 'indigo', 'neutral'] as const;
const NODE_COLORS = ['sky', 'green', 'amber', 'indigo', 'rose', 'teal', 'fuchsia', 'orange', 'cyan', 'violet', 'neutral'] as const;
const STATUS_OPTIONS: { id: NodeStatus; icon: React.ReactNode; color: string }[] = [
  { id: 'pending', icon: <CircleIcon className="w-3 h-3" />, color: 'text-neutral-400' },
  { id: 'in-progress', icon: <PlayCircle className="w-3 h-3" />, color: 'text-sky-500' },
  { id: 'completed', icon: <CheckCircle2 className="w-3 h-3" />, color: 'text-green-500' },
  { id: 'failed', icon: <AlertCircle className="w-3 h-3" />, color: 'text-red-500' },
];

function colorClass(color: string) {
  switch (color) {
    case 'sky': return 'bg-sky-400';
    case 'green': return 'bg-green-400';
    case 'amber': return 'bg-amber-400';
    case 'indigo': return 'bg-indigo-400';
    case 'rose': return 'bg-rose-400';
    case 'teal': return 'bg-teal-400';
    case 'fuchsia': return 'bg-fuchsia-400';
    case 'orange': return 'bg-orange-400';
    case 'cyan': return 'bg-cyan-400';
    case 'violet': return 'bg-violet-400';
    default: return 'bg-neutral-400';
  }
}

function textColorClass(color: string) {
  switch (color) {
    case 'sky': return 'text-sky-500';
    case 'green': return 'text-green-500';
    case 'amber': return 'text-amber-500';
    case 'indigo': return 'text-indigo-500';
    case 'rose': return 'text-rose-500';
    case 'teal': return 'text-teal-500';
    case 'fuchsia': return 'text-fuchsia-500';
    case 'orange': return 'text-orange-500';
    case 'cyan': return 'text-cyan-500';
    case 'violet': return 'text-violet-500';
    default: return 'text-neutral-500';
  }
}

function presetIcon(type: string) {
  if (type === 'planning') return <ClipboardList className="w-3.5 h-3.5" />;
  if (type === 'verification') return <ShieldCheck className="w-3.5 h-3.5" />;
  return <Zap className="w-3.5 h-3.5" />;
}

export default function SidebarPanel({
  language,
  isLoading,
  settings,
  selectedNode,
  selectedEdge,
  selectedNodes,
  selectedPrompt,
  localRecords,
  currentRecordId,
  nodes,
  edges,
  onToggleLanguage,
  onNewProject,
  onDeleteSelectedEdge,
  onUpdateSelectedEdgeLabel,
  onUpdateSelectedEdgeColor,
  onDeleteSelectedNode,
  onUpdateNodeData,
  onStatusChange,
  onJumpToNode,
  onSelectedPromptChange,
  onModifySelected,
  onAbort,
  onLoadRecord,
  onDeleteRecord,
  onOpenSettings,
}: SidebarPanelProps) {
  const t = translations[language];
  const nodeData = selectedNode?.data as TaskData | undefined;

  return (
    <div className="flex flex-col h-full w-[380px]">
      <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <LayoutDashboard className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-900 tracking-tight">YesFlow</h1>
            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">{t.subtitle}</p>
          </div>
        </div>
        <button onClick={onToggleLanguage} className="p-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1">
          <Globe className="w-3.5 h-3.5" />
          {language === 'zh' ? 'EN' : '中'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <button
          onClick={onNewProject}
          className="w-full flex items-center justify-between p-4 bg-gradient-to-br from-primary to-indigo-600 rounded-2xl text-white shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md group-hover:rotate-90 transition-transform duration-300">
              <Plus className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-bold">{t.newPlan}</h3>
              <p className="text-[10px] text-white/60 tracking-wider">INITIATE AI BRAINSTORMING</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </button>

        <AnimatePresence mode="wait">
          {selectedEdge ? (
            <motion.section key={selectedEdge.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-neutral-900">{language === 'zh' ? '连线详情' : 'Edge Details'}</h3>
                <button onClick={onDeleteSelectedEdge} className="text-neutral-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Label</label>
                  <input
                    type="text"
                    value={(selectedEdge.label as string) || ''}
                    onChange={(e) => onUpdateSelectedEdgeLabel(e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-sm border border-neutral-200 rounded-lg outline-none bg-white font-medium"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-2">{t.color}</label>
                  <div className="flex flex-wrap gap-2">
                    {EDGE_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => onUpdateSelectedEdgeColor(color === 'neutral' ? undefined : color)}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${
                          ((selectedEdge.data as { color?: string } | undefined)?.color === color) || (color === 'neutral' && !(selectedEdge.data as { color?: string } | undefined)?.color)
                            ? 'border-primary ring-2 ring-primary/20 scale-110'
                            : 'border-white shadow-sm hover:scale-110'
                        } ${colorClass(color)}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.section>
          ) : selectedNode && nodeData ? (
            <motion.section key={selectedNode.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-neutral-900">{t.nodeDetails}</h3>
                <button onClick={onDeleteSelectedNode} className="text-neutral-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{t.nodeTitle}</label>
                  <input
                    type="text"
                    value={nodeData.label}
                    onChange={(e) => onUpdateNodeData(selectedNode.id, { label: e.target.value })}
                    className="w-full mt-1 px-3 py-2 text-sm border border-neutral-200 rounded-lg outline-none bg-white font-medium focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{t.nodeDescription}</label>
                  <textarea
                    value={nodeData.description}
                    onChange={(e) => onUpdateNodeData(selectedNode.id, { description: e.target.value })}
                    className="w-full mt-1 px-3 py-2 text-xs border border-neutral-200 rounded-lg outline-none bg-white h-24 resize-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                {!nodeData.isGroup && (
                  <div>
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-2">{t.category}</label>
                    <input
                      type="text"
                      value={nodeData.category || ''}
                      onChange={(e) => onUpdateNodeData(selectedNode.id, { category: e.target.value })}
                      placeholder={language === 'zh' ? '所属模块...' : 'Module...'}
                      className="w-full mt-1 px-3 py-2 text-xs border border-neutral-200 rounded-lg outline-none bg-white font-medium focus:ring-2 focus:ring-primary/20 transition-all"
                      list="category-list"
                    />
                    <datalist id="category-list">
                      {settings.categories.map((category) => <option key={category} value={category} />)}
                    </datalist>
                  </div>
                )}
                <div className="h-px bg-neutral-200 my-2" />
                <div>
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-2">{t.nodeType}</label>
                  <div className="flex flex-wrap gap-1.5 bg-neutral-100 p-1.5 rounded-xl">
                    {settings.nodePresets.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => onUpdateNodeData(selectedNode.id, { type: preset.type, typeLabel: preset.label, color: preset.color })}
                        className={`flex-1 min-w-[30%] py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                          nodeData.type === preset.type ? 'bg-white shadow-sm ring-1 ring-black/5' : 'hover:bg-white/50 grayscale opacity-60 hover:opacity-100'
                        }`}
                        title={preset.label}
                      >
                        <span className={textColorClass(preset.color)}>
                          {presetIcon(preset.type)}
                        </span>
                        <span className="text-[10px] font-bold text-neutral-600 whitespace-nowrap">{preset.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-2">{language === 'zh' ? '主题色' : 'Theme Color'}</label>
                  <div className="flex flex-wrap gap-2">
                    {NODE_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => onUpdateNodeData(selectedNode.id, { color: color === 'neutral' ? undefined : color })}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${
                          nodeData.color === color || (color === 'neutral' && !nodeData.color)
                            ? 'border-primary ring-2 ring-primary/20 scale-110'
                            : 'border-white shadow-sm hover:scale-110'
                        } ${color === 'neutral' ? 'bg-neutral-100' : colorClass(color)}`}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-2">{t.nodeStatus}</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {STATUS_OPTIONS.map((status) => (
                      <button
                        key={status.id}
                        onClick={() => onStatusChange(selectedNode.id, status.id)}
                        className={`px-2 py-1.5 rounded-lg border flex items-center gap-2 transition-all ${
                          nodeData.status === status.id
                            ? 'bg-white border-primary/20 shadow-sm ring-1 ring-primary/5'
                            : 'bg-transparent border-neutral-100 hover:border-neutral-200 grayscale opacity-60'
                        }`}
                      >
                        <span className={status.color}>{status.icon}</span>
                        <span className="text-[10px] font-bold text-neutral-600">{t.statuses[status.id]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-200">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-3">{t.edgeList}</label>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <ArrowRight className="w-3 h-3 text-primary" />
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{t.outgoing}</span>
                      </div>
                      <div className="space-y-1.5 pl-4 ml-1.2 border-l-2 border-neutral-100">
                        {edges.filter((edge) => edge.source === selectedNode.id).length === 0 ? (
                          <span className="text-[10px] text-neutral-300 italic">{language === 'zh' ? '无' : 'None'}</span>
                        ) : edges.filter((edge) => edge.source === selectedNode.id).map((edge) => {
                          const targetNode = nodes.find((node) => node.id === edge.target);
                          return (
                            <div key={edge.id} className="group flex items-center justify-between text-xs py-1">
                              <div className="flex flex-col min-w-0 pr-2">
                                <span className="font-bold text-neutral-700 truncate">{(targetNode?.data as TaskData | undefined)?.label || 'Unknown'}</span>
                                {edge.label && <span className="text-[9px] text-neutral-400 truncate opacity-60">[{String(edge.label)}]</span>}
                              </div>
                              <button
                                onClick={() => onJumpToNode(edge.target)}
                                className="p-1 px-2 bg-neutral-100 hover:bg-primary/10 text-[9px] font-bold text-neutral-400 hover:text-primary rounded-lg transition-all"
                              >
                                {language === 'zh' ? '跳转' : 'GOTO'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <ArrowLeft className="w-3 h-3 text-emerald-500" />
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{t.incoming}</span>
                      </div>
                      <div className="space-y-1.5 pl-4 ml-1.2 border-l-2 border-neutral-100">
                        {edges.filter((edge) => edge.target === selectedNode.id).length === 0 ? (
                          <span className="text-[10px] text-neutral-300 italic">{language === 'zh' ? '无' : 'None'}</span>
                        ) : edges.filter((edge) => edge.target === selectedNode.id).map((edge) => {
                          const sourceNode = nodes.find((node) => node.id === edge.source);
                          return (
                            <div key={edge.id} className="group flex items-center justify-between text-xs py-1">
                              <div className="flex flex-col min-w-0 pr-2">
                                <span className="font-bold text-neutral-700 truncate">{(sourceNode?.data as TaskData | undefined)?.label || 'Unknown'}</span>
                                {edge.label && <span className="text-[9px] text-neutral-400 truncate opacity-60">[{String(edge.label)}]</span>}
                              </div>
                              <button
                                onClick={() => onJumpToNode(edge.source)}
                                className="p-1 px-2 bg-neutral-100 hover:bg-emerald-50 text-[9px] font-bold text-neutral-400 hover:text-emerald-600 rounded-lg transition-all"
                              >
                                {language === 'zh' ? '跳转' : 'GOTO'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>
          ) : selectedNodes.length > 1 ? (
            <motion.section key="multi" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200">
              <h3 className="text-sm font-bold text-neutral-900 mb-4">{t.selectedCount.replace('{count}', selectedNodes.length.toString())}</h3>
              <textarea
                value={selectedPrompt}
                onChange={(e) => onSelectedPromptChange(e.target.value)}
                placeholder={t.modifyPromptPlaceholder}
                className="w-full h-24 p-3 border border-neutral-200 rounded-xl text-xs outline-none bg-white"
              />
              <div className="flex gap-2 mt-2">
                <button onClick={onModifySelected} disabled={isLoading} className="flex-1 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {t.modifySelected}
                </button>
                {isLoading && (
                  <button onClick={onAbort} className="px-3 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs font-bold hover:bg-red-100 transition-all">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </motion.section>
          ) : (
            <div className="space-y-8">
              {localRecords.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2 font-bold text-neutral-400 text-[10px] uppercase tracking-widest">
                    <History className="w-3 h-3" />
                    <span>{language === 'zh' ? '项目记录' : 'Project Records'} ({localRecords.length})</span>
                  </div>
                  <div className="space-y-2">
                    {localRecords.map((record) => (
                      <motion.div
                        key={record.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => onLoadRecord(record)}
                        className={`group relative p-3 rounded-xl border cursor-pointer transition-all ${
                          currentRecordId === record.id
                            ? 'bg-primary/5 border-primary/20 ring-1 ring-primary/10'
                            : 'bg-neutral-50 border-neutral-100 hover:border-neutral-200 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0 pr-6">
                            <h4 className={`text-xs font-bold truncate ${currentRecordId === record.id ? 'text-primary' : 'text-neutral-700'}`}>{record.name}</h4>
                            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-neutral-400">
                              <Clock className="w-2.5 h-2.5" />
                              <span>{new Date(record.lastModified).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                          <button onClick={(event) => onDeleteRecord(record.id, event)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 opacity-40">
                  <Info className="w-8 h-8 text-neutral-300 mb-3" />
                  <p className="text-xs text-neutral-500">{t.emptyNodeSelection}</p>
                </div>
              )}
            </div>
          )}
        </AnimatePresence>
      </div>

      <SidebarFooter
        language={language}
        systemStatusLabel={t.systemStatus}
        readyLabel={t.ready}
        onOpenSettings={onOpenSettings}
      />
    </div>
  );
}
