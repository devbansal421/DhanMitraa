import { useStore } from '@/store';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export function Toasts() {
  const { toasts, dismissToast } = useStore();

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 space-y-2 sm:bottom-6 sm:left-auto sm:right-6 sm:w-auto" aria-live="polite" aria-atomic="true">
      {toasts.map((t) => {
        const Icon = t.type === 'success' ? CheckCircle2 : t.type === 'warning' ? AlertTriangle : Info;
        const color = t.type === 'success' ? 'text-ok-400' : t.type === 'warning' ? 'text-terra-400' : 'text-gold-200';
        return (
          <div
            key={t.id}
            role="status"
            className="elevated rounded-md px-4 py-3.5 flex items-center gap-3 animate-slide-in w-full sm:min-w-[280px] sm:max-w-sm"
          >
            <Icon className={`w-4 h-4 shrink-0 ${color}`} />
            <span className="text-sm text-paper flex-1">{t.message}</span>
            <button type="button" onClick={() => dismissToast(t.id)} className="text-paper-faint hover:text-paper" aria-label="Dismiss notification">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
