import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '@/store';
import { Card, StatusPill, AnimatedNumber } from '@/components/ui';
import { formatINR } from '@/lib/format';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ArrowLeft, UserPlus, Share2 } from 'lucide-react';
import { RemoteState } from '@/components/RemoteState';

export function ContractDetailPage() {
  const { crops, cropsState, retryCrops, toast } = useStore();
  const { contractId } = useParams();
  const navigate = useNavigate();
  const crop = crops.find((c) => c.contractId === contractId);
  if (cropsState.status !== 'ready') return <div className="max-w-4xl mx-auto"><RemoteState state={cropsState} onRetry={retryCrops} emptyTitle="No contracts yet" emptyDescription="There is no contract detail to display yet.">{() => null}</RemoteState></div>;
  if (!crop || !crop.contractId) return <NotFoundPage title="Contract not found" description="This contract may have been removed or the link is incomplete." backTo="/contracts" backLabel="Back to contracts" />;

  const totalObligations = crop.obligations.reduce((s, o) => s + o.amount, 0);
  const farmerProceeds = crop.estimatedValue - totalObligations;

  return (
    <div className="max-w-4xl mx-auto">
      <button type="button" onClick={() => navigate('/contracts')} className="flex items-center gap-2 text-sm text-paper-muted hover:text-paper mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        All contracts
      </button>

      <div className="mb-8">
        <div className="section-num mb-2">04 / Contract</div>
        <h2 className="font-display text-3xl font-medium text-paper tracking-tight">
          Contract <span className="font-mono text-gold-200">#{crop.contractId}</span>
        </h2>
        <p className="text-sm text-paper-muted mt-1">{crop.name} · {crop.season}</p>
      </div>

      {/* Contract terms */}
      <Card className="p-5 sm:p-7 mb-4 animate-fade-in-up">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="eyebrow mb-1.5">Crop</div>
            <div className="text-base font-medium text-paper">{crop.name}</div>
          </div>
          <div>
            <div className="eyebrow mb-1.5">Harvest</div>
            <div className="text-base font-medium text-paper">{crop.tonnes} t</div>
          </div>
          <div>
            <div className="eyebrow mb-1.5">Date</div>
            <div className="text-base font-medium text-paper">{crop.expectedHarvestDate}</div>
          </div>
          <div>
            <div className="eyebrow mb-1.5">Value</div>
            <div className="text-base font-medium text-gold-200">
              <AnimatedNumber value={crop.estimatedValue} />
            </div>
          </div>
        </div>
      </Card>

      {/* Obligations */}
      <Card className="p-5 sm:p-7 mb-4 animate-fade-in-up">
        <div className="flex items-center justify-between mb-5">
          <span className="eyebrow">Contracted Obligations</span>
          <span className="text-[11px] text-paper-muted font-mono">{crop.obligations.length} parties</span>
        </div>
        {crop.obligations.length === 0 ? (
          <div className="border border-dashed border-line-accent bg-sage-50/40 p-6 text-center">
            <p className="text-sm font-medium text-paper">No obligations recorded yet</p>
            <p className="mt-1 text-sm text-paper-muted">Obligations are created through the verified-party approval workflow.</p>
          </div>
        ) : (
          <div className="space-y-1">
          {crop.obligations.map((o, i) => (
            <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-line last:border-0">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-paper-faint w-5">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <div className="text-sm text-paper">{o.label}</div>
                  <div className="text-[11px] text-paper-muted">{o.party}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-sm font-mono text-paper">{formatINR(o.amount)}</span>
                <StatusPill status={o.status} />
              </div>
            </div>
          ))}
          </div>
        )}
      </Card>

      {/* Visual settlement flow */}
      <Card className="p-5 sm:p-8 mb-4 animate-fade-in-up">
        <div className="eyebrow mb-6 text-center">Settlement Flow</div>

        <div className="flex flex-col items-center">
          <div className="text-center">
            <div className="font-display text-3xl font-medium text-paper">
              <AnimatedNumber value={crop.estimatedValue} />
            </div>
            <div className="eyebrow mt-1.5">Expected Harvest Value</div>
          </div>

          <div className="my-4">
            <div className="w-px h-12 bg-gradient-to-b from-gold-200/0 via-gold-200/50 to-gold-200/0" style={{
              backgroundImage: 'repeating-linear-gradient(to bottom, rgb(var(--gold-200)) 0, rgb(var(--gold-200)) 4px, transparent 4px, transparent 8px)',
            }} />
          </div>

          <div className="w-full max-w-md border border-line-strong p-5">
            <div className="eyebrow mb-3 text-center">Agricultural Obligations</div>
            <div className="space-y-2">
              {crop.obligations.length === 0 && <p className="py-2 text-center text-sm text-paper-muted">No obligations attached yet.</p>}
              {crop.obligations.map((o) => (
                <div key={o.id} className="flex items-center justify-between text-sm">
                  <span className="text-paper-dim">{o.label}</span>
                  <span className="text-paper font-mono">{formatINR(o.amount)}</span>
                </div>
              ))}
              <div className="pt-2 mt-2 border-t border-line flex items-center justify-between">
                <span className="text-[11px] text-paper-muted">Total</span>
                <span className="text-sm font-mono text-paper">{formatINR(totalObligations)}</span>
              </div>
            </div>
          </div>

          <div className="my-4">
            <div className="w-px h-12" style={{
              backgroundImage: 'repeating-linear-gradient(to bottom, rgb(var(--gold-200)) 0, rgb(var(--gold-200)) 4px, transparent 4px, transparent 8px)',
            }} />
          </div>

          <div className="text-center">
            <div className="font-display text-3xl font-medium text-gold-200">
              <AnimatedNumber value={farmerProceeds} />
            </div>
            <div className="eyebrow mt-1.5">Projected Farmer Proceeds</div>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
        <button type="button" onClick={() => toast('Supplier invitation sent', 'info')} className="btn-ghost w-full sm:w-auto">
          <UserPlus className="w-3.5 h-3.5" />
          Invite Supplier
        </button>
        <button type="button" onClick={() => toast('Contract link copied', 'success')} className="btn-ghost w-full sm:w-auto">
          <Share2 className="w-3.5 h-3.5" />
          Share Contract
        </button>
        <button type="button" onClick={() => navigate('/settlement')} className="btn-outline w-full sm:ml-auto sm:w-auto">
          Go to Settlement
        </button>
      </div>
    </div>
  );
}
