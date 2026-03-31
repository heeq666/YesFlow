import type React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, Check, LayoutDashboard, Loader2, MousePointer2, Redo2, Save, Trash2, Undo2, X } from 'lucide-react';

import { matchesHotkey } from '../lib/hotkeys';
import type { HotkeyConfig } from '../types';

type StatusNote = {
  text: string;
  icon: React.ReactNode;
} | null;

type StatusIndicatorsProps = {
  isSidebarOpen: boolean;
  language: 'zh' | 'en';
  settings: { hotkeys: HotkeyConfig };
  activeKeys: Set<string>;
  isPanActive: boolean;
  isSelectActive: boolean;
  statusNote: StatusNote;
  importStatus: 'idle' | 'loading' | 'success' | 'error';
  importMessage: string;
  onDismissImport: () => void;
};

export default function StatusIndicators({
  isSidebarOpen,
  language,
  settings,
  activeKeys,
  isPanActive,
  isSelectActive,
  statusNote,
  importStatus,
  importMessage,
  onDismissImport,
}: StatusIndicatorsProps) {
  const items = [
    { key: 'pan', label: language === 'zh' ? '平移' : 'Pan', icon: <LayoutDashboard className="w-3.5 h-3.5" />, active: isPanActive, hotkey: settings.hotkeys.pan },
    { key: 'select', label: language === 'zh' ? '多选' : 'Select', icon: <MousePointer2 className="w-3.5 h-3.5" />, active: isSelectActive, hotkey: settings.hotkeys.select },
    { key: 'undo', label: language === 'zh' ? '撤销' : 'Undo', icon: <Undo2 className="w-3.5 h-3.5" />, active: matchesHotkey(settings.hotkeys.undo, activeKeys), hotkey: settings.hotkeys.undo },
    { key: 'redo', label: language === 'zh' ? '重做' : 'Redo', icon: <Redo2 className="w-3.5 h-3.5" />, active: matchesHotkey(settings.hotkeys.redo, activeKeys), hotkey: settings.hotkeys.redo },
    { key: 'save', label: language === 'zh' ? '保存' : 'Save', icon: <Save className="w-3.5 h-3.5" />, active: matchesHotkey(settings.hotkeys.save, activeKeys), hotkey: settings.hotkeys.save },
    { key: 'delete', label: language === 'zh' ? '删除' : 'Delete', icon: <Trash2 className="w-3.5 h-3.5" />, active: matchesHotkey(settings.hotkeys.delete, activeKeys), hotkey: settings.hotkeys.delete },
  ];

  return (
    <motion.div
      initial={false}
      animate={{ left: isSidebarOpen ? 404 : 24 }}
      className="absolute bottom-6 z-[100] flex flex-col-reverse gap-3 items-start pointer-events-none"
    >
      <AnimatePresence mode="popLayout">
        {items.map((item) => {
          if (!item.active) return null;

          return (
            <motion.div
              key={item.key}
              layout
              initial={{ opacity: 0, x: -20, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -10, scale: 0.8 }}
              className="flex items-center gap-3 px-4 py-2.5 bg-primary border border-primary/20 text-white rounded-[1.25rem] shadow-xl shadow-primary/20"
            >
              <div className="p-1.5 bg-white/20 border border-white/20 rounded-lg">
                {item.icon}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest leading-none mb-0.5">{item.hotkey}</span>
                <span className="text-[9px] font-bold opacity-80 leading-none">{item.label}</span>
              </div>
            </motion.div>
          );
        })}

        {statusNote && (
          <motion.div
            key="status"
            layout
            initial={{ opacity: 0, x: -20, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: -10, scale: 0.95 }}
            className="flex items-center gap-3 px-5 py-3 bg-neutral-900 text-white rounded-[1.25rem] shadow-2xl border border-white/10 backdrop-blur-xl pointer-events-auto"
          >
            <div className="bg-white/10 p-1.5 rounded-lg">{statusNote.icon}</div>
            <span className="text-xs font-bold tracking-tight">{statusNote.text}</span>
          </motion.div>
        )}

        {importStatus !== 'idle' && (
          <motion.div
            key="import"
            layout
            initial={{ opacity: 0, x: -20, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: -10, scale: 0.95 }}
            className={`flex items-center gap-3 px-5 py-3 rounded-[1.25rem] border shadow-2xl backdrop-blur-xl pointer-events-auto ${importStatus === 'success' ? 'bg-green-500 text-white border-green-400' : importStatus === 'error' ? 'bg-red-500 text-white border-red-400' : 'bg-white text-neutral-800 border-neutral-200'}`}
          >
            {importStatus === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
            {importStatus === 'success' && <Check className="w-5 h-5" />}
            {importStatus === 'error' && <AlertCircle className="w-5 h-5" />}
            <span className="text-xs font-bold">{importMessage}</span>
            {importStatus !== 'loading' && (
              <button onClick={onDismissImport} className="p-1 hover:bg-black/10 rounded-lg transition-colors ml-2">
                <X className="w-3.5 h-3.5 opacity-70" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
