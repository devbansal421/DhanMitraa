import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, CreditCard, ShieldCheck, Volume2, WifiOff, X } from 'lucide-react';
import { useWallet } from '@/wallet';
import { useI18n } from '@/i18n';
import { usePreferences } from '@/preferences';
import { useCurrentIdentity } from '@/components/AuthGate';
import { useVerifiedPayees } from '@/hooks/useVerifiedPayees';
import { isGatewayEnabled, topUpViaGateway, GatewayError } from '@/services/paymentGateway';
import type { Obligation } from '@/types';
import type { DomainResult, WalletTx } from '@/lib/payments';
import { formatINR } from '@/lib/format';

export type PaymentMode = 'send' | 'request' | 'topup' | 'pay-obligation';

interface PaymentSheetProps {
  mode: PaymentMode;
  obligation?: { obligation: Obligation; cropName?: string };
  onClose: () => void;
  onComplete?: (tx: WalletTx) => void;
}

const BCP47: Record<string, string> = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN', bn: 'bn-IN', ta: 'ta-IN' };

export function PaymentSheet({ mode, obligation, onClose, onComplete }: PaymentSheetProps) {
  const wallet = useWallet();
  const { t, lang } = useI18n();
  const { dailyLimit } = usePreferences();
  const { displayName } = useCurrentIdentity();
  const { isVerified } = useVerifiedPayees();
  const [gatewayPending, setGatewayPending] = useState(false);
  const locked = mode === 'pay-obligation' && Boolean(obligation);
  const gatewayAvailable = mode === 'topup' && isGatewayEnabled();

  const titleKey = mode === 'pay-obligation' ? 'obligation' : mode;
  const partyLabel = mode === 'send' ? t('payment.field.sendTo')
    : mode === 'request' ? t('payment.field.requestFrom')
    : mode === 'topup' ? t('payment.field.from')
    : t('payment.field.payTo');
  const partyPlaceholder = mode === 'topup' ? t('payment.field.bankUpi') : t('payment.field.nameOrBusiness');
  const cta = t(`payment.${titleKey}.cta`);

  const [step, setStep] = useState<'form' | 'confirm' | 'done'>('form');
  const [party, setParty] = useState(obligation?.obligation.party ?? '');
  const [amount, setAmount] = useState(obligation ? String(obligation.obligation.amount) : '');
  const [note, setNote] = useState(
    obligation ? [obligation.obligation.label, obligation.cropName].filter(Boolean).join(' · ') : '',
  );
  const [error, setError] = useState('');
  const [result, setResult] = useState<WalletTx | null>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => { firstFieldRef.current?.focus(); }, []);

  const parsedAmount = Math.round(Number(amount)) || 0;
  const isSpend = mode === 'send' || mode === 'pay-obligation';
  const offlineSpend = isSpend && !wallet.online;
  const partyVerified = Boolean(party.trim()) && isVerified(party);
  const knownPayee = wallet.recentPayees.some((name) => name.toLowerCase() === party.trim().toLowerCase());
  const newPayeeWarning = mode === 'send' && Boolean(party.trim()) && !partyVerified && !knownPayee;

  const goReview = () => {
    setError('');
    if (!locked && mode !== 'topup' && !party.trim()) { setError(t('payment.enterWho')); return; }
    if (parsedAmount <= 0) { setError(t('payment.enterAmount')); return; }
    if (isSpend && parsedAmount > wallet.balance) { setError(t('payment.onlyHave', { amount: formatINR(wallet.balance) })); return; }
    if (isSpend && dailyLimit > 0 && wallet.spentToday + parsedAmount > dailyLimit) {
      setError(t('payment.overLimit', { amount: formatINR(dailyLimit) }));
      return;
    }
    setStep('confirm');
  };

  const submit = () => {
    let outcome: DomainResult<WalletTx>;
    if (mode === 'send') outcome = wallet.sendMoney({ to: party, amount, note });
    else if (mode === 'request') outcome = wallet.requestMoney({ from: party, amount, note });
    else if (mode === 'topup') outcome = wallet.addMoney(amount, party);
    else if (obligation) outcome = wallet.payObligation(obligation.obligation, obligation.cropName);
    else outcome = { ok: false, message: 'Nothing to pay.' };

    if (!outcome.ok) { setError(outcome.message); setStep('form'); return; }
    setResult(outcome.value);
    setStep('done');
    onComplete?.(outcome.value);
  };

  const payViaGateway = async () => {
    setError('');
    if (parsedAmount <= 0) { setError(t('payment.enterAmount')); return; }
    setGatewayPending(true);
    try {
      const outcome = await topUpViaGateway({ amountRupees: parsedAmount, displayName });
      wallet.addMoney(outcome.amountRupees, 'UPI / card (Razorpay)');
      wallet.refreshServer();
      setResult({
        id: outcome.paymentId, direction: 'in', kind: 'topup', amount: outcome.amountRupees,
        counterparty: 'UPI / card (Razorpay)', reference: outcome.paymentId.slice(-10).toUpperCase(),
        createdAt: new Date().toISOString(), status: 'completed',
      });
      setStep('done');
    } catch (err) {
      if (err instanceof GatewayError && err.kind === 'dismissed') { /* user closed it */ }
      else if (err instanceof GatewayError && err.kind === 'not-configured') setError(t('payment.gateway.notConfigured'));
      else if (err instanceof GatewayError && err.kind === 'offline') setError(t('payment.offlineQueueShort'));
      else setError(err instanceof Error ? err.message : t('assistant.error'));
    } finally {
      setGatewayPending(false);
    }
  };

  const speakConfirmation = () => {
    if (!('speechSynthesis' in window)) return;
    const name = locked ? obligation!.obligation.party : party;
    const utterance = new SpeechSynthesisUtterance(`${wallet.amountInWords(parsedAmount)} — ${partyLabel} ${name}`);
    utterance.lang = BCP47[lang] ?? 'en-IN';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="scrim fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 backdrop-blur-[2px]" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-sheet-title"
        className="modal my-auto w-full max-w-md p-5 sm:p-7 animate-scale-in"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            {step === 'confirm' && (
              <button type="button" onClick={() => setStep('form')} className="text-paper-faint hover:text-paper" aria-label={t('common.back')}>
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div>
              <div className="eyebrow mb-1">{t('payment.eyebrow')}</div>
              <h2 id="payment-sheet-title" className="font-display text-xl font-semibold tracking-[-0.025em] text-paper">
                {step === 'done' ? t(`payment.${titleKey}.success`) : t(`payment.${titleKey}.title`)}
              </h2>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-paper-faint hover:text-paper" aria-label={t('common.close')}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {step === 'form' && (
          <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); goReview(); }}>
            {mode === 'send' && wallet.recentPayees.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[11px] text-paper-muted">{t('payment.recentPayees')}:</span>
                {wallet.recentPayees.map((name) => (
                  <button key={name} type="button" onClick={() => setParty(name)} className="rounded-full border border-line px-2 py-0.5 text-[11px] text-paper hover:border-sage-300">
                    {name}
                  </button>
                ))}
              </div>
            )}
            <div>
              <label htmlFor="payment-party" className="mb-1.5 block text-sm font-medium text-paper">{partyLabel}</label>
              <input
                ref={firstFieldRef}
                id="payment-party"
                className="input"
                value={locked ? obligation!.obligation.party : party}
                onChange={(event) => setParty(event.target.value)}
                placeholder={partyPlaceholder}
                disabled={locked}
              />
              {partyVerified && (
                <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-ok-500">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> {t('payment.verified')}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="payment-amount" className="mb-1.5 block text-sm font-medium text-paper">{t('payment.field.amount')}</label>
              <input
                id="payment-amount"
                className="input text-lg"
                inputMode="numeric"
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0"
                disabled={locked}
              />
              {parsedAmount > 0 && <p className="mt-1.5 text-xs text-paper-muted">{wallet.amountInWords(parsedAmount)}</p>}
            </div>
            <div>
              <label htmlFor="payment-note" className="mb-1.5 block text-sm font-medium text-paper">
                {t('payment.field.note')} <span className="text-paper-faint">({t('common.optional')})</span>
              </label>
              <input id="payment-note" className="input" value={note} onChange={(event) => setNote(event.target.value)} placeholder={t('payment.field.whatFor')} disabled={locked} />
            </div>

            {!locked && (
              <p className="text-xs text-paper-muted">{t('payment.availableBalance')}: <span className="font-medium text-paper">{formatINR(wallet.balance)}</span></p>
            )}
            {offlineSpend && (
              <p className="flex items-center gap-2 rounded-md border border-gold-300/30 bg-gold-50 px-3 py-2 text-xs text-gold-500">
                <WifiOff className="h-3.5 w-3.5" aria-hidden="true" /> {t('payment.offlineQueue')}
              </p>
            )}
            {error && <p role="alert" className="rounded-md border border-terra-400/25 bg-terra-400/5 px-3 py-2 text-sm text-terra-500">{error}</p>}

            {gatewayAvailable && (
              <button
                type="button"
                onClick={() => void payViaGateway()}
                disabled={gatewayPending}
                className="btn-outline w-full"
              >
                <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
                {gatewayPending ? t('payment.gateway.opening') : t('payment.gateway.cta')}
              </button>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
              <button type="button" onClick={onClose} className="btn-ghost w-full sm:w-auto">{t('common.cancel')}</button>
              <button type="submit" className="btn-gold w-full sm:w-auto">{t('common.review')}</button>
            </div>
          </form>
        )}

        {step === 'confirm' && (
          <div className="space-y-5">
            <div className="border border-line bg-ink-elevated/40 p-5 text-center">
              <div className="font-display text-3xl font-semibold tracking-[-0.03em] text-paper">{formatINR(parsedAmount)}</div>
              <div className="mt-1 text-xs text-paper-muted">{wallet.amountInWords(parsedAmount)}</div>
              {'speechSynthesis' in window && (
                <button type="button" onClick={speakConfirmation} className="mt-2 inline-flex items-center gap-1 text-[11px] text-paper-muted hover:text-paper">
                  <Volume2 className="h-3 w-3" /> {t('payment.speak')}
                </button>
              )}
            </div>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-paper-muted">{partyLabel}</dt>
                <dd className="font-medium text-paper text-right">{(locked ? obligation!.obligation.party : party) || partyPlaceholder}</dd>
              </div>
              {note && (
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-paper-muted">{t('payment.field.note')}</dt>
                  <dd className="text-paper text-right">{note}</dd>
                </div>
              )}
              <div className="flex items-center justify-between gap-4">
                <dt className="text-paper-muted">{t('payment.balanceAfter')}</dt>
                <dd className="text-paper text-right">
                  {formatINR(isSpend ? wallet.balance - parsedAmount : mode === 'topup' ? wallet.balance + parsedAmount : wallet.balance)}
                </dd>
              </div>
            </dl>
            {newPayeeWarning && (
              <p className="rounded-md border border-gold-300/30 bg-gold-50 px-3 py-2 text-xs text-gold-500">{t('payment.newPayee')}</p>
            )}
            {offlineSpend && (
              <p className="flex items-center gap-2 rounded-md border border-gold-300/30 bg-gold-50 px-3 py-2 text-xs text-gold-500">
                <WifiOff className="h-3.5 w-3.5" aria-hidden="true" /> {t('payment.offlineQueueShort')}
              </p>
            )}
            {error && <p role="alert" className="rounded-md border border-terra-400/25 bg-terra-400/5 px-3 py-2 text-sm text-terra-500">{error}</p>}
            <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setStep('form')} className="btn-ghost w-full sm:w-auto">{t('common.back')}</button>
              <button type="button" onClick={submit} className="btn-gold w-full sm:w-auto">{cta}</button>
            </div>
          </div>
        )}

        {step === 'done' && result && (
          <div className="space-y-5 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ok-400/10 animate-scale-in">
              <CheckCircle2 className="h-6 w-6 text-ok-500" aria-hidden="true" />
            </div>
            <div>
              <div className="font-display text-2xl font-semibold tracking-[-0.03em] text-paper">
                {result.direction === 'in' && result.status !== 'pending' ? '+' : result.direction === 'out' ? '−' : ''}{formatINR(result.amount)}
              </div>
              <p className="mt-1 text-sm text-paper-muted">
                {result.status === 'queued' ? t('payment.queuedOffline') : result.status === 'pending' ? t('payment.requestSentAwaiting') : t('payment.recordedInWallet')}
              </p>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-paper-muted">{result.direction === 'in' ? t('receipt.from') : t('receipt.to')}</dt>
                <dd className="font-medium text-paper text-right">{result.counterparty}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-paper-muted">{t('receipt.reference')}</dt>
                <dd className="font-mono text-paper">{result.reference}</dd>
              </div>
            </dl>
            <p className="rounded-md border border-gold-300/30 bg-gold-50 px-3 py-2 text-[11px] font-mono uppercase tracking-wider text-gold-500">
              {t('receipt.simulationNote')}
            </p>
            <button type="button" onClick={onClose} className="btn-gold w-full">{t('common.done')}</button>
          </div>
        )}
      </div>
    </div>
  );
}
