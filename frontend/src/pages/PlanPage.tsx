import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, CreditCard } from 'lucide-react';
import { useState } from 'react';
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
      patch('/suscripciones/plan', { idPlanNuevo, modoCambio: 'finalPeriodo' }),
    onSuccess: async () => {
      setMessage('Cambio de plan programado correctamente.');
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
  if (profile.isLoading || catalogs.isLoading || subscription.isLoading) return <Loading />;
  return (
    <Page eyebrow="CUENTA" title="Tu plan">
      <Card className="plan-summary">
        <div>
          <span className="eyebrow">PLAN ACTUAL</span>
          <h2>{current?.nombre || 'Sin plan'}</h2>
          <p>
            {subscription.data?.estado || 'No disponible'} · Pago: {payment.data?.estado || '—'}
          </p>
        </div>
        <CreditCard />
      </Card>
      {subscription.data?.periodoActualFin && (
        <p className="muted">
          Periodo actual hasta{' '}
          {new Date(subscription.data.periodoActualFin).toLocaleDateString('es-MX')}.
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
            <p>{plan.descripcion || 'Plan para entrenar a tu ritmo.'}</p>
            {plan.limiteRutinas && (
              <small>
                <Check size={14} /> {plan.limiteRutinas} rutinas
              </small>
            )}
            {plan.id !== current?.id && (
              <button
                className="button primary"
                disabled={change.isPending}
                onClick={() => change.mutate(plan.id)}
              >
                {change.isPending ? 'Actualizando…' : 'Elegir plan'}
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
