'use client'

/**
 * Bandeja de Decisión — lo que espera un sí o un no de Musa, en un solo lugar.
 *
 * Fase 1: lee la cola de Linear ("In Review": trabajo terminado y congelado) y
 * deja despacharla sin salir del panel. El reloj se PINTA pero todavía no
 * dispara nada solo — eso es la fase siguiente, y necesita que la bandeja lleve
 * su propio registro de cuándo vio cada cosa por primera vez.
 *
 * ponytail: sin next-intl. Diez paneles del repo tampoco lo usan y este es el
 * tablero personal de Musa, en español. Meter 10 archivos de locale para esto
 * es ceremonia, no producto.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/api-client'

interface ItemBandeja {
  id: string
  identificador: string
  titulo: string
  url: string
  proyecto: string | null
  categoria: string
  etiquetaCategoria: string
  bloque: 'ahora' | 'sigue' | 'despues' | 'sin'
  reversible: boolean
  siCallas: 'adelante' | 'niega' | 'escala'
  venceEn: string | null
  desde: string
  diasParado: number
}

interface RespuestaBandeja {
  configurado: boolean
  error?: string
  items: ItemBandeja[]
  visibles: number
}

const ETIQUETA_BLOQUE: Record<ItemBandeja['bloque'], string> = {
  ahora: 'Ahora',
  sigue: 'Sigue',
  despues: 'Después',
  sin: 'Sin bloque',
}

const ORDEN_BLOQUES: ItemBandeja['bloque'][] = ['ahora', 'sigue', 'despues', 'sin']

/** Debajo de esto el reloj pulsa: ya casi no lo alcanzas. */
const URGENTE_MS = 4 * 3_600_000

function textoRestante(venceEn: string | null, ahora: number): string {
  if (!venceEn) return '∞'
  const ms = new Date(venceEn).getTime() - ahora
  if (ms <= 0) return 'venció'
  const horas = Math.floor(ms / 3_600_000)
  if (horas >= 1) return `${horas}h`
  return `${Math.max(1, Math.round(ms / 60_000))}m`
}

function msRestantes(venceEn: string | null, ahora: number): number | null {
  if (!venceEn) return null
  return Math.max(0, new Date(venceEn).getTime() - ahora)
}

function frasSiCallas(item: ItemBandeja): string {
  if (!item.venceEn) return 'nada, esto nunca se dispara solo'
  if (item.siCallas === 'niega') return 'se niega'
  if (item.siCallas === 'escala') return 'sube al ritual semanal'
  return 'se marca hecho'
}

