import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store';
import { formatINR } from '@/lib/format';
import { X, Check, ArrowRight, Sprout, FileText, Users, Truck, Split, Sparkles, PartyPopper } from 'lucide-react';

const demoSteps = [
  {
    title: 'Crop Contract Created',
    description: 'Ravi Kumar creates a wheat contract for Winter 2026 — 4.5 tonnes, expected value ₹120,000.',
    icon: Sprout,
    detail: 'Crop: Wheat · 4.5t · Expected: ₹120,000',
  },
  {
    title: 'Obligations Attached',
    description: 'Four agricultural obligations are attached to the crop contract.',
    icon: FileText,
    detail: 'Fertilizer ₹20k · Machinery ₹8k · Transport ₹5k · Labor ₹7k',
  },
  {
    title: 'Buyer Commits Funds',
    description: 'Nova Agri Trading commits ₹116,100 for the harvest. Funds enter conditional settlement.',
    icon: Users,
    detail: 'Buyer: Nova Agri Trading · Committed: ₹116,100',
  },
  {
    title: 'Harvest Verified',
    description: 'The harvest is verified and delivery is confirmed by the buyer.',
    icon: Truck,
    detail: 'Status: Verified · Delivery: Confirmed',
  },
  {
    title: 'Settlement Executed',
    description: 'The system automatically distributes proceeds to all parties.',
    icon: Split,
    detail: '₹116,100 distributed across 5 parties',
  },
];

const finalBreakdown = [
  { label: 'Farmer', party: 'Ravi Kumar', amount: 76100 },
  { label: 'Fertilizer supplier', party: 'Greenfield Fertilizers', amount: 20000 },
  { label: 'Machinery provider', party: 'AgriTech Rentals', amount: 8000 },
  { label: 'Transporter', party: 'Arun Logistics', amount: 5000 },
  { label: 'Labor', party: 'Local Labor Co-op', amount: 7000 },
];

export function DemoModal() {
  const { demoActive, setDemoActive, toast } = useStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    if (demoActive) { setStep(0); setShowBreakdown(false); }
  }, [demoActive]);

  if (!demoActive) return null;

  const isLast = step === demoSteps.length - 1;

  const handleNext = () => {
    if (step < demoSteps.length - 1) setStep(step + 1);
    else setShowBreakdown(true);
  };

  const handleClose = () => {
    setDemoActive(false);
    navigate('/settlement');
    toast('Demo complete — explore the settlement page', 'success');
  };

  return (
    <div className="scrim fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 backdrop-blur-[2px] animate-fade-in">
      <div role="dialog" aria-modal="true" aria-labelledby="demo-modal-title" className="modal my-auto w-full max-w-lg p-5 sm:p-8 animate-fade-in-up">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold-200" />
            <span className="eyebrow">Guided Demo</span>
          </div>
          <button type="button" onClick={() => setDemoActive(false)} className="text-paper-faint hover:text-paper transition-colors" aria-label="Close demo">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-1 mb-7">
          {demoSteps.map((_, idx) => (
            <div
              key={idx}
              className={`h-0.5 transition-all duration-300 ${idx <= step ? 'bg-gold-200 flex-1' : 'bg-line w-6'}`}
            />
          ))}
        </div>

        {!showBreakdown ? (
          <>
            <div className="flex items-start gap-4 mb-6">
              <div className="w-11 h-11 border border-line bg-ink-elevated flex items-center justify-center shrink-0">
                {(() => { const Icon = demoSteps[step].icon; return <Icon className="w-5 h-5 text-gold-200" />; })()}
              </div>
              <div>
                <div className="text-[10px] font-mono text-gold-200 tracking-wider mb-1">
                  STEP {String(step + 1).padStart(2, '0')} / {String(demoSteps.length).padStart(2, '0')}
                </div>
                <h3 id="demo-modal-title" className="font-display text-lg font-medium text-paper">{demoSteps[step].title}</h3>
              </div>
            </div>

            <p className="text-sm text-paper-dim leading-relaxed mb-4">{demoSteps[step].description}</p>

            <div className="border border-line bg-ink-elevated/50 p-4 mb-6">
              <div className="text-[10px] font-mono text-paper-muted uppercase tracking-wider mb-1">Details</div>
              <div className="text-sm text-paper font-mono">{demoSteps[step].detail}</div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {demoSteps.slice(0, step + 1).map((_, idx) => (
                  <Check key={idx} className="w-3.5 h-3.5 text-ok-400" />
                ))}
              </div>
              <button type="button" onClick={handleNext} className="btn-gold">
                {isLast ? 'View Results' : 'Next'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 border border-ok-400/20 bg-ok-400/5 flex items-center justify-center">
                <PartyPopper className="w-5 h-5 text-ok-400" />
              </div>
              <div>
                <h3 id="demo-modal-title" className="font-display text-lg font-medium text-paper">Settlement Complete</h3>
                <p className="text-xs text-paper-muted">₹116,100 distributed automatically</p>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              {finalBreakdown.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2.5 px-3 border border-line bg-ink-elevated/30 animate-fade-in-up"
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-ok-400" />
                    <div>
                      <div className="text-sm text-paper">{p.label}</div>
                      <div className="text-[11px] text-paper-muted">{p.party}</div>
                    </div>
                  </div>
                  <span className="text-sm font-mono text-paper">{formatINR(p.amount)}</span>
                </div>
              ))}
            </div>

            <button type="button" onClick={handleClose} className="btn-gold w-full">
              Explore the App
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
