# RITMO Backend — Especificación detallada de la API

Especificación por endpoint: método y ruta, guards/decoradores, body (DTO) con sus reglas de validación, parámetros, comportamiento y errores esperados.

> **Convención global** — salvo que se indique, todos los endpoints exigen un header `Authorization: Bearer <token>` (JWT) y una suscripción vigente (guards globales `JwtAuthGuard` + `SuscripcionGuard`). Las respuestas de error usan el formato del `GlobalExceptionFilter`: `{ requestId, code, message, statusCode, timestamp, path, details }`.

---

## Índice

- [GET / — Health check](#get---health-check)
- [Auth](#auth)
  - [POST /auth/login](#post-authlogin)
  - [POST /auth/registrar/entrenador](#post-authregistrarentrenador)
  - [POST /auth/registrar/alumno](#post-authregistraralumno)
- [Suscripciones](#suscripciones)
  - [GET /suscripciones/actual](#get-suscripcionesactual)
  - [GET /suscripciones/estado-pago](#get-suscripcionesestado-pago)
  - [PATCH /suscripciones/plan](#patch-suscripcionesplan)
  - [POST /suscripciones/cancelar](#post-suscripcionescancelar)
  - [POST /suscripciones/reanudar](#post-suscripcionesreanudar)
- [Pagos](#pagos)
  - [POST /pagos/checkout](#post-pagoscheckout)
  - [POST /pagos/webhook/stripe](#post-pagoswebhookstripe)
- [Rutinas](#rutinas)
  - [POST /rutinas](#post-rutinas)
  - [PATCH /rutinas/:id/ejercicios](#patch-rutinasejercicios)
  - [POST /rutinas/:id/asignaciones](#post-rutinasidasignaciones)
- [Ejercicios personalizados](#ejercicios-personalizados)
  - [POST /ejerciciosPersonalizados](#post-ejerciciospersonalizados)
  - [PATCH /ejerciciosPersonalizados/:id](#patch-ejerciciospersonalizadosid)
  - [DELETE /ejerciciosPersonalizados/:id](#delete-ejerciciospersonalizadosid)
- [Alumno–Entrenador](#alumnoentrenador)
  - [PUT /alumno-entrenador/cancelar/mi-entrenador](#put-alumno-entrenadorcancelarmi-entrenador)
  - [PUT /alumno-entrenador/cancelar/alumno/:id](#put-alumno-entrenadorcancelaralumnoid)
  - [POST /alumno-entrenador/token/consumir](#post-alumno-entrenadortokenconsumir)
  - [POST /alumno-entrenador/token](#post-alumno-entrenadortoken)

---

## GET / — Health check

- **Método / Ruta**: `GET /`
- **Guards**: `@Public()` + `@SinSuscripcion()` → no exige JWT ni suscripción.
- **Descripción**: punto de verificación del servicio. Devuelve un saludo.
- **Body**: ninguno.
- **Respuesta 200**: `"Hello World!"` (texto plano).

---

## Auth

> El `AuthController` está marcado a nivel de clase con `@Public()` y `@SinSuscripcion()`. Además, `@RateLimitEspecifico(2)` aplica un límite de ~2 peticiones por ventana a cada una de las rutas de auth (comentario del código indica "5 solicitudes por minuto"; el límite efectivo depende de la config: `⚠️ Pendiente de confirmar` el valor exacto del TTL efectivo).

### POST /auth/login

- **Body**: `LoginDto`

| Campo | Tipo | Reglas de validación |
|-------|------|----------------------|
| `correo` | string | `@IsEmail`, `@IsNotEmpty`, `@MinLength(5)`, `@MaxLength(60)` |
| `password` | string | `@IsString`, `@IsNotEmpty`, `@MinLength(8)`, `@MaxLength(60)` |

- **Descripción**: verifica credenciales y emite un JWT.
- **Flujo**:
  1. Busca el usuario por `correo` (único). Si no existe → error.
  2. `bcrypt.compare(password, user.hashedPassword)`. Si no coincide → error.
  3. Firma `JwtPayload = { sub: user.id, id: user.id, correo, role }` con `JWT_SECRET` y vencimiento `JWT_EXPIRATION_TIME`.
- **Respuesta 200**:

  ```json
  { "message": "Inicio de sesión exitoso", "token": "<JWT>" }
  ```

- **Errores**:
  - `401 UnauthorizedException` — `Usuario no encontrado` (credenciales no existen).
  - `401 UnauthorizedException` — `Contraseña incorrecta`.
  - `429` — rate limit superado.

### POST /auth/registrar/entrenador

- **Body**: `RegisterEntrenadorDto`

| Campo | Tipo | Reglas |
|-------|------|--------|
| `nombre` | string | `@IsString`, `@IsNotEmpty`, `@MinLength(2)`, `@MaxLength(20)` |
| `sexo` | `'MASCULINO' \| 'FEMENINO'` | `@IsString`, `@MinLength(2)`, `@MaxLength(20)` |
| `apellido_paterno` | string | idénticas a `nombre` |
| `apellido_materno` | string | idénticas a `nombre` |
| `correo` | string | `@IsEmail`, `@IsNotEmpty`, `@MinLength(5)`, `@MaxLength(60)` |
| `password` | string | `@IsString`, `@IsNotEmpty`, `@MinLength(8)`, `@MaxLength(60)` |
| `fecha_nacimiento` | string (ISO date) | `@IsString`, `@IsNotEmpty`, `@IsDateString` |
| `nombre_publico` | string | `@IsString`, `@IsNotEmpty`, `@MinLength(2)`, `@MaxLength(50)` |
| `fecha_entrenador` | string (ISO date) | `@IsString`, `@IsNotEmpty`, `@IsDateString` |

- **Descripción**: registra un entrenador y le activa la suscripción inicial.
- **Flujo** (en una transacción):
  1. Hash de la contraseña (`bcrypt`, 10 salt rounds).
  2. Mapea `sexo` → `DB_SEXO_IDS` (`MASCULINO`→1, `FEMENINO`→2).
  3. Crea `Usuario` con `role: entrenador`.
  4. Crea el perfil `Entrenador` (slug derivado de `nombre_publico`).
  5. `suscripcionesService.activarSuscripcionInicial(user.id)`.
- **Respuesta 200**:

  ```json
  { "message": "Usuario registrado exitosamente" }
  ```

- **Errores**:
  - `400` — errores de validación de body.
  - `429` — rate limit.
  - Posibles errores de negocio de `activarSuscripcionInicial` (p. ej. `404 Plan del entrenador no encontrado o inactivo`, `400 El plan de prueba del entrenador debe tener duración`).

### POST /auth/registrar/alumno

- **Body**: `RegisterAlumnoDto`

| Campo | Tipo | Reglas |
|-------|------|--------|
| `nombre` | string | `@IsString`, `@IsNotEmpty`, `@MinLength(2)`, `@MaxLength(20)` |
| `sexo` | `'MASCULINO' \| 'FEMENINO'` | `@IsString`, `@MinLength(2)`, `@MaxLength(20)` |
| `apellido_paterno` | string | idénticas a `nombre` |
| `apellido_materno` | string | idénticas a `nombre` |
| `correo` | string | `@IsEmail`, `@IsNotEmpty`, `@MinLength(5)`, `@MaxLength(60)` |
| `password` | string | `@IsString`, `@IsNotEmpty`, `@MinLength(8)`, `@MaxLength(60)` |
| `fecha_nacimiento` | string (ISO date) | `@IsString`, `@IsNotEmpty`, `@IsDateString` |
| `numero_celular` | number | `@IsNumber`, `@IsNotEmpty` |
| `fecha_inicio_entrenamiento` | string (ISO date) | `@IsString`, `@IsNotEmpty`, `@IsDateString` |
| `id_objetivo` | number | `@IsNumber`, `@IsNotEmpty` |
| `id_nivel_actividad` | number | `@IsNumber`, `@IsNotEmpty` |
| `observaciones_medicas` | string | `@IsString`, `@IsNotEmpty` |
| `lesiones_actuales` | string | `@IsString`, `@IsNotEmpty` |
| `lesiones_pasadas` | string | `@IsString`, `@IsNotEmpty` |
| `contacto_emergencia_nombre` | string | `@IsString`, `@IsNotEmpty` |
| `contacto_emergencia_telefono` | string | `@IsString`, `@IsNotEmpty` |

- **Descripción**: registra un alumno y le activa la suscripción inicial.
- **Flujo** (en una transacción):
  1. Hash de contraseña y mapeo de `sexo` (idéntico a entrenador).
  2. Crea `Usuario` con `role: alumno`.
  3. Crea el perfil `Alumno` (convierte `numero_celular` a string).
  4. `suscripcionesService.activarSuscripcionInicial(user.id)`.
- **Respuesta 200**:

  ```json
  { "message": "Usuario registrado exitosamente" }
  ```

- **Errores**:
  - `400` — errores de validación de body.
  - `429` — rate limit.
  - Posibles errores de negocio de `activarSuscripcionInicial` (p. ej. `404 Plan del alumno no encontrado o inactivo`).

---

## Suscripciones

> Todas las rutas de este controlador están marcadas con `@SinSuscripcion()` (no exigen suscripción activa, pero **sí** JWT). El `usuarioId` proviene de `@CurrentUser('id')`.

> ⚠️ Pendiente de confirmar: las **formas exactas de las entidades** `suscripcion`, `planAlumno`/`planEntrenador` y `pago` completas (todos los campos) no están documentadas aquí; se listan los visibles en el código y los relevantes para cada endpoint.

### GET /suscripciones/actual

- **Descripción**: devuelve la suscripción actual del usuario autenticado, con el plan y el último pago.
- **Flujo**:
  1. `obtenerRol` → `404 Usuario no encontrado` si no existe.
  2. Busca la suscripción vigente (estado en `prueba`/`activa`) ordenada por `periodoActualInicio` desc, incluyendo `planAlumno`/`planEntrenador` y el último `pago` (ordenado por `venceEn`/`creadoEn`).
  3. Si no hay → `404 No se encontró una suscripción actual`.
- **Respuesta 200**: `Suscripcion` con `include: { planAlumno, planEntrenador, pagos: [último] }`. (Forma completa `⚠️ Pendiente de confirmar`.)
- **Errores**: `404` usu/no-encontrado, `404` suscripción.

### GET /suscripciones/estado-pago

- **Descripción**: devuelve el estado del último pago.
- **Flujo**:
  1. `obtenerRol` y `buscarSuscripcionActual`.
  2. `validarVigencia` → `403 La suscripción ha expirado` si está vencida.
  3. Si `vitalicia` o estado `prueba` → `{ estado: 'pagado' }`.
  4. Si no, busca el último pago → `404 Estado de pago no encontrado para la suscripción` si no hay.
- **Respuesta 200**:

  ```json
  { "estado": "pagado" }
  ```

  o bien:

  ```json
  { "estado": "<EstadoPagoEnum>", "pagoId": "<bigint>" }
  ```

- **Errores**: `404`, `403` (expirado).

### PATCH /suscripciones/plan

- **Body**: `CambiarPlanDto`

| Campo | Tipo | Reglas |
|-------|------|--------|
| `idPlanNuevo` | number | `@Type(() => Number)`, `@IsInt`, `@Min(1)` |

- **Descripción**: cambia el plan del usuario (responder según rol).
- **Flujo**:
  1. `obtenerRol` + `buscarSuscripcionActual`.
  2. Si la suscripción tiene `proveedorSubscriptionId` (existe una suscripción Stripe) → `400 No puedes cambiar de plan mientras exista una suscripción Stripe...` (protección; el cambio se bloquea).
  3. Si `alumno` → `cambiarPlanAlumno`; si `entrenador` → `cambiarPlanEntrenador` (en transacción Serializable); otro rol → `403 Rol no válido para cambiar plan`.
- **Errores**: `400` (con Stripe activa), `403` (rol no válido), `404` (suscripción/plan no encontrado).

### POST /suscripciones/cancelar

- **Descripción**: cancela la suscripción Stripe al final del periodo.
- **Flujo**:
  1. `obtenerRol` + `buscarSuscripcionActual`.
  2. Si `vitalicia` → `400 Una suscripción vitalicia no tiene cobros recurrentes que cancelar`.
  3. Si ya `cancelarAlFinalDelPeriodo` → `409 La suscripción ya está programada para cancelarse al final del periodo`.
  4. Si no es `stripe` o no tiene `proveedorSubscriptionId` → `400 La suscripción aún no tiene una suscripción Stripe activa para cancelar`.
  5. `stripeService.cancelarAlFinalDelPeriodo(...)` y actualiza la suscripción (`cancelarAlFinalDelPeriodo: true`, `canceladaEn`, `siguienteCobroEn: null`).
- **Respuesta 200**: suscripción actualizada. Forma `⚠️ Pendiente de confirmar`.
- **Errores**: `400`, `409`, `404`.

### POST /suscripciones/reanudar

- **Descripción**: reanuda una suscripción programada para cancelarse.
- **Flujo**:
  1. `obtenerRol` + `buscarSuscripcionActual`.
  2. Si NO está `cancelarAlFinalDelPeriodo` → `400 La suscripción no está programada para cancelarse`.
  3. Si no es Stripe o no tiene `proveedorSubscriptionId` → `400 La suscripción no tiene una suscripción Stripe activa para reanudar`.
  4. `stripeService.reanudarSuscripcion(...)` y actualiza (`cancelarAlFinalDelPeriodo: false`, `canceladaEn: null`, `siguienteCobroEn: periodoActualFin`).
- **Respuesta 200**: suscripción actualizada. Forma `⚠️ Pendiente de confirmar`.
- **Errores**: `400`, `404`.

---

## Pagos

> El `PagosController` está marcado con `@SinSuscripcion()`. Requiere JWT salvo en el webhook (ver más abajo).

### POST /pagos/checkout

- **Body**: `CrearCheckoutDto`

| Campo | Tipo | Reglas |
|-------|------|--------|
| `pagoId` | bigint | `@Type(() => BigInt)`, `@IsNotEmpty`, `@IsBigInt` |
| `suscripcionId` | bigint | `@Type(() => BigInt)`, `@IsNotEmpty`, `@IsBigInt` |

- **Usuario**: `@CurrentUser('id')`.
- **Descripción**: crea una sesión de Stripe Checkout para un pago pendiente (o reutiliza una abierta).
- **Flujo**:
  1. Busca el `Pago` (con su `suscripcion`). Si no existe → `404 Pago no encontrado`.
  2. Si `pago.suscripcionId !== suscripcionId` → `400 El pago no corresponde a la suscripción`.
  3. Si `proveedor !== stripe` → `400 El pago no está configurado para Stripe`.
  4. Si `estado !== pendiente` → `400 El pago ya fue procesado o no puede cobrarse`.
  5. Si el pago no pertenece al usuario (`alumnoId`/`entrenadorId` ≠ `usuarioId`) → `403 No tienes acceso a este pago`.
  6. Si no hay `proveedorPriceIdSnapshot` → `400 La suscripción no tiene un Stripe Price configurado`.
  7. Si hay `proveedorPagoId` previo y la sesión está `open` con URL → reutiliza: `{ url, reutilizada: true }`.
  8. Crea sesión con `stripeService.crearCheckoutSuscripcion(...)`, `success_url = {FRONTEND_URL}/pago/exito?session_id={CHECKOUT_SESSION_ID}`, `cancel_url = {FRONTEND_URL}/pago/cancelado`.
  9. Si la sesión no tiene `url` → `400 Stripe no devolvió la URL de Checkout`.
  10. Guarda `proveedorPagoId = session.id` y devuelve `{ url, reutilizada: false }`.
- **Respuesta 200**:

  ```json
  { "url": "https://checkout.stripe.com/...", "reutilizada": false }
  ```

- **Errores**: `404`, `400`, `403`.

### POST /pagos/webhook/stripe

- **Descripción**: recibe los webhooks de Stripe, verifica la firma y procesa el evento.
- **Método de autenticación**: usa el header `stripe-signature` y `STRIPE_WEBHOOK_SECRET` (no usa JWT).
- **Request**: body raw + header `stripe-signature`.
- **Flujo**:
  1. Si falta `rawBody` o `firma` → `400 Webhook de Stripe incompleto`.
  2. `stripeService.verificarWebhook(rawBody, firma)` → si la firma es inválida → `400 Firma de webhook de Stripe inválida`.
  3. `registrarEventoSiEsNuevo`: crea un `EventoStripe` (deduplicación). Si ya existe (constraint único + `P2002`) → responde `{ recibido: true, duplicado: true, tipo }` y no reprocesa.
  4. Según `evento.type`:
     - `checkout.session.completed` → `procesarCheckoutCompletado`
     - `invoice.paid` → `procesarFacturaPagada`
     - `invoice.payment_failed` → `procesarFacturaFallida`
     - `customer.subscription.deleted` → `procesarSuscripcionEliminada`
     - cualquier otro → `{ recibido: true, ignorado: true, tipo }`
  5. Marca el evento como `procesado: true` y actualiza `pagoId`/`suscripcionId` según corresponda.
- **Respuesta 200**: objeto según el tipo procesado (deduplicado / ignorado / resultado del handler).

#### Detalle de cada evento

- **`checkout.session.completed`** — valida `metadata.pagoId`/`metadata.suscripcionId` (BigInt), lee `customer` y `subscription` de Stripe. En transacción: valida que el pago exista y corresponda a la suscripción, actualiza `Pago` (`stripe`, `proveedorPagoId`), `Suscripcion` (`stripe`, `proveedorCustomerId`, `proveedorSubscriptionId`). Errores: `400 La sesión Stripe no contiene customer o subscription`, `404 No se encontró el pago asociado al Checkout`, `400 El pago no pertenece a la suscripción del Checkout`, `400 La sesión Stripe no coincide con el pago local`.
- **`invoice.paid`** — lee el `subscription` de la factura, localiza la suscripción por `proveedorSubscriptionId` (`404 No se encontró la suscripción local de Stripe` si no), obtiene/crea el pago desde la factura, obtiene la suscripción Stripe para el periodo, y llama a `activarSuscripcionPorPagoConfirmado(pagoId, inicio, fin, siguienteCobroEn)`.
- **`invoice.payment_failed`** — similar a `invoice.paid` pero con `montoCentavos = amount_due`, y llama a `marcarSuscripcionComoMorosaPorPagoFallido(pagoId)` (marca el pago `fallido` y la suscripción `morosa`).
- **`customer.subscription.deleted`** — busca la suscripción local por `proveedorSubscriptionId` (si no existe → `{ recibido: true, ignorado: true, motivo }`). En transacción: marca la suscripción `cancelada`, `siguienteCobroEn: null`, `cancelarAlFinalDelPeriodo: false`.
- Si el procesamiento lanza un error, se registra `errorMensaje` en el `EventoStripe` y se **re-lanza** la excepción.

- **Errores**: `400` (webhook incompleto / firma / metadata inválida / monto inválido / periodos sin datos), `404` (pago/suscripción local no encontrados), además de los lanzados por `SuscripcionesService`.

---

## Rutinas

### POST /rutinas

- **Body**: `CreateRutinaDto`

| Campo | Tipo | Reglas |
|-------|------|--------|
| `nombre` | string | `@IsString`, `@IsNotEmpty`, `@MaxLength(100)` |
| `descripcion` | string | `@IsString`, `@IsNotEmpty`, `@MaxLength(1000)` |
| `id_categoria_rutina` | number | `@IsNotEmpty`, `@Type(() => Number)`, `@IsInt`, `@Min(1)` |

- **Usuario**: `@CurrentUser('id')`.
- **Descripción**: crea una rutina (solo entrenadores, respeta el límite del plan).
- **Flujo**:
  1. Busca el usuario por `id`. Si es `admin` → `403` (`⚠️ Pendiente de confirmar` mensaje exacto).
  2. Si `role === entrenador`: busca el perfil `Entrenador` (si no → `404`), su `planEntrenador` activo (si no → `404`), y cuenta rutinas del plan. Si `count >= limiteRutinas` → `400 Has alcanzado el límite de rutinas permitidas por tu plan (<n>)`.
  3. Crea la `Rutina`.
- **Respuesta 200**:

  ```json
  { "success": true, "message": "Rutina creada exitosamente" }
  ```

- **Errores**: `403`, `404`, `400`, errores de validación.

### PATCH /rutinas/:id/ejercicios

- **Parámetro**: `:id` (bigint) vía `ParseBigIntPipe`.
- **Body**: `RutinaEjercicioDto`

| Campo | Tipo | Reglas |
|-------|------|--------|
| `ejercicios` | `RutinaEjercicioAsignacionDto[]` | `@IsNotEmpty`, `@IsArray`, `@ArrayMinSize(1)`, `@ValidateNested({each:true})` |

Cada `RutinaEjercicioAsignacionDto`:

| Campo | Tipo | Reglas |
|-------|------|--------|
| `id_ejercicio_estandar` | bigint (opcional) | `@IsOptional`, `@Type(() => BigInt)`, `@IsBigInt` |
| `id_ejercicio_personalizado` | bigint (opcional) | `@IsOptional`, `@Type(() => BigInt)`, `@IsBigInt` |
| `orden` | number | `@IsNotEmpty`, `@Type(() => Number)`, `@IsInt`, `@Min(1)` |
| `series` | number | `@IsNotEmpty`, `@IsInt`, `@Min(1)` |
| `repeticiones` | number | `@IsNotEmpty`, `@IsInt`, `@Min(1)` |
| `peso_objetivo` | number (opcional) | `@IsOptional`, `@IsNumber({maxDecimalPlaces:2})`, `@Min(0)` |
| `nota_entrenador` | string (opcional) | `@IsOptional`, `@IsString`, `@IsNotEmpty`, `@MaxLength(1000)` |
| `link_apoyo` | string (opcional) | `@IsOptional`, `@IsString`, `@IsNotEmpty`, `@IsUrl({require_protocol:true})`, `@MaxLength(500)` |

- **Descripción**: reemplaza todos los ejercicios de una rutina (borrar y recrear) en una transacción.
- **Flujo**: elimina los `RutinaEjercicio` de la rutina y crea los nuevos con los datos del array. (`⚠️ Pendiente de confirmar` si aplica ownership: este método **no** recibe `@CurrentUser`.)
- **Respuesta 200**:

  ```json
  { "success": true, "message": "Ejercicios de la rutina actualizados exitosamente" }
  ```

- **Errores**: `400` de validación; la transacción puede lanzar conflictos (p. ej. `id_ejercicio_estandar` y `id_ejercicio_personalizado` simultáneos, `⚠️ Pendiente de confirmar`).

### POST /rutinas/:id/asignaciones

- **Parámetro**: `:id` (bigint) vía `ParseBigIntPipe`.
- **Body**: `AsignarRutinaDto`

| Campo | Tipo | Reglas |
|-------|------|--------|
| `id_alumno` | string | `@IsUUID('4')`, `@IsNotEmpty` |
| `numero_dia` | number | `@IsNotEmpty`, `@IsInt`, `@Min(1)`, `@Max(7)` |
| `fecha_inicio` | string (ISO date) | `@IsNotEmpty`, `@IsDateString`, `@IsTodayOrFutureDate` |
| `fecha_fin` | string (opcional) | `@IsOptional`, `@IsDateString`, `@IsAfterOrEqualTo('fecha_inicio')` |

- **Usuario**: `@CurrentUser('id')`.
- **Descripción**: asigna la rutina a un alumno en un día concreto, resolviendo solapamientos.
- **Flujo**:
  1. Verifica ownership: la rutina debe pertenecer al usuario autenticado (`createdByUsuario === usuarioId`); si no → `403` (`⚠️ Pendiente de confirmar` mensaje).
  2. Valida que el destino sea un alumno válido (rol/estado; si no → `403`).
  3. Busca asignaciones que se traslapen con `fecha_inicio`/`fecha_fin`:
     - Si una asignación previa se solapa de forma **no recortable** → `400 La rutina se traslapa con otra asignación ya registrada para ese día`.
     - Si la asignación previa empieza antes y es recortable → se **acorta** su `fechaFin` y se continúa.
  4. Crea la `UsuarioRutina`.
- **Respuesta 200**:

  ```json
  { "success": true, "message": "Rutina asignada al alumno exitosamente" }
  ```

- **Errores**: `403`, `400`, `404`.

---

## Ejercicios personalizados

### POST /ejerciciosPersonalizados

- **Body**: `CreateEjercicioPersonalizadoDto`

| Campo | Tipo | Reglas |
|-------|------|--------|
| `nombre` | string | `@IsString`, `@IsNotEmpty`, `@MaxLength(150)` |
| `activa` | boolean (opcional) | `@IsOptional`, `@IsBoolean` |
| `descripcion` | string (opcional) | `@IsOptional`, `@IsString`, `@IsNotEmpty` |
| `url_imagen` | string (opcional) | `@IsOptional`, `@IsString`, `@IsNotEmpty`, `@IsUrl` |
| `link_informacion` | string (opcional) | `@IsOptional`, `@IsString`, `@IsNotEmpty`, `@IsUrl` |
| `musculos` | number[] | `@IsArray`, `@ArrayNotEmpty`, `@ArrayMinSize(1)`, `@ArrayUnique`, `@Type(() => Number)`, `@IsInt({each:true})` |
| `equipos` | number[] (opcional) | `@IsOptional`, `@IsArray`, `@ArrayUnique`, `@Type(() => Number)`, `@IsInt({each:true})` |

- **Usuario**: `@CurrentUser('id')`.
- **Descripción**: crea un ejercicio personalizado con sus músculos/equipos; valida el límite del plan del alumno.
- **Flujo**: valida la cantidad de ejercicios del alumno según su plan (`⚠️ Pendiente de confirmar` límite exacto); en transacción crea el ejercicio y hace `createMany` de `musculos` y `equipos`.
- **Respuesta 200**:

  ```json
  { "success": true, "message": "Ejercicio personalizado creado exitosamente", "data": { "id": "<bigint como string>" } }
  ```

- **Errores**: `400` de validación, `404` (usuario no encontrado), y errores de límite de plan.

### PATCH /ejerciciosPersonalizados/:id

- **Parámetro**: `:id` es validado por `IdNumberDto` (`@Type(() => BigInt)`, `@IsBigInt`, `@IsNotEmpty`).
- **Body**: `UpdateEjercicioPersonalizadoDto` (extiende `CreateEjercicioPersonalizadoDto`).
- **Usuario**: `@CurrentUser('id')`.
- **Descripción**: actualiza un ejercicio personalizado (solo el creador); reemplaza músculos y equipos.
- **Flujo**: en transacción: verifica que exista (`404 Ejercicio personalizado no encontrado`) y que `createdByUsuario === usuarioId` (`403`); actualiza el ejercicio y recrea relaciones de músculos/equipos.
- **Respuesta 200**:

  ```json
  { "success": true, "message": "Ejercicio personalizado actualizado exitosamente" }
  ```

- **Errores**: `404`, `403`, `400` de validación.

### DELETE /ejerciciosPersonalizados/:id

- **Parámetro**: `:id` vía `IdNumberDto` (bigint).
- **Usuario**: `@CurrentUser('id')`.
- **Descripción**: desactiva (soft-delete) un ejercicio personalizado, solo por su creador.
- **Flujo**: busca el ejercicio (`404` si no existe); si `createdByUsuario !== usuarioId` → `403 No tienes permiso para eliminar este ejercicio personalizado`; marca `activa: false`.
- **Respuesta 200**:

  ```json
  { "success": true, "message": "Ejercicio personalizado desactivado exitosamente" }
  ```

- **Errores**: `404`, `403`.

---

## Alumno–Entrenador

### PUT /alumno-entrenador/cancelar/mi-entrenador

- **Body**: `CancelarMiEntrenadorDto`

| Campo | Tipo | Reglas |
|-------|------|--------|
| `contraseña_alumno` | string | `@IsString`, `@IsNotEmpty` |

- **Usuario**: `@CurrentUser('id')`.
- **Descripción**: el alumno desvincula a su entrenador actual (requiere confirmar contraseña).
- **Flujo**: verifica la contraseña del alumno; desvincula el entrenador y revierte el rol del alumno a `alumno`.
- **Respuesta 200**:

  ```json
  { "success": true, "message": "Alumno desvinculado de su entrenador exitosamente" }
  ```

- **Errores**: `400` de validación, `401`/`403` según la validación de contraseña/estado (mensajes exactos `⚠️ Pendiente de confirmar`).

### PUT /alumno-entrenador/cancelar/alumno/:id

- **Parámetro**: `:id` vía `IsUUIDDto` (`@IsUUID`).
- **Body**: `CancelarAlumnoDto`

| Campo | Tipo | Reglas |
|-------|------|--------|
| `contraseña_entrenador` | string | `@IsString`, `@IsNotEmpty` |

- **Usuario**: `@CurrentUser('id')`.
- **Descripción**: el entrenador desvincula a un alumno (requiere confirmar su contraseña).
- **Flujo**: verifica la contraseña del entrenador; desvincula al alumno y revierte su rol a `alumno`.
- **Respuesta 200**:

  ```json
  { "success": true, "message": "Alumno cancelado exitosamente" }
  ```

- **Errores**: `400` de validación, `401`/`403`/`404` según la validación (`⚠️ Pendiente de confirmar` mensajes exactos).

### POST /alumno-entrenador/token/consumir

- **Body**: `ConsumirTokenDto`

| Campo | Tipo | Reglas |
|-------|------|--------|
| `codigo` | string | `@IsString`, `@IsNotEmpty` |
| `secreto` | string | `@IsString`, `@IsNotEmpty` |

- **Usuario**: `@CurrentUser('id')`.
- **Descripción**: el entrenador consume el token del alumno (código + secreto) y lo vincula.
- **Flujo** (en transacción):
  1. El usuario autenticado debe ser `entrenador` (si no → `401 El usuario no es un entrenador válido`); debe existir el perfil `Entrenador` (`401 Entrenador no encontrado`).
  2. `validatePLanYAlumnosLimites` — valida el plan y los límites de alumnos.
  3. Busca el token por `codigoHash`/`secretoHash` sin usar y sin revocar → `401 Token no válido o ya ha sido utilizado`.
  4. Si expiró → `401 El token ha expirado`.
  5. Valida que el alumno exista (`404 Alumno no encontrado`) y que sea `alumno` sin entrenador (`401 El alumno ya tiene un entrenador asignado`).
  6. Marca el token como usado, asigna `idEntrenadorActual`, crea `AlumnoEntrenadorHistorial`, y cambia el rol del alumno a `alumnoConEntrenador`.
- **Respuesta 200**:

  ```json
  {
    "success": true,
    "message": "Token consumido exitosamente, alumno vinculado al entrenador",
    "data": { "id_alumno": "...", "nombre": "...", "apellido_paterno": "...", "apellido_materno": "...", "correo": "..." }
  }
  ```

- **Errores**: `400` de validación, `401`, `404`, y errores de límite de plan.

### POST /alumno-entrenador/token

- **Usuario**: `@CurrentUser('id')`.
- **Descripción**: el alumno genera un token de vinculación (código + secreto) con caducidad de 30 minutos.
- **Flujo**: genera `codigo` y `secreto` aleatorios, los hashea (SHA-256) para guardarlos, fija `expiraEn` (+30 min) y devuelve los valores en claro (solo una vez).
- **Respuesta 200**:

  ```json
  {
    "success": true,
    "message": "Token generado exitosamente",
    "data": { "codigo": "...", "secreto": "...", "expira_en": "<ISO> " }
  }
  ```

- **Errores**: `400` de validación, `401`/`403` según el contexto (`⚠️ Pendiente de confirmar` mensajes de autorización exactos).

---

## Referencias

- `docs/architecture.md` — arquitectura, flujos y diagramas.
- `docs/api-resumen.md` — tabla resumen de endpoints.
- `src/modules/*` — código fuente de los módulos descritos.