# Mission Control — Artefactos V1 con Cursor Implementation Plan

> **For Hermes:** Este plan se ejecuta manualmente con Cursor, tarea por tarea. No usar subagentes ni implementar fuera del alcance. Cursor debe registrar evidencia real de cada comando.

**Goal:** Convertir el WIP existente del panel Artefactos en un módulo V1 read-only confiable, probado y listo para revisión, sin fingir que completa todo Helix Atlas.

**Architecture:** Mission Control mantiene un BFF autenticado `GET /api/artifacts` que indexa el directorio canónico de artefactos y entrega una colección normalizada al panel. La UI permite buscar, filtrar por zona, previsualizar en iframe aislado y abrir la versión interactiva. La frescura y los estados degradados deben ser explícitos. No habrá escrituras, borrado, renombrado, favoritos, comentarios ni shares en esta entrega.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.9, Vitest, Testing Library, Playwright, pnpm 10.

---

## 0. Qué se está probando

Objetivo principal: terminar Artefactos V1.

Objetivo secundario: aprender el flujo de Cursor y dejar evidencia comparable contra Claude en el módulo 2.

No confundir ambos:

- Un buen resultado funcional vale más que una demo vistosa.
- No declarar que Cursor “ganó” por sensación.
- Registrar intervenciones, tiempo, defectos y pruebas.
- No comprar, contratar ni recomendar cursos o servicios pagados para completar la tarea.

## 1. Estado inicial verificado

Repositorio:

```text
/Users/doctor/dev/mission-control
```

Estado Git al redactar este plan:

```text
branch: main
HEAD: f690d485985addf632417adcb7f03ba6f8c613c9
origin/main: 3aed5d9e…
main ahead: 1 commit
worktree: limpio
```

Commit WIP:

```text
f690d48 wip: panel de artifacts + endurecimiento de CSP
```

Cambios frente a `origin/main`:

```text
src/app/api/artifacts/route.ts            | 128 +++++++++++++---
src/components/panels/artifacts-panel.tsx | 236 +++++++++++++++++++++++-------
src/lib/__tests__/csp.test.ts             |   1 +
src/lib/csp.ts                            |   3 +-
4 files changed, 300 insertions(+), 68 deletions(-)
```

Existe especificación mayor:

```text
docs/plans/2026-07-22-helix-atlas-artifacts-redesign.md
```

Esa especificación diseña Helix Atlas completo. El WIP actual sólo cubre una biblioteca read-only parcial. Por tanto:

- **Esta entrega cierra Artefactos V1 read-only.**
- **No cierra HLX-434 completo.**
- HLX-434 debe conservar fases futuras: sidecars, estados, edición, favoritos, comentarios, shares y conflictos `409`.

Issue programa:

```text
HLX-539
```

Issue histórico Atlas:

```text
HLX-434
```

## 2. Alcance congelado

### Dentro

1. Índice read-only de HTML bajo `ARTIFACTS_DIR`.
2. Zonas actuales:
   - `live`
   - `log/decisiones`
   - `log/incidentes`
   - `docs`
   - `radares`
   - `drafts`
   - `projects`
   - `archive`
   - `root` como fallback honesto.
3. Recursión sólo donde ya está decidida: `projects`.
4. Título desde `<title>`, con fallback al filename.
5. Orden descendente por modificación.
6. URLs correctas:
   - preview: `/a/<ruta codificada>`
   - interactivo: `/v/<ruta codificada>`
7. Búsqueda por título y filename.
8. Filtro por zona.
9. Preview con sandbox restrictivo.
10. Fuente, última actualización y estado degradado visibles.
11. Pruebas unitarias, de componente, CSP y smoke E2E.
12. Build reproducible, commit y push a rama feature.

### Fuera

- Sidecars `.meta.json` como modelo completo.
- Estados `Sin revisar`, draft, revisión, aprobado, obsoleto.
- Escritura de metadatos.
- Favoritos.
- Comentarios.
- Shares.
- `PATCH` o `POST` de artefactos.
- Concurrencia/ETag/`409`.
- Borrado o renombrado.
- Publicación abierta a internet.
- Rediseño general de Mission Control.
- Arreglar el ref roto `backup/pre-migracion-20260806`; evitar `git log --all`.
- Merge a `main`.
- Deploy.

