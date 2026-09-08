import { useState } from 'react';
import { useStore } from '@/store';
import { Card, AnimatedNumber } from '@/components/ui';
import { formatINR } from '@/lib/format';
import { Check, Truck, Sprout, User, Wrench, Split, Sparkles, PartyPopper } from 'lucide-react';
import { useRemoteQuery } from '@/hooks/useRemoteQuery';
import { listSettlements } from '@/services/settlementsRepository';
import { advanceSettlement, type SettlementAction } from '@/services/settlementWorkflow';
import { RemoteState } from '@/components/RemoteState';

type Phase = 'initial' | 'verified' | 'settling' | 'completed';

const steps = [
  { key: 'buyer_funded', label: 'Buyer Funded' },
  { key: 'harvest_verified', label: 'Harvest Verified' },
  { key: 'delivery_confirmed', label: 'Delivery Confirmed' },
  { key: 'settlement', label: 'Settlement' },
  { key: 'completed', label: 'Completed' },
];

function iconForKind(kind: string) {
  const map: Record<string, typeof Sprout> = {
    farmer_proceeds: User,
    adjustment: Wrench,
    refund: Truck,
  };
  return map[kind] || Sprout;
}

function labelForKind(kind: string, recipient: string) {
  if (kind === 'farmer_proceeds') return 'Farmer proceeds';
  if (kind === 'adjustment') return 'Adjustment';
  if (kind === 'refund') return 'Refund';
  return recipient;
}

