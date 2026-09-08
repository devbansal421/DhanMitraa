import type { ReactNode } from 'react';
import { isPermissionError, type QueryState } from '@/services/queryState';
import { useT } from '@/i18n';

export function RemoteState<T>({ state, onRetry, emptyTitle, emptyDescription, children }: {
  state: QueryState<T>;
  onRetry: () => void;
  emptyTitle: string;
  emptyDescription: string;
  children: (data: T) => ReactNode;
}) {
  const t = useT();
  if (state.status === 'loading') {
    return <div className="grid min-h-48 place-items-center border border-line bg-ink-elevated/20 p-6 text-sm text-paper-muted">{t('remote.loading')}</div>;
  }
  if (state.status === 'error') {
    const denied = isPermissionError(state.error);
    const schemaMissing = state.error.code === 'PGRST205' || /schema cache|could not find the table/i.test(state.error.message);
    return (
      <div className="border border-terra-400/30 bg-terra-400/5 p-6 text-center">
        <p className="text-sm font-medium text-paper">{schemaMissing ? t('remote.dbIncomplete') : denied ? t('remote.noAccess') : t('remote.couldNotLoad')}</p>
        <p className="mt-1 text-sm text-paper-muted">{schemaMissing ? t('remote.applyMigrations') : denied ? t('remote.askAdmin') : state.error.message}</p>
        <button type="button" onClick={onRetry} className="btn-ghost mt-4">{t('common.retry')}</button>
      </div>
    );
  }
  if (Array.isArray(state.data) && state.data.length === 0) {
    return <div className="border border-dashed border-line-accent bg-sage-50/40 p-6 text-center"><p className="text-sm font-medium text-paper">{emptyTitle}</p><p className="mt-1 text-sm text-paper-muted">{emptyDescription}</p></div>;
  }
  return <>{children(state.data)}</>;
}