export function BandejaPanel() {
  const [datos, setDatos] = useState<RespuestaBandeja | null>(null)
  const [cargando, setCargando] = useState(true)
  const [abierto, setAbierto] = useState<string | null>(null)
  const [cajon, setCajon] = useState<{ id: string; cual: string } | null>(null)
  const [despachando, setDespachando] = useState<string | null>(null)
  const [fallo, setFallo] = useState<string | null>(null)
  const [verTodos, setVerTodos] = useState(false)
  const [ahora, setAhora] = useState(() => Date.now())

  const cargar = useCallback(async () => {
    try {
      const res = await apiFetch<RespuestaBandeja>('/api/bandeja')
      setDatos(res)
      setFallo(null)
    } catch {
      setFallo('No se pudo leer la bandeja')
    }
    setCargando(false)
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  // El reloj corre solo; sin esto los "3h" se congelan en lo que dijo el server.
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])

  const items = useMemo(() => datos?.items ?? [], [datos])
  const visibles = datos?.visibles ?? 5
  const mostrados = verTodos ? items : items.slice(0, visibles)
  const ocultos = items.length - mostrados.length
  const urgentes = items.filter((i) => {
    const ms = msRestantes(i.venceEn, ahora)
    return ms !== null && ms < URGENTE_MS
  }).length

  const despachar = async (item: ItemBandeja, movimiento: 'cerrar' | 'devolver') => {
    setDespachando(item.id)
    setFallo(null)
    try {
      await apiFetch('/api/bandeja', {
        method: 'POST',
        body: JSON.stringify({ id: item.id, movimiento }),
      })
      setDatos((prev) => (prev ? { ...prev, items: prev.items.filter((i) => i.id !== item.id) } : prev))
      setAbierto(null)
    } catch {
      setFallo(`No se pudo mover ${item.identificador}. Sigue en la fila.`)
    }
    setDespachando(null)
  }

  const agrupados = ORDEN_BLOQUES.map((bloque) => ({
    bloque,
    items: mostrados.filter((i) => i.bloque === bloque),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="m-4 max-w-4xl">
      <div className="flex items-baseline gap-3 mb-1">
        <h1 className="text-lg font-semibold tracking-wide text-foreground">Bandeja</h1>
        <span className="text-xs text-muted-foreground tabular-nums">
          {items.length} {items.length === 1 ? 'pendiente' : 'pendientes'}
          {urgentes > 0 && <span className="text-amber-400"> · {urgentes} vence pronto</span>}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Lo reversible trae reloj. Lo que no se deshace nunca vence: te espera a ti.
      </p>

      {fallo && (
        <div className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {fallo}
        </div>
      )}

      {cargando && <div className="text-sm text-muted-foreground">Leyendo la cola…</div>}

      {!cargando && datos && !datos.configurado && (
        <div className="rounded-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          {datos.error ?? 'Linear no está conectado.'}
        </div>
      )}

      {!cargando && datos?.configurado && items.length === 0 && (
        <div className="rounded-md border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
          Nada te espera. La cola está vacía.
        </div>
      )}

      {agrupados.map(({ bloque, items: delBloque }) => (
        <div key={bloque} className="mb-4">
          <div className="mb-1 flex items-center gap-2">
            <span
              className={`h-1.5 w-1.5 rounded-full ${bloque === 'ahora' ? 'bg-amber-400' : 'bg-muted-foreground/50'}`}
            />
            <span
              className={`text-[10px] uppercase tracking-[0.2em] ${bloque === 'ahora' ? 'text-amber-400' : 'text-muted-foreground'}`}
            >
              {ETIQUETA_BLOQUE[bloque]}
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-card">
            {delBloque.map((item) => {
              const ms = msRestantes(item.venceEn, ahora)
              const noVence = item.venceEn === null
              const urge = ms !== null && ms < URGENTE_MS
              const estaAbierto = abierto === item.id

              return (
                <div key={item.id} className="border-b border-border/50 last:border-b-0">
                  <button
                    type="button"
                    onClick={() => {
                      setAbierto(estaAbierto ? null : item.id)
                      setCajon(null)
                    }}
                    aria-expanded={estaAbierto}
                    className="grid w-full grid-cols-[64px_1fr_auto] items-center gap-3 px-4 py-3 text-left hover:bg-secondary/40"
                  >
                    <div className="text-right">
                      <div
                        className={`text-base font-semibold tabular-nums leading-tight ${
                          noVence ? 'text-red-400' : 'text-amber-400'
                        } ${urge ? 'motion-safe:animate-pulse' : ''}`}
                      >
                        {textoRestante(item.venceEn, ahora)}
                      </div>
                      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                        {noVence ? 'no vence' : 'restan'}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="truncate text-sm text-foreground">
                        <span className="text-blue-400">{item.identificador}</span> · {item.titulo}
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        <span className="mr-2 rounded border border-border px-1.5 py-px text-[9px] uppercase tracking-wider">
                          {item.etiquetaCategoria}
                        </span>
                        si callas → {frasSiCallas(item)}
                      </div>
                    </div>

                    <span className="text-xs text-muted-foreground">{estaAbierto ? '▾' : '▸'}</span>
                  </button>

                  {estaAbierto && (
                    <div className="border-t border-dashed border-border px-4 pb-4 pl-[84px] pt-3">
                      <Seccion titulo="Contexto" />
                      <div className="flex flex-wrap gap-1.5">
                        {item.proyecto && <Pastilla>Proyecto {item.proyecto}</Pastilla>}
                        <Pastilla destacada={item.diasParado >= 3}>
                          Lleva {item.diasParado} {item.diasParado === 1 ? 'día' : 'días'} sin moverse
                        </Pastilla>
                        <Pastilla>{item.reversible ? 'Reversible' : 'Un solo sentido'}</Pastilla>
                      </div>

                      <Seccion titulo="Qué pasa" />
                      <div className="overflow-hidden rounded-md border border-border text-xs">
                        <Desenlace k="Si va" tono="verde">
                          Se cierra en Linear
                        </Desenlace>
                        <Desenlace k="Si no" tono="rojo">
                          Vuelve a la fila como pendiente
                        </Desenlace>
                        <Desenlace k="Si callas" tono="ambar">
                          {frasSiCallas(item)}
                          {item.venceEn && ' — cuando el disparo automático esté vivo'}
                        </Desenlace>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <Button
                          size="sm"
                          variant="success"
                          disabled={despachando === item.id}
                          onClick={() => despachar(item, 'cerrar')}
                        >
                          {despachando === item.id ? '…' : 'va'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={despachando === item.id}
                          onClick={() => despachar(item, 'devolver')}
                        >
                          no
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setCajon(cajon?.id === item.id && cajon.cual === 'comentar' ? null : { id: item.id, cual: 'comentar' })
                          }
                        >
                          comentar
                        </Button>
                        <a href={item.url} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="ghost">
                            abrir en Linear
                          </Button>
                        </a>
                      </div>

                      {cajon?.id === item.id && cajon.cual === 'comentar' && (
                        <div className="mt-3">
                          <textarea
                            placeholder="Qué opinas, qué falta, qué te preocupa…"
                            className="min-h-[64px] w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-blue-400 focus:outline-none"
                          />
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            El comentario todavía no viaja a Linear — llega en la fase que conecta la escritura.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {ocultos > 0 && (
        <button
          type="button"
          onClick={() => setVerTodos(true)}
          className="w-full rounded-md border border-border py-2 text-xs text-muted-foreground hover:text-blue-400"
        >
          ver los otros {ocultos} ▾
        </button>
      )}
    </div>
  )
}

function Seccion({ titulo }: { titulo: string }) {
  return <div className="mb-1.5 mt-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{titulo}</div>
}

function Pastilla({ children, destacada }: { children: React.ReactNode; destacada?: boolean }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-[11px] ${
        destacada ? 'border-amber-400/60 text-amber-400' : 'border-border text-muted-foreground'
      }`}
    >
      {children}
    </span>
  )
}

function Desenlace({ k, tono, children }: { k: string; tono: 'verde' | 'rojo' | 'ambar'; children: React.ReactNode }) {
  const color = tono === 'verde' ? 'text-green-400' : tono === 'rojo' ? 'text-red-400' : 'text-amber-400'
  return (
    <div className="grid grid-cols-[76px_1fr] gap-2 border-b border-border/50 px-3 py-2 last:border-b-0">
      <span className="pt-px text-[10px] uppercase tracking-wider text-muted-foreground">{k}</span>
      <span className={color}>{children}</span>
    </div>
  )
}
