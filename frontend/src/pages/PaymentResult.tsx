import { CheckCircle2, XCircle } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Page } from '../components/Ui';

export function PaymentResult({ success }: { success: boolean }) {
  const location = useLocation();
  const demo = new URLSearchParams(location.search).get('demo') === '1';
  return (
    <Page eyebrow="PAGO" title={success ? 'Pago recibido' : 'Pago cancelado'}>
      <div className="payment-result">
        {success ? <CheckCircle2 /> : <XCircle />}
        <p>
          {success
            ? demo
              ? 'La demostración de pago se completó correctamente.'
              : 'Stripe procesará la confirmación y actualizará tu suscripción.'
            : 'No se realizó ningún cobro. Tu cuenta sigue disponible.'}
        </p>
        <Link className="button primary" to="/app/plan">
          Volver a mi plan
        </Link>
      </div>
    </Page>
  );
}
