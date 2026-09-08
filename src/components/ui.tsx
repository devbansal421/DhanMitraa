import { useCountUp } from '@/hooks/useCountUp';
import { formatINR } from '@/lib/format';

export function AnimatedNumber({ value, format = true, suffix = '' }: { value: number; format?: boolean; suffix?: string }) {
  const display = useCountUp(value);
  return <>{(format ? formatINR(display) : display.toLocaleString('en-IN')) + suffix}</>;
}

export function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  return (
    <div className={`h-1.5 rounded-full bg-sage-100 overflow-hidden ${className}`}>
      <div
        className="h-full rounded-full bg-sage-400 transition-all duration-1000 ease-out"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export function ScoreBar({ value, color = 'gold' }: { value: number; color?: 'gold' | 'sage' | 'terra' | 'ok' }) {
  const colorMap = {
    gold: 'bg-gold-300',
    sage: 'bg-sage-400',
    terra: 'bg-terra-400',
    ok: 'bg-ok-400',
  };
  return (
    <div className="h-1.5 rounded-full bg-sage-100 overflow-hidden">
      <div
        className={`h-full ${colorMap[color]} transition-all duration-700 ease-out`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export function PageHeader({ title, subtitle, sectionNum }: { title: string; subtitle?: string; sectionNum?: string }) {
  return (
    <div className="mb-8 animate-fade-in-up">
      {sectionNum && <div className="section-num mb-3">{sectionNum}</div>}
      <h2 className="font-display text-3xl font-semibold text-paper tracking-[-0.035em] text-balance sm:text-[2rem]">{title}</h2>
      {subtitle && <p className="max-w-2xl text-sm leading-6 text-paper-muted mt-2">{subtitle}</p>}
    </div>
  );
}

export function Card({ children, className = '', hover = false }: { children: React.ReactNode; className?: string; hover?: boolean }) {
  return (
    <div className={`${hover ? 'surface-hover' : 'surface'} rounded-lg ${className}`}>
      {children}
    </div>
  );
}

export function StatusPill({ status, label }: { status: 'secured' | 'pending' | 'verified' | 'completed' | 'active' | 'funded'; label?: string }) {
  const map = {
    secured: 'text-ok-500 border-ok-400/20 bg-ok-400/5',
    pending: 'text-paper-muted border-line bg-ink-elevated',
    verified: 'text-gold-500 border-gold-300/30 bg-gold-50',
    completed: 'text-ok-500 border-ok-400/20 bg-ok-400/5',
    active: 'text-sage-500 border-sage-300/40 bg-sage-50',
    funded: 'text-ok-500 border-ok-400/20 bg-ok-400/5',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-[10px] font-medium uppercase tracking-[0.08em] border ${map[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'pending' ? 'bg-paper-muted' : 'bg-current'}`} />
      {label || status}
    </span>
  );
}
