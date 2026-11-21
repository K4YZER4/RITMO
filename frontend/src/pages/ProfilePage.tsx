import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  Award,
  Check,
  Copy,
  Edit3,
  HeartPulse,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
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
  const [tokenCopied, setTokenCopied] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    nombre_publico: '',
    numero_celular: '',
    observaciones_medicas: '',
    lesiones_actuales: '',
    lesiones_pasadas: '',
    contacto_emergencia_nombre: '',
    contacto_emergencia_telefono: '',
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
      numero_celular: p.alumno?.numeroCelular || '',
      observaciones_medicas: p.alumno?.observacionesMedicas || '',
      lesiones_actuales: p.alumno?.lesionesActuales || '',
      lesiones_pasadas: p.alumno?.lesionesPasadas || '',
      contacto_emergencia_nombre: p.alumno?.contactoEmergenciaNombre || '',
      contacto_emergencia_telefono: p.alumno?.contactoEmergenciaTelefono || '',
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
          {p.alumno?.numeroCelular && <p style={{ fontSize: '0.85rem' }}>📱 {p.alumno.numeroCelular}</p>}
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
              <p>Nivel de actividad: {p.alumno?.nivelActividad?.nombre || 'Moderado'}</p>
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

          {/* Ficha Médica y de Lesiones */}
          <Card className="medical-profile-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <AlertTriangle style={{ color: 'var(--accent, #e5a93b)' }} size={20} />
              <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Ficha Médica y Restricciones Físicas</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div style={{ background: 'var(--card-subtle, rgba(255,255,255,0.03))', padding: '12px', borderRadius: '8px' }}>
                <span className="eyebrow" style={{ color: 'var(--danger, #ff6b6b)' }}>LESIONES ACTUALES</span>
                <p style={{ margin: '4px 0 0', fontSize: '0.9rem' }}>
                  {p.alumno?.lesionesActuales || 'Ninguna lesión activa reportada.'}
                </p>
              </div>
              <div style={{ background: 'var(--card-subtle, rgba(255,255,255,0.03))', padding: '12px', borderRadius: '8px' }}>
                <span className="eyebrow">LESIONES PASADAS / CIRUGÍAS</span>
                <p style={{ margin: '4px 0 0', fontSize: '0.9rem' }}>
                  {p.alumno?.lesionesPasadas || 'Sin historial de lesiones o cirugías previas.'}
                </p>
              </div>
              <div style={{ background: 'var(--card-subtle, rgba(255,255,255,0.03))', padding: '12px', borderRadius: '8px' }}>
                <span className="eyebrow">OBSERVACIONES MÉDICAS</span>
                <p style={{ margin: '4px 0 0', fontSize: '0.9rem' }}>
                  {p.alumno?.observacionesMedicas || 'Apto para actividad física general sin restricciones.'}
                </p>
              </div>
              <div style={{ background: 'var(--card-subtle, rgba(255,255,255,0.03))', padding: '12px', borderRadius: '8px' }}>
                <span className="eyebrow">CONTACTO DE EMERGENCIA</span>
                <p style={{ margin: '4px 0 0', fontSize: '0.9rem' }}>
                  {p.alumno?.contactoEmergenciaNombre ? (
                    <>
                      <b>{p.alumno.contactoEmergenciaNombre}</b>
                      {p.alumno.contactoEmergenciaTelefono && ` (Tel: ${p.alumno.contactoEmergenciaTelefono})`}
                    </>
                  ) : (
                    'No registrado.'
                  )}
                </p>
              </div>
            </div>
          </Card>

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
              <small
                style={{
                  color: 'var(--muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '6px',
                  fontSize: '0.8rem',
                }}
              >
                <Sparkles size={14} style={{ color: '#4ade80' }} />
                Tu entrenador puede pegar el texto completo y se rellenará automáticamente.
              </small>
              <button
                className="button ghost"
                style={{
                  marginTop: '10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onClick={() => {
                  void navigator.clipboard?.writeText(
                    `${token.data?.data.codigo} ${token.data?.data.secreto}`,
                  );
                  setTokenCopied(true);
                  setTimeout(() => setTokenCopied(false), 2500);
                }}
              >
                {tokenCopied ? (
                  <>
                    <Check size={16} style={{ color: '#4ade80' }} /> ¡Copiado al portapapeles!
                  </>
                ) : (
                  <>
                    <Copy size={16} /> Copiar token completo (código + secreto)
                  </>
                )}
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
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
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

            {isStudent && (
              <>
                <hr style={{ border: 'none', borderTop: '1px solid var(--border, #333)', margin: '16px 0' }} />
                <span className="eyebrow">DATOS MÉDICOS Y LESIONES</span>
                <label>
                  Lesiones actuales / Dolencias activas
                  <textarea
                    rows={2}
                    value={form.lesiones_actuales}
                    placeholder="Ej. Molestia en hombro derecho al empujar"
                    onChange={(event) => setForm({ ...form, lesiones_actuales: event.target.value })}
                  />
                </label>
                <label>
                  Lesiones pasadas / Antecedentes
                  <textarea
                    rows={2}
                    value={form.lesiones_pasadas}
                    placeholder="Ej. Esguince de tobillo en 2022"
                    onChange={(event) => setForm({ ...form, lesiones_pasadas: event.target.value })}
                  />
                </label>
                <label>
                  Observaciones médicas o recomendaciones
                  <textarea
                    rows={2}
                    value={form.observaciones_medicas}
                    placeholder="Ej. Asma leve, hidratación constante"
                    onChange={(event) => setForm({ ...form, observaciones_medicas: event.target.value })}
                  />
                </label>
                <label>
                  Número celular
                  <input
                    value={form.numero_celular}
                    placeholder="+52 55 1234 5678"
                    onChange={(event) => setForm({ ...form, numero_celular: event.target.value })}
                  />
                </label>
                <label>
                  Contacto de emergencia (Nombre)
                  <input
                    value={form.contacto_emergencia_nombre}
                    placeholder="Familiar o contacto"
                    onChange={(event) => setForm({ ...form, contacto_emergencia_nombre: event.target.value })}
                  />
                </label>
                <label>
                  Teléfono de emergencia
                  <input
                    value={form.contacto_emergencia_telefono}
                    placeholder="+52 55 9876 5432"
                    onChange={(event) => setForm({ ...form, contacto_emergencia_telefono: event.target.value })}
                  />
                </label>
              </>
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
