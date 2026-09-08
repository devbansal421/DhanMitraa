import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { en, type TranslationKey } from '@/i18n/en';
import { hi } from '@/i18n/hi';
import { mr } from '@/i18n/mr';
import { bn } from '@/i18n/bn';
import { ta } from '@/i18n/ta';

export type LangCode = 'en' | 'hi' | 'mr' | 'bn' | 'ta';

const DICTIONARIES: Record<LangCode, Partial<Record<TranslationKey, string>>> = { en, hi, mr, bn, ta };

/** Order shown in the language picker. `nativeName` comes from each dictionary's
 *  own `lang.<code>` entry so it always renders in that language's script. */
export const LANGUAGES: { code: LangCode; complete: boolean }[] = [
  { code: 'en', complete: true },
  { code: 'hi', complete: true },
  { code: 'mr', complete: false },
  { code: 'bn', complete: false },
  { code: 'ta', complete: false },
];

const STORAGE_KEY = 'dhanmitraa:lang';

function detectInitialLang(): LangCode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved in DICTIONARIES) return saved as LangCode;
  } catch { /* storage blocked */ }
  const nav = typeof navigator !== 'undefined' ? navigator.language.slice(0, 2) : 'en';
  return (nav in DICTIONARIES ? nav : 'en') as LangCode;
}

interface I18n {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
  /** Translate a key, filling `{placeholders}` from `vars`. Falls back to English, then the key. */
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  languages: typeof LANGUAGES;
}

const I18nContext = createContext<I18n | null>(null);

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name) => (name in vars ? String(vars[name]) : `{${name}}`));
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(detectInitialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: LangCode) => {
    setLangState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
  }, []);

  const t = useCallback<I18n['t']>((key, vars) => {
    const value = DICTIONARIES[lang][key] ?? en[key] ?? key;
    return interpolate(value, vars);
  }, [lang]);

  const value = useMemo<I18n>(() => ({ lang, setLang, t, languages: LANGUAGES }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

/** Shorthand when a component only needs the translate function. */
export function useT() {
  return useI18n().t;
}
