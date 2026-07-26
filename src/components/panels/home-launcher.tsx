'use client'

// Home ADHD-friendly del fork (HLX-299): "cabina apagada — solo brillan las puertas".
// Un launcher centrado de tiles-app grandes, UN número vivo por tile, y el único
// pulso permitido (ámbar te-necesita) cuando algo espera a Musa. Cero charts aquí:
// una decisión por pantalla; el Dashboard denso vive en el tile Cockpit.
//
// v2 (feedback Musa 26-jul): escala +33%, tipografía mono del Brand Book,
// color único por módulo para identificarlos, iconos pixel-art 8-bit (vibra
// Tibia años 90/2000). Ámbar sigue siendo lo ÚNICO que pulsa.

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSmartPoll } from '@/lib/use-smart-poll'

interface TileStat {
  value: number | null
  needsYou: boolean
}

interface Tile {
  id: string
  label: string
  sub: string
  color: string
  pixels: string[]
  statKey: keyof HomeStats
}

interface HomeStats {
  tasks: TileStat
  artifacts: TileStat
  agents: TileStat
  crons: TileStat
  github: TileStat
  quests: TileStat
  chat: TileStat
  cockpit: TileStat
}

const EMPTY: HomeStats = {
  tasks: { value: null, needsYou: false },
  artifacts: { value: null, needsYou: false },
  agents: { value: null, needsYou: false },
  crons: { value: null, needsYou: false },
  github: { value: null, needsYou: false },
  quests: { value: null, needsYou: false },
  chat: { value: null, needsYou: false },
  cockpit: { value: null, needsYou: false },
}

// Iconos 8-bit: grid de 'x' → un rect por píxel, crispEdges. Sin librerías.
function pxPath(rows: string[]): string {
  let d = ''
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === 'x') d += `M${x} ${y}h1v1h-1z`
    }
  })
  return d
}

function PixelIcon({ rows }: { rows: string[] }) {
  return (
    <svg
      viewBox={`0 0 ${rows[0].length} ${rows.length}`}
      className="w-12 h-12"
      shapeRendering="crispEdges"
      aria-hidden
    >
      <path d={pxPath(rows)} fill="currentColor" />
    </svg>
  )
}

// Pergamino de encargos
const PX_TASKS = [
  '..xxxxxxxx..',
  '.x........x.',
  '.x.xxxxxx.x.',
  '.x........x.',
  '.x.xxxxxx.x.',
  '.x........x.',
  '.x.xxxx...x.',
  '.x........x.',
  '.x........x.',
  '..xxxxxxxx..',
]
// Cofre del tesoro
const PX_ARTIFACTS = [
  '..xxxxxxxx..',
  '.x........x.',
  '.x........x.',
  '.xxxxxxxxxx.',
  '.x...xx...x.',
  '.x...xx...x.',
  '.x........x.',
  '.x........x.',
  '.xxxxxxxxxx.',
]
// Casco de la tripulación
const PX_AGENTS = [
  '...xxxxxx...',
  '..x......x..',
  '.x........x.',
  '.x.xx..xx.x.',
  '.x........x.',
  '.x........x.',
  '..x......x..',
  '...xx..xx...',
  '...x.xx.x...',
  '...xxxxxx...',
]
// Reloj de arena
const PX_CRONS = [
  '.xxxxxxxxxx.',
  '..x......x..',
  '...x....x...',
  '....x..x....',
  '.....xx.....',
  '.....xx.....',
  '....x..x....',
  '...x.xx.x...',
  '..x.xxxx.x..',
  '.xxxxxxxxxx.',
]
// Rama (branch) con dos nodos
const PX_GITHUB = [
  '.xx.........',
  '.xx......xx.',
  '..x......xx.',
  '..x.....x...',
  '..x....x....',
  '..xxxxx.....',
  '..x.........',
  '..x.........',
  '.xx.........',
]
// Estrella de quest
const PX_QUESTS = [
  '.....xx.....',
  '.....xx.....',
  '....xxxx....',
  'xxxxxxxxxxxx',
  '.xxxxxxxxxx.',
  '...xxxxxx...',
  '..xxx..xxx..',
  '.xx......xx.',
]
// Burbuja de chat
const PX_CHAT = [
  '..xxxxxxxx..',
  '.x........x.',
  '.x........x.',
  '.x........x.',
  '.x........x.',
  '..xxxxxxxx..',
  '....xx......',
  '...x........',
]
// Cuadrícula del tablero denso
const PX_COCKPIT = [
  '.xxxxxxxxxx.',
  '.x...x....x.',
  '.x...x....x.',
  '.xxxxxxxxxx.',
  '.x...x....x.',
  '.x...x....x.',
  '.xxxxxxxxxx.',
]

