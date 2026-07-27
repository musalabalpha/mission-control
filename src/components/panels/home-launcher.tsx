'use client'

// Home ADHD-friendly del fork (HLX-299): "cabina apagada — solo brillan las puertas".
// Un launcher centrado de tiles-app grandes, UN número vivo por tile, y el único
// pulso permitido (ámbar te-necesita) cuando algo espera a Musa. Cero charts aquí:
// una decisión por pantalla; el Dashboard denso vive en el tile Cockpit.
//
// v3 (HLX-299 v2, propuesta "HLX Command Center" aprobada por Musa 26-jul):
// sello real de marca ("El Vigía", brand/helix/assets/helix-mark.svg, Solar
// Yellow #FFD600) al centro; "HLX" pequeño arriba; sprites pixel-art de 2
// frames (crosshair/holocrón/droide/despertador/ADN/!/burbuja/cuadrícula);
// el nombre del módulo ya no se imprime en la tile — vive en aria-label +
// un tooltip HUD discreto que aparece junto al bracket inferior al hover;
// el contador deja de ser texto fijo y se vuelve badge de notificación
// (número, color del módulo; si needsYou, ámbar y pulsa — sigue siendo el
// único pulso). Starfield/scanlines/telemetría del navegador/runa oculta/
// Konami code: decoración autocontenida al componente, cero JS pesado,
// cero dependencias nuevas.

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSmartPoll } from '@/lib/use-smart-poll'

interface TileStat {
  value: number | null
  needsYou: boolean
}

