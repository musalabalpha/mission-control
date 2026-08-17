# Experimento Cursor — Artefactos V1

- Inicio: 2026-08-16 18:14 CST
- Fin: 2026-08-16 19:06 CST
- Modelo/modo de Cursor: Cursor Grok 4.6, explanatory / agent
- HEAD inicial WIP: f690d485985addf632417adcb7f03ba6f8c613c9
- HEAD al abrir Task 0: 55a5b18de6f0a8bdaca2c002ccfbcc20c84b3dd1
- Rama: feat/hlx-539-artifacts-v1-cursor
- Intervenciones de Musa: 5
- Comandos fallidos: 5/9 baseline (ambiente) + 6 intentos E2E antes de verde
- Defectos encontrados en revisión: 3 (browsers Playwright ausentes; standalone E2E sin static/public; panel Artefactos detrás de interfaceMode=essential)
- Dependencias/servicios pagados sugeridos: 0
- Cursos/servicios pagados sugeridos: 0
- HEAD Tasks 1–4: 8d27693
- HEAD Task 4b CSP overlay: 8ac68e2
- HEAD Task 5: 5c40d24


Logs crudos por comando: `.hermes/experiments/hlx-539-cursor-artifacts-v1-logs/`

## Intervenciones

| # | Hora | Qué pidió Cursor | Qué respondió Musa | Era indispensable |
|---|---|---|---|---|
| 1 | 2026-08-16 18:13 CST | Autorización para Task 0 (bitácora + baseline sección E) | Procede con Task 0 únicamente; no Task 1; no commit/push; no corregir fallas | Sí — gate de evidencia |
| 2 | 2026-08-16 18:19 CST | Desbloqueo de ambiente | Autorizó `pnpm install --frozen-lockfile`, re-gates, y continuar el writing plan; Tasks 1–4 autónomas; Design Mode tras Task 4 | Sí — runners no arrancaban |
| 3 | 2026-08-16 18:43 CST | Diagnóstico overlay doctor/gateway/home | Pegó `openclaw doctor` + “gateway offline” + home vs Command Center | No para HLX-539 — carril OpenClaw |
| 4 | 2026-08-16 18:46 CST | Decisión de alcance | Command Center dado de baja; pidió recomendación | Sí — cortó un carril muerto |
| 5 | 2026-08-16 18:48 CST | Ejecución | “Adelante” = Tasks 5–7, sin `--fix`, sin merge | Sí |

## Evidencia — desbloqueo ambiente + re-gates

| Gate | Comando | Exit | Duración | Resultado |
|---|---|---|---|---|
| install | `pnpm install --frozen-lockfile` | 0 | 5568 ms | PASS; package.json y pnpm-lock.yaml sin cambios |
| csp unit | `pnpm exec vitest run src/lib/__tests__/csp.test.ts` | 0 | 2654 ms | PASS 2/2 |
| typecheck | `pnpm typecheck` | 0 | 12539 ms | PASS |
| lint | `pnpm lint` | 0 | 12326 ms | PASS (0 errors, 11 warnings preexistentes; artifacts-panel usaba fetch, ahora apiFetch) |
| test | `pnpm test` | 0 | 15782 ms | PASS 179 files / 1552 tests |

Clasificación del baseline rojo inicial: **ambiente/dependencias** (confirmado). No era `f690d48`.

## Tasks 1–4

- Task 1: `941c1a2` test(artifacts): lock read-only index contract — 14 tests índice; RED inicial `Failed to resolve import "../artifacts-index"`.
- Task 2: `aab1ae9` refactor(artifacts): isolate authenticated index BFF — 3 tests route (401 / viewer 200 / degraded 200).
- Task 3: `bed090b` feat(artifacts): expose source freshness and degraded state — 8 tests panel; RED en status degradado, fuente y label.
- Task 4: `8d27693` test(security): pin artifact preview CSP and sandbox — pines localhost + tailnet + no `frame-src *`. Código CSP ya los tenía; no se amplió sandbox.
- Push: `55a5b18..8d27693` → `origin/feat/hlx-539-artifacts-v1-cursor`
- Fuera de alcance respetado: sin sidecars, PATCH, favoritos, merge, deploy, dependencias nuevas.
- Task 4b (Design Mode): `8ac68e2` `unsafe-eval` sólo en development + `suppressHydrationWarning` en el script de tema.

## Task 5 — Smoke E2E

Commit: `5c40d24 test(e2e): cover artifacts discovery and preview flow`

Archivos: `tests/artifacts-panel.spec.ts`, `tests/fixtures/artifacts-v1/{live,docs}/*.html`, `playwright.config.ts` (`ARTIFACTS_DIR` + `MC_ARTIFACTS_URL`), `scripts/e2e-openclaw/start-e2e-server.mjs` (copia `.next/static` y `public/` al standalone, igual que `start-standalone.sh`).

