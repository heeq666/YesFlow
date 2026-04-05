import React from 'react';
import { X, Sparkles, Tag, Clock } from 'lucide-react';
import CustomScrollArea from './CustomScrollArea';

interface ChangelogModalProps {
  onClose: () => void;
}

export default function ChangelogModal({ onClose }: ChangelogModalProps) {
  const isDarkTheme = typeof document !== 'undefined' && document.documentElement.style.colorScheme === 'dark';
  const changelog = [
    {
      version: "0.3.2",
      date: "2026-04-05",
      changes: [
        { type: "added", text: "图片工作流升级：支持图片标题编辑、来源复制、按钮排序与拖拽排序。" },
        { type: "added", text: "右侧资源栏可直接展示节点图片，并提供复制链接、打开原图和跳转工具区的快捷操作。" },
        { type: "added", text: "导入 JSON 前新增轻量完整性检查，且在嵌入图片较多时给出提醒。" },
        { type: "changed", text: "导入项目会进入新的记录上下文，不再默默覆盖此前正在编辑的项目记录。" },
        { type: "changed", text: "本地记录与导出 JSON 的持久化清理与旧数据归一化路径进一步统一和加固。" },
        { type: "fixed", text: "修复选择模式下顶部工具栏交互异常，并补充存储配额不足时的保存失败提示。" },
      ]
    },
    {
      version: "0.3.1",
      date: "2026-04-03",
      changes: [
        { type: "added", text: "节点工具新增图片工作区，支持上传本地图片或直接粘贴线上图片链接。" },
        { type: "added", text: "项目记录现在会跟踪各自的 AI 运行状态，切回项目时也能看到完成或失败提醒。" },
        { type: "changed", text: "任务节点尺寸与布局参数抽成统一常量，画布编排、编组子任务和 AI 生成位置更一致。" },
        { type: "fixed", text: "项目保存与导出前会清理临时 UI / AI 运行字段，记录与 JSON 文件更干净稳定。" },
        { type: "fixed", text: "应用加入运行时错误边界，异常时优先展示错误面板，避免直接白屏。" },
        { type: "changed", text: "README、设置页介绍、元数据与版本说明同步更新到 0.3.1。" },
      ]
    },
    {
      version: "0.3.0",
      date: "2026-04-03",
      changes: [
        { type: "added", text: "节点工具工作区上线，支持文档、表格、链接、时间四类节点附属内容。" },
        { type: "added", text: "右侧工具栏与日历视图加入主工作流，节点上下文和时间规划可并排查看。" },
        { type: "added", text: "多模型配置升级，内置支持 MiniMax、DeepSeek、通义千问、豆包、智谱与 OpenAI Compatible。" },
        { type: "added", text: "项目记录支持本地持久化、快速回载与拖拽排序，复杂项目更容易持续推进。" },
        { type: "changed", text: "README、设置页介绍与版本说明全部重写，0.3.0 的产品定位更加完整统一。" },
        { type: "changed", text: "YesFlow 从流程编辑器进一步升级为面向复杂任务的可视化 AI 工作台。" },
      ]
    },
    {
      version: "0.2.0",
      date: "2026-04-01",
      changes: [
        { type: "added", text: "项目正式更名为 YesFlow，并更新整套品牌标识。" },
        { type: "added", text: "浏览器标签页启用新的 SVG favicon。" },
        { type: "changed", text: "README 首次围绕 YesFlow 品牌完成重写。" },
      ]
    },
    {
      version: "0.1.0",
      date: "2026-03-31",
      changes: [
        { type: "added", text: "YesFlow 首个 Beta 版本发布，提供可视化节点编排画布。" },
        { type: "added", text: "支持 AI 工作流生成、条件分支、多选、快捷键与本地存储。" },
        { type: "added", text: "完成基础品牌展示、浏览器图标与关于页信息。" },
      ]
    }
  ];

  const tagColors: Record<string, string> = {
    added: isDarkTheme ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20" : "bg-emerald-100 text-emerald-700",
    changed: isDarkTheme ? "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/20" : "bg-amber-100 text-amber-700",
    fixed: isDarkTheme ? "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/20" : "bg-rose-100 text-rose-700",
    removed: isDarkTheme ? "bg-slate-700/50 text-slate-300 ring-1 ring-slate-600/40" : "bg-gray-100 text-gray-500",
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
      <div className="relative bg-white rounded-2xl shadow-2xl w-[560px] max-h-[75vh] flex flex-col overflow-hidden border border-neutral-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" />
            <h2 className="text-base font-semibold text-neutral-900">更新日志</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        {/* Changelog list */}
        <CustomScrollArea className="min-h-0 flex-1" viewportClassName="h-full px-6 py-4">
          <div className="space-y-6">
            {changelog.map((release, releaseIdx) => (
              <div key={release.version}>
                {/* Version header */}
                <div className="mb-3 flex items-center gap-3">
                  <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold ${
                    isDarkTheme ? 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/20' : 'bg-violet-100 text-violet-700'
                  }`}>
                    <Tag className="w-3.5 h-3.5" />
                    v{release.version}
                    {releaseIdx === 0 && (
                      <span className="ml-1 rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">NEW</span>
                    )}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-neutral-400">
                    <Clock className="w-3 h-3" />
                    {release.date}
                  </span>
                </div>

                {/* Changes */}
                <ul className="ml-1 space-y-2">
                  {release.changes.map((change, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-sm text-neutral-600">
                      <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${tagColors[change.type] || tagColors.added}`}>
                        {tagLabels[change.type] || change.type}
                      </span>
                      <span className="leading-relaxed">{change.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CustomScrollArea>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-100 text-center">
          <p className="text-xs text-neutral-400">
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
