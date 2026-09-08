import { useStore } from '@/store';
import { useNavigate } from 'react-router-dom';
import { Card, PageHeader, StatusPill, ProgressBar } from '@/components/ui';
import { formatINR } from '@/lib/format';
import { cropStageLabels } from '@/lib/cropLifecycle';
import { ArrowRight, Plus } from 'lucide-react';
import { RemoteState } from '@/components/RemoteState';

export function ContractsPage() {
  const { crops, cropsState, retryCrops, toast } = useStore();
  const navigate = useNavigate();
  const withContracts = crops.filter((c) => c.contractId);

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader title="Contracts" subtitle="Crop-linked financial contracts with multi-party obligations" sectionNum="04 / Contracts" />

      <div className="flex justify-end mb-5">
        <button type="button" onClick={() => toast('Contract creation is a prototype demo', 'info')} className="btn-ghost">
          <Plus className="w-3.5 h-3.5" />
          New Contract
        </button>
      </div>

      <RemoteState state={cropsState} onRetry={retryCrops} emptyTitle="No contracts yet" emptyDescription="Contracts appear here once a crop cycle has an approved buyer commitment.">
      {() => withContracts.length === 0 ? (
        <div className="border border-dashed border-line-accent bg-sage-50/40 p-6 text-center">
          <p className="text-sm font-medium text-paper">No contracts yet</p>
          <p className="mt-1 text-sm text-paper-muted">Your crop cycles do not have an approved buyer commitment yet. Contracts appear here once one is in place.</p>
        </div>
      ) : (
      <div className="space-y-4">
        {withContracts.map((crop) => {
          const totalObligations = crop.obligations.reduce((s, o) => s + o.amount, 0);
          const surplus = crop.estimatedValue - totalObligations;
          return (
            <Card key={crop.id} hover className="p-6 cursor-pointer animate-fade-in-up group">
              <button
                type="button"
                onClick={() => navigate(`/contracts/${crop.contractId}`)}
                className="block w-full text-left focus:outline-none"
                aria-label={`View contract ${crop.contractId} for ${crop.name}`}
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="font-mono text-xs text-gold-200">#{crop.contractId}</div>
                    <StatusPill status={crop.stage === 'settlement' ? 'completed' : 'active'} label={cropStageLabels[crop.stage]} />
                  </div>
                  <ArrowRight className="w-4 h-4 text-paper-faint group-hover:text-gold-200 transition-colors" />
                </div>

                <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-5 gap-5 mb-5">
                  <div>
                    <div className="eyebrow mb-1">Crop</div>
                    <div className="text-sm font-medium text-paper">{crop.name}</div>
                  </div>
                  <div>
                    <div className="eyebrow mb-1">Value</div>
                    <div className="text-sm font-mono text-paper">{formatINR(crop.estimatedValue)}</div>
                  </div>
                  <div>
                    <div className="eyebrow mb-1">Obligations</div>
                    <div className="text-sm font-mono text-paper">{formatINR(totalObligations)}</div>
                  </div>
                  <div>
                    <div className="eyebrow mb-1">Proceeds</div>
                    <div className="text-sm font-mono text-gold-200">{formatINR(surplus)}</div>
                  </div>
                  <div>
                    <div className="eyebrow mb-1">Buyer</div>
                    <div className="text-sm text-paper-dim">{crop.buyer}</div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-paper-muted">Maturity</span>
                    <span className="text-[10px] font-mono text-gold-200">{crop.maturity}%</span>
                  </div>
                  <ProgressBar value={crop.maturity} />
                </div>
              </button>
            </Card>
          );
        })}
      </div>
      )}
      </RemoteState>
    </div>
  );
}
