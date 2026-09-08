import { useMemo, useState } from 'react';
import {
  ArrowDownLeft, ArrowUpRight, Banknote, Download, Info, RefreshCw, Send, ShieldCheck, WifiOff,
} from 'lucide-react';
import { useStore } from '@/store';
import { useWallet } from '@/wallet';
import { useI18n } from '@/i18n';
import { Card, PageHeader, AnimatedNumber, StatusPill } from '@/components/ui';
import { PaymentSheet, type PaymentMode } from '@/components/PaymentSheet';
import { ReceiptModal } from '@/components/ReceiptModal';
import { formatINR } from '@/lib/format';
import { downloadStatement } from '@/lib/statement';
import type { WalletTx } from '@/lib/payments';
import type { Obligation } from '@/types';
import type { TranslationKey } from '@/i18n/en';

const KIND_KEY: Record<WalletTx['kind'], TranslationKey> = {
  topup: 'ledger.topup', send: 'ledger.send', receive: 'ledger.receive', obligation: 'ledger.obligation',
  request: 'ledger.request', settlement: 'ledger.settlement', refund: 'ledger.refund', adjustment: 'ledger.adjustment',
};

function txDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function WalletPage() {
  const { crops } = useStore();
  const wallet = useWallet();
  const { t } = useI18n();
  const [sheet, setSheet] = useState<PaymentMode | null>(null);
  const [payTarget, setPayTarget] = useState<{ obligation: Obligation; cropName?: string } | null>(null);
  const [receipt, setReceipt] = useState<WalletTx | null>(null);

  const payableObligations = useMemo(() => {
    return crops.flatMap((crop) =>
      crop.obligations
        .filter((obligation) => obligation.status === 'pending' && obligation.partyOrgId && !wallet.paidObligationIds.has(obligation.id))
        .map((obligation) => ({ obligation, cropName: crop.name })),
    );
  }, [crops, wallet.paidObligationIds]);

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title={t('wallet.title')} subtitle={t('wallet.subtitle')} sectionNum="02 / Payments" />

      {/* Balance */}
      <Card className="relative overflow-hidden p-6 sm:p-8 mb-4 animate-fade-in-up">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gold-200/10 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="eyebrow mb-2">{t('wallet.availableBalance')}</div>
            <div className="font-display text-4xl font-semibold tracking-[-0.045em] text-paper sm:text-5xl">
              <AnimatedNumber value={wallet.balance} />
            </div>
            <p className="mt-2 text-sm text-paper-muted">{wallet.amountInWords(wallet.balance)}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="inline-flex items-center gap-1.5 rounded border border-sage-300/40 bg-sage-50 px-2.5 py-1 text-[11px] font-medium text-sage-600">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> {t('wallet.ledgerTag')}
            </span>
            {!wallet.online && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-terra-500">
                <WifiOff className="h-3.5 w-3.5" aria-hidden="true" /> {t('wallet.offline')}
              </span>
            )}
            {wallet.queuedCount > 0 && (
              <span className="text-[11px] text-gold-500">{t('wallet.queued', { count: wallet.queuedCount })}</span>
            )}
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => { setPayTarget(null); setSheet('send'); }}
            className="btn-ghost flex-col gap-2 py-4 text-xs"
          >
            <Send className="h-4 w-4 text-gold-200" aria-hidden="true" />
            {t('wallet.sendMoney')}
          </button>
          <button
            type="button"
            onClick={() => {
              const first = payableObligations[0];
              if (!first) return;
              setPayTarget(first);
              setSheet('pay-obligation');
            }}
            disabled={payableObligations.length === 0}
            className="btn-ghost flex-col gap-2 py-4 text-xs"
          >
            <Banknote className="h-4 w-4 text-gold-200" aria-hidden="true" />
            {t('wallet.payObligation')}
          </button>
        </div>

        <p className="relative mt-4 flex items-start gap-2 text-[11px] leading-5 text-paper-muted">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {t('wallet.ledgerNote')}
        </p>
      </Card>

      {wallet.error && !wallet.available && (
        <Card className="p-4 mb-4 border-terra-400/25 bg-terra-400/5">
          <p className="text-sm text-paper">{t('wallet.notProvisioned')}</p>
        </Card>
      )}

      {/* Money in / out */}
      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-4 mb-4">
        <Card className="p-5 animate-fade-in-up">
          <div className="flex items-center gap-2">
            <ArrowDownLeft className="h-4 w-4 text-ok-500" aria-hidden="true" />
            <span className="eyebrow">{t('wallet.moneyIn')}</span>
          </div>
          <div className="mt-3 font-display text-xl font-semibold text-paper">{formatINR(wallet.moneyIn)}</div>
        </Card>
        <Card className="p-5 animate-fade-in-up">
          <div className="flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 text-terra-500" aria-hidden="true" />
            <span className="eyebrow">{t('wallet.moneyOut')}</span>
          </div>
          <div className="mt-3 font-display text-xl font-semibold text-paper">{formatINR(wallet.moneyOut)}</div>
        </Card>
      </div>

      {/* Obligations to pay */}
      <Card className="p-5 sm:p-7 mb-4 animate-fade-in-up">
        <div className="mb-4 flex items-center justify-between">
          <span className="eyebrow">{t('wallet.obligationsToPay')}</span>
          {payableObligations.length > 0 && (
            <span className="text-[11px] text-paper-muted font-mono">{formatINR(payableObligations.reduce((sum, item) => sum + item.obligation.amount, 0))} {t('wallet.totalSuffix')}</span>
          )}
        </div>
        {payableObligations.length === 0 ? (
          <p className="text-sm text-paper-muted">
            {crops.length === 0 ? t('wallet.obligations.noCrops') : t('wallet.obligations.allSettled')}
          </p>
        ) : (
          <div className="space-y-1">
            {payableObligations.map(({ obligation, cropName }) => (
              <div key={obligation.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3 last:border-0">
                <div>
                  <div className="text-sm text-paper">{obligation.label} <span className="text-paper-faint">· {cropName}</span></div>
                  <div className="text-[11px] text-paper-muted">{obligation.party}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono text-paper">{formatINR(obligation.amount)}</span>
                  <button
                    type="button"
                    onClick={() => { setPayTarget({ obligation, cropName }); setSheet('pay-obligation'); }}
                    className="btn-outline px-3 py-1.5 text-xs"
                  >
                    {t('wallet.pay')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Ledger */}
      <Card className="p-5 sm:p-7 animate-fade-in-up">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <span className="eyebrow">{t('wallet.transactionHistory')}</span>
          <div className="flex items-center gap-4">
            {wallet.transactions.length > 0 && (
              <button type="button" onClick={() => downloadStatement(wallet.transactions)} className="inline-flex items-center gap-1.5 text-[11px] text-paper-muted hover:text-paper">
                <Download className="h-3 w-3" aria-hidden="true" /> {t('wallet.exportStatement')}
              </button>
            )}
            <button type="button" onClick={wallet.refresh} className="inline-flex items-center gap-1.5 text-[11px] text-paper-muted hover:text-paper">
              <RefreshCw className="h-3 w-3" aria-hidden="true" /> {t('wallet.refresh')}
            </button>
          </div>
        </div>
        {wallet.transactions.length === 0 ? (
          <p className="text-sm text-paper-muted">{t('wallet.noPayments')}</p>
        ) : (
          <div className="divide-y divide-line">
            {wallet.transactions.map((tx, index) => {
              const incoming = tx.direction === 'in';
              return (
                <button
                  key={tx.id}
                  type="button"
                  onClick={() => setReceipt(tx)}
                  className="flex w-full items-center justify-between gap-4 py-3 text-left transition-opacity hover:opacity-80 animate-fade-in-up"
                  style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${incoming ? 'bg-ok-400/10' : 'bg-terra-400/10'}`}>
                      {incoming ? <ArrowDownLeft className="h-4 w-4 text-ok-500" /> : <ArrowUpRight className="h-4 w-4 text-terra-500" />}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm text-paper">{tx.counterparty}</div>
                      <div className="truncate text-[11px] text-paper-muted">{t(KIND_KEY[tx.kind])} · {txDate(tx.createdAt)}</div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className={`text-sm font-mono ${incoming ? 'text-ok-500' : 'text-paper'}`}>
                      {incoming ? '+' : '−'}{formatINR(tx.amount)}
                    </span>
                    {tx.status === 'queued' && <StatusPill status="pending" label={t('ledger.queued')} />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {sheet && (
        <PaymentSheet
          mode={sheet}
          obligation={sheet === 'pay-obligation' && payTarget ? payTarget : undefined}
          onClose={() => { setSheet(null); setPayTarget(null); }}
        />
      )}
      {receipt && <ReceiptModal tx={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}
