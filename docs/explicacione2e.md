# Tests e2e del proyecto — explicación completa

> Fecha de verificación: 2026-09-19. Estado final: **7/7 suites PASS, 46 tests, 0 fallos**.
> Comando para reproducirlo:
> `pnpm exec jest --config ./test/jest-e2e.json --runInBand`
>
> Este doc te explica **qué** son estos tests, **cómo** están armados y **por qué** están
> armados así, para que puedas escribirlos y entenderlos vos mismo. Todo lo que nombro
> acá existe así en el repo (rutas, nombres y firmas byte-exactos de `test/`).

---

## 1. Qué es un test e2e (y por qué este proyecto los necesita)

Un test **unitario** prueba una función con datos inventados (mocks).

Un test **e2e** (end-to-end) prueba el sistema completo como lo usaría un usuario real:

- levanta la **misma app Nest de producción** (real, no un mock);
- habla por **HTTP real** (`supertest` contra `app.getHttpServer()`);
- manda a una **base de datos real** (una rama de Neon llamada `test`);
- pasa por **auth de verdad** (registro → login → token Bearer → rutas protegidas).

¿Por qué hacen falta? Porque hay **dos fuentes de verdad** que los tests unitarios no
cubren: los **DTOs / pipes de validación** de Nest (qué campos espera el endpoint) y las
**constraint de la BD** (FKs, planes mínimos, catálogos). Un e2e se cae cuando una de las
dos no coincide con lo que el backend espera — y ese era exactamente el tipo de fallo
que estaba pasando en la suite de rutinas.

---

## 2. Mapa de archivos (qué hay en `test/`)

| Archivo | Para qué es |
| --- | --- |
| `test/app.e2e-spec.ts` | smoke test: crea la app, verifica `GET /` y el guard `NODE_ENV` |
| `test/auth.e2e-spec.ts` | 9 tests: registro, login, 401/403 con token inválido |
| `test/ejercicios.e2e-spec.ts` | 7 tests: ABM de ejercicios (CRUD del entrenador) |
| `test/alumno-entrenador.e2e-spec.ts` | 5 tests: vincular alumno con entrenador |
| `test/suscripciones.e2e-spec.ts` | 8 tests: alta/baja de suscripciones |
| `test/pagos.e2e-spec.ts` | 9 tests: checkout de pagos (Stripe) |
| `test/rutinas.e2e-spec.ts` | 7 tests: CRUD de rutinas + asignar ejercicios estándar |
| `test/utils/app-builder.ts` | `crearApp()`, helpers de registro/login/logueo |
| `test/utils/fixtures.ts` | payloads DTO listos para mandar (fixtures) |
| `test/utils/db.ts` | helpers de BD: `limpiarDatos`, `asegurarEjercicioEstandar`, etc. |
| `test/jest-e2e.json` | config de Jest: `testTimeout: 20000`, `--runInBand` |
| `test/setup-env.js` | carga `test/.env.test` + `NODE_ENV=test` antes que Jest |
| `test/migrate.js` | aplica migraciones a la branch `test` (script `migrate:test`) |

---

## 3. Las piezas que se reutilizan (los helpers)

### `test/utils/app-builder.ts` — levanta la app y loguea gente

```ts
export async function crearApp(): Promise<INestApplication>            // app real
export function auth(token: string)                                    // header Authorization Bearer
export async function registrarAlumno(app)                             // registro (alumno)
export async function registrarEntrenador(app)                         // registro (entrenador)
export async function iniciarSesion(app)                               // login
export async function registrarYLoguearAlumno(app)                     // registro + login → { token }
export async function registrarYLoguearEntrenador(app)                 // idem entrenador
```

De `registrarYLoguearEntrenador` sale el `{ token }` que después se usa como
`entrenadorToken` en todos los requests protegidos.

### `test/utils/fixtures.ts` — los payloads que se mandan

Cada fixture es el **body real del DTO** que espera el backend:

```ts
export function loginPayload(correo, password = PASSWORD_E2E)
export function alumnoPayload(sobre = {})
export function entrenadorPayload(sobre = {})
export function rutinaPayload(sobre = {})                 // { idPlan?, activa }
export function rutinaEjerciciosPayload(sobre = {})       // { idEstandar, ... }
export function asignarRutinaPayload(idAlumno)
export function cambiarPlanPayload(idPlan)
export function consumirTokenPayload(codigo, secreto)
```

### `test/utils/db.ts` — la BD por debajo

```ts
export function emailUnico(prefijo = 'e2e')               // correo único por run
export function hoy()                                     // fecha ISO para payloads
export async function limpiarDatos(app)                   // TRUNCATE de tablas transaccionales
export async function asegurarEjercicioEstandar(prisma)   // crea el ejercicio estándar si falta
```

`limpiarDatos` vacía las tablas que crean los tests (usuarios, pagos, suscripciones…)
pero **respeta los catálogos** que siembran las migraciones (planes, sexo, objetivo),
usando `CASCADE` para las dependientes. Ese es el motivo por el que los ids de los
catálogos (plan 1, 2…) son estables entre corridas.

---

## 4. El ciclo de vida de una suite (el patrón de `beforeAll`)

Todas las suites siguen la misma receta:

