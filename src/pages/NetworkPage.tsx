import { useNavigate, useParams } from 'react-router-dom';
import { Card, PageHeader, ScoreBar, AnimatedNumber } from '@/components/ui';
import { formatINRShort } from '@/lib/format';
import { ArrowLeft, ShieldCheck, Building2, Truck, ShoppingBag } from 'lucide-react';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { useRemoteQuery } from '@/hooks/useRemoteQuery';
import { listParticipants } from '@/services/networkRepository';
import { RemoteState } from '@/components/RemoteState';

function typeIcon(type: string) {
  const map: Record<string, typeof Building2> = {
    Supplier: Building2, Transporter: Truck, Buyer: ShoppingBag, Farmer: Building2,
  };
  return map[type] || Building2;
}

export function NetworkPage() {
  const { participantId } = useParams();
  const navigate = useNavigate();
  const { state, retry } = useRemoteQuery(listParticipants, []);
  const participants = state.status === 'ready' ? state.data : [];
  const selected = participantId ? participants.find((p) => p.id === participantId) : undefined;

  if (state.status !== 'ready') return <div className="max-w-5xl mx-auto"><RemoteState state={state} onRetry={retry} emptyTitle="No participants yet" emptyDescription="Verified organizations will appear here once they are added to your network.">{() => null}</RemoteState></div>;
  if (participantId && !selected) {
    return <NotFoundPage title="Participant not found" description="This network participant may no longer be available." backTo="/network" backLabel="Back to network" />;
  }

  if (selected) {
    return (
      <div className="max-w-3xl mx-auto">
        <button
          type="button"
          onClick={() => navigate('/network')}
          className="flex items-center gap-2 text-sm text-paper-muted hover:text-paper mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          All participants
        </button>

        <Card className="p-8 animate-fade-in-up">
          <div className="flex items-start gap-4 mb-7">
            <div className="w-14 h-14 border border-line bg-ink-elevated flex items-center justify-center">
              {(() => { const Icon = typeIcon(selected.type); return <Icon className="w-6 h-6 text-gold-200" />; })()}
            </div>
            <div className="flex-1">
              <h2 className="font-display text-xl font-medium text-paper">{selected.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-paper-muted">{selected.type}</span>
                <span className="text-paper-faint">·</span>
                <span className="text-xs text-paper-muted">{selected.completedContracts} contracts</span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-display text-2xl font-medium text-gold-200">{selected.reliability}%</div>
              <div className="text-[10px] text-paper-muted">Reliability</div>
            </div>
          </div>

          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-4 mb-7">
            <div className="border border-line p-4">
              <div className="eyebrow mb-1">Completed</div>
              <div className="font-display text-lg font-medium text-paper">{selected.completedContracts}</div>
            </div>
            <div className="border border-line p-4">
              <div className="eyebrow mb-1">Total Settled</div>
              <div className="font-display text-lg font-medium text-paper">
                <AnimatedNumber value={selected.totalSettled} format={false} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-gold-200" />
              <span className="eyebrow">Network Reputation</span>
            </div>

            {[
              { label: 'Contract Completion', value: selected.metrics.contractCompletion, color: 'gold' as const },
              { label: 'Payment Reliability', value: selected.metrics.paymentReliability, color: 'sage' as const },
              { label: 'Delivery Reliability', value: selected.metrics.deliveryReliability, color: 'ok' as const },
              { label: 'Dispute Rate', value: selected.metrics.disputeRate, color: 'terra' as const },
            ].map((m) => (
              <div key={m.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-paper-dim">{m.label}</span>
                  <span className="text-sm font-mono text-paper">{m.value}%</span>
                </div>
                <ScoreBar value={m.value} color={m.color} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader title="Network" subtitle="The trust layer — farmers, suppliers, transporters, and buyers" sectionNum="06 / Network" />

      <RemoteState state={state} onRetry={retry} emptyTitle="No participants yet" emptyDescription="Verified organizations will appear here once they are added to your network.">
      {() => <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {participants.map((p) => {
          const Icon = typeIcon(p.type);
          return (
            <Card key={p.id} hover className="p-6 cursor-pointer animate-fade-in-up group">
              <button
                type="button"
                onClick={() => navigate(`/network/${p.id}`)}
                className="block w-full text-left focus:outline-none"
                aria-label={`View ${p.name} participant details`}
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="w-10 h-10 border border-line bg-ink-elevated flex items-center justify-center">
                    <Icon className="w-5 h-5 text-gold-200" />
                  </div>
                  <div className="text-right">
                    <div className="font-display text-lg font-medium text-gold-200">{p.reliability}%</div>
                    <div className="text-[10px] text-paper-muted">Reliability</div>
                  </div>
                </div>

                <h3 className="text-sm font-medium text-paper">{p.name}</h3>
                <p className="text-xs text-paper-muted mb-5">{p.type}</p>

                <div className="space-y-2 pt-3 border-t border-line">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-paper-muted">Contracts</span>
                    <span className="text-paper font-mono">{p.completedContracts}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-paper-muted">Settled</span>
                    <span className="text-paper font-mono">{formatINRShort(p.totalSettled)}</span>
                  </div>
                </div>

                <div className="mt-4">
                  <ScoreBar value={p.reliability} color="gold" />
                </div>
              </button>
            </Card>
          );
        })}
      </div>}
      </RemoteState>
    </div>
  );
}
