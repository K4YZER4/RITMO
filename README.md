# RITMO — Backend (NestJS)

Backend de la plataforma **RITMO**, una aplicación de entrenamiento que conecta a **entrenadores** con **alumnos** mediante rutinas y ejercicios, con sistema de **suscripciones** y **pagos** integrados con **Stripe**.

---

## Propósito del proyecto

RITMO es una plataforma de entrenamiento físico que permite:

- **Registro** e **inicio de sesión** de alumnos y entrenadores (autenticación JWT).
- **Gestión de rutinas** por entrenador: crear rutinas, asignarles ejercicios y asignarlas a alumnos en días específicos, resolviendo solapamientos de fechas.
- **Gestión de ejercicios personalizados** por alumno, con músculos y equipos asociados y límites según el plan.
- **Vinculación alumno ↔ entrenador** mediante tokens (código + secreto) de una sola vez y con caducidad.
- **Suscripciones** con planes (gratuitos y de pago), estados (`prueba`, `activa`, `morosa`, `cancelada`, `expirada`) y cobros recurrentes.
- **Pagos con Stripe**: sesiones de Checkout, webhooks (`checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`) con deduplicación de eventos.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | NestJS 11 |
| Lenguaje | TypeScript 5.7 |
| ORM | Prisma 7 (`@prisma/client` con `@prisma/adapter-pg` / Prisma Accelerate) |
| Base de datos | PostgreSQL (multi-schema: `alumno`, `app_user`, `core`, `entrenador`, `ubi`) |
| Host de DB | Neón (remoto; ver `DIRECT_URL`) |
| Pagos | Stripe API v22 |
| Validación | `class-validator` + `class-transformer` |
| Configuración de entorno | `zod` (`config/env.schema.ts`) |
| Hashing / tokens | `bcrypt`, `uuid` |
| Tests | Jest + `ts-jest` |
| Lint / formato | ESLint 9 + Prettier |

---

## Requisitos

- **Node.js** 18 o superior (recomendado 20+).
- **pnpm** (gestor de paquetes usado por el proyecto).
- Una base de datos **PostgreSQL** accesible (el proyecto se usa típicamente con **Neón**).
- Cuenta de **Stripe** (claves `test`/`live` y secreto de webhook).
- (Opcional) Prisma CLI para migraciones.

---

## Instalación local

> El proyecto no se entrega con un `.env`; los valores los crea quien lo despliegue.

1. **Clonar e instalar dependencias**

   ```bash
   pnpm install
   ```

