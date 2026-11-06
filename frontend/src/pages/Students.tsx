import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { Card, Empty, Loading, Page, fullName } from '../components/Ui';
import { get } from '../lib/api';
import type { Student } from '../lib/types';
export function Students() {
  const [q, setQ] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: () => get<Student[]>('/entrenador/alumnos'),
  });
  if (isLoading) return <Loading />;
  const list = data?.filter((s) => fullName(s.usuario).toLowerCase().includes(q.toLowerCase()));
  return (
    <Page eyebrow="GESTIÓN" title="Tus alumnos">
      <div className="search">
        <Search />
        <input placeholder="Buscar alumno…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <Card>
        {list?.map((s) => (
          <div className="student-row" key={s.idUsuario}>
            <div className="avatar big">{s.usuario.nombre[0]}</div>
            <div>
              <h3>{fullName(s.usuario)}</h3>
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
          </div>
        ))}
        {!list?.length && <Empty>No encontramos alumnos vinculados.</Empty>}
      </Card>
    </Page>
  );
}
