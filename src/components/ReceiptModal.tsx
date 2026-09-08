import { CheckCircle2, Clock, Volume2, WifiOff, X } from 'lucide-react';
import type { WalletTx } from '@/lib/payments';
import { rupeesToWords, sentenceCase } from '@/lib/payments';
import { formatINR } from '@/lib/format';
import { useI18n } from '@/i18n';

const BCP47: Record<string, string> = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN', bn: 'bn-IN', ta: 'ta-IN' };

const KIND_KEY: Record<WalletTx['kind'], 'receipt.moneyAdded' | 'receipt.moneySent' | 'receipt.moneyReceived' | 'receipt.obligationPayment' | 'receipt.paymentRequest'> = {
  topup: 'receipt.moneyAdded',
  send: 'receipt.moneySent',
  receive: 'receipt.moneyReceived',
  obligation: 'receipt.obligationPayment',
  request: 'receipt.paymentRequest',
};

export function ReceiptModal({ tx, onClose }: { tx: WalletTx; onClose: () => void }) {
  const { t, lang } = useI18n();

  const badge = tx.status === 'queued'
    ? { icon: WifiOff, text: t('receipt.queuedOffline'), className: 'text-gold-500 border-gold-300/40 bg-gold-50' }
    : tx.status === 'pending'
      ? { icon: Clock, text: t('receipt.awaitingPayment'), className: 'text-paper-muted border-line bg-ink-elevated' }
      : { icon: CheckCircle2, text: t('receipt.completed'), className: 'text-ok-500 border-ok-400/20 bg-ok-400/5' };
  const BadgeIcon = badge.icon;
  const signedAmount = `${tx.direction === 'in' ? '+' : '−'}${formatINR(tx.amount)}`;
  const when = new Date(tx.createdAt).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const speak = () => {
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(`${sentenceCase(rupeesToWords(tx.amount))} — ${tx.direction === 'in' ? t('receipt.from') : t('receipt.to')} ${tx.counterparty}`);
    utterance.lang = BCP47[lang] ?? 'en-IN';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="scrim fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 backdrop-blur-[2px]" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-title"
        className="modal my-auto w-full max-w-md p-5 sm:p-7 animate-scale-in"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="eyebrow mb-2">{t('receipt.title')}</div>
            <h2 id="receipt-title" className="font-display text-xl font-semibold tracking-[-0.025em] text-paper">{t(KIND_KEY[tx.kind])}</h2>
          </div>
          <button type="button" onClick={onClose} className="text-paper-faint hover:text-paper" aria-label={t('common.close')}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border border-line bg-ink-elevated/40 p-5 text-center">
          <div className="font-display text-3xl font-semibold tracking-[-0.03em] text-paper">{signedAmount}</div>
          <div className="mt-1 text-xs text-paper-muted">{sentenceCase(rupeesToWords(tx.amount))}</div>
          <div className="mt-3 flex items-center justify-center gap-3">
            <span className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 text-[10px] font-medium uppercase tracking-[0.08em] ${badge.className}`}>
              <BadgeIcon className="h-3 w-3" aria-hidden="true" />
              {badge.text}
            </span>
            {'speechSynthesis' in window && (
              <button type="button" onClick={speak} className="inline-flex items-center gap-1 text-[11px] text-paper-muted hover:text-paper">
                <Volume2 className="h-3 w-3" /> {t('payment.speak')}
              </button>
            )}
          </div>
        </div>

        <dl className="mt-5 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-paper-muted">{tx.direction === 'in' ? t('receipt.from') : t('receipt.to')}</dt>
            <dd className="font-medium text-paper text-right">{tx.counterparty}</dd>
          </div>
          {tx.note && (
            <div className="flex items-center justify-between gap-4">
              <dt className="text-paper-muted">{t('receipt.note')}</dt>
              <dd className="text-paper text-right">{tx.note}</dd>
            </div>
          )}
          <div className="flex items-center justify-between gap-4">
            <dt className="text-paper-muted">{t('receipt.reference')}</dt>
            <dd className="font-mono text-paper">{tx.reference}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-paper-muted">{t('receipt.dateTime')}</dt>
            <dd className="text-paper text-right">{when}</dd>
          </div>
        </dl>

        <p className="mt-5 rounded-md border border-gold-300/30 bg-gold-50 px-3 py-2 text-center text-[11px] font-mono uppercase tracking-wider text-gold-500">
          {t('receipt.simulationNote')}
        </p>

        <button type="button" onClick={onClose} className="btn-outline mt-5 w-full">{t('common.done')}</button>
      </div>
    </div>
  );
}
