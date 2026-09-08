import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({ title, description, confirmLabel, onConfirm, onClose }: ConfirmDialogProps) {
  return (
    <div className="scrim fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-[2px]" onMouseDown={onClose}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="modal w-full max-w-md p-5 sm:p-6"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}
      >
        <AlertTriangle className="h-5 w-5 text-terra-500" aria-hidden="true" />
        <h2 id="confirm-dialog-title" className="mt-4 font-display text-xl font-semibold tracking-[-0.025em] text-paper">{title}</h2>
        <p id="confirm-dialog-description" className="mt-2 text-sm leading-6 text-paper-muted">{description}</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="btn-ghost w-full sm:w-auto">Keep obligation</button>
          <button type="button" onClick={onConfirm} className="btn w-full border border-terra-500 bg-terra-500 text-white hover:bg-terra-600 sm:w-auto">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
