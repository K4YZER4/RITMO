# RITMO Backend — Resumen Integral de la API

Tabla resumen de los **48 endpoints** activos de la plataforma RITMO, clasificados por módulo funcional. Para especificaciones técnicas completas de DTOs, validaciones, flujos transaccionales y códigos de error, consulta [`api-detallada.md`](./api-detallada.md).

## Convenciones globales de seguridad y acceso

- **Guards globales**: Por defecto, todos los endpoints requieren un access token JWT válido (`Authorization: Bearer <token>`) y una suscripción activa/vigente.
- **`Public`**: Rutas sin requisito de autenticación JWT.
- **`SinSuscripcion`**: Rutas exentas de validación de estado de suscripción (ej. auth, webhooks, perfil, checkout y consulta de planes).
- **`@CurrentUser('id')`**: El identificador de usuario se extrae directamente del payload verificado del token JWT (`request.user.id`), nunca del body.
- **Formato estándar de error**: `{ requestId, code, message, statusCode, timestamp, path, details }` generado por `GlobalExceptionFilter`.
- **Swagger UI**: Interfaz interactiva disponible en `/api/docs` (JSON en `/api/docs-json`).

---

## 1. Sistema & Salud (`Health`)

| Método | Ruta | Descripción | Seguridad | Parámetros / Entrada |
|---|---|---|---|---|
| `GET` | `/` | Información básica de la API y enlace a Swagger | `Public` + `SinSuscripcion` | — |
| `GET` | `/health` | Chequeo de salud del servicio y conectividad con PostgreSQL | `Public` + `SinSuscripcion` | — |

---

## 2. Autenticación (`Auth`)

| Método | Ruta | Descripción | Seguridad | Parámetros / Entrada |
|---|---|---|---|---|
| `POST` | `/auth/login` | Inicia sesión y emite access token JWT | `Public` + `SinSuscripcion` (Rate-limit: 2/min) | `LoginDto` |
| `POST` | `/auth/registrar/entrenador` | Registra un nuevo entrenador y crea su suscripción inicial | `Public` + `SinSuscripcion` (Rate-limit: 3/min) | `RegisterEntrenadorDto` |
| `POST` | `/auth/registrar/alumno` | Registra un nuevo alumno y crea su suscripción inicial | `Public` + `SinSuscripcion` (Rate-limit: 3/min) | `RegisterAlumnoDto` |
| `POST` | `/auth/logout` | Revoca el token JWT actual (denylist por `jti`) | `SinSuscripcion` + `Bearer` (Rate-limit: 5/min) | Header `Authorization` |

---

## 3. Suscripciones (`Suscripciones`)

| Método | Ruta | Descripción | Seguridad | Parámetros / Entrada |
|---|---|---|---|---|
| `GET` | `/suscripciones/actual` | Obtiene la suscripción activa con plan, vigencia y último pago | `SinSuscripcion` + `@CurrentUser('id')` | — |
| `GET` | `/suscripciones/estado-pago` | Consulta el estado del último pago (`pagado`, `pendiente`, `fallido`) | `SinSuscripcion` + `@CurrentUser('id')` | — |
| `PATCH` | `/suscripciones/plan` | Cambia de plan en modo `instantaneo` o `finalPeriodo` | `SinSuscripcion` + `@CurrentUser('id')` | `CambiarPlanDto` |
| `POST` | `/suscripciones/cancelar` | Programa la cancelación en Stripe al final del ciclo de facturación | `SinSuscripcion` + `@CurrentUser('id')` | — |
| `POST` | `/suscripciones/cancelar-inmediata` | Cancela en Stripe y en BD al instante, retornando al Plan Básico | `SinSuscripcion` + `@CurrentUser('id')` | — |
| `POST` | `/suscripciones/reanudar` | Revierte una cancelación programada antes de finalizar el periodo | `SinSuscripcion` + `@CurrentUser('id')` | — |

---

## 4. Pagos & Stripe (`Pagos`)

| Método | Ruta | Descripción | Seguridad | Parámetros / Entrada |
|---|---|---|---|---|
| `POST` | `/pagos/checkout` | Crea o reutiliza una sesión de Stripe Checkout para suscripción | `SinSuscripcion` + `@CurrentUser('id')` | `CrearCheckoutDto` |
| `POST` | `/pagos/confirmar-sesion` | Confirma manualmente una sesión de checkout completada | `SinSuscripcion` + `@CurrentUser('id')` | `ConfirmarSesionDto` |
| `POST` | `/pagos/webhook/stripe` | Receptor de eventos webhook de Stripe (`checkout`, `invoice`, etc.) | `Public` + `SinSuscripcion` (Firma HMAC) | Raw Body + Header `stripe-signature` |

---

