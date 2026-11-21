import { Activity, ArrowLeft } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { post } from '../lib/api';
import { useQueryClient } from '@tanstack/react-query';

export function Login() {
  const demoPassword = 'RitmoDemo2026!';
  const nav = useNavigate();
  const qc = useQueryClient();
  const [email, setEmail] = useState('demo.entrenador@ritmo.app');
  const [password, setPassword] = useState(demoPassword);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  async function performLogin(targetEmail: string, targetPass: string) {
    setBusy(true);
    setError('');
    setStatusMessage('Conectando con el servidor...');

    // Si tarda más de 3s, avisar del arranque en frío de Render
    const coldStartTimer = setTimeout(() => {
      setStatusMessage('Despertando entorno efímero en Render (~30-45s la primera vez)...');
    }, 3000);

    try {
      const r = await post<{ token: string }>('/auth/login', {
        correo: targetEmail,
        password: targetPass,
      });
      clearTimeout(coldStartTimer);
      qc.clear();
      localStorage.setItem('ritmo_token', r.token);
      await nav('/app');
    } catch (e) {
      clearTimeout(coldStartTimer);
      setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión');
    } finally {
      setBusy(false);
      setStatusMessage('');
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    await performLogin(email, password);
  }

  return (
    <div className="auth-page">
      <Link to="/" className="back">
        <ArrowLeft /> Volver
      </Link>
      <form className="auth-card" onSubmit={(event) => void submit(event)}>
        <div className="auth-logo">
          <Activity />
          RITMO
        </div>
        <span className="eyebrow">BIENVENIDO DE VUELTA</span>
        <h1>Continúa tu ritmo.</h1>
        <p>Usa un acceso rápido demo o tus credenciales.</p>
        <label>
          Correo
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        {error && <div className="error">{error}</div>}
        {statusMessage && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted, #888)', textAlign: 'center', margin: '4px 0' }}>{statusMessage}</div>}
        <button className="button primary full" disabled={busy}>
          {busy ? (statusMessage || 'Entrando…') : 'Iniciar sesión'}
        </button>
        <div className="demo-credentials">
          <span className="eyebrow">ACCESO RÁPIDO PARA RECLUTADORES / DEMO</span>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setEmail('demo.entrenador@ritmo.app');
              setPassword(demoPassword);
              void performLogin('demo.entrenador@ritmo.app', demoPassword);
            }}
          >
            <b>⚡ Entrar como Entrenador (Demo)</b>
            <small>demo.entrenador@ritmo.app</small>
            <small>1 clic para auto-login</small>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setEmail('demo.alumno@ritmo.app');
              setPassword(demoPassword);
              void performLogin('demo.alumno@ritmo.app', demoPassword);
            }}
          >
            <b>⚡ Entrar como Alumno (Demo)</b>
            <small>demo.alumno@ritmo.app</small>
            <small>1 clic para auto-login</small>
          </button>
        </div>
        <p className="auth-footer">
          ¿Aún no tienes cuenta? <Link to="/registro">Crear cuenta</Link>
        </p>
      </form>
    </div>
  );
}
