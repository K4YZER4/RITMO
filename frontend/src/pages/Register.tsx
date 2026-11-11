import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { post } from '../lib/api';
import { get } from '../lib/api';
import type { Catalogs } from '../lib/types';
import { useQuery } from '@tanstack/react-query';

export function Register() {
  const demoMode = import.meta.env.VITE_DEMO_MODE !== 'false';
  const nav = useNavigate();
  const [role, setRole] = useState<'entrenador' | 'alumno'>('entrenador');
  const [form, setForm] = useState<Record<string, string>>({
    sexo: 'MASCULINO',
    fecha_nacimiento: '1995-01-01',
    fecha_inicio_entrenamiento: new Date().toISOString().slice(0, 10),
    observaciones_medicas: 'Ninguna',
    lesiones_actuales: 'Ninguna',
    lesiones_pasadas: 'Ninguna',
    contacto_emergencia_nombre: 'Contacto demo',
    contacto_emergencia_telefono: '5555555555',
    id_objetivo: '2',
    id_nivel_actividad: '3',
  });
  const [error, setError] = useState('');
  const { data: catalogs } = useQuery({
    queryKey: ['catalogs'],
    queryFn: () => get<Catalogs>('/catalogos'),
  });
  const update = (key: string, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (demoMode) {
      setError(
        'Esta es una demo. La API de crear usuario ha sido desactivada. Usa una cuenta demo desde el login.',
      );
      return;
    }
    try {
      const payload = {
        ...form,
        ...(role === 'entrenador'
          ? {
              nombre_publico: form.nombre_publico || `${form.nombre || ''} Coach`,
              fecha_entrenador: form.fecha_entrenador || new Date().toISOString().slice(0, 10),
            }
          : {
              id_objetivo: Number(form.id_objetivo),
              id_nivel_actividad: Number(form.id_nivel_actividad),
            }),
      };
      await post(`/auth/registrar/${role}`, payload);
      await nav('/login');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear la cuenta');
    }
  }
  return (
    <div className="auth-page">
      <Link to="/login" className="back">
        ← Volver al login
      </Link>
      <form className="auth-card register-card" onSubmit={(event) => void submit(event)}>
        <span className="eyebrow">CREAR CUENTA</span>
        <h1>Empieza tu ritmo.</h1>
        <div className="role-switch">
          <button
            type="button"
            className={role === 'entrenador' ? 'active' : ''}
            onClick={() => setRole('entrenador')}
          >
            Entrenador
          </button>
          <button
            type="button"
            className={role === 'alumno' ? 'active' : ''}
            onClick={() => setRole('alumno')}
          >
            Alumno
          </button>
        </div>
        <div className="form-grid">
          <label>
            Nombre
            <input
              required
              minLength={2}
              value={form.nombre || ''}
              onChange={(e) => update('nombre', e.target.value)}
            />
          </label>
          <label>
            Apellido paterno
            <input
              required
              minLength={2}
              value={form.apellido_paterno || ''}
              onChange={(e) => update('apellido_paterno', e.target.value)}
            />
          </label>
          <label>
            Apellido materno
            <input
              required
              minLength={2}
              value={form.apellido_materno || ''}
              onChange={(e) => update('apellido_materno', e.target.value)}
            />
          </label>
          <label>
            Sexo
            <select value={form.sexo} onChange={(e) => update('sexo', e.target.value)}>
              <option>MASCULINO</option>
              <option>FEMENINO</option>
            </select>
          </label>
          <label>
            Correo
            <input
              type="email"
              required
              value={form.correo || ''}
              onChange={(e) => update('correo', e.target.value)}
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              required
              minLength={8}
              value={form.password || ''}
              onChange={(e) => update('password', e.target.value)}
            />
          </label>
          <label>
            Fecha de nacimiento
            <input
              type="date"
              required
              value={form.fecha_nacimiento}
              onChange={(e) => update('fecha_nacimiento', e.target.value)}
            />
          </label>
          {role === 'entrenador' ? (
            <>
              <label>
                Nombre público
                <input
                  required
                  value={form.nombre_publico || ''}
                  onChange={(e) => update('nombre_publico', e.target.value)}
                />
              </label>
              <label>
                Fecha como entrenador
                <input
                  type="date"
                  required
                  value={form.fecha_entrenador}
                  onChange={(e) => update('fecha_entrenador', e.target.value)}
                />
              </label>
            </>
          ) : (
            <>
              <label>
                Celular
                <input
                  required
                  value={form.numero_celular || ''}
                  onChange={(e) => update('numero_celular', e.target.value)}
                />
              </label>
              <label>
                Inicio de entrenamiento
                <input
                  type="date"
                  required
                  value={form.fecha_inicio_entrenamiento}
                  onChange={(e) => update('fecha_inicio_entrenamiento', e.target.value)}
                />
              </label>
              <label>
                Objetivo
                <select
                  value={form.id_objetivo}
                  onChange={(e) => update('id_objetivo', e.target.value)}
                >
                  {catalogs?.objetivos.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Nivel de actividad
                <select
                  value={form.id_nivel_actividad}
                  onChange={(e) => update('id_nivel_actividad', e.target.value)}
                >
                  {catalogs?.nivelesActividad.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
        </div>
        {role === 'alumno' && (
          <p className="muted">
            Los datos médicos y de emergencia se inicializan como “Ninguna” y pueden completarse
            posteriormente.
          </p>
        )}
        {error && <div className="error">{error}</div>}
        {demoMode && (
          <div className="demo-disabled-notice">
            <b>Modo demostración</b>
            <span>
              El registro está desactivado. Puedes explorar la aplicación con las cuentas demo.
            </span>
          </div>
        )}
        <button className="button primary full">
          {demoMode ? 'Registro desactivado en demo' : 'Crear cuenta'}
        </button>
      </form>
    </div>
  );
}
