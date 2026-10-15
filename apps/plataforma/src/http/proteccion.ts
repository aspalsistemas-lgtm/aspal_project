/**
 * Capa HTTP común de la plataforma (plan del corte 3, CA-9, CA-11, CA-12, CA-16,
 * CA-17 y CA-30).
 *
 * Todo lo que no es de una ruta concreta vive aquí, en hooks de la aplicación:
 *
 * 1. **Categorías.** Toda ruta declara `config: { categoria }` y una ruta sin
 *    categoría **no se registra**. Así ninguna ruta puede olvidarse de resolver la
 *    asociación o de pasar por las comprobaciones de abajo.
 *    - `global`: no depende de ninguna asociación (`/health`).
 *    - `publica`: requiere asociación, no sesión (`POST /sesiones`).
 *    - `autenticada`: requiere asociación y sesión.
 * 2. **Resolución de la asociación** por el `Host` (nunca por `X-Forwarded-Host`),
 *    con un límite grueso por origen **antes** de consultar la base.
 * 3. **Peticiones con efecto:** `Origin` idéntico al de la asociación (esquema,
 *    host y puerto), `Sec-Fetch-Site` compatible y JSON.
 * 4. **Cabeceras de caché** en todas las respuestas salvo las globales.
 */
import type { FastifyInstance, FastifyReply } from "fastify";
import { claveDeOrigen } from "../acceso/claves.js";
import type { Dependencias } from "../app.js";
import { subdominioDesdeHost } from "../asociaciones/host.js";
import type { AsociacionResuelta } from "../base-de-datos.js";
import { cuerpoError } from "../zod-fastify.js";
import { LimitadorMemoria } from "./limite-memoria.js";

export const CATEGORIAS = ["global", "publica", "autenticada"] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export interface RutaRegistrada {
  metodo: string;
  url: string;
  categoria: Categoria;
}

declare module "fastify" {
  interface FastifyContextConfig {
    categoria?: Categoria;
  }
  interface FastifyRequest {
    /** La asociación del `Host`, o null si la dirección no es de ninguna. */
    asociacion: AsociacionResuelta | null;
  }
  interface FastifyInstance {
    /** Registro de las rutas con su categoría (lo consultan los tests). */
    rutasRegistradas: RutaRegistrada[];
  }
}

/** Cupos del límite grueso por origen y minuto, por categoría de ruta. */
export interface LimiteGrueso {
  publica: number;
  autenticada: number;
  ventanaMs: number;
}

export const LIMITE_GRUESO_POR_DEFECTO: LimiteGrueso = {
  publica: 60,
  autenticada: 600,
  ventanaMs: 60_000,
};

const METODOS_CON_EFECTO = new Set(["POST", "PUT", "PATCH", "DELETE"]);
/** Los que llevan cuerpo: exigen JSON. `DELETE` no lo lleva. */
const METODOS_CON_CUERPO = new Set(["POST", "PUT", "PATCH"]);

function esJson(tipo: string | undefined): boolean {
  return /^application\/json\s*(;|$)/i.test(tipo ?? "");
}

function noEncontrada(respuesta: FastifyReply): FastifyReply {
  return respuesta
    .code(404)
    .send(
      cuerpoError("RECURSO_NO_ENCONTRADO", "No hay una asociación en esta dirección"),
    );
}

function prohibidoPorOrigen(respuesta: FastifyReply): FastifyReply {
  return respuesta
    .code(403)
    .send(cuerpoError("ORIGEN_NO_PERMITIDO", "La petición no viene de esta asociación"));
}

