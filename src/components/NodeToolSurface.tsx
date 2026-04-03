import type { Key, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

export type NodeToolAccent = 'sky' | 'emerald' | 'violet' | 'amber' | 'rose';

const TONE_MAP: Record<
  NodeToolAccent,
  {
    soft: string;
    tint: string;
    text: string;
    ring: string;
    button: string;
    buttonHover: string;
    subtle: string;
    subtleHover: string;
    subtleText: string;
    dashed: string;
  }
> = {
  sky: {
    soft: 'bg-sky-50',
    tint: 'bg-sky-500/10',
    text: 'text-sky-600',
    ring: 'ring-sky-200/80',
    button: 'bg-sky-500 text-white',
    buttonHover: 'hover:bg-sky-600',
    subtle: 'bg-sky-50',
    subtleHover: 'hover:bg-sky-100',
    subtleText: 'text-sky-600',
    dashed: 'hover:border-sky-300 hover:bg-sky-50/70',
  },
  emerald: {
    soft: 'bg-emerald-50',
    tint: 'bg-emerald-500/10',
    text: 'text-emerald-600',
    ring: 'ring-emerald-200/80',
    button: 'bg-emerald-500 text-white',
    buttonHover: 'hover:bg-emerald-600',
    subtle: 'bg-emerald-50',
    subtleHover: 'hover:bg-emerald-100',
    subtleText: 'text-emerald-600',
    dashed: 'hover:border-emerald-300 hover:bg-emerald-50/70',
  },
  violet: {
    soft: 'bg-violet-50',
    tint: 'bg-violet-500/10',
    text: 'text-violet-600',
    ring: 'ring-violet-200/80',
    button: 'bg-violet-500 text-white',
    buttonHover: 'hover:bg-violet-600',
    subtle: 'bg-violet-50',
    subtleHover: 'hover:bg-violet-100',
    subtleText: 'text-violet-600',
    dashed: 'hover:border-violet-300 hover:bg-violet-50/70',
  },
  amber: {
    soft: 'bg-amber-50',
    tint: 'bg-amber-500/10',
    text: 'text-amber-600',
    ring: 'ring-amber-200/80',
    button: 'bg-amber-500 text-white',
    buttonHover: 'hover:bg-amber-600',
    subtle: 'bg-amber-50',
    subtleHover: 'hover:bg-amber-100',
    subtleText: 'text-amber-600',
    dashed: 'hover:border-amber-300 hover:bg-amber-50/70',
  },
  rose: {
    soft: 'bg-rose-50',
    tint: 'bg-rose-500/10',
    text: 'text-rose-600',
    ring: 'ring-rose-200/80',
    button: 'bg-rose-500 text-white',
    buttonHover: 'hover:bg-rose-600',
    subtle: 'bg-rose-50',
    subtleHover: 'hover:bg-rose-100',
    subtleText: 'text-rose-600',
    dashed: 'hover:border-rose-300 hover:bg-rose-50/70',
  },
};

export function getNodeToolTone(accent: NodeToolAccent) {
  return TONE_MAP[accent];
}

type NodeToolEmptyStateProps = {
  accent: NodeToolAccent;
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  onActivate: () => void;
};

export function NodeToolEmptyState({
  accent,
  icon,
  title,
  description,
  actionLabel,
  onActivate,
}: NodeToolEmptyStateProps) {
  const tone = getNodeToolTone(accent);

  return (
    <button
      type="button"
      onClick={onActivate}
      className={`w-full rounded-[1.75rem] border border-dashed border-neutral-200 bg-white px-5 py-10 text-center transition-all ${tone.dashed}`}
    >
      <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl ${tone.tint} ${tone.text}`}>
        {icon}
      </div>
      <div className="text-sm font-black text-neutral-800">{title}</div>
      <div className="mt-1 text-xs leading-6 text-neutral-400">{description}</div>
      <div className={`mt-5 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${tone.button} ${tone.buttonHover}`}>
        {actionLabel}
        <ChevronRight className="h-3.5 w-3.5" />
      </div>
    </button>
  );
}

type NodeToolWorkspaceHeaderProps = {
  accent: NodeToolAccent;
  eyebrow: string;
  title: string;
  description: string;
  badge?: string;
  meta?: string;
  actions?: ReactNode;
};

export function NodeToolWorkspaceHeader({
  accent,
  eyebrow,
  title,
  description,
  badge,
  meta,
  actions,
}: NodeToolWorkspaceHeaderProps) {
  const tone = getNodeToolTone(accent);

  return (
    <div className="rounded-[1.5rem] border border-neutral-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${tone.tint} ${tone.text}`}>
              {eyebrow}
            </span>
            {badge && (
              <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">
                {badge}
              </span>
            )}
          </div>
          <div className="mt-3 text-sm font-black text-neutral-900">{title}</div>
          <div className="mt-1 text-[11px] leading-6 text-neutral-400">{description}</div>
          {meta && <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">{meta}</div>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

type NodeToolSectionProps = {
  children: ReactNode;
  className?: string;
  key?: Key;
};

export function NodeToolSection({ children, className = '' }: NodeToolSectionProps) {
  return <div className={`rounded-[1.5rem] border border-neutral-200 bg-white p-4 ${className}`.trim()}>{children}</div>;
}

type NodeToolFieldLabelProps = {
  children: ReactNode;
};

export function NodeToolFieldLabel({ children }: NodeToolFieldLabelProps) {
  return <label className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-400">{children}</label>;
}

type NodeToolButtonProps = {
  accent: NodeToolAccent;
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  title?: string;
  className?: string;
};

export function NodeToolPrimaryButton({
  accent,
  children,
  onClick,
  type = 'button',
  title,
  className = '',
}: NodeToolButtonProps) {
  const tone = getNodeToolTone(accent);

  return (
    <button
      type={type}
      onClick={onClick}
      title={title}
      className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${tone.button} ${tone.buttonHover} ${className}`.trim()}
    >
      {children}
    </button>
  );
}

export function NodeToolSecondaryButton({
  accent,
  children,
  onClick,
  type = 'button',
  title,
  className = '',
}: NodeToolButtonProps) {
  const tone = getNodeToolTone(accent);

  return (
    <button
      type={type}
      onClick={onClick}
      title={title}
      className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${tone.subtle} ${tone.subtleText} ${tone.subtleHover} ${className}`.trim()}
    >
      {children}
    </button>
  );
}

type NodeToolDashedActionProps = {
  accent: NodeToolAccent;
  icon?: ReactNode;
  label: string;
  onClick: () => void;
};

export function NodeToolDashedAction({ accent, icon, label, onClick }: NodeToolDashedActionProps) {
  const tone = getNodeToolTone(accent);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[1.5rem] border-2 border-dashed border-neutral-200 bg-white px-4 py-4 text-center transition-all ${tone.dashed}`}
    >
      <div className="flex items-center justify-center gap-2">
        {icon}
        <span className="text-sm font-bold text-neutral-600">{label}</span>
      </div>
    </button>
  );
}
