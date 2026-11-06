# ARQUITECTURA — Backend NestJS (plantilla reutilizable)

Este documento describe la arquitectura del backend NestJS de RITMO como **plantilla reutilizable** para otros proyectos. Se enfoca en los patrones transversales que se replican: autenticación JWT, rate limiting, validación de DTOs con mensajes estructurados y normalización global de errores (incluidos los de Prisma).

> Nota: los ejemplos con `src/modules/*` provienen del proyecto RITMO, pero la estructura `common` + `config` + `prisma` + `modules/<dominio>` es portable a cualquier backend NestJS.

---

## 1. Stack y reglas de oro

| Pieza | Tecnología |
|-------|-----------|
| Framework | NestJS (Node + TypeScript) |
| Base de datos | PostgreSQL con Prisma (`@prisma/adapter-pg`) |
| Validación de DTOs | `class-validator` + `class-transformer` |
| Autenticación | `@nestjs/jwt` (JWT HS256) |
| Rate limiting | `@nestjs/throttler` |
| Variables de entorno | `zod` (la app no arranca si falta una variable) |

**Reglas de oro:**

1. **Controllers delgados** — solo definen rutas, decoradores y delegación al service.
2. **Services** — contienen toda la lógica de negocio y lanzan excepciones HTTP de Nest.
3. **DTOs** — validan la entrada con `class-validator`; nunca validan en el controller.
4. **Un solo filter global** — `GlobalExceptionFilter` normaliza TODA respuesta de error a un mismo formato.
5. **`@Public()` es exclusivo para JWT** — solo desactiva el `JwtAuthGuard`. No desactiva rate limit ni ningún otro guard.

---

## 2. Estructura de carpetas

```
src/
├── main.ts                       # Bootstrap: pipes, filtros globales, Swagger
├── app.module.ts                 # Módulo raíz: guards globales, throttler, interceptors
├── common/                       # Código transversal reutilizable
│   ├── constants/                # Enums/catálogos en TS
│   ├── decorators/               # @Public, @CurrentUser, @RateLimitEspecifico, pipes como decorators
│   ├── exception/                # AppBadRequestException, validationMessage()
│   ├── filter/                   # GlobalExceptionFilter (normaliza todo) + spec
│   ├── guards/                   # JwtAuthGuard, guards de dominio
│   ├── interceptors/             # BigIntSerializeInterceptor
│   ├── middleware/               # RequestIdMiddleware
│   ├── pipes/                    # AppValidationPipe, ParseBigIntPipe
│   ├── types/                    # JwtPayload y tipos compartidos
│   └── utils/                    # Utilidades puras
├── config/
│   └── env.schema.ts             # Validación zod de variables de entorno
├── modules/                      # Un folder por dominio de negocio
│   └── <modulo>/
│       ├── dto/                  # DTOs con class-validator
│       ├── errors/               # Códigos/mensajes de validación (as const)
│       ├── validators/           # Constraints custom (opcional)
│       ├── <modulo>.controller.ts
│       ├── <modulo>.service.ts
│       └── <modulo>.module.ts
├── prisma/
│   ├── prisma.module.ts          # @Global
│   └── prisma.service.ts         # Cliente Prisma (única puerta a la BD)
└── types/                        # Augmentation de Express (req.user, etc.)
```

### Estructura de un módulo de negocio

Cada módulo vive en `src/modules/<modulo>/` siguiendo siempre esta convención:

| Carpeta/archivo | Responsabilidad |
|-----------------|-----------------|
| `dto/` | Forma validada del cuerpo de cada request |
| `errors/` | Objeto `as const` con los mensajes estructurados usados por los DTOs |
| `validators/` | Constraints custom de `class-validator` (solo si se requieren) |
| `<modulo>.controller.ts` | Rutas, decoradores, parámetros. Thin. |
| `<modulo>.service.ts` | Lógica de negocio + excepciones HTTP |
| `<modulo>.module.ts` | Wiring + exportaciones |

---

## 3. Autenticación JWT y `@Public()`

### Configuración

`JwtModule.register({ secret, signOptions: { expiresIn } })` — ver `src/modules/auth/auth.module.ts`. Variables: `JWT_SECRET` (mínimo 32 caracteres) y `JWT_EXPIRATION_TIME` (segundos, default 86400).

Payload (`src/common/types/jwt-payload.ts`):

```ts
type JwtPayload = {
  sub: string;     // UUID del usuario
  id: string;      // mismo UUID
  correo: string;
  role?: string;
};
```

### Guard global

