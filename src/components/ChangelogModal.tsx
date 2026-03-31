import React from 'react';
import { X, Sparkles, Tag, ChevronDown, ChevronRight, Clock } from 'lucide-react';

interface ChangelogModalProps {
  onClose: () => void;
}

export default function ChangelogModal({ onClose }: ChangelogModalProps) {
  const changelog = [
    {
      version: "0.1.0",
      date: "2026-03-31",
      changes: [
        { type: "added", text: "YesFlow — Initial release! (Beta)" },
        { type: "added", text: "Visual pipeline editor — Drag-and-drop node-based workflow builder" },
        { type: "added", text: "Multi-model AI support — MiniMax API integration for LLM nodes" },
        { type: "added", text: "Condition nodes — Branching logic with conditional edges" },
        { type: "added", text: "Shift+click multi-select — Add individual nodes to selection" },
        { type: "added", text: "Shift+drag box select — Batch select multiple nodes at once" },
        { type: "added", text: "Customizable hotkeys — Fully configurable keyboard shortcuts" },
        { type: "added", text: "Dark mode UI — Beautiful dark theme by default" },
        { type: "added", text: "Local storage — All data persisted in browser localStorage" },
        { type: "added", text: "One-click Netlify deploy — Pure frontend, deployable anywhere" },
        { type: "added", text: "Author contact — Email address displayed in the About section" },
        { type: "added", text: "Custom SVG logo & favicon — Branded icon for browser tab and app" },
        { type: "added", text: "Comprehensive README — Architecture diagrams, use cases, and contribution guide" },
      ]
    }
  ];

  const tagColors: Record<string, string> = {
    added: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    changed: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    fixed: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    removed: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  };

  const tagLabels: Record<string, string> = {
    added: "Added",
    changed: "Changed",
    fixed: "Fixed",
    removed: "Removed",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-[560px] max-h-[75vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" />
            <h2 className="text-base font-semibold text-gray-800 dark:text-white">更新日志</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Changelog list */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">
          {changelog.map((release, releaseIdx) => (
            <div key={release.version}>
              {/* Version header */}
              <div className="flex items-center gap-3 mb-3">
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 rounded-full text-sm font-semibold">
                  <Tag className="w-3.5 h-3.5" />
                  v{release.version}
                  {releaseIdx === 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-violet-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wide">NEW</span>
                  )}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  {release.date}
                </span>
              </div>

              {/* Changes */}
              <ul className="space-y-2 ml-1">
                {release.changes.map((change, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-300">
                    <span className={`mt-0.5 shrink-0 px-1.5 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide ${tagColors[change.type] || tagColors.added}`}>
                      {tagLabels[change.type] || change.type}
                    </span>
                    <span className="leading-relaxed">{change.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700 text-center">
          <p className="text-xs text-gray-400">
            查看完整更新日志：
            <a href="https://github.com/heeq666/YesFlow/blob/main/CHANGELOG.md" target="_blank" rel="noopener" className="text-violet-500 hover:underline">
              当前 GitHub 仓库（YesFlow）
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
