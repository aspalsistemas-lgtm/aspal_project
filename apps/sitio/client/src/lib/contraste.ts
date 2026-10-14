/**
 * Contraste WCAG entre dos colores HSL, en el formato de los tokens de
 * index.css ("206 53% 14%"). Lo usan tokens.test.ts (contra el CSS) y la
 * página /componentes (contra los valores que el navegador ya calculó).
 */
export type Hsl = [number, number, number];

export function hslDeTexto(valor: string): Hsl | null {
  const m = valor.trim().match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

function hslARgb([h, s, l]: Hsl): number[] {
  const sat = s / 100;
  const lum = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(lum, 1 - lum);
  const f = (n: number) =>
    lum - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

function luminancia(rgb: number[]): number {
  const [r, g, b] = rgb.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contraste(texto: Hsl, fondo: Hsl): number {
  const a = luminancia(hslARgb(texto));
  const b = luminancia(hslARgb(fondo));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** [texto, fondo]: todo par que el diseño usa para texto normal. AA exige 4.5. */
export const PARES: readonly (readonly [string, string])[] = [
  ["primary-foreground", "primary"],
  ["secondary-foreground", "secondary"],
  ["brand-noche-foreground", "brand-noche"],
  ["secondary", "brand-noche"],
  ["miel-texto", "background"],
  ["primary", "fondo-suave"],
  ["muted-foreground", "fondo-suave"],
  ["muted-foreground", "background"],
  ["primary", "accent"],
];
