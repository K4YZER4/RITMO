import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, UserPlus, UserMinus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Card, Empty, Loading, Page, fullName } from '../components/Ui';
import { get, post, put } from '../lib/api';
import type { Student } from '../lib/types';
export function Students() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [secreto, setSecreto] = useState('');
  const [message, setMessage] = useState('');
  const [unlinkStudent, setUnlinkStudent] = useState<Student | null>(null);
  const [trainerPassword, setTrainerPassword] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: () => get<Student[]>('/entrenador/alumnos'),
  });
  if (isLoading) return <Loading />;
  const list = data?.filter((s) => fullName(s.usuario).toLowerCase().includes(q.toLowerCase()));
  async function consumeToken() {
    setMessage('');
    try {
      const result = await post<{ message: string }>('/alumno-entrenador/token/consumir', {
        codigo,
        secreto,
      });
      setMessage(result.message);
      setOpen(false);
      setCodigo('');
      setSecreto('');
      await qc.invalidateQueries({ queryKey: ['students'] });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo vincular al alumno');
    }
  }
  async function unlink() {
    if (!unlinkStudent) return;
    try {
      const result = await put<{ message: string }>(
        `/alumno-entrenador/cancelar/alumno/${unlinkStudent.idUsuario}`,
        { contraseña_entrenador: trainerPassword },
      );
      setMessage(result.message);
      setUnlinkStudent(null);
      setTrainerPassword('');
      await qc.invalidateQueries({ queryKey: ['students'] });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo desvincular al alumno');
    }
  }
  return (
    <Page
      eyebrow="GESTIÓN"
      title="Tus alumnos"
      action={
        <button className="button primary" onClick={() => setOpen(true)}>
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
            <div>
              <Link to={`/app/alumnos/${s.idUsuario}`}>
                <h3>{fullName(s.usuario)}</h3>
              </Link>
              <p>{s.usuario.correo}</p>
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
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
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
            <label>
              Código
              <input value={codigo} onChange={(event) => setCodigo(event.target.value)} required />
            </label>
            <label>
              Secreto
              <input
                value={secreto}
                onChange={(event) => setSecreto(event.target.value)}
                required
              />
            </label>
            {message && <div className="error">{message}</div>}
            <div className="modal-actions">
              <button type="button" className="button ghost" onClick={() => setOpen(false)}>
                Cancelar
              </button>
              <button className="button primary">Vincular</button>
            </div>
          </form>
        </div>
      )}
      {unlinkStudent && (
        <div className="modal-backdrop" onClick={() => setUnlinkStudent(null)}>
          <form
            className="modal"
            onSubmit={(event) => {
              event.preventDefault();
              void unlink();
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <span className="eyebrow">DESVINCULAR ALUMNO</span>
            <h2>{fullName(unlinkStudent.usuario)}</h2>
            <p>Esta acción cerrará la vinculación actual y requiere confirmar tu contraseña.</p>
            <label>
              Contraseña del entrenador
              <input
                type="password"
                value={trainerPassword}
                onChange={(event) => setTrainerPassword(event.target.value)}
                required
              />
            </label>
            {message && <div className="error">{message}</div>}
            <div className="modal-actions">
              <button type="button" className="button ghost" onClick={() => setUnlinkStudent(null)}>
                Cancelar
              </button>
              <button className="button primary">Confirmar</button>
            </div>
          </form>
        </div>
      )}
    </Page>
  );
}
