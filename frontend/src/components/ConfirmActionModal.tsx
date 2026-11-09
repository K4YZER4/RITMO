import { AlertTriangle, X } from 'lucide-react';

export function ConfirmActionModal({
  title,
  description,
  confirmLabel,
  onClose,
  onConfirm,
  busy = false,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void;
  busy?: boolean;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal confirm-modal"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose}>
          <X />
        </button>
        <div className="confirm-icon warning">
          <AlertTriangle />
        </div>
        <span className="eyebrow">CONFIRMAR ACCIÓN</span>
        <h2>{title}</h2>
        <p>{description}</p>
        <div className="modal-actions">
          <button type="button" className="button ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="button danger" disabled={busy} onClick={onConfirm}>
            {busy ? 'Saliendo…' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