`JwtAuthGuard` se registra como `APP_GUARD` en `app.module.ts`, por lo que **todos** los endpoints exigen token por defecto. Lógica:

1. `reflector.getAllAndOverride(IS_PUBLIC_KEY, [handler, class])` — si la ruta tiene `@Public()`, retorna `true`.
2. Lee `Authorization: Bearer <token>`. Si falta o el formato es inválido → `401`.
3. `jwtService.verifyAsync<JwtPayload>(token)`.
4. Valida que `id`, `sub` y `correo` existan y que `id`/`sub` sean UUIDs válidos.
5. Asigna `request.user = payload`.

### `@Public()` — solo para JWT

```ts
// src/common/decorators/public.decorator.ts
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

- `@Public()` únicamente setea metadata para que **`JwtAuthGuard` salte la validación del token**.
- No desactiva nada más: otros guards (de dominio), el `ThrottlerGuard` y el filtro global siguen aplicando.
- Se usa en endpoints públicos como `login`/`registro`, y en el health check.

### `@CurrentUser`

```ts
export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
    return data && request.user ? request.user[data] : request.user;
  },
);
```

Uso en services/controllers: `@CurrentUser() user: JwtPayload` o `@CurrentUser('sub') id: string`.

---

## 4. Rate limiting

### Global

`ThrottlerModule.forRootAsync` registra un `ThrottlerGuard` global (`APP_GUARD`). Límite por IP en una ventana:

```ts
// src/app.module.ts
ThrottlerModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (configService) => [{
    name: 'default',
    ttl: configService.get('RATE_LIMIT_TTL'),
    limit: configService.get('RATE_LIMIT_GLOBAL_LIMIT'),
  }],
}),
```

Variables (validadas con zod): `RATE_LIMIT_TTL` (ms de la ventana) y `RATE_LIMIT_GLOBAL_LIMIT` (máx. requests por IP por ventana).

### Por ruta (específico)

```ts
// src/common/decorators/rate-limit.decorator.ts
export const RateLimitEspecifico = (limit: number, ttl = parseInt(process.env.RATE_LIMIT_TTL!)) =>
  Throttle({ default: { limit, ttl } });
```

### Patrón recomendado para endpoints públicos

En `auth.controller.ts` los endpoints públicos usan `@Public()` **y** rate limit específico:

```ts
@Public()
@Controller('auth')
export class AuthController {
  @Post('login')
  @RateLimitEspecifico(2)   // 2 intentos por ventana RATE_LIMIT_TTL
  login() {}

