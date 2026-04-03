import { AnimatePresence, motion } from 'motion/react';
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  AlertTriangle,
  Layers,
  Loader2,
  Rows,
  Sparkles,
  SplitSquareHorizontal,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import type { Node } from '@xyflow/react';
import { estimateTokens, getCharCountColor } from '../utils/nodeUtils';

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
  onGroup: () => void;
  onUngroup: (groupId: string) => void;
  onExitSelectedFromGroup: () => void;
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
  onGroup,
  onUngroup,
  onExitSelectedFromGroup,
}: ContextualToolbarProps) {
  if (selectedNodes.length === 0) return null;

  const hasSelectedNodesInGroup = selectedNodes.some((node) => node.type !== 'group' && Boolean(node.parentId));
  const primaryActionClass = 'h-10 inline-flex items-center gap-1.5 px-3 rounded-xl text-xs font-bold leading-none text-white bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-500 transition-all shadow-[0_12px_28px_-16px_rgba(37,99,235,0.9)]';
  const secondaryActionClass = 'h-10 inline-flex items-center gap-1.5 px-3 rounded-xl text-xs font-bold leading-none bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:bg-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all shadow-sm';
  const ghostIconClass = 'p-2 rounded-xl text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors';

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
              className="w-80 overflow-hidden bg-neutral-50 rounded-2xl border border-neutral-200 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.45)] p-3 flex flex-col gap-2 mb-1"
            >
              <textarea
                value={decomposePrompt}
                onChange={(e) => onDecomposePromptChange(e.target.value)}
                placeholder={language === 'zh' ? '输入拆解需求...' : 'Enter decomposition goal...'}
                className="w-full px-3 py-2 text-xs bg-white border border-neutral-200 rounded-xl outline-none h-16 resize-none font-medium"
                autoFocus
              />
              <div className="flex items-center justify-between px-1">
                <span className={`text-[10px] font-mono ${getCharCountColor(decomposePrompt.length).textClass}`}>
                  {decomposePrompt.length} chars · ~{estimateTokens(decomposePrompt)} tokens
                </span>
                {decomposePrompt.length > 4000 && (
                  <span className="flex items-center gap-1 text-[10px] text-red-500 dark:text-red-400">
                    <AlertTriangle className="w-3 h-3" />
                    {language === 'zh' ? '超出限制' : 'Limit exceeded'}
                  </span>
                )}
              </div>
              <button
                onClick={onRunDecompose}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-500 transition-all shadow-[0_16px_30px_-18px_rgba(37,99,235,0.95)]"
              >
                {isNodeAiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                {language === 'zh' ? '执行拆解' : 'Execute Decompose'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-[0_28px_80px_-36px_rgba(15,23,42,0.35)] dark:shadow-[0_28px_80px_-36px_rgba(0,0,0,0.5)] px-6 py-3 rounded-[2rem] flex items-center gap-6">
          {selectedNodes.length === 1 && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 pr-4 border-r border-neutral-100">
                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{language === 'zh' ? '节点 AI' : 'Node AI'}</span>
              </div>
              {isNodeAiLoading ? (
                <button onClick={onAbort} className="flex items-center gap-1.5 px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-all shadow-[0_12px_28px_-18px_rgba(239,68,68,0.95)]">
                  <X className="w-3.5 h-3.5" />
                  {language === 'zh' ? '中止生成' : 'Stop'}
                </button>
              ) : (
                <button onClick={onGenerateGroupTasks} className={`${primaryActionClass} ml-1`}>
                  <Sparkles className="w-3.5 h-3.5" />
                  {language === 'zh' ? 'AI优化' : 'AI Optimize'}
                </button>
              )}
              <button
                onClick={onToggleDecompose}
                title={language === 'zh' ? '任务拆解' : 'Decompose'}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  showDecomposeInput
                    ? 'bg-primary/12 text-primary ring-1 ring-primary/15'
                    : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 shadow-sm'
                }`}
              >
                <SplitSquareHorizontal className="w-3.5 h-3.5" />
                {language === 'zh' ? '任务拆解' : 'Decompose'}
              </button>
              <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-700 mx-2" />
              {selectedNodes[0].type === 'group' ? (
                <button 
                  onClick={() => onUngroup(selectedNodes[0].id)} 
                  className={secondaryActionClass}
                >
                  <X className="w-3.5 h-3.5" />
                  {language === 'zh' ? '解除编组' : 'Ungroup'}
                </button>
              ) : (
                <>
                  {hasSelectedNodesInGroup && (
                    <button
                      onClick={onExitSelectedFromGroup}
                      title={language === 'zh' ? '退出编组' : 'Exit Group'}
                      className={secondaryActionClass}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      {language === 'zh' ? '退出编组' : 'Exit Group'}
                    </button>
                  )}
                  <button onClick={onDeleteSelectedSingle} title={language === 'zh' ? '删除节点' : 'Delete node'} className={ghostIconClass}><Trash2 className="w-4 h-4" /></button>
                </>
              )}
            </div>
          )}

          {selectedNodes.length > 1 && (
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 border-r border-neutral-200 dark:border-neutral-700 pr-6">
                <div className="flex flex-col items-center leading-none mr-2 bg-primary/10 dark:bg-primary/30 text-primary dark:text-blue-400 px-2.5 py-1.5 rounded-lg ring-1 ring-primary/10 dark:ring-primary/20">
                  <span className="text-[10px] font-black">{selectedNodes.length}</span>
                  <span className="text-[6px] font-black uppercase tracking-tighter mt-0.5 opacity-70">{language === 'zh' ? '节点' : 'Nodes'}</span>
                </div>
                <button onClick={() => onAlignNodes('horizontal')} title={language === 'zh' ? '水平居中对齐' : 'Horizontal Align Center'} className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400 transition-colors"><AlignCenterHorizontal className="w-4 h-4" /></button>
                <button onClick={() => onAlignNodes('vertical')} title={language === 'zh' ? '垂直居中对齐' : 'Vertical Align Center'} className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400 transition-colors"><AlignCenterVertical className="w-4 h-4" /></button>
                <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-700 mx-1" />
                <button onClick={() => onDistributeNodes('horizontal')} title={language === 'zh' ? '水平平均分布' : 'Horizontal Distribute'} className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400 transition-colors"><AlignHorizontalDistributeCenter className="w-4 h-4" /></button>
                <button onClick={() => onDistributeNodes('vertical')} title={language === 'zh' ? '垂直平均分布' : 'Vertical Distribute'} className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400 transition-colors"><AlignVerticalDistributeCenter className="w-4 h-4" /></button>
                <button onClick={onAutoLayoutSelected} title={language === 'zh' ? '自动布局' : 'Auto Layout'} className="p-2 rounded-xl bg-primary/10 dark:bg-primary/30 text-primary dark:text-blue-400 hover:bg-primary/20 dark:hover:bg-primary/40 transition-colors ml-1"><Sparkles className="w-4 h-4 animate-pulse" /></button>
              </div>

              <div className="flex items-center gap-2 pr-6 border-r border-neutral-200 dark:border-neutral-700">
                {hasSelectedNodesInGroup && (
                  <button
                    onClick={onExitSelectedFromGroup}
                    title={language === 'zh' ? '退出编组' : 'Exit Group'}
                    className={secondaryActionClass}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    {language === 'zh' ? '退出编组' : 'Exit Group'}
                  </button>
                )}
                <button
                  onClick={onGroup}
                  title={language === 'zh' ? '编组节点' : 'Group Nodes'}
                  className={`${primaryActionClass} group/grp`}
                >
                  <Rows className="w-3.5 h-3.5 group-hover/grp:rotate-90 transition-transform" />
                  {language === 'zh' ? '编组节点' : 'Group Nodes'}
                </button>
              </div>

              <div className="flex items-center gap-2 pr-6 border-r border-neutral-200 dark:border-neutral-700">
                <div className="relative">
                  <input
                    type="text"
                    value={selectedPrompt}
                    onChange={(e) => onSelectedPromptChange(e.target.value)}
                    placeholder={language === 'zh' ? '批量修改...' : 'Batch modify...'}
                    className="w-56 h-10 pl-3 pr-20 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl outline-none font-medium leading-none placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex flex-col items-end justify-center leading-none">
                    <span className={`text-[9px] font-mono ${getCharCountColor(selectedPrompt.length).textClass}`}>
                      {selectedPrompt.length}/4000
                    </span>
                    {selectedPrompt.length > 4000 ? (
                      <span className="mt-1 flex items-center gap-0.5 text-[9px] text-red-500 dark:text-red-400">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        {language === 'zh' ? '超限' : 'Over'}
                      </span>
                    ) : (
                      <span className="mt-1 text-[9px] font-mono text-neutral-400 dark:text-neutral-500">
                        ~{estimateTokens(selectedPrompt)} tokens
                      </span>
                    )}
                  </div>
                </div>
                {isLoading ? (
                  <button
                    onClick={onAbort}
                    title={language === 'zh' ? '停止批量修改' : 'Stop batch update'}
                    className="h-10 shrink-0 rounded-xl px-3 text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 transition-all flex items-center justify-center gap-1.5 shadow-[0_12px_28px_-18px_rgba(239,68,68,0.45)]"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-bold">{language === 'zh' ? '停止' : 'Stop'}</span>
                  </button>
                ) : (
                  <button
                    onClick={onModifySelected}
                    title={language === 'zh' ? '批量修改选中节点' : 'Modify selected nodes'}
                    className="h-10 shrink-0 rounded-xl px-3 text-white bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-500 transition-all flex items-center justify-center gap-1.5 shadow-[0_12px_28px_-18px_rgba(37,99,235,0.95)]"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-bold">{language === 'zh' ? '执行' : 'Run'}</span>
                  </button>
                )}
              </div>

              <button
                onClick={onDeleteSelectedMany}
                title={language === 'zh' ? '删除选中节点' : 'Delete selected nodes'}
                aria-label={language === 'zh' ? '删除选中节点' : 'Delete selected nodes'}
                className="h-10 w-10 shrink-0 rounded-xl text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex items-center justify-center"
              >
                <Trash2 className="w-4 h-4" />
              </button>

            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
