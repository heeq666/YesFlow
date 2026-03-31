import React from 'react';
import { Handle, Position, useConnection, useStoreApi, type NodeProps } from '@xyflow/react';
import { CheckCircle2, Circle, PlayCircle, AlertCircle, ClipboardList, Zap, ShieldCheck, Layers, Plus, Loader2, Sparkles, ExternalLink, Link as LinkIcon } from 'lucide-react';
import { type TaskData, type NodeStatus } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { NodeSettingsContext } from '../contexts/NodeSettingsContext';

const statusIcons = {
  pending: <Circle className="w-5 h-5 text-neutral-300" />,
  'in-progress': <PlayCircle className="w-5 h-5 text-sky-500 animate-pulse" />,
  completed: <CheckCircle2 className="w-5 h-5 text-green-500" />,
  failed: <AlertCircle className="w-5 h-5 text-red-500" />,
};

const colorStyles: Record<string, { bg: string, border: string, text: string, textDark: string }> = {
  sky: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-500', textDark: 'text-sky-600' },
  green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-500', textDark: 'text-green-600' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-500', textDark: 'text-amber-600' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-500', textDark: 'text-indigo-600' },
  rose: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-500', textDark: 'text-rose-600' },
  teal: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-500', textDark: 'text-teal-600' },
  fuchsia: { bg: 'bg-fuchsia-50', border: 'border-fuchsia-200', text: 'text-fuchsia-500', textDark: 'text-fuchsia-600' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-500', textDark: 'text-orange-600' },
  cyan: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-500', textDark: 'text-cyan-600' },
  violet: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-500', textDark: 'text-violet-600' },
};

const getStyles = (type: string, color?: string) => {
  if (color && colorStyles[color]) {
    return `${colorStyles[color].border} ${colorStyles[color].bg}`;
  }
  const t = type.toLowerCase();
  if (t === 'planning' || t === '规划') return 'border-sky-200 bg-sky-50';
  if (t === 'execution' || t === '执行') return 'border-green-200 bg-green-50';
  if (t === 'verification' || t === '验证') return 'border-amber-200 bg-amber-50';
  return 'border-indigo-200 bg-indigo-50';
};

const getIcon = (type: string, color?: string) => {
  if (color && colorStyles[color]) {
    return <Layers className={`w-4 h-4 ${colorStyles[color].text}`} />;
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
  const store = useStoreApi();
  const [isEditing, setIsEditing] = React.useState(false);
  const [editLabel, setEditLabel] = React.useState(data.label);
  const [editDesc, setEditDesc] = React.useState(data.description);
  const [editType, setEditType] = React.useState(data.type);
  const [editTypeLabel, setEditTypeLabel] = React.useState('');
  const [editCategory, setEditCategory] = React.useState(data.category || '');
  const titleRef = React.useRef<HTMLInputElement>(null);
  const editContainerRef = React.useRef<HTMLDivElement>(null);
  const [isLinksOpen, setIsLinksOpen] = React.useState(false);

  const links = React.useMemo(() => {
    const combinedText = `${data.label} ${data.description}`;
    const matches = combinedText.match(/https?:\/\/[^\s]+/g);
    return matches ? Array.from(new Set(matches)) : [];
  }, [data.label, data.description]);

  const lang = data.language || 'zh';
  const displayType = getDisplayType(data.type, lang, data.typeLabel);

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

  const [isHovered, setIsHovered] = React.useState(false);
  const connection = useConnection();
  const isTargetNode = connection.inProgress && isHovered && connection.fromNode?.id !== id;
  const showSelection = selected;

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      animate={{ 
        scale: data.isAiProcessing ? 1.02 : 1, 
        opacity: 1,
        borderColor: data.isAiProcessing ? '#8b5cf6' : undefined
      }}
      onDoubleClick={handleDoubleClick}
      className={`relative group border-2 transition-[border-color,opacity,background-color,box-shadow] duration-200 w-[260px] h-[140px] rounded-xl ${getStyles(isEditing ? editType : data.type, data.color)} ${data.status === 'completed' && context.completedStyle === 'classic' ? 'opacity-75 grayscale-[0.2]' : ''}`}
    >
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
        style={{ top: 0, left: '50%', transform: 'translateX(-50%)', width: 12, height: 12, background: 'transparent', border: 'none', zIndex: 50 }} />
      <Handle type="source" position={Position.Top} id="top-source" 
        className={`${!showSelection ? 'opacity-0' : 'opacity-100 cursor-crosshair'} pointer-events-auto transition-opacity duration-200`}
        style={{ top: 0, left: '50%', transform: 'translateX(-50%)', width: 12, height: 12, background: 'transparent', border: 'none', zIndex: 51 }}>
        <div className="w-4 h-4 -mt-2 border-2 border-white rounded-full shadow-sm" style={{ backgroundColor: context.visuals.handleColor }} />
      </Handle>

      <Handle type="target" position={Position.Bottom} id="bottom-target" 
        style={{ bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 12, height: 12, background: 'transparent', border: 'none', zIndex: 50 }} />
      <Handle type="source" position={Position.Bottom} id="bottom-source" 
        className={`${!showSelection ? 'opacity-0' : 'opacity-100 cursor-crosshair'} pointer-events-auto transition-opacity duration-200`}
        style={{ bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 12, height: 12, background: 'transparent', border: 'none', zIndex: 51 }}>
        <div className="w-4 h-4 mt-2 border-2 border-white rounded-full shadow-sm" style={{ backgroundColor: context.visuals.handleColor }} />
      </Handle>

      <Handle type="target" position={Position.Left} id="left-target" 
        style={{ left: 0, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, background: 'transparent', border: 'none', zIndex: 50 }} />
      <Handle type="source" position={Position.Left} id="left-source" 
        className={`${!showSelection ? 'opacity-0' : 'opacity-100 cursor-crosshair'} pointer-events-auto transition-opacity duration-200`}
        style={{ left: 0, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, background: 'transparent', border: 'none', zIndex: 51 }}>
        <div className="w-4 h-4 -ml-2 border-2 border-white rounded-full shadow-sm" style={{ backgroundColor: context.visuals.handleColor }} />
      </Handle>

      <Handle type="target" position={Position.Right} id="right-target" 
        style={{ right: 0, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, background: 'transparent', border: 'none', zIndex: 50 }} />
      <Handle type="source" position={Position.Right} id="right-source" 
        className={`${!showSelection ? 'opacity-0' : 'opacity-100 cursor-crosshair'} pointer-events-auto transition-opacity duration-200`}
        style={{ right: 0, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, background: 'transparent', border: 'none', zIndex: 51 }}>
        <div className="w-4 h-4 ml-2 border-2 border-white rounded-full shadow-sm" style={{ backgroundColor: context.visuals.handleColor }} />
      </Handle>
      
      {/* Content Wrapper with overflow-hidden to clip internal effects */}
      <div className="w-full h-full rounded-[10px] overflow-hidden relative px-4 py-3">
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
          className="flex flex-col h-full gap-2 relative z-10" 
          onClick={isEditing ? (e) => e.stopPropagation() : undefined}
        >
          {/* Header: Icon + Type Label */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
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
                  getIcon(isEditing ? editType : data.type, data.color)
                )}
              </div>
              <div className="flex items-center min-w-0 h-4">
                {isEditing ? (
                  <input
                    value={editTypeLabel || getDisplayType(editType, lang)}
                    onChange={(e) => setEditTypeLabel(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    style={{ fontFamily: 'inherit' }}
                    className="text-[11px] bg-transparent outline-none p-0 m-0 nodrag nowheel font-bold uppercase tracking-wider text-neutral-500 border-none w-full leading-4 h-4 flex items-center"
                  />
                ) : (
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 truncate max-w-[120px] leading-4 h-4 flex items-center">
                    {editTypeLabel || displayType}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
               {selected && (
                 <button 
                   onClick={(e) => { e.stopPropagation(); data.onAddNode?.(e as any, id, 'bottom'); }} 
                   className="hover:scale-110 active:scale-95 transition-all cursor-pointer p-1 -m-1 text-neutral-400 hover:text-primary group/plus"
                   title={lang === 'zh' ? '添加子节点' : 'Add child node'}
                 >
                   <Plus className="w-5 h-5 group-hover/plus:rotate-90 transition-transform duration-300" />
                 </button>
               )}
               <button onClick={toggleStatus} className="hover:scale-110 transition-transform cursor-pointer">
                 {statusIcons[data.status]}
               </button>
            </div>
          </div>

          {/* Content: Title + Description */}
          <div className="mt-1 flex-grow overflow-hidden">
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
          {(isEditing || data.category) && (
            <div className="flex items-center gap-1.5 mt-auto pb-1 h-4">
              <Layers className={`w-3 h-3 ${data.color && colorStyles[data.color] ? colorStyles[data.color].text : 'text-neutral-400'}`} />
              <div className="flex-1 min-w-0 h-4 flex items-center">
                {isEditing ? (
                  <input
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    placeholder={lang === 'zh' ? '所属模块...' : 'Module...'}
                    style={{ fontFamily: 'inherit' }}
                    className="text-[10px] bg-transparent outline-none p-0 m-0 nodrag nowheel font-bold uppercase tracking-wider text-neutral-400 border-none w-full leading-4 h-4 flex items-center"
                  />
                ) : (
                  <span className={`text-[10px] font-bold uppercase tracking-wider truncate select-none leading-4 h-4 flex items-center ${data.color && colorStyles[data.color] ? colorStyles[data.color].textDark : 'text-neutral-400'}`}>
                    {data.category}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* External Links Button - Moved outside overflow-hidden wrapper to prevent clipping */}
      {!isEditing && links.length > 0 && (
        <div 
          className="absolute bottom-3 right-4 flex flex-col items-end gap-2 z-[60]"
          onMouseLeave={() => setIsLinksOpen(false)}
        >
           <AnimatePresence>
             {isLinksOpen && links.length > 1 && (
               <motion.div
                 initial={{ opacity: 0, y: 10, scale: 0.9 }}
                 animate={{ opacity: 1, y: 0, scale: 1 }}
                 exit={{ opacity: 0, y: 10, scale: 0.9 }}
                 className="bg-white/90 backdrop-blur-xl border border-neutral-200 rounded-2xl shadow-2xl p-2 min-w-[180px] mb-1 overflow-hidden"
               >
                 <div className="text-[9px] font-black text-neutral-400 uppercase tracking-widest px-2 py-1 mb-1 border-b border-neutral-100">{lang === 'zh' ? '选择访问链接' : 'Select Link'}</div>
                 <div className="max-h-[120px] overflow-y-auto custom-scrollbar flex flex-col gap-0.5">
                   {links.map((link, i) => (
                     <button
                       key={i}
                       onClick={(e) => { e.stopPropagation(); window.open(link, '_blank'); setIsLinksOpen(false); }}
                       className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-primary/5 hover:text-primary transition-all flex items-center gap-2 group/item"
                     >
                       <LinkIcon className="w-3 h-3 shrink-0 opacity-40 group-hover/item:opacity-100" />
                       <span className="text-[10px] font-bold truncate flex-1">{link.replace(/^https?:\/\/(www\.)?/, '')}</span>
                     </button>
                   ))}
                 </div>
               </motion.div>
             )}
           </AnimatePresence>

           <motion.button
             whileHover={{ scale: 1.1 }}
             whileTap={{ scale: 0.9 }}
             onClick={(e) => {
                e.stopPropagation();
                if (links.length === 1) {
                  window.open(links[0], '_blank');
                } else {
                  setIsLinksOpen(!isLinksOpen);
                }
             }}
             onMouseEnter={() => links.length > 1 && setIsLinksOpen(true)}
             className={`p-2 rounded-full shadow-lg border transition-all flex items-center justify-center ${isLinksOpen ? 'bg-primary border-primary text-white' : 'bg-white/80 backdrop-blur-md border-neutral-200 text-neutral-500 hover:text-primary hover:border-primary/30'}`}
             title={links.length === 1 ? (lang === 'zh' ? '访问链接' : 'Visit Link') : (lang === 'zh' ? '查看链接列表' : 'View Links')}
           >
             <ExternalLink className="w-3.5 h-3.5" />
             {links.length > 1 && <span className="absolute -top-1 -right-1 bg-primary text-white text-[8px] w-4 h-4 rounded-full border-2 border-white flex items-center justify-center font-bold">{links.length}</span>}
           </motion.button>
        </div>
      )}
    </motion.div>
  );
}
