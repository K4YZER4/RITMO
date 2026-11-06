# RITMO Backend — Plan de mejoras

Documento vivencial que recoge el análisis del proyecto, los problemas detectados y el plan de acción para llevarlo a producción. Se recomienda marcar cada punto como `[x]` conforme se vaya resolviendo.

---

## Estado actual

Análisis realizado del backend RITMO (NestJS + Prisma + Stripe). El proyecto tiene una arquitectura sólida (guards globales, interceptor de BigInt, filtro global de errores Prisma, transacciones con `Serializable`, deduplicación de webhooks, documentación extensa). Sin embargo, hay **bugs, vacíos de seguridad y funcionalidad incompleta** que deben resolverse antes de producción.

---

## Tabla de prioridades

| # | Área | Tipo | Estado |
|---|------|------|--------|
| 1 | Validación `sexo` y fechas de nacimiento | Bug de datos | ✅ Hecho |
| 2 | Ownership en `PATCH /rutinas/:id/ejercicios` | Seguridad | ✅ Hecho |
| 3 | Cambio de plan con Stripe (2 modos a elección del usuario) | Funcionalidad incompleta | ✅ Hecho |
| 4 | Planes de pago único / vitalicios (Checkout `mode=payment`) | Funcionalidad incompleta | ✅ No aplica |
| 5 | `.env.example` incompleto | Ops / despliegue | ✅ Hecho |
| 6 | Tests e2e reales | Calidad | ⏳ Pendiente (para el usuario) |
| 7 | Tests unitarios de handlers / services de pagos | Calidad | ✅ Hecho |
| 8 | Swagger: DTOs sin `@ApiProperty` | Documentación | ✅ Hecho |
| 9 | Mejoras menores (teléfono, logout/refresh, rate-limit) | Calidad / Seguridad | ✅ Hecho |

---

## 1. ✅ Validación de `sexo` y fechas de nacimiento (HECHO)

### Problema
En `src/modules/auth/dto/register-alumno.dto.ts` y `register-entrenador.dto.ts`, el campo `sexo` se declara como `'MASCULINO' | 'FEMENINO'` a nivel de TypeScript pero **solo se valida con `@IsString`**. Cualquier string (`'asdf'`) pasa la validación y en `auth.service.ts` cae al `else`, guardándose como FEMENINO silenciosamente.

Además, `fecha_nacimiento` y `fecha_entrenador` solo validaban `@IsDateString` sin comprobar que fueran **fechas pasadas**.

### Solución
- Agregar `@IsIn(['MASCULINO', 'FEMENINO'])` en ambos DTOs con su mensaje de error en `auth-validation-errors.ts`.
- Validar que las fechas sean pasadas (nacimiento y fecha de entrenador).

---

## 2. ✅ Ownership en `PATCH /rutinas/:id/ejercicios` (HECHO)

### Problema
`src/modules/rutinas/rutinas.service.ts:updateRutinaEjercicios` **reemplazaba los ejercicios de cualquier rutina por su `id` sin verificar que el usuario autenticado fuera el dueño** (`createdByUsuario`). Cualquier usuario con suscripción activa podía borrar/recrear los ejercicios de la rutina de otro. Inconsistente con `asignarRutinaAAlumno`, que sí verifica ownership.

### Solución
- Agregar verificación de `createdByUsuario` vs. usuario autenticado antes de permitir `updateRutinaEjercicios`.

---

## 3. ✅ Cambio de plan con Stripe (2 modos a elección del usuario) (HECHO)

### Contexto
`src/modules/suscripciones/handlers/cambiar-plan-suscripcion.handler.ts` **bloquea** el cambio cuando existe `proveedorSubscriptionId` (línea 48-52):
> "No puedes cambiar de plan mientras exista una suscripción Stripe. Primero implementa la actualización de Stripe con prorrateo o cancelación al final del periodo."

La lógica local posterior (`cambiarPlanAlumno` / `cambiarPlanEntrenador`) ya está completa: cancela la suscripción local, actualiza `idPlan` y crea la nueva (gratuita directa o pendiente de pago). El problema es que **no hace nada sincronizado con Stripe**.

### Diseño acordado
El usuario **elige** cómo quiere que se haga el cambio. **No hacemos validaciones** de "más avanzado / menos avanzado". Dos modos:

