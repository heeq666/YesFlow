import React from 'react';
import { ArrowDown, ArrowUp, Check, Copy, ExternalLink, GripVertical, ImageIcon, Link2, Plus, Trash2, Upload, X } from 'lucide-react';
import { createPortal } from 'react-dom';

import type { TaskData } from '../types';
import { copyTextToClipboard } from '../utils/clipboard';
import {
  MAX_NODE_IMAGE_FILE_BYTES,
  createImageItem,
  deriveNodeImageTitle,
  getNodeToolImages,
  moveItemById,
  moveItemToTargetId,
  normalizeNodeImageSource,
} from '../utils/nodeTools';
import {
  NodeToolEmptyState,
  NodeToolPrimaryButton,
  NodeToolSecondaryButton,
  NodeToolSection,
  NodeToolWorkspaceHeader,
} from './NodeToolSurface';

interface ImageToolProps {
  language: 'zh' | 'en';
  nodeData: TaskData;
  updateNodeTools: (tools: TaskData['tools']) => void;
  onBackToOverview?: () => void;
}

function readImageFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function formatImageLimitMessage(language: 'zh' | 'en', rejectedCount: number) {
  return language === 'zh'
    ? `${rejectedCount} 张图片超过 15MB，已跳过，请先压缩后再上传。`
    : `${rejectedCount} image(s) were larger than 15 MB and were skipped. Please compress them first.`;
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

export function ImageToolContent({ language, nodeData, updateNodeTools, onBackToOverview }: ImageToolProps) {
  const imageTool = nodeData.tools?.image;
  const items = React.useMemo(() => getNodeToolImages(imageTool), [imageTool]);
  const [draftUrl, setDraftUrl] = React.useState('');
  const [copiedImageId, setCopiedImageId] = React.useState<string | null>(null);
  const [draggingImageId, setDraggingImageId] = React.useState<string | null>(null);
  const [dropTargetImageId, setDropTargetImageId] = React.useState<string | null>(null);
  const [uploadFeedback, setUploadFeedback] = React.useState<string | null>(null);
  const [previewImageId, setPreviewImageId] = React.useState<string | null>(null);
  const [previewZoom, setPreviewZoom] = React.useState(1);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const copyTimerRef = React.useRef<number | null>(null);
  const feedbackTimerRef = React.useRef<number | null>(null);
  // Keep a ref to handleFiles so the paste effect can call the latest version without re-subscribing.
  const handleFilesRef = React.useRef<(files: File[]) => Promise<void>>(() => Promise.resolve());
  const previewImage = React.useMemo(
    () => items.find((item) => item.id === previewImageId) || null,
    [items, previewImageId],
  );
  const portalTarget = typeof document !== 'undefined' ? document.body : null;

  React.useEffect(() => () => {
    if (copyTimerRef.current) {
      window.clearTimeout(copyTimerRef.current);
    }
    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current);
    }
  }, []);

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

  const queueCopyFeedback = React.useCallback((itemId: string) => {
    if (copyTimerRef.current) {
      window.clearTimeout(copyTimerRef.current);
    }
    setCopiedImageId(itemId);
    copyTimerRef.current = window.setTimeout(() => {
      setCopiedImageId((current) => (current === itemId ? null : current));
      copyTimerRef.current = null;
    }, 1600);
  }, []);

  const updateImageItem = React.useCallback((itemId: string, nextTitle: string) => {
    updateImages(items.map((item) => {
      if (item.id !== itemId) return item;
      const trimmedTitle = nextTitle.replace(/\s+/g, ' ').trimStart();
      return {
        ...item,
        title: trimmedTitle,
        alt: !item.alt || item.alt === item.title ? trimmedTitle : item.alt,
      };
    }));
  }, [items, updateImages]);

  const handleCopyImageSource = React.useCallback(async (itemId: string, source: string) => {
    const copied = await copyTextToClipboard(source);
    if (!copied) return;
    queueCopyFeedback(itemId);
  }, [queueCopyFeedback]);

  const pushUploadFeedback = React.useCallback((message: string | null) => {
    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }

    setUploadFeedback(message);

    if (!message) return;

    feedbackTimerRef.current = window.setTimeout(() => {
      setUploadFeedback(null);
      feedbackTimerRef.current = null;
    }, 3200);
  }, []);

  const moveImageItem = React.useCallback((itemId: string, direction: -1 | 1) => {
    updateImages(moveItemById(items, itemId, direction));
  }, [items, updateImages]);

  const reorderImageItem = React.useCallback((itemId: string, targetId: string) => {
    updateImages(moveItemToTargetId(items, itemId, targetId));
  }, [items, updateImages]);

  const resetDragState = React.useCallback(() => {
    setDraggingImageId(null);
    setDropTargetImageId(null);
  }, []);

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

  const handleFiles = React.useCallback(async (inputFiles: File[]) => {
    const files = inputFiles.filter((file) => file.type.startsWith('image/'));
    if (files.length === 0) return;
    const acceptedFiles = files.filter((file) => file.size <= MAX_NODE_IMAGE_FILE_BYTES);
    const rejectedCount = files.length - acceptedFiles.length;

    if (acceptedFiles.length === 0) {
      pushUploadFeedback(formatImageLimitMessage(language, rejectedCount || files.length));
      return;
    }

    const nextItems = await Promise.all(acceptedFiles.map(async (file) => {
      const source = await readImageFileAsDataUrl(file);
      const title = file.name.replace(/\.[^.]+$/, '') || (language === 'zh' ? '本地图片' : 'Local image');
      return createImageItem(source, title, title);
    }));

    updateImages([...items, ...nextItems], true);
    pushUploadFeedback(rejectedCount > 0 ? formatImageLimitMessage(language, rejectedCount) : null);
  }, [items, language, pushUploadFeedback, updateImages]);

  React.useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditableTarget = Boolean(target?.closest('input, textarea, [contenteditable="true"], [contenteditable=""]'));
      if (isEditableTarget) return;

      const files = Array.from(event.clipboardData?.items || [])
        .filter((item) => item.type.startsWith('image/'))
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);

      if (files.length === 0) return;

      event.preventDefault();
      void handleFilesRef.current(files);
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

  // Keep handleFilesRef in sync with the latest handleFiles via effect (not render body).
  React.useEffect(() => {
    handleFilesRef.current = handleFiles;
  }, [handleFiles]);

  React.useEffect(() => {
    if (!previewImageId) return;

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPreviewImageId(null);
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [previewImageId]);

  React.useEffect(() => {
    if (!previewImageId) return;
    setPreviewZoom(1);
  }, [previewImageId]);

  const handlePreviewWheel = React.useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.12 : 0.88;
    setPreviewZoom((current) => {
      const next = current * factor;
      return Math.min(4, Math.max(0.5, Number(next.toFixed(3))));
    });
  }, []);

  return (
    <div className="space-y-4">
      <NodeToolWorkspaceHeader
        accent="rose"
        eyebrow={language === 'zh' ? '节点图片' : 'Node images'}
        title={language === 'zh' ? '把参考图、截图和视觉素材挂到节点上。' : 'Keep references, screenshots, and visuals attached to this node.'}
        description={language === 'zh' ? '上传本地图片、粘贴剪贴板图片，或直接粘贴线上图片链接。' : 'Upload local images, paste clipboard images, or add remote image links.'}
        badge={language === 'zh' ? `${items.length} 张` : `${items.length} images`}
        actions={
          <>
            {onBackToOverview && (
              <NodeToolSecondaryButton accent="rose" onClick={onBackToOverview}>
                {language === 'zh' ? '返回资源' : 'Resources'}
              </NodeToolSecondaryButton>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={async (event) => {
                await handleFiles(Array.from(event.target.files || []));
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
          {uploadFeedback && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold leading-5 text-amber-700">
              {uploadFeedback}
            </div>
          )}
          <div className="text-[11px] font-medium text-neutral-400">
            {language === 'zh' ? '支持 Ctrl/Cmd + V 直接粘贴剪贴板图片。' : 'You can paste clipboard images directly with Ctrl/Cmd + V.'}
          </div>
        </div>
      </NodeToolSection>

      <div className="grid gap-3 sm:grid-cols-2">
        {items.length > 0 ? (
          items.map((item, index) => (
            <div
              key={item.id}
              onDragOver={(event) => {
                if (!draggingImageId || draggingImageId === item.id) return;
                event.preventDefault();
                setDropTargetImageId(item.id);
              }}
              onDrop={(event) => {
                if (!draggingImageId || draggingImageId === item.id) return;
                event.preventDefault();
                reorderImageItem(draggingImageId, item.id);
                resetDragState();
              }}
              onDragEnd={resetDragState}
            >
              <NodeToolSection className={`overflow-hidden p-3 transition-all ${
                dropTargetImageId === item.id && draggingImageId !== item.id
                  ? 'ring-2 ring-rose-200 bg-rose-50/40'
                  : draggingImageId === item.id
                    ? 'opacity-70'
                    : ''
              }`}>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <input
                      type="text"
                      value={item.title}
                      onChange={(event) => updateImageItem(item.id, event.target.value)}
                      placeholder={language === 'zh' ? `图片 ${index + 1}` : `Image ${index + 1}`}
                      className="min-w-0 w-full rounded-[12px] border border-neutral-200 bg-neutral-50 px-2.5 py-2 text-xs font-bold text-neutral-800 outline-none transition-all focus:border-rose-200 focus:bg-white"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      draggable
                      onDragStart={(event) => {
                        setDraggingImageId(item.id);
                        setDropTargetImageId(item.id);
                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData('text/plain', item.id);
                      }}
                      onDragEnd={resetDragState}
                      className="flex h-7 w-7 cursor-grab items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-300 transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 active:cursor-grabbing"
                      title={language === 'zh' ? '拖拽排序' : 'Drag to reorder'}
                    >
                      <GripVertical className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveImageItem(item.id, -1)}
                      disabled={index === 0}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-300 transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                      title={language === 'zh' ? '上移图片' : 'Move image up'}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveImageItem(item.id, 1)}
                      disabled={index === items.length - 1}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-300 transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                      title={language === 'zh' ? '下移图片' : 'Move image down'}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
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

                <button
                  type="button"
                  onClick={() => setPreviewImageId(item.id)}
                  className="group relative w-full overflow-hidden rounded-[1rem] border border-neutral-200 bg-neutral-50 text-left"
                  title={language === 'zh' ? '点击查看大图' : 'Click to view larger image'}
                >
                  <img
                    src={item.src}
                    alt={item.alt || item.title}
                    className="h-44 w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white opacity-0 transition-opacity group-hover:opacity-100">
                    {language === 'zh' ? '点击查看大图' : 'View large'}
                  </div>
                </button>

                {/^https?:\/\//i.test(item.src) && (
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">
                      <Link2 className="h-3 w-3" />
                      <span>{language === 'zh' ? '外链图片' : 'Remote image'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleCopyImageSource(item.id, item.src)}
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] transition-all ${
                        copiedImageId === item.id
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                          : 'border-neutral-200 bg-white text-neutral-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600'
                      }`}
                      title={language === 'zh' ? '复制图片链接' : 'Copy image URL'}
                    >
                      {copiedImageId === item.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedImageId === item.id ? (language === 'zh' ? '已复制' : 'Copied') : (language === 'zh' ? '复制链接' : 'Copy URL')}</span>
                    </button>
                  </div>
                )}

                {!/^https?:\/\//i.test(item.src) && (
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">
                      <ImageIcon className="h-3 w-3" />
                      <span>{language === 'zh' ? '本地嵌入' : 'Embedded image'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleCopyImageSource(item.id, item.src)}
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] transition-all ${
                        copiedImageId === item.id
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                          : 'border-neutral-200 bg-white text-neutral-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600'
                      }`}
                      title={language === 'zh' ? '复制图片来源' : 'Copy image source'}
                    >
                      {copiedImageId === item.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedImageId === item.id ? (language === 'zh' ? '已复制' : 'Copied') : (language === 'zh' ? '复制来源' : 'Copy source')}</span>
                    </button>
                  </div>
                )}
              </NodeToolSection>
            </div>
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
                {language === 'zh' ? '先上传本地图片、粘贴剪贴板图片，或直接粘贴线上图片链接。' : 'Upload a local image, paste a clipboard image, or paste a remote image URL.'}
              </div>
            </div>
          </NodeToolSection>
        )}
      </div>

      {portalTarget && previewImage && createPortal(
        <div
          className="fixed inset-0 z-[3200] overflow-auto bg-black/82"
          onClick={() => setPreviewImageId(null)}
          onWheelCapture={handlePreviewWheel}
          role="presentation"
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setPreviewImageId(null);
            }}
            className="fixed right-6 top-6 z-[3202] inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/75"
            title={language === 'zh' ? '关闭预览' : 'Close preview'}
          >
            <X className="h-4 w-4" />
          </button>
          <div className="min-h-full min-w-full p-4 sm:p-8">
            <div className="flex min-h-[calc(100vh-2rem)] items-center justify-center sm:min-h-[calc(100vh-4rem)]">
              <div className="relative inline-flex flex-col items-center" onClick={(event) => event.stopPropagation()} role="presentation">
                <img
                  src={previewImage.src}
                  alt={previewImage.alt || previewImage.title}
                  className="rounded-2xl border border-white/20 object-contain shadow-[0_40px_120px_-40px_rgba(0,0,0,0.75)]"
                  style={{
                    maxHeight: '88vh',
                    maxWidth: '92vw',
                    transform: `scale(${previewZoom})`,
                    transformOrigin: 'center center',
                  }}
                />
              </div>
            </div>
          </div>
          <div className="pointer-events-none fixed bottom-6 left-1/2 z-[3201] -translate-x-1/2 rounded-full bg-black/60 px-4 py-2 text-[11px] font-semibold text-white/90 backdrop-blur-sm">
            {`${previewImage.title} · ${language === 'zh' ? `缩放 ${Math.round(previewZoom * 100)}%（滚轮）` : `Zoom ${Math.round(previewZoom * 100)}% (wheel)`}`}
          </div>
        </div>,
        portalTarget,
      )}
    </div>
  );
}
