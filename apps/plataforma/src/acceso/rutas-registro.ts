/**
 * Registro abierto (`docs/api/plataforma.md`, plan del corte 3, CA-23 y CA-24).
 *
 * - `POST /registros` (solo el correo) responde **siempre** `202` y **no crea ninguna
 *   cuenta**: guarda un pendiente y envía un enlace, o un aviso si ya hay cuenta.
 * - `POST /registros/confirmar` pide nombre y contraseña **en ese momento**: valida el
 *   token antes de hashear, reclama el token con una sentencia atómica (20
 *   confirmaciones simultáneas dan exactamente una cuenta) y abre la primera sesión.
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Dependencias } from "../app.js";
import { construirEnlace } from "../correo/enlaces.js";
import { plantillaCuentaExistente, plantillaRegistro } from "../correo/plantillas.js";
import { cuerpoError } from "../zod-fastify.js";
import {
  ESQUEMA_NOMBRE,
  abrirPrimeraSesion,
  crearCuentaVerificada,
  existeCuentaConCorreo,
  fijarCookieDeSesion,
} from "./altas.js";
import { claveDeOrigen, esCorreoValido, normalizarCorreo } from "./claves.js";
import { validarContrasena } from "./contrasenas.js";
import { codigoPostgres, cuerpoEnlaceInvalido } from "./errores.js";
import { limpiezaOportunista } from "./limpieza.js";
import { reservarEnvio } from "./presupuestos.js";
import {
  comprobarRegistro,
  crearRegistroPendiente,
  invalidarRegistrosDeCorreo,
  liberarRegistro,
  reclamarRegistro,
  registroAbierto,
} from "./registros.js";
import { ColaLlena } from "./semaforo.js";
import { nombreDeAsociacion } from "./tokens-correo.js";

const CUERPO_SOLICITUD = z.object({ correo: z.string().max(254) });
const CUERPO_CONFIRMAR = z.object({
  token: z.string().max(200),
  nombre: ESQUEMA_NOMBRE,
  contrasena: z.string().min(1).max(200),
  aceptaTerminos: z.boolean(),
});

const RESPUESTA_VACIA = z.object({ success: z.literal(true), data: z.object({}) });
const RESPUESTA_SESION = z.object({
  success: z.literal(true),
  data: z.object({
    persona: z.object({ nombre: z.string() }),
    roles: z.array(z.string()),
    expiraEn: z.string(),
  }),
});
const RESPUESTA_ERROR = z.object({
  success: z.literal(false),
  error: z.object({
    codigo: z.string(),
    mensaje: z.string(),
    campo: z.string().optional(),
  }),
});

const REINTENTO_COLA_LLENA_SEGUNDOS = 5;

export function registrarRegistro(
  app: FastifyInstance,
  dependencias: Dependencias,
): void {
  const {
    enAsociacion,
    contrasenas,
    secretoClaves,
    correo: servicioCorreo,
    esquemaPublico,
  } = dependencias;

  app.post(
    "/registros",
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
      const origen = claveDeOrigen(peticion.ip);

      // Una transacción corta y confirmada: el presupuesto se cuenta pase lo que pase.
      const decision = await enAsociacion(asociacion.id, async (base) => {
        const permitido = await reservarEnvio(base, secretoClaves, {
          tipo: "registro",
          destinatario: correo,
          origen,
        });
        if (!permitido || !esCorreoValido(correo)) return null;
        if (!(await registroAbierto(base))) return null;
        const nombre = await nombreDeAsociacion(base);
        if (await existeCuentaConCorreo(base, correo)) {
          // Ya tiene cuenta (de cualquier estado): un aviso en lugar del enlace.
          const avisar = await reservarEnvio(base, secretoClaves, {
            tipo: "aviso",
            destinatario: correo,
            origen,
          });
          return avisar ? { tipo: "aviso" as const, nombre } : null;
        }
        const token = await crearRegistroPendiente(base, correo);
        return token ? { tipo: "registro" as const, nombre, token } : null;
      });

      if (decision?.tipo === "registro") {
        servicioCorreo.encolar(
          plantillaRegistro(
            { asociacion: decision.nombre, para: correo },
            construirEnlace(
              dependencias,
              asociacion.subdominio,
              "/registro",
              decision.token,
            ),
          ),
        );
      } else if (decision?.tipo === "aviso") {
        servicioCorreo.encolar(
          plantillaCuentaExistente(
            { asociacion: decision.nombre, para: correo },
            construirEnlace(dependencias, asociacion.subdominio, "/recuperar-contrasena"),
          ),
        );
      }
      return respuesta.code(202).send({ success: true as const, data: {} });
    },
  );

  app.post(
    "/registros/confirmar",
    {
      config: { categoria: "publica" },
      schema: {
        body: CUERPO_CONFIRMAR,
        response: {
          200: RESPUESTA_SESION,
          400: RESPUESTA_ERROR,
          503: RESPUESTA_ERROR,
        },
      },
    },
    async (peticion, respuesta) => {
      const asociacion = peticion.asociacion!;
      const { token, nombre, contrasena, aceptaTerminos } = peticion.body as z.infer<
        typeof CUERPO_CONFIRMAR
      >;
      await limpiezaOportunista(dependencias, peticion);

      // 1. ¿Vale el token? Solo lectura y sin scrypt.
      const pendiente = await enAsociacion(asociacion.id, (base) =>
        comprobarRegistro(base, token),
      );
      if (!pendiente) return respuesta.code(400).send(cuerpoEnlaceInvalido());

      // 2. Términos y política de contraseña, antes de gastar el token.
      if (aceptaTerminos !== true) {
        return respuesta
          .code(400)
          .send(
            cuerpoError(
              "TERMINOS_NO_ACEPTADOS",
              "Debes aceptar los términos y el aviso de privacidad",
              "aceptaTerminos",
            ),
          );
      }
      if (validarContrasena(contrasena, pendiente.correo) !== null) {
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

      // 3. Reclamar el token (una sentencia atómica) ANTES de hashear.
      const reclamado = await enAsociacion(asociacion.id, (base) =>
        reclamarRegistro(base, token),
      );
      if (!reclamado) return respuesta.code(400).send(cuerpoEnlaceInvalido());

      // 4. El scrypt, fuera de toda transacción. Si no puede hacerse, se devuelve el token.
      let hashContrasena: string;
      try {
        hashContrasena = await contrasenas.hashear(contrasena, asociacion.id);
      } catch (error) {
        await enAsociacion(asociacion.id, (base) => liberarRegistro(base, token)).catch(
          () => peticion.log.warn("no se pudo devolver el token reclamado"),
        );
        if (!(error instanceof ColaLlena)) throw error;
        return respuesta
          .code(503)
          .header("Retry-After", String(REINTENTO_COLA_LLENA_SEGUNDOS))
          .send(
            cuerpoError("NO_DISPONIBLE", "Servicio ocupado. Inténtalo en unos segundos"),
          );
      }

      // 5. Crear persona, cuenta y rol, e iniciar la sesión, en una transacción. La
      //    UNIQUE (asociacion_id, correo) es el árbitro final ante una cuenta creada
      //    entretanto (por ejemplo, aceptando una invitación).
      const alta = await enAsociacion(asociacion.id, async (base) => {
        if (await existeCuentaConCorreo(base, reclamado.correo)) return null;
        const { cuentaId } = await crearCuentaVerificada(base, {
          nombre,
          correo: reclamado.correo,
          hashContrasena,
          rol: "miembro",
          asignadoPor: null,
        });
        await invalidarRegistrosDeCorreo(base, reclamado.correo);
        return abrirPrimeraSesion(base, cuentaId, "miembro");
      }).catch((error: unknown) => {
        if (codigoPostgres(error) === "23505") return null;
        throw error;
      });
      if (!alta) return respuesta.code(400).send(cuerpoEnlaceInvalido());

      fijarCookieDeSesion(respuesta, esquemaPublico, alta);
      return respuesta.code(200).send({
        success: true as const,
        data: {
          persona: { nombre },
          roles: ["miembro"],
          expiraEn: alta.expiraEn.toISOString(),
        },
      });
    },
  );
}