- **`instantaneo`**: el cambio aplica de inmediato (ideal para upgrades). Se cancela la suscripción Stripe actual y se pide el pago del nuevo plan.
- **`finalPeriodo`**: el cambio aplica al terminar el periodo ya pagado (ideal para downgrades). Se programa la cancelación de la suscripción Stripe actual al final del periodo y el cambio real se aplica cuando Stripe la elimina.

### Matiz clave de la base de datos
`Suscripcion` tiene una **unique parcial** (solo puede existir 1 suscripción "vigente" por usuario):
```
@@unique([alumnoId, ...], where: "estado IN ('prueba','activa','morosa')")
```
- **Modo instantáneo**: encaja sin cambios de schema. La nueva (morosa) coexiste porque la vieja ya queda cancelada.
- **Modo finalPeriodo**: requiere **nuevo campo en `Suscripcion`** para guardar el "plan destino pendiente" mientras la suscripción Stripe vieja sigue activa.

### Cambios de schema (Modo finalPeriodo)
Los campos **van en el modelo `Suscripcion`** (`app_user.suscripcion`), NO en `PlanAlumno` ni en `Alumno`:

- `planAlumnoPendienteId Int?` → se usa **solo** cuando la suscripción pertenece a un **alumno** (`alumnoId` no nulo).
- `planEntrenadorPendienteId Int?` → se usa **solo** cuando la suscripción pertenece a un **entrenador** (`entrenadorId` no nulo).

Nunca se llenan ambos al mismo tiempo: es un campo **condicional según el titular de la suscripción**.

En `prisma/schema.prisma` → modelo `Suscripcion`:
```prisma
model Suscripcion {
  // ...columnas existentes...
  planAlumnoPendienteId     Int?                  @map("plan_alumno_pendiente_id")
  planEntrenadorPendienteId Int?                  @map("plan_entrenador_pendiente_id")

  // Relaciones opcionales (solo se llena una según el titular)
  planAlumnoPendiente       PlanAlumno?           @relation("suscripcion_plan_alumno_pendiente", fields: [planAlumnoPendienteId], references: [id], onDelete: NoAction, onUpdate: NoAction, map: "suscripcion_plan_alumno_pendiente_fkey")
  planEntrenadorPendiente   PlanEntrenador?       @relation("suscripcion_plan_entrenador_pendiente", fields: [planEntrenadorPendienteId], references: [id], onDelete: NoAction, onUpdate: NoAction, map: "suscripcion_plan_entrenador_pendiente_fkey")
}
```
Y agregar la relación inversa en los catálogos:
```prisma
model PlanAlumno {
  // ...
  suscripcionesPendientes  Suscripcion[]         @relation("suscripcion_plan_alumno_pendiente")
}
model PlanEntrenador {
  // ...
  suscripcionesPendientes  Suscripcion[]         @relation("suscripcion_plan_entrenador_pendiente")
}
```
- Generar migración + `pnpm prisma generate`.

> **Nota sobre la unique parcial**: la restricción `@@unique([alumnoId, ...], where: "estado IN ('prueba','activa','morosa')")` se mantiene igual; los campos pendientes no la afectan.
>
> Al aplicar el cambio en el webhook, se mueve el valor: pendiente → `idPlan` (del perfil) y `planAlumnoId`/`planEntrenadorId` (de la nueva suscripción), y se limpia el campo pendiente a `null`.

### Cambios de código

**1. `src/modules/stripe/stripe.service.ts`**
- Agregar `async cancelarInmediatamente(subscriptionId)` → `stripe.subscriptions.cancel(subscriptionId)` (Modo instantáneo).
- Reutilizar `cancelarAlFinalDelPeriodo` ya existente (Modo finalPeriodo).

**2. `src/modules/suscripciones/dto/cambiar-plan.dto.ts`**
- Agregar campo `modoCambio!: 'instantaneo' | 'finalPeriodo'` con `@IsIn([...])`.
- Mensaje de error en `suscripciones-validation-errors.ts`.
- `@ApiProperty` para Swagger.

**3. `src/modules/suscripciones/handlers/cambiar-plan-suscripcion.handler.ts`**
- Inyectar `StripeService`.
- Quitar el `throw` de bloqueo.
- Desacoplar la lógica en dos flujos:
  - **instantaneo**: `stripe.cancelarInmediatamente(subId)` fuera de la tx → transacción actual tal cual.
  - **finalPeriodo**: guardar `planAlumnoPendienteId` / `planEntrenadorPendienteId` + `stripe.cancelarAlFinalDelPeriodo(subId)`. **No** tocar `idPlan` ni crear la nueva suscripción todavía.