```ts
beforeAll(async () => {
  app = await crearApp();                              // 1) app real
  await limpiarDatos(app);                             // 2) BD limpia (solo tablas transaccionales)

  ({ token: entrenadorToken } =
    await registrarYLoguearEntrenador(app));           // 3) alguien logueado

  const prisma = app.get(PrismaService);               // 4) acceso directo a la BD (solo tests)

  // 5) preparación específica de la suite (ej. rutinas):
  //   - sube el plan del entrenador vía prisma.entrenador.update (el seed trae
  //     Basico con mÃ¡ximo 3 rutinas, y la suite crea 6 → plan Avanzado);
  //   - idEjercicioEstandar = await asegurarEjercicioEstandar(prisma);
  //     (core.ejercicio_estandar no viene en el seed; lo creamos idempotente,
  //      la tabla no se trunca, así que un segundo run lo reutiliza);
  //   - registra un alumno y guarda su id.
});

afterAll(async () => {
  await app.close();                                 // 6) cierra la conexión y el servidor
});
```

**Regla de oro:** el plan solo se toca **dentro del test**, vía Prisma (no en `src/`,
no en migraciones). El guard `NODE_ENV=test` en `limpiarDatos` evita destruir datos reales.

---

## 5. El caso que estuvo rojo: `rutinas` (y cómo se arregló)

### El síntoma

La suite `test/rutinas.e2e-spec.ts` fallaba con **7 errores** — todos por una sola causa:

```
ReferenceError: asegurarEjercicioPayload is not defined
```

### La causa raíz (por qué, no solo qué)

El spec necesitaba hacer un `PATCH /rutinas/:id/ejercicios` con un **ejercicio estándar**.
Pero:

1. **El helper `asegurarEjercicioPayload` no existía en `test/utils/`** — el nombre
   quedó de un borrador viejo; nunca se definió (es `asegurarEjercicioEstandar` en `db.ts`).
2. **El `beforeAll` llamaba a ese helper inexistente** → `ReferenceError` en el setup.
3. Como el setup muere, **los 7 `it()` de la suite se caen todos** (si el `beforeAll`
   revienta, la suite entera queda roja — no solo uno).

Además había un detalle de fondo: el PATCH mandaba `idEstandar: 1` hardcodeado, pero el
registro real del ejercicio estándar **no tiene por qué ser `1`** (autoincrement), y la
tabla no viene en el seed.

### El arreglo (3 toques, todos en `test/`, ninguno en `src/`)

1. **Helper idempotente creado en `test/utils/db.ts`** (`asegurarEjercicioEstandar`):
   busca con `findFirst`, y si no hay, crea con `create` usando un nombre único.
   Devuelve la **id real** del registro (no `1`).

```ts
export async function asegurarEjercicioEstandar(
  prisma: PrismaService,
): Promise<number> {
  const existente = await prisma.ejercicioEstandar.findFirst();
  if (existente) return Number(existente.id);

  const creado = await prisma.ejercicioEstandar.create({
    data: { nombre: `Estandar e2e ${randomUUID().replace(/-/g, '')}` },
  });
  return Number(creado.id);
}
```

**Por qué `findFirst` y no `findUnique(1)`:** `core.ejercicio_estandar` **no se trunca**
entre corridas, así que la primera vez se `create`, y las siguientes se reutiliza el
existente — y se devuelve la id **real**, no `1`.

2. **El spec importa al helper** (`import { asegurarEjercicioEstandar } from './utils/db'`)
   y guarda el id en el `beforeAll` (`idEjercicioEstandar`).

3. **El PATCH pasa el id real, no el hardcodeado**:
   - antes (rojo): `.send(rutinaEjerciciosPayload({ idEstandar: 1 }))`
   - después (verde): `.send(rutinaEjerciciosPayload({ idEstandar: idEjercicioEstandar }))`

| Aspecto | Antes | Después |
| --- | --- | --- |
| Helper `asegurarEjercicioPayload` | inexistente → `ReferenceError` | existe (db.ts) → id real |
| Suite rutinas | 7 fallos | **7 PASS** |

---

## 6. Cómo escribir un test e2e nuevo (plantilla `<Modulo>.e2e-spec.ts`)

### Paso 0 — los 3 imports que se repiten siempre

```ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { crearApp } from './utils/app-builder';
import { limpiarDatos, emailUnico } from './utils/db';
import { loginPayload } from './utils/fixtures';
```

### Paso 1 — el esqueleto

```ts
describe('<Modulo> (e2e)', () => {
  let app: INestApplication | undefined;
  let tokenEntrenador: string;

  beforeAll(async () => {
    app = await crearApp();
    await limpiarDatos(apphed);
  });

  afterAll(async () => {
    await app?.close();
  });
});
```

### Paso 2 — el `it()` feliz (el que importa de verdad)

1. Elegí un **endpoint real** y su **DTO real** (de `fixtures.ts`, no inventado).
2. Manejá la respuesta con `supertest` apuntando a `app.getHttpServer()`.
3. Verificá **estado HTTP** Y un pedazo del **body** (el contrato, no todo).
4. Usá el payload exacto del DTO con los **ids reales de BD** (helpers de `db.ts`).

### Paso 3 — la lista de chequeo antes de correr

- [ ] El spec está en `test/` (nunca en `src/`).
- [ ] `limpiarDatos(app)` al inicio del `beforeAll`.
- [ ] Los ids que mando vienen de helper de BD (no `1` hardcodeado).
- [ ] `app?.close()` en `afterAll`.
- [ ] Corro **en serie**: `pnpm exec jest --config ./test/jest-e2e.json --runInBand`.
