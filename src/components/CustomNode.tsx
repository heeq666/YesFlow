import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { CheckCircle2, Circle, PlayCircle, AlertCircle, ClipboardList, Zap, ShieldCheck, Layers, Plus, Loader2, Clock3, Table2, FileText, Wrench } from 'lucide-react';
import { type TaskData, type NodeStatus, type ThemeMode } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { NodeSettingsContext } from '../contexts/NodeSettingsContext';
import { HANDLE_DOT_SIZE, getUnifiedHandleStyle } from '../constants/handleGeometry';
import NodeToolToolbar from './NodeToolToolbar';
import { formatScheduleSummary } from '../utils/nodeTools';

const statusIcons = {
  pending: <Circle className="w-5 h-5 text-neutral-300" />,
  'in-progress': <PlayCircle className="w-5 h-5 text-sky-500 animate-pulse" />,
  completed: <CheckCircle2 className="w-5 h-5 text-green-500" />,
  failed: <AlertCircle className="w-5 h-5 text-red-500" />,
};

type ToneStyle = { bg: string; border: string; text: string; textDark: string };

const colorStyles: Record<string, Record<ThemeMode, ToneStyle>> = {
  sky: {
    light: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-500', textDark: 'text-sky-600' },
    dark: { bg: 'bg-sky-950/55', border: 'border-sky-800/70', text: 'text-sky-300', textDark: 'text-sky-200' },
  },
  green: {
    light: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-500', textDark: 'text-green-600' },
    dark: { bg: 'bg-green-950/55', border: 'border-green-800/70', text: 'text-green-300', textDark: 'text-green-200' },
  },
  amber: {
    light: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-500', textDark: 'text-amber-600' },
    dark: { bg: 'bg-amber-950/55', border: 'border-amber-800/70', text: 'text-amber-300', textDark: 'text-amber-200' },
  },
  indigo: {
    light: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-500', textDark: 'text-indigo-600' },
    dark: { bg: 'bg-indigo-950/55', border: 'border-indigo-800/70', text: 'text-indigo-300', textDark: 'text-indigo-200' },
  },
  rose: {
    light: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-500', textDark: 'text-rose-600' },
    dark: { bg: 'bg-rose-950/55', border: 'border-rose-800/70', text: 'text-rose-300', textDark: 'text-rose-200' },
  },
  teal: {
    light: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-500', textDark: 'text-teal-600' },
    dark: { bg: 'bg-teal-950/55', border: 'border-teal-800/70', text: 'text-teal-300', textDark: 'text-teal-200' },
  },
  fuchsia: {
    light: { bg: 'bg-fuchsia-50', border: 'border-fuchsia-200', text: 'text-fuchsia-500', textDark: 'text-fuchsia-600' },
    dark: { bg: 'bg-fuchsia-950/55', border: 'border-fuchsia-800/70', text: 'text-fuchsia-300', textDark: 'text-fuchsia-200' },
  },
  orange: {
    light: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-500', textDark: 'text-orange-600' },
    dark: { bg: 'bg-orange-950/55', border: 'border-orange-800/70', text: 'text-orange-300', textDark: 'text-orange-200' },
  },
  cyan: {
    light: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-500', textDark: 'text-cyan-600' },
    dark: { bg: 'bg-cyan-950/55', border: 'border-cyan-800/70', text: 'text-cyan-300', textDark: 'text-cyan-200' },
  },
  violet: {
    light: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-500', textDark: 'text-violet-600' },
    dark: { bg: 'bg-violet-950/55', border: 'border-violet-800/70', text: 'text-violet-300', textDark: 'text-violet-200' },
  },
};

const getStyles = (type: string, themeMode: ThemeMode, color?: string) => {
  if (color && colorStyles[color]) {
    return `${colorStyles[color][themeMode].border} ${colorStyles[color][themeMode].bg}`;
  }
  const t = type.toLowerCase();
  if (themeMode === 'dark') {
    if (t === 'planning' || t === '规划') return 'border-sky-800/70 bg-sky-950/55';
    if (t === 'execution' || t === '执行') return 'border-green-800/70 bg-green-950/55';
    if (t === 'verification' || t === '验证') return 'border-amber-800/70 bg-amber-950/55';
    return 'border-indigo-800/70 bg-indigo-950/55';
  }
  if (t === 'planning' || t === '规划') return 'border-sky-200 bg-sky-50';
  if (t === 'execution' || t === '执行') return 'border-green-200 bg-green-50';
  if (t === 'verification' || t === '验证') return 'border-amber-200 bg-amber-50';
  return 'border-indigo-200 bg-indigo-50';
};