**4. `src/modules/pagos/pagos.service.ts` → `procesarSuscripcionEliminada`**
- Al recibir `customer.subscription.deleted`, si la suscripción local tiene `planAlumnoPendienteId` / `planEntrenadorPendienteId`, ejecutar el cambio real (cancelar local, actualizar `idPlan`, crear nueva suscripción gratuita o pendiente de pago) y limpiar el campo pendiente.

### Preguntas por resolver (RESUELTAS)
- El campo `modoCambio` es **obligatorio** (sin default): el frontend elige `instantaneo` o `finalPeriodo` según el contexto (upgrade vs downgrade).
- Se implementó **un solo endpoint** `PATCH /suscripciones/plan` con `{idPlanNuevo, modoCambio}`.
- Cuando el usuario elige `instantaneo` **sin** suscripción Stripe activa (plan gratuito/prueba), el cambio aplica directamente (same behavior as before). ✅

---

## 4. ✅ No aplica — Planes de pago único / vitalicios (Checkout `mode=payment`)

### Contexto
El punto original asumía que los planes vitalicios o de pago único requerían Stripe Checkout con `mode=payment`, y que `src/modules/suscripciones/services/crear-suscripcion-pendiente-pago.service.ts` lanzaba un error al detectar las flags `esVitalicio`, `cobraRecurrentemente` y `numeroCobros`.

### Resolución (aclaración de modelo de negocio)
Ese `throw` **ya fue retirado** del código. Además, el modelo de negocio real **no usa pagos únicos**:

- **Vitalicio = gratuito para siempre.** `vitalicia: true` solo se asigna cuando el plan es `esGratuito` (`activar-suscripcion-inicial.handler.ts` y `cambiar-plan-suscripcion.handler.ts`). Nunca se genera checkout ni pago.
- **Todo lo de pago es suscripción recurrente.** `stripe.service.ts` siempre crea el Checkout con `mode: 'subscription'`; al contratar se cobra el primer mes y los siguientes se renuevan vía `invoice.paid` (y `invoice.payment_failed` marca morosidad).
- La base de datos **ya valida** que un plan vitalicio tenga a fuerzas `es_gratuito = true`:
  - Migración inicial `20260717033317_init`: constraints `plan_alumno_configuracion_check` y `plan_entrenador_configuracion_check` (`es_vitalicio = true AND es_gratuito = true`).
  - Migración `20260910024541_planes_prueba_vitalicio`: `chk_plan_alumno_vitalicio_solo_gratuito` y `chk_plan_entrenador_vitalicio_solo_gratuito` (`CHECK (es_vitalicio = false OR es_gratuito = true)`).

**Conclusión:** implementar `mode='payment'` no es necesario. Este punto queda cerrado como no aplicable.

---

## 5. ✅ `.env.example` incompleto (HECHO)

