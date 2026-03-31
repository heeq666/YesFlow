import { Settings as SettingsIcon } from 'lucide-react';

type SidebarFooterProps = {
  language: 'zh' | 'en';
  systemStatusLabel: string;
  readyLabel: string;
  onOpenSettings: () => void;
};

export default function SidebarFooter({
  language,
  systemStatusLabel,
  readyLabel,
  onOpenSettings,
}: SidebarFooterProps) {
  return (
    <div className="p-6 border-t border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
          <span>{systemStatusLabel}</span>
          <span className="flex items-center gap-1.5 text-green-500">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            {readyLabel}
          </span>
        </div>
      </div>
      <button
        onClick={onOpenSettings}
        className="p-2 hover:bg-neutral-100 rounded-xl text-neutral-400 hover:text-primary transition-all flex items-center gap-2 group"
        title={language === 'zh' ? '系统设置' : 'Settings'}
      >
        <SettingsIcon className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" />
        <span className="text-[10px] font-bold uppercase tracking-widest">{language === 'zh' ? '设置' : 'Settings'}</span>
      </button>
    </div>
  );
}
