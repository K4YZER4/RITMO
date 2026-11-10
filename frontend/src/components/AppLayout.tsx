import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Dumbbell, House, LogOut, TrendingUp, UserRound, Users } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { get, post } from '../lib/api';
import type { Profile } from '../lib/types';
import { ConfirmActionModal } from './ConfirmActionModal';

export function AppLayout() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => get<Profile>('/perfil'),
  });
  const trainer = profile?.role === 'entrenador';
  const items = [
    ...(profile ? [{ to: '/app', label: 'Inicio', icon: House }] : []),
    ...(profile && trainer
      ? [
          { to: '/app/alumnos', label: 'Alumnos', icon: Users },
          { to: '/app/rutinas', label: 'Rutinas', icon: Dumbbell },
        ]
      : profile
        ? [{ to: '/app/progreso', label: 'Progreso', icon: TrendingUp }]
        : []),
    ...(profile ? [{ to: '/app/perfil', label: 'Perfil', icon: UserRound }] : []),
  ];
  const logout = () => {
    void post('/auth/logout').catch(() => undefined);
    localStorage.removeItem('ritmo_token');
    qc.clear();
    setConfirmLogout(false);
    void navigate('/login', { replace: true });
  };
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink to="/" className="brand">
          <Activity /> RITMO
        </NavLink>
        <nav>
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/app'}>
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>
        <button className="logout" onClick={() => setConfirmLogout(true)}>
          <LogOut size={18} />
          Salir
        </button>
      </aside>
      <header className="mobile-head">
        <span className="brand">
          <Activity /> RITMO
        </span>
        <span>{profile?.nombre}</span>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <nav className="bottom-nav">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/app'}>
            <Icon size={21} />
            <small>{label}</small>
          </NavLink>
        ))}
      </nav>
      {confirmLogout && (
        <ConfirmActionModal
          title="¿Cerrar sesión?"
          description="Tu sesión actual se cerrará y podrás entrar con otra cuenta sin conservar datos anteriores."
          confirmLabel="Cerrar sesión"
          onClose={() => setConfirmLogout(false)}
          onConfirm={logout}
        />
      )}
    </div>
  );
}
