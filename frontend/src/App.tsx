import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Routines } from './pages/Routines';
import { Students } from './pages/Students';
import { Workout } from './pages/Workout';
import { Progress } from './pages/Progress';
import { ProfilePage } from './pages/ProfilePage';
import { StudentDetail } from './pages/StudentDetail';
import { Register } from './pages/Register';

function Protected() {
  return localStorage.getItem('ritmo_token') ? <AppLayout /> : <Navigate to="/login" replace />;
}
export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Register />} />
      <Route element={<Protected />}>
        <Route path="/app" element={<Dashboard />} />
        <Route path="/app/rutinas" element={<Routines />} />
        <Route path="/app/alumnos" element={<Students />} />
        <Route path="/app/alumnos/:id" element={<StudentDetail />} />
        <Route path="/app/entrenar/:id" element={<Workout />} />
        <Route path="/app/progreso" element={<Progress />} />
        <Route path="/app/perfil" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
