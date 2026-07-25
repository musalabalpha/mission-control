/**
 * Bandeja de Decisión — reglas de plazo, desenlace y orden.
 *
 * Modelo: cada pendiente cae en una categoría. La categoría fija el plazo y qué
 * pasa si Musa no contesta. Lo reversible se dispara solo; lo irreversible nunca.
 */

export type Categoria =
  | 'publicar'
  | 'integrar'
  | 'cerrar'
  | 'permiso'
  | 'produccion'
  | 'destructivo'
  | 'rumbo';

/** Qué ocurre cuando se acaba el reloj y nadie contestó. */
export type Desenlace = 'adelante' | 'niega' | 'escala';

export interface Regla {
  /** Horas de reloj activo. `null` = no vence nunca (puerta de un solo sentido). */
  plazoHoras: number | null;
  siCallas: Desenlace;
  reversible: boolean;
  etiqueta: string;
}

export const REGLAS: Record<Categoria, Regla> = {
  publicar: { plazoHoras: 12, siCallas: 'adelante', reversible: true, etiqueta: 'Publicar contenido' },
  integrar: { plazoHoras: 6, siCallas: 'adelante', reversible: true, etiqueta: 'Integrar código' },
  cerrar: { plazoHoras: 24, siCallas: 'adelante', reversible: true, etiqueta: 'Cerrar terminado' },
  permiso: { plazoHoras: 24, siCallas: 'niega', reversible: false, etiqueta: 'Permitir comando' },
  produccion: { plazoHoras: null, siCallas: 'niega', reversible: false, etiqueta: 'Tocar producción' },
  destructivo: { plazoHoras: null, siCallas: 'niega', reversible: false, etiqueta: 'Borrar o gastar' },
  rumbo: { plazoHoras: 72, siCallas: 'escala', reversible: true, etiqueta: 'Decisión de rumbo' },
};

/** Bloque del MAPA_90D. Gobierna el orden: lo que empuja la meta va arriba. */
export type Bloque = 'ahora' | 'sigue' | 'despues' | 'sin';

export const ETIQUETA_BLOQUE: Record<Exclude<Bloque, 'sin'>, string> = {
  ahora: 'mapa:ahora',
  sigue: 'mapa:sigue',
  despues: 'mapa:despues',
};

export function bloqueDeEtiquetas(labels: readonly string[]): Bloque {
  const set = new Set(labels.map((l) => l.toLowerCase()));
  if (set.has(ETIQUETA_BLOQUE.ahora)) return 'ahora';
  if (set.has(ETIQUETA_BLOQUE.sigue)) return 'sigue';
  if (set.has(ETIQUETA_BLOQUE.despues)) return 'despues';
  return 'sin';
}

// ---------------------------------------------------------------------------
// Reloj con ventana de silencio
// ---------------------------------------------------------------------------

/** El reloj se pausa de 00:00 a 06:00 hora local: nadie pierde el veto por dormir. */
export const SILENCIO_INICIO = 0;
export const SILENCIO_FIN = 6;

const HORA_MS = 3_600_000;

function enSilencio(d: Date): boolean {
  const h = d.getHours();
  return h >= SILENCIO_INICIO && h < SILENCIO_FIN;
}

/** Fin de la ventana de silencio que contiene a `d`. */
function finDelSilencio(d: Date): Date {
  const out = new Date(d);
  out.setHours(SILENCIO_FIN, 0, 0, 0);
  return out;
}

/**
 * Suma `horas` de reloj ACTIVO a `desde`, saltando la ventana de silencio.
 * Devuelve `null` si la categoría no vence.
 *
 * ponytail: avanza hora a hora en vez de resolver la aritmética de intervalos.
 * Con plazos de 6-72h son ≤72 vueltas — si algún día hay plazos de semanas,
 * vale la pena el cálculo cerrado.
 */
