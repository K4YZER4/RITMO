import { LockKeyhole, X } from 'lucide-react';
import { FormEvent, useState } from 'react';

export function ConfirmPasswordModal({
  title,
  description,
  submitLabel,
  onClose,
  onConfirm,
  error,
  busy,
}: {
  title: string;
  description: string;
  submitLabel: string;
  onClose: () => void;
  onConfirm: (password: string) => void;
  error?: string;
  busy?: boolean;
}) {
  const [password, setPassword] = useState('');
  function submit(event: FormEvent) {
    event.preventDefault();
    onConfirm(password);
  }
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form
        className="modal confirm-modal"
        onSubmit={submit}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose}>
          <X />
        </button>
        <div className="confirm-icon">
          <LockKeyhole />
        </div>
        <span className="eyebrow">CONFIRMACIÓN SEGURA</span>
        <h2>{title}</h2>
        <p>{description}</p>
        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoFocus
            required
          />
        </label>
        {error && <div className="error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="button ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="button danger" disabled={busy}>
            {busy ? 'Confirmando…' : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