export function SettlementPage() {
  const { toast } = useStore();
  const { state, retry } = useRemoteQuery(listSettlements, []);
  const [processing, setProcessing] = useState(false);
  if (state.status !== 'ready') return <div className="max-w-4xl mx-auto"><RemoteState state={state} onRetry={retry} emptyTitle="No settlement records yet" emptyDescription="Settlement records appear after a contract reaches settlement pending. Payments are not executed in DhanMitraa yet.">{() => null}</RemoteState></div>;
  const settlement = state.data[0];
  if (!settlement) return <div className="max-w-4xl mx-auto"><RemoteState state={state} onRetry={retry} emptyTitle="No settlement records yet" emptyDescription="Settlement records appear after a contract reaches settlement pending. Payments are not executed in DhanMitraa yet.">{() => null}</RemoteState></div>;

  const parties = settlement.allocations.map((allocation) => ({
    label: labelForKind(allocation.kind, allocation.recipient),
    party: allocation.recipient,
    amount: allocation.amount,
    icon: iconForKind(allocation.kind),
  }));
  const phase: Phase = settlement.status === 'completed' ? 'completed'
    : settlement.status === 'awaiting_verification' ? 'verified'
      : settlement.status === 'awaiting_approval' || settlement.status === 'executing' ? 'settling'
        : 'initial';
  const actionByStatus: Partial<Record<string, { action: SettlementAction; label: string }>> = {
    draft: { action: 'prepare', label: 'Prepare settlement' },
    awaiting_verification: { action: 'verify', label: 'Confirm harvest and delivery' },
    awaiting_approval: { action: 'approve', label: 'Approve settlement simulation' },
    executing: { action: 'execute', label: 'Execute settlement simulation' },
  };
  const nextAction = actionByStatus[settlement.status];

  const stepStatus = (idx: number): 'done' | 'current' | 'pending' => {
    if (phase === 'initial') return idx === 0 ? 'done' : idx === 1 ? 'current' : 'pending';
    if (phase === 'verified') return idx <= 1 ? 'done' : idx === 2 ? 'current' : 'pending';
    if (phase === 'settling') return idx <= 2 ? 'done' : idx === 3 ? 'current' : 'pending';
    return 'done';
  };

  const runNextAction = async () => {
    if (!nextAction) return;
    setProcessing(true);
    try {
      await advanceSettlement(settlement.id, nextAction.action);
      await retry();
      toast(nextAction.action === 'execute' ? 'Settlement simulation completed. No money moved.' : 'Settlement status updated.', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not update the settlement.', 'warning');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="section-num mb-2">05 / Settlement</div>
        <h2 className="font-display text-3xl font-medium text-paper tracking-tight">Harvest Settlement</h2>
        <p className="text-sm text-paper-muted mt-1">
          Contract <span className="font-mono text-gold-200">#{settlement.contractReference}</span> · Multi-party distribution
        </p>
        <p className="mt-3 inline-flex rounded border border-gold-300/30 bg-gold-50 px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider text-gold-200">Simulation only — no money will move</p>
      </div>

      {/* Buyer commitment */}
      <Card className="p-5 sm:p-7 mb-4 animate-fade-in-up overflow-x-auto scrollbar-thin">
        <div className="flex items-center justify-between">
          <div>
            <div className="eyebrow mb-2">Buyer Commitment</div>
            <div className="font-display text-3xl font-medium text-paper">
              <AnimatedNumber value={settlement.grossAmount} />
            </div>
            <div className="text-xs text-paper-muted mt-1">Settlement status: {settlement.status.replace(/_/g, ' ')}</div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-ok-400">
              <span className="w-1.5 h-1.5 rounded-full bg-ok-400 animate-pulse-soft" />
              <span className="text-sm font-mono uppercase tracking-wider">Simulation record</span>
            </div>
            <div className="text-[11px] text-paper-muted mt-1">No escrow or payment provider connected</div>
          </div>
        </div>
      </Card>

      {/* Progress timeline */}
      <Card className="p-7 mb-4 animate-fade-in-up">
        <div className="eyebrow mb-6">Settlement Progress</div>
        <div className="relative min-w-[500px]">
          <div className="absolute top-4 left-4 right-4 h-px bg-line" />
          <div
            className="absolute top-4 left-4 h-px bg-gold-200 transition-all duration-700"
            style={{
              width: phase === 'completed'
                ? 'calc(100% - 32px)'
                : `calc((100% - 32px) * ${phase === 'initial' ? 0.25 : phase === 'verified' ? 0.5 : phase === 'settling' ? 0.75 : 0})`
            }}
          />
          <div className="relative flex items-start justify-between">
            {steps.map((step, idx) => {
              const status = stepStatus(idx);
              return (
                <div key={step.key} className="flex flex-col items-center gap-2 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 bg-ink-surface ${
                    status === 'done' ? 'border-gold-200' :
                    status === 'current' ? 'border-gold-200 animate-pulse-soft' :
                    'border-line'
                  }`}>
                    {status === 'done' ? <Check className="w-3.5 h-3.5 text-gold-200" /> :
                     status === 'current' ? <span className="w-2 h-2 rounded-full bg-gold-200" /> :
                     <span className="w-1.5 h-1.5 rounded-full bg-line-strong" />}
                  </div>
                  <span className={`text-[10px] text-center whitespace-nowrap ${status === 'done' ? 'text-paper-dim' : status === 'current' ? 'text-gold-200 font-medium' : 'text-paper-faint'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Distribution visualization */}
      <Card className="p-5 sm:p-8 mb-4 animate-fade-in-up overflow-hidden">
        <div className="eyebrow mb-8 text-center">Multi-Party Distribution</div>

        <div className="flex flex-col items-center">
          {/* Total */}
          <div className="text-center">
            <div className="font-display text-3xl font-medium text-paper">
              {phase === 'completed' ? <AnimatedNumber value={settlement.grossAmount} /> : formatINR(settlement.grossAmount)}
            </div>
            <div className="eyebrow mt-1.5">Total Settlement</div>
          </div>

          {/* Dashed connector */}
          <div className="my-5 w-px h-14" style={{
            backgroundImage: processing
              ? 'repeating-linear-gradient(to bottom, rgb(var(--gold-200)) 0, rgb(var(--gold-200)) 6px, transparent 6px, transparent 10px)'
              : 'repeating-linear-gradient(to bottom, rgb(var(--line-strong)) 0, rgb(var(--line-strong)) 4px, transparent 4px, transparent 8px)',
          }} />

          {/* Settlement hub */}
          <div className={`px-6 py-3 border-2 transition-all duration-500 ${
            phase === 'completed' ? 'border-ok-400/30 bg-ok-400/5' :
            processing ? 'border-gold-200 bg-gold-200/5 animate-pulse-soft' :
            'border-line-strong bg-ink-elevated/30'
          }`}>
            <div className="flex items-center gap-2 text-sm font-mono uppercase tracking-wider text-paper-dim">
              <Split className="w-4 h-4 text-gold-200" />
              Settlement Engine
            </div>
          </div>

          {/* SVG distribution lines */}
          <div className="w-full max-w-2xl mt-2">
            <svg viewBox="0 0 400 50" className="w-full h-12" preserveAspectRatio="none">
              {parties.map((_, idx) => {
                const xStart = 200;
                const xEnd = ((idx + 0.5) / parties.length) * 400;
                return (
                  <line
                    key={idx}
                    x1={xStart} y1={0}
                    x2={xEnd} y2={50}
                    strokeWidth="1"
                    strokeDasharray={processing ? '0' : '4 4'}
                    className="transition-all duration-700"
                    style={{
                      stroke: processing || phase === 'completed' ? 'rgb(var(--gold-200))' : 'rgb(var(--line-strong))',
                      transitionDelay: processing ? `${idx * 200}ms` : '0ms',
                    }}
                  />
                );
              })}
            </svg>
          </div>

          {/* Party cards */}
          <div className="w-full grid grid-cols-2 md:grid-cols-5 gap-2">
            {parties.map((p, idx) => {
              const Icon = p.icon;
              const visible = phase === 'completed' || processing;
              return (
                <div
                  key={idx}
                  className={`flex flex-col items-center gap-2 p-3 border transition-all duration-700 ${
                    visible ? 'border-line-accent bg-ink-elevated/50 opacity-100 translate-y-0' : 'border-line bg-ink-elevated/20 opacity-30 translate-y-2'
                  }`}
                  style={{ transitionDelay: processing ? `${idx * 200}ms` : '0ms' }}
                >
                  <div className="w-8 h-8 rounded-lg bg-ink-base flex items-center justify-center">
                    <Icon className="w-3.5 h-3.5 text-gold-200" />
                  </div>
                  <div className={`text-sm font-mono text-paper transition-all ${visible ? 'scale-100' : 'scale-90'}`}>
                    {formatINR(p.amount)}
                  </div>
                  <div className="text-[10px] text-paper-muted text-center">{p.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Completion summary */}
      {phase === 'completed' && (
        <Card className="p-7 mb-4 animate-fade-in-up border-ok-400/20">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-ok-400/10 flex items-center justify-center">
              <PartyPopper className="w-5 h-5 text-ok-400" />
            </div>
            <div>
              <div className="font-display text-lg font-medium text-paper">Settlement Simulation Completed</div>
              <div className="text-sm text-paper-muted">Simulation allocated {formatINR(settlement.grossAmount)} across {parties.length} parties</div>
            </div>
          </div>
          <div className="space-y-1">
            {parties.map((p, idx) => (
              <div key={idx} className="flex items-center justify-between py-2.5 border-b border-line last:border-0">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-ok-400" />
                  <span className="text-sm text-paper-dim">{p.label === p.party ? p.label : `${p.label} — ${p.party}`}</span>
                </div>
                <span className="text-sm font-mono text-paper">{formatINR(p.amount)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 text-[11px] text-gold-200 font-mono uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            No payment or reputation updates were made
          </div>
        </Card>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row justify-center gap-3">
        {nextAction && (
          <button type="button" onClick={() => { void runNextAction(); }} disabled={processing} className="btn-gold w-full sm:w-auto">
            <Split className="w-3.5 h-3.5" />
            {processing ? 'Updating settlement…' : nextAction.label}
          </button>
        )}
        {phase === 'completed' && (
          <p className="text-sm text-ok-400">Settlement simulation completed. No money was moved.</p>
        )}
      </div>
    </div>
  );
}
