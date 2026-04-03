import React from 'react';
import { FileText } from 'lucide-react';
import type { TaskData } from '../types';
import {
  NodeToolEmptyState,
  NodeToolFieldLabel,
  NodeToolSection,
  NodeToolWorkspaceHeader,
} from './NodeToolSurface';

interface DocumentToolProps {
  language: 'zh' | 'en';
  nodeData: TaskData;
  updateNodeTools: (tools: TaskData['tools']) => void;
}

export function DocumentToolEmpty({ language, onActivate }: { language: 'zh' | 'en'; onActivate: () => void }) {
  return (
    <NodeToolEmptyState
      accent="emerald"
      icon={<FileText className="w-5 h-5" />}
      title={language === 'zh' ? '创建节点文档' : 'Create Node Document'}
      description={language === 'zh' ? '适合写 SOP、说明、复盘和备注。' : 'Perfect for SOPs, notes, drafts, and recap content.'}
      actionLabel={language === 'zh' ? '开始记录' : 'Start writing'}
      onActivate={onActivate}
    />
  );
}

export function DocumentToolContent({ language, nodeData, updateNodeTools }: DocumentToolProps) {
  const documentTool = nodeData.tools?.document;
  const characterCount = (documentTool?.content || '').trim().length;

  return (
    <div className="space-y-4">
      <NodeToolWorkspaceHeader
        accent="emerald"
        eyebrow={language === 'zh' ? '节点文档' : 'Node document'}
        title={language === 'zh' ? '把上下文、SOP 和补充说明沉淀在这里。' : 'Keep context, SOPs, and notes in one place.'}
        description={language === 'zh' ? '文档区更适合持续书写，而不是碎片化备注。' : 'This space is for sustained writing, not scattered notes.'}
        badge={language === 'zh' ? `${characterCount} 字` : `${characterCount} chars`}
        meta={language === 'zh' ? '内容会跟随当前节点一起保存。' : 'Content is saved together with the current node.'}
      />
      <NodeToolSection>
        <div className="space-y-2">
          <NodeToolFieldLabel>{language === 'zh' ? '正文内容' : 'Main content'}</NodeToolFieldLabel>
          <textarea
            value={documentTool?.content || ''}
            onChange={(event) => updateNodeTools({
              ...(nodeData.tools || {}),
              activeTool: 'document',
              document: {
                ...documentTool!,
                content: event.target.value,
              },
            })}
            placeholder={language === 'zh' ? '开始记录与这个节点相关的文档内容...' : 'Start writing supporting content for this node...'}
            className="min-h-[360px] w-full rounded-[1.25rem] border border-neutral-200 bg-neutral-50 px-4 py-4 text-sm text-neutral-700 outline-none transition-all focus:border-emerald-200 focus:bg-white focus:ring-2 focus:ring-emerald-100"
          />
        </div>
      </NodeToolSection>
    </div>
  );
}
