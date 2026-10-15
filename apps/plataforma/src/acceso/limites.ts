/**
 * Límites de uso sobre `limite_uso` (plan del corte 3, CA-10).
 *
 * `reservarIntento` **cuenta el intento antes de verificar nada**: el contador se
 * incrementa con un `INSERT … ON CONFLICT DO UPDATE` que toma el bloqueo de la fila,
 * así que 50 peticiones simultáneas se serializan y solo las primeras `limite` pasan.
 * El patrón «comprobar, hashear y, si falla, incrementar» dejaría pasar a todas las
 * paralelas antes del primer incremento.
 *
 * - Las claves son HMAC del **correo enviado** y del origen (`claves.ts`), nunca de
 *   una cuenta: ni un retraso ni un `429` delatan qué correos tienen cuenta.
 * - Un éxito solo reinicia **su** clave (correo, origen), nunca la del origen.
 * - Cada asociación tiene sus contadores (RLS): bloquear en una no afecta a otra.
 * - La reserva debe hacerse en una transacción **corta y propia**, confirmada antes
 *   de verificar: dentro de una transacción que luego falla se perdería.
 */
import { sql } from "drizzle-orm";
import type { BaseDeAsociacion } from "../base-de-datos.js";

export interface PoliticaLimite {
  /** Intentos permitidos por ventana. El siguiente se bloquea. */
  limite: number;
  ventanaSegundos: number;
  /** Espera tras el primer exceso, el segundo… El último valor se repite. */
  esperasSegundos: readonly number[];
}

/** Por (correo, origen): 5 cada 15 min; esperas de 1, 5 y 15 min y 1 h. */
export const POLITICA_CUENTA_ORIGEN: PoliticaLimite = {
  limite: 5,
  ventanaSegundos: 900,
  esperasSegundos: [60, 300, 900, 3600],
};

/** Por origen: 20 fallos cada 15 min (mayor: detrás de un NAT comparten origen varias personas). */
export const POLITICA_ORIGEN: PoliticaLimite = {
  limite: 20,
  ventanaSegundos: 900,
  esperasSegundos: [60, 300, 900, 3600],
};

export interface ResultadoReserva {
  permitido: boolean;
  /** Segundos hasta poder reintentar (0 si está permitido). */
  reintentarEnSegundos: number;
  contador: number;
}

/**
 * Cuenta un intento y dice si puede seguir. Si lo bloquea, fija la espera según
 * cuántos excesos lleva (1 min, 5, 15, 1 h).
 */
export async function reservarIntento(
  base: BaseDeAsociacion,
  clave: Buffer,
  politica: PoliticaLimite,
): Promise<ResultadoReserva> {
  // La ventana termina solo si además no hay un bloqueo vigente: una espera larga
  // no se levanta porque el contador «haya caducado».
  const { rows } = await base.execute<{
    contador: number;
    bloqueada: boolean;
    restante: number | null;
  }>(sql`
    INSERT INTO public.limite_uso AS l (clave, contador, ventana_desde)
    VALUES (${clave}, 1, now())
    ON CONFLICT (asociacion_id, clave) DO UPDATE SET
      contador = CASE
        WHEN l.ventana_desde <= now() - make_interval(secs => ${politica.ventanaSegundos})
         AND (l.bloqueado_hasta IS NULL OR l.bloqueado_hasta <= now())
        THEN 1
        -- Con un bloqueo vigente no se cuenta: los reintentos durante la espera no la
        -- alargan (auditoría, M2); la escalada llega al terminar la espera.
        WHEN l.bloqueado_hasta IS NOT NULL AND l.bloqueado_hasta > now() THEN l.contador
        ELSE l.contador + 1 END,
      ventana_desde = CASE
        WHEN l.ventana_desde <= now() - make_interval(secs => ${politica.ventanaSegundos})
         AND (l.bloqueado_hasta IS NULL OR l.bloqueado_hasta <= now())
        THEN now() ELSE l.ventana_desde END,
      bloqueado_hasta = CASE
        WHEN l.ventana_desde <= now() - make_interval(secs => ${politica.ventanaSegundos})
         AND (l.bloqueado_hasta IS NULL OR l.bloqueado_hasta <= now())
        THEN NULL ELSE l.bloqueado_hasta END
    RETURNING l.contador,
              (l.bloqueado_hasta IS NOT NULL AND l.bloqueado_hasta > now()) AS bloqueada,
              extract(epoch FROM (l.bloqueado_hasta - now()))::float8 AS restante`);
  const fila = rows[0];
  if (!fila) throw new Error("la reserva del intento no devolvió fila");
  const contador = Number(fila.contador);

  // Ya bloqueado de antes: se rechaza sin alargar la espera vigente.
  if (fila.bloqueada) {
    return {
      permitido: false,
      contador,
      reintentarEnSegundos: Math.max(1, Math.ceil(Number(fila.restante ?? 1))),
    };
  }
  if (contador <= politica.limite) {
    return { permitido: true, contador, reintentarEnSegundos: 0 };
  }

  // Primer exceso (o el siguiente tras terminar la espera): se fija una espera mayor.
  const exceso = contador - politica.limite;
  const esperas = politica.esperasSegundos;
  const espera = esperas[Math.min(exceso, esperas.length) - 1] ?? 60;
  await base.execute(sql`
    UPDATE public.limite_uso
       SET bloqueado_hasta = now() + make_interval(secs => ${espera})
     WHERE clave = ${clave}`);
  return { permitido: false, contador, reintentarEnSegundos: espera };
}