Caracterización del panel existente + harness. RED reales antes de verde:

| Intento | Causa | Clasificación |
|---|---|---|
| 15 | Chromium Playwright no instalado | ambiente |
| 17 | login por formulario no sale de `/login` (hidratación) | harness; se pasó a `page.request.post('/api/auth/login')` |
| 18–19 | splash 45s: standalone sin `/_next/static` | harness E2E |
| 20 | boot OK; `artifacts is available in Full mode` | preexistente `interfaceMode=essential` |
| 21 | desktop PASS; móvil espera `Main navigation` (rail hidden) | spec |
| 22 | 2 passed (2.8s) | GREEN |

No se copió `~/artifacts`. Fixture sintético. Iframe: se afirma `src` `/a/`, `sandbox="allow-scripts"`, link `/v/`; no se espera que el documento remoto cargue.

## Task 6 — Quality gate

Corrido 2026-08-16 19:04–19:06 CST. Todos exit 0.

| Gate | Comando | Exit | Duración | Resultado |
|---|---|---|---|---|
| index unit | `pnpm exec vitest run src/lib/__tests__/artifacts-index.test.ts` | 0 | 1414 ms | PASS 14/14 |
| panel unit | `pnpm exec vitest run src/components/panels/__tests__/artifacts-panel.test.tsx` | 0 | 1556 ms | PASS 8/8 |
| csp unit | `pnpm exec vitest run src/lib/__tests__/csp.test.ts` | 0 | 1264 ms | PASS 3/3 |
| typecheck | `pnpm typecheck` | 0 | 10753 ms | PASS |
| lint | `pnpm lint` | 0 | 11739 ms | PASS 0 errors, 10 warnings preexistentes `no-restricted-syntax` (bare fetch en otros paneles) |
| test | `pnpm test` | 0 | 12849 ms | PASS 182 files / 1578 tests |
| build | `pnpm build` | 0 | 48415 ms | PASS + `artifact:prepare` |
| e2e | `pnpm exec playwright test tests/artifacts-panel.spec.ts` | 0 | 4370 ms | PASS 2/2 |
| artifact:check | `pnpm artifact:check` | 0 | 720 ms | `status: ok`, 41 boundary files |
| whitespace | `git diff --check origin/main..HEAD` | 0 | 36 ms | limpio |

Alcance `git diff --name-only origin/main..HEAD`: plan, artifacts BFF/index/panel/tests, CSP (`csp.ts`, `proxy.ts`, `layout.tsx`), E2E spec/fixtures/harness. Sin dependencias nuevas, sin auth global, sin DB, sin deploy, sin `~/artifacts`, sin merge.

## Task 7 — Handoff

- Rollback local: `git switch main && git branch -D feat/hlx-539-artifacts-v1-cursor` (no borra el remoto).
- Deuda Atlas: sidecars, estados, PATCH, favoritos, comentarios, shares, 409, CSP derivado de config.
- Deuda E2E: Artefactos no está en `ESSENTIAL_PANELS`; el smoke hace click en “Switch to Full”.
- OpenClaw doctor / Command Center: fuera de esta rama (Musa mató Command Center; no `--fix`).
- No Linear Done. No merge. No deploy.


## Evidencia — Task 0 baseline (sección E)

Corrido 2026-08-16 18:15–18:16 CST en `/Users/doctor/dev/mission-control`. Sin `pnpm install`. Sin editar código de producto. Sin build / E2E / artifact:check.

| Gate | Comando | Exit | Duración | Resultado |
|---|---|---|---|---|
| pnpm/corepack | `corepack pnpm --version` | 127 | 16 ms | FAIL |
| node | `node --version` | 0 | 25 ms | PASS (`v22.23.1`) |
| git status | `git status --short --branch` | 0 | 34 ms | PASS |
| git whitespace | `git diff --check origin/main..HEAD` | 0 | 27 ms | PASS (stdout/stderr vacíos) |
| verify:node | `pnpm run verify:node` | 0 | 6383 ms | PASS |
| csp unit | `pnpm exec vitest run src/lib/__tests__/csp.test.ts` | 243 | 580 ms | FAIL |
| typecheck | `pnpm typecheck` | 1 | 733 ms | FAIL |
| lint | `pnpm lint` | 1 | 800 ms | FAIL |
| test | `pnpm test` | 1 | 794 ms | FAIL |

Diagnóstico auxiliar (no es el comando de la sección E): `pnpm --version` → `10.29.3` (coincide con `packageManager` en package.json). `pnpm-lock.yaml` presente. `node_modules/` ausente. `corepack` no está en PATH.

### 1. `corepack pnpm --version`

- Clasificación: **ambiente/dependencias**
- No es preexistente de producto ni causado por `f690d48`.
- stdout: (vacío)
- stderr:

```text
run_cmd:6: command not found: corepack
```

`command -v corepack` en zsh: not found. Existe `/Users/doctor/.hermes/node/bin/corepack` pero ese directorio no está en PATH (sí hay symlink de `node` en `~/.local/bin`). `/usr/local/bin` es `drwx------ root wheel`.

### 2. `node --version`

- stdout: `v22.23.1`
- stderr: (vacío)
- `engines.node` del repo: `>=22`. No se declara fallo.

### 3. `git status --short --branch`

- stdout:

```text
## feat/hlx-539-artifacts-v1-cursor...origin/feat/hlx-539-artifacts-v1-cursor
?? .hermes/experiments/
```

El untracked es la bitácora/logs de Task 0, no producto.

### 4. `git diff --check origin/main..HEAD`

- stdout/stderr vacíos, exit 0. Sin errores de whitespace en el rango.

### 5. `pnpm run verify:node`

- stdout:

```text
> mission-control@2.2.0 verify:node /Users/doctor/dev/mission-control
> node scripts/check-node-version.mjs
```

- stderr: (vacío)
- No requiere `node_modules`.

### 6. `pnpm exec vitest run src/lib/__tests__/csp.test.ts`

- Clasificación: **ambiente/dependencias**
- Primera causa verificable: no existe `node_modules/` (ni `node_modules/.bin/vitest`). pnpm no llegó a ejecutar el test de CSP.
- No se puede atribuir a `f690d48` ni a un fallo del test: el runner no arrancó.
- stdout:

```text
undefined
ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command failed with EACCES: vitest run src/lib/__tests__/csp.test.ts
spawn vitest EACCES
```

- stderr: (vacío)
- Evidencia de entorno: `ls node_modules` → `No such file or directory`. `ls /usr/local/bin/vitest` → `Permission denied`.

### 7. `pnpm typecheck`

- Clasificación: **ambiente/dependencias**
- Primera causa verificable: `sh: tsc: command not found` después de `verify:node` OK; pnpm advierte `node_modules missing`.
- stdout:

```text
> mission-control@2.2.0 typecheck /Users/doctor/dev/mission-control
> pnpm run verify:node && tsc --noEmit

> mission-control@2.2.0 verify:node /Users/doctor/dev/mission-control
> node scripts/check-node-version.mjs

ELIFECYCLE Command failed.
WARN  Local package.json exists, but node_modules missing, did you mean to install?
```

- stderr: `sh: tsc: command not found`

### 8. `pnpm lint`

- Clasificación: **ambiente/dependencias**
- Primera causa verificable: `sh: eslint: command not found`; misma ausencia de `node_modules`.
- stdout:

```text
> mission-control@2.2.0 lint /Users/doctor/dev/mission-control
> pnpm run verify:node && eslint .

> mission-control@2.2.0 verify:node /Users/doctor/dev/mission-control
> node scripts/check-node-version.mjs

ELIFECYCLE Command failed.
WARN  Local package.json exists, but node_modules missing, did you mean to install?
```

- stderr: `sh: eslint: command not found`

### 9. `pnpm test`

- Clasificación: **ambiente/dependencias**
- Primera causa verificable: `sh: vitest: command not found`; misma ausencia de `node_modules`.
- stdout:

```text
> mission-control@2.2.0 test /Users/doctor/dev/mission-control
> pnpm run verify:node && vitest run

> mission-control@2.2.0 verify:node /Users/doctor/dev/mission-control
> node scripts/check-node-version.mjs

ELIFECYCLE Test failed. See above for more details.
WARN  Local package.json exists, but node_modules missing, did you mean to install?
```

- stderr: `sh: vitest: command not found`

## Clasificación de fallos

Ningún fallo de este baseline se clasifica como:

- preexistente de código (no se ejecutó el suite; no hay evidencia de tests rojos del WIP);
- causado por `f690d48` (el WIP no elimina `node_modules`; está gitignored);
- flaky (fallos deterministas, reproducidos en un solo intento con la misma causa).

Todos los FAIL son **ambiente/dependencias**.

## Qué no se hizo (restricciones Task 0)

- No `pnpm install`.
- No ediciones en `src/`.
- No corrección de corepack/PATH.
- No build, E2E, ni `artifact:check`.
- No commit ni push.

## Recomendación hacia Task 1

**BLOCKED.** Task 1 exige pruebas de caracterización/RED con Vitest. Sin `node_modules` no hay runner, y un test que ni arranca no cuenta como RED verificado.

Desbloqueo propuesto (requiere autorización explícita; no es código de producto ni dependencia nueva): `pnpm install` con el lockfile existente, luego re-correr los gates 6–9. `corepack` ausente no bloquea si se usa `pnpm` 10.29.3 ya presente.