### Problema
`src/config/env.schema.ts` valida como **obligatorias** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` y `FRONTEND_URL`, pero **no aparecen en `.env.example`** (termina en `RATE_LIMIT_GLOBAL_LIMIT`). Sin ellas la app no arranca y quien clone el repo no sabe qué variables necesita.

### Solución
- `.env.example` ya incluye todas las variables que valida `env.schema.ts` (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `FRONTEND_URL`, etc.).
- Se retiró la nota "Pendiente de confirmar" del `README.md`; la sección "Variables de entorno" ahora indica que todas están en `.env.example`.

---

## 6. ⏳ Tests e2e reales

### Problema
`test/app.e2e-spec.ts` solo valida `GET /` → `Hello World!`. No hay tests de flujos reales.

### Plan
- Escribir tests e2e que cubran flujos completos:
  - Registro de alumno y entrenador.
  - Login y obtención de JWT.
  - Creación de rutina, ejercicios, asignaciones.
  - Vinculación alumno ↔ entrenador (token).
  - Suscripción y checkout.
- Requiere base de datos de test (ej. Neón branch de test o Postgres local) y configuración de entorno de test.

---

## 7. ✅ Tests unitarios de handlers / services de pagos (HECHO)

### Problema
Estos archivos de producción **no tienen spec**:
- `src/modules/pagos/handlers/procesar-chekout-completado.handler.ts`
- `src/modules/pagos/handlers/procesar-factura.handler.ts`
- `src/modules/suscripciones/handlers/activar-suscripcion-inicial.handler.ts`
- `src/modules/suscripciones/handlers/actualizar-suscripcion-por-pago.handler.ts`
- `src/modules/suscripciones/services/crear-suscripcion-pendiente-pago.service.ts`

Son los más críticos del negocio de pagos.

### Solución
Se escribió un `*.spec.ts` para cada uno siguiendo el patrón de mocks de `PrismaService` + `$transaction` ya usado en otros tests del repo:
- `procesar-chekout-completado.handler.spec.ts`: asociación de sesión a suscripción (alumno y entrenador), missing metadata/customer/subscription, pago no encontrado, mismatch de sesión vs pago local.
- `procesar-factura.handler.spec.ts`: activación por `invoice.paid` con periodo de Stripe, reuso del pago con `proveedorFacturaId`, fusión del pago pendiente inicial, creación de pago nuevo, morosidad por factura fallida, montos inválidos.
- `activar-suscripcion-inicial.handler.spec.ts`: gratuito vitalicio (alumno y entrenador), entrenador de prueba, planes de pago delegados al servicio pendiente, suscripción existente (`creada: false`), roles no válidos.
- `actualizar-suscripcion-por-pago.handler.spec.ts`: pago pagado + activación, no-op con pago ya pagado, recuperación de pago fallido, morosidad, estados inválidos, pago inexistente.
- `crear-suscripcion-pendiente-pago.service.spec.ts`: suscripción morosa sin prueba, conservación/creación de `proveedorCustomerId`, suscripción de prueba con `trialEnd`, marca de prueba utilizada, titulares inválidos.

---

## 8. ✅ Swagger / DTOs incompletos (HECHO)

### Problema
Estos DTOs **no tienen `@ApiProperty`**, por lo que el esquema del request body en Swagger queda vacío:
- `login.dto.ts`
- `create-ejercicio.dto.ts` / `update-ejercicio.dto.ts`
- `asignar-rutina.dto.ts` / `create-rutina.dto.ts` / `update-rutina.dto.ts`
- `cambiar-plan.dto.ts`
- `cancelar-alumno.dto.ts` / `cancelar-mi-entrenador.dto.ts` / `consumir-token.dto.ts`

### Solución
- Se agregó `@ApiProperty` (type, description, example) en `login.dto.ts`, `create-ejercicio.dto.ts`, `create-rutina.dto.ts`, `asignar-rutina.dto.ts`, `cancelar-alumno.dto.ts`, `cancelar-mi-entrenador.dto.ts` y `consumir-token.dto.ts`. Los DTOs `update-*` (basados en `PartialType`) y `cambiar-plan.dto.ts` ya heredan/declaran sus propiedades.

---

## 9. ✅ Mejoras menores (HECHO)

- **Teléfono del alumno**: `numero_celular` en `register-alumno.dto.ts` pasó de `@IsNumber` a `@IsString` con `@MaxLength(20)` y `@Matches(/^\+?\d[\d\s().-]*$/)` (acepta prefijo `+52`, espacios, paréntesis y guiones). Mensaje de error dedicado en `auth-validation-errors.ts`. **Es un cambio de contrato de API**: el frontend debe enviar el teléfono como string.
- **Logout / revocación de token**: se implementó revocación **por `jti`** (deny-list). Los JWT ahora llevan `jti` (UUID); `POST /auth/logout` (rate-limit 5/min) verifica y registra el token en la nueva tabla `app_user.token_revocado`; el guard global `JwtAuthGuard` rechaza tokens con `jti` revocado. Un proceso en background (`onApplicationBootstrap`) limpia los registros vencidos cada 24h. Requiere aplicar la migración `token_revocado` contra la base de datos.
- **Rate-limit por usuario**: **se deja el rate-limit global por IP** (ThrottlerGuard global con 30 req/ventana), que ya cubre todos los endpoints, más los límites específicos por IP en auth. Se decidió NO implementar rate-limit por `userId`, ya que la configuración global es suficiente para el objetivo de mitigar abuso y evita el problema de usuarios detrás de una misma IP pública (NAT).

---

## Notas de arquitectura (lo que ya está bien)

- Guards globales con `@Public()` / `@SinSuscripcion()`.
- Interceptor de serialización de `BigInt`.
- Filtro global de errores Prisma con códigos (`P2002`, `P2003`, etc.).
- Middleware `RequestId` con propagación de `x-request-id`.
- Transacciones con `isolationLevel: Serializable`.
- Tokens de vinculación con hash + caducidad de 30 min.
- Deduplicación de webhooks por `stripeEventId` en tabla `EventoStripe`.
- Documentación en `docs/` (architecture, api-detallada, api-resumen).