2. **Configurar variables de entorno**

   ```bash
   cp .env.example .env
   ```

   Completa los valores en `.env` según la sección [Variables de entorno](#variables-de-entorno).

3. **Generar el cliente de Prisma**

   ```bash
   pnpm prisma:generate
   ```

4. **Aplicar las migraciones a la base de datos**

   ```bash
   pnpm prisma migrate deploy
   ```

   > En despliegues con Neón usa `prisma migrate deploy` (no interactivo). `prisma migrate dev` es interactivo y puede pedir confirmación.

5. **Ejecutar el servidor**

   ```bash
   pnpm start:dev
   ```

   El servidor escucha en `http://localhost:3000` (o el `PORT` configurado).

---

## Variables de entorno

Todas las variables están **validadas** por `src/config/env.schema.ts` antes de arrancar. Si falta una o no cumple el formato, la app no inicia.

| Variable | Descripción | Formato / validación |
|----------|-------------|----------------------|
| `NODE_ENV` | Entorno de ejecución. | `development` \| `test` \| `production`. Default: `development`. |
| `PORT` | Puerto HTTP donde escucha NestJS. | Entero 1–65535. Default: `3000`. |
| `DATABASE_URL` | URL de conexión a PostgreSQL usada por Prisma en runtime. | String no vacía. |
| `DIRECT_URL` | URL directa usada por Prisma para migraciones y operaciones que no pasan por el pooler (en Neón, host directo). | String no vacía. |
| `JWT_SECRET` | Secreto para firmar y verificar los JWT. | Mínimo **32 caracteres**. |
| `JWT_EXPIRATION_TIME` | Vigencia del JWT en **segundos**. | Entero positivo. 86400 = 24 h. |
| `RATE_LIMIT_TTL` | Ventana de tiempo del rate limit en **milisegundos**. | Entero positivo. 10000 = 10 s. |
| `RATE_LIMIT_GLOBAL_LIMIT` | Máximo de peticiones por IP dentro de `RATE_LIMIT_TTL`. | Entero positivo. |
| `STRIPE_SECRET_KEY` | Clave secreta de Stripe. | Debe iniciar con `sk_test_` o `sk_live_`. |
| `STRIPE_WEBHOOK_SECRET` | Firma para verificar los webhooks de Stripe. | Debe iniciar con `whsec_`. |
| `FRONTEND_URL` | URL del frontend, usada para construir las URLs de éxito/cancelación del Checkout. | Debe ser una URL válida. |

> ⚠️ Pendiente de confirmar: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` y `FRONTEND_URL` están **validados en el schema** y se usan en el código, pero **no aparecen** en `.env.example`. Habría que añadirlos a `.env.example` para que la instalación local quede documentada de forma completa.

---

## Scripts disponibles

| Script | Comando |
|--------|---------|
| `start` | `nest start` |
| `start:dev` | `nest start --watch` (hot reload) |
| `start:debug` | `nest start --debug --watch` |
| `start:prod` | `node dist/main` |
| `build` | `nest build` (compila a `dist/`) |
| `format` | `prettier --write "src/**/*.ts" "test/**/*.ts"` |
| `lint` | `eslint "{src,apps,libs,test}/**/*.ts" --fix` |
| `test` | `jest` |
| `test:watch` | `jest --watch` |
| `test:cov` | `jest --coverage` |
| `test:debug` | `jest --runInBand` con inspector |
| `test:e2e` | `jest --config ./test/jest-e2e.json` |
| `prisma:generate` | `prisma generate` |
| `prisma:migrate` | `prisma migrate dev` |
| `prisma:push` | `prisma db push` |
| `prisma:studio` | `prisma studio` |

---

## Cómo ejecutar tests

Ejecutar **toda** la suite:

```bash
pnpm test
```

Otras variantes:

```bash
pnpm test:watch    # modo watch
pnpm test:cov      # con cobertura
pnpm test:e2e      # tests end-to-end
```

Para ejecutar un único archivo:

```bash
pnpm test path/al/archivo.spec.ts
```

> Nota de configuración: Jest usa `moduleNameMapper` para resolver `uuid` a un shim CJS (`test/uuid-cjs-shim.js`), porque `uuid@14` es ESM puro. El `testRegex` es `.*\.spec\.ts$`, por lo que los tests e2e (que terminan en `e2e-spec.ts`) no coinciden con `pnpm test` y se corren con `pnpm test:e2e`.

---

## Estructura de carpetas

```
ritmo/
├── prisma/
│   ├── schema.prisma          # Modelos, relaciones y enums (multi-schema)
│   └── migrations/            # Migraciones SQL versionadas
├── src/
│   ├── main.ts                # Bootstrap, pipes globales, puerto
│   ├── app.module.ts          # Módulo raíz, guards globales, throttler
│   ├── app.controller.ts      # GET / (health/ping)
│   ├── app.service.ts
│   ├── common/
│   │   ├── constants/          # DB_SEXO_IDS
│   │   ├── decorators/         # @Public, @SinSuscripcion, @CurrentUser, @RateLimit, validadores de fecha
│   │   ├── exception/          # AppBadRequestException, mensajes de validación
│   │   ├── filter/             # GlobalExceptionFilter (errores Prisma/formato)
│   │   ├── guards/             # JwtAuthGuard, SuscripcionGuard
│   │   ├── middleware/         # RequestIdMiddleware
│   │   ├── pipes/              # AppValidationPipe, ParseBigIntPipe
│   │   └── types/              # JwtPayload
│   ├── config/
│   │   └── env.schema.ts       # Schema de variables de entorno (zod)
│   ├── modules/
│   │   ├── alumno-entrenador/  # Vinculación/desvinculación alumno-entrenador
│   │   ├── auth/               # Login y registro
│   │   ├── ejercicios/         # Ejercicios personalizados
│   │   ├── pagos/              # Checkout + webhooks Stripe
│   │   ├── rutinas/            # CRUD de rutinas y asignación
│   │   ├── stripe/             # Cliente Stripe (wrapper)
│   │   └── suscripciones/      # Ciclo de vida de suscripciones
│   ├── prisma/
│   │   ├── prisma.module.ts    # Módulo global de Prisma
│   │   └── prisma.service.ts   # PrismaService (acceso a DB)
│   └── types/                  # Augment de Express Request (user, requestId), RawBodyRequest
└── test/                       # Tests e2e y shims de Jest
```

---

## Documentación técnica

- [`docs/architecture.md`](./docs/architecture.md) — arquitectura, responsabilidades, módulos, flujos de autenticación/roles y diagrama.
- [`docs/api-resumen.md`](./docs/api-resumen.md) — tabla resumen de todos los endpoints.
- [`docs/api-detallada.md`](./docs/api-detallada.md) — especificación detallada por endpoint (guards, DTOs, errores).