export function registrarProteccion(
  app: FastifyInstance,
  {
    dominioBase,
    esquemaPublico,
    puertoPublico,
    limiteGrueso,
    resolverAsociacion,
  }: Pick<
    Dependencias,
    | "dominioBase"
    | "esquemaPublico"
    | "puertoPublico"
    | "limiteGrueso"
    | "resolverAsociacion"
  >,
): void {
  const registro: RutaRegistrada[] = [];
  app.decorate("rutasRegistradas", registro);
  app.decorateRequest("asociacion", null);

  // 1. Una ruta sin categoría (o con una inventada) no se registra.
  app.addHook("onRoute", (ruta) => {
    const categoria = ruta.config?.categoria;
    if (!categoria || !CATEGORIAS.includes(categoria)) {
      throw new Error(
        `La ruta ${String(ruta.method)} ${ruta.url} no declara una categoría válida (${CATEGORIAS.join(", ")})`,
      );
    }
    registro.push({ metodo: String(ruta.method), url: ruta.url, categoria });
  });

  const limitadores: Record<"publica" | "autenticada", LimitadorMemoria> = {
    publica: new LimitadorMemoria({
      max: limiteGrueso.publica,
      ventanaMs: limiteGrueso.ventanaMs,
    }),
    autenticada: new LimitadorMemoria({
      max: limiteGrueso.autenticada,
      ventanaMs: limiteGrueso.ventanaMs,
    }),
  };

  function origenEsperado(subdominio: string): string {
    const puerto = puertoPublico ? `:${puertoPublico}` : "";
    return `${esquemaPublico}://${subdominio}.${dominioBase}${puerto}`;
  }

  // 2 y 3. Resolución de la asociación y protección de las peticiones con efecto.
  app.addHook("onRequest", async (peticion, respuesta) => {
    const categoria = peticion.routeOptions.config?.categoria;
    // Sin ruta (un 404) o ruta global: no hay nada que atender en nombre de una
    // asociación, y consultar la base por cada dirección inventada sería una
    // amplificación gratuita.
    if (!categoria || categoria === "global") return;

    // headers.host y no X-Forwarded-Host: ese lo pone quien quiera.
    const subdominio = subdominioDesdeHost(peticion.headers.host, dominioBase);
    if (!subdominio) return noEncontrada(respuesta);

    // El límite grueso cuenta cada petición y actúa antes de tocar la base.
    const limite = limitadores[categoria].consumir(claveDeOrigen(peticion.ip));
    if (!limite.permitido) {
      return respuesta
        .code(429)
        .header("Retry-After", String(limite.reintentarEnSegundos))
        .send(
          cuerpoError("DEMASIADOS_INTENTOS", "Demasiadas peticiones; espera un momento"),
        );
    }

    if (METODOS_CON_EFECTO.has(peticion.method)) {
      if (peticion.headers.origin !== origenEsperado(subdominio)) {
        return prohibidoPorOrigen(respuesta);
      }
      const procedencia = peticion.headers["sec-fetch-site"];
      if (procedencia !== undefined && procedencia !== "same-origin") {
        return prohibidoPorOrigen(respuesta);
      }
      if (
        METODOS_CON_CUERPO.has(peticion.method) &&
        !esJson(peticion.headers["content-type"])
      ) {
        return respuesta
          .code(415)
          .send(cuerpoError("TIPO_NO_ADMITIDO", "La petición debe ser application/json"));
      }
    }

    const asociacion = await resolverAsociacion(subdominio);
    if (!asociacion) return noEncontrada(respuesta);
    peticion.asociacion = asociacion;
  });

  // 4. La respuesta depende del Host y de la cookie: ninguna caché compartida debe
  // servir la de una asociación a otra. También los errores (401, 403, 404, 429).
  app.addHook("onSend", async (peticion, respuesta, contenido) => {
    if (peticion.routeOptions.config?.categoria === "global") return contenido;
    respuesta.header("Cache-Control", "private, no-store");
    respuesta.header("Vary", "Host, Cookie");
    return contenido;
  });
}

/** El `req` de los logs: método y ruta, **sin la query** (puede llevar tokens). */
export function serializadorDeReq(req: { method?: string; url?: string }): {
  method: string | undefined;
  url: string;
} {
  return { method: req.method, url: (req.url ?? "").split("?")[0]! };
}
