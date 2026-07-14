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

## Registro de syncs

- **v2.1.0** (jul-2026) — sync base del fork.
- **jul-2026 (Fase 0, HLX-336)** — cherry-picks selectivos de `upstream/main` (deps-dev, sin tocar territorio propio):
  - `@types/node` 22.20.0 → 26.0.1 (upstream #761 / `24fc59e`)
  - `jsdom` 26.1.0 → 29.1.1 (upstream #764 / `c96c9da`)
  - Gate post-sync: `pnpm test:all` verde antes de deploy.
