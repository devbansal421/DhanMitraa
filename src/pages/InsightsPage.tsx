import { useNavigate } from 'react-router-dom';
import { Card, PageHeader } from '@/components/ui';
import { insights, recommendedActions } from '@/data/mockData';
import { AlertTriangle, Shield, ArrowRight, Brain, Lightbulb } from 'lucide-react';

const levelConfig = {
  Low: { color: 'text-ok-400', border: 'border-ok-400/20', bg: 'bg-ok-400/5', icon: Shield },
  Healthy: { color: 'text-ok-400', border: 'border-ok-400/20', bg: 'bg-ok-400/5', icon: Shield },
  Medium: { color: 'text-gold-200', border: 'border-gold-400/20', bg: 'bg-gold-400/5', icon: AlertTriangle },
  Warning: { color: 'text-terra-400', border: 'border-terra-500/20', bg: 'bg-terra-500/5', icon: AlertTriangle },
};

export function InsightsPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title="Agri Intelligence" subtitle="AI-powered agricultural financial analysis" sectionNum="07 / Insights" />

      {/* AI banner */}
      <Card className="p-5 mb-4 animate-fade-in-up flex items-center gap-3">
        <div className="w-10 h-10 border border-line bg-ink-elevated flex items-center justify-center">
          <Brain className="w-5 h-5 text-gold-200" />
        </div>
        <div>
          <div className="text-sm font-medium text-paper">Financial Analysis Complete</div>
          <div className="text-xs text-paper-muted">Based on 3 active crop contracts and 10 obligations</div>
        </div>
      </Card>

      {/* Insights */}
      <div className="space-y-3 mb-6">
        {insights.map((insight) => {
          const cfg = levelConfig[insight.level];
          const Icon = cfg.icon;
          return (
            <Card key={insight.id} className="p-6 animate-fade-in-up">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 border ${cfg.border} ${cfg.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${cfg.color}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-display text-base font-medium text-paper">{insight.title}</h3>
                    <span className={`text-[11px] font-mono uppercase tracking-wider ${cfg.color} px-2 py-0.5 border ${cfg.border} ${cfg.bg}`}>
                      {insight.level}
                    </span>
                  </div>
                  <p className="text-sm text-paper-dim leading-relaxed">{insight.description}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Recommended actions */}
      <Card className="p-7 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-5">
          <Lightbulb className="w-4 h-4 text-gold-200" />
          <span className="eyebrow">Recommended Actions</span>
        </div>
        <div className="space-y-1">
          {recommendedActions.map((action, idx) => (
            <div key={idx} className="flex items-center gap-4 py-3 border-b border-line last:border-0 group cursor-pointer">
              <span className="font-mono text-xs text-gold-200 w-6">{String(idx + 1).padStart(2, '0')}</span>
              <span className="text-sm text-paper-dim flex-1 group-hover:text-paper transition-colors">{action}</span>
              <ArrowRight className="w-3.5 h-3.5 text-paper-faint group-hover:text-gold-200 transition-colors" />
            </div>
          ))}
        </div>
        <button type="button" onClick={() => navigate('/network')} className="btn-outline mt-5 w-full">
          Explore Network for Diversification
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </Card>
    </div>
  );
}
