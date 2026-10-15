/**
 * Enlaces de los correos (plan del corte 3, CA-12 y CA-22).
 *
 * Se construyen **solo** con valores de configuración y con el subdominio ya resuelto
 * de la asociación: nunca con `Host`, `X-Forwarded-*`, `request.hostname` ni nada que
 * decida quien hace la petición. El token va en el **fragmento** (`#`): no llega a los
 * registros del servidor ni a la cabecera `Referer`.
 */
export interface BaseDeEnlaces {
  esquemaPublico: "http" | "https";
  dominioBase: string;
  puertoPublico: number | undefined;
}

export type RutaDeEnlace = "/registro" | "/recuperar-contrasena" | "/invitacion";

export function construirEnlace(
  base: BaseDeEnlaces,
  subdominio: string,
  ruta: RutaDeEnlace,
  token?: string,
): string {
  const puerto = base.puertoPublico === undefined ? "" : `:${base.puertoPublico}`;
  const fragmento = token === undefined ? "" : `#${token}`;
  return `${base.esquemaPublico}://${subdominio}.${base.dominioBase}${puerto}${ruta}${fragmento}`;
}
