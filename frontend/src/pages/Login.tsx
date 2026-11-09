import { Activity, ArrowLeft } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { post } from '../lib/api';
import { useQueryClient } from '@tanstack/react-query';
export function Login() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [email, setEmail] = useState('demo.entrenador@ritmo.app');
  const [password, setPassword] = useState('RitmoDemo2026!');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await post<{ token: string }>('/auth/login', { correo: email, password });
      qc.clear();
      localStorage.setItem('ritmo_token', r.token);
      await nav('/app');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión');
    } finally {
      setBusy(false);
    }
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
        <p>Usa una cuenta demo o tus propias credenciales.</p>
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
        <button className="button primary full" disabled={busy}>
          {busy ? 'Entrando…' : 'Iniciar sesión'}
        </button>
        <div className="demo-switch">
          <button type="button" onClick={() => setEmail('demo.entrenador@ritmo.app')}>
            Demo entrenador
          </button>
          <button type="button" onClick={() => setEmail('demo.alumno@ritmo.app')}>
            Demo alumno
          </button>
        </div>
        <p className="auth-footer">
          ¿Aún no tienes cuenta? <Link to="/registro">Crear cuenta</Link>
        </p>
      </form>
    </div>
  );
}
