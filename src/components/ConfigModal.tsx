import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Key, 
  ChevronRight, 
  Loader2, 
  ShieldCheck, 
  AlertCircle,
  X
} from 'lucide-react';
import { translations } from '../constants/translations';
import { validateApiKey } from '../services/aiService';
import { type Settings, type ApiProvider } from '../types';
import ApiProviderSelector from './ApiProviderSelector';

type ConfigModalProps = {
  visible: boolean;
  language: 'zh' | 'en';
  settings: Settings;
  onUpdateSettings: (settings: Settings) => void;
  onClose: () => void;
  onSkip?: () => void;
};

export default function ConfigModal({
  visible,
  language,
  settings,
  onUpdateSettings,
  onClose,
  onSkip
}: ConfigModalProps) {
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState('');
  const t = translations[language].configModal;

  const activeProvider = settings.apiConfig.providers.find(p => p.id === settings.apiConfig.activeProviderId) || settings.apiConfig.providers[0];

  const handleConnect = async () => {
    if (!activeProvider.apiKey) return;
    setTestStatus('testing');
    setTestError('');
    try {
      await validateApiKey(activeProvider);
      setTestStatus('success');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setTestStatus('error');
      setTestError(err.message || (language === 'zh' ? '连接失败' : 'Connection failed'));
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[400] flex items-center justify-center bg-black/40 backdrop-blur-md p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-md bg-white rounded-[2.5rem] shadow-[0_32px_128px_-32px_rgba(0,0,0,0.5)] border border-neutral-100 overflow-hidden relative"
          >
            <div className="p-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-primary to-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-primary/30 mb-8 animate-bounce-subtle">
                <Sparkles className="w-10 h-10" />
              </div>

              <h2 className="text-2xl font-black text-neutral-900 mb-2">{t.title}</h2>
              <p className="text-sm text-neutral-400 font-medium mb-8 leading-relaxed max-w-[280px]">
                {t.subtitle}
              </p>

              <div className="w-full space-y-6">
                <ApiProviderSelector
                  providers={settings.apiConfig.providers}
                  activeProviderId={settings.apiConfig.activeProviderId}
                  language={language}
                  onSelect={(id) => onUpdateSettings({
                    ...settings,
                    apiConfig: { ...settings.apiConfig, activeProviderId: id }
                  })}
                  onAddCustom={() => {
                    // Logic to open full settings for custom addition
                    onClose();
                    // We'll need a way to trigger full settings from here if needed
                  }}
                />

                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-primary transition-colors">
                    <Key className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    placeholder={`${activeProvider.name} ${t.apiKeyPlaceholder}`}
                    value={activeProvider.apiKey || ''}
                    onChange={(e) => {
                      const newProviders = settings.apiConfig.providers.map(p => 
                        p.id === activeProvider.id ? { ...p, apiKey: e.target.value } : p
                      );
                      onUpdateSettings({ 
                        ...settings, 
                        apiConfig: { ...settings.apiConfig, providers: newProviders } 
                      });
                      if (testStatus !== 'idle') setTestStatus('idle');
                    }}
                    className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl pl-12 pr-5 py-4 text-xs font-mono outline-none focus:ring-4 ring-primary/10 focus:bg-white focus:border-primary/20 transition-all"
                  />
                </div>

                <button
                  onClick={handleConnect}
                  disabled={!activeProvider.apiKey || testStatus === 'testing'}
                  className={`w-full py-4 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 border-2 ${
                    testStatus === 'success' ? 'bg-green-50 border-green-200 text-green-600' :
                    testStatus === 'error' ? 'bg-red-50 border-red-200 text-red-600' :
                    'bg-primary text-white border-primary shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 disabled:scale-100 disabled:opacity-50 disabled:shadow-none'
                  }`}
                >
                  {testStatus === 'testing' ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                   testStatus === 'success' ? <ShieldCheck className="w-4 h-4" /> :
                   <ChevronRight className="w-4 h-4" />}
                  {testStatus === 'testing' ? (language === 'zh' ? '正在点亮...' : 'Connecting...') : 
                   testStatus === 'success' ? t.success : t.connectBtn}
                </button>

                <div className="flex items-center justify-between px-2 pt-2">
                  <a href={activeProvider.apiKeyUrl || 'https://platform.minimaxi.com/'} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-neutral-400 hover:text-primary transition-colors flex items-center gap-1">
                    {t.getApiKey} <ChevronRight className="w-3 h-3" />
                  </a>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={onSkip || onClose}
                      className="text-[10px] font-bold text-neutral-400 hover:text-primary transition-colors flex items-center gap-1"
                    >
                      {language === 'zh' ? '稍后配置' : 'Skip'}
                    </button>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-300 uppercase tracking-widest">
                      <ShieldCheck className="w-3 h-3" />
                      {language === 'zh' ? '本地存储' : 'SECURE'}
                    </div>
                  </div>
                </div>
              </div>

              {testStatus === 'error' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-left"
                >
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-red-600 font-bold leading-relaxed">{testError}</p>
                </motion.div>
              )}
            </div>

            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-neutral-300 hover:text-neutral-500 hover:bg-neutral-100 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
