import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Moon, Settings, Sun } from 'lucide-react';
import { useI18n } from '@/i18n';
import { usePreferences } from '@/preferences';
import { useTheme } from '@/hooks/useTheme';

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full border transition-colors ${checked ? 'border-sage-400 bg-sage-400' : 'border-line bg-ink-elevated'}`}
    >
      <span className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-ink-surface shadow transition-all ${checked ? 'left-4' : 'left-0.5'}`} />
    </button>
  );
}

export function SettingsMenu({ className = '' }: { className?: string }) {
  const { t, lang, setLang, languages } = useI18n();
  const prefs = usePreferences();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setCoords({ top: rect.bottom + 8, right: Math.max(8, window.innerWidth - rect.right) });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!buttonRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={className}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="btn btn-ghost"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={t('settings.title')}
      >
        <Settings className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{t('settings.title')}</span>
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          role="menu"
          className="elevated fixed z-[100] w-72 rounded-lg p-4 animate-scale-in"
          style={{ top: coords.top, right: coords.right, maxHeight: 'calc(100vh - 5rem)', overflowY: 'auto' }}
        >
          <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-paper-muted">{t('settings.language')}</div>
          <div className="mb-4 space-y-0.5">
            {languages.map(({ code, complete }) => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${lang === code ? 'bg-sage-50 text-sage-500' : 'text-paper hover:bg-sage-50/60'}`}
              >
                <span className="truncate">
                  {t(`lang.${code}`)}
                  {!complete && <span className="ml-1.5 text-[10px] text-paper-faint">draft</span>}
                </span>
                {lang === code && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>
            ))}
          </div>

          <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-paper-muted">{t('settings.theme')}</div>
          <div className="mb-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-sm transition-colors ${theme === 'light' ? 'border-sage-400 bg-sage-50 text-sage-500' : 'border-line text-paper hover:bg-sage-50/60'}`}
            >
              <Sun className="h-3.5 w-3.5" /> {t('settings.theme.light')}
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-sm transition-colors ${theme === 'dark' ? 'border-sage-400 bg-sage-50 text-sage-500' : 'border-line text-paper hover:bg-sage-50/60'}`}
            >
              <Moon className="h-3.5 w-3.5" /> {t('settings.theme.dark')}
            </button>
          </div>

          <div className="space-y-3 border-t border-line pt-3">
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm text-paper">{t('settings.largeText')}</span>
              <Toggle checked={prefs.largeText} onChange={(v) => prefs.setPreference('largeText', v)} label={t('settings.largeText')} />
            </label>
            <label className="flex items-start justify-between gap-3">
              <span className="text-sm text-paper">
                {t('settings.simpleMode')}
                <span className="mt-0.5 block text-[11px] text-paper-muted">{t('settings.simpleMode.hint')}</span>
              </span>
              <Toggle checked={prefs.simpleMode} onChange={(v) => prefs.setPreference('simpleMode', v)} label={t('settings.simpleMode')} />
            </label>
            <label className="block">
              <span className="text-sm text-paper">{t('settings.dailyLimit')}</span>
              <span className="mb-1.5 mt-0.5 block text-[11px] text-paper-muted">{t('settings.dailyLimit.hint')}</span>
              <input
                type="number"
                min="0"
                step="100"
                inputMode="numeric"
                value={prefs.dailyLimit || ''}
                onChange={(event) => prefs.setPreference('dailyLimit', Math.max(0, Math.round(Number(event.target.value) || 0)))}
                className="input"
                placeholder="0"
              />
            </label>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
