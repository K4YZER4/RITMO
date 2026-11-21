# Despliegue de la demo en Render (Docker Efímero $0.00)

RITMO está configurado para ejecutarse en el plan gratuito de **Render** usando un contenedor Docker multi-stage que incluye **PostgreSQL 16 local embebido**, garantizando:
- **Cero costo de base de datos** (no requiere Neon, Supabase ni planes de pago).
- **Entorno inmaculado e idempotente**: Cada vez que el servicio despierta o se reinicia, inicializa una base limpia, corre las migraciones de Prisma y ejecuta automáticamente el seed de datos demo.
- **Bajo consumo de memoria**: Optimizado para correr con ~160 MB de RAM, ideal para el límite de 512 MB de Render Free.

---

## 1. Despliegue con Blueprint en Render

1. En tu panel de Render, selecciona **New + → Blueprint**.
2. Conecta tu repositorio de GitHub `ritmo`.
3. Render detectará automáticamente `render.yaml` y creará dos servicios:
   - **`ritmo-api`**: Servicio Web (Docker Runtime) con Healthcheck en `/health`.
   - **`ritmo-web`**: Sitio Estático para la PWA de React 19.

---

## 2. Variables de Entorno

En el asistente del Blueprint de Render:
1. `FRONTEND_URL`: URL pública asignada a `ritmo-web` (ej. `https://ritmo-web.onrender.com`).
2. `VITE_API_URL`: URL pública asignada a `ritmo-api` (ej. `https://ritmo-api.onrender.com`).
3. `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET`: Opcionales en modo demo (puedes usar claves de test `sk_test_...` o valores dummy).

*(Nota: `DATABASE_URL` y `DIRECT_URL` ya no son necesarias en Render porque se autoconfiguran internamente en localhost dentro del contenedor Docker)*.

---

## 3. Ciclo de Vida del Contenedor Efímero

Cuando un reclutador o visitante abre la aplicación:
1. Si el contenedor estaba suspendido, Render lo activa (~30-45 segundos de arranque en frío).
2. El script `docker/entrypoint.sh`:
   - Arranca PostgreSQL localmente con buffers reducidos (16MB).
   - Ejecuta `prisma migrate deploy` para estructurar los esquemas.
   - Ejecuta `node dist/prisma-seed/seed-demo.js` para precargar rutinas y cuentas demo.
   - Inicia NestJS en el puerto 3000.
3. El frontend muestra un mensaje intuitivo al usuario si detecta el arranque en frío.
4. Quince minutos después de inactividad, Render suspende el contenedor sin generar consumo ni costos.

---

## 4. Cuentas de Acceso Rápido Demo

| Rol | Correo | Contraseña |
| :--- | :--- | :--- |
| **Entrenador Demo** | `demo.entrenador@ritmo.app` | `RitmoDemo2026!` |
| **Alumno Demo** | `demo.alumno@ritmo.app` | `RitmoDemo2026!` |

*(Ambas cuentas cuentan con botones de 1-clic directo desde la pantalla de login)*.
