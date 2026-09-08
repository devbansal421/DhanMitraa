import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, WifiOff } from 'lucide-react';
import { Card, AnimatedNumber } from '@/components/ui';
import { formatINR } from '@/lib/format';
import { useWallet } from '@/wallet';
import { useT } from '@/i18n';

/** Compact wallet snapshot for the Overview page. */
export function WalletSummaryCard({ className = '' }: { className?: string }) {
  const wallet = useWallet();
  const t = useT();
  return (
    <Card className={`relative overflow-hidden p-6 sm:p-7 animate-fade-in-up ${className}`}>
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gold-200/10 blur-3xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="eyebrow mb-2">{t('wallet.availableBalance')}</div>
          <div className="font-display text-3xl font-semibold tracking-[-0.04em] text-paper">
            <AnimatedNumber value={wallet.balance} />
          </div>
          <p className="mt-1 text-xs text-paper-muted">{wallet.amountInWords(wallet.balance)}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded border border-sage-300/40 bg-sage-50 px-2 py-1 text-[10px] font-medium text-sage-600">
          <ShieldCheck className="h-3 w-3" aria-hidden="true" /> {t('wallet.ledgerTag')}
        </span>
      </div>

      <div className="relative mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-4 text-sm">
        <span className="text-paper-muted">{t('wallet.moneyIn')} <span className="font-medium text-ok-500">{formatINR(wallet.moneyIn)}</span></span>
        <span className="text-paper-muted">{t('wallet.moneyOut')} <span className="font-medium text-paper">{formatINR(wallet.moneyOut)}</span></span>
        {!wallet.online && (
          <span className="inline-flex items-center gap-1.5 text-terra-500"><WifiOff className="h-3.5 w-3.5" aria-hidden="true" /> {t('wallet.offline')}</span>
        )}
        {wallet.queuedCount > 0 && <span className="text-gold-500">{t('wallet.queued', { count: wallet.queuedCount })}</span>}
      </div>

      <Link to="/wallet" className="btn-outline relative mt-5 w-full sm:w-auto">
        {t('header.openPayments')}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </Card>
  );
}
