# FORK.md — Helix Mission Control

Este repo es un **fork con divergencia deliberada** de [builderz-labs/mission-control](https://github.com/builderz-labs/mission-control).

- `origin` = github.com/musalabalpha/mission-control (canon nuestro)
- `upstream` = github.com/builderz-labs/mission-control (solo lectura)
- Branch de producción: `v2.1.0-deploy` (sirve en helix.tail304cfc.ts.net:8443 vía LaunchAgent `com.helix.mission-control`)

## Qué SÍ se acepta de upstream

Cherry-pick selectivo, nunca merge ciego de `upstream/main`:

- Fixes de seguridad
- Fixes del protocolo del gateway OpenClaw (compat de versiones)
- Bugfixes de infraestructura (build, Next.js, deps)

## Territorio propio — upstream NO lo pisa

Si un cherry-pick toca estos archivos, se resuelve a favor nuestro:

- Panel **Cockpit** (metas por horizontes, HLX-265)
- Panel **Sistema** (inventario del ecosistema, HLX-234)
- Navegación custom (link Artifacts :8446, agrupación OBSERVE)
- Patch de protocolo gateway 3..4 (si upstream lo pisa, re-aplicar)
- Branding Helix
- Adaptadores de sync del ecosistema (`src/lib/ecosystem/*`, endpoints cableados a datos reales)

## Cadencia de sync

- **Mensual** (o ante CVE): `git fetch upstream`, revisar `git log upstream/main --oneline` desde el último sync, cherry-pick solo lo que aplique según las listas de arriba.
- Después de cada sync: re-verificar gotchas conocidos (botón Doctor Fix debe seguir eliminado/inerte; patch protocolo 3..4 intacto) y correr `pnpm quality:gate`.

## Reglas de operación

- Fuente de verdad de datos = `~/dev/helix-ecosystem`; MC lee y renderiza, no edita estado del ecosistema.
- Secretos: nunca en archivos planos. Patrón 1Password → Keychain → runtime (ver `helix-ops/scripts/start-mission-control.sh`).
- Deploy: `pnpm build` → `launchctl kickstart -k gui/501/com.helix.mission-control` → smoke test en :8443.
- Revertir un deploy: `git checkout <commit-anterior>` + rebuild + kickstart.

## Gotchas verificados en el sync v2.2.0

- **`next.config.js` — clave duplicada.** Upstream v2.2.0 añadió su propio
  `outputFileTracingIncludes` arriba; nuestro parche del image-optimizer ya
  definía otra clave con el mismo nombre más abajo. En JS la segunda gana, así
  que el merge limpio borró en silencio `ops/templates`, `openapi.json` y
  `schema.sql` del standalone y reventó `artifact:prepare`. Ambos bloques van
  ahora en UNA sola clave. Ante cualquier sync futuro: `outputFileTracingIncludes`
  debe aparecer una sola vez.
- **Doctor `--fix` ya no devuelve `output`.** Upstream lo quitó porque el stdout
  crudo del comando puede arrastrar secretos. Se acepta (es fix de seguridad).
  Lo que SÍ conservamos es el manejo del puerto 18789 compartido con Tailscale
  Serve (`runDoctorCommand`, `gatewayStillReachableAfterRestartSkip`).
- **Botón Doctor Fix:** sigue eliminado. El test upstream
  `openclaw-maintenance-client-security` exigía `confirmation: 'fix_openclaw'`
  en el banner; se adaptó para afirmar la propiedad más fuerte (el banner no
  ejecuta acción alguna) en vez de readoptar el botón.
- **Checks de autorización antes de la DB.** En `agents/[id]/files` y
  `agents/[id]/soul`, `requireAgentSelfAccess` corre ahora antes del lookup de
  aislamiento y de `getDatabase()`. Upstream los ordenaba al revés.

Último sync con upstream: v2.2.0 (jul-2026) — merge del tag `v2.2.0`, 126 commits,
421 archivos, 10 conflictos. `pnpm lint`/`typecheck`/`test` (1535) y `build` en verde.
