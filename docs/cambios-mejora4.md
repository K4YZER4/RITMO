# Resumen de cambios — Mejora 4 (planes de pago, prueba y registro con plan)

Sesión de implementación de la Mejora 4 de `docs/mejoras.md`: habilitar planes de pago recurrentes con **periodo de prueba** (trial en Stripe), planes **vitalicios** (gratuitos) para alumno y entrenador, y que el **registro permita elegir el plan**.

## 1. Base de datos / Prisma

### `prisma/schema.prisma`
Se agregaron 8 campos:

| Modelo | Campos |
|---|---|
| `PlanAlumno` | `periodoPrueba Int? @default(0)`, `unidadPeriodoPrueba UnidadPeriodoEnum?` |
| `PlanEntrenador` | `periodoPrueba Int? @default(0)`, `unidadPeriodoPrueba UnidadPeriodoEnum?` |
| `Alumno` | `pruebaUtilizada Boolean? @default(false)`, `proveedorCustomerId String?` |
| `Entrenador` | `pruebaUtilizada Boolean? @default(false)`, `proveedorCustomerId String?` |

### Migraciones
- **`20260910024541_planes_prueba_vitalicio`** (nueva): agrega los campos, enums/index renombrados por drift de Prisma y los constraints CHECK en SQL raw:
  - `chk_plan_alumno_vitalicio_solo_gratuito`: `es_vitalicio = false OR es_gratuito = true`
  - `chk_plan_entrenador_vitalicio_solo_gratuito`: `es_vitalicio = false OR es_gratuito = true`
  - `chk_plan_alumno_prueba_requiere_pago` / `chk_plan_entrenador_prueba_requiere_pago`: la prueba solo existe en planes de pago
  - `chk_plan_alumno_vitalicio_sin_prueba` / `chk_plan_entrenador_vitalicio_sin_prueba`: un vitalicio no tiene prueba
  - UPDATE de datos: plan `Intermedio` del alumno (id 2) con `periodo_prueba = 1 semana`
- **`20260910024718_planes_prueba_vitalicio`** (nueva, vacía): se dejó solo por consistencia del histórico de `_prisma_migrations`.
- **`20260717195119_init_seed`** (modificada): nuevos planes del entrenador.

### Seed (planes de entrenador)
Se eliminó el plan `Prueba` (7 días). Quedan 3 planes, regenerados con `prisma migrate reset --force`:

| id | Plan entrenador | Precio | Límites | Es gratuito/vitalicio |
|---|---|---|---|---|
| 1 | **Básico** | $0 MXN | 3 alumnos / 3 rutinas | `true` / `true` (default del registro) |
| 2 | **Intermedio** | $200 MXN/mes | 20 / 30 | no / no |
| 3 | **Avanzado** | $300 MXN/mes | 30 / 45 | no / no |

Plan de alumno (sin cambios): Básico gratis vitalicio (1), Intermedio $100/mes con **1 semana de prueba** (2), Avanzado $150/mes (3).

## 2. Lógica de fechas

- **`src/common/utils/fecha.util.ts`** (nuevo): `sumarUnidadCalendar(inicio, cantidad, unidad)` — suma calendar-aware (mes = mismo día del mes con clamp al último día válido, ej. día 31 en meses de 28/30/31). Se usa para el `trial_end` y el fin de periodo.

## 3. Stripe

### `src/modules/stripe/stripe.service.ts`
- `crearOActualizarCustomer({ usuarioId, correo, nombre, customerId? })`: crea o actualiza el cliente de Stripe y lo enlaza al usuario por metadata.
- `crearCheckoutSuscripcion`: soporta `trialEnd` (Unix seg) → `subscription_data.trial_end`. Permite cobrar **el mismo día del mes** al terminar la prueba (no usa `trial_period_days`).

### `src/modules/pagos/pagos.service.ts`
- `crearCheckout` lee `estado`/`periodoActualFin` de la suscripción y pasa `trialEnd` a la sesión de Stripe cuando está en estado `prueba`.

### `src/modules/pagos/handlers/procesar-chekout-completado.handler.ts`
- Además de enlazar `proveedorCustomerId`/`proveedorSubscriptionId` en la suscripción, ahora también guarda `proveedorCustomerId` en `Alumno`/`Entrenador`.

## 4. Suscripciones

