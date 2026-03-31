import { AnimatePresence, motion } from 'motion/react';
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  Loader2,
  Sparkles,
  SplitSquareHorizontal,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import type { Node } from '@xyflow/react';

type ContextualToolbarProps = {
  selectedNodes: Node[];
  language: 'zh' | 'en';
  showDecomposeInput: boolean;
  decomposePrompt: string;
  onDecomposePromptChange: (value: string) => void;
  onToggleDecompose: () => void;
  onRunDecompose: () => void;
  isNodeAiLoading: boolean;
  onGenerateGroupTasks: () => void;
  onDeleteSelectedSingle: () => void;
  onAlignNodes: (direction: 'horizontal' | 'vertical') => void;
  onDistributeNodes: (direction: 'horizontal' | 'vertical') => void;
  onAutoLayoutSelected: () => void;
  selectedPrompt: string;
  onSelectedPromptChange: (value: string) => void;
  onModifySelected: () => void;
  isLoading: boolean;
  onDeleteSelectedMany: () => void;
  onAbort: () => void;
};

export default function ContextualToolbar({
  selectedNodes,
  language,
  showDecomposeInput,
  decomposePrompt,
  onDecomposePromptChange,
  onToggleDecompose,
  onRunDecompose,
  isNodeAiLoading,
  onGenerateGroupTasks,
  onDeleteSelectedSingle,
  onAlignNodes,
  onDistributeNodes,
  onAutoLayoutSelected,
  selectedPrompt,
  onSelectedPromptChange,
  onModifySelected,
  isLoading,
  onDeleteSelectedMany,
  onAbort,
}: ContextualToolbarProps) {
  if (selectedNodes.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-3 pointer-events-auto"
      >
        <AnimatePresence>
          {selectedNodes.length === 1 && showDecomposeInput && (
            <motion.div
              initial={{ height: 0, opacity: 0, y: 10 }}
              animate={{ height: 'auto', opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: 10 }}
              className="w-80 overflow-hidden bg-white/95 backdrop-blur-xl rounded-2xl border border-violet-200 shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-3 flex flex-col gap-2 mb-1"
            >
              <textarea
                value={decomposePrompt}
                onChange={(e) => onDecomposePromptChange(e.target.value)}
                placeholder={language === 'zh' ? '输入拆解需求...' : 'Enter decomposition goal...'}
                className="w-full px-3 py-2 text-xs bg-violet-50/50 border border-violet-100 rounded-xl outline-none h-16 resize-none font-medium"
                autoFocus
              />
              <button
                onClick={onRunDecompose}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-all shadow-lg"
              >
                {isNodeAiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                {language === 'zh' ? '执行拆解' : 'Execute Decompose'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-white/90 backdrop-blur-xl ring-1 ring-neutral-200 shadow-[0_32px_128px_-32px_rgba(0,0,0,0.2)] px-6 py-3 rounded-[2rem] flex items-center gap-6">
          {selectedNodes.length === 1 && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 pr-4 border-r border-neutral-100">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse ml-1" />
                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{language === 'zh' ? '节点 AI' : 'Node AI'}</span>
              </div>
              {isNodeAiLoading ? (
                <button onClick={onAbort} className="flex items-center gap-1.5 px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-all shadow-md">
                  <X className="w-3.5 h-3.5" />
                  {language === 'zh' ? '中止生成' : 'Stop'}
                </button>
              ) : (
                <button onClick={onGenerateGroupTasks} className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-violet-500 to-indigo-500 text-white rounded-xl text-xs font-bold hover:from-violet-600 hover:to-indigo-600 transition-all shadow-md ml-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  {language === 'zh' ? '深度生成' : 'AI Generate'}
                </button>
              )}
              <button
                onClick={onToggleDecompose}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${showDecomposeInput ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}
              >
                <SplitSquareHorizontal className="w-3.5 h-3.5" />
                {language === 'zh' ? '任务拆解' : 'Decompose'}
              </button>
              <div className="w-px h-6 bg-neutral-100 mx-2" />
              <button onClick={onDeleteSelectedSingle} className="p-2 text-neutral-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
          )}

          {selectedNodes.length > 1 && (
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 border-r border-neutral-100 pr-6">
                <div className="flex flex-col items-center leading-none mr-2 bg-neutral-900 px-2 py-1 rounded-lg">
                  <span className="text-[10px] font-black text-white">{selectedNodes.length}</span>
                  <span className="text-[6px] font-black text-neutral-400 uppercase tracking-tighter mt-0.5">{language === 'zh' ? '节点' : 'Nodes'}</span>
                </div>
                <button onClick={() => onAlignNodes('horizontal')} title={language === 'zh' ? '水平居中对齐' : 'Horizontal Align Center'} className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-600 transition-colors"><AlignCenterHorizontal className="w-4 h-4" /></button>
                <button onClick={() => onAlignNodes('vertical')} title={language === 'zh' ? '垂直居中对齐' : 'Vertical Align Center'} className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-600 transition-colors"><AlignCenterVertical className="w-4 h-4" /></button>
                <div className="w-px h-4 bg-neutral-100 mx-1" />
                <button onClick={() => onDistributeNodes('horizontal')} title={language === 'zh' ? '居中平均分布' : 'Horizontal Distribute'} className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-600 transition-colors"><AlignHorizontalDistributeCenter className="w-4 h-4" /></button>
                <button onClick={() => onDistributeNodes('vertical')} title={language === 'zh' ? '垂直平均分布' : 'Vertical Distribute'} className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-600 transition-colors"><AlignVerticalDistributeCenter className="w-4 h-4" /></button>
                <button onClick={onAutoLayoutSelected} title="Auto Layout" className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors ml-1"><Sparkles className="w-4 h-4 animate-pulse" /></button>
              </div>

              <div className="flex items-center gap-2 pr-6 border-r border-neutral-100">
                <textarea
                  value={selectedPrompt}
                  onChange={(e) => onSelectedPromptChange(e.target.value)}
                  placeholder={language === 'zh' ? '批量修改...' : 'Batch modify...'}
                  className="w-48 h-10 px-3 py-2.5 text-xs bg-neutral-50 border border-neutral-100 rounded-xl outline-none resize-none font-medium leading-tight"
                />
                <button
                  onClick={onModifySelected}
                  disabled={isLoading}
                  className="p-2.5 bg-neutral-900 text-white rounded-xl hover:bg-black transition-all flex items-center justify-center"
                >
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                </button>
              </div>

              <button
                onClick={onDeleteSelectedMany}
                className="px-3 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-xs font-bold flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {language === 'zh' ? '紧急清除' : 'Clean All'}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
