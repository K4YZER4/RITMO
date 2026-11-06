import { useQuery } from '@tanstack/react-query';
import { Mail, ShieldCheck, UserRound } from 'lucide-react';
import { Card, Loading, Page } from '../components/Ui';
import { get } from '../lib/api';
import type { Profile } from '../lib/types';
export function ProfilePage() {
  const { data: p, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => get<Profile>('/perfil'),
  });
  if (isLoading || !p) return <Loading />;
  return (
    <Page eyebrow="CUENTA" title="Tu perfil">
      <Card className="profile-card">
        <div className="profile-avatar">
          <UserRound />
        </div>
        <div>
          <h2>
            {p.nombre} {p.apellidoPaterno}
          </h2>
          <span className="status">{p.role}</span>
        </div>
      </Card>
      <div className="split">
        <Card>
          <h3>
            <Mail /> Contacto
          </h3>
          <p>{p.correo}</p>
        </Card>
        <Card>
          <h3>
            <ShieldCheck /> Plan y acceso
          </h3>
          <p>{p.entrenador?.plan.nombre || p.alumno?.objetivo?.nombre || 'Cuenta activa'}</p>
        </Card>
      </div>
    </Page>
  );
}
