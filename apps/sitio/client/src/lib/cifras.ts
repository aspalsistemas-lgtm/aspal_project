/** Una cifra de texto («15+», «1,000») partida para poder animar su número. */
export interface PartesCifra {
  prefijo: string;
  numero: number;
  sufijo: string;
  /** Si el original separa los miles con coma («1,000»). */
  miles: boolean;
}

/**
 * Parte una cifra en prefijo, número y sufijo. `null` si no hay un único
 * número entero que animar (p. ej. «2030-2035»): se muestra tal cual.
 */
export function partirCifra(valor: string): PartesCifra | null {
  const m = valor.match(/^(\D*)(\d{1,3}(?:,\d{3})+|\d+)(\D*)$/);
  if (!m) return null;
  return {
    prefijo: m[1],
    numero: Number(m[2].replace(/,/g, "")),
    sufijo: m[3],
    miles: m[2].includes(","),
  };
}

/** La cifra con otro número, en el mismo formato que la original. */
export function formatearCifra(n: number, partes: PartesCifra): string {
  const numero = partes.miles ? n.toLocaleString("en-US") : String(n);
  return `${partes.prefijo}${numero}${partes.sufijo}`;
}
