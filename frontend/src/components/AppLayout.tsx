import { useQuery } from '@tanstack/react-query';
import { Activity, Dumbbell, House, LogOut, TrendingUp, UserRound, Users } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { get, post } from '../lib/api';
import type { Profile } from '../lib/types';

export function AppLayout() {
  const navigate = useNavigate();
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => get<Profile>('/perfil'),
  });
  const trainer = profile?.role === 'entrenador';
  const items = [
    { to: '/app', label: 'Inicio', icon: House },
    ...(trainer
      ? [
          { to: '/app/alumnos', label: 'Alumnos', icon: Users },
          { to: '/app/rutinas', label: 'Rutinas', icon: Dumbbell },
        ]
      : [{ to: '/app/progreso', label: 'Progreso', icon: TrendingUp }]),
    { to: '/app/perfil', label: 'Perfil', icon: UserRound },
  ];
  const logout = async () => {
    await post('/auth/logout').catch(() => undefined);
    localStorage.removeItem('ritmo_token');
    await navigate('/login');
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
        <button className="logout" onClick={() => void logout()}>
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
    </div>
  );
}
