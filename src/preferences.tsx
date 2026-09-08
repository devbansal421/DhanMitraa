import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export interface Preferences {
  largeText: boolean;
  simpleMode: boolean;
  dailyLimit: number; // rupees; 0 = no limit
}

const DEFAULTS: Preferences = { largeText: false, simpleMode: false, dailyLimit: 0 };
const STORAGE_KEY = 'dhanmitraa:preferences:v2';

interface PreferencesContextValue extends Preferences {
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function load(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return {
      largeText: parsed.largeText === true,
      simpleMode: parsed.simpleMode === true,
      dailyLimit: typeof parsed.dailyLimit === 'number' && parsed.dailyLimit >= 0 ? parsed.dailyLimit : 0,
    };
  } catch {
    return DEFAULTS;
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(load);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
    const root = document.documentElement;
    root.classList.toggle('text-large', prefs.largeText);
    root.classList.toggle('simple', prefs.simpleMode);
  }, [prefs]);

  const setPreference = useCallback<PreferencesContextValue['setPreference']>((key, value) => {
    setPrefs((current) => ({ ...current, [key]: value }));
  }, []);

  const value = useMemo<PreferencesContextValue>(() => ({ ...prefs, setPreference }), [prefs, setPreference]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}
