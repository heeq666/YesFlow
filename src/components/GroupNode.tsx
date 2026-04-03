import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { motion, AnimatePresence } from 'motion/react';
import { Layers } from 'lucide-react';
import { type GroupData, type ThemeMode } from '../types';
import { NodeSettingsContext } from '../contexts/NodeSettingsContext';
import { HANDLE_DOT_SIZE, getUnifiedHandleStyle } from '../constants/handleGeometry';

export default React.memo(function GroupNode({ id, data, selected }: NodeProps & { data: GroupData }) {
  const isDraggingOver = Boolean(data.isDraggingOver);
  const color = (data.color as string) || 'violet';
  const context = React.useContext(NodeSettingsContext);
  const handleColor = context.visuals.handleColor;
  const themeMode = context.themeMode;

  const colorStyles: Record<string, Record<ThemeMode, { bg: string; border: string; text: string; highlight: string }>> = {
    sky: {
      light: { bg: 'bg-sky-50/20', border: 'border-sky-200', text: 'text-sky-500', highlight: 'bg-sky-100/40' },
      dark: { bg: 'bg-sky-950/28', border: 'border-sky-800/70', text: 'text-sky-300', highlight: 'bg-sky-900/40' },
    },
    green: {
      light: { bg: 'bg-green-50/20', border: 'border-green-200', text: 'text-green-500', highlight: 'bg-green-100/40' },
      dark: { bg: 'bg-green-950/28', border: 'border-green-800/70', text: 'text-green-300', highlight: 'bg-green-900/40' },
    },
    amber: {
      light: { bg: 'bg-amber-50/20', border: 'border-amber-200', text: 'text-amber-500', highlight: 'bg-amber-100/40' },
      dark: { bg: 'bg-amber-950/28', border: 'border-amber-800/70', text: 'text-amber-300', highlight: 'bg-amber-900/40' },
    },
    indigo: {
      light: { bg: 'bg-indigo-50/20', border: 'border-indigo-200', text: 'text-indigo-500', highlight: 'bg-indigo-100/40' },
      dark: { bg: 'bg-indigo-950/28', border: 'border-indigo-800/70', text: 'text-indigo-300', highlight: 'bg-indigo-900/40' },
    },
    rose: {
      light: { bg: 'bg-rose-50/20', border: 'border-rose-200', text: 'text-rose-500', highlight: 'bg-rose-100/40' },
      dark: { bg: 'bg-rose-950/28', border: 'border-rose-800/70', text: 'text-rose-300', highlight: 'bg-rose-900/40' },
    },
    teal: {
      light: { bg: 'bg-teal-50/20', border: 'border-teal-200', text: 'text-teal-500', highlight: 'bg-teal-100/40' },
      dark: { bg: 'bg-teal-950/28', border: 'border-teal-800/70', text: 'text-teal-300', highlight: 'bg-teal-900/40' },
    },
    fuchsia: {
      light: { bg: 'bg-fuchsia-50/20', border: 'border-fuchsia-200', text: 'text-fuchsia-500', highlight: 'bg-fuchsia-100/40' },
      dark: { bg: 'bg-fuchsia-950/28', border: 'border-fuchsia-800/70', text: 'text-fuchsia-300', highlight: 'bg-fuchsia-900/40' },
    },
    orange: {
      light: { bg: 'bg-orange-50/20', border: 'border-orange-200', text: 'text-orange-500', highlight: 'bg-orange-100/40' },
      dark: { bg: 'bg-orange-950/28', border: 'border-orange-800/70', text: 'text-orange-300', highlight: 'bg-orange-900/40' },
    },
    cyan: {
      light: { bg: 'bg-cyan-50/20', border: 'border-cyan-200', text: 'text-cyan-500', highlight: 'bg-cyan-100/40' },
      dark: { bg: 'bg-cyan-950/28', border: 'border-cyan-800/70', text: 'text-cyan-300', highlight: 'bg-cyan-900/40' },
    },
    violet: {
      light: { bg: 'bg-violet-50/30', border: 'border-violet-200', text: 'text-violet-500', highlight: 'bg-violet-100/40' },
      dark: { bg: 'bg-violet-950/28', border: 'border-violet-800/70', text: 'text-violet-300', highlight: 'bg-violet-900/40' },
    },
  };

  const style = (colorStyles[color] || colorStyles.violet)[themeMode];

  const renderSourceHandleDot = () => (
    <span
      className={`rounded-full border-2 border-white shadow-sm transition-all duration-200 ${
        selected ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
      }`}
      style={{
        width: HANDLE_DOT_SIZE,
        height: HANDLE_DOT_SIZE,
        boxSizing: 'border-box',
        backgroundColor: handleColor,
      }}
    />
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        backgroundColor: isDraggingOver ? 'rgba(var(--primary-rgb), 0.05)' : undefined
      }}
      className={`relative w-full h-full rounded-3xl border-2 transition-[border-color,background-color] duration-200 backdrop-blur-[2px] ${style.bg} ${style.border} ${selected ? 'border-primary' : ''}`}
    >
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-[-2px] rounded-3xl border-2 pointer-events-none"
            style={{ borderColor: context.visuals.nodeHighlightColor, zIndex: 30 }}
          />
        )}
      </AnimatePresence>

      {/* Handles for Group-level connectivity */}
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        style={{ ...getUnifiedHandleStyle(Position.Top), zIndex: 100 }}
        className="pointer-events-auto opacity-0"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top-source"
        style={{ ...getUnifiedHandleStyle(Position.Top), zIndex: 101 }}
        className="pointer-events-auto"
      >
        {renderSourceHandleDot()}
      </Handle>
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-target"
        style={{ ...getUnifiedHandleStyle(Position.Bottom), zIndex: 100 }}
        className="pointer-events-auto opacity-0"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        style={{ ...getUnifiedHandleStyle(Position.Bottom), zIndex: 101 }}
        className="pointer-events-auto"
      >
        {renderSourceHandleDot()}
      </Handle>
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        style={{ ...getUnifiedHandleStyle(Position.Left), zIndex: 100 }}
        className="pointer-events-auto opacity-0"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
        style={{ ...getUnifiedHandleStyle(Position.Left), zIndex: 101 }}
        className="pointer-events-auto"
      >
        {renderSourceHandleDot()}
      </Handle>
      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
        style={{ ...getUnifiedHandleStyle(Position.Right), zIndex: 100 }}
        className="pointer-events-auto opacity-0"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        style={{ ...getUnifiedHandleStyle(Position.Right), zIndex: 101 }}
        className="pointer-events-auto"
      >
        {renderSourceHandleDot()}
      </Handle>

      {/* Top-Left Title */}
      <div className="absolute top-4 left-6 flex items-center gap-2 pointer-events-none">
        <div className={`p-1.5 rounded-lg ${style.highlight}`}>
          <Layers className={`w-3.5 h-3.5 ${style.text}`} />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">
          {data.label || (data.language === 'zh' ? '未命名组' : 'Group')}
        </span>
      </div>
      {/* Group Content Area */}
      <div className="w-full h-full min-h-[100px] min-w-[200px]" />
    </motion.div>
  );
});