## 3. Definition of Done

Artefactos V1 sólo puede declararse listo para revisión si:

- [ ] rama feature aislada creada desde `f690d48`;
- [ ] baseline registrado antes de editar;
- [ ] endpoint exige rol `viewer`;
- [ ] índice cubierto con filesystem temporal real;
- [ ] ruta ausente/ilegible produce degradación explícita, no falso verde;
- [ ] títulos, zonas, encoding, recursión y orden probados;
- [ ] UI muestra fuente y frescura;
- [ ] búsqueda y filtros funcionan;
- [ ] selección se conserva cuando el artefacto sigue presente;
- [ ] preview usa `/a/`; botón usa `/v/`;
- [ ] iframe conserva `sandbox="allow-scripts"` sin `allow-same-origin`, popups ni top navigation;
- [ ] CSP permite exclusivamente los orígenes de Artifacts necesarios;
- [ ] móvil 390 px y escritorio 1440×900 no rompen navegación;
- [ ] `pnpm lint` pasa;
- [ ] `pnpm typecheck` pasa;
- [ ] `pnpm test` pasa;
- [ ] `pnpm build` pasa;
- [ ] smoke E2E del módulo pasa;
- [ ] no hay secrets ni rutas privadas expuestas en JSON;
- [ ] tree limpio;
- [ ] commits descriptivos;
- [ ] push de rama feature exitoso;
- [ ] SHA final registrado;
- [ ] no merge ni deploy sin OK de Musa.

## 4. Preparación al regresar

### Paso 1 — abrir la carpeta correcta

En Cursor:

```text
File → Open Folder… → /Users/doctor/dev/mission-control
```

No abrir `~/deploy/mission-control`. Ese es el artefacto desplegado, no el repositorio fuente.

### Paso 2 — crear rama segura

Abrir terminal integrada de Cursor:

```bash
cd /Users/doctor/dev/mission-control
git status --short --branch
git rev-parse HEAD
git switch -c feat/hlx-539-artifacts-v1-cursor
git add .hermes/plans/2026-08-16_151500-hlx-539-artifacts-v1-cursor.md
git commit -m "docs(artifacts): add Cursor execution plan"
git push -u origin feat/hlx-539-artifacts-v1-cursor
git status --short --branch
```

Esperado antes del switch:

```text
## main...origin/main [ahead 1]
?? .hermes/
f690d485985addf632417adcb7f03ba6f8c613c9
```

El único cambio permitido antes de crear la rama es el propio writing plan. Después de commitearlo en la rama feature, el tree debe quedar limpio.

**STOP** si:

- hay cualquier archivo modificado o nuevo aparte del writing plan;
- HEAD no es `f690d485985addf632417adcb7f03ba6f8c613c9`;
- la rama ya existe con contenido distinto;
- el push intenta actualizar `origin/main`.

### Paso 3 — iniciar bitácora experimental

Crear al comenzar:

```text
.hermes/experiments/hlx-539-cursor-artifacts-v1.md
```

Contenido inicial:

```markdown
# Experimento Cursor — Artefactos V1

- Inicio:
- Fin:
- Modelo/modo de Cursor:
- HEAD inicial: f690d485985addf632417adcb7f03ba6f8c613c9
- Rama: feat/hlx-539-artifacts-v1-cursor
- Intervenciones de Musa: 0
- Comandos fallidos: 0
- Defectos encontrados en revisión: 0
- Dependencias/servicios pagados sugeridos: 0

## Intervenciones

| # | Hora | Qué pidió Cursor | Qué respondió Musa | Era indispensable |
|---|---|---|---|---|

## Evidencia

| Gate | Comando | Resultado | Duración |
|---|---|---|---|
```

## 5. Prompt maestro para pegar en Cursor

Pegar exactamente:

