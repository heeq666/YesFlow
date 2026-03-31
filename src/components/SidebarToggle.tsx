import { ChevronLeft, ChevronRight } from 'lucide-react';

type SidebarToggleProps = {
  isSidebarOpen: boolean;
  language: 'zh' | 'en';
  onToggle: () => void;
};

export default function SidebarToggle({ isSidebarOpen, language, onToggle }: SidebarToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="absolute top-1/2 -translate-y-1/2 w-8 h-8 bg-white border border-neutral-200 rounded-full flex items-center justify-center shadow-lg hover:bg-neutral-50 hover:scale-110 active:scale-95 transition-all z-30 pointer-events-auto"
      style={{ left: isSidebarOpen ? 372 : 8 }}
      title={isSidebarOpen ? (language === 'zh' ? '收起侧边栏' : 'Close Sidebar') : (language === 'zh' ? '展开侧边栏' : 'Open Sidebar')}
    >
      {isSidebarOpen ? <ChevronLeft className="w-4 h-4 text-neutral-400" /> : <ChevronRight className="w-4 h-4 text-neutral-400" />}
    </button>
  );
}
