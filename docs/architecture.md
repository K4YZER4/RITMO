# RITMO Backend — Arquitectura

Este documento describe la arquitectura general del backend NestJS de RITMO: responsabilidades de cada capa, módulos y sus relaciones, los flujos de autenticación/autorización y un diagrama de alto nivel.

---

## 1. Arquitectura general

- Aplicación **NestJS** modular con una capa de **controladores HTTP** (thin controllers), una capa de **servicios** (lógica de negocio) y **Prisma** como única vía de acceso a una **PostgreSQL** multi-schema.
- **Guards globales**: `JwtAuthGuard` y `SuscripcionGuard` se registran como `APP_GUARD` en `app.module.ts`, por lo que **todos** los endpoints quedan protegidos por defecto. Las rutas públicas se marcan con decoradores (ver [Flujo de autorización](#4-flujo-de-autorización-y-roles)).
- **Throttler global** (`ThrottlerGuard`) limita el tráfico por IP; algunos endpoints de autenticación tienen un límite específico vía `@RateLimitEspecifico`.
- **Middleware global** `RequestIdMiddleware` genera/propaga un `requestId` (header `X-Request-Id`), que se incluye en toda respuesta de error.
- **Filtro global** `GlobalExceptionFilter` normaliza errores HTTP, de validación y de Prisma a un único formato JSON.
- **BigInt**: los IDs de negocio que usan `bigint` en Prisma se manejan con `ParseBigIntPipe` (params de ruta) y el decorador validado `IsBigInt` + `@Type(() => BigInt)` (body DTOs).
- **Validación de entorno** con `zod` (`config/env.schema.ts`): la app no arranca si falta/configura mal alguna variable.

> Nota de diseño: **no existe un decorador `@Roles` ni autorización por rol a nivel de ruta**. La verificación de rol se realiza **manualmente dentro de los services** comparando `request.user.role` contra el enum `UserRole` (`alumno`, `entrenador`, `admin`, `alumnoConEntrenador`).

---

## 2. Responsabilidades de cada capa

| Capa | Responsabilidad |
|------|-----------------|
| **Controller** | Define rutas HTTP, aplica decoradores (`@Public`, `@SinSuscripcion`, `@RateLimitEspecifico`), resuelve parámetros (`@CurrentUser`, `@Param` con pipes `ParseBigIntPipe`/`IdNumberDto`/`IsUUIDDto`) y delega en el service. Sin lógica de negocio. |
| **Service** | Contiene la lógica de negocio: validaciones de rol/ownership/planes, transacciones (`$transaction`), llamadas a Stripe, manejo de estados de suscripción. |
| **DTO** | Define y valida la forma del cuerpo de cada request usando `class-validator` (`@IsEmail`, `@Min`, `@IsBigInt`, etc.) y `class-transformer` (`@Type`). |
| **Guard** | Decide si una petición puede continuar. `JwtAuthGuard` valida el token JWT; `SuscripcionGuard` valida acceso por suscripción. |
| **Pipe** | Transforma/valida parámetros. `AppValidationPipe` (DTOs) y `ParseBigIntPipe` (IDs de ruta a `bigint`). |
| **Decorator** | Marca metadatos para guards (`@Public`, `@SinSuscripcion`, `@RateLimitEspecifico`) o inyecta datos (`@CurrentUser`). |
| **Filter** | Captura excepciones y las normaliza a una respuesta estándar (HTTP, validación y errores de Prisma). |
| **Middleware** | `RequestIdMiddleware` asigna/propaga el `requestId` por petición. |
| **PrismaService** | Único punto de acceso a la base de datos (cliente Prisma). |

### Formato de respuesta de error (GlobalExceptionFilter)

Todas las excepciones se devuelven con la forma:

```json
{
  "requestId": "uuid-del-request",
  "code": "codigo-de-error",
  "message": "mensaje legible",
  "statusCode": 400,
  "timestamp": "2026-01-01T00:00:00.000Z",
  "path": "/ruta",
  "details": null
}
```

---

## 3. Módulos y relaciones

| Módulo | Importa | Exporta | Responsabilidad |
|--------|---------|---------|-----------------|
| `AppModule` | ConfigModule (global), ThrottlerModule, AuthModule, RutinasModule, EjerciciosModule, AlumnoEntrenadorModule, SuscripcionesModule, PagosModule, StripeModule | — | Módulo raíz; registra guards globales y middleware. |
| `PrismaModule` | — (`@Global`) | `PrismaService` | Acceso a BD. |
| `AuthModule` | JwtModule, PrismaModule, SuscripcionesModule | `JwtModule` | Login y registro. |
| `SuscripcionesModule` | PrismaModule, StripeModule | `SuscripcionesService` | Ciclo de vida de suscripciones. |
| `PagosModule` | SuscripcionesModule, PrismaModule, StripeModule | `PagosService` | Checkout y webhooks Stripe. |
| `RutinasModule` | PrismaModule | — | CRUD de rutinas y asignación. |
| `EjerciciosModule` | PrismaModule | — | Ejercicios personalizados. |
| `AlumnoEntrenadorModule` | — (usa Prisma global) | `AlumnoEntrenadorService` | Vinculación/desvinculación. |
| `StripeModule` | — (usa ConfigService) | `StripeService` | Cliente Stripe (wrapper). |

### Dependencias clave

- `AuthService` → `SuscripcionesService.activarSuscripcionInicial` (crear suscripción inicial al registrarse).
- `PagosService` → `SuscripcionesService.activarSuscripcionPorPagoConfirmado` y `marcarSuscripcionComoMorosaPorPagoFallido`.
- `SuscripcionesService` → `StripeService.cancelarAlFinalDelPeriodo` / `reanudarSuscripcion`.
- `PagosService` → `StripeService` (checkout) y `verificarWebhook`.
- `SuscripcionGuard` → `SuscripcionesService.validarAccesoSuscripcion`.

---

## 4. Flujo de autenticación JWT

> Componentes: `AuthService.login`, `JwtModule` (config en `auth.module.ts`), `JwtAuthGuard`, decorador `@Public`, tipo `JwtPayload`.

1. El cliente envía `POST /auth/login` con `{ correo, password }`.
2. `AuthService.login`:
   - Busca el usuario por `correo` único. Si no existe → `401 Usuario no encontrado`.
   - Compara la contraseña con `bcrypt.compare`. Si no coincide → `401 Contraseña incorrecta`.
   - Construye el payload `JwtPayload`:

     ```ts
     { sub: user.id, id: user.id, correo: user.correo, role: user.role }
     ```

     y lo firma con `JwtService.sign(...)`.
   - Devuelve `{ message: 'Inicio de sesión exitoso', token }`.
3. Configuración del token (`auth.module.ts`): `secret = JWT_SECRET`, `expiresIn = JWT_EXPIRATION_TIME` (segundos; default 86400 = 24 h).
4. **Guard en cada request**: `JwtAuthGuard` (global):
   - Si la ruta/controlador tiene `@Public()` → `true` (no se valida token).
   - Lee `Authorization: Bearer <token>`. Si falta / formato inválido → `401`.
   - `jwtService.verifyAsync<JwtPayload>(token)`.
   - Valida que el payload tenga `id`, `correo` y `sub` y que `id` y `sub` sean **UUIDs válidos**. Si algo falla → `401`.
   - Asigna `request.user = payload` y retorna `true`.

> `sub` e `id` contienen el mismo UUID del usuario. `SuscripcionGuard` usa `request.user.sub`.

---

## 5. Flujo de autorización y roles

Existen **dos niveles** de autorización:

### a) Acceso por suscripción (`SuscripcionGuard` — global)

1. Si la ruta/controlador tiene `@SinSuscripcion()` → `true` (se salta la validación).
2. Lee `request.user.sub`. Si no existe (el JWT no se puso) → `401 Debes iniciar sesión.`
3. Llama a `SuscripcionesService.validarAccesoSuscripcion(usuarioId)`:
   - Usuario no existe → `404 Usuario no encontrado`.
   - No hay suscripción vigente → `404 Suscripción vigente no encontrada`.
   - Suscripción vencida (sin `vitalicia` y `periodoActualFin` pasado) → `403 La suscripción ha expirado`.
   - Estado `morosa` → `403 Tu pago está pendiente o falló...`.
   - Estado distinto de `prueba` / `activa` → `403 Tu suscripción no permite acceder a esta función`.
   - Si pasa, guarda la suscripción en `request.suscripcion` y retorna `true`.

### b) Autorización por rol (manual en los services)

No hay decorador `@Roles`. Ejemplos de validación manual:

- `RutinasService.create` — solo `UserRole.entrenador`.
- `EjerciciosService.*` — validan ownership (`createdByUsuario === usuarioId`) y, según flujo, límites del plan del alumno.
- `AlumnoEntrenadorService.consumirToken` — verifica que el usuario autenticado sea `UserRole.entrenador` y que el destino sea `alumno` sin entrenador asignado.

### Estados de suscripción (`EstadoSuscripcionEnum`)

`prueba`, `activa`, `morosa`, `cancelada`, `expirada`.

---

## 6. Diagrama de alto nivel (Mermaid)

```mermaid
flowchart TD
    C[Cliente HTTP] -->|Authorization: Bearer JWT| MID[RequestIdMiddleware]
    MID --> G1[JwtAuthGuard]
    G1 -->|@Public?| OK1[Permitir]
    G1 -->|token válido| G2[SuscripcionGuard]
    G1 -->|token inválido| 401[401]
    G2 -->|@SinSuscripcion?| OK2[Permitir]
    G2 -->|suscr. válida| CTRL[Controller]
    G2 -->|sin suscripción| 403[403]

    CTRL --> DTO[DTO validation via AppValidationPipe]
    DTO --> SVC[Service / lógica de negocio]
    SVC --> PRISMA[PrismaService]
    PRISMA --> DB[(PostgreSQL multi-schema)]

    SVC -->|checkout, webhooks| STRIPE[StripeService]
    STRIPE --> API[Stripe API]

    subgraph Globales
        G1
        G2
        MID
        TH[ThrottlerGuard]
        FILT[GlobalExceptionFilter]
    end
```

---

## 7. Tareas programadas

`suscripciones.service.ts` implementa `OnApplicationBootstrap` y lanza un temporizador (intervalo de 24 h) que ejecuta `expirarSuscripcionesVencidas()`: marca como `expirada` las suscripciones no vitalicias cuyo `periodoActualFin` ya pasó. No usa `@nestjs/schedule`.

---

## 8. Estructura multi-schema de la base de datos

| Schema | Contenido principal |
|--------|---------------------|
| `app_user` | `Usuario`, `EjercicioPersonalizado`, `Rutina`, `RutinaEjercicio`, `UsuarioRutina`, `SesionEntrenamiento`, `Pago`, `Suscripcion`, `PlanAlumno`, `PlanEntrenador`, `EventoStripe`, historial, mediciones, PRs |
| `alumno` | `Alumno` (perfil del alumno, PK = `idUsuario`), `TokenVinculacionAlumno` |
| `entrenador` | `Entrenador` (perfil del entrenador, PK = `idUsuario`), extensiones del perfil |
| `core` | Catálogos: sexo, estado, músculo, equipo, ejercicio estándar, día de la semana, categoría, etc. |
| `ubi` | Jerarquía geográfica: país, entidad federativa, municipio, localidad |

> Modelo polimórfico: `Usuario` tiene relación 1:1 con `Alumno` o `Entrenador` (misma UUID como PK).

---

## Referencias de código relevantes

- `src/app.module.ts` — registro de guards globales y throttler.
- `src/common/guards/jwt-auth.guards.ts`, `src/common/guards/suscripcion.guards.ts`.
- `src/common/filter/app-global.filter.ts`.
- `src/common/constants/db-sexo.ts`, `src/common/types/jwt-payload.ts`.
- `src/config/env.schema.ts`.
- `src/modules/*` — módulos de negocio.