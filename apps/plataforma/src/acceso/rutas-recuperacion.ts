/**
 * Recuperar la contraseña (`docs/api/plataforma.md`, plan del corte 3, CA-24 y CA-25).
 *
 * - `POST /solicitudes-recuperacion` responde **siempre** `202`, exista o no la cuenta,
 *   esté la persona activa o no, haya o no presupuesto: nunca revela nada. El envío no
 *   bloquea.
 * - `POST /restablecimientos-contrasena`: valida el token **antes** de hashear (un token
 *   inventado cuesta cero scrypt), comprueba la política de contraseña sin gastar el
 *   token, y consume el token y cambia la contraseña revocando todas las sesiones.
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Dependencias } from "../app.js";
import { construirEnlace } from "../correo/enlaces.js";
import {
  plantillaContrasenaCambiada,
  plantillaRecuperacion,
} from "../correo/plantillas.js";
import { cuerpoError } from "../zod-fastify.js";
import { claveDeOrigen, esCorreoValido, normalizarCorreo } from "./claves.js";
import { validarContrasena } from "./contrasenas.js";
import { limpiezaOportunista } from "./limpieza.js";
import { reservarEnvio } from "./presupuestos.js";
import { ColaLlena } from "./semaforo.js";
import { revocarCredenciales } from "./sesiones.js";
import {
  comprobarTokenRecuperacion,
  invalidarTokensDeRecuperacion,
  liberarTokenRecuperacion,
  reclamarTokenRecuperacion,
  crearTokenRecuperacion,
  cuentaActivaPorCorreo,
  nombreDeAsociacion,
} from "./tokens-correo.js";

const CUERPO_SOLICITUD = z.object({ correo: z.string().max(254) });
const CUERPO_RESTABLECER = z.object({
  token: z.string().max(200),
  contrasena: z.string().min(1).max(200),
});

const RESPUESTA_VACIA = z.object({ success: z.literal(true), data: z.object({}) });
const RESPUESTA_ERROR = z.object({
  success: z.literal(false),
  error: z.object({
    codigo: z.string(),
    mensaje: z.string(),
    campo: z.string().optional(),
  }),
});

export const enlaceInvalido = () =>
  cuerpoError("ENLACE_INVALIDO", "El enlace no es válido o ya caducó");

const REINTENTO_COLA_LLENA_SEGUNDOS = 5;

export function registrarRecuperacion(
  app: FastifyInstance,
  dependencias: Dependencias,
): void {
  const {
    enAsociacion,
    contrasenas,
    secretoClaves,
    correo: servicioCorreo,
  } = dependencias;

  app.post(
    "/solicitudes-recuperacion",
    {
      config: { categoria: "publica" },
      schema: {
        body: CUERPO_SOLICITUD,
        response: { 202: RESPUESTA_VACIA, 429: RESPUESTA_ERROR },
      },
    },
    async (peticion, respuesta) => {
      const asociacion = peticion.asociacion!;
      const { correo: enviado } = peticion.body as z.infer<typeof CUERPO_SOLICITUD>;
      const correo = normalizarCorreo(enviado);
      await limpiezaOportunista(dependencias, peticion);

      // Una transacción corta y confirmada: el presupuesto se cuenta pase lo que pase.
      const decision = await enAsociacion(asociacion.id, async (base) => {
        const permitido = await reservarEnvio(base, secretoClaves, {
          tipo: "recuperacion",
          destinatario: correo,
          origen: claveDeOrigen(peticion.ip),
        });
        if (!permitido || !esCorreoValido(correo)) return null;
        const cuenta = await cuentaActivaPorCorreo(base, correo);
        if (!cuenta) return null;
        const token = await crearTokenRecuperacion(base, cuenta.cuentaId);
        if (!token) return null;
        return { token, asociacion: await nombreDeAsociacion(base) };
      });

      if (decision) {
        servicioCorreo.encolar(
          plantillaRecuperacion(
            { asociacion: decision.asociacion, para: correo },
            construirEnlace(
              dependencias,
              asociacion.subdominio,
              "/recuperar-contrasena",
              decision.token,
            ),
          ),
        );
      }
      return respuesta.code(202).send({ success: true as const, data: {} });
    },
  );

  app.post(
    "/restablecimientos-contrasena",
    {
      config: { categoria: "publica" },
      schema: {
        body: CUERPO_RESTABLECER,
        response: {
          200: RESPUESTA_VACIA,
          400: RESPUESTA_ERROR,
          503: RESPUESTA_ERROR,
        },
      },
    },
    async (peticion, respuesta) => {
      const asociacion = peticion.asociacion!;
      const { token, contrasena } = peticion.body as z.infer<typeof CUERPO_RESTABLECER>;
      await limpiezaOportunista(dependencias, peticion);

      // 1. ¿Vale el token? Solo lectura y sin scrypt: 100 tokens inventados cuestan cero.
      const valido = await enAsociacion(asociacion.id, (base) =>
        comprobarTokenRecuperacion(base, token),
      );
      if (!valido) return respuesta.code(400).send(enlaceInvalido());

      // 2. La política de contraseña, antes de gastar el token.
      if (validarContrasena(contrasena, valido.correo) !== null) {
        return respuesta
          .code(400)
          .send(
            cuerpoError(
              "CONTRASENA_NO_ADMITIDA",
              "La contraseña no cumple la política (12 a 200 caracteres, no común)",
              "contrasena",
            ),
          );
      }

      // 3. Reclamar el token (una sentencia atómica) ANTES de hashear: de varias
      //    confirmaciones simultáneas gana una y las demás cuestan cero scrypt.
      const reclamado = await enAsociacion(asociacion.id, (base) =>
        reclamarTokenRecuperacion(base, token),
      );
      if (!reclamado) return respuesta.code(400).send(enlaceInvalido());

      // 4. El scrypt, fuera de toda transacción. Si no puede hacerse, el token se
      //    devuelve: la persona no pierde su enlace por una cola llena.
      let hashNuevo: string;
      try {
        hashNuevo = await contrasenas.hashear(contrasena, asociacion.id);
      } catch (error) {
        await enAsociacion(asociacion.id, (base) =>
          liberarTokenRecuperacion(base, token),
        ).catch(() => peticion.log.warn("no se pudo devolver el token reclamado"));
        if (!(error instanceof ColaLlena)) throw error;
        return respuesta
          .code(503)
          .header("Retry-After", String(REINTENTO_COLA_LLENA_SEGUNDOS))
          .send(
            cuerpoError("NO_DISPONIBLE", "Servicio ocupado. Inténtalo en unos segundos"),
          );
      }

      // 5. Cambiar la contraseña y cerrar las sesiones, en una transacción.
      const cambio = await enAsociacion(asociacion.id, async (base) => {
        await revocarCredenciales(base, reclamado.cuentaId, hashNuevo);
        await invalidarTokensDeRecuperacion(base, reclamado.cuentaId);
        const permitido = await reservarEnvio(base, secretoClaves, {
          tipo: "aviso",
          destinatario: reclamado.correo,
          origen: claveDeOrigen(peticion.ip),
        });
        return {
          correo: reclamado.correo,
          avisar: permitido,
          asociacion: await nombreDeAsociacion(base),
        };
      });

      if (cambio.avisar) {
        servicioCorreo.encolar(
          plantillaContrasenaCambiada({
            asociacion: cambio.asociacion,
            para: cambio.correo,
          }),
        );
      }
      return respuesta.code(200).send({ success: true as const, data: {} });
    },
  );
}
