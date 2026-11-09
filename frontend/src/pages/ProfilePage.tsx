import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  Award,
  Copy,
  Edit3,
  HeartPulse,
  Mail,
  ShieldCheck,
  Target,
  Unlink,
} from 'lucide-react';
import { useState } from 'react';
import { ConfirmPasswordModal } from '../components/ConfirmPasswordModal';
import { Card, Loading, Page } from '../components/Ui';
import { get, patch, post, put } from '../lib/api';
import type { Profile } from '../lib/types';

export function ProfilePage() {
  const [editing, setEditing] = useState(false);
  const [confirmUnlink, setConfirmUnlink] = useState(false);
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
    mutationFn: (value: string) =>
      put('/alumno-entrenador/cancelar/mi-entrenador', { contraseña_alumno: value }),
    onSuccess: async () => {
      setConfirmUnlink(false);
      await qc.invalidateQueries({ queryKey: ['profile'] });
    },
  });
  if (isLoading || !p) return <Loading />;
  const isStudent = p.role !== 'entrenador';
  const initials = `${p.nombre[0] || ''}${p.apellidoPaterno[0] || ''}`.toUpperCase();
  const startEditing = () => {
    setForm({
      nombre: p.nombre,
      apellido_paterno: p.apellidoPaterno,
      apellido_materno: '',
      nombre_publico: p.entrenador?.nombrePublico || '',
    });
    setEditing(true);
  };
  return (
    <Page eyebrow="CUENTA" title={isStudent ? 'Mi espacio' : 'Tu perfil'}>
      <section className={`profile-hero ${isStudent ? 'student-profile-hero' : ''}`}>
        <div className="profile-avatar profile-initials">{initials}</div>
        <div className="profile-hero-copy">
          <span className="eyebrow">{isStudent ? 'PERFIL DE ALUMNO' : 'PERFIL DE ENTRENADOR'}</span>
          <h2>
            {p.nombre} {p.apellidoPaterno}
          </h2>
          <p>{p.correo}</p>
          <span className="status">
            {isStudent ? 'Alumno activo' : p.entrenador?.nombrePublico || 'Entrenador activo'}
          </span>
        </div>
        <button className="button ghost" onClick={startEditing}>
          <Edit3 /> Editar perfil
        </button>
      </section>
      {isStudent ? (
        <>
          <div className="profile-grid">
            <Card className="profile-info-card">
              <div className="profile-card-icon">
                <Target />
              </div>
              <span className="eyebrow">OBJETIVO ACTUAL</span>
              <h2>{p.alumno?.objetivo?.nombre || 'Construir constancia'}</h2>
              <p>Tu plan se adapta a tu ritmo y a tus avances.</p>
            </Card>
            <Card className="profile-info-card">
              <div className="profile-card-icon">
                <HeartPulse />
              </div>
              <span className="eyebrow">ESTADO DE CUENTA</span>
              <h2>Cuenta activa</h2>
              <p>Tu información y progreso están protegidos.</p>
            </Card>
          </div>
          {p.alumno?.entrenadorActual ? (
            <Card className="coach-profile-card">
              <div className="coach-mark">
                <Award />
              </div>
              <div>
                <span className="eyebrow">TU ENTRENADOR</span>
                <h2>{p.alumno.entrenadorActual.nombrePublico}</h2>
                <p>Tu plan y seguimiento están conectados.</p>
              </div>
              <button className="button danger" onClick={() => setConfirmUnlink(true)}>
                <Unlink /> Desvincular
              </button>
            </Card>
          ) : (
            <Card className="link-profile-card">
              <div className="coach-mark">
                <Activity />
              </div>
              <div>
                <span className="eyebrow">¿TIENES ENTRENADOR?</span>
                <h2>Conecta tu progreso</h2>
                <p>Genera un código seguro y compártelo con tu entrenador.</p>
              </div>
              <button
                className="button primary"
                onClick={() => token.mutate()}
                disabled={token.isPending}
              >
                Generar código
              </button>
            </Card>
          )}
          {token.data?.data && (
            <Card className="token-card">
              <span className="eyebrow">CÓDIGO DE VINCULACIÓN</span>
              <div className="token-values">
                <strong>{token.data.data.codigo}</strong>
                <span>{token.data.data.secreto}</span>
              </div>
              <small>Expira: {new Date(token.data.data.expira_en).toLocaleString('es-MX')}</small>
              <button
                className="button ghost"
                onClick={() =>
                  void navigator.clipboard?.writeText(
                    `${token.data?.data.codigo} ${token.data?.data.secreto}`,
                  )
                }
              >
                <Copy /> Copiar código
              </button>
            </Card>
          )}
          {token.error && <div className="error">{token.error.message}</div>}
        </>
      ) : (
        <div className="profile-grid">
          <Card className="profile-info-card">
            <div className="profile-card-icon">
              <Mail />
            </div>
            <span className="eyebrow">CONTACTO</span>
            <h2>{p.correo}</h2>
            <p>Canal principal de comunicación.</p>
          </Card>
          <Card className="profile-info-card">
            <div className="profile-card-icon">
              <ShieldCheck />
            </div>
            <span className="eyebrow">PLAN Y ACCESO</span>
            <h2>{p.entrenador?.plan.nombre || 'Cuenta activa'}</h2>
            <p>Gestiona rutinas y alumnos desde tu panel.</p>
          </Card>
        </div>
      )}
      {confirmUnlink && (
        <ConfirmPasswordModal
          title="¿Desvincular entrenador?"
          description="Se cerrará la vinculación actual, pero tus sesiones y progreso se conservarán."
          submitLabel="Desvincular"
          busy={unlink.isPending}
          error={unlink.error instanceof Error ? unlink.error.message : undefined}
          onClose={() => setConfirmUnlink(false)}
          onConfirm={(value) => unlink.mutate(value)}
        />
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
