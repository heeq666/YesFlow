import { Settings as SettingsIcon, ChevronUp, Zap, Bot, Globe, Moon, Sun } from 'lucide-react';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { type ApiProvider, type ThemeMode } from '../types';
import CustomScrollArea from './CustomScrollArea';

type SidebarFooterProps = {
  language: 'zh' | 'en';
  themeMode: ThemeMode;
  systemStatusLabel: string;
  readyLabel: string;
  hasApiKey: boolean;
  activeProviderName: string;
  providers: ApiProvider[];
  onSelectProvider: (id: string) => void;
  onOpenSettings: () => void;
  onToggleTheme: () => void;
  onToggleLanguage: () => void;
};

const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  minimax: <Zap className="w-3 h-3 text-emerald-500" />,
  deepseek: <Bot className="w-3 h-3 text-blue-600" />,
  qwen: <Globe className="w-3 h-3 text-violet-500" />,
  doubao: <Bot className="w-3 h-3 text-orange-500" />,
  zhipu: <Zap className="w-3 h-3 text-cyan-500" />,
};

export default function SidebarFooter({
  language,
  themeMode,
  systemStatusLabel,
  hasApiKey,
  activeProviderName,
  providers,
  onSelectProvider,
  onOpenSettings,
  onToggleTheme,
  onToggleLanguage,
}: SidebarFooterProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="p-6 border-t border-neutral-100 bg-neutral-50/50 flex items-center justify-between relative">
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <div 
              className="fixed inset-0 z-50" 
              onClick={() => setIsMenuOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-full left-6 mb-2 w-48 bg-white rounded-2xl shadow-2xl border border-neutral-100 p-2 z-[60] overflow-hidden"
            >
              <div className="px-3 py-2 border-b border-neutral-50 mb-1">
                <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">
                  {language === 'zh' ? '切换 AI 模型' : 'Switch AI Model'}
                </span>
              </div>
              <CustomScrollArea className="max-h-48" viewportClassName="max-h-48">
                {providers.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelectProvider(p.id);
                      setIsMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-neutral-50 group ${
                      p.name === activeProviderName ? 'bg-primary/5 text-primary' : 'text-neutral-600'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                      p.name === activeProviderName ? 'bg-primary text-white' : 'bg-neutral-100'
                    }`}>
                      {PROVIDER_ICONS[p.id] || <SettingsIcon className="w-3 h-3" />}
                    </div>
                    <div className="min-w-0 text-left">
                      <div className="text-[11px] font-bold truncate">{p.name}</div>
                      <div className="text-[8px] text-neutral-400 font-medium truncate uppercase tracking-tighter">
                        {p.model}
                      </div>
                    </div>
                  </button>
                ))}
              </CustomScrollArea>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
          <span>{systemStatusLabel}</span>
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`flex items-center gap-1.5 px-2 py-1 -ml-2 rounded-lg hover:bg-neutral-100 transition-all group ${hasApiKey ? 'text-green-600' : 'text-amber-500'}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${hasApiKey ? 'bg-green-500' : 'bg-amber-500'}`} />
            <span className="font-black">
              {hasApiKey ? (language === 'zh' ? `${activeProviderName}` : `${activeProviderName}`) : (language === 'zh' ? '未连接' : 'No Model')}
            </span>
            <ChevronUp className={`w-3 h-3 transition-transform duration-300 ${isMenuOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* 主题切换 */}
        <button
          onClick={onToggleTheme}
          title={language === 'zh' ? '切换亮暗模式' : 'Toggle theme'}
          className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl text-neutral-400 hover:text-primary dark:text-neutral-500 dark:hover:text-primary transition-all"
        >
          {themeMode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        {/* 语言切换 */}
        <button
          onClick={onToggleLanguage}
          title={language === 'zh' ? '切换到英文' : 'Switch to Chinese'}
          className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl text-neutral-400 hover:text-primary dark:text-neutral-500 dark:hover:text-primary transition-all flex items-center gap-1"
        >
          <Globe className="w-4 h-4" />
          <span className="text-[10px] font-bold">{language === 'zh' ? 'EN' : '中'}</span>
        </button>
        <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-700" />
        {/* 设置 */}
        <button
          onClick={onOpenSettings}
          className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl text-neutral-400 hover:text-primary dark:text-neutral-500 dark:hover:text-primary transition-all flex items-center gap-2 group"
          title={language === 'zh' ? '系统设置' : 'Settings'}
        >
          <SettingsIcon className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest">{language === 'zh' ? '设置' : 'Settings'}</span>
        </button>
      </div>
    </div>
  );
}