```text
Trabaja en /Users/doctor/dev/mission-control sobre la rama feat/hlx-539-artifacts-v1-cursor.

Lee primero, sin editar:
1. .hermes/plans/2026-08-16_151500-hlx-539-artifacts-v1-cursor.md
2. docs/plans/2026-07-22-helix-atlas-artifacts-redesign.md
3. src/app/api/artifacts/route.ts
4. src/components/panels/artifacts-panel.tsx
5. src/lib/csp.ts
6. src/lib/__tests__/csp.test.ts
7. package.json

Objetivo: cerrar Artefactos V1 read-only de forma confiable. NO implementar Helix Atlas completo. Respeta estrictamente “Dentro/Fuera” y Definition of Done del plan.

Disciplina:
- Antes de editar, ejecuta y registra baseline.
- El WIP f690d48 ya existía sin cobertura suficiente: agrega pruebas de caracterización honestamente. No las llames TDD si pasan de inicio.
- Para cualquier comportamiento nuevo o bug: RED → verificar fallo correcto → GREEN mínimo → refactor.
- Trabaja en vertical slices; no escribas todas las pruebas y luego toda la implementación.
- No inventes datos ni outputs.
- No cambies archivos ajenos al módulo.
- No arregles el ref roto backup/pre-migracion-20260806.
- No uses git log --all.
- No agregues dependencias salvo necesidad demostrada.
- No uses cursos, servicios pagados ni búsquedas externas como sustituto de entender el repo.
- No hagas merge ni deploy.
- Commit frecuente y push sólo de la rama feature.
- Actualiza .hermes/experiments/hlx-539-cursor-artifacts-v1.md con evidencia real.

Primero responde únicamente con:
A) tu lectura del estado actual;
B) huecos contra Artefactos V1;
C) secuencia de tareas;
D) riesgos;
E) comandos exactos de baseline.

Espera mi “procede” antes de editar.
```

## 6. Baseline obligatorio

Cursor debe correr, sin corregir todavía:

```bash
cd /Users/doctor/dev/mission-control
corepack pnpm --version
node --version
git status --short --branch
git diff --check origin/main..HEAD
pnpm run verify:node
pnpm exec vitest run src/lib/__tests__/csp.test.ts
pnpm typecheck
pnpm lint
pnpm test
```

Registrar salida y duración. Si algún gate falla, distinguir:

- preexistente;
- causado por `f690d48`;
- ambiente/dependencias;
- prueba flaky.

No “arreglar de pasada”.

## 7. Plan de implementación

### Task 1: Congelar contrato Artefactos V1

**Objective:** Definir tipos compartidos y metadata de frescura sin ampliar alcance.

**Files:**

- Create: `src/lib/artifacts-index.ts`
- Create: `src/lib/__tests__/artifacts-index.test.ts`
- Modify: `src/app/api/artifacts/route.ts`

Contrato mínimo:

```ts
export type ArtifactZone =
  | 'live'
  | 'log/decisiones'
  | 'log/incidentes'
  | 'docs'
  | 'radares'
  | 'drafts'
  | 'projects'
  | 'archive'
  | 'root'

export interface ArtifactSummaryV1 {
  name: string
  title: string
  zone: ArtifactZone
  updatedAt: number
  url: string
  previewUrl: string
}

export interface ArtifactIndexV1 {
  artifacts: ArtifactSummaryV1[]
  zones: Array<{ id: string; label: string; blurb: string; count: number }>
  total: number
  generatedAt: number
  newestArtifactAt: number | null
  source: 'artifacts-server'
  status: 'ok' | 'degraded'
  notice: string | null
  galleryUrl: string
}
```

No devolver `ARTIFACTS_DIR` al navegador.

**Characterization tests:**

Usar `mkdtempSync`, `writeFileSync`, `utimesSync` y `rmSync` para un árbol temporal real. Cubrir:

