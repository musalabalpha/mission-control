import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { leerEnRevision, linearConfigurado, moverIssue } from '@/lib/bandeja/linear'
import { calcularVencimiento, ordenar, REGLAS, VISIBLES, type Pendiente } from '@/lib/bandeja/rules'

export interface ItemBandeja {
  id: string
  identificador: string
  titulo: string
  url: string
  proyecto: string | null
  categoria: string
  etiquetaCategoria: string
  bloque: string
  reversible: boolean
  siCallas: string
  /** ISO, o `null` cuando la categoría no vence nunca. */
  venceEn: string | null
  desde: string
  /** Días desde el último movimiento — el "lleva N parado" del expediente. */
  diasParado: number
}

const DIA_MS = 86_400_000

/** GET /api/bandeja — la cola de lo que espera decisión de Musa. */
export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'operator')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  if (!linearConfigurado()) {
    return NextResponse.json({
      configurado: false,
      error: 'LINEAR_API_KEY no configurado — cablearlo desde Keychain en el arranque de MC',
      items: [],
      visibles: VISIBLES,
    })
  }

  const ahora = new Date()

  try {
    const crudos = await leerEnRevision()

    const paraOrdenar: (Pendiente & { crudo: (typeof crudos)[number] })[] = crudos.map((c) => ({
      id: c.id,
      titulo: c.titulo,
      categoria: c.categoria,
      bloque: c.bloque,
      desde: new Date(c.desde),
      crudo: c,
    }))

    const items: ItemBandeja[] = ordenar(paraOrdenar, ahora).map(({ crudo, desde }) => {
      const regla = REGLAS[crudo.categoria]
      const vence = calcularVencimiento(desde, regla.plazoHoras)
      return {
        id: crudo.id,
        identificador: crudo.identificador,
        titulo: crudo.titulo,
        url: crudo.url,
        proyecto: crudo.proyecto,
        categoria: crudo.categoria,
        etiquetaCategoria: regla.etiqueta,
        bloque: crudo.bloque,
        reversible: regla.reversible,
        siCallas: regla.siCallas,
        venceEn: vence ? vence.toISOString() : null,
        desde: crudo.desde,
        diasParado: Math.floor((ahora.getTime() - new Date(crudo.desde).getTime()) / DIA_MS),
      }
    })

    return NextResponse.json({ configurado: true, items, visibles: VISIBLES })
  } catch (err) {
    logger.warn({ err }, 'falló armar la bandeja')
    return NextResponse.json({ configurado: true, items: [], visibles: VISIBLES })
  }
}

const cuerpoSchema = z
  .object({
    id: z.string().min(1).max(120),
    movimiento: z.enum(['cerrar', 'devolver']),
  })
  .strict()

/**
 * POST /api/bandeja — despacha un pendiente.
 *
 * Solo movimientos reversibles: cerrar (a Done) y devolver (a Todo). Nada
 * irreversible pasa por aquí, ni ahora ni cuando se sumen las otras colas.
 */
export async function POST(request: NextRequest) {
  const auth = requireRole(request, 'operator')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  let cuerpo: unknown
  try {
    cuerpo = await request.json()
  } catch {
    return NextResponse.json({ error: 'cuerpo inválido' }, { status: 400 })
  }

  const parsed = cuerpoSchema.safeParse(cuerpo)
  if (!parsed.success) {
    return NextResponse.json({ error: 'parámetros inválidos' }, { status: 400 })
  }

  if (!linearConfigurado()) {
    return NextResponse.json({ error: 'LINEAR_API_KEY no configurado' }, { status: 503 })
  }

  const { id, movimiento } = parsed.data
  const out = await moverIssue(id, movimiento)

  if (!out.ok) {
    logger.warn({ id, movimiento, razon: out.razon }, 'la bandeja no pudo mover el issue')
    return NextResponse.json({ error: out.razon ?? 'no se pudo mover' }, { status: 502 })
  }

  logger.info({ id, movimiento, actor: auth.user.username }, 'bandeja despachó un pendiente')
  return NextResponse.json({ ok: true, id, movimiento })
}
