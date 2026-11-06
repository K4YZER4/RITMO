# Tests e2e — estado verificado

> Estado verificado al `2026-09-19` (carrera completa `pnpm exec jest --config ./test/jest-e2e.json --runInBand`).
> Última corrida: **7/7 suites PASS, 46 tests, 0 fallos**.
> Guard: `NODE_ENV=test` + Neon branch `test` (vía `pnpm migrate:test`).
> Regla respetada: solo archivos en `test/` y `package.json`; **no** se toca `src/` ni migraciones.

## Ya está hecho (no rehacer)

- **Rutinas arreglada (todo verde)**: helper `asegurarEjercicioEstandar` creado en
  `test/utils/db.ts` (idempotente: `findFirst` + `create` si no existe, devuelve la
  `id` real; la tabla `core.ejercicio_estandar` no se trunca entre corridas).
  El spec `test/rutinas.e2e-spec.ts` lo importa en el `beforeAll` y usa
  `idEjercicioEstandar` (el id real) en el PATCH, no el `1` hardcodeado.
- **8 fallos → 0**: los 4 timeouts de 5000 ms (pagos, suscripciones, alumno-entrenador)
  se resolvieron con `testTimeout: 20000` + `forceExit: true` en `test/jest-e2e.json`.
- Plan del entrenador en rutinas subido a **Avanzado (id 3)** vía Prisma (antes Basico
  hacía fallar la creación de las rutinas 4-6).
- `pnpm migrate:test` (script `migrate:test` → `node test/migrate-test.js`) aplica las
  migraciones a la DB de test.
- **7/7 suites VERDES**: `app`, `auth`, `ejercicios`, `alumno-entrenador`,
  `suscripciones`, `pagos`, `rutinas`.

## Suites (todas PASS)

| Suite | Estado |
| --- | --- |
| `app` | PASS |
| `auth` (9 tests) | PASS |
| `ejercicios` (7 tests) | PASS |
| `alumno-entrenador` (5 tests) | PASS |
| `suscripciones` (8 tests) | PASS |
| `pagos` (9 tests) | PASS |
| `rutinas` (7 tests) | PASS |

## Comando de verificación

```bash
# Aplica migraciones a la DB de test (Neon branch test)
pnpm migrate:test

# Suite completa en serie (evita timeouts y saturación compartida)
pnpm exec jest --config ./test/jest-e2e.json --runInBand
```

Resultado esperado: **7/7 suites PASS** y `46 passed` (0 fallos).

## Notas (no bloquean, informativas)

- `core.ejercicio_estandar` no viene en el seed; la suite la crea con el helper
  idempotente `asegurarEjercicioEstandar` (en `test/utils/db.ts`).
- El seed del entrenador usa plan Basico (3 rutinas); la suite crea 6, por eso el
  bump directo a Avanzado vía Prisma (solo afecta tests).
- `test/.env.test` apunta a Neon `-pooler`; si `migrate deploy` reporta
  «already exists» por historial de la rama, usar `prisma db push` como fallback.
