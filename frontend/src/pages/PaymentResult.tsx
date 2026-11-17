import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Page } from '../components/Ui';
import { post } from '../lib/api';

export function PaymentResult({ success }: { success: boolean }) {
  const location = useLocation();
  const qc = useQueryClient();
  const searchParams = new URLSearchParams(location.search);
  const sessionId = searchParams.get('session_id');
  const demo = searchParams.get('demo') === '1';

  const [loading, setLoading] = useState(Boolean(success && sessionId));
  const [confirmed, setConfirmed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!success || !sessionId) return;

    let active = true;
    setLoading(true);

    post<{ ok: boolean; estado: string }>('/pagos/confirmar-sesion', { sessionId })
      .then(() => {
        if (!active) return;
        setConfirmed(true);
        void qc.invalidateQueries({ queryKey: ['subscription'] });
        void qc.invalidateQueries({ queryKey: ['profile'] });
        void qc.invalidateQueries({ queryKey: ['payment'] });
      })
      .catch((err: any) => {
        if (!active) return;
        console.error('Error confirmando sesión de Stripe:', err);
        setErrorMsg(
          err?.message || 'No se pudo confirmar la sesión automáticamente con Stripe.',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [success, sessionId, qc]);

  return (
    <Page eyebrow="PAGO" title={success ? 'Pago recibido' : 'Pago cancelado'}>
      <div className="payment-result">
        {loading ? (
          <>
            <Loader2 className="spin" style={{ width: 48, height: 48, color: 'var(--lime)' }} />
            <p style={{ fontWeight: 600, color: 'var(--fg)' }}>
              Verificando pago y activando suscripción con Stripe...
            </p>
            <small className="muted">Consultando la sesión de Checkout directamente en Stripe.</small>
          </>
        ) : success ? (
          <>
            <CheckCircle2 style={{ width: 52, height: 52, color: 'var(--lime)' }} />
            <h2 style={{ fontSize: '1.4rem', margin: '4px 0', color: 'var(--fg)' }}>
              {confirmed
                ? '¡Suscripción activada con Stripe!'
                : demo
                ? 'Demostración de pago completada'
                : 'Pago procesado exitosamente'}
            </h2>
            <p>
              {confirmed
                ? 'Tu pago fue verificado con éxito y tu plan ha sido actualizado con renovación automática en Stripe.'
                : errorMsg
                ? errorMsg
                : 'Stripe procesó la confirmación y tu suscripción está lista.'}
            </p>
            {sessionId && (
              <div
                style={{
                  background: 'var(--surface-muted, #141715)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  fontSize: '0.8rem',
                  fontFamily: 'monospace',
                  color: 'var(--muted)',
                  maxWidth: 420,
                  wordBreak: 'break-all',
                }}
              >
                Sesión: {sessionId}
              </div>
            )}
            <Link className="button primary" to="/app/plan" style={{ marginTop: '12px' }}>
              Volver a mi plan
            </Link>
          </>
        ) : (
          <>
            <XCircle style={{ width: 52, height: 52, color: '#ef4444' }} />
            <h2 style={{ fontSize: '1.4rem', margin: '4px 0', color: 'var(--fg)' }}>
              Pago cancelado
            </h2>
            <p>No se realizó ningún cobro. Tu cuenta sigue disponible con tu plan previo.</p>
            <Link className="button primary" to="/app/plan" style={{ marginTop: '12px' }}>
              Volver a mi plan
            </Link>
          </>
        )}
      </div>
    </Page>
  );
}
