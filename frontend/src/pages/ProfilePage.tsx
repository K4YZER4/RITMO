import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Edit3, Mail, ShieldCheck, UserRound, Unlink } from 'lucide-react';
import { Card, Loading, Page } from '../components/Ui';
import { get, patch, post, put } from '../lib/api';
import type { Profile } from '../lib/types';
import { useState } from 'react';
export function ProfilePage() {
  const [editing, setEditing] = useState(false);
  const [password, setPassword] = useState('');
  const [form, setForm] = useState({
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    nombre_publico: '',
  });
  const qc = useQueryClient();
  const { data: p, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => get<Profile>('/perfil'),
  });
  const token = useMutation({
    mutationFn: () =>
      post<{ data: { codigo: string; secreto: string; expira_en: string } }>(
        '/alumno-entrenador/token',
      ),
  });
  const update = useMutation({
    mutationFn: () =>
      patch('/perfil', {
        ...form,
        apellido_materno: form.apellido_materno || undefined,
        nombre_publico: p?.role === 'entrenador' ? form.nombre_publico : undefined,
      }),
    onSuccess: async () => {
      setEditing(false);
      await qc.invalidateQueries({ queryKey: ['profile'] });
    },
  });
  const unlink = useMutation({
    mutationFn: () =>
      put('/alumno-entrenador/cancelar/mi-entrenador', { contraseña_alumno: password }),
    onSuccess: async () => {
      setPassword('');
      await qc.invalidateQueries({ queryKey: ['profile'] });
    },
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
          <button
            className="button ghost"
            onClick={() => {
              setForm({
                nombre: p.nombre,
                apellido_paterno: p.apellidoPaterno,
                apellido_materno: '',
                nombre_publico: p.entrenador?.nombrePublico || '',
              });
              setEditing(true);
            }}
          >
            <Edit3 /> Editar perfil
          </button>
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
      {p.alumno?.entrenadorActual && (
        <Card>
          <h3>
            <Unlink /> Entrenador actual
          </h3>
          <p>{p.alumno.entrenadorActual.nombrePublico}</p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              unlink.mutate();
            }}
          >
            <label>
              Confirma tu contraseña
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            {unlink.error && <div className="error">{unlink.error.message}</div>}
            <button className="button ghost" disabled={unlink.isPending}>
              Desvincular entrenador
            </button>
          </form>
        </Card>
      )}
      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(false)}>
          <form
            className="modal"
            onSubmit={(event) => {
              event.preventDefault();
              update.mutate();
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <span className="eyebrow">CUENTA</span>
            <h2>Editar perfil</h2>
            <label>
              Nombre
              <input
                value={form.nombre}
                onChange={(event) => setForm({ ...form, nombre: event.target.value })}
                required
              />
            </label>
            <label>
              Apellido paterno
              <input
                value={form.apellido_paterno}
                onChange={(event) => setForm({ ...form, apellido_paterno: event.target.value })}
                required
              />
            </label>
            <label>
              Apellido materno
              <input
                value={form.apellido_materno}
                onChange={(event) => setForm({ ...form, apellido_materno: event.target.value })}
              />
            </label>
            {p.role === 'entrenador' && (
              <label>
                Nombre público
                <input
                  value={form.nombre_publico}
                  onChange={(event) => setForm({ ...form, nombre_publico: event.target.value })}
                  required
                />
              </label>
            )}
            {update.error && <div className="error">{update.error.message}</div>}
            <div className="modal-actions">
              <button type="button" className="button ghost" onClick={() => setEditing(false)}>
                Cancelar
              </button>
              <button className="button primary" disabled={update.isPending}>
                Guardar cambios
              </button>
            </div>
          </form>
        </div>
      )}
    </Page>
  );
}
