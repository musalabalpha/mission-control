import { describe, expect, it } from 'vitest';
import {
  bloqueDeEtiquetas,
  calcularVencimiento,
  formatearRestante,
  ordenar,
  REGLAS,
  restanteMs,
  type Pendiente,
} from '../bandeja/rules';

/** Fecha local explícita: el reloj razona en hora local, no UTC. */
const local = (y: number, m: number, d: number, h: number, min = 0) => new Date(y, m - 1, d, h, min, 0, 0);

describe('reglas por categoría', () => {
  it('lo irreversible nunca vence y siempre niega', () => {
    for (const cat of ['produccion', 'destructivo'] as const) {
      expect(REGLAS[cat].plazoHoras).toBeNull();
      expect(REGLAS[cat].siCallas).toBe('niega');
      expect(REGLAS[cat].reversible).toBe(false);
    }
  });

  it('lo reversible se dispara solo hacia adelante', () => {
    for (const cat of ['publicar', 'integrar', 'cerrar'] as const) {
      expect(REGLAS[cat].siCallas).toBe('adelante');
      expect(REGLAS[cat].reversible).toBe(true);
    }
  });

  it('permitir un comando es reversible-en-apariencia pero se niega por defecto', () => {
    expect(REGLAS.permiso.siCallas).toBe('niega');
  });
});

describe('bloque del mapa', () => {
  it('lee la etiqueta y cae a "sin" cuando no está', () => {
    expect(bloqueDeEtiquetas(['runner:helix', 'mapa:ahora'])).toBe('ahora');
    expect(bloqueDeEtiquetas(['MAPA:SIGUE'])).toBe('sigue');
    expect(bloqueDeEtiquetas(['core'])).toBe('sin');
  });

  it('ahora gana si vienen varias', () => {
    expect(bloqueDeEtiquetas(['mapa:despues', 'mapa:ahora'])).toBe('ahora');
  });
});

describe('reloj con ventana de silencio', () => {
  it('sin cruzar la noche, suma directo', () => {
    const vence = calcularVencimiento(local(2026, 7, 25, 10), 6);
    expect(vence).toEqual(local(2026, 7, 25, 16));
  });

  it('no vence cuando la categoría no tiene plazo', () => {
    expect(calcularVencimiento(local(2026, 7, 25, 10), null)).toBeNull();
  });

  it('salta la ventana de silencio en vez de correr de madrugada', () => {
    // 22:00 + 6h activas: 2h hasta medianoche, se pausa hasta las 06:00, 4h más.
    const vence = calcularVencimiento(local(2026, 7, 25, 22), 6);
    expect(vence).toEqual(local(2026, 7, 26, 10));
  });

  it('lo que entra de madrugada arranca a las 6, no antes', () => {
    const vence = calcularVencimiento(local(2026, 7, 25, 2), 3);
    expect(vence).toEqual(local(2026, 7, 25, 9));
  });

  it('un plazo largo salta varias noches', () => {
    // 24h activas desde las 10:00 = 14h hoy + 10h mañana (arrancando a las 06:00).
    const vence = calcularVencimiento(local(2026, 7, 25, 10), 24);
    expect(vence).toEqual(local(2026, 7, 26, 16));
  });
});

describe('restante y formato', () => {
  it('nunca devuelve negativo', () => {
    const ms = restanteMs(local(2026, 7, 25, 10), local(2026, 7, 25, 14));
    expect(ms).toBe(0);
  });

  it('pinta horas, minutos, infinito y vencido', () => {
    expect(formatearRestante(null)).toBe('∞');
    expect(formatearRestante(0)).toBe('venció');
    expect(formatearRestante(3 * 3_600_000)).toBe('3h');
    expect(formatearRestante(20 * 60_000)).toBe('20m');
  });
});

describe('orden de la cola', () => {
  const ahora = local(2026, 7, 25, 12);

  const p = (id: string, categoria: Pendiente['categoria'], bloque: Pendiente['bloque'], desde: Date): Pendiente =>
    ({ id, titulo: id, categoria, bloque, desde });

  it('el bloque del mapa manda sobre la urgencia', () => {
    const urgentePeroDespues = p('despues-urgente', 'integrar', 'despues', local(2026, 7, 25, 11));
    const relajadoPeroAhora = p('ahora-relajado', 'cerrar', 'ahora', local(2026, 7, 25, 11, 30));

    const [primero] = ordenar([urgentePeroDespues, relajadoPeroAhora], ahora);
    expect(primero.id).toBe('ahora-relajado');
  });

  it('dentro del bloque: urgente, luego lo que no vence, luego el resto', () => {
    // integrar = 6h → entró 08:00, vence 14:00 → restan 2h (urgente).
    const urgente = p('urgente', 'integrar', 'ahora', local(2026, 7, 25, 8));
    const nuncaVence = p('infinito', 'destructivo', 'ahora', local(2026, 7, 22, 9));
    // cerrar = 24h → entró 11:00, vence mañana → holgado.
    const holgado = p('holgado', 'cerrar', 'ahora', local(2026, 7, 25, 11));

    const orden = ordenar([holgado, nuncaVence, urgente], ahora).map((x) => x.id);
    expect(orden).toEqual(['urgente', 'infinito', 'holgado']);
  });

  it('entre dos que no vencen, primero el que lleva más esperando', () => {
    const viejo = p('viejo', 'produccion', 'ahora', local(2026, 7, 20, 9));
    const nuevo = p('nuevo', 'destructivo', 'ahora', local(2026, 7, 24, 9));

    const orden = ordenar([nuevo, viejo], ahora).map((x) => x.id);
    expect(orden).toEqual(['viejo', 'nuevo']);
  });

  it('lo que no trae etiqueta del mapa cae al fondo, no rompe', () => {
    const sinEtiqueta = p('sin', 'integrar', 'sin', local(2026, 7, 25, 11, 45));
    const conEtiqueta = p('con', 'cerrar', 'despues', local(2026, 7, 25, 11));

    const orden = ordenar([sinEtiqueta, conEtiqueta], ahora).map((x) => x.id);
    expect(orden).toEqual(['con', 'sin']);
  });

  it('con la cola toda vencida, el más viejo va primero', () => {
    // Los tres vencieron hace rato: sin desempate quedarían en orden de llegada.
    const ayer = p('ayer', 'cerrar', 'ahora', local(2026, 7, 24, 9));
    const anteayer = p('anteayer', 'cerrar', 'ahora', local(2026, 7, 23, 9));
    const semanaPasada = p('semana-pasada', 'cerrar', 'ahora', local(2026, 7, 18, 9));

    const orden = ordenar([ayer, semanaPasada, anteayer], ahora).map((x) => x.id);
    expect(orden).toEqual(['semana-pasada', 'anteayer', 'ayer']);
  });

  it('no muta el arreglo que recibe', () => {
    const a = p('a', 'cerrar', 'despues', local(2026, 7, 25, 9));
    const b = p('b', 'integrar', 'ahora', local(2026, 7, 25, 9));
    const entrada = [a, b];
    ordenar(entrada, ahora);
    expect(entrada[0].id).toBe('a');
  });
});