1. HTML de raíz → zona `root`.
2. HTML en `live` → zona `live`.
3. `projects/a/b/report.html` → incluido recursivamente.
4. Otros directorios no recursivos → no inventar recursión.
5. `.git`, `.trash`, `node_modules` y nombres ocultos → ignorados.
6. `<title>` → título normalizado.
7. Sin `<title>` → filename.
8. Segmentos con espacios/acentos → encoding por segmento.
9. `/a/` para preview y `/v/` para interactivo.
10. Orden descendente por mtime.
11. Duplicados → una sola entrada.
12. directorio ausente → `degraded`, colección vacía, notice no nulo.
13. `generatedAt` presente; `newestArtifactAt` correcto.

Para comportamientos que ya existen, etiquetar tests como caracterización. Para metadata nueva (`generatedAt`, `status`, `notice`), escribir prueba RED primero y observar el fallo esperado.

**Commit:**

```bash
git add src/lib/artifacts-index.ts src/lib/__tests__/artifacts-index.test.ts src/app/api/artifacts/route.ts
git commit -m "test(artifacts): lock read-only index contract"
```

Si hubo implementación nueva separable, usar dos commits: test RED y feature GREEN sólo si el repo permite conservar un commit rojo temporal en la rama; de lo contrario mantener el ciclo documentado en bitácora y commitear verde.

### Task 2: Reducir el route handler a BFF autenticado

**Objective:** Evitar lógica de filesystem incrustada en el handler y conservar autorización `viewer`.

**Files:**

- Modify: `src/app/api/artifacts/route.ts`
- Test: `src/lib/__tests__/artifacts-index.test.ts`
- Optional test only if existing auth harness makes it cheap: `tests/artifacts-api.spec.ts`

Forma esperada:

```ts
export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  return NextResponse.json(
    buildArtifactIndex({
      artifactsDir: ARTIFACTS_DIR,
      artifactsUrl: ARTIFACTS_URL,
      now: Date.now(),
    }),
  )
}
```

No agregar endpoints de escritura.

Pruebas:

- sin credenciales → no acceso;
- viewer → `200`;
- directorio ausente → `200` degradado, no `500`;
- respuesta no expone ruta local.

**Commit:**

```bash
git add src/app/api/artifacts/route.ts src/lib/__tests__/artifacts-index.test.ts tests/artifacts-api.spec.ts
git commit -m "refactor(artifacts): isolate authenticated index BFF"
```

Omitir del `git add` cualquier archivo no creado.

### Task 3: Mostrar verdad y frescura en UI

**Objective:** Que el panel no confunda “cargó” con “está actualizado”.

**Files:**

- Modify: `src/components/panels/artifacts-panel.tsx`
- Create: `src/components/panels/__tests__/artifacts-panel.test.tsx`

Primero agregar prueba RED para comportamiento nuevo:

```text
Dado status=degraded y notice="Galería no disponible",
el panel muestra estado degradado y no presenta falso verde.
```

Agregar pruebas de caracterización para:

- carga inicial;
- conteo total/filtrado;
- búsqueda por título;
- búsqueda por filename;
- filtro por zona;
- selección inicial;
- preservación de selección después de refresh;
- fallback al primer resultado cuando el seleccionado desaparece;
- preview URL;
- botón interactivo;
- iframe sandbox exacto.

UI mínima nueva:

```text
Fuente: Artifacts Server · actualizado hace N
```

Semántica:

- `generatedAt`: momento en que MC consultó.
- `newestArtifactAt`: frescura del artefacto más reciente.
- `status=degraded`: badge visible, notice visible.
- Error de red: mensaje de error; conservar datos anteriores si ya existían, pero marcarlos como stale/degradados.

No agregar animaciones, cards nuevas, favoritos ni inspector editable.

Accesibilidad:

- búsqueda con label accesible;
- botones de zona con `aria-pressed`;
- iframe con `title`;
- foco `/` sin secuestrar inputs/textareas;
- estado degradado con semántica legible, no sólo color.

**Commit:**

```bash
git add src/components/panels/artifacts-panel.tsx src/components/panels/__tests__/artifacts-panel.test.tsx
git commit -m "feat(artifacts): expose source freshness and degraded state"
```

### Task 4: Cerrar CSP y sandbox

**Objective:** Permitir previews necesarios sin ampliar permisos del iframe.