### `src/modules/suscripciones/services/crear-suscripcion-pendiente-pago.service.ts`
Lógica centralizada del pago pendiente:
- Se **eliminó** el `throw` que bloqueaba planes vitalicios/pago único.
- Decide **trial vs cobro directo** según el plan (`periodoPrueba > 0`, `esGratuito`, `esVitalicio`) y el flag `pruebaUtilizada` de la cuenta.
  - **Con trial**: suscripción en `prueba`, `periodoActualFin = trialEnd`, próxima cobro = trialEnd, pago `pendiente` con `venceEn = trialEnd`.
  - **Sin trial**: suscripción `morosa` + pago `pendiente` (comportamiento previo).
- Asegura el **cliente Stripe** (`crearOActualizarCustomer`) cuando hace falta y lo guarda en la cuenta y en la suscripción.
- Marca `pruebaUtilizada = true` al usar la prueba (1 sola vez por cuenta).
- Devuelve `{ suscripcion, pagoId, trialEnd?, customerId? }`.

### `src/modules/suscripciones/handlers/activar-suscripcion-inicial.handler.ts`
- Propaga `pagoId` en el resultado (para que el registro devuelva los datos de pago).
- Rama nueva `esGratuito && esVitalicio` para el entrenador → suscripción **`activa` vitalicia** sin Stripe (igual que el alumno). Antes lanzaba "el plan de prueba debe tener duración" con un plan vitalicio.
- La prueba gratuita del entrenador (con duración) marca `pruebaUtilizada`.

### `src/modules/suscripciones/handlers/cambiar-plan-suscripcion.handler.ts`
- Misma rama `esGratuito && esVitalicio` → suscripción `activa` vitalicia al cambiar de plan.

## 5. Registro con plan elegido

### `src/modules/auth/dto/register-alumno.dto.ts` / `register-entrenador.dto.ts`
- Campo **`id_plan?: number`** (opcional, `@IsInt`, `@Min(1)`). Si no se envía, usa el default (1).

### `src/modules/auth/errors/auth-validation-errors.ts`
- Nuevos errores: `INVALID_PLAN_ID`, `PLAN_ID_TOO_SMALL`.

### `src/modules/auth/auth.service.ts`
- **Valida** antes de la transacción que el plan exista, esté activo y sea del rol correcto (`planAlumno` vs `planEntrenador`).
- Pasa `idPlan` al crear `Alumno`/`Entrenador`.
- La respuesta del registro ahora incluye datos de pago cuando el plan es de pago:
  - plan gratis → `{ message }`
  - plan de pago → `{ message, requierePago: true, pagoId, suscripcionId }`

## 6. Flujos resultantes

```
Registrar sin id_plan (o id_plan=1)
  └─ Básico gratis (alumno: vitalicia; entrenador: vitalicia limitada 3/3)
       └─ Suscripción ACTIVA → acceso inmediato, sin Stripe

Registrar con id_plan=2/3 (de pago)
  └─ Suscripción MOROSA + pago PENDIENTE
       ├─ register responde { requierePago:true, pagoId, suscripcionId }
       └─ frontend → POST /pagos/checkout {pagoId, suscripcionId}
            ├─ plan sin prueba: Stripe cobra al momento
            └─ checkout.session.completed enlaza IDs
                 └─ invoice.paid → pago PAGADO, suscripción ACTIVA

Registrar alumno con id_plan=2 (Intermedio, prueba 1 semana)
  └─ Suscripción PRUEBA + cliente Stripe creado
       └─ checkout con trial_end=a+7 días: pide tarjeta, NO cobra
            └─ a la semana Stripe cobra solo → invoice.paid → ACTIVA
                 └─ luego cobro mensual recurrente

Registro inválido
  └─ id_plan inexistente/inactivo → 404/400, no se crea nada
```

## 7. Verificación

- `prisma migrate reset --force` aplicado y `prisma generate` OK.
- `pnpm build` compila sin errores.
- `pnpm test`: **113/114 pasan**. El único fallo (`rutinas.service.spec.ts`) es **preexistente** y no está relacionado (verificado con `git stash`). Se agregaron 4 tests nuevos en `auth.service.spec.ts`.

## 8. Notas / decisiones

- **No se modificó `auth.module.ts`**: el cliente de Stripe se crea de forma perezosa dentro del servicio de pago pendiente (los defaults del registro son gratis). Si algún día un plan de pago con prueba fuese el default de registro, habría que crear el cliente de Stripe antes de la transacción.
- `GET /suscripciones/estado-pago` falla con 403 para suscripciones `morosa` (por `periodoActualFin` null). Se evitó el problema devolviendo `pagoId`/`suscripcionId` directo en el registro.
- La prueba es **única por cuenta** (`pruebaUtilizada`): si ya se usó, al contratar un plan con prueba se cobra directo (`morosa`).