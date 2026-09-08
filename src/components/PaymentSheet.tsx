import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Search, ShieldCheck, Volume2, WifiOff, X } from 'lucide-react';
import { useWallet } from '@/wallet';
import { useI18n } from '@/i18n';
import { usePreferences } from '@/preferences';
import { listParticipants } from '@/services/networkRepository';
import type { Obligation, Participant } from '@/types';
import type { DomainResult, WalletTx } from '@/lib/payments';
import { formatINR } from '@/lib/format';

export type PaymentMode = 'send' | 'pay-obligation';

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
  const locked = mode === 'pay-obligation' && Boolean(obligation);

  const [step, setStep] = useState<'form' | 'confirm' | 'done'>('form');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [partiesState, setPartiesState] = useState<'loading' | 'ready' | 'error'>(locked ? 'ready' : 'loading');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Participant | null>(null);
  const [amount, setAmount] = useState(obligation ? String(obligation.obligation.amount) : '');
  const [note, setNote] = useState(
    obligation ? [obligation.obligation.label, obligation.cropName].filter(Boolean).join(' · ') : '',
  );
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<WalletTx | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (locked) return;
    let active = true;
    listParticipants()
      .then((list) => { if (active) { setParticipants(list); setPartiesState('ready'); } })
      .catch(() => { if (active) setPartiesState('error'); });
    return () => { active = false; };
  }, [locked]);

  useEffect(() => { searchRef.current?.focus(); }, []);

  const partyName = locked ? obligation!.obligation.party : selected?.name ?? '';
  const partyOrgId = locked ? obligation!.obligation.partyOrgId : selected?.id ?? '';
  const parsedAmount = Math.round(Number(amount)) || 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? participants.filter((p) => p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q)) : participants;
    return [...list].sort((a, b) => b.reliability - a.reliability);
  }, [participants, query]);

  const knownPayee = wallet.recentPayees.some((n) => n.toLowerCase() === partyName.toLowerCase());
  const offlineSpend = !wallet.online;

  const goReview = () => {
    setError('');
    if (!partyOrgId) { setError(t('payment.selectParty')); return; }
    if (parsedAmount <= 0) { setError(t('payment.enterAmount')); return; }
    if (parsedAmount > wallet.balance) { setError(t('payment.onlyHave', { amount: formatINR(wallet.balance) })); return; }
    if (dailyLimit > 0 && wallet.spentToday + parsedAmount > dailyLimit) {
      setError(t('payment.overLimit', { amount: formatINR(dailyLimit) }));
      return;
    }
    setStep('confirm');
  };

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError('');
    const outcome: DomainResult<WalletTx> = locked
      ? await wallet.payObligation(obligation!.obligation, obligation!.cropName)
      : await wallet.sendMoney({ recipientOrgId: partyOrgId, label: partyName, amount, note });
    setSubmitting(false);
    if (!outcome.ok) { setError(outcome.message); setStep('form'); return; }
    setResult(outcome.value);
    setStep('done');
    onComplete?.(outcome.value);
  };

  const speakConfirmation = () => {
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(`${wallet.amountInWords(parsedAmount)} — ${t('payment.field.payTo')} ${partyName}`);
    utterance.lang = BCP47[lang] ?? 'en-IN';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const titleKey = mode === 'pay-obligation' ? 'obligation' : 'send';

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
            {/* Recipient */}
            {locked ? (
              <div>
                <div className="mb-1.5 text-sm font-medium text-paper">{t('payment.field.payTo')}</div>
                <div className="flex items-center justify-between rounded-md border border-line bg-ink-elevated/40 px-3 py-2.5">
                  <span className="text-sm text-paper">{partyName}</span>
                  <span className="inline-flex items-center gap-1 text-xs text-ok-500">
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> {t('payment.verified')}
                  </span>
                </div>
              </div>
            ) : selected ? (
              <div>
                <div className="mb-1.5 text-sm font-medium text-paper">{t('payment.field.sendTo')}</div>
                <div className="flex items-center justify-between rounded-md border border-sage-300/50 bg-sage-50/60 px-3 py-2.5">
                  <div>
                    <div className="text-sm font-medium text-paper">{selected.name}</div>
                    <div className="text-[11px] text-paper-muted">{selected.type} · {selected.reliability}% {t('payment.reliability')}</div>
                  </div>
                  <button type="button" onClick={() => setSelected(null)} className="text-[11px] text-sage-600 hover:text-paper">{t('payment.change')}</button>
                </div>
              </div>
            ) : (
              <div>
                <label htmlFor="payment-search" className="mb-1.5 block text-sm font-medium text-paper">{t('payment.field.sendTo')}</label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-paper-faint" aria-hidden="true" />
                  <input
                    ref={searchRef}
                    id="payment-search"
                    className="input pl-8"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={t('payment.searchParticipants')}
                    autoComplete="off"
                  />
                </div>
                <div className="mt-2 max-h-56 space-y-1 overflow-y-auto scrollbar-thin">
                  {partiesState === 'loading' && <p className="px-1 py-2 text-sm text-paper-muted">{t('common.loading')}</p>}
                  {partiesState === 'error' && <p className="px-1 py-2 text-sm text-terra-500">{t('payment.partiesError')}</p>}
                  {partiesState === 'ready' && filtered.length === 0 && (
                    <p className="px-1 py-2 text-sm text-paper-muted">{t('payment.noParticipants')}</p>
                  )}
                  {filtered.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setSelected(p); setError(''); }}
                      className="flex w-full items-center justify-between gap-3 rounded-md border border-line px-3 py-2 text-left transition-colors hover:border-sage-300 hover:bg-sage-50/60"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm text-paper">{p.name}</div>
                        <div className="text-[11px] text-paper-muted">{p.type}</div>
                      </div>
                      <span className="shrink-0 text-[11px] font-mono text-sage-600">{p.reliability}%</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

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

            <p className="text-xs text-paper-muted">{t('payment.availableBalance')}: <span className="font-medium text-paper">{formatINR(wallet.balance)}</span></p>
            {offlineSpend && (
              <p className="flex items-center gap-2 rounded-md border border-gold-300/30 bg-gold-50 px-3 py-2 text-xs text-gold-500">
                <WifiOff className="h-3.5 w-3.5" aria-hidden="true" /> {t('payment.offlineQueue')}
              </p>
            )}
            {error && <p role="alert" className="rounded-md border border-terra-400/25 bg-terra-400/5 px-3 py-2 text-sm text-terra-500">{error}</p>}

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
                <dt className="text-paper-muted">{t('payment.field.payTo')}</dt>
                <dd className="font-medium text-paper text-right">{partyName}</dd>
              </div>
              {note && (
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-paper-muted">{t('payment.field.note')}</dt>
                  <dd className="text-paper text-right">{note}</dd>
                </div>
              )}
              <div className="flex items-center justify-between gap-4">
                <dt className="text-paper-muted">{t('payment.balanceAfter')}</dt>
                <dd className="text-paper text-right">{formatINR(Math.max(wallet.balance - parsedAmount, 0))}</dd>
              </div>
            </dl>
            {!locked && !knownPayee && (
              <p className="rounded-md border border-gold-300/30 bg-gold-50 px-3 py-2 text-xs text-gold-500">{t('payment.firstTimePayee')}</p>
            )}
            {offlineSpend && (
              <p className="flex items-center gap-2 rounded-md border border-gold-300/30 bg-gold-50 px-3 py-2 text-xs text-gold-500">
                <WifiOff className="h-3.5 w-3.5" aria-hidden="true" /> {t('payment.offlineQueueShort')}
              </p>
            )}
            {error && <p role="alert" className="rounded-md border border-terra-400/25 bg-terra-400/5 px-3 py-2 text-sm text-terra-500">{error}</p>}
            <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setStep('form')} className="btn-ghost w-full sm:w-auto" disabled={submitting}>{t('common.back')}</button>
              <button type="button" onClick={() => void submit()} className="btn-gold w-full sm:w-auto" disabled={submitting}>
                {submitting ? t('payment.processing') : t(`payment.${titleKey}.cta`)}
              </button>
            </div>
          </div>
        )}

        {step === 'done' && result && (
          <div className="space-y-5 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ok-400/10 animate-scale-in">
              <CheckCircle2 className="h-6 w-6 text-ok-500" aria-hidden="true" />
            </div>
            <div>
              <div className="font-display text-2xl font-semibold tracking-[-0.03em] text-paper">−{formatINR(result.amount)}</div>
              <p className="mt-1 text-sm text-paper-muted">
                {result.status === 'queued' ? t('payment.queuedOffline') : t('payment.recordedInWallet')}
              </p>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-paper-muted">{t('receipt.to')}</dt>
                <dd className="font-medium text-paper text-right">{result.counterparty}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-paper-muted">{t('receipt.reference')}</dt>
                <dd className="font-mono text-paper">{result.reference}</dd>
              </div>
            </dl>
            <button type="button" onClick={onClose} className="btn-gold w-full">{t('common.done')}</button>
          </div>
        )}
      </div>
    </div>
  );
}
