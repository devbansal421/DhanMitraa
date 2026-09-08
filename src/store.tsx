import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import type { Crop } from '@/types';
import { listCrops } from '@/services/cropsRepository';
import { errorState, loadingState, readyState, type QueryState } from '@/services/queryState';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'info' | 'warning';
}

interface Store {
  crops: Crop[];
  cropsState: QueryState<Crop[]>;
  retryCrops: () => void;
  demoActive: boolean;
  setDemoActive: (value: boolean) => void;
  toasts: Toast[];
  toast: (message: string, type?: Toast['type']) => void;
  dismissToast: (id: number) => void;
}

const Ctx = createContext<Store | null>(null);

let toastId = 0;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [cropState, setCropState] = useState<Crop[]>([]);
  const [cropsState, setCropsState] = useState<QueryState<Crop[]>>(loadingState);
  // Demo progress is deliberately session-only: reopening the app should start a fresh walkthrough.
  const [demoActive, setDemoActive] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const fetchCrops = useCallback(async () => {
    setCropsState(loadingState());
    try {
      const crops = await listCrops();
      setCropState(crops);
      setCropsState(readyState(crops));
    } catch (error) {
      setCropState([]);
      setCropsState(errorState(error instanceof Error ? error : new Error('Unable to load crops')));
    }
  }, []);

  useEffect(() => { void fetchCrops(); }, [fetchCrops]);

  const toast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = ++toastId;
    setToasts((current) => [...current, { id, message, type }]);
    setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 3500);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const retryCrops = useCallback(() => { void fetchCrops(); }, [fetchCrops]);

  // Without memoisation every toast add/remove produces a new context value and
  // re-renders every page that calls useStore().
  const value = useMemo<Store>(() => ({
    crops: cropState,
    cropsState,
    retryCrops,
    demoActive,
    setDemoActive,
    toasts,
    toast,
    dismissToast,
  }), [cropState, cropsState, retryCrops, demoActive, toasts, toast, dismissToast]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
