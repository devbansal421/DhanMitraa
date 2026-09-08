import { useStore } from '@/store';
import { useNavigate } from 'react-router-dom';
import { Card, PageHeader, ProgressBar, AnimatedNumber, StatusPill } from '@/components/ui';
import { formatINR } from '@/lib/format';
import { useCurrentIdentity } from '@/components/AuthGate';
import { RemoteState } from '@/components/RemoteState';
import { WalletSummaryCard } from '@/components/WalletSummaryCard';
import { ArrowRight, CalendarDays, CheckCircle2, CircleAlert, Landmark, Sprout } from 'lucide-react';

export function OverviewPage() {
  const { crops, cropsState, retryCrops } = useStore();
  const { displayName } = useCurrentIdentity();
  const navigate = useNavigate();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const crop = crops[0];
  if (!crop) return (
    <div className="max-w-5xl mx-auto">
      <PageHeader title={`${greeting}, ${displayName.split(' ')[0]}`} subtitle="A clear view of what your current harvest is expected to return." sectionNum="01 / Farm position" />
      <WalletSummaryCard className="mb-4" />
      <RemoteState state={cropsState} onRetry={retryCrops} emptyTitle="No crop cycles yet" emptyDescription="Your crop position will appear once an administrator adds you to a farm organization.">{() => null}</RemoteState>
    </div>
  );
  const totalObligations = crop.obligations.reduce((sum, obligation) => sum + obligation.amount, 0);
  const securedObligations = crop.obligations
    .filter((obligation) => obligation.status === 'secured')
    .reduce((sum, obligation) => sum + obligation.amount, 0);
  const pendingObligation = crop.obligations.find((obligation) => obligation.status === 'pending');
  const farmerProceeds = crop.estimatedValue - totalObligations;
  // A crop cycle can be recorded with no estimated value yet; avoid NaN/Infinity
  // flowing into the progress bars and percentage labels.
  const obligationPct = crop.estimatedValue > 0
    ? Math.min((totalObligations / crop.estimatedValue) * 100, 100)
    : 0;
  const proceedsPct = Math.max(100 - obligationPct, 0);

  const openContract = () => {
    navigate(crop.contractId ? `/contracts/${crop.contractId}` : `/crops/${crop.id}`);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title={`${greeting}, ${displayName.split(' ')[0]}`}
        subtitle="A clear view of what your current harvest is expected to return."
        sectionNum="01 / Farm position"
      />

      <WalletSummaryCard className="mb-4" />

      <div className="grid grid-cols-12 gap-4 sm:gap-5">
        <Card className="col-span-12 p-6 sm:p-8 lg:col-span-7 animate-fade-in-up">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="eyebrow mb-3">Projected farmer proceeds</div>
              <div className="font-display text-4xl font-semibold tracking-[-0.045em] text-paper sm:text-5xl">
                <AnimatedNumber value={farmerProceeds} />
              </div>
              <p className="mt-3 max-w-md text-sm leading-6 text-paper-muted">
                Expected amount remaining after your current crop obligations are paid at harvest.
              </p>
            </div>
            <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-md border border-sage-200 bg-sage-50 sm:flex">
              <Landmark className="h-5 w-5 text-sage-500" aria-hidden="true" />
            </div>
          </div>

          <div className="mt-8 border-t border-line pt-5">
            <div className="mb-2 flex items-center justify-between gap-4 text-xs">
              <span className="text-paper-muted">Share of projected harvest value</span>
              <span className="font-medium text-sage-500">{proceedsPct.toFixed(1)}% retained</span>
            </div>
            <ProgressBar value={proceedsPct} />
          </div>

          <button type="button" onClick={openContract} className="btn-outline mt-7 w-full sm:w-auto">
            Review crop contract
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </Card>

        <Card className="col-span-12 p-6 sm:p-8 lg:col-span-5 animate-fade-in-up">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="eyebrow mb-3">Upcoming harvest</div>
              <div className="font-display text-2xl font-semibold tracking-[-0.035em] text-paper">{crop.expectedHarvestDate}</div>
              <p className="mt-2 text-sm text-paper-muted">{crop.name} · {crop.season}</p>
            </div>
            <CalendarDays className="h-5 w-5 shrink-0 text-gold-300" aria-hidden="true" />
          </div>

          <div className="mt-8">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-paper-muted">Crop maturity</span>
              <span className="font-medium text-paper">{crop.maturity}%</span>
            </div>
            <ProgressBar value={crop.maturity} />
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
            <span className="text-sm text-paper-muted">Estimated harvest</span>
            <span className="font-medium text-paper">{crop.tonnes} tonnes</span>
          </div>
        </Card>

        <Card className="col-span-12 p-6 sm:p-7 lg:col-span-8 animate-fade-in-up">
          <div className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="eyebrow mb-2">Financial obligations</div>
              <h3 className="font-display text-xl font-semibold tracking-[-0.025em] text-paper">What will be paid from this harvest</h3>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-lg font-semibold tracking-[-0.02em] text-paper">{formatINR(totalObligations)}</div>
              <div className="text-xs text-paper-muted">{obligationPct.toFixed(1)}% of harvest value</div>
            </div>
          </div>

          <div className="divide-y divide-line">
            {crop.obligations.map((obligation) => (
              <div key={obligation.id} className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-paper">{obligation.label}</div>
                  <div className="mt-0.5 truncate text-xs text-paper-muted">{obligation.party}</div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-medium text-paper">{formatINR(obligation.amount)}</span>
                  <StatusPill status={obligation.status} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-2 border-t border-line pt-5 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="text-paper-muted">Already secured</span>
            <span className="font-medium text-ok-500">{formatINR(securedObligations)} of {formatINR(totalObligations)}</span>
          </div>
        </Card>

        <Card className="col-span-12 flex flex-col p-6 sm:p-7 lg:col-span-4 animate-fade-in-up">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-ok-500" aria-hidden="true" />
            <span className="eyebrow">Liquidity health</span>
          </div>
          <div className="mt-5">
            <StatusPill status="completed" label="Healthy" />
            <p className="mt-4 text-sm leading-6 text-paper-muted">
              Your projected proceeds cover all committed obligations, with a positive expected balance.
            </p>
          </div>
          <div className="mt-8 border-t border-line pt-5">
            <div className="eyebrow mb-1">Expected balance</div>
            <div className="font-display text-2xl font-semibold tracking-[-0.035em] text-paper"><AnimatedNumber value={farmerProceeds} /></div>
          </div>
        </Card>

        <Card className="col-span-12 border-gold-300/30 bg-gold-50 p-5 sm:p-6 animate-fade-in-up">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-gold-300/30 bg-ink-surface">
                {pendingObligation ? <CircleAlert className="h-4 w-4 text-gold-400" aria-hidden="true" /> : <Sprout className="h-4 w-4 text-sage-500" aria-hidden="true" />}
              </div>
              <div>
                <div className="eyebrow mb-1">Next recommended action</div>
                <h3 className="text-sm font-semibold text-paper">
                  {pendingObligation ? `Confirm ${pendingObligation.label.toLowerCase()} arrangement` : 'Review your crop contract'}
                </h3>
                <p className="mt-1 text-sm leading-6 text-paper-muted">
                  {pendingObligation
                    ? `${pendingObligation.party} is the only obligation still pending (${formatINR(pendingObligation.amount)}).`
                    : 'All current obligations are secured for this crop.'}
                </p>
              </div>
            </div>
            <button type="button" onClick={openContract} className="btn-ghost shrink-0 w-full sm:w-auto">
              View details
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
