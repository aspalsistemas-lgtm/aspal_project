/**
 * Rutas de sesión: `POST /sesiones`, `GET /sesiones/actual`, `DELETE /sesiones/actual`
 * (`docs/api/plataforma.md`, plan del corte 3).
 *
 * El login va en **tres pasos** para no retener una conexión durante el scrypt:
 *
 * 1. Transacción corta: cuenta el intento (antes de verificar nada) y lee la cuenta.
 *    Se confirma aunque el intento quede bloqueado: el contador debe sobrevivir.
 * 2. Sin transacción: un único scrypt, exista o no la cuenta.
 * 3. Transacción: crea la sesión revalidando versión de credencial y estado de la
 *    persona, reinicia **solo** la clave (correo, origen) y mejora el hash si hace falta.
 *
 * Todo rechazo del login es la misma respuesta (`CREDENCIALES_INVALIDAS`).
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Dependencias } from "../app.js";
import { cuerpoError } from "../zod-fastify.js";
import {
  claveDeOrigen,
  claveHmac,
  correoParaLimite,
  esCorreoValido,
  normalizarCorreo,
} from "./claves.js";
import { rutaAutenticada } from "./con-sesion.js";
import {
  nombreCookieSesion,
  opcionesCookieSesion,
  opcionesParaBorrar,
} from "./cookie.js";
import {
  POLITICA_CUENTA_GLOBAL,
  POLITICA_CUENTA_ORIGEN,
  POLITICA_ORIGEN,
  LIMPIEZA_POR_DEFECTO,
  limpiarLimites,
  liberarIntento,
  reiniciarLimite,
  reservarIntento,
} from "./limites.js";
import { ColaLlena } from "./semaforo.js";
import {
  buscarCuentaParaAcceso,
  crearSesion,
  generarToken,
  limpiarSesiones,
  rehashearContrasena,
  revocarSesion,
} from "./sesiones.js";

const PROBABILIDAD_DE_LIMPIEZA = 0.02;
const REINTENTO_COLA_LLENA_SEGUNDOS = 5;

const CUERPO_LOGIN = z.object({
  correo: z.string().max(254),
  contrasena: z.string().min(1).max(200),
});

const DATOS_SESION = z.object({
  persona: z.object({ nombre: z.string() }),
  roles: z.array(z.string()),
  expiraEn: z.string(),
});

const RESPUESTA_SESION = z.object({ success: z.literal(true), data: DATOS_SESION });
const RESPUESTA_VACIA = z.object({ success: z.literal(true), data: z.object({}) });
const RESPUESTA_ERROR = z.object({
  success: z.literal(false),
  error: z.object({
    codigo: z.string(),
    mensaje: z.string(),
    campo: z.string().optional(),
  }),
});

const credencialesInvalidas = () =>
  cuerpoError("CREDENCIALES_INVALIDAS", "Correo o contraseña incorrectos");

export function registrarSesiones(
  app: FastifyInstance,
  dependencias: Dependencias,
): void {
  const { enAsociacion, contrasenas, secretoClaves, esquemaPublico } = dependencias;

  app.post(
    "/sesiones",
    {
      config: { categoria: "publica" },
      schema: {
        body: CUERPO_LOGIN,
        response: {
          200: RESPUESTA_SESION,
          401: RESPUESTA_ERROR,
          429: RESPUESTA_ERROR,
          503: RESPUESTA_ERROR,
        },
      },
    },
    async (peticion, respuesta) => {
      const asociacionId = peticion.asociacion!.id;
      const { correo: correoEnviado, contrasena } = peticion.body as z.infer<
        typeof CUERPO_LOGIN
      >;
      const correo = normalizarCorreo(correoEnviado);
      const origen = claveDeOrigen(peticion.ip);
      const correoLimite = correoParaLimite(correoEnviado);
      const claveCuenta = claveHmac(
        secretoClaves,
        "login:cuenta-origen",
        correoLimite,
        origen,
      );
      const claveOrigen = claveHmac(secretoClaves, "login:origen", origen);
      const claveGlobal = claveHmac(secretoClaves, "login:cuenta", correoLimite);

      // Limpieza oportunista, con cualquier intento (no solo los correctos: un atacante
      // que nunca acierta es justo quien llena las tablas). Un fallo aquí nunca estropea
      // el login.
      if (
        Math.random() < (dependencias.probabilidadLimpieza ?? PROBABILIDAD_DE_LIMPIEZA)
      ) {
        await enAsociacion(asociacionId, async (base) => {
          await limpiarLimites(base, LIMPIEZA_POR_DEFECTO);
          await limpiarSesiones(base, LIMPIEZA_POR_DEFECTO.lote);
        }).catch(() => peticion.log.warn("la limpieza oportunista falló"));
      }

      // Paso 1: contar el intento y leer la cuenta, en una transacción corta que se confirma.
      const previo = await enAsociacion(asociacionId, async (base) => {
        // Primero el origen: si ya está bloqueado no se crean filas por correo (un
        // atacante con correos aleatorios no hace crecer la tabla). El orden fijo
        // origen → cuenta → global también evita interbloqueos entre peticiones.
        const porOrigen = await reservarIntento(base, claveOrigen, POLITICA_ORIGEN);
        if (!porOrigen.permitido) {
          return {
            bloqueado: true as const,
            espera: porOrigen.reintentarEnSegundos,
            global: false,
          };
        }
        const porCuenta = await reservarIntento(
          base,
          claveCuenta,
          POLITICA_CUENTA_ORIGEN,
        );
        const global = await reservarIntento(base, claveGlobal, POLITICA_CUENTA_GLOBAL);
        const espera = porCuenta.permitido ? 0 : porCuenta.reintentarEnSegundos;
        if (espera > 0)
          return { bloqueado: true as const, espera, global: !global.permitido };
        const cuenta = esCorreoValido(correo)
          ? await buscarCuentaParaAcceso(base, correo)
          : null;
        return { bloqueado: false as const, cuenta, global: !global.permitido };
      });

      // Solo alerta (sin PII): bloquear por correo castigaría a su dueño.
      if (previo.global) {
        peticion.log.warn(
          { evento: "acceso.intentos_por_cuenta_altos" },
          "muchos intentos contra una cuenta",
        );
      }
      if (previo.bloqueado) {
        return respuesta
          .code(429)
          .header("Retry-After", String(previo.espera))
          .send(
            cuerpoError(
              "DEMASIADOS_INTENTOS",
              "Demasiados intentos. Inténtalo más tarde",
            ),
          );
      }
      const { cuenta } = previo;

      // Paso 2: un único scrypt, fuera de toda transacción.
      let correcta: boolean;
      let hashNuevo: string | null = null;
      try {
        correcta = await contrasenas.verificar(
          contrasena,
          cuenta?.hashContrasena,
          asociacionId,
        );
        if (
          correcta &&
          cuenta?.hashContrasena &&
          contrasenas.necesitaRehash(cuenta.hashContrasena)
        ) {
          hashNuevo = await contrasenas.hashear(contrasena, asociacionId);
        }
      } catch (error) {
        if (!(error instanceof ColaLlena)) throw error;
        return respuesta
          .code(503)
          .header("Retry-After", String(REINTENTO_COLA_LLENA_SEGUNDOS))
          .send(
            cuerpoError("NO_DISPONIBLE", "Servicio ocupado. Inténtalo en unos segundos"),
          );
      }
      if (!correcta || !cuenta || cuenta.estadoPersona !== "activa") {
        return respuesta.code(401).send(credencialesInvalidas());
      }

      // Paso 3: crear la sesión revalidando; reiniciar solo su clave; mejorar el hash.
      const { token, hash } = generarToken();
      const sesion = await enAsociacion(asociacionId, async (base) => {
        const creada = await crearSesion(base, {
          cuentaId: cuenta.cuentaId,
          credencialVersion: cuenta.credencialVersion,
          tokenHash: hash,
          roles: cuenta.roles,
        });
        if (!creada) return null;
        // Solo el correo canónico reinicia su contador: con alias (`+etiqueta`, puntos de
        // Gmail) otra cuenta podría borrar el contador de la víctima (auditoría, B1).
        if (correo === correoLimite) await reiniciarLimite(base, claveCuenta);
        // El contador del origen es de fallos: un acierto no lo gasta.
        await liberarIntento(base, claveOrigen);
        if (hashNuevo && cuenta.hashContrasena) {
          await rehashearContrasena(
            base,
            cuenta.cuentaId,
            cuenta.hashContrasena,
            hashNuevo,
          );
        }
        return creada;
      }).catch((error: unknown) => {
        // Contención con una revocación o un cambio de credenciales (lock_timeout o
        // interbloqueo): la sesión no nace, igual que si la versión hubiera cambiado.
        const codigo = (error as { code?: string } | null)?.code;
        if (codigo === "55P03" || codigo === "40P01") return null;
        throw error;
      });
      if (!sesion) return respuesta.code(401).send(credencialesInvalidas());

      respuesta.setCookie(
        nombreCookieSesion(esquemaPublico),
        token,
        opcionesCookieSesion(esquemaPublico, sesion.expiraEn),
      );
      return {
        success: true as const,
        data: {
          persona: { nombre: cuenta.nombre },
          roles: cuenta.roles,
          expiraEn: sesion.expiraEn.toISOString(),
        },
      };
    },
  );

  rutaAutenticada(
    app,
    dependencias,
    {
      metodo: "GET",
      url: "/sesiones/actual",
      schema: { response: { 200: RESPUESTA_SESION, 401: RESPUESTA_ERROR } },
    },
    async (contexto) => ({
      success: true as const,
      data: {
        persona: { nombre: contexto.nombre },
        roles: contexto.roles,
        expiraEn: contexto.expiraEn.toISOString(),
      },
    }),
  );

  rutaAutenticada(
    app,
    dependencias,
    {
      metodo: "DELETE",
      url: "/sesiones/actual",
      schema: { response: { 200: RESPUESTA_VACIA, 401: RESPUESTA_ERROR } },
    },
    async (contexto, _peticion, respuesta) => {
      await revocarSesion(contexto.base, contexto.sesionId);
      respuesta.clearCookie(
        nombreCookieSesion(esquemaPublico),
        opcionesParaBorrar(esquemaPublico),
      );
      return { success: true as const, data: {} };
    },
  );
}
