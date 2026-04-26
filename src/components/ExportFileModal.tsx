import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Download, FileJson, X } from 'lucide-react';

import { PROJECT_EXPORT_FORMATS, getProjectExportFormat, type ProjectExportFormat } from '../utils/projectExportFormats';

type ExportFileModalProps = {
  visible: boolean;
  language: 'zh' | 'en';
  fileName: string;
  format: ProjectExportFormat;
  onFileNameChange: (value: string) => void;
  onFormatChange: (value: ProjectExportFormat) => void;
  onConfirm: () => void;
  onClose: () => void;
};

export default function ExportFileModal({
  visible,
  language,
  fileName,
  format,
  onFileNameChange,
  onFormatChange,
  onConfirm,
  onClose,
}: ExportFileModalProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const selectedFormat = getProjectExportFormat(format);

  React.useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[260] flex items-center justify-center bg-black/35 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.96, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 20, opacity: 0 }}
            className="w-full max-w-md rounded-[2rem] border border-neutral-100 bg-white shadow-[0_32px_128px_-32px_rgba(0,0,0,0.35)] overflow-hidden relative"
          >
            <div className="p-8">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <FileJson className="w-7 h-7" />
                </div>
                <div className="space-y-1 pr-8">
                  <h2 className="text-xl font-black text-neutral-900">
                    {language === 'zh' ? '导出文件' : 'Export File'}
                  </h2>
                  <p className="text-sm text-neutral-500 leading-relaxed">
                    {language === 'zh' ? '请确认导出的文件名。' : 'Confirm the filename before exporting.'}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-neutral-400">
                  {language === 'zh' ? '保存格式' : 'Format'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PROJECT_EXPORT_FORMATS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => onFormatChange(option.id)}
                      className={`rounded-xl border px-3 py-2 text-left transition-all ${
                        format === option.id
                          ? 'border-primary/40 bg-primary/10 text-primary shadow-sm'
                          : 'border-neutral-200 bg-neutral-50 text-neutral-500 hover:border-neutral-300 hover:bg-white'
                      }`}
                    >
                      <span className="block text-xs font-black">{option.label}</span>
                      <span className="block text-[10px] font-bold uppercase opacity-65">.{option.extension}</span>
                    </button>
                  ))}
                </div>

                <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-neutral-400">
                  {language === 'zh' ? '文件名' : 'Filename'}
                </label>
                <div className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 focus-within:border-primary/30 focus-within:bg-white transition-colors">
                  <input
                    ref={inputRef}
                    type="text"
                    value={fileName}
                    onChange={(event) => onFileNameChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        onConfirm();
                      }
                    }}
                    className="flex-1 bg-transparent outline-none text-sm font-semibold text-neutral-900"
                  />
                  <span className="text-sm font-bold text-neutral-400">.{selectedFormat.extension}</span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  {language === 'zh'
                    ? '非法文件名字符会在导出时自动替换。'
                    : 'Invalid filename characters will be replaced automatically.'}
                </p>
              </div>

              <div className="mt-8 flex items-center justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold text-neutral-500 hover:bg-neutral-100 transition-colors"
                >
                  {language === 'zh' ? '取消' : 'Cancel'}
                </button>
                <button
                  onClick={onConfirm}
                  className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 inline-flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {language === 'zh' ? '确认导出' : 'Export'}
                </button>
              </div>
            </div>

            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 rounded-xl text-neutral-300 hover:text-neutral-500 hover:bg-neutral-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
