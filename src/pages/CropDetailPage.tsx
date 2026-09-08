import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '@/store';
import { Card, ProgressBar, StatusPill, AnimatedNumber } from '@/components/ui';
import { formatINR } from '@/lib/format';
import { cropStageLabels, cropStageOrder } from '@/lib/cropLifecycle';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ArrowLeft, Check } from 'lucide-react';
import { RemoteState } from '@/components/RemoteState';

export function CropDetailPage() {
  const { crops, cropsState, retryCrops } = useStore();
  const { cropId } = useParams();
  const navigate = useNavigate();
  const crop = crops.find((c) => c.id === cropId);
  if (cropsState.status !== 'ready') return <div className="max-w-4xl mx-auto"><RemoteState state={cropsState} onRetry={retryCrops} emptyTitle="No crop cycles yet" emptyDescription="There is no crop detail to display yet.">{() => null}</RemoteState></div>;
  if (!crop) return <NotFoundPage title="Crop not found" description="This crop may have been removed or the link is incomplete." backTo="/crops" backLabel="Back to crops" />;

  const totalObligations = crop.obligations.reduce((s, o) => s + o.amount, 0);
  const surplus = crop.estimatedValue - totalObligations;
  const currentStageIdx = cropStageOrder.indexOf(crop.stage as typeof cropStageOrder[number]);

  return (
    <div className="max-w-4xl mx-auto">
      <button type="button" onClick={() => navigate('/crops')} className="flex items-center gap-2 text-sm text-paper-muted hover:text-paper mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        All crops
      </button>

      <div className="mb-8">
        <div className="section-num mb-2">03 / Crop Detail</div>
        <h2 className="font-display text-3xl font-medium text-paper tracking-tight">
          {crop.name} <span className="text-paper-muted font-normal">— {crop.season}</span>
        </h2>
        <p className="text-sm text-paper-muted mt-1">
          {crop.tonnes} tonnes · {crop.contractId ? `Contract #${crop.contractId}` : 'No contract yet'}
        </p>
      </div>

      {/* Lifecycle timeline — horizontal with connecting line */}
      <Card className="p-5 sm:p-7 mb-4 animate-fade-in-up overflow-x-auto scrollbar-thin">
        <div className="eyebrow mb-6">Crop Lifecycle</div>
        <div className="relative min-w-[540px]">
          {/* Base line */}
          <div className="absolute top-4 left-4 right-4 h-px bg-line" />
          {/* Progress line */}
          <div
            className="absolute top-4 left-4 h-px bg-gold-200 transition-all duration-1000"
            style={{ width: `calc((100% - 32px) * ${currentStageIdx / (cropStageOrder.length - 1)})` }}
          />
          <div className="relative flex items-start justify-between">
            {cropStageOrder.map((stage, idx) => {
              const done = idx < currentStageIdx;
              const current = idx === currentStageIdx;
              return (
                <div key={stage} className="flex flex-col items-center gap-2 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 bg-ink-surface ${
                    done ? 'border-gold-200' :
                    current ? 'border-gold-200 animate-pulse-soft' :
                    'border-line'
                  }`}>
                    {done ? <Check className="w-3.5 h-3.5 text-gold-200" /> :
                     current ? <span className="w-2 h-2 rounded-full bg-gold-200" /> :
                     <span className="w-1.5 h-1.5 rounded-full bg-line-strong" />}
                  </div>
                  <span className={`text-[10px] text-center whitespace-nowrap ${current ? 'text-gold-200 font-medium' : done ? 'text-paper-dim' : 'text-paper-faint'}`}>
                    {cropStageLabels[stage]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-4 mb-4">
        <Card className="p-5 animate-fade-in-up">
          <div className="eyebrow mb-2">Est. Value</div>
          <div className="font-display text-xl font-medium text-paper"><AnimatedNumber value={crop.estimatedValue} /></div>
          <div className="mt-3">
            <ProgressBar value={crop.maturity} />
          </div>
        </Card>
        <Card className="p-5 animate-fade-in-up">
          <div className="eyebrow mb-2">Obligations</div>
          <div className="font-display text-xl font-medium text-paper">{formatINR(totalObligations)}</div>
          <div className="text-[11px] text-paper-muted mt-2">{crop.obligations.length} contracted parties</div>
        </Card>
        <Card className="p-5 animate-fade-in-up">
          <div className="eyebrow mb-2">Surplus</div>
          <div className="font-display text-xl font-medium text-gold-200"><AnimatedNumber value={surplus} /></div>
          <div className="text-[11px] text-paper-muted mt-2">After settlement</div>
        </Card>
      </div>

      {/* Obligations */}
      <Card className="p-5 sm:p-7 animate-fade-in-up">
        <div className="flex items-center justify-between mb-5">
          <span className="eyebrow">Contracted Obligations</span>
          {crop.buyer && <span className="text-[11px] text-paper-muted">Buyer: {crop.buyer}</span>}
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
        {crop.contractId && (
          <button type="button" onClick={() => navigate(`/contracts/${crop.contractId}`)} className="btn-outline mt-3 w-full">
            View Full Contract
          </button>
        )}
      </Card>
    </div>
  );
}
