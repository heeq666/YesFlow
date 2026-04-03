import React from 'react';
import { ExternalLink, Link2, Plus, Trash2 } from 'lucide-react';

import type { NodeLinkItem, TaskData } from '../types';
import {
  createEmptyLinkItem,
  deriveNodeLinkTitle,
  fetchNodeLinkTitle,
  normalizeNodeLinkUrl,
} from '../utils/nodeTools';
import {
  NodeToolEmptyState,
  NodeToolSection,
  NodeToolWorkspaceHeader,
} from './NodeToolSurface';

interface LinkToolProps {
  language: 'zh' | 'en';
  nodeData: TaskData;
  updateNodeTools: (tools: TaskData['tools']) => void;
}

export function LinkToolEmpty({
  language,
  onActivate,
}: {
  language: 'zh' | 'en';
  onActivate: () => void;
}) {
  return (
    <NodeToolEmptyState
      accent="violet"
      icon={<Link2 className="w-5 h-5" />}
      title={language === 'zh' ? '创建节点链接' : 'Create Node Links'}
      description={language === 'zh' ? '整理资料入口、网页和参考文档。' : 'Organize reference pages, docs, and resources.'}
      actionLabel={language === 'zh' ? '添加入口' : 'Add resource'}
      onActivate={onActivate}
    />
  );
}