## 5. Vinculación Alumno ↔ Entrenador (`Alumno-Entrenador`)

| Método | Ruta | Descripción | Seguridad | Parámetros / Entrada |
|---|---|---|---|---|
| `POST` | `/alumno-entrenador/token` | Genera token temporal (30 min) para vinculación de alumno | JWT + Suscripción (Alumno) | `@CurrentUser('id')` |
| `POST` | `/alumno-entrenador/token/consumir` | Entrenador canjea el token para vincular formalmente al alumno | JWT + Suscripción (Entrenador) | `ConsumirTokenDto`, `@CurrentUser('id')` |
| `PUT` | `/alumno-entrenador/cancelar/mi-entrenador` | Alumno desvincula a su entrenador actual (requiere contraseña) | JWT + Suscripción (Alumno) | `CancelarMiEntrenadorDto` |
| `PUT` | `/alumno-entrenador/cancelar/alumno/:id` | Entrenador desvincula a un alumno (requiere contraseña) | JWT + Suscripción (Entrenador) | `:id` UUID, `CancelarAlumnoDto` |

---

## 6. Panel y Supervisión del Entrenador (`Entrenador`)

| Método | Ruta | Descripción | Seguridad | Parámetros / Entrada |
|---|---|---|---|---|
| `GET` | `/entrenador/resumen` | Estadísticas del coach: total alumnos, rutinas activas y cuotas | JWT + Suscripción (Entrenador) | `@CurrentUser('id')` |
| `GET` | `/entrenador/alumnos` | Lista todos los alumnos vinculados con métricas agregadas | JWT + Suscripción (Entrenador) | `@CurrentUser('id')` |
| `GET` | `/entrenador/alumnos/:id` | Detalle del alumno: ficha médica, lesiones, restricciones y notas | JWT + Suscripción (Entrenador) | `:id` UUID, `@CurrentUser('id')` |
| `GET` | `/entrenador/alumnos/:id/progreso` | Historial de sesiones, sobrecarga progresiva y PRs del alumno | JWT + Suscripción (Entrenador) | `:id` UUID, `@CurrentUser('id')` |

---

## 7. Gestión de Rutinas (`Rutinas`)

| Método | Ruta | Descripción | Seguridad | Parámetros / Entrada |
|---|---|---|---|---|
| `GET` | `/rutinas` | Lista las rutinas creadas por el usuario autenticado | JWT + Suscripción | `@CurrentUser('id')` |
| `GET` | `/rutinas/archivadas` | Lista las rutinas archivadas del usuario autenticado | JWT + Suscripción | `@CurrentUser('id')` |
| `GET` | `/rutinas/:id` | Detalle completo de una rutina con sus ejercicios | JWT + Suscripción | `:id` BigInt |
| `POST` | `/rutinas` | Crea una nueva rutina (valida cuota según plan) | JWT + Suscripción (Entrenador) | `CreateRutinaDto` |
| `PATCH` | `/rutinas/:id/ejercicios` | Reemplaza atómicamente la lista de ejercicios de una rutina | JWT + Suscripción | `:id` BigInt, `RutinaEjercicioDto` |
| `PATCH` | `/rutinas/:id/archivar` | Archiva una rutina sin borrar su historial de sesiones | JWT + Suscripción | `:id` BigInt |
| `PATCH` | `/rutinas/:id/restaurar` | Restaura una rutina archivada al estado activo | JWT + Suscripción | `:id` BigInt |
| `DELETE` | `/rutinas/:id` | Eliminación definitiva (solo si no tiene historial activo) | JWT + Suscripción | `:id` BigInt |
| `POST` | `/rutinas/:id/asignaciones` | Asigna una rutina a un alumno en un día de la semana | JWT + Suscripción (Entrenador) | `:id` BigInt, `AsignarRutinaDto` |
| `PATCH` | `/rutinas/asignaciones/reordenar` | Reordena o intercambia días de asignaciones de un alumno | JWT + Suscripción (Entrenador) | `ReordenarAsignacionesDto` |
| `PATCH` | `/rutinas/asignaciones/:id` | Modifica el día o fechas de una asignación específica | JWT + Suscripción (Entrenador) | `:id` BigInt, `ActualizarAsignacionDto` |
| `DELETE` | `/rutinas/asignaciones/:id` | Desvincula la asignación sin perder datos históricos | JWT + Suscripción (Entrenador) | `:id` BigInt |

---

## 8. Biblioteca de Ejercicios (`Ejercicios`)

