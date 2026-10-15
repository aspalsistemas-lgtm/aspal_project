/**
 * Nombres de los roles de PostgreSQL de la plataforma (plan del corte 2, §1).
 *
 * Módulo propio y sin efectos: los programas (`preparar-base`, `migrar`,
 * `sembrar`) no pueden importarse entre sí, porque en el bundle de esbuild su
 * comprobación «¿me están ejecutando?» se cumpliría también en el importador.
 */
export const ROL_DUENO = "aspal_dueno";
export const ROL_APP = "aspal_app";
