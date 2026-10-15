/**
 * Invitaciones (`docs/api/plataforma.md`, plan del corte 3, CA-26): crear, listar y
 * revocar (solo administrador) y aceptar (pública, con el token del correo).
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Dependencias } from "../app.js";
import { construirEnlace } from "../correo/enlaces.js";
import { plantillaInvitacion } from "../correo/plantillas.js";
import { cuerpoError } from "../zod-fastify.js";
import {
  ESQUEMA_NOMBRE,
  abrirPrimeraSesion,
  crearCuentaVerificada,
  existeCuentaConCorreo,
  fijarCookieDeSesion,
} from "./altas.js";
import { esCorreoValido, normalizarCorreo } from "./claves.js";
import { bloquearGestion, esAdministradorActivo } from "./gestion-personas.js";
import { rutaAutenticada } from "./con-sesion.js";
import { validarContrasena } from "./contrasenas.js";
import {
  RespuestaDeError,
  codigoPostgres,
  conflicto,
  cuerpoEnlaceInvalido,
  noEncontrado,
  prohibido,
} from "./errores.js";
import {
  comprobarInvitacion,
  crearInvitacion,
  liberarInvitacion,
  listarInvitacionesPendientes,
  reclamarInvitacion,
  revocarInvitacion,
} from "./invitaciones.js";
import { limpiezaOportunista } from "./limpieza.js";
import { puede } from "./permisos.js";
import { reservarInvitacion } from "./presupuestos.js";
import { ROLES } from "./rol.js";
import { ColaLlena } from "./semaforo.js";
import { nombreDeAsociacion } from "./tokens-correo.js";

const CUERPO_INVITAR = z.object({ correo: z.string().max(254), rol: z.enum(ROLES) });
const PARAMETROS_ID = z.object({ invitacionId: z.uuid() });
const CUERPO_ACEPTAR = z.object({
  token: z.string().max(200),
  nombre: ESQUEMA_NOMBRE,
  contrasena: z.string().min(1).max(200),
  aceptaTerminos: z.boolean(),
});

const DATOS_INVITACION = z.object({
  id: z.string(),
  correo: z.string(),
  rol: z.string(),
  expiraEn: z.string(),
});
const RESPUESTA_CREADA = z.object({
  success: z.literal(true),
  data: DATOS_INVITACION.extend({ enviada: z.boolean() }),
});
const RESPUESTA_LISTA = z.object({
  success: z.literal(true),
  data: z.object({ invitaciones: z.array(DATOS_INVITACION) }),
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
const ERROR = z.object({
  success: z.literal(false),
  error: z.object({
    codigo: z.string(),
    mensaje: z.string(),
    campo: z.string().optional(),
  }),
});

const REINTENTO_COLA_LLENA_SEGUNDOS = 5;

export function registrarInvitaciones(
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

  rutaAutenticada(
    app,
    dependencias,
    {
      metodo: "POST",
      url: "/invitaciones",
      schema: {
        body: CUERPO_INVITAR,
        response: { 201: RESPUESTA_CREADA, "4xx": ERROR },
      },
    },
    async (contexto, peticion, respuesta) => {
      if (!puede(contexto.roles, "invitaciones:gestionar")) throw prohibido();
      const { correo: enviado, rol } = peticion.body as z.infer<typeof CUERPO_INVITAR>;
      const correo = normalizarCorreo(enviado);
      if (!esCorreoValido(correo)) {
        throw new RespuestaDeError(
          400,
          "VALIDACION_FALLIDA",
          "El correo no es válido",
          "correo",
        );
      }
      if (await existeCuentaConCorreo(contexto.base, correo)) {
        throw conflicto(
          "CUENTA_EXISTENTE",
          "Ese correo ya tiene cuenta: asígnale el rol desde sus roles",
        );
      }
      // El cupo se cuenta aunque se rechace: se responde sin lanzar para confirmar la reserva.
      const cupo = await reservarInvitacion(
        contexto.base,
        secretoClaves,
        contexto.personaId,
      );
      if (!cupo.permitido) {
        return respuesta
          .code(429)
          .header("Retry-After", String(cupo.reintentarEnSegundos))
          .send(
            cuerpoError(
              "DEMASIADOS_INTENTOS",
              "Alcanzaste el tope de invitaciones del día",
            ),
          );
      }
      const creada = await crearInvitacion(contexto.base, {
        correo,
        rol,
        invitadaPor: contexto.personaId,
      });
      if (!creada) {
        throw conflicto(
          "INVITACION_DUPLICADA",
          "Ya hay una invitación pendiente para ese correo y ese rol",
        );
      }
      const nombre = await nombreDeAsociacion(contexto.base);
      const subdominio = peticion.asociacion!.subdominio;
      // El correo sale solo si la transacción se confirma.
      // `enviada` dice si el correo entró en la cola (si no, se puede revocar y repetir).
      const datos = {
        id: creada.id,
        correo,
        rol,
        expiraEn: creada.expiraEn.toISOString(),
        enviada: false,
      };
      contexto.alConfirmar(() => {
        datos.enviada = servicioCorreo.encolar(
          plantillaInvitacion(
            { asociacion: nombre, para: correo },
            construirEnlace(dependencias, subdominio, "/invitacion", creada.token),
          ),
        );
      });
      respuesta.code(201);
      return { success: true as const, data: datos };
    },
  );

  rutaAutenticada(
    app,
    dependencias,
    {
      metodo: "GET",
      url: "/invitaciones",
      schema: { response: { 200: RESPUESTA_LISTA, "4xx": ERROR } },
    },
    async (contexto) => {
      if (!puede(contexto.roles, "invitaciones:gestionar")) throw prohibido();
      const pendientes = await listarInvitacionesPendientes(contexto.base);
      return {
        success: true as const,
        data: {
          invitaciones: pendientes.map((i) => ({
            id: i.id,
            correo: i.correo,
            rol: i.rol,
            expiraEn: i.expiraEn.toISOString(),
          })),
        },
      };
    },
  );

  rutaAutenticada(
    app,
    dependencias,
    {
      metodo: "DELETE",
      url: "/invitaciones/:invitacionId",
      schema: { params: PARAMETROS_ID, response: { 200: RESPUESTA_VACIA, "4xx": ERROR } },
    },
    async (contexto, peticion) => {
      if (!puede(contexto.roles, "invitaciones:gestionar")) throw prohibido();
      const { invitacionId } = peticion.params as z.infer<typeof PARAMETROS_ID>;
      if (!(await revocarInvitacion(contexto.base, invitacionId))) {
        throw noEncontrado("La invitación no existe o ya no está pendiente");
      }
      return { success: true as const, data: {} };
    },
  );

  app.post(
    "/invitaciones/aceptar",
    {
      config: { categoria: "publica" },
      schema: {
        body: CUERPO_ACEPTAR,
        response: { 200: RESPUESTA_SESION, 400: ERROR, 503: ERROR },
      },
    },
    async (peticion, respuesta) => {
      const asociacion = peticion.asociacion!;
      const { token, nombre, contrasena, aceptaTerminos } = peticion.body as z.infer<
        typeof CUERPO_ACEPTAR
      >;
      await limpiezaOportunista(dependencias, peticion);

      // 1. ¿Vale la invitación (y su invitador)? Solo lectura y sin scrypt.
      const invitacion = await enAsociacion(asociacion.id, (base) =>
        comprobarInvitacion(base, token),
      );
      if (!invitacion) return respuesta.code(400).send(cuerpoEnlaceInvalido());

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
      if (validarContrasena(contrasena, invitacion.correo) !== null) {
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

      // 3. Reclamar (revalidando al invitador en la misma sentencia) ANTES de hashear.
      const reclamada = await enAsociacion(asociacion.id, (base) =>
        reclamarInvitacion(base, token),
      );
      if (!reclamada) return respuesta.code(400).send(cuerpoEnlaceInvalido());

      // 4. El scrypt, fuera de toda transacción. Si no puede hacerse, se devuelve el token.
      let hashContrasena: string;
      try {
        hashContrasena = await contrasenas.hashear(contrasena, asociacion.id);
      } catch (error) {
        await enAsociacion(asociacion.id, (base) => liberarInvitacion(base, token)).catch(
          () => peticion.log.warn("no se pudo devolver la invitación reclamada"),
        );
        if (!(error instanceof ColaLlena)) throw error;
        return respuesta
          .code(503)
          .header("Retry-After", String(REINTENTO_COLA_LLENA_SEGUNDOS))
          .send(
            cuerpoError("NO_DISPONIBLE", "Servicio ocupado. Inténtalo en unos segundos"),
          );
      }

      // 5. Persona, cuenta y rol, y la primera sesión, en una transacción. La UNIQUE
      //    (asociacion_id, correo) es el árbitro final.
      const alta = await enAsociacion(asociacion.id, async (base) => {
        // Entre reclamar y crear hubo un scrypt: el invitador pudo perder el rol. Con el
        // bloqueo de gestión se serializa con quien se lo quita (auditoría, M3).
        await bloquearGestion(base);
        if (!(await esAdministradorActivo(base, reclamada.invitadaPor))) return null;
        if (await existeCuentaConCorreo(base, reclamada.correo)) return null;
        const { cuentaId } = await crearCuentaVerificada(base, {
          nombre,
          correo: reclamada.correo,
          hashContrasena,
          rol: reclamada.rol,
          asignadoPor: reclamada.invitadaPor,
        });
        return abrirPrimeraSesion(base, cuentaId, reclamada.rol);
      }).catch(async (error: unknown) => {
        if (codigoPostgres(error) === "23505") return null;
        // Fallo transitorio (interbloqueo, tiempo agotado…): la invitación no se pierde.
        await enAsociacion(asociacion.id, (base) => liberarInvitacion(base, token)).catch(
          () => peticion.log.warn("no se pudo devolver la invitación reclamada"),
        );
        throw error;
      });
      if (!alta) return respuesta.code(400).send(cuerpoEnlaceInvalido());

      fijarCookieDeSesion(respuesta, esquemaPublico, alta);
      return respuesta.code(200).send({
        success: true as const,
        data: {
          persona: { nombre },
          roles: [reclamada.rol],
          expiraEn: alta.expiraEn.toISOString(),
        },
      });
    },
  );
}