**Files:**

- Modify: `src/lib/csp.ts` sólo si las pruebas revelan hueco.
- Modify: `src/lib/__tests__/csp.test.ts`
- Modify: `src/components/panels/artifacts-panel.tsx` sólo si sandbox no coincide.

Pruebas exactas:

```ts
expect(csp).toContain('http://127.0.0.1:8446')
expect(csp).toContain('http://localhost:8446')
expect(csp).toContain('https://helix.tail304cfc.ts.net:8446')
expect(csp).not.toContain("frame-src *")
```

Iframe permitido:

```html
sandbox="allow-scripts"
```

Prohibido agregar:

```text
allow-same-origin
allow-popups
allow-top-navigation
allow-forms
```

Nota: la especificación mayor pide origen configurado exacto. En V1 mantener los tres orígenes existentes por compatibilidad local/tailnet; registrar como deuda que la fase Atlas completa debe derivar CSP desde configuración validada.

**Commit:**

```bash
git add src/lib/csp.ts src/lib/__tests__/csp.test.ts src/components/panels/artifacts-panel.tsx
git commit -m "test(security): pin artifact preview CSP and sandbox"
```

### Task 5: Smoke E2E del módulo

**Objective:** Probar el flujo observable, no sólo funciones.

**Files:**

- Create: `tests/artifacts-panel.spec.ts`
- Modify only if necessary: `playwright.config.ts`

No depender de `~/artifacts` real en E2E. Crear fixture temporal y pasar `ARTIFACTS_DIR` al webServer o usar el patrón de fixtures ya existente. No meter archivos de Musa al repositorio.

Flujo escritorio:

1. autenticar con harness existente;
2. abrir `/artifacts`;
3. confirmar lista y fuente;
4. buscar artefacto conocido;
5. filtrar zona;
6. seleccionar;
7. verificar `iframe[src*="/a/"]`;
8. verificar enlace interactivo `href*="/v/"`.

Flujo móvil:

```ts
await page.setViewportSize({ width: 390, height: 844 })
```

Confirmar:

- lista accesible;
- preview debajo, sin overflow horizontal destructivo;
- búsqueda utilizable.

No exigir que el iframe remoto termine de cargar en CI. Verificar contrato `src`, sandbox y fallback.

**Commit:**

```bash
git add tests/artifacts-panel.spec.ts playwright.config.ts
git commit -m "test(e2e): cover artifacts discovery and preview flow"
```

### Task 6: Quality gate y revisión de scope

**Objective:** Probar que el módulo no rompió Mission Control.

Correr en orden:

```bash
pnpm exec vitest run src/lib/__tests__/artifacts-index.test.ts
pnpm exec vitest run src/components/panels/__tests__/artifacts-panel.test.tsx
pnpm exec vitest run src/lib/__tests__/csp.test.ts
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm exec playwright test tests/artifacts-panel.spec.ts
pnpm artifact:check
git diff --check origin/main..HEAD
git status --short --branch
```

Registrar output real, conteos y duración. No escribir “PASS” sin comando.

Revisar alcance:

```bash
git diff --name-only origin/main..HEAD
git diff --stat origin/main..HEAD
git log --oneline origin/main..HEAD
```

Esperado: sólo archivos de Artefactos, CSP, pruebas y bitácora/plan.

**STOP** si aparece:

- dependencia nueva no aprobada;
- cambio a auth global;
- cambio a deploy scripts;
- cambio a base de datos;
- escrituras en artifacts;
- secreto o token;
- archivos de `~/artifacts` copiados al repo;
- intento de merge/deploy.

### Task 7: Handoff verificable

**Objective:** Dejar rama revisable, no desplegada.

Actualizar:

```text
.hermes/experiments/hlx-539-cursor-artifacts-v1.md
```

Incluir:

- tiempo total;
- modelo/modo Cursor;
- intervenciones de Musa;
- comandos fallidos;
- defectos encontrados;
- gates exactos;
- archivos cambiados;
- commits;
- SHA final;
- riesgos/deuda;
- rollback;
- si sugirió cursos/servicios pagados y por qué.