export function LinkToolContent({ language, nodeData, updateNodeTools }: LinkToolProps) {
  const linkTool = nodeData.tools?.link;
  const items = Array.isArray(linkTool?.items) ? linkTool.items : [];
  const [draftUrl, setDraftUrl] = React.useState('');
  const itemsRef = React.useRef(items);
  const nodeDataRef = React.useRef(nodeData);
  const requestControllersRef = React.useRef<Record<string, AbortController>>({});

  React.useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  React.useEffect(() => {
    nodeDataRef.current = nodeData;
  }, [nodeData]);

  React.useEffect(() => {
    return () => {
      for (const controller of Object.values(requestControllersRef.current) as AbortController[]) {
        controller.abort();
      }
    };
  }, []);

  const updateLinks = React.useCallback((nextItems: NodeLinkItem[], enabled = nextItems.length > 0) => {
    const currentNodeData = nodeDataRef.current;
    updateNodeTools({
      ...(currentNodeData.tools || {}),
      activeTool: 'link',
      link: {
        enabled,
        items: nextItems,
      },
    });
  }, [updateNodeTools]);

  const updateItem = React.useCallback((itemId: string, updates: Partial<NodeLinkItem>) => {
    const nextItems = itemsRef.current.map((item) => (item.id === itemId ? { ...item, ...updates } : item));
    updateLinks(nextItems);
  }, [updateLinks]);

  const resolveItemTitle = React.useCallback(async (itemId: string, value: string) => {
    const normalizedUrl = normalizeNodeLinkUrl(value);
    if (!normalizedUrl) return;

    requestControllersRef.current[itemId]?.abort();
    const controller = new AbortController();
    requestControllersRef.current[itemId] = controller;

    const resolvedTitle = await fetchNodeLinkTitle(normalizedUrl, controller.signal);
    if (requestControllersRef.current[itemId] !== controller) return;

    delete requestControllersRef.current[itemId];

    if (!resolvedTitle) return;

    const latestItem = itemsRef.current.find((item) => item.id === itemId);
    if (!latestItem || normalizeNodeLinkUrl(latestItem.url) !== normalizedUrl) return;

    updateItem(itemId, {
      title: resolvedTitle,
      url: normalizedUrl,
    });
  }, [updateItem]);

  const finalizeItemUrl = React.useCallback((itemId: string, value: string) => {
    const normalizedUrl = normalizeNodeLinkUrl(value);
    if (!normalizedUrl) return;

    updateItem(itemId, {
      title: deriveNodeLinkTitle(normalizedUrl),
      url: normalizedUrl,
    });
    void resolveItemTitle(itemId, normalizedUrl);
  }, [resolveItemTitle, updateItem]);

  const handleAdd = () => {
    const normalizedUrl = normalizeNodeLinkUrl(draftUrl);
    if (!normalizedUrl) return;

    const nextItem = {
      ...createEmptyLinkItem(),
      title: deriveNodeLinkTitle(normalizedUrl),
      url: normalizedUrl,
    };

    updateLinks([...itemsRef.current, nextItem], true);
    setDraftUrl('');
    void resolveItemTitle(nextItem.id, normalizedUrl);
  };

  const handleDelete = (itemId: string) => {
    requestControllersRef.current[itemId]?.abort();
    delete requestControllersRef.current[itemId];

    const nextItems = itemsRef.current.filter((item) => item.id !== itemId);
    updateLinks(nextItems, nextItems.length > 0);
  };

  return (
    <div className="space-y-4">
      <NodeToolWorkspaceHeader
        accent="violet"
        eyebrow={language === 'zh' ? '节点链接' : 'Node links'}
        title={language === 'zh' ? '只填链接，名字会自动补齐。' : 'Paste a link and let the name fill itself in.'}
        description={language === 'zh' ? '新增时只需要 URL；已添加的链接可以直接改，右侧随时访问。' : 'New links only need a URL. Existing links stay editable with quick access on the right.'}
        badge={language === 'zh' ? `${items.length} 条入口` : `${items.length} resources`}
      />

      <div className="space-y-3">
        <NodeToolSection>
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="min-w-0 text-xs font-black text-neutral-800">
              {language === 'zh' ? '新增链接' : 'New link'}
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              value={draftUrl}
              onChange={(event) => setDraftUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                handleAdd();
              }}
              placeholder="https://"
              className="min-w-0 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 pr-11 text-xs font-medium text-neutral-700 outline-none transition-all focus:border-violet-200 focus:bg-white"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!normalizeNodeLinkUrl(draftUrl)}
              className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[10px] border border-violet-100 bg-violet-50 text-violet-600 transition-all hover:bg-violet-100 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:bg-neutral-100 disabled:text-neutral-300"
              title={language === 'zh' ? '添加链接' : 'Add link'}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </NodeToolSection>

        {items.map((item, index) => {
          const normalizedUrl = normalizeNodeLinkUrl(item.url);
          const displayTitle =
            item.title.trim()
            || deriveNodeLinkTitle(item.url)
            || (language === 'zh' ? `链接 ${index + 1}` : `Link ${index + 1}`);

          return (
            <React.Fragment key={item.id}>
              <NodeToolSection className="p-3">
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-black text-neutral-800">
                      {displayTitle}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-300 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                      title={language === 'zh' ? '删除链接' : 'Delete link'}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={item.url}
                    onChange={(event) => updateItem(item.id, { title: '', url: event.target.value })}
                    onBlur={() => finalizeItemUrl(item.id, item.url)}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter') return;
                      event.preventDefault();
                      finalizeItemUrl(item.id, item.url);
                    }}
                    placeholder="https://"
                    className="min-w-0 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 pr-[5.1rem] text-xs font-medium text-neutral-700 outline-none transition-all focus:border-violet-200 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => normalizedUrl && window.open(normalizedUrl, '_blank', 'noopener,noreferrer')}
                    disabled={!normalizedUrl}
                    className="absolute right-1 top-1/2 inline-flex h-8 -translate-y-1/2 items-center gap-1 rounded-[10px] border border-violet-100 bg-violet-50 px-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-violet-600 transition-all hover:bg-violet-100 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:bg-neutral-100 disabled:text-neutral-300"
                    title={language === 'zh' ? '访问链接' : 'Visit link'}
                  >
                    <ExternalLink className="h-3 w-3" />
                    {language === 'zh' ? '访问' : 'Visit'}
                  </button>
                </div>
              </NodeToolSection>
            </React.Fragment>
          );
        })}

      </div>
    </div>
  );
}