| Método | Ruta | Descripción | Seguridad | Parámetros / Entrada |
|---|---|---|---|---|
| `GET` | `/ejercicios` (o `/ejerciciosPersonalizados`) | Lista ejercicios estándar y personalizados disponibles | JWT + Suscripción | Query `buscar` (opcional) |
| `GET` | `/ejercicios/archivados` | Lista ejercicios personalizados archivados por el creador | JWT + Suscripción | `@CurrentUser('id')` |
| `POST` | `/ejercicios` (o `/ejerciciosPersonalizados`) | Crea un ejercicio personalizado (valida límites de plan) | JWT + Suscripción | `CreateEjercicioPersonalizadoDto` |
| `PATCH` | `/ejercicios/:id` | Actualiza un ejercicio personalizado (solo creador) | JWT + Suscripción | `:id` BigInt, `UpdateEjercicioPersonalizadoDto` |
| `DELETE` | `/ejercicios/:id` | Archiva/desactiva un ejercicio personalizado (soft-delete) | JWT + Suscripción | `:id` BigInt |

---

## 9. Planificación y Agenda (`Entrenamientos`)

| Método | Ruta | Descripción | Seguridad | Parámetros / Entrada |
|---|---|---|---|---|
| `GET` | `/entrenamientos/hoy` | Consulta la rutina asignada para hoy según zona horaria | JWT + Suscripción (Alumno) | Query `zona_horaria` |
| `GET` | `/entrenamientos/semana` | Obtiene el split semanal activo (Lunes a Domingo) | JWT + Suscripción (Alumno) | Query `zona_horaria` |
| `POST` | `/entrenamientos/reprogramar` | Reprograma temporalmente una rutina dentro de la semana actual | JWT + Suscripción (Alumno) | `ReprogramarRutinaDto`, Query `zona_horaria` |
| `POST` | `/entrenamientos/reordenar-semana` | Reordena días del split semanal del alumno vía drag-and-drop | JWT + Suscripción (Alumno) | `ReordenarSemanaDto`, Query `zona_horaria` |

---

## 10. Ejecución en Vivo de Sesiones (`Sesiones`)

| Método | Ruta | Descripción | Seguridad | Parámetros / Entrada |
|---|---|---|---|---|
| `POST` | `/sesiones` | Inicia una sesión activa a partir de una rutina asignada | JWT + Suscripción (Alumno) | `IniciarSesionDto` |
| `GET` | `/sesiones` | Historial cronológico de sesiones completadas por el alumno | JWT + Suscripción (Alumno) | `@CurrentUser('id')` |
| `GET` | `/sesiones/:id` | Detalle completo de una sesión (sets, pesos, notas, PRs) | JWT + Suscripción | `:id` BigInt |
| `PATCH` | `/sesiones/:sesionId/sets/:setId` | Registra en tiempo real peso, repeticiones y RPE de un set | JWT + Suscripción (Alumno) | `:sesionId`, `:setId`, `ActualizarSetDto` |
| `PATCH` | `/sesiones/:sesionId/ejercicios/:ejercicioId/nota` | Guarda nota técnica o molestia en un ejercicio activo | JWT + Suscripción (Alumno) | `:sesionId`, `:ejercicioId`, `ActualizarNotaEjercicioDto` |
| `DELETE` | `/sesiones/:id` | Descarta y cancela una sesión iniciada por error | JWT + Suscripción (Alumno) | `:id` BigInt |
| `POST` | `/sesiones/:id/finalizar` | Finaliza la sesión, calcula volumen y registra nuevos PRs | JWT + Suscripción (Alumno) | `:id` BigInt, `FinalizarSesionDto` |

---

## 11. Métricas Corporales & Progreso (`Mediciones` & `Progreso`)

| Método | Ruta | Descripción | Seguridad | Parámetros / Entrada |
|---|---|---|---|---|
| `GET` | `/mediciones` | Historial de mediciones corporales (peso, grasa, etc.) | JWT + Suscripción (Alumno) | `@CurrentUser('id')` |
| `POST` | `/mediciones` | Registra o actualiza la medición corporal del día | JWT + Suscripción (Alumno) | `RegistrarMedicionDto` |
| `GET` | `/progreso/resumen` | Resumen de récords personales (1RM), volumen total y rachas | JWT + Suscripción (Alumno) | `@CurrentUser('id')` |

---

## 12. Perfil y Catálogos (`Perfil` & `Catálogos`)

| Método | Ruta | Descripción | Seguridad | Parámetros / Entrada |
|---|---|---|---|---|
| `GET` | `/perfil` | Consulta los datos personales, rol y configuración del usuario | `SinSuscripcion` + `@CurrentUser('id')` | — |
| `PATCH` | `/perfil` | Actualiza nombre, teléfono, objetivo o datos de contacto | `SinSuscripcion` + `@CurrentUser('id')` | `ActualizarPerfilDto` |
| `GET` | `/catalogos` | Listado público de grupos musculares, categorías y equipos | `Public` + `SinSuscripcion` | — |
