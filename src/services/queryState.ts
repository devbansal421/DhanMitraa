export type QueryState<T> =
  | { status: 'loading'; data: null; error: null }
  | { status: 'ready'; data: T; error: null }
  | { status: 'error'; data: null; error: Error & { code?: string } };

export const loadingState = <T,>(): QueryState<T> => ({ status: 'loading', data: null, error: null });
export const readyState = <T,>(data: T): QueryState<T> => ({ status: 'ready', data, error: null });
export const errorState = <T,>(error: Error & { code?: string }): QueryState<T> => ({ status: 'error', data: null, error });

export function toQueryError(error: { message: string; code?: string }) {
  return Object.assign(new Error(error.message), { code: error.code });
}

export function isPermissionError(error: { code?: string; message?: string }) {
  return error.code === '42501' || /permission denied|row-level security/i.test(error.message || '');
}