// Un color por módulo (identificación, no semántica): el ámbar del Brand Book
// queda reservado al dot "te necesita" y el coral a errores reales.
const TILES: Tile[] = [
  { id: 'tasks', label: 'TASKS', sub: 'pendientes', statKey: 'tasks', color: '#6aa6ff', pixels: PX_TASKS },
  { id: 'artifacts', label: 'ARTIFACTS', sub: 'entregables', statKey: 'artifacts', color: '#f5c451', pixels: PX_ARTIFACTS },
  { id: 'agents', label: 'AGENTES', sub: 'en el roster', statKey: 'agents', color: '#a78bfa', pixels: PX_AGENTS },
  { id: 'cron', label: 'CRONS', sub: 'programados', statKey: 'crons', color: '#46e0a0', pixels: PX_CRONS },
  { id: 'github', label: 'GITHUB', sub: 'PRs abiertos', statKey: 'github', color: '#e88bf7', pixels: PX_GITHUB },
  { id: 'quests', label: 'QUESTS', sub: 'del día', statKey: 'quests', color: '#f0982e', pixels: PX_QUESTS },
  { id: 'chat', label: 'CHAT', sub: 'con Helix', statKey: 'chat', color: '#5ad1e6', pixels: PX_CHAT },
  { id: 'dashboard', label: 'TABLERO', sub: 'vista densa', statKey: 'cockpit', color: '#a3e635', pixels: PX_COCKPIT },
]

async function safeJson(url: string): Promise<any | null> {
  try {
    const r = await fetch(url)
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  }
}

export function HomeLauncher() {
  const router = useRouter()
  const [stats, setStats] = useState<HomeStats>(EMPTY)

  const fetchStats = useCallback(async () => {
    const [tasks, artifacts, agents, cron, github] = await Promise.all([
      safeJson('/api/tasks'),
      safeJson('/api/artifacts'),
      safeJson('/api/agents'),
      safeJson('/api/cron?action=list'),
      safeJson('/api/github?action=prs'),
    ])
    const taskList: any[] = tasks?.tasks ?? (Array.isArray(tasks) ? tasks : [])
    const assigned = taskList.filter(t => ['assigned', 'inbox', 'review'].includes(t.status))
    const agentList: any[] = agents?.agents ?? (Array.isArray(agents) ? agents : [])
    const cronJobs: any[] = cron?.jobs ?? []
    setStats({
      tasks: { value: taskList.length ? assigned.length : taskList.length, needsYou: assigned.length > 0 },
      artifacts: { value: artifacts?.total ?? null, needsYou: false },
      agents: { value: agentList.length || null, needsYou: false },
      crons: { value: cronJobs.filter(j => j.enabled !== false).length || null, needsYou: false },
      github: { value: github?.openCount ?? null, needsYou: false },
      quests: { value: null, needsYou: false },
      chat: { value: null, needsYou: false },
      cockpit: { value: null, needsYou: false },
    })
  }, [])

  useSmartPoll(fetchStats, 60000)

  const needsYouCount = Object.values(stats).filter(s => s.needsYou).length

  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center px-6 py-10 font-mono">
      <p className="text-sm uppercase tracking-[0.44em] text-muted-foreground mb-3">
        Helix Mission Control
      </p>
      <h1 className="text-2xl text-primary tracking-[0.08em] mb-2">¿Dónde quieres estar?</h1>
      <p className="text-base text-muted-foreground mb-12">
        {needsYouCount > 0
          ? `${needsYouCount} ${needsYouCount === 1 ? 'área te necesita' : 'áreas te necesitan'}`
          : 'nada urgente — todo corre solo'}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 w-full max-w-[880px]" role="navigation" aria-label="Secciones">
        {TILES.map(tile => {
          const s = stats[tile.statKey]
          return (
            <button
              key={tile.id}
              onClick={() => router.push(`/${tile.id}`)}
              style={{ ['--tile' as string]: tile.color, borderColor: `${tile.color}40` }}
              className="group relative flex flex-col items-center gap-3 rounded-2xl border
                bg-card px-5 py-9 transition-all duration-75 ease-linear
                hover:border-[color:var(--tile)] hover:shadow-[0_0_28px_-8px_var(--tile)]
                hover:-translate-y-0.5
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {s.needsYou && (
                <span
                  aria-label="te necesita"
                  className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-warning motion-safe:animate-pulse"
                />
              )}
              <span
                style={{ color: tile.color }}
                className="transition-transform duration-75 ease-linear group-hover:scale-110"
              >
                <PixelIcon rows={tile.pixels} />
              </span>
              <span className="text-[15px] tracking-[0.18em]">{tile.label}</span>
              <span className="text-sm text-muted-foreground leading-none">
                {s.value !== null ? (
                  <><span className="text-foreground tabular-nums">{s.value}</span> {tile.sub}</>
                ) : (
                  tile.sub
                )}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
