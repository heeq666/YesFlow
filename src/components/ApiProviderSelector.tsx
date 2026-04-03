import React from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  Settings as SettingsIcon, 
  Check, 
  Globe,
  Zap,
  Bot
} from 'lucide-react';
import { type ApiProvider } from '../types';

type ApiProviderSelectorProps = {
  providers: ApiProvider[];
  activeProviderId: string;
  onSelect: (id: string) => void;
  onAddCustom: () => void;
  language: 'zh' | 'en';
};

const PROVIDER_LOGOS: Record<string, React.ReactNode> = {
  minimax: <Zap className="w-4 h-4 text-emerald-500" />,
  deepseek: <Bot className="w-4 h-4 text-blue-600" />,
  qwen: <Globe className="w-4 h-4 text-violet-500" />,
  doubao: <Bot className="w-4 h-4 text-orange-500" />,
  zhipu: <Zap className="w-4 h-4 text-cyan-500" />,
};

export default function ApiProviderSelector({
  providers,
  activeProviderId,
  onSelect,
  onAddCustom,
  language
}: ApiProviderSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
          {language === 'zh' ? '选择模型供应商' : 'Select Provider'}
        </label>
        <button 
          onClick={onAddCustom}
          className="p-1 hover:bg-neutral-100 rounded-lg text-primary transition-colors"
          title={language === 'zh' ? '添加自定义' : 'Add Custom'}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {providers.map((provider) => {
          const isActive = provider.id === activeProviderId;
          return (
            <motion.button
              key={provider.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(provider.id)}
              className={`p-3 rounded-2xl border-2 text-left transition-all relative flex items-center gap-3 ${
                isActive 
                  ? 'border-primary bg-primary/5 shadow-sm' 
                  : 'border-neutral-100 bg-white hover:border-neutral-200'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                isActive ? 'bg-primary text-white' : 'bg-neutral-50 text-neutral-400'
              }`}>
                {PROVIDER_LOGOS[provider.id] || <SettingsIcon className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <div className={`text-[11px] font-black truncate ${isActive ? 'text-primary' : 'text-neutral-700'}`}>
                  {provider.name}
                </div>
                <div className="text-[9px] text-neutral-400 font-medium truncate uppercase tracking-tighter">
                  {provider.model}
                </div>
              </div>
              {isActive && (
                <div className="absolute top-2 right-2">
                  <Check className="w-3 h-3 text-primary" strokeWidth={3} />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
