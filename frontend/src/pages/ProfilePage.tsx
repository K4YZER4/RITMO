import { useMutation, useQuery } from '@tanstack/react-query';
import { Copy, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { Card, Loading, Page } from '../components/Ui';
import { get, post } from '../lib/api';
import type { Profile } from '../lib/types';
export function ProfilePage() {
  const token = useMutation({
    mutationFn: () =>
      post<{ data: { codigo: string; secreto: string; expira_en: string } }>(
        '/alumno-entrenador/token',
      ),
  });
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
      {p.role === 'alumno' && (
        <Card>
          <h3>Vincular entrenador</h3>
          <p>Genera un token y compártelo únicamente con tu entrenador.</p>
          <button
            className="button primary"
            onClick={() => token.mutate()}
            disabled={token.isPending}
          >
            Generar token
          </button>
          {token.data?.data && (
            <div className="token-box">
              <b>{token.data.data.codigo}</b>
              <span>{token.data.data.secreto}</span>
              <small>Expira: {new Date(token.data.data.expira_en).toLocaleString('es-MX')}</small>
              <button
                className="button ghost"
                onClick={() =>
                  void navigator.clipboard?.writeText(
                    `${token.data?.data.codigo} ${token.data?.data.secreto}`,
                  )
                }
              >
                <Copy /> Copiar
              </button>
            </div>
          )}
          {token.error && <div className="error">{token.error.message}</div>}
        </Card>
      )}
    </Page>
  );
}
