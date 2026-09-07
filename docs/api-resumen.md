# RITMO Backend — Resumen de la API

Tabla resumen de **todos** los endpoints. Para detalles por endpoint (guards, DTOs, validaciones y errores) consulta [`api-detallada.md`](./api-detallada.md).

## Convenciones globales

- **Guards globales**: salvo que se indique lo contrario, todos los endpoints requieren un JWT válido (`Authorization: Bearer <token>`) **y** una suscripción activa/vigente.
- **`⚠️ SinSuscripcion`** = la ruta está marcada `@SinSuscripcion()` (no exige suscripción, pero **sí** JWT, salvo que además sea `@Public`).
- **`⚠️ Public`** = ruta `@Public()` (no exige JWT). En la práctica estas rutas también llevan `@SinSuscripcion`.
- **`@CurrentUser('id')`** = el `id` del usuario se toma del JWT (`request.user.id`), no del body.
- El **rol** se valida dentro de los services, no por decorador de ruta.
- **Errores**: respuesta estándar `{ requestId, code, message, statusCode, timestamp, path, details }` del `GlobalExceptionFilter`.

| Método | Ruta | Descripción | Autenticación | Entrada (body/params) |
|--------|------|-------------|---------------|-----------------------|
| GET | `/` | Health check / ping, devuelve "Hello World!" | `Public` + `SinSuscripcion` | — |
| POST | `/auth/login` | Inicia sesión y devuelve un JWT | `Public` + `SinSuscripcion`, rate-limit 2/min | `LoginDto` |
| POST | `/auth/registrar/entrenador` | Registra un entrenador y activa su suscripción inicial | `Public` + `SinSuscripcion`, rate-limit 2/min | `RegisterEntrenadorDto` |
| POST | `/auth/registrar/alumno` | Registra un alumno y activa su suscripción inicial | `Public` + `SinSuscripcion`, rate-limit 2/min | `RegisterAlumnoDto` |
| GET | `/suscripciones/actual` | Devuelve la suscripción actual (incluye plan y último pago) | `SinSuscripcion` + `@CurrentUser('id')` | — |
| GET | `/suscripciones/estado-pago` | Devuelve el estado del último pago (pagado/fallido/pendiente, etc.) | `SinSuscripcion` + `@CurrentUser('id')` | — |
| PATCH | `/suscripciones/plan` | Cambia de plan (alumno o entrenador) | `SinSuscripcion` + `@CurrentUser('id')` | `CambiarPlanDto` |
| POST | `/suscripciones/cancelar` | Cancela la suscripción Stripe al final del periodo | `SinSuscripcion` + `@CurrentUser('id')` | — |
| POST | `/suscripciones/reanudar` | Reanuda una suscripción programada para cancelarse | `SinSuscripcion` + `@CurrentUser('id')` | — |
| POST | `/pagos/webhook/stripe` | Procesa webhooks de Stripe (Checkout/facturas/suscripción eliminada) | `SinSuscripcion` (usa firmas Stripe, no JWT) | Raw body + header `stripe-signature` |
| POST | `/pagos/checkout` | Crea una sesión de Stripe Checkout para un pago pendiente | `SinSuscripcion` + `@CurrentUser('id')` | `CrearCheckoutDto` |
| POST | `/rutinas` | Crea una rutina (solo entrenador, respeta límite del plan) | JWT + Suscripción | `CreateRutinaDto` |
| PATCH | `/rutinas/:id/ejercicios` | Reemplaza los ejercicios de una rutina | JWT + Suscripción | `:id` bigint, `RutinaEjercicioDto` |
| POST | `/rutinas/:id/asignaciones` | Asigna una rutina a un alumno (resuelve solapamientos) | JWT + Suscripción | `:id` bigint, `AsignarRutinaDto` |
| POST | `/ejerciciosPersonalizados` | Crea un ejercicio personalizado (alumno, respeta límite del plan) | JWT + Suscripción | `CreateEjercicioPersonalizadoDto` |
| PATCH | `/ejerciciosPersonalizados/:id` | Actualiza un ejercicio personalizado (solo creador) | JWT + Suscripción | `:id` bigint, `UpdateEjercicioPersonalizadoDto` |
| DELETE | `/ejerciciosPersonalizados/:id` | Desactiva (soft-delete) un ejercicio personalizado (solo creador) | JWT + Suscripción | `:id` bigint |
| PUT | `/alumno-entrenador/cancelar/mi-entrenador` | El alumno desvincula a su entrenador actual | JWT + Suscripción | `CancelarMiEntrenadorDto`, `@CurrentUser('id')` |
| PUT | `/alumno-entrenador/cancelar/alumno/:id` | El entrenador desvincula a un alumno | JWT + Suscripción | `CancelarAlumnoDto`, `:id` UUID, `@CurrentUser('id')` |
| POST | `/alumno-entrenador/token/consumir` | El entrenador consume el token del alumno y los vincula | JWT + Suscripción | `ConsumirTokenDto`, `@CurrentUser('id')` |
| POST | `/alumno-entrenador/token` | El alumno genera un token de vinculación (caduca en 30 min) | JWT + Suscripción | `@CurrentUser('id')` |

---

Para consultar el detalle técnico de cada endpoint (DTOs exactos, reglas de validación, transacciones y códigos de error) ver **[`api-detallada.md`](./api-detallada.md)**.