import { useCallback, useEffect, useState } from 'react';
import { errorState, loadingState, readyState, type QueryState } from '@/services/queryState';

/** Keeps pages declarative: data access stays inside repositories. */
export function useRemoteQuery<T>(load: () => Promise<T>, dependencies: readonly unknown[] = []) {
  const [state, setState] = useState<QueryState<T>>(loadingState);
  const retry = useCallback(async () => {
    setState(loadingState());
    try { setState(readyState(await load())); }
    catch (error) { setState(errorState(error instanceof Error ? error : new Error('Unable to load data'))); }
  // Callers provide stable repository loaders.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
  useEffect(() => { void retry(); }, [retry]);
  return { state, retry };
}
