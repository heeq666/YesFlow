import React from 'react';
import { ExternalLink, ImageIcon, Link2, Plus, Trash2, Upload } from 'lucide-react';

import type { TaskData } from '../types';
import {
  createImageItem,
  deriveNodeImageTitle,
  getNodeToolImages,
  normalizeNodeImageSource,
} from '../utils/nodeTools';
import {
  NodeToolEmptyState,
  NodeToolPrimaryButton,
  NodeToolSection,
  NodeToolWorkspaceHeader,
} from './NodeToolSurface';

interface ImageToolProps {
  language: 'zh' | 'en';
  nodeData: TaskData;
  updateNodeTools: (tools: TaskData['tools']) => void;
}

function readImageFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function ImageToolEmpty({ language, onActivate }: { language: 'zh' | 'en'; onActivate: () => void }) {
  return (
    <NodeToolEmptyState
      accent="rose"
      icon={<ImageIcon className="w-5 h-5" />}
      title={language === 'zh' ? '创建图片插件' : 'Create Image Tool'}
      description={language === 'zh' ? '挂参考图、草图、截图和视觉素材。' : 'Attach references, screenshots, and visual assets.'}
      actionLabel={language === 'zh' ? '添加图片' : 'Add images'}
      onActivate={onActivate}
    />
  );
}

export function ImageToolContent({ language, nodeData, updateNodeTools }: ImageToolProps) {
  const imageTool = nodeData.tools?.image;
  const items = React.useMemo(() => getNodeToolImages(imageTool), [imageTool]);
  const [draftUrl, setDraftUrl] = React.useState('');
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const updateImages = React.useCallback((nextItems: typeof items, enabled = nextItems.length > 0) => {
    updateNodeTools({
      ...(nodeData.tools || {}),
      activeTool: 'image',
      image: {
        enabled,
        items: nextItems,
      },
    });
  }, [nodeData.tools, updateNodeTools]);

  const handleAddUrl = React.useCallback(() => {
    const normalizedSource = normalizeNodeImageSource(draftUrl);
    if (!normalizedSource) return;

    const fallbackTitle = language === 'zh' ? '网络图片' : 'Web image';
    updateImages([
      ...items,
      createImageItem(normalizedSource, deriveNodeImageTitle(normalizedSource, fallbackTitle), deriveNodeImageTitle(normalizedSource, fallbackTitle)),
    ], true);
    setDraftUrl('');
  }, [draftUrl, items, language, updateImages]);

  const handleFiles = React.useCallback(async (fileList: FileList | null) => {
    const files = Array.from(fileList || []).filter((file) => file.type.startsWith('image/'));
    if (files.length === 0) return;

    const nextItems = await Promise.all(files.map(async (file) => {
      const source = await readImageFileAsDataUrl(file);
      const title = file.name.replace(/\.[^.]+$/, '') || (language === 'zh' ? '本地图片' : 'Local image');
      return createImageItem(source, title, title);
    }));

    updateImages([...items, ...nextItems], true);
  }, [items, language, updateImages]);

  return (
    <div className="space-y-4">
      <NodeToolWorkspaceHeader
        accent="rose"
        eyebrow={language === 'zh' ? '节点图片' : 'Node images'}
        title={language === 'zh' ? '把参考图、截图和视觉素材挂到节点上。' : 'Keep references, screenshots, and visuals attached to this node.'}
        description={language === 'zh' ? '既可以上传本地图片，也可以直接粘贴线上图片链接。' : 'Upload local images or paste remote image links.'}
        badge={language === 'zh' ? `${items.length} 张` : `${items.length} images`}
        actions={
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={async (event) => {
                await handleFiles(event.target.files);
                event.target.value = '';
              }}
            />
            <NodeToolPrimaryButton accent="rose" onClick={() => fileInputRef.current?.click()}>
              <span className="inline-flex items-center gap-1">
                <Upload className="w-3.5 h-3.5" />
                {language === 'zh' ? '上传' : 'Upload'}
              </span>
            </NodeToolPrimaryButton>
          </>
        }
      />

      <NodeToolSection>
        <div className="space-y-3">
          <div className="text-xs font-black text-neutral-800">
            {language === 'zh' ? '添加网络图片' : 'Add remote image'}
          </div>
          <div className="relative">
            <input
              type="text"
              value={draftUrl}
              onChange={(event) => setDraftUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                handleAddUrl();
              }}
              placeholder="https://"
              className="min-w-0 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 pr-11 text-xs font-medium text-neutral-700 outline-none transition-all focus:border-rose-200 focus:bg-white"
            />
            <button
              type="button"
              onClick={handleAddUrl}
              disabled={!normalizeNodeImageSource(draftUrl)}
              className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[10px] border border-rose-100 bg-rose-50 text-rose-600 transition-all hover:bg-rose-100 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:bg-neutral-100 disabled:text-neutral-300"
              title={language === 'zh' ? '添加图片' : 'Add image'}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </NodeToolSection>

      <div className="grid gap-3 sm:grid-cols-2">
        {items.length > 0 ? (
          items.map((item, index) => (
            <NodeToolSection key={item.id} className="overflow-hidden p-3">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-xs font-black text-neutral-800">
                    {item.title || (language === 'zh' ? `图片 ${index + 1}` : `Image ${index + 1}`)}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => window.open(item.src, '_blank', 'noopener,noreferrer')}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-400 transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                    title={language === 'zh' ? '打开图片' : 'Open image'}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateImages(items.filter((image) => image.id !== item.id), items.length - 1 > 0)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-300 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                    title={language === 'zh' ? '删除图片' : 'Delete image'}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="overflow-hidden rounded-[1rem] border border-neutral-200 bg-neutral-50">
                <img
                  src={item.src}
                  alt={item.alt || item.title}
                  className="h-44 w-full object-cover"
                  loading="lazy"
                />
              </div>

              {/^https?:\/\//i.test(item.src) && (
                <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">
                  <Link2 className="h-3 w-3" />
                  <span>{language === 'zh' ? '外链图片' : 'Remote image'}</span>
                </div>
              )}
            </NodeToolSection>
          ))
        ) : (
          <NodeToolSection className="sm:col-span-2">
            <div className="rounded-[1.25rem] border border-dashed border-neutral-200 bg-neutral-50 px-4 py-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                <ImageIcon className="h-5 w-5" />
              </div>
              <div className="mt-4 text-sm font-black text-neutral-800">
                {language === 'zh' ? '还没有图片素材' : 'No images yet'}
              </div>
              <div className="mt-2 text-xs leading-6 text-neutral-400">
                {language === 'zh' ? '先上传本地图片，或直接粘贴一张线上图片链接。' : 'Upload a local image or paste a remote image URL.'}
              </div>
            </div>
          </NodeToolSection>
        )}
      </div>
    </div>
  );
}
