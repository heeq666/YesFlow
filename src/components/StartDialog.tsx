import { ArrowRight, AlertTriangle, Loader2, Send, Sparkles, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { TaskMode } from '../types';
import { estimateTokens, getCharCountColor } from '../utils/nodeUtils';

type ViewportRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

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
  onPrepareGenerate?: () => void;
  targetRecordRect?: ViewportRect | null;
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
  onPrepareGenerate,
  targetRecordRect,
  onGenerate,
  onAbort,
  onClose,
}: StartDialogProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const morphTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [transitionPhase, setTransitionPhase] = useState<'idle' | 'fade' | 'morph'>('idle');
  const [morphRects, setMorphRects] = useState<{ source: ViewportRect; target: ViewportRect } | null>(null);

  const clearTransitionTimers = useCallback(() => {
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
    if (morphTimerRef.current) {
      clearTimeout(morphTimerRef.current);
      morphTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTransitionTimers(), [clearTransitionTimers]);

  useEffect(() => {
    if (visible) return;
    clearTransitionTimers();
    setTransitionPhase('idle');
    setMorphRects(null);
  }, [visible, clearTransitionTimers]);

  const isGenerateTransitioning = transitionPhase !== 'idle';

  const handleGenerate = useCallback(() => {
    if (!prompt.trim() || isLoading || isGenerateTransitioning) return;

    onPrepareGenerate?.();

    const panelRect = panelRef.current?.getBoundingClientRect();
    if (!panelRect) {
      onGenerate();
      return;
    }

    const sourceRect: ViewportRect = {
      x: panelRect.left,
      y: panelRect.top,
      width: panelRect.width,
      height: panelRect.height,
    };

    const fallbackWidth = Math.min(348, panelRect.width);
    const fallbackTarget: ViewportRect = {
      x: panelRect.left + (panelRect.width - fallbackWidth) / 2,
      y: panelRect.top + panelRect.height * 0.36,
      width: fallbackWidth,
      height: 68,
    };

    setMorphRects({
      source: sourceRect,
      target: targetRecordRect ?? fallbackTarget,
    });
    setTransitionPhase('fade');

    clearTransitionTimers();
    fadeTimerRef.current = setTimeout(() => {
      setTransitionPhase('morph');
    }, 150);
    morphTimerRef.current = setTimeout(() => {
      onGenerate();
      clearTransitionTimers();
      setTransitionPhase('idle');
      setMorphRects(null);
    }, 570);
  }, [prompt, isLoading, isGenerateTransitioning, onPrepareGenerate, onGenerate, targetRecordRect, clearTransitionTimers]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="start-dialog"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        >
          {/* 背景模糊层 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isGenerateTransitioning ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute inset-0 bg-white/40 backdrop-blur-xl"
            onClick={() => {
              if (!isGenerateTransitioning) onClose();
            }}
          />

          <motion.div
            ref={panelRef}
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={isGenerateTransitioning ? { scale: 0.94, opacity: 0, y: 24 } : { scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ duration: isGenerateTransitioning ? 0.16 : 0.3, ease: [0.32, 0.72, 0, 1] }}
            className="relative bg-white shadow-[0_32px_128px_-32px_rgba(0,0,0,0.25)] border border-neutral-100 overflow-hidden w-full max-w-[42rem] rounded-[2.5rem]"
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
                  <div className="absolute right-6 bottom-6 flex gap-3 items-center">
                    {prompt.trim() && (isLoading ? (
                      <button
                        onClick={onAbort}
                        disabled={isGenerateTransitioning}
                        className="px-6 py-3 bg-red-500 text-white rounded-2xl text-sm font-bold hover:bg-red-600 transition-all shadow-xl flex items-center gap-2 animate-pulse"
                      >
                        <X className="w-4 h-4" />
                        {language === 'zh' ? '停止生成' : 'Stop'}
                      </button>
                    ) : (
                      <button
                        onClick={handleGenerate}
                        disabled={isGenerateTransitioning}
                        className="px-6 py-3 bg-neutral-900 text-white rounded-2xl text-sm font-bold hover:bg-black transition-all shadow-xl flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <Send className="w-4 h-4" />
                        {isGenerateTransitioning
                          ? (language === 'zh' ? '进入生成中...' : 'Starting...')
                          : generateLabel}
                      </button>
                    ))}
                  </div>
                  {prompt.length > 0 && (
                    <div className={`absolute left-6 bottom-3 flex items-center gap-2 ${getCharCountColor(prompt.length).textClass}`}>
                      <span className="text-xs font-mono">
                        {prompt.length.toLocaleString()} chars · ~{estimateTokens(prompt).toLocaleString()} tokens
                      </span>
                      {prompt.length > 4000 && (
                        <span className="flex items-center gap-1 text-xs text-red-500 dark:text-red-400">
                          <AlertTriangle className="w-3 h-3" />
                          {language === 'zh' ? '超出限制' : 'Limit exceeded'}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-center gap-8 pt-4">
                  <button
                    onClick={() => {
                      if (!isGenerateTransitioning) onClose();
                    }}
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

          {transitionPhase === 'morph' && morphRects && (
            <motion.div
              initial={{
                left: morphRects.source.x,
                top: morphRects.source.y,
                width: morphRects.source.width,
                height: morphRects.source.height,
                borderRadius: 40,
              }}
              animate={{
                left: morphRects.target.x,
                top: morphRects.target.y,
                width: morphRects.target.width,
                height: morphRects.target.height,
                borderRadius: 12,
              }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              className="fixed z-[230] overflow-hidden border border-primary/25 bg-primary/5 p-3 shadow-[0_20px_64px_-24px_rgba(37,99,235,0.35)] pointer-events-none"
            >
              <div className="absolute inset-0 generating-shimmer" />
              <div className="relative">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                    <span className="text-xs font-bold text-primary truncate">
                      {language === 'zh' ? 'AI 正在生成计划...' : 'AI Generating...'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/55 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/55 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/55 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
                <div className="mt-1 h-6 text-[9.5px] leading-3 text-primary/75 overflow-hidden">
                  {language === 'zh' ? '正在把对话内容映射为可执行工作流...' : 'Mapping prompt into executable workflow...'}
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
