import { ArrowRight, Send, Sparkles, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import type { TaskMode } from '../types';

type StartDialogProps = {
  visible: boolean;
  language: 'zh' | 'en';
  mode: TaskMode;
  prompt: string;
  isLoading: boolean;
  title: string;
  placeholder: string;
  dailyModeLabel: string;
  professionalModeLabel: string;
  generateLabel: string;
  manualModeLabel: string;
  onModeChange: (mode: TaskMode) => void;
  onPromptChange: (prompt: string) => void;
  onGenerate: () => void;
  onAbort: () => void;
  onClose: () => void;
};

export default function StartDialog({
  visible,
  language,
  mode,
  prompt,
  isLoading,
  title,
  placeholder,
  dailyModeLabel,
  professionalModeLabel,
  generateLabel,
  manualModeLabel,
  onModeChange,
  onPromptChange,
  onGenerate,
  onAbort,
  onClose,
}: StartDialogProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-white/20 backdrop-blur-2xl"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-[0_32px_128px_-32px_rgba(0,0,0,0.25)] border border-neutral-100 overflow-hidden"
          >
            <div className="p-12 flex flex-col items-center text-center space-y-10">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/5 rounded-full text-primary text-xs font-bold uppercase tracking-[0.2em]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>YesFlow</span>
                </div>
                <h2 className="text-4xl font-extrabold text-neutral-900 tracking-tight leading-tight">
                  {title}
                </h2>
              </div>

              <div className="w-full max-w-lg space-y-6">
                <div className="flex gap-2 p-1.5 bg-neutral-100 rounded-2xl">
                  {(['daily', 'professional'] as TaskMode[]).map((nextMode) => (
                    <button
                      key={nextMode}
                      onClick={() => onModeChange(nextMode)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-extrabold transition-all ${
                        mode === nextMode
                          ? 'bg-white text-primary shadow-[0_4px_12px_-2px_rgba(0,0,0,0.05)] ring-1 ring-black/5'
                          : 'text-neutral-500 hover:text-neutral-800'
                      }`}
                    >
                      {nextMode === 'daily' ? dailyModeLabel : professionalModeLabel}
                    </button>
                  ))}
                </div>

                <div className="relative group">
                  <textarea
                    value={prompt}
                    onChange={(e) => onPromptChange(e.target.value)}
                    disabled={isLoading}
                    placeholder={placeholder}
                    className="w-full h-48 p-8 bg-neutral-50/50 border-2 border-transparent group-focus-within:border-primary/10 rounded-3xl text-lg outline-none resize-none transition-all placeholder:text-neutral-300"
                  />
                  <div className="absolute right-6 bottom-6 flex gap-3">
                    {prompt.trim() && (isLoading ? (
                      <button
                        onClick={onAbort}
                        className="px-6 py-3 bg-red-500 text-white rounded-2xl text-sm font-bold hover:bg-red-600 transition-all shadow-xl flex items-center gap-2 animate-pulse"
                      >
                        <X className="w-4 h-4" />
                        {language === 'zh' ? '停止生成' : 'Stop'}
                      </button>
                    ) : (
                      <button
                        onClick={onGenerate}
                        className="px-6 py-3 bg-neutral-900 text-white rounded-2xl text-sm font-bold hover:bg-black transition-all shadow-xl flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        {generateLabel}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-center gap-8 pt-4">
                  <button
                    onClick={onClose}
                    className="text-sm font-bold text-neutral-400 hover:text-primary transition-all flex items-center gap-2 px-6 py-3 rounded-2xl hover:bg-primary/5"
                  >
                    <ArrowRight className="w-4 h-4" />
                    {manualModeLabel}
                  </button>
                </div>
              </div>
            </div>
            <div className="h-2 w-full bg-gradient-to-r from-primary/30 via-indigo-500/30 to-violet-500/30" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
