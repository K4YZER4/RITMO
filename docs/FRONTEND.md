# Frontend

El cliente vive en `frontend/` y usa React, Vite, TypeScript, React Router y TanStack Query.

## Rutas

| Ruta                | Uso                                |
| ------------------- | ---------------------------------- |
| `/`                 | Landing pública del portafolio     |
| `/login`            | Acceso a cuentas reales o demo     |
| `/app`              | Dashboard adaptado al rol          |
| `/app/alumnos`      | Alumnos vinculados del entrenador  |
| `/app/rutinas`      | Biblioteca y creación de rutinas   |
| `/app/entrenar/:id` | Reproductor móvil de entrenamiento |
| `/app/progreso`     | Sesiones, volumen y PR             |
| `/app/perfil`       | Perfil y plan actual               |

## Ejecución

```bash
pnpm install
cp frontend/.env.example frontend/.env.local
pnpm web:dev
```

`VITE_API_URL` debe apuntar a la API NestJS. El token se conserva en `localStorage`; para una aplicación comercial se recomienda migrarlo a cookies HttpOnly con protección CSRF.

El build `pnpm web:build` genera `frontend/dist` y un service worker para instalación como PWA.
