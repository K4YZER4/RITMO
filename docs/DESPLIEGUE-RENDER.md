# Despliegue de la demo en Render

## 1. PostgreSQL

1. Crea un proyecto gratuito en Neon.
2. Conserva la URL con pooler como `DATABASE_URL` y la conexión directa como `DIRECT_URL`.
3. No reutilices la base de pruebas E2E.

## 2. Blueprint

En Render selecciona **New → Blueprint** y conecta el repositorio. `render.yaml` crea:

- `ritmo-api`: servicio Node con health check en `/health`.
- `ritmo-web`: sitio estático con rewrite para React Router.

Configura las variables marcadas como `sync: false`. En una demo sin pagos reales puedes usar claves de Stripe en modo test; nunca publiques claves live.

## 3. Datos demo

Después de ejecutar las migraciones, abre un Shell/Job de Render y ejecuta:

```bash
pnpm seed:demo
```

El seed es idempotente y crea datos ficticios.

| Rol        | Correo                      | Contraseña       |
| ---------- | --------------------------- | ---------------- |
| Entrenador | `demo.entrenador@ritmo.app` | `RitmoDemo2026!` |
| Alumno     | `demo.alumno@ritmo.app`     | `RitmoDemo2026!` |

## 4. Conexión frontend

Asigna la URL pública de la API a `VITE_API_URL`. Luego asigna la URL del sitio estático a `FRONTEND_URL` en la API y redespliega ambos servicios.

El plan gratuito de Render puede dormir el backend. La primera petición de la demo puede tardar varios segundos.
