import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Check, Copy, CreditCard } from 'lucide-react';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, Loading, Page } from '../components/Ui';
import { ConfirmActionModal } from '../components/ConfirmActionModal';
import { get, patch, post } from '../lib/api';
import type { Catalogs, Plan, Profile } from '../lib/types';

type Subscription = {
  id: string;
  estado: string;
  vitalicia: boolean;
  cancelarAlFinalDelPeriodo: boolean;
  periodoActualFin?: string;
  planAlumno?: Plan;
  planEntrenador?: Plan;
  pagos?: Array<{ id: string; estado: string }>;
};

export function PlanPage() {
  const qc = useQueryClient();
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [redirectingToCheckout, setRedirectingToCheckout] = useState(false);
  const [cancelNowModalOpen, setCancelNowModalOpen] = useState(false);
  const [copiedCard, setCopiedCard] = useState(false);

  const profile = useQuery({ queryKey: ['profile'], queryFn: () => get<Profile>('/perfil') });
  const catalogs = useQuery({ queryKey: ['catalogs'], queryFn: () => get<Catalogs>('/catalogos') });
  const subscription = useQuery({
    queryKey: ['subscription'],
    queryFn: () => get<Subscription>('/suscripciones/actual'),
  });
  const payment = useQuery({
    queryKey: ['payment-status'],
    queryFn: () => get<{ estado: string }>('/suscripciones/estado-pago'),
  });
  const isTrainer = profile.data?.role === 'entrenador';
  const current = subscription.data?.planAlumno || subscription.data?.planEntrenador;
  const plans = isTrainer ? catalogs.data?.planesEntrenador : catalogs.data?.planesAlumno;

  const handleCopyTestCard = async () => {
    try {
      await navigator.clipboard.writeText('4242424242424242');
      setCopiedCard(true);
      setTimeout(() => setCopiedCard(false), 2000);
    } catch {
      // Fallback si no hay permisos de clipboard
    }
  };

  const change = useMutation({
    mutationFn: (idPlanNuevo: number) =>
      patch<Subscription>('/suscripciones/plan', { idPlanNuevo, modoCambio: 'finalPeriodo' }),
    onSuccess: async () => {
      setErrorMessage('');
      await qc.invalidateQueries({ queryKey: ['subscription'] });
    },
    onError: (err: any) => {
      setSuccessMessage('');
      setErrorMessage(err?.message || 'Error al cambiar de plan');
    },
  });

  const lifecycle = useMutation({
    mutationFn: (action: 'cancelar' | 'reanudar' | 'cancelar-inmediata') =>
      post(`/suscripciones/${action}`),
    onSuccess: async (_, action) => {
      setErrorMessage('');
      setSuccessMessage(
        action === 'cancelar-inmediata'
          ? 'Suscripción cancelada de inmediato. Tu cuenta ha vuelto al Plan Básico.'
          : 'Estado de suscripción actualizado.',
      );
      await qc.invalidateQueries({ queryKey: ['subscription'] });
      await qc.invalidateQueries({ queryKey: ['profile'] });
      await qc.invalidateQueries({ queryKey: ['payment-status'] });
    },
    onError: (err: any) => {
      setSuccessMessage('');
      setErrorMessage(err?.message || 'Error en la operación de suscripción');
    },
  });

  const checkout = useMutation({
    mutationFn: () =>
      post<{ url: string }>('/pagos/checkout', {
        pagoId: subscription.data?.pagos?.[0]?.id,
        suscripcionId: subscription.data?.id,
      }),
    onSuccess: (result) => {
      window.location.assign(result.url);
    },
    onError: (err: any) => {
      setSuccessMessage('');
      setErrorMessage(err?.message || 'Error al abrir Checkout');
    },
  });

  const handleSelectPlan = async (plan: Plan) => {
    setErrorMessage('');
    setSuccessMessage('');

    if (subscription.data?.cancelarAlFinalDelPeriodo) {
      setErrorMessage(
        'Tu suscripción tiene una cancelación programada para el final del periodo. Para cambiar de plan antes de que finalice, selecciona primero "Cancelar ya".',
      );
      return;
    }

    try {
      if (plan.esGratuito) {
        await change.mutateAsync(plan.id);
        setSuccessMessage('Plan Básico Gratuito activado correctamente.');
        await qc.invalidateQueries({ queryKey: ['subscription'] });
        return;
      }

      setRedirectingToCheckout(true);
      await change.mutateAsync(plan.id);
      const subActualizada = await get<Subscription>('/suscripciones/actual');
      const pagoPendiente = subActualizada.pagos?.[0];

      if (pagoPendiente) {
        const checkoutRes = await post<{ url: string }>('/pagos/checkout', {
          pagoId: pagoPendiente.id,
          suscripcionId: subActualizada.id,
        });
        if (checkoutRes.url) {
          window.location.assign(checkoutRes.url);
          return;
        }
      }
      setSuccessMessage('Cambio de plan registrado. Procede con el botón de Checkout.');
    } catch (err: any) {
      setSuccessMessage('');
      setErrorMessage(err?.message || 'No se pudo cambiar de plan.');
    } finally {
      setRedirectingToCheckout(false);
    }
  };
  if (profile.isLoading || catalogs.isLoading || subscription.isLoading) return <Loading />;
  if (profile.data && !isTrainer) {
    return <Navigate to="/app" replace />;
  }
  return (
    <Page eyebrow="CUENTA" title="Tu plan">
      <Card className="plan-summary">
        <div>
          <span className="eyebrow">PLAN ACTUAL</span>
          <h2>{current?.nombre || 'Sin plan'}</h2>
          <p>
            Estado: <b>{subscription.data?.estado || 'No disponible'}</b> · Pago: {payment.data?.estado || '—'}
            {subscription.data?.cancelarAlFinalDelPeriodo && (
              <> · <b style={{ color: '#f59e0b' }}>Cancelación programada</b></>
            )}
            {isTrainer && current?.limiteAlumnos && (
              <> · Capacidad: <b>hasta {current.limiteAlumnos} alumnos</b></>
            )}
          </p>
        </div>
        <CreditCard />
      </Card>
      {subscription.data?.periodoActualFin && (
        <p className="muted">
          Periodo actual hasta{' '}
          {new Date(subscription.data.periodoActualFin).toLocaleDateString('es-MX')}.
          {subscription.data?.cancelarAlFinalDelPeriodo && (
            <span style={{ color: '#f59e0b', marginLeft: '8px', fontWeight: 600 }}>
              (Cancelación programada: mantendrás acceso hasta el término del periodo)
            </span>
          )}
        </p>
      )}

      <div className="stripe-demo-banner">
        <div className="stripe-demo-badge">
          <CreditCard size={16} />
          <span>MODO PRUEBA DE STRIPE (SANDBOX)</span>
        </div>
        <p>
          Para probar el Checkout seguro y el ciclo completo de suscripciones sin cargos reales, utiliza la tarjeta de prueba oficial de Stripe:
        </p>
        <div className="stripe-card-chip">
          <code>4242 4242 4242 4242</code>
          <button
            type="button"
            className="button ghost"
            style={{
              padding: '4px 10px',
              fontSize: '0.8rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onClick={handleCopyTestCard}
          >
            {copiedCard ? <Check size={14} style={{ color: 'var(--lime)' }} /> : <Copy size={14} />}
            {copiedCard ? '¡Copiado!' : 'Copiar tarjeta'}
          </button>
          <span className="muted">· Expira: Cualquiera futura (ej. 12/30) · CVC: 123 · C.P.: 44100</span>
        </div>
      </div>

      <div className="plan-grid">
        {(plans || []).map((plan) => (
          <Card
            key={plan.id}
            className={plan.id === current?.id ? 'plan-card current' : 'plan-card'}
          >
            <span className="eyebrow">{plan.id === current?.id ? 'ACTUAL' : 'DISPONIBLE'}</span>
            <h2>{plan.nombre}</h2>
            <strong>{plan.esGratuito ? 'Gratis' : `${plan.precio} ${plan.moneda}`}</strong>
            <p style={{ margin: '8px 0', lineHeight: 1.4 }}>{plan.descripcion || 'Plan para entrenar a tu ritmo.'}</p>
            <div className="plan-badges" style={{ display: 'grid', gap: '6px', margin: '10px 0 16px' }}>
              {isTrainer && plan.limiteAlumnos !== undefined && (
                <small style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--lime)', fontWeight: 600 }}>
                  <Check size={14} /> Hasta {plan.limiteAlumnos} alumnos activos
                </small>
              )}
              {plan.limiteRutinas !== undefined && (
                <small style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--muted)' }}>
                  <Check size={14} /> Hasta {plan.limiteRutinas} rutinas
                </small>
              )}
            </div>
            {plan.id !== current?.id && (
              <button
                className="button primary"
                disabled={change.isPending || redirectingToCheckout}
                onClick={() => void handleSelectPlan(plan)}
              >
                {redirectingToCheckout
                  ? 'Abriendo Checkout de Stripe…'
                  : change.isPending
                  ? 'Actualizando…'
                  : plan.esGratuito
                  ? 'Elegir plan (Gratis)'
                  : 'Elegir plan y Pagar'}
              </button>
            )}
          </Card>
        ))}
      </div>
      <div className="plan-actions">
        {!subscription.data?.vitalicia && !subscription.data?.cancelarAlFinalDelPeriodo && (
          <>
            <button
              className="button ghost"
              disabled={lifecycle.isPending}
              onClick={() => lifecycle.mutate('cancelar')}
            >
              {lifecycle.isPending ? 'Procesando…' : 'Cancelar al final del periodo'}
            </button>
            <button
              className="button danger"
              disabled={lifecycle.isPending}
              onClick={() => setCancelNowModalOpen(true)}
            >
              Cancelar ya
            </button>
          </>
        )}
        {subscription.data?.cancelarAlFinalDelPeriodo && (
          <>
            <button
              className="button primary"
              disabled={lifecycle.isPending}
              onClick={() => lifecycle.mutate('reanudar')}
            >
              {lifecycle.isPending ? 'Procesando…' : 'Reanudar suscripción'}
            </button>
            <button
              className="button danger"
              disabled={lifecycle.isPending}
              onClick={() => setCancelNowModalOpen(true)}
            >
              Cancelar ya
            </button>
          </>
        )}
        {!subscription.data?.vitalicia &&
          (subscription.data?.estado !== 'activa' || payment.data?.estado === 'pendiente') &&
          subscription.data?.pagos?.[0] && (
            <button
              className="button ghost"
              disabled={checkout.isPending}
              onClick={() => checkout.mutate()}
            >
              {checkout.isPending ? 'Abriendo pago…' : 'Abrir Checkout pendiente'}
            </button>
          )}
      </div>
      {(errorMessage || change.error || lifecycle.error || checkout.error) && (
        <div
          className="error"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fca5a5',
            padding: '12px 16px',
            borderRadius: '8px',
            marginTop: '16px',
            fontWeight: 500,
          }}
        >
          <AlertCircle size={20} style={{ flexShrink: 0, color: '#ef4444' }} />
          <span>
            {errorMessage ||
              change.error?.message ||
              lifecycle.error?.message ||
              checkout.error?.message}
          </span>
        </div>
      )}
      {successMessage && !errorMessage && !change.error && !lifecycle.error && !checkout.error && (
        <div
          className="success"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(163, 230, 53, 0.1)',
            border: '1px solid rgba(163, 230, 53, 0.3)',
            color: 'var(--lime)',
            padding: '12px 16px',
            borderRadius: '8px',
            marginTop: '16px',
            fontWeight: 500,
          }}
        >
          <Check size={18} style={{ flexShrink: 0 }} />
          <span>{successMessage}</span>
        </div>
      )}
      {cancelNowModalOpen && (
        <ConfirmActionModal
          title="¿Cancelar suscripción de inmediato?"
          description="Se cancelará el cobro recurrente en Stripe hoy mismo y tu cuenta volverá al Plan Básico gratuito. Si lo deseas, podrás volver a contratar cualquier plan en cualquier momento."
          confirmLabel="Sí, cancelar ya"
          busy={lifecycle.isPending}
          onClose={() => setCancelNowModalOpen(false)}
          onConfirm={async () => {
            await lifecycle.mutateAsync('cancelar-inmediata');
            setCancelNowModalOpen(false);
          }}
        />
      )}
    </Page>
  );
}
