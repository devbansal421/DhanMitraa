import { useStore } from '@/store';
import { useNavigate } from 'react-router-dom';
import { Card, PageHeader, ProgressBar } from '@/components/ui';
import { formatINR } from '@/lib/format';
import { cropStageLabels } from '@/lib/cropLifecycle';
import { ArrowRight } from 'lucide-react';
import { RemoteState } from '@/components/RemoteState';

const cropAccents: Record<string, { color: string; bg: string }> = {
  Wheat: { color: 'text-gold-200', bg: 'from-gold-200/10 to-gold-400/5' },
  Cotton: { color: 'text-paper', bg: 'from-paper/10 to-paper/5' },
  Rice: { color: 'text-sage-100', bg: 'from-sage-100/10 to-sage-200/5' },
};

export function CropsPage() {
  const { crops, cropsState, retryCrops } = useStore();
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader title="My Crops" subtitle="All active crop contracts and their financial positions" sectionNum="03 / Crops" />

      <RemoteState state={cropsState} onRetry={retryCrops} emptyTitle="No crop cycles yet" emptyDescription="Create a crop cycle after your organization membership has been configured.">
        {() => <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {crops.map((crop) => {
          const totalObligations = crop.obligations.reduce((s, o) => s + o.amount, 0);
          const accent = cropAccents[crop.name] || cropAccents.Wheat;
          return (
            <Card
              key={crop.id}
              hover
              className={`p-6 cursor-pointer animate-fade-in-up group`}
            >
              <button
                type="button"
                onClick={() => navigate(`/crops/${crop.id}`)}
                className="block w-full text-left focus:outline-none"
                aria-label={`View ${crop.name} crop details`}
              >
                <div className="flex items-start justify-between mb-5">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${accent.bg} border border-line flex items-center justify-center`}>
                    <svg viewBox="0 0 24 24" className={`w-5 h-5 ${accent.color}`} fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 22V8 M12 8 C12 8, 8 4, 8 8 C8 10, 12 8, 12 8 M12 8 C12 8, 16 4, 16 8 C16 10, 12 8, 12 8 M8 12 C8 12, 5 10, 5 13 C5 15, 8 12, 8 12 M16 12 C16 12, 19 10, 19 13 C19 15, 16 12, 16 12" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="font-mono text-[10px] text-paper-faint">
                    {crop.contractId ? `#${crop.contractId}` : '—'}
                  </span>
                </div>

                <h3 className="font-display text-xl font-medium text-paper">{crop.name}</h3>
                <p className="text-xs text-paper-muted mb-5">{crop.season}</p>

                <div className="space-y-2.5 mb-5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-paper-muted">Est. harvest</span>
                    <span className="text-paper font-mono">{crop.tonnes} t</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-paper-muted">Est. value</span>
                    <span className="text-paper font-mono">{formatINR(crop.estimatedValue)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-paper-muted">Obligations</span>
                    <span className="text-paper font-mono">{formatINR(totalObligations)}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-paper-muted">Maturity</span>
                    <span className="text-[10px] font-mono text-gold-200">{crop.maturity}%</span>
                  </div>
                  <ProgressBar value={crop.maturity} />
                </div>

                <div className="pt-3 border-t border-line flex items-center justify-between">
                  <span className="text-[10px] text-paper-muted font-mono uppercase tracking-wider">
                    {cropStageLabels[crop.stage]}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-paper-faint group-hover:text-gold-200 transition-colors" />
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
