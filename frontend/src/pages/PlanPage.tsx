import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, CreditCard } from 'lucide-react';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, Loading, Page } from '../components/Ui';
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
  const [message, setMessage] = useState('');
  const [redirectingToCheckout, setRedirectingToCheckout] = useState(false);
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

  const change = useMutation({
    mutationFn: (idPlanNuevo: number) =>
      patch<Subscription>('/suscripciones/plan', { idPlanNuevo, modoCambio: 'finalPeriodo' }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['subscription'] });
    },
  });

  const lifecycle = useMutation({
    mutationFn: (action: 'cancelar' | 'reanudar') => post(`/suscripciones/${action}`),
    onSuccess: async () => {
      setMessage('Estado de suscripción actualizado.');
      await qc.invalidateQueries({ queryKey: ['subscription'] });
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
  });

  const handleSelectPlan = async (plan: Plan) => {
    setMessage('');
    try {
      if (plan.esGratuito) {
        await change.mutateAsync(plan.id);
        setMessage('Plan Básico Gratuito activado correctamente.');
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
      setMessage('Cambio de plan registrado. Procede con el botón de Checkout.');
    } catch (err) {
      // El error de la mutación se refleja en change.error
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
          <button className="button danger" onClick={() => lifecycle.mutate('cancelar')}>
            Cancelar al final del periodo
          </button>
        )}
        {subscription.data?.cancelarAlFinalDelPeriodo && (
          <button className="button primary" onClick={() => lifecycle.mutate('reanudar')}>
            Reanudar suscripción
          </button>
        )}
        {!subscription.data?.vitalicia && subscription.data?.pagos?.[0] && (
          <button
            className="button ghost"
            disabled={checkout.isPending}
            onClick={() => checkout.mutate()}
          >
            {checkout.isPending ? 'Abriendo pago…' : 'Abrir Checkout'}
          </button>
        )}
      </div>
      {(message || change.error || lifecycle.error || checkout.error) && (
        <div className={change.error || lifecycle.error || checkout.error ? 'error' : 'success'}>
          {message || change.error?.message || lifecycle.error?.message || checkout.error?.message}
        </div>
      )}
    </Page>
  );
}