const getIcon = (type: string, themeMode: ThemeMode, color?: string) => {
  if (color && colorStyles[color]) {
    return <Layers className={`w-4 h-4 ${colorStyles[color][themeMode].text}`} />;
  }
  const t = type.toLowerCase();
  if (t === 'planning' || t === '规划') return <ClipboardList className="w-4 h-4 text-sky-500" />;
  if (t === 'execution' || t === '执行') return <Zap className="w-4 h-4 text-green-500" />;
  if (t === 'verification' || t === '验证') return <ShieldCheck className="w-4 h-4 text-amber-500" />;
  return <Layers className="w-4 h-4 text-indigo-500" />;
};

const getDisplayType = (type: string, lang: 'zh' | 'en', typeLabel?: string) => {
  if (typeLabel) return typeLabel;
  const standardTypes = {
    zh: { planning: '规划', execution: '执行', verification: '验证' },
    en: { planning: 'Planning', execution: 'Execution', verification: 'Verification' }
  };
  return standardTypes[lang][type as keyof typeof standardTypes['zh']] || type;
};

// Reverting to direct handle placement for maximum precision

export default function CustomNode({ id, data, selected = false }: NodeProps & { data: TaskData }) {
  const context = React.useContext(NodeSettingsContext);
  const themeMode = context.themeMode;
  const [isEditing, setIsEditing] = React.useState(false);
  const [editLabel, setEditLabel] = React.useState(data.label);
  const [editDesc, setEditDesc] = React.useState(data.description);
  const [editType, setEditType] = React.useState(data.type);
  const [editTypeLabel, setEditTypeLabel] = React.useState('');
  const [editCategory, setEditCategory] = React.useState(data.category || '');
  const [showToolbar, setShowToolbar] = React.useState(false);
  const titleRef = React.useRef<HTMLInputElement>(null);
  const editContainerRef = React.useRef<HTMLDivElement>(null);

  const lang = data.language || 'zh';
  const displayType = getDisplayType(data.type, lang, data.typeLabel);
  const activeColorStyle = data.color && colorStyles[data.color] ? colorStyles[data.color][themeMode] : null;

  const toggleStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStatus: Record<NodeStatus, NodeStatus> = {
      pending: 'in-progress',
      'in-progress': 'completed',
      completed: 'pending',
      failed: 'pending',
    };
    data.onStatusChange?.(id, nextStatus[data.status]);
  };

  // Sync local state when data changes externally
  React.useEffect(() => {
    if (!isEditing) {
      setEditLabel(data.label);
      setEditDesc(data.description);
      setEditType(data.type);
      setEditCategory(data.category || '');
      setEditTypeLabel(data.typeLabel || '');
    }
  }, [data.label, data.description, data.type, data.category, data.typeLabel, isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selected) return;
    setIsEditing(true);
    setTimeout(() => titleRef.current?.focus(), 50);
  };

  const commitEdit = React.useCallback(() => {
    setIsEditing(false);
    // If user edited the type label but it's not the same as standard, we could save it as type.
    // However, to keep standard coloring, we keep editType and save custom label somewhere?
    // User wants "自定义的类型就在原文字上输入". We'll just update it.
    data.onUpdateData?.(id, { 
      label: editLabel, 
      description: editDesc, 
      type: editType, 
      category: editCategory,
      typeLabel: editTypeLabel || undefined
    });
  }, [id, editLabel, editDesc, editType, editCategory, editTypeLabel, data]);

  const handleBlur = React.useCallback((e: React.FocusEvent) => {
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (editContainerRef.current && relatedTarget && editContainerRef.current.contains(relatedTarget)) {
      return;
    }
    commitEdit();
  }, [commitEdit]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Escape') {
      setIsEditing(false);
    }
    if (e.key === 'Enter' && !e.shiftKey && (e.target as HTMLElement).tagName === 'INPUT') {
      e.preventDefault();
      commitEdit();
    }
  };

  const showSelection = selected;
  const handleVisibilityClass = `${showSelection ? 'opacity-100 scale-100' : 'opacity-0 scale-75'} transition-all duration-200`;
  const scheduleSummary = formatScheduleSummary(data.tools?.schedule, lang);
  const hasTable = Boolean(data.tools?.table?.enabled);
  const hasDocument = Boolean(data.tools?.document?.enabled);
  const hasEnabledNodeTools = Object.values(context.nodeTools.enabledTools || {}).some(Boolean);
  const renderSourceHandleDot = () => (
    <span
      className={`rounded-full border-2 border-white shadow-sm shrink-0 ${handleVisibilityClass}`}
      style={{
        width: HANDLE_DOT_SIZE,
        height: HANDLE_DOT_SIZE,
        boxSizing: 'border-box',
        backgroundColor: context.visuals.handleColor,
      }}
    />
  );

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ 
        scale: data.isAiProcessing ? 1.02 : 1, 
        opacity: 1,
        borderColor: data.isAiProcessing ? '#8b5cf6' : undefined
      }}
      onDoubleClick={handleDoubleClick}
      className={`relative group border-2 transition-[border-color,opacity,background-color,box-shadow] duration-200 w-[260px] h-[132px] rounded-xl ${getStyles(isEditing ? editType : data.type, themeMode, data.color)} ${data.status === 'completed' && context.completedStyle === 'classic' ? 'opacity-75 grayscale-[0.2]' : ''}`}
    >
      <NodeToolToolbar id={id} data={data} selected={selected} visible={showToolbar} onClose={() => setShowToolbar(false)} />

      {/* Join Group Bubble (Appears above the dragged node) */}
      <AnimatePresence>
        {data.isDraggingOver && (
          <motion.div
            initial={{ opacity: 0, y: 10, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 10, x: '-50%' }}
            className="absolute -top-[52px] left-1/2 flex items-center gap-1.5 bg-primary text-white px-3 py-2 rounded-xl shadow-[0_8px_32px_rgba(37,99,235,0.4)] z-[1000] whitespace-nowrap"
          >
            <div className="absolute left-[calc(50%-0.5px)] -translate-x-1/2 -bottom-[6px] w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-primary" />
            <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
            <span className="text-[10px] font-black uppercase tracking-wider relative -top-[0.5px]">
              {lang === 'zh' ? '加入该组' : 'Join Group'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2px Unified Highlight Overlay (No Blur, No Flicker) */}
      <AnimatePresence>
        {showSelection && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-[-2px] border-2 rounded-[14px] pointer-events-none z-[30]"
            style={{ borderColor: context.visuals.nodeHighlightColor }}
          />
        )}
      </AnimatePresence>
      {/* 
        Precision Handles:
        We use standard React Flow handle placement with minimal styling to ensure 
        the edge engine can perfectly calculate the connection points.
      */}
      
      <Handle type="target" position={Position.Top} id="top-target" 
        className="pointer-events-auto opacity-0"
        style={{ ...getUnifiedHandleStyle(Position.Top), zIndex: 100 }} />
      <Handle type="source" position={Position.Top} id="top-source" 
        className="pointer-events-auto cursor-crosshair"
        style={{ ...getUnifiedHandleStyle(Position.Top), zIndex: 101 }}>
        {renderSourceHandleDot()}
      </Handle>
 
      <Handle type="target" position={Position.Bottom} id="bottom-target" 
        className="pointer-events-auto opacity-0"
        style={{ ...getUnifiedHandleStyle(Position.Bottom), zIndex: 100 }} />
      <Handle type="source" position={Position.Bottom} id="bottom-source" 
        className="pointer-events-auto cursor-crosshair"
        style={{ ...getUnifiedHandleStyle(Position.Bottom), zIndex: 101 }}>
        {renderSourceHandleDot()}
      </Handle>
 
      <Handle type="target" position={Position.Left} id="left-target" 
        className="pointer-events-auto opacity-0"
        style={{ ...getUnifiedHandleStyle(Position.Left), zIndex: 100 }} />
      <Handle type="source" position={Position.Left} id="left-source" 
        className="pointer-events-auto cursor-crosshair"
        style={{ ...getUnifiedHandleStyle(Position.Left), zIndex: 101 }}>
        {renderSourceHandleDot()}
      </Handle>
 
      <Handle type="target" position={Position.Right} id="right-target" 
        className="pointer-events-auto opacity-0"
        style={{ ...getUnifiedHandleStyle(Position.Right), zIndex: 100 }} />
      <Handle type="source" position={Position.Right} id="right-source" 
        className="pointer-events-auto cursor-crosshair"
        style={{ ...getUnifiedHandleStyle(Position.Right), zIndex: 101 }}>
        {renderSourceHandleDot()}
      </Handle>
      
      {/* Content Wrapper with overflow-hidden to clip internal effects */}
      <div className="w-full h-full rounded-[10px] overflow-hidden relative px-4 py-2.5">
        {/* AI Processing Shiny Effect */}
        {data.isAiProcessing && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"
          />
        )}

        {/* Large Completed Logo Background - Fixed Position relative to node box */}
        {data.status === 'completed' && context.completedStyle === 'logo' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, rotate: -30 }}
            animate={{ opacity: 1, scale: 1, rotate: -12 }}
            className="absolute -bottom-6 -right-6 text-green-500/10 pointer-events-none z-0"
          >
            <CheckCircle2 className="w-32 h-32" />
          </motion.div>
        )}
        
        <div 
          ref={isEditing ? editContainerRef : null} 
          className="flex flex-col h-full gap-1.5 relative z-10" 
          onClick={isEditing ? (e) => e.stopPropagation() : undefined}
        >
          {/* Header: Icon + Type Label */}
          <div className="relative">
            <div className="flex items-center gap-2 pr-[116px]">
              <div 
                onClick={(e) => {
                  if (!selected) return;
                  e.stopPropagation(); // Prevents deselecting the node
                  
                  const types = ['planning', 'execution', 'verification'] as const;
                  const nextType = types[(types.indexOf((isEditing ? editType : data.type) as any) + 1) % types.length];
                  
                  if (isEditing) {
                    setEditType(nextType);
                    // Smart update label if it's currently a default name
                    const currentTypeName = getDisplayType(editType, lang);
                    if (!editTypeLabel || editTypeLabel === currentTypeName) {
                      setEditTypeLabel(getDisplayType(nextType, lang));
                    }
                  } else {
                    // Direct update if just selected
                    data.onUpdateData?.(id, { type: nextType });
                  }
                }}
                className="cursor-pointer hover:scale-110 active:scale-95 transition-transform p-1 -m-1"
                title={lang === 'zh' ? '点击切换节点类型' : 'Click to cycle node type'}
              >
                {data.isAiProcessing ? (
                  <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />
                ) : (
                  getIcon(isEditing ? editType : data.type, themeMode, data.color)
                )}
              </div>
              <div className="flex items-center min-w-0 h-4">
                {isEditing ? (
                  <div className="min-w-0">
                  <input
                    value={editTypeLabel || getDisplayType(editType, lang)}
                    onChange={(e) => setEditTypeLabel(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    style={{ fontFamily: 'inherit' }}
                    className="text-[11px] bg-transparent outline-none p-0 m-0 nodrag nowheel font-bold uppercase tracking-wider text-neutral-500 border-none w-full leading-4 h-4 flex items-center"
                  />
                  </div>
                ) : (
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 truncate max-w-[120px] leading-4 h-4 flex items-center">
                    {editTypeLabel || displayType}
                  </span>
                )}
              </div>
            </div>
            <motion.div
              initial={false}
              animate={{ width: selected ? 112 : 32 }}
              transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.78 }}
              className="absolute right-0 top-0 flex items-center justify-end shrink-0 h-8"
            >
              <motion.button
                initial={false}
                animate={{
                  opacity: selected ? 1 : 0,
                  scale: selected ? 1 : 0.45,
                  rotate: selected ? 0 : -90,
                  filter: selected ? 'blur(0px)' : 'blur(4px)',
                }}
                transition={{ type: 'spring', stiffness: 460, damping: 30, mass: 0.74 }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!hasEnabledNodeTools) return;
                  setShowToolbar((v) => !v);
                }}
                className={`absolute right-[72px] z-[5] h-8 w-8 rounded-full shadow-[0_10px_24px_-12px_rgba(15,23,42,0.35)] backdrop-blur-sm transition-colors flex items-center justify-center ${
                  themeMode === 'dark'
                    ? `border border-white/10 bg-[#15243a]/92 ${
                        hasEnabledNodeTools ? 'hover:bg-[#1b2f4c] cursor-pointer' : 'cursor-not-allowed opacity-60'
                      } ${showToolbar ? 'text-primary shadow-[0_10px_24px_-12px_rgba(37,99,235,0.55)]' : 'text-slate-300'}`
                    : `ring-1 ring-black/10 bg-white/92 ${
                        hasEnabledNodeTools ? 'hover:bg-white cursor-pointer' : 'cursor-not-allowed opacity-60'
                      } ${showToolbar ? 'text-primary ring-primary/20' : 'text-neutral-500'}`
                }`}
                style={{ pointerEvents: selected ? 'auto' : 'none' }}
                title={
                  hasEnabledNodeTools
                    ? (lang === 'zh' ? '工具' : 'Tools')
                    : (lang === 'zh' ? '请先在设置中启用至少一个工具' : 'Enable at least one tool in settings')
                }
              >
                <Wrench className="w-3.5 h-3.5" />
              </motion.button>

              <motion.button
                initial={false}
                animate={{
                  opacity: selected ? 1 : 0,
                  scale: selected ? 1 : 0.45,
                  rotate: selected ? 0 : -90,
                  filter: selected ? 'blur(0px)' : 'blur(4px)',
                }}
                transition={{ type: 'spring', stiffness: 460, damping: 30, mass: 0.74 }}
                onClick={(e) => { e.stopPropagation(); data.onAddNode?.(e as any, id, 'bottom'); }}
                className={`absolute right-[36px] z-[5] h-8 w-8 rounded-full text-primary shadow-[0_10px_24px_-12px_rgba(37,99,235,0.65)] backdrop-blur-sm transition-colors flex items-center justify-center cursor-pointer ${
                  themeMode === 'dark'
                    ? 'border border-primary/25 bg-[#15243a]/92 hover:bg-[#1b2f4c]'
                    : 'bg-white/92 ring-1 ring-primary/15 hover:bg-white'
                }`}
                style={{ pointerEvents: selected ? 'auto' : 'none' }}
                title={lang === 'zh' ? '添加子节点' : 'Add child node'}
              >
                <Plus className="w-3.5 h-3.5" />
              </motion.button>

              <motion.button
                initial={false}
                onClick={toggleStatus}
                whileTap={{ scale: 0.94 }}
                className={`relative z-10 h-8 w-8 rounded-full shadow-sm backdrop-blur-sm flex items-center justify-center cursor-pointer hover:shadow-md transition-shadow ${
                  themeMode === 'dark'
                    ? 'border border-white/10 bg-[#15243a]/88'
                    : 'ring-1 ring-black/5 bg-white/88'
                }`}
                title={lang === 'zh' ? '切换状态' : 'Toggle status'}
              >
                {statusIcons[data.status]}
              </motion.button>
            </motion.div>
          </div>

          {/* Content: Title + Description */}
          <div className="flex-grow overflow-hidden">
            {isEditing ? (
              <div className="flex flex-col gap-1">
                <input
                  ref={titleRef}
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  onBlur={handleBlur}
                  onKeyDown={handleKeyDown}
                  placeholder={lang === 'zh' ? '输入标题...' : 'Enter title...'}
                  style={{ fontFamily: 'inherit' }}
                  className="w-full bg-primary/5 rounded outline-none text-sm font-bold text-neutral-800 leading-tight p-0 nodrag nowheel"
                />
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  onBlur={handleBlur}
                  onKeyDown={handleKeyDown}
                  placeholder={lang === 'zh' ? '输入描述...' : 'Enter description...'}
                  style={{ fontFamily: 'inherit' }}
                  className="w-full bg-primary/5 rounded outline-none text-[11px] text-neutral-500 resize-none p-0 h-[3.2em] leading-relaxed nodrag nowheel"
                />
              </div>
            ) : (
              <>
                <h3 className={`font-bold text-sm leading-tight line-clamp-1 ${!data.label ? 'text-neutral-400' : 'text-neutral-800'}`}>
                  {data.label || (lang === 'zh' ? '输入标题...' : 'Enter title...')}
                </h3>
                <p className={`text-[11px] mt-1 line-clamp-2 leading-relaxed ${!data.description ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  {data.description || (lang === 'zh' ? '输入描述...' : 'Enter description...')}
                </p>
              </>
            )}
          </div>

          {/* Footer: Module (Category) section - Only show if editing or has value */}
          {(isEditing || data.category || scheduleSummary || hasTable || hasDocument) && (
            <div className="mt-auto flex items-center gap-1.5 pb-1 h-5">
              {(isEditing || data.category) ? (
                <div className="flex-1 min-w-0 h-5 flex items-center">
                    {isEditing ? (
                      <div
                        className={`inline-flex h-5 min-w-0 max-w-full items-center rounded-full border px-2.5 shadow-[0_6px_16px_-10px_rgba(15,23,42,0.45)] ring-1 backdrop-blur-sm ${
                          activeColorStyle
                            ? `${activeColorStyle.bg} ${activeColorStyle.border} ring-white/35`
                            : themeMode === 'dark'
                              ? 'border-white/15 bg-white/12 ring-white/10'
                              : 'border-black/5 bg-white/90 ring-white/80'
                        }`}
                      >
                        <input
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          onBlur={handleBlur}
                          onKeyDown={handleKeyDown}
                          placeholder={lang === 'zh' ? '所属模块...' : 'Module...'}
                          style={{ fontFamily: 'inherit' }}
                          className={`text-[10px] bg-transparent outline-none p-0 m-0 nodrag nowheel font-black tracking-[0.12em] border-none w-full leading-5 h-5 flex items-center ${
                            activeColorStyle ? activeColorStyle.textDark : themeMode === 'dark' ? 'text-neutral-100' : 'text-neutral-600'
                          }`}
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => e.stopPropagation()}
                        className={`inline-flex h-5 min-w-0 max-w-full items-center rounded-full border px-2.5 text-[10px] font-black tracking-[0.12em] shadow-[0_6px_16px_-10px_rgba(15,23,42,0.45)] ring-1 backdrop-blur-sm ${
                          activeColorStyle
                            ? `${activeColorStyle.bg} ${activeColorStyle.border} ${activeColorStyle.textDark} ring-white/35`
                            : themeMode === 'dark'
                              ? 'border-white/15 bg-white/12 text-neutral-100 ring-white/10'
                              : 'border-black/5 bg-white/90 text-neutral-600 ring-white/80'
                        }`}
                      >
                        <span className="truncate">{data.category}</span>
                      </button>
                    )}
                  </div>
              ) : (
                <div className="flex-1" />
              )}
              <div className="flex items-center gap-1 shrink-0">
                {scheduleSummary && (
                  <div className={`inline-flex h-4 items-center gap-0.5 rounded-full px-1.5 text-[8px] font-bold shadow-sm backdrop-blur-sm ${
                    themeMode === 'dark'
                      ? 'border border-white/10 bg-[#15243a]/82 text-slate-300'
                      : 'bg-white/75 text-neutral-500 ring-1 ring-black/5'
                  }`}>
                    <Clock3 className="w-2.5 h-2.5" />
                    <span>{scheduleSummary}</span>
                  </div>
                )}
                {hasTable && (
                  <div className={`flex h-4 w-4 items-center justify-center rounded-full ${
                    themeMode === 'dark'
                      ? 'border border-white/10 bg-[#15243a]/78 text-slate-300'
                      : 'bg-white/70 text-neutral-500 ring-1 ring-black/5'
                  }`} title={lang === 'zh' ? '表格' : 'Table'}>
                    <Table2 className="w-2.5 h-2.5" />
                  </div>
                )}
                {hasDocument && (
                  <div className={`flex h-4 w-4 items-center justify-center rounded-full ${
                    themeMode === 'dark'
                      ? 'border border-white/10 bg-[#15243a]/78 text-slate-300'
                      : 'bg-white/70 text-neutral-500 ring-1 ring-black/5'
                  }`} title={lang === 'zh' ? '文档' : 'Document'}>
                    <FileText className="w-2.5 h-2.5" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
