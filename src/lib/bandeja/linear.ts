/**
 * Lector de Linear para la Bandeja de Decisión.
 *
 * Fuente #1 de la bandeja: lo que el piloto nocturno dejó en "In Review" —
 * trabajo terminado que se queda congelado porque nadie avisa que está ahí.
 *
 * Token: LINEAR_API_KEY, cableado desde el Keychain (`helix-linear-api`) en el
 * arranque de MC, mismo canal que GITHUB_TOKEN. Sin token: no-op silencioso.
 */

import { logger } from '@/lib/logger'
import { bloqueDeEtiquetas, type Bloque, type Categoria } from './rules'

const LINEAR_API = 'https://api.linear.app/graphql'
const TEAM = 'HLX'
const ESTADO = 'In Review'
const TIMEOUT_MS = 8000

export interface PendienteLinear {
  id: string
  identificador: string
  titulo: string
  url: string
  proyecto: string | null
  categoria: Categoria
  bloque: Bloque
  /** Arranque del reloj. Ver nota sobre la contaminación de `updatedAt` abajo. */
  desde: string
  creado: string
  etiquetas: string[]
}

interface LinearNode {
  id: string
  identifier: string
  title: string
  url: string
  createdAt: string
  updatedAt: string
  project: { name: string } | null
  labels: { nodes: { name: string }[] } | null
}

const QUERY = `query BandejaEnRevision($team: String!, $estado: String!) {
  issues(
    filter: { team: { key: { eq: $team } }, state: { name: { eq: $estado } } }
    first: 50
    orderBy: updatedAt
  ) {
    nodes {
      id
      identifier
      title
      url
      createdAt
      updatedAt
      project { name }
      labels { nodes { name } }
    }
  }
}`

export function linearConfigurado(): boolean {
  return Boolean(process.env.LINEAR_API_KEY)
}

/**
 * ⚠️ `updatedAt` NO es "cuándo entró a revisión": el ejecutor nocturno roza
 * issues viejos y le reinicia el contador, así que algo puede llevar 9 días
 * parado y verse fresco de 4. Por eso esta fase PINTA el reloj pero no dispara
 * nada — el disparo automático necesita que la bandeja lleve su propio registro
 * de "primera vez que lo vi", que es la fase siguiente.
 */
export async function leerEnRevision(): Promise<PendienteLinear[]> {
  const key = process.env.LINEAR_API_KEY
  if (!key) return []

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(LINEAR_API, {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: QUERY, variables: { team: TEAM, estado: ESTADO } }),
    })
    clearTimeout(timeout)

    if (!res.ok) {
      logger.warn({ status: res.status }, 'Linear devolvió error al leer la bandeja')
      return []
    }

    const data = (await res.json()) as { data?: { issues?: { nodes?: LinearNode[] } }; errors?: unknown }
    if (data.errors) {
      logger.warn({ errors: data.errors }, 'Linear respondió con errores de GraphQL')
      return []
    }

    return (data.data?.issues?.nodes ?? []).map(mapear)
  } catch (err) {
    clearTimeout(timeout)
    const nombre = err instanceof Error ? err.name : 'desconocido'
    logger.warn({ err, nombre }, 'Linear inalcanzable al leer la bandeja')
    return []
  }
}

function mapear(n: LinearNode): PendienteLinear {
  const etiquetas = (n.labels?.nodes ?? []).map((l) => l.name)
  return {
    id: n.id,
    identificador: n.identifier,
    titulo: n.title,
    url: n.url,
    proyecto: n.project?.name ?? null,
    // Todo lo que el piloto deja en revisión es "trabajo terminado esperando cierre".
    categoria: 'cerrar',
    bloque: bloqueDeEtiquetas(etiquetas),
    desde: n.updatedAt,
    creado: n.createdAt,
    etiquetas,
  }
}

// ---------------------------------------------------------------------------
// Escritura — solo movimientos reversibles
// ---------------------------------------------------------------------------

export type Movimiento = 'cerrar' | 'devolver'

/** Estados destino. Ambos se deshacen moviendo el issue de vuelta a mano. */
const DESTINO: Record<Movimiento, string> = {
  cerrar: 'Done',
  devolver: 'Todo',
}

const MUTACION = `mutation MoverIssue($id: String!, $estadoId: String!) {
  issueUpdate(id: $id, input: { stateId: $estadoId }) { success }
}`

const ESTADOS_EQUIPO = `query EstadosEquipo($team: String!) {
  workflowStates(filter: { team: { key: { eq: $team } } }, first: 50) {
    nodes { id name }
  }
}`

export async function moverIssue(id: string, movimiento: Movimiento): Promise<{ ok: boolean; razon?: string }> {
  const key = process.env.LINEAR_API_KEY
  if (!key) return { ok: false, razon: 'LINEAR_API_KEY no configurado' }

  const nombreDestino = DESTINO[movimiento]

  try {
    const estados = await consultar<{ workflowStates: { nodes: { id: string; name: string }[] } }>(
      key,
      ESTADOS_EQUIPO,
      { team: TEAM },
    )
    const destino = estados?.workflowStates?.nodes?.find((s) => s.name === nombreDestino)
    if (!destino) return { ok: false, razon: `el equipo no tiene estado "${nombreDestino}"` }

    const out = await consultar<{ issueUpdate: { success: boolean } }>(key, MUTACION, {
      id,
      estadoId: destino.id,
    })
    return out?.issueUpdate?.success ? { ok: true } : { ok: false, razon: 'Linear rechazó el movimiento' }
  } catch (err) {
    logger.warn({ err, id, movimiento }, 'falló mover issue de la bandeja')
    return { ok: false, razon: 'Linear inalcanzable' }
  }
}

async function consultar<T>(key: string, query: string, variables: Record<string, unknown>): Promise<T | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(LINEAR_API, {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    })
    if (!res.ok) return null
    const json = (await res.json()) as { data?: T; errors?: unknown }
    if (json.errors) {
      logger.warn({ errors: json.errors }, 'Linear respondió con errores de GraphQL')
      return null
    }
    return json.data ?? null
  } finally {
    clearTimeout(timeout)
  }
}
