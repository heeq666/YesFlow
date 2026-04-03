import React from 'react';

type AppErrorBoundaryProps = {
  children: React.ReactNode;
};

type AppErrorBoundaryState = {
  error: Error | null;
};

export default class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  declare props: AppErrorBoundaryProps;

  state: AppErrorBoundaryState = {
    error: null,
  };

  private readonly isDev = import.meta.env.DEV;

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('AppErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="h-screen w-full bg-[#08111f] text-white flex items-center justify-center p-6">
        <div className="w-full max-w-2xl rounded-[2rem] border border-red-500/25 bg-[#101b2d] p-6 shadow-[0_24px_80px_-40px_rgba(239,68,68,0.45)]">
          <div className="text-[11px] font-black uppercase tracking-[0.22em] text-red-300">
            {this.isDev ? 'Runtime Error' : 'Application Error'}
          </div>
          <h1 className="mt-3 text-2xl font-black text-white">
            {this.isDev ? '应用发生错误，已阻止白屏。' : '应用出现异常，请刷新后重试。'}
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            {this.isDev
              ? '请把下面这段错误信息发给我，我会继续把根因修掉。'
              : '如果问题持续出现，请联系开发者并附上触发步骤。'}
          </p>
          {this.isDev && (
            <pre className="mt-5 overflow-auto rounded-2xl border border-white/10 bg-[#0a1424] p-4 text-xs leading-6 text-red-200 whitespace-pre-wrap break-words">
              {this.state.error.stack || this.state.error.message}
            </pre>
          )}
        </div>
      </div>
    );
  }
}