Commit final documental:

```bash
git add .hermes/experiments/hlx-539-cursor-artifacts-v1.md .hermes/plans/2026-08-16_151500-hlx-539-artifacts-v1-cursor.md
git commit -m "docs(artifacts): record Cursor implementation evidence"
git push
git status --short --branch
git rev-parse HEAD
```

Salida requerida de Cursor:

```markdown
## Resultado

- Estado: READY FOR REVIEW | BLOCKED
- Rama:
- SHA:
- Commits:
- Archivos cambiados:
- Tests y resultados reales:
- Build:
- E2E:
- Intervenciones de Musa:
- Tiempo:
- Dependencias agregadas:
- Cursos/servicios pagados sugeridos:
- Riesgos:
- Rollback:
- Pendiente para Helix Atlas completo:
```

No marcar Linear Done. No merge. No deploy.

## 8. Revisión de Musa al terminar Cursor

Musa no necesita leer todo el diff. Debe pedir estas cinco cosas:

1. `git status --short --branch`
2. `git log --oneline origin/main..HEAD`
3. último output de `pnpm test`
4. último output de `pnpm build`
5. screenshot escritorio + móvil del módulo

Preguntas:

- ¿Qué cambiaste que no estuviera en el plan?
- ¿Qué comportamiento viste fallar antes de corregirlo?
- ¿Qué queda fuera de Artefactos V1?
- ¿Qué dato prueba la frescura?
- ¿Cómo regresamos al estado anterior?

Rollback antes de merge:

```bash
git switch main
git branch -D feat/hlx-539-artifacts-v1-cursor
```

No ejecutar si se quiere conservar la rama. Después de push, el rollback local no borra la rama remota.

## 9. Rúbrica de Cursor

Puntuar 0–5:

| Dimensión | 0 | 5 |
|---|---|---|
| Comprensión del repo | inventó arquitectura | reutilizó patrones reales |
| Respeto de scope | amplió producto | cerró sólo V1 |
| Autonomía | Musa condujo cada paso | pidió sólo decisiones reales |
| TDD honesto | tests después disfrazados | distinguió caracterización y RED real |
| Calidad de pruebas | happy path | errores, frescura, seguridad, responsive |
| Evidencia | afirmó sin outputs | comandos, conteos, SHA |
| Simplicidad | dependencias/abstracciones gratuitas | solución mínima |
| Seguridad | amplió iframe/CSP | permisos mínimos |
| UX | pantalla bonita pero opaca | fuente/frescura/degradación claras |
| Handoff | “ya quedó” | rama, SHA, gates, rollback |
| Costo externo | curso/servicio innecesario | cero dependencia pagada |

Además registrar:

```text
Tiempo humano:
Tiempo máquina:
Intervenciones:
Tokens/costo visible en Cursor:
Defectos encontrados por revisión:
Regresiones:
```

## 10. Qué sigue después

Sólo después de revisar la rama Cursor:

1. decidir `merge / corregir / descartar`;
2. si se aprueba, solicitar OK separado para merge;
3. después solicitar OK separado para deploy;
4. verificar producción contra SHA exacto;
5. actualizar HLX-539 y el canon Obsidian con evidencia;
6. preparar módulo 2 para Claude: preferentemente **Bandeja de Decisión**, por tamaño comparable;
7. usar la misma rúbrica y límites;
8. comparar resultados sin declarar causalidad fuerte por una sola tarea.

## 11. Resumen de 90 segundos para Musa

Al regresar:

1. Abre Cursor en `/Users/doctor/dev/mission-control`.
2. Crea `feat/hlx-539-artifacts-v1-cursor` desde `f690d48`.
3. Pega el prompt maestro.
4. Cursor primero analiza; no dejes que edite todavía.
5. Lee su A/B/C/D/E.
6. Si respeta alcance, responde: `procede tarea por tarea; registra evidencia`.
7. No lo ayudes de inmediato: cada intervención cuenta.
8. Al final exige rama, SHA, tests, build, E2E y screenshots.
9. No merge ni deploy todavía.