/**
 * Descuenta un intento (nunca por debajo de 0). Un login correcto lo usa sobre la clave
 * del origen: ese contador es de **fallos**, y 20 personas que entran bien desde la
 * misma red no deben agotarlo (auditoría, M2).
 */
export async function liberarIntento(
  base: BaseDeAsociacion,
  clave: Buffer,
): Promise<void> {
  await base.execute(sql`
    UPDATE public.limite_uso SET contador = GREATEST(contador - 1, 0)
     WHERE clave = ${clave}`);
}

/** Borra el contador de una clave (un login correcto reinicia **su** clave, no la de origen). */
export async function reiniciarLimite(
  base: BaseDeAsociacion,
  clave: Buffer,
): Promise<void> {
  await base.execute(sql`DELETE FROM public.limite_uso WHERE clave = ${clave}`);
}

export interface OpcionesLimpieza {
  /** Filas que se borran como máximo en cada llamada (no hay un DELETE gigante). */
  lote: number;
  /** Filas que puede acumular la asociación: lo que pase de aquí se descarta, lo más antiguo primero. */
  tope: number;
  /** Una ventana más antigua que esto, sin bloqueo vigente, se considera vencida. */
  antiguedadSegundos?: number;
}

export const LIMPIEZA_POR_DEFECTO: OpcionesLimpieza = {
  lote: 100,
  tope: 10_000,
  antiguedadSegundos: 86_400,
};

/**
 * Limpieza oportunista, en lotes y dentro del contexto de la asociación: borra los
 * contadores vencidos y, si la asociación acumula más del tope, los más antiguos.
 * Devuelve cuántas filas borró.
 */
export async function limpiarLimites(
  base: BaseDeAsociacion,
  { lote, tope, antiguedadSegundos = 86_400 }: OpcionesLimpieza,
): Promise<number> {
  const vencidas = await base.execute(sql`
    DELETE FROM public.limite_uso
     WHERE ctid IN (
       SELECT ctid FROM public.limite_uso
        WHERE ventana_desde < now() - make_interval(secs => ${antiguedadSegundos})
          AND (bloqueado_hasta IS NULL OR bloqueado_hasta < now())
        LIMIT ${lote}
        FOR UPDATE SKIP LOCKED)`);
  const borradasPorVencer = vencidas.rowCount ?? 0;
  if (borradasPorVencer >= lote) return borradasPorVencer;

  // Lo que quede por encima del tope: lo más antiguo primero (nunca lo bloqueado).
  const restante = lote - borradasPorVencer;
  const excedentes = await base.execute(sql`
    DELETE FROM public.limite_uso
     WHERE ctid IN (
       SELECT ctid FROM public.limite_uso
        WHERE bloqueado_hasta IS NULL OR bloqueado_hasta < now()
        ORDER BY ventana_desde ASC
        LIMIT LEAST(
          ${restante},
          GREATEST((SELECT count(*) FROM public.limite_uso) - ${tope}, 0))
        FOR UPDATE SKIP LOCKED)`);
  return borradasPorVencer + (excedentes.rowCount ?? 0);
}

/**
 * Por correo, sin origen: 50 por hora. **Solo alerta, nunca bloquea**: bloquearía a su
 * dueño legítimo desde cualquier sitio (un atacante bastaría con teclear mal 50 veces).
 * La fuerza bruta distribuida contra una cuenta es un riesgo aceptado hasta el doble
 * factor (plan del corte 3, §2.2).
 */
export const POLITICA_CUENTA_GLOBAL: PoliticaLimite = {
  limite: 50,
  ventanaSegundos: 3600,
  esperasSegundos: [60],
};
