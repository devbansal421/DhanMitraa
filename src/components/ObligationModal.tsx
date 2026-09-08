import { useEffect, useRef, useState } from 'react';
import type { Obligation } from '@/types';
import type { DomainResult, ObligationInput } from '@/lib/obligations';
import { X } from 'lucide-react';

interface ObligationModalProps {
  obligation?: Obligation | null;
  onClose: () => void;
  onSave: (input: ObligationInput) => DomainResult<unknown>;
}

export function ObligationModal({ obligation, onClose, onSave }: ObligationModalProps) {
  const [label, setLabel] = useState(obligation?.label ?? '');
  const [party, setParty] = useState(obligation?.party ?? '');
  const [amount, setAmount] = useState(obligation ? String(obligation.amount) : '');
  const [status, setStatus] = useState<ObligationInput['status']>(obligation?.status ?? 'pending');
  const [error, setError] = useState('');
  const labelRef = useRef<HTMLInputElement>(null);
  const isEditing = Boolean(obligation);

  useEffect(() => {
    labelRef.current?.focus();
  }, []);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = onSave({ label, party, amount: Number(amount), status });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onClose();
  };

  return (
    <div className="scrim fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 backdrop-blur-[2px]" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="obligation-modal-title"
        aria-describedby="obligation-modal-description"
        className="modal my-auto w-full max-w-lg p-5 sm:p-7"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="eyebrow mb-2">Contract obligation</div>
            <h2 id="obligation-modal-title" className="font-display text-xl font-semibold tracking-[-0.025em] text-paper">
              {isEditing ? 'Edit obligation' : 'Add obligation'}
            </h2>
            <p id="obligation-modal-description" className="mt-1 text-sm leading-6 text-paper-muted">
              Record who will be paid from the harvest and the agreed amount.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-paper-faint hover:text-paper" aria-label="Close obligation form">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="obligation-label" className="mb-1.5 block text-sm font-medium text-paper">Obligation</label>
            <input ref={labelRef} id="obligation-label" value={label} onChange={(event) => setLabel(event.target.value)} className="input" placeholder="e.g. Transport" />
          </div>
          <div>
            <label htmlFor="obligation-party" className="mb-1.5 block text-sm font-medium text-paper">Party</label>
            <input id="obligation-party" value={party} onChange={(event) => setParty(event.target.value)} className="input" placeholder="e.g. Arun Logistics" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="obligation-amount" className="mb-1.5 block text-sm font-medium text-paper">Amount (₹)</label>
              <input id="obligation-amount" inputMode="numeric" min="1" step="1" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} className="input" placeholder="0" />
            </div>
            <div>
              <label htmlFor="obligation-status" className="mb-1.5 block text-sm font-medium text-paper">Status</label>
              <select id="obligation-status" value={status} onChange={(event) => setStatus(event.target.value as ObligationInput['status'])} className="input">
                <option value="pending">Pending</option>
                <option value="secured">Secured</option>
              </select>
            </div>
          </div>

          {error && <p role="alert" className="rounded-md border border-terra-400/25 bg-terra-400/5 px-3 py-2 text-sm text-terra-500">{error}</p>}

          <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="btn-ghost w-full sm:w-auto">Cancel</button>
            <button type="submit" className="btn-gold w-full sm:w-auto">{isEditing ? 'Save changes' : 'Add obligation'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