export function calcularVencimiento(desde: Date, horas: number | null): Date | null {
  if (horas === null) return null;
  if (horas <= 0) return new Date(desde);

  let cursor = enSilencio(desde) ? finDelSilencio(desde) : new Date(desde);
  let restanteMs = horas * HORA_MS;

  while (restanteMs > 0) {
    if (enSilencio(cursor)) {
      cursor = finDelSilencio(cursor);
      continue;
    }
    // Consume hasta el próximo arranque de silencio (medianoche) o lo que falte.
    const medianoche = new Date(cursor);
    medianoche.setHours(24, 0, 0, 0);
    const disponibleMs = medianoche.getTime() - cursor.getTime();

    if (restanteMs <= disponibleMs) {
      cursor = new Date(cursor.getTime() + restanteMs);
      restanteMs = 0;
    } else {
      restanteMs -= disponibleMs;
      cursor = medianoche;
    }
  }
  return cursor;
}

/** Milisegundos restantes; `null` si no vence; `0` si ya venció. */
export function restanteMs(vence: Date | null, ahora: Date): number | null {
  if (vence === null) return null;
  return Math.max(0, vence.getTime() - ahora.getTime());
}

/** "3h", "20h", "45m", "∞" — lo que se pinta en el ancla izquierda del renglón. */
export function formatearRestante(ms: number | null): string {
  if (ms === null) return '∞';
  if (ms <= 0) return 'venció';
  const horas = Math.floor(ms / HORA_MS);
  if (horas >= 1) return `${horas}h`;
  return `${Math.max(1, Math.round(ms / 60_000))}m`;
}

// ---------------------------------------------------------------------------
// Orden
// ---------------------------------------------------------------------------

export interface Pendiente {
  id: string;
  titulo: string;
  categoria: Categoria;
  bloque: Bloque;
  /** Cuándo entró a la bandeja. */
  desde: Date;
  /** Último movimiento real, para "lleva N días parado". */
  actualizado?: Date;
}

const PESO_BLOQUE: Record<Bloque, number> = { ahora: 0, sigue: 1, despues: 2, sin: 3 };

/** Umbral de "time-critical": debajo de esto, la urgencia gana sobre todo. */
export const UMBRAL_URGENTE_MS = 4 * HORA_MS;

/**
 * Orden dentro de un bloque, en tres escalones:
 *   1. lo que vence en <4h — se va a disparar solo y ya no lo alcanzas
 *   2. lo que no vence nunca — es lo ÚNICO que solo tú puedes destrabar
 *   3. el resto, por menos tiempo restante
 *
 * El escalón 2 va en medio a propósito: arriba se volvería papel tapiz que
 * aprendes a ignorar, y abajo desaparecería.
 */
function escalon(ms: number | null): number {
  if (ms === null) return 1;
  return ms < UMBRAL_URGENTE_MS ? 0 : 2;
}

export function ordenar<T extends Pendiente>(items: readonly T[], ahora: Date): T[] {
  return [...items].sort((a, b) => {
    const pesoBloque = PESO_BLOQUE[a.bloque] - PESO_BLOQUE[b.bloque];
    if (pesoBloque !== 0) return pesoBloque;

    const msA = restanteMs(calcularVencimiento(a.desde, REGLAS[a.categoria].plazoHoras), ahora);
    const msB = restanteMs(calcularVencimiento(b.desde, REGLAS[b.categoria].plazoHoras), ahora);

    const escA = escalon(msA);
    const escB = escalon(msB);
    if (escA !== escB) return escA - escB;

    // Empate real (dos que no vencen, o varios ya vencidos con restante 0):
    // gana el más viejo. Sin esto, una cola toda vencida queda en orden aleatorio.
    const porReloj = (msA ?? 0) - (msB ?? 0);
    if (porReloj !== 0) return porReloj;
    return a.desde.getTime() - b.desde.getTime();
  });
}

/** Cuántos se pintan antes de colapsar. Ley de Hick: una lista de 20 es una pared. */
export const VISIBLES = 5;