interface Tile {
  id: string
  spriteKey: string
  name: string
  desig: string
  color: string
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

// Sprites 8-bit de 2 frames: cada tile trae su propia paleta (3-4 tonos,
// letra -> hex) y dos grids de 20x20 (fila = string, char = tono, '.' = vacío).
// El crossfade de frames es puro CSS (steps(1), ver <style jsx> al final).
const SPRITES: Record<string, { palette: Record<string, string>; a: string[]; b: string[] }> = {
  tasks: {
    palette: { k: "#1a1626", m: "#3f6399", h: "#94e8ff" },
    a: [
      "....................",
      "....................",
      ".........hm.........",
      "......hh.hh.mm......",
      ".....h...mm...m.....",
      "....h...hmmm...m....",
      "...h..hh....mm..m...",
      "...h..h......m..m...",
      ".....h........m.....",
      "..hhmm........mmhm..",
      "..mhmm........mmhm..",
      ".....m........m.....",
      "...m..m......m..m...",
      "...m..mm....mm..m...",
      "....m...mmmm...m....",
      ".....m...mm...m.....",
      "......mm.hh.mm......",
      ".........mm.........",
      "....................",
      "....................",
    ],
    b: [
      "....................",
      "....................",
      ".........hm.........",
      "......hh.hh.mm......",
      ".....h...mm...m.....",
      "....h...hmmm...m....",
      "...h..hh.mm.mm..m...",
      "...h..h......m..m...",
      ".....h........m.....",
      "..hhmmm..hh..mmmhm..",
      "..mhmmm..hh..mmmhm..",
      ".....m........m.....",
      "...m..m......m..m...",
      "...m..mm.mm.mm..m...",
      "....m...mmmm...m....",
      ".....m...mm...m.....",
      "......mm.hh.mm......",
      ".........mm.........",
      "....................",
      "....................",
    ],
  },
  artifacts: {
    palette: { k: "#1a1626", m: "#8a6a1f", h: "#fff2b0" },
    a: [
      "....................",
      "....................",
      "....................",
      "....................",
      "....hhmmmmmmmmhh....",
      "....hmmmmmmmmmmh....",
      "....mmkkkkkkkkmm....",
      "....mmkkkmmkkkmm....",
      "....mmkkmhhmkkmm....",
      "....mmkmhhhhmkmm....",
      "....mmkmhhhhmkmm....",
      "....mmkkmhhmkkmm....",
      "....mmkkkmmkkkmm....",
      "....mmkkkkkkkkmm....",
      "....hmmmmmmmmmmh....",
      "....hhmmmmmmmmhh....",
      "....................",
      "....................",
      "....................",
      "....................",
    ],
    b: [
      "....................",
      "....................",
      "....................",
      "....................",
      "....hhmmmmmmmmhh....",
      "....hmmmmmmmmmmh....",
      "....mmkkkkkkkkmm....",
      "....mmkkkhhkkkmm....",
      "....mmkkhhhhkkmm....",
      "....mmkhhhhhhkmm....",
      "....mmkhhhhhhkmm....",
      "....mmkkhhhhkkmm....",
      "....mmkkkhhkkkmm....",
      "....mmkkkkkkkkmm....",
      "....hmmmmmmmmmmh....",
      "....hhmmmmmmmmhh....",
      "....................",
      "....................",
      "....................",
      "....................",
    ],
  },
  agentes: {
    palette: { k: "#1a1626", m: "#5b4a8f", h: "#c9b8ff", x: "#ffffff" },
    a: [
      "....................",
      "....................",
      "........khhk........",
      "........khhk........",
      "........khhk........",
      ".......kmmmmk.......",
      ".....kkmmhhmmkk.....",
      ".kkkkmmmmhhmmmk.....",
      ".kkkkkkmmhhmmmk.....",
      ".......kmhhmmmk.....",
      ".......kmmmmmkk.....",
      ".......kmmkmk.......",
      ".......kmk.kmk......",
      ".......khk.khk......",
      ".......khk.khk......",
      ".......khk.khk......",
      ".......khk.khk......",
      ".......kmk.kmk......",
      "......kmmmkmmmk.....",
      "......kkkkkkkkk.....",
    ],
    b: [
      "....................",
      "....................",
      "........khhk........",
      "........khhk........",
      "........khhk........",
      ".......kmmmmk.......",
      ".....kkmmhhmmkk.....",
      ".....kmmmhhmmmk.....",
      ".....kkmmhhmmmk.....",
      "xkkkkk.kmhhmmmk.....",
      "xkkkkk.kmmmmmkk.....",
      ".......kmmkmk.......",
      ".......kmk.kmk......",
      ".......khk.khk......",
      ".......khk.khk......",
      ".......khk.khk......",
      ".......khk.khk......",
      ".......kmk.kmk......",
      "......kmmmkmmmk.....",
      "......kkkkkkkkk.....",
    ],
  },
  crons: {
    palette: { k: "#1a1626", m: "#1f7a5c", h: "#9df7d4" },
    a: [
      ".........hh.........",
      "....h....hh....h....",
      "....mm.........mm...",
      "....mm.........mm...",
      "....................",
      "....................",
      "......khhhmmmk......",
      ".....khh....mmk.....",
      "....kh........mk....",
      "....hh....h...mm....",
      "...kh.....h....mk...",
      "....h.....h....m....",
      "...mm.....hhh..mm...",
      "....m..........m....",
      "...km..........mk...",
      "....mm........mm....",
      "....km........mk....",
      ".....kmm....mmk.....",
      "......mmmmmmmm......",
      "......mm....mm......",
    ],
    b: [
      ".........hh.........",
      "...h.....hh.....h...",
      ".h.mm...........mmh.",
      "h..mm...........mm.h",
      "....................",
      "....................",
      "......khhhmmmk......",
      ".....khh....mmk.....",
      "....kh........mk....",
      "....hh....h...mm....",
      "...kh.....h....mk...",
      "....h.....h....m....",
      "...mm.....hhh..mm...",
      "....m..........m....",
      "...km..........mk...",
      "....mm........mm....",
      "....km........mk....",
      ".....kmm....mmk.....",
      "......mmmmmmmm......",
      "......mm....mm......",
    ],
  },
  github: {
    palette: { k: "#1a1626", m: "#8a4a99", h: "#ffd0fb" },
    a: [
      "....................",
      "....................",
      ".....m...k....h.....",
      "......m......h......",
      "........m..h........",
      "........h..m........",
      "......h......m......",
      ".....h........m.....",
      "......h..k...m......",
      "........h..m........",
      "........m..h........",
      "......m..k...h......",
      ".....m........h.....",
      "......m......h......",
      "........m..h........",
      "........h..m........",
      "......h......m......",
      ".....h...k....m.....",
      "....................",
      "....................",
    ],
    b: [
      "....................",
      "....................",
      "......m..k...h......",
      ".......m....h.......",
      ".........hm.........",
      ".......h.k..m.......",
      ".....h........m.....",
      "......h......m......",
      ".......h.k..m.......",
      ".........mh.........",
      ".......m....h.......",
      ".....m...k....h.....",
      "......m......h......",
      ".......m....h.......",
      ".........hm.........",
      ".......h....m.......",
      ".....h........m.....",
      "......h..k...m......",
      "....................",
      "....................",
    ],
  },
  quests: {
    palette: { k: "#1a1626", m: "#b3641c", h: "#ffce6b" },
    a: [
      "....................",
      "....................",
      "....................",
      "........khmk........",
      "........khmk........",
      "........khmk........",
      "........khmk........",
      "........khmk........",
      "........khmk........",
      "........khmk........",
      "........khmk........",
      "....................",
      "....................",
      "....................",
      "....................",
      "........khmk........",
      "........khmk........",
      "........khmk........",
      "....................",
      "....................",
    ],
    b: [
      "....................",
      "....................",
      "........khmk........",
      "........khmk........",
      "........khmk........",
      "........khmk........",
      "........khmk........",
      "........khmk........",
      "........khmk........",
      "........khmk........",
      "....................",
      "....................",
      "....................",
      "....................",
      "........khmk........",
      "........khmk........",
      "........khmk........",
      "....................",
      "....................",
      "....................",
    ],
  },
  chat: {
    palette: { k: "#1a1626", m: "#367d8a", h: "#5ad1e6", x: "#7dffff" },
    a: [
      "....................",
      "....................",
      "....................",
      "....................",
      ".......kkkkkk.......",
      ".....kkxxxxxmkk.....",
      "....kxxhhhhhhxmk....",
      "....kxhhhhhhhhmk....",
      "....kxhhkhhkhhmk....",
      "....kxhhhhhhhhmk....",
      "....kxhhhhhhhhmk....",
      "....kmmhhhhhhmmk....",
      ".....kkxmmmmmkk.....",
      ".....kxmkkkkk.......",
      "....kmmk............",
      ".....kk.............",
      "....................",
      "....................",
      "....................",
      "....................",
    ],
    b: [
      "....................",
      "....................",
      "....................",
      "....................",
      ".......kkkkkk.......",
      ".....kkxxxxxmkk.....",
      "....kxxhhhhhhxmk....",
      "....kxhhhhhhhhmk....",
      "....kxhkhhkhhkmk....",
      "....kxhhhhhhhhmk....",
      "....kxhhhhhhhhmk....",
      "....kmmhhhhhhmmk....",
      ".....kkxmmmmmkk.....",
      ".....kxmkkkkk.......",
      "....kmmk............",
      ".....kk.............",
      "....................",
      "....................",
      "....................",
      "....................",
    ],
  },
  tablero: {
    palette: { k: "#1a1626", m: "#618a1f", h: "#a3e635", x: "#e4ff4a" },
    a: [
      "....................",
      "....................",
      "....................",
      "....................",
      "...kkkk.kkkk.kkkk...",
      "..kxxxmkxxxmkxxxmk..",
      "..kxhhmkxhhmkxhhmk..",
      "..kxhhmkxhhmkxhhmk..",
      "..kmmmmkmmmmkmmmmk..",
      "...kkkk.kkkk.kkkk...",
      "..kxxxmkxxxmkxxxmk..",
      "..kxhhmkxhhmkxhhmk..",
      "..kxhhmkxhhmkxhhmk..",
      "..kmmmmkmmmmkmmmmk..",
      "...kkkk.kkkk.kkkk...",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
    ],
    b: [
      "....................",
      "....................",
      "....................",
      "....................",
      "...kkkk.kkkk.kkkk...",
      "..kxxxmkxxxxkxxxmk..",
      "..kxhhmkxxxxkxhhmk..",
      "..kxhhmkxxxxkxhhmk..",
      "..kmmmmkxxxxkmmmmk..",
      "...kkkk.kkkk.kkkk...",
      "..kxxxmkxxxmkxxxmk..",
      "..kxhhmkxhhmkxhhmk..",
      "..kxhhmkxhhmkxhhmk..",
      "..kmmmmkmmmmkmmmmk..",
      "...kkkk.kkkk.kkkk...",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
    ],
  },
}
function SpriteRows({ rows, palette }: { rows: string[]; palette: Record<string, string> }) {
  const rects: React.ReactNode[] = []
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const tone = row[x]
      if (tone === '.') continue
      rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={palette[tone]} />)
    }
  })
  return <>{rects}</>
}

