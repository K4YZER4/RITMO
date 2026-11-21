import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, UserPlus, UserMinus, ClipboardPaste, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Card, Empty, Loading, Page, fullName } from '../components/Ui';
import { get, post, put } from '../lib/api';
import type { Student } from '../lib/types';
import { ConfirmPasswordModal } from '../components/ConfirmPasswordModal';

function parseTokenPair(text: string): { codigo: string; secreto: string } | null {
  if (!text) return null;
  const clean = text.trim();

  // Caso 1: JSON
  if (clean.startsWith('{') && clean.endsWith('}')) {
    try {
      const obj = JSON.parse(clean);
      if (obj.codigo && obj.secreto) {
        return {
          codigo: String(obj.codigo).toUpperCase().trim(),
          secreto: String(obj.secreto).trim(),
        };
      }
    } catch {}
  }

  // Caso 2: Separado por dos puntos, guión, barra, espacios o saltos de línea
  const parts = clean.split(/[:\/\-|\s\n\t]+/).filter(Boolean);
  if (parts.length >= 2) {
    return {
      codigo: parts[0].toUpperCase().replace(/\s/g, ''),
      secreto: parts[1].replace(/\s/g, ''),
    };
  }

  return null;
}

export function Students() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [secreto, setSecreto] = useState('');
  const [autoFilled, setAutoFilled] = useState(false);
  const [message, setMessage] = useState('');
  const [linkError, setLinkError] = useState('');
  const [unlinkError, setUnlinkError] = useState('');
  const [linking, setLinking] = useState(false);
  const [unlinkStudent, setUnlinkStudent] = useState<Student | null>(null);

  function handleSmartPaste(text: string): boolean {
    const parsed = parseTokenPair(text);
    if (parsed) {
      setCodigo(parsed.codigo);
      setSecreto(parsed.secreto);
      setAutoFilled(true);
      setLinkError('');
      return true;
    }
    return false;
  }
  const { data, isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: () => get<Student[]>('/entrenador/alumnos'),
  });
  if (isLoading) return <Loading />;
  const list = data?.filter((s) => fullName(s.usuario).toLowerCase().includes(q.toLowerCase()));
  async function consumeToken() {
    setLinkError('');
    setLinking(true);
    try {
      const result = await post<{ message: string }>('/alumno-entrenador/token/consumir', {
        codigo: codigo.trim().toUpperCase(),
        secreto: secreto.trim(),
      });
      setMessage(result.message);
      setOpen(false);
      setCodigo('');
      setSecreto('');
      setAutoFilled(false);
      await qc.invalidateQueries({ queryKey: ['students'] });
    } catch (error) {
      setLinkError(error instanceof Error ? error.message : 'No se pudo vincular al alumno');
    } finally {
      setLinking(false);
    }
  }
  async function unlink(password: string) {
    if (!unlinkStudent) return;
    setUnlinkError('');
    try {
      const result = await put<{ message: string }>(
        `/alumno-entrenador/cancelar/alumno/${unlinkStudent.idUsuario}`,
        { contraseña_entrenador: password },
      );
      setMessage(result.message);
      setUnlinkStudent(null);
      await qc.invalidateQueries({ queryKey: ['students'] });
    } catch (error) {
      setUnlinkError(error instanceof Error ? error.message : 'No se pudo desvincular al alumno');
    }
  }
  return (
    <Page
      eyebrow="GESTIÓN"
      title="Tus alumnos"
      action={
        <button
          className="button primary"
          onClick={() => {
            setAutoFilled(false);
            setLinkError('');
            setOpen(true);
          }}
        >
          <UserPlus /> Vincular alumno
        </button>
      }
    >
      {message && <div className="notice">{message}</div>}
      <div className="search">
        <Search />
        <input placeholder="Buscar alumno…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <Card>
        {list?.map((s) => (
          <div className="student-row" key={s.idUsuario}>
            <Link to={`/app/alumnos/${s.idUsuario}`} className="avatar big">
              {s.usuario.nombre[0]}
            </Link>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <Link to={`/app/alumnos/${s.idUsuario}`}>
                  <h3>{fullName(s.usuario)}</h3>
                </Link>
                {s.objetivo && (
                  <span className="pill small" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                    {s.objetivo.nombre}
                  </span>
                )}
                {s.nivelActividad && (
                  <span className="pill ghost small" style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
                    {s.nivelActividad.nombre}
                  </span>
                )}
              </div>
              <p style={{ margin: '2px 0 6px', fontSize: '0.82rem', color: 'var(--muted)' }}>
                {s.usuario.correo} {s.numeroCelular ? `· 📱 ${s.numeroCelular}` : ''}
              </p>

              {/* Ficha clínica estructurada por campos */}
              <div className="student-fields-grid">
                {s.observacionesMedicas && (
                  <div className="student-info-field note">
                    <span className="field-tag">📋 Nota del alumno</span>
                    <p>{s.observacionesMedicas}</p>
                  </div>
                )}
                {s.lesionesActuales &&
                  !s.lesionesActuales.toLowerCase().includes('ningun') && (
                    <div className="student-info-field alert">
                      <span className="field-tag">⚠️ Lesión activa</span>
                      <p>{s.lesionesActuales}</p>
                    </div>
                  )}
                {s.lesionesPasadas &&
                  !s.lesionesPasadas.toLowerCase().includes('ningun') && (
                    <div className="student-info-field history">
                      <span className="field-tag">🩹 Historial de lesiones</span>
                      <p>{s.lesionesPasadas}</p>
                    </div>
                  )}
              </div>
            </div>
            <div className="student-meta">
              <b>{s.usuario._count.sesionEntrenamiento}</b>
              <small>sesiones</small>
            </div>
            <div className="student-meta">
              <b>{s.usuario.usuarioMedicion[0]?.pesoKg || '—'}</b>
              <small>kg actual</small>
            </div>
            <button
              className="icon-button"
              title="Desvincular alumno"
              onClick={() => setUnlinkStudent(s)}
            >
              <UserMinus size={18} />
            </button>
          </div>
        ))}
        {!list?.length && <Empty>No encontramos alumnos vinculados.</Empty>}
      </Card>
      {open && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setAutoFilled(false);
            setLinkError('');
            setOpen(false);
          }}
        >
          <form
            className="modal"
            onSubmit={(event) => {
              event.preventDefault();
              void consumeToken();
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <span className="eyebrow">VINCULAR ALUMNO</span>
            <h2>Usa el token del alumno</h2>
            <p>El alumno debe compartirte el código y el secreto generados desde su perfil.</p>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--card-subtle, rgba(255, 255, 255, 0.03))',
                border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                borderRadius: '8px',
                padding: '8px 12px',
                margin: '8px 0 16px 0',
                gap: '8px',
              }}
            >
              <small style={{ color: 'var(--muted)', fontSize: '0.8rem', flex: 1 }}>
                💡 Puedes pegar el texto completo con <b>Ctrl + V</b> o usar el botón directo.
              </small>
              <button
                type="button"
                className="button ghost"
                style={{
                  padding: '5px 10px',
                  fontSize: '0.8rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                }}
                onClick={async () => {
                  try {
                    const clipText = await navigator.clipboard?.readText();
                    if (clipText && handleSmartPaste(clipText)) {
                      setLinkError('');
                    } else if (clipText) {
                      setLinkError('No se encontró un código y secreto válidos en el portapapeles.');
                    }
                  } catch {
                    setLinkError('No se pudo leer el portapapeles directamente. Pégalo en los campos.');
                  }
                }}
              >
                <ClipboardPaste size={14} /> Pegar portapapeles
              </button>
            </div>

            {autoFilled && (
              <div
                style={{
                  background: 'rgba(34, 197, 94, 0.12)',
                  border: '1px solid rgba(34, 197, 94, 0.35)',
                  color: '#4ade80',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '12px',
                }}
              >
                <Sparkles size={16} /> Código y secreto detectados y separados automáticamente
              </div>
            )}

            <label>
              Código
              <input
                value={codigo}
                onChange={(event) => {
                  const val = event.target.value;
                  if (val.includes(' ') || val.includes(':') || val.includes('-') || val.includes('/')) {
                    if (handleSmartPaste(val)) return;
                  }
                  setAutoFilled(false);
                  setCodigo(val.toUpperCase().replace(/\s/g, ''));
                }}
                onPaste={(event) => {
                  const pasted = event.clipboardData.getData('text');
                  if (handleSmartPaste(pasted)) {
                    event.preventDefault();
                  }
                }}
                placeholder="Ej: VALE2026 (o pega todo aquí)"
                required
              />
            </label>
            <label>
              Secreto
              <input
                value={secreto}
                onChange={(event) => {
                  const val = event.target.value;
                  if (val.includes(' ') || val.includes(':') || val.includes('-') || val.includes('/')) {
                    if (handleSmartPaste(val)) return;
                  }
                  setAutoFilled(false);
                  setSecreto(val.replace(/\s/g, ''));
                }}
                onPaste={(event) => {
                  const pasted = event.clipboardData.getData('text');
                  if (handleSmartPaste(pasted)) {
                    event.preventDefault();
                  }
                }}
                placeholder="Ej: vale1234"
                required
              />
            </label>
            {linkError && <div className="error">{linkError}</div>}
            <div className="modal-actions">
              <button
                type="button"
                className="button ghost"
                onClick={() => {
                  setAutoFilled(false);
                  setLinkError('');
                  setOpen(false);
                }}
              >
                Cancelar
              </button>
              <button className="button primary" disabled={linking}>
                {linking ? 'Vinculando…' : 'Vincular'}
              </button>
            </div>
          </form>
        </div>
      )}
      {unlinkStudent && (
        <ConfirmPasswordModal
          title={`¿Desvincular a ${fullName(unlinkStudent.usuario)}?`}
          description="El alumno dejará de aparecer en tu cartera, pero su historial permanecerá guardado."
          submitLabel="Desvincular alumno"
          onClose={() => {
            setUnlinkError('');
            setUnlinkStudent(null);
          }}
          onConfirm={(password) => void unlink(password)}
          error={unlinkError || undefined}
        />
      )}
    </Page>
  );
}
