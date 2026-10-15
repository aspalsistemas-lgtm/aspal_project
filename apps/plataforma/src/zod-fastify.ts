/**
 * Puente entre Fastify y Zod: los esquemas de cada ruta son de Zod y validan la
 * entrada (body, query, params) y la salida.
 *
 * Se escribe aquí en vez de usar `fastify-type-provider-zod`, cuya versión 7
 * exige `@fastify/swagger` y `openapi-types` como dependencias obligatorias
 * (decisión del 2026-10-14, Etapa 1, corte 1).
 */
import type { FastifyError, FastifyInstance } from "fastify";
import { z } from "zod";

/** Cuerpo de error del sobre único (`docs/api/plataforma.md`). */
export interface CuerpoError {
  success: false;
  error: { codigo: string; mensaje: string; campo?: string };
}

export function cuerpoError(
  codigo: string,
  mensaje: string,
  campo?: string,
): CuerpoError {
  return {
    success: false,
    error: campo ? { codigo, mensaje, campo } : { codigo, mensaje },
  };
}

/** La salida de un handler no cumple su esquema: es un fallo nuestro, no del cliente. */
class SalidaInvalida extends Error {}

export function registrarZod(app: FastifyInstance): void {
  app.setValidatorCompiler(({ schema }) => (datos) => {
    const resultado = (schema as z.ZodType).safeParse(datos);
    return resultado.success ? { value: resultado.data } : { error: resultado.error };
  });

  app.setSerializerCompiler(({ schema }) => (datos) => {
    // Zod quita las claves que el esquema no declara: un campo interno que se
    // cuele en la respuesta no sale.
    const resultado = (schema as z.ZodType).safeParse(datos);
    if (!resultado.success) throw new SalidaInvalida();
    return JSON.stringify(resultado.data);
  });

  app.setErrorHandler((error: FastifyError, peticion, respuesta) => {
    if (error.code === "FST_ERR_VALIDATION" && error instanceof z.ZodError) {
      const primero = error.issues[0];
      return respuesta
        .code(400)
        .send(
          cuerpoError(
            "VALIDACION_FALLIDA",
            primero?.message ?? "Entrada no válida",
            primero?.path.join("."),
          ),
        );
    }
    // Un 4xx de Fastify (JSON mal formado, cuerpo demasiado grande, tipo no admitido) es
    // culpa del cliente: no es un 500, y el mensaje original puede traer un fragmento del
    // cuerpo (una contraseña, por ejemplo), así que ni se devuelve ni se registra.
    const estado = error.statusCode;
    if (estado && estado >= 400 && estado < 500) {
      peticion.log.warn({ codigo: error.code, estado }, "petición rechazada");
      const [codigo, mensaje] =
        estado === 413
          ? ["CUERPO_DEMASIADO_GRANDE", "El cuerpo de la petición es demasiado grande"]
          : estado === 415
            ? ["TIPO_NO_ADMITIDO", "La petición debe ser application/json"]
            : ["VALIDACION_FALLIDA", "La petición no es válida"];
      return respuesta.code(estado).send(cuerpoError(codigo, mensaje));
    }
    peticion.log.error({ err: error }, "error no controlado");
    return respuesta.code(500).send(cuerpoError("ERROR_INTERNO", "Error interno"));
  });

  app.setNotFoundHandler((_peticion, respuesta) =>
    respuesta.code(404).send(cuerpoError("RECURSO_NO_ENCONTRADO", "La ruta no existe")),
  );
}
