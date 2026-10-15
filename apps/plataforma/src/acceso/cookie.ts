/**
 * La cookie de sesión (plan del corte 3, CA-4).
 *
 * `__Host-aspal_sesion`, `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/` y **sin
 * `Domain`**: el prefijo `__Host-` exige esas tres cosas y hace que la cookie sea
 * solo de ese subdominio, así un subdominio hermano no puede leerla ni plantarla
 * (cookie tossing). Con `http` (solo en local, y la configuración lo limita a
 * `.localhost`) no puede haber prefijo ni `Secure`.
 */
import type { CookieSerializeOptions } from "@fastify/cookie";

export type Esquema = "http" | "https";

export function nombreCookieSesion(esquema: Esquema): string {
  return esquema === "https" ? "__Host-aspal_sesion" : "aspal_sesion";
}

export function opcionesCookieSesion(
  esquema: Esquema,
  expiraEn: Date,
): CookieSerializeOptions & { maxAge: number } {
  return {
    httpOnly: true,
    secure: esquema === "https",
    sameSite: "lax",
    path: "/",
    // Sin `domain`, a propósito.
    maxAge: Math.max(0, Math.floor((expiraEn.getTime() - Date.now()) / 1000)),
  };
}

/** Lo necesario para borrar la cookie: los mismos atributos, sin `maxAge`. */
export function opcionesParaBorrar(esquema: Esquema): CookieSerializeOptions {
  return { httpOnly: true, secure: esquema === "https", sameSite: "lax", path: "/" };
}