function Sprite({ spriteKey }: { spriteKey: string }) {
  const s = SPRITES[spriteKey]
  if (!s) return null
  return (
    <svg viewBox="0 0 20 20" className="w-14 h-14" shapeRendering="crispEdges" aria-hidden>
      <g style={{ animation: 'sprFrameA .9s steps(1) infinite' }}>
        <SpriteRows rows={s.a} palette={s.palette} />
      </g>
      <g style={{ animation: 'sprFrameB .9s steps(1) infinite' }}>
        <SpriteRows rows={s.b} palette={s.palette} />
      </g>
    </svg>
  )
}

// Un color por módulo (identificación, no semántica): el ámbar del Brand Book
// queda reservado al badge "te necesita" y el coral a errores reales. El
// nombre del módulo vive en aria-label (a11y) y en un tag HUD que solo
// aparece al hover, junto al bracket inferior derecho.
const TILES: Tile[] = [
  { id: 'tasks', spriteKey: 'tasks', name: 'Tasks', desig: 'OPS-01 // QUEUE', statKey: 'tasks', color: '#6aa6ff' },
  { id: 'artifacts', spriteKey: 'artifacts', name: 'Artifacts', desig: 'OPS-02 // ARCHIVE', statKey: 'artifacts', color: '#f5c451' },
  { id: 'agents', spriteKey: 'agentes', name: 'Agentes', desig: 'OPS-03 // AUTONOMY', statKey: 'agents', color: '#a78bfa' },
  { id: 'cron', spriteKey: 'crons', name: 'Crons', desig: 'OPS-04 // CADENCE', statKey: 'crons', color: '#46e0a0' },
  { id: 'github', spriteKey: 'github', name: 'Github', desig: 'OPS-05 // FORGE', statKey: 'github', color: '#e88bf7' },
  { id: 'quests', spriteKey: 'quests', name: 'Quests', desig: 'OPS-06 // OBJECTIVES', statKey: 'quests', color: '#f0982e' },
  { id: 'chat', spriteKey: 'chat', name: 'Chat', desig: 'OPS-07 // COMMLINK', statKey: 'chat', color: '#5ad1e6' },
  { id: 'dashboard', spriteKey: 'tablero', name: 'Tablero', desig: 'OPS-08 // OVERWATCH', statKey: 'cockpit', color: '#a3e635' },
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

// Konami code: easter egg de "autonomía" — el color de estado correcto
// (morado = la IA actuó sola, Brand Book) en el único momento en que
// semánticamente aplica. Solo escucha mientras esta pantalla está montada.
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']

export function HomeLauncher() {
  const router = useRouter()
  const [stats, setStats] = useState<HomeStats>(EMPTY)
  const [clock, setClock] = useState('--:--:--')
  const [telemetry, setTelemetry] = useState<{ tz: string; cores: string; res: string; cycle: string; boot: string } | null>(null)
  const [autonomyFlash, setAutonomyFlash] = useState(false)
  const konamiPos = useRef(0)

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

  // Reloj real (HH:MM:SS) — decoración funcional, cero datos inventados.
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('es-MX', { hour12: false }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // Telemetría real del navegador, una sola vez al montar.
  useEffect(() => {
    let boots = 1
    try {
      boots = parseInt(localStorage.getItem('hlxBootCount') || '0', 10) + 1
      localStorage.setItem('hlxBootCount', String(boots))
    } catch {}
    setTelemetry({
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone || '—',
      cores: String(navigator.hardwareConcurrency || '—'),
      res: `${screen.width}×${screen.height}`,
      cycle: String(Math.floor(Date.now() / 86400000)),
      boot: `#${String(boots).padStart(4, '0')}`,
    })
  }, [])

  // Konami code — solo mientras esta pantalla está montada.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
      konamiPos.current = k === KONAMI[konamiPos.current] ? konamiPos.current + 1 : (k === KONAMI[0] ? 1 : 0)
      if (konamiPos.current === KONAMI.length) {
        konamiPos.current = 0
        setAutonomyFlash(true)
        setTimeout(() => setAutonomyFlash(false), 2600)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const needsYouCount = Object.values(stats).filter(s => s.needsYou).length

  return (
    <div className="relative min-h-[calc(100vh-56px)] overflow-hidden flex flex-col items-center px-6 py-10 font-mono">
      {/* Starfield + scanlines + viñeta: decoración estática, cero JS. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-50"
        style={{
          backgroundImage:
            'radial-gradient(1.4px 1.4px at 20% 30%, rgba(203,197,221,.55) 50%, transparent 51%),' +
            'radial-gradient(1px 1px at 70% 65%, rgba(203,197,221,.4) 50%, transparent 51%),' +
            'radial-gradient(1.2px 1.2px at 40% 80%, rgba(203,197,221,.5) 50%, transparent 51%),' +
            'radial-gradient(1px 1px at 85% 15%, rgba(203,197,221,.35) 50%, transparent 51%)',
          backgroundSize: '340px 340px',
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to bottom, rgba(255,255,255,.6) 0px, rgba(255,255,255,.6) 1px, transparent 1px, transparent 3px)',
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(120% 90% at 50% 40%, transparent 55%, rgba(0,0,0,.4) 100%)' }}
      />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          opacity: autonomyFlash ? 1 : 0,
          background: 'radial-gradient(circle at 50% 40%, rgba(167,139,250,.35), transparent 62%)',
        }}
      />

      {/* Telemetría real del navegador — franja discreta, no una app-bar nueva. */}
      <div className="relative z-10 w-full max-w-[920px] flex items-center justify-between text-[10.5px] tracking-[0.08em] text-muted-foreground/70 mb-6">
        <div className="flex items-center gap-4">
          <span>HLX//<span className="text-foreground tabular-nums">{clock}</span></span>
          <span>{telemetry?.tz ?? '—'}</span>
          <span>CORES <span className="text-foreground tabular-nums">{telemetry?.cores ?? '—'}</span></span>
        </div>
        <div className="flex items-center gap-4">
          <span>CICLO <span className="text-foreground tabular-nums">{telemetry?.cycle ?? '—'}</span></span>
          <span>{telemetry?.boot ?? 'BOOT #----'}</span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <i className="w-1.5 h-1.5 rounded-full bg-emerald-400 motion-safe:animate-pulse" />
            NOMINAL
          </span>
          <svg viewBox="0 0 40 40" className="w-6 h-6 opacity-80" aria-hidden>
            <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeOpacity=".25" strokeWidth="1" />
            <circle cx="20" cy="20" r="11" fill="none" stroke="currentColor" strokeOpacity=".25" strokeWidth="1" />
            <g style={{ animation: 'radarSpin 4s linear infinite', transformOrigin: '20px 20px' }}>
              <path d="M20,20 L20,2 A18,18 0 0,1 32,6 Z" fill="var(--color-primary)" fillOpacity=".14" />
            </g>
            <circle cx="26" cy="12" r="1" fill={needsYouCount > 0 ? 'var(--color-warning)' : 'currentColor'} opacity={needsYouCount > 0 ? 1 : 0.3} style={needsYouCount > 0 ? { animation: 'sprFrameA 1.8s ease-in-out infinite' } : undefined} />
          </svg>
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <p className="text-[13px] font-extrabold tracking-[0.38em] text-primary mb-3" style={{ animation: 'logoFlicker 7s ease-in-out infinite' }}>
          HLX
        </p>
        <p className="text-[12.5px] uppercase tracking-[0.44em] text-muted-foreground mb-5">
          Helix // Puente de mando
        </p>

        {/* Sello real de marca "El Vigía" — brand/helix/assets/helix-mark.svg,
            Solar Yellow #FFD600 fijo (identidad, no theme-aware: el brand book
            prohíbe redibujarlo o recolorearlo). */}
        <div
          className="w-[clamp(96px,16vw,168px)] mb-1"
          style={{
            color: '#FFD600',
            filter: 'drop-shadow(0 0 30px rgba(255,214,0,.35)) drop-shadow(0 0 70px rgba(255,214,0,.14))',
            animation: 'logoFlicker 7s ease-in-out infinite',
          }}
          aria-label="Helix — El Vigía"
          role="img"
        >
          <svg viewBox="0 0 390 440" fill="none" aria-hidden="true">
            <g transform="translate(0,440) scale(0.1,-0.1)" fill="currentColor" stroke="none">
              <path d="M1415 4139 l-430 -260 -485 -292 -485 -291 -7 -11 -8 -10 3 -1055 2 -1055 45 -28 45 -28 395 -236 395 -235 526 -314 527 -313 9 -3 10 -3 229 135 229 134 455 271 455 271 281 168 282 167 5 27 5 26 0 1042 1 1043 -13 11 -14 10 -283 171 -284 171 -535 321 -535 320 -87 54 -88 53 -107 -1 -108 -1 -430 -259z m984 -254 l401 -240 0 -657 0 -658 -847 2 -848 3 0 648 0 649 5 8 5 8 419 251 418 250 23 -12 22 -12 402 -240z m1039 -625 l191 -115 1 -917 0 -917 -276 -165 -275 -166 -10 0 -9 0 0 1243 0 1244 6 6 6 5 87 -51 88 -52 191 -115z m-2598 -1030 l0 -1240 -9 0 -9 0 -273 163 -274 164 -3 909 -2 909 277 167 278 167 8 1 7 0 0 -1240z m1960 -793 l0 -624 -417 -248 -416 -248 -12 0 -11 0 -400 238 -399 238 -20 12 -20 12 -2 574 -2 574 5 48 6 47 844 0 844 0 0 -623z" />
            </g>
          </svg>
        </div>
        <p className="text-[13px] sm:text-base uppercase tracking-[0.5em] text-muted-foreground mb-1">
          Command Center
        </p>

        {/* Runa oculta: alfabeto propio (no Aurebesh genérico), decodifica
            "VIGIA" solo al hover — referencia al sello, invisible si no se busca. */}
        <div className="group relative h-4 w-max mb-2 cursor-default" title="algo se traduce al pasar el cursor">
          <span className="flex gap-1.5 text-purple-300/60 transition-opacity duration-300 group-hover:opacity-0">
            {['M6,2 L6,14 M3,4 L9,4 M6,11 L9,14', 'M6,2 L6,14 M3,6 L6,8 L9,6', 'M6,2 L6,14 M6,4 L9,3 M3,10 L3,14 L6,14', 'M6,2 L6,14 M3,6 L6,8 L9,6', 'M6,2 L6,14 M2,5 L10,9 M4,14 L8,14'].map((d, i) => (
              <svg key={i} viewBox="0 0 12 16" width="8" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d={d} />
              </svg>
            ))}
          </span>
          <span className="absolute inset-0 flex items-center justify-center gap-[0.4em] text-[10px] tracking-[0.5em] text-primary uppercase opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            V I G I A
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 w-full max-w-[920px] mt-6" role="navigation" aria-label="Secciones">
          {TILES.map(tile => {
            const s = stats[tile.statKey]
            return (
              <button
                key={tile.id}
                onClick={() => router.push(`/${tile.id}`)}
                aria-label={tile.name}
                style={{ ['--tile' as string]: tile.color, borderColor: `${tile.color}40` }}
                className="group relative flex flex-col items-center justify-center gap-0 rounded-2xl border
                  bg-card px-5 py-10 min-h-[128px] transition-all duration-150 ease-out
                  hover:border-[color:var(--tile)] hover:shadow-[0_12px_34px_-14px_var(--tile)]
                  hover:-translate-y-0.5
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {/* Brackets de targeting — solo se iluminan al hover. */}
                <span className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-border opacity-45 transition-opacity group-hover:opacity-100 group-hover:border-[color:var(--tile)]" />
                <span className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-border opacity-45 transition-opacity group-hover:opacity-100 group-hover:border-[color:var(--tile)]" />
                <span className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-border opacity-45 transition-opacity group-hover:opacity-100 group-hover:border-[color:var(--tile)]" />
                <span className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-border opacity-45 transition-opacity group-hover:opacity-100 group-hover:border-[color:var(--tile)]" />

                {s.value !== null && (
                  <span
                    aria-hidden
                    className={`absolute top-2.5 right-2.5 min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center
                      text-[11px] font-bold tabular-nums text-background shadow-[0_2px_8px_-2px_var(--tile)]
                      ${s.needsYou ? 'bg-warning motion-safe:animate-pulse' : ''}`}
                    style={s.needsYou ? undefined : { background: tile.color }}
                  >
                    {s.value}
                  </span>
                )}

                <span className="relative flex items-center justify-center w-[74px] h-[74px]">
                  <span
                    aria-hidden
                    className="absolute inset-1.5 rounded-full blur-md opacity-55"
                    style={{ background: `radial-gradient(circle, ${tile.color}, transparent 70%)` }}
                  />
                  <span className="relative transition-transform duration-150 ease-out group-hover:scale-110" style={{ color: tile.color }}>
                    <Sprite spriteKey={tile.spriteKey} />
                  </span>
                </span>

                {/* Designación HUD + nombre del módulo: solo visibles al hover. */}
                <span className="mt-2 text-[9px] tracking-[0.14em] uppercase text-muted-foreground opacity-0 -translate-y-0.5 transition-all group-hover:opacity-60 group-hover:translate-y-0">
                  {tile.desig}
                </span>
                <span className="absolute bottom-5 right-3 text-[8.5px] tracking-[0.12em] uppercase text-muted-foreground opacity-0 transition-opacity pointer-events-none group-hover:opacity-90" style={{ color: tile.color }}>
                  {tile.name}
                </span>
              </button>
            )
          })}
        </div>

        <p className="relative z-10 text-base text-muted-foreground mt-8">
          {needsYouCount > 0
            ? <><span className="text-warning tabular-nums">{needsYouCount}</span> {needsYouCount === 1 ? 'área te necesita' : 'áreas te necesitan'} · 8 sistemas en línea</>
            : 'nada urgente — todo corre solo · 8 sistemas en línea'}
        </p>
      </div>

      {/* Toast del Konami code — mismo color de estado que "autonomía" en el Brand Book. */}
      <div
        role="status"
        aria-live="polite"
        className={`absolute z-20 bottom-6 left-1/2 -translate-x-1/2 rounded-lg border px-4 py-2 text-[11.5px]
          tracking-[0.1em] transition-all duration-300
          ${autonomyFlash ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}
        style={{ background: 'var(--color-card)', borderColor: '#6c52b8', color: '#a78bfa' }}
      >
        AUTONOMY OVERRIDE // LA TRIPULACIÓN IA TOMÓ EL MANDO
      </div>

      <style jsx>{`
        @keyframes sprFrameA {
          0%, 50% { opacity: 1; }
          50.01%, 100% { opacity: 0; }
        }
        @keyframes sprFrameB {
          0%, 50% { opacity: 0; }
          50.01%, 100% { opacity: 1; }
        }
        @keyframes radarSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes logoFlicker {
          0%, 93%, 100% { opacity: 1; }
          94% { opacity: 0.82; }
          95% { opacity: 1; }
          96% { opacity: 0.7; }
          96.5% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