  @Post('registrar/entrenador')
  @RateLimitEspecifico(2)
  registrar() {}
}
```

> El límite específico sobrescribe el global para esa ruta. Sirve para login/registro/robots, protección de endpoints sensibles.

---

## 5. Sistema de mensajes de DTO + "catcher" de validación

Esta es la pieza clave que transforma errores de `class-validator` en respuestas legibles para el frontend. No hay un archivo "catcher": el rol lo cumplen `AppValidationPipe` + `validationMessage` + `AppBadRequestException`.

### a) `validationMessage(code, message)`

Envía el mensaje como JSON string dentro del `message:` del decorador, transportando un **código estructurado**:

```ts
// src/common/exception/validation-message.ts
export function validationMessage(code: string, message: string): string {
  return JSON.stringify({ code, message });
}
```

### b) Archivos `errors/*-validation-errors.ts`

Cada módulo define sus códigos/mensajes como `as const`:

```ts
// src/modules/auth/errors/auth-validation-errors.ts
export const AUTH_VALIDATION_ERRORS = {
  REQUIRED_EMAIL: validationMessage('REQUIRED_EMAIL', 'El correo es obligatorio.'),
  INVALID_EMAIL: validationMessage('INVALID_EMAIL', 'El correo no tiene un formato válido.'),
  PASSWORD_TOO_SHORT: validationMessage('PASSWORD_TOO_SHORT',
    'La contraseña debe tener al menos 8 caracteres.'),
} as const;
```

### c) DTOs con mensajes estructurados

```ts
export class LoginDto {
  @IsEmail({}, { message: AUTH_VALIDATION_ERRORS.INVALID_EMAIL })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_EMAIL })
  correo: string;

  @IsString({ message: AUTH_VALIDATION_ERRORS.INVALID_PASSWORD_TYPE })
  @MinLength(8, { message: AUTH_VALIDATION_ERRORS.PASSWORD_TOO_SHORT })
  password: string;
}
```

### d) El catcher: `AppValidationPipe`

`src/common/pipes/app-validation.pipe.ts` extiende `ValidationPipe` con `transform`, `whitelist`, `forbidNonWhitelisted` y `stopAtFirstError`. Su `exceptionFactory`:

1. Toma el primer error y extrae `field`.
2. Lee el primer constraint (`message`).
3. Intenta `JSON.parse` para recuperar `{ code, message }`.
4. Lanza `AppBadRequestException(code, message, { field })`.

```ts
exceptionFactory: (errors: ValidationError[]) => {
  const firstError = errors[0];
  const field = firstError?.property ?? 'unknownField';
  let code = 'INVALID_INPUT';
  let message = `El campo "${field}" es inválido.`;

  const rawMessage = Object.values(firstError?.constraints ?? {})[0];
  if (typeof rawMessage === 'string') {
    try {
      const parsed = JSON.parse(rawMessage);
      if (parsed?.code) code = parsed.code;
      if (parsed?.message) message = parsed.message;
    } catch {
      message = rawMessage;
    }
  }
  return new AppBadRequestException(code, message, { field });
};
```

### e) `AppBadRequestException`

Extiende `BadRequestException` y transporta `{ code, message, statusCode: 400, details }` — lo consume el `GlobalExceptionFilter` para construir el envelope.

### Fórmula para replicar

```
DTO (message: X_VALIDATION_ERRORS.Y)
  → class-validator
  → AppValidationPipe.exceptionFactory (JSON.parse)
  → AppBadRequestException({ code, message, field })
  → GlobalExceptionFilter
  → { code: 'Y', message: '...', statusCode: 400, path, ... }
```

---

## 6. Manejo de errores global

### Error envelope estándar

Todas las excepciones devuelven el mismo formato (los nombres pueden ajustarse por proyecto):

```json
{
  "requestId": "uuid-del-request",
  "code": "PRISMA_UNIQUE_CONSTRAINT",
  "message": "Ya existe un registro con el valor único en: correo.",
  "statusCode": 409,
  "timestamp": "2026-01-01T00:00:00.000Z",
  "path": "/api/v1/usuarios",
  "details": null
}
```

### `RequestIdMiddleware`

Asigna/genera `requestId` y lo propaga como header `X-Request-Id`. Se aplica a `'*'` en el módulo raíz y se incrusta en el envelope de error.

### `GlobalExceptionFilter` (`@Catch()`)

Captura **todo** y resuelve, en orden:

1. Errores Prisma (ver tabla abajo).
2. `HttpException` — extrae `code`/`message`/`details` de la respuesta (soporta string, objeto y arrays de mensajes; los arrays se unen con `, `).
3. Cualquier otra cosa → `500 INTERNAL_SERVER_ERROR` con mensaje genérico.

### Mapeo de errores Prisma (tabla P-codes)

| Prisma code | HTTP | code | Mensaje (resumen) |
|-------------|------|------|-------------------|
| P2000 | 400 | `PRISMA_VALUE_TOO_LONG` | Valor demasiado largo para su columna |
| P2001 | 404 | `PRISMA_RECORD_NOT_FOUND` | El registro solicitado no existe |
| P2002 | 409 | `PRISMA_UNIQUE_CONSTRAINT` | Ya existe un registro con el valor único en: `<campos>` |
| P2003 | 400 | `PRISMA_FOREIGN_KEY_CONSTRAINT` | Falló una restricción de llave foránea |
| P2004 | 400 | `PRISMA_CONSTRAINT_FAILED` | Restricción de BD falló |
| P2011 | 400 | `PRISMA_NULL_CONSTRAINT` | Un campo obligatorio no puede ser null |
| P2012 | 400 | `PRISMA_MISSING_REQUIRED_VALUE` | Falta un valor obligatorio |
| P2014 | 400 | `PRISMA_REQUIRED_RELATION_VIOLATION` | Violación de relación obligatoria |
| P2015 | 404 | `PRISMA_RELATED_RECORD_NOT_FOUND` | No se encontró un registro relacionado |
| P2016 | 400 | `PRISMA_QUERY_INTERPRETATION_ERROR` | Error al interpretar la consulta |
| P2018 | 404 | `PRISMA_CONNECTED_RECORD_NOT_FOUND` | No se encontró un registro conectado requerido |
| P2020 | 400 | `PRISMA_VALUE_OUT_OF_RANGE` | Valor fuera del rango permitido |
| P2021 | 500 | `PRISMA_TABLE_NOT_FOUND` | La tabla no existe |
| P2022 | 500 | `PRISMA_COLUMN_NOT_FOUND` | La columna no existe |
| P2024 | 408 | `PRISMA_CONNECTION_TIMEOUT` | Timeout al obtener conexión |
| P2025 | 404 | `PRISMA_OPERATION_RECORD_NOT_FOUND` | El registro requerido para la operación no existe |
| P2033 | 400 | `PRISMA_NUMBER_OUT_OF_RANGE` | Número fuera de rango de int64 |
| default | 500 | `PRISMA_UNHANDLED_ERROR` | Error de Prisma no manejado |

Además, tipos de error Prisma (clases, no códigos):

| Tipo | HTTP | code |
|------|------|------|
| `PrismaClientValidationError` | 400 | `PRISMA_VALIDATION_ERROR` |
| `PrismaClientInitializationError` | 503 | `PRISMA_INITIALIZATION_ERROR` |
| `PrismaClientRustPanicError` | 500 | `PRISMA_ENGINE_PANIC` |
| `PrismaClientUnknownRequestError` | 500 | `PRISMA_UNKNOWN_ERROR` |

> Regla: en los services **no** se atrapan errores de Prisma salvo que se necesite lógica especial (p. ej. dedupe intencional de un `P2002`). El filter es quien los mapea a HTTP.

---

## 7. Flujo de una petición

```mermaid
flowchart TD
    C[Cliente HTTP] -->|Authorization: Bearer JWT| MID[RequestIdMiddleware]
    MID --> TH[ThrottlerGuard]
    TH --> G1[JwtAuthGuard]
    G1 -->|@Public? salta token| CTRL[Controller]
    G1 -->|token inválido / sin token| 401[401]
    G1 -->|token válido| CTRL
    CTRL --> DTO[AppValidationPipe valida DTO]
    DTO -->|error de validación| FB[GlobalExceptionFilter]
    DTO --> SVC[Service / lógica de negocio]
    SVC -->|excepción HTTP / de dominio| FB
    SVC --> PRISMA[PrismaService]
    PRISMA -->|error Prisma| FB
    PRISMA --> DB[(PostgreSQL)]

    FB --> RESP[Error envelope estándar]
    SVC -->|éxito| OK[Respuesta OK]
    OK --> BIG[BigIntSerializeInterceptor: bigint → string]
```

Orden de aplicación de los globales (Nest): **middleware → guards → pipes → controller → service → interceptor de salida**, y el **filter** captura cualquier excepción en cualquier punto.

---

## 8. Checklist para crear un módulo nuevo

- [ ] Crear `src/modules/<modulo>/` con `dto/`, `errors/` y `validators/` (si aplica).
- [ ] Definir todos los mensajes en `errors/<modulo>-validation-errors.ts` con `validationMessage(code, mensaje)`.
- [ ] Referenciarlos como `message:` en los decoradores de los DTOs.
- [ ] Si la ruta es pública de JWT: `@Public()` + `@RateLimitEspecifico(n)`.
- [ ] Services: lanzar excepciones Nest (`BadRequestException`, `NotFoundException`, etc.); el filter las normaliza.
- [ ] No atrapar errores Prisma en el service salvo que se requiera lógica especial.
- [ ] Si se usan IDs `bigint`: `ParseBigIntPipe` en params, `@ToBigInt()` + `IsBigInt` en body (el interceptor serializa la salida).
- [ ] Registrar el módulo en `app.module.ts`.

---

## 9. Referencia de archivos clave (mapa para copiar a otro proyecto)

| Rol | Archivo |
|-----|---------|
| Envelope + mapeo Prisma | `src/common/filter/app-global.filter.ts` |
| Request ID | `src/common/middleware/request-id.middleware.ts` |
| JWT global + `IS_PUBLIC_KEY` | `src/common/guards/jwt-auth.guards.ts` |
| `@Public` | `src/common/decorators/public.decorator.ts` |
| `@CurrentUser` | `src/common/decorators/current-user.decorator.ts` |
| Rate limit específico | `src/common/decorators/rate-limit.decorator.ts` |
| Catcher de validación | `src/common/pipes/app-validation.pipe.ts` (+ `exception/app-bad-request.ts`, `exception/validation-message.ts`) |
| Pipes de params | `src/common/pipes/parse-big-int.pipe.ts` |
| DTO + errors (ejemplo) | `src/modules/auth/dto/login.dto.ts`, `src/modules/auth/errors/auth-validation-errors.ts` |
| Throttler global | `src/app.module.ts` |
| Env vars | `src/config/env.schema.ts` |
| Prisma | `src/prisma/prisma.service.ts`, `src/prisma/prisma.module.ts` |