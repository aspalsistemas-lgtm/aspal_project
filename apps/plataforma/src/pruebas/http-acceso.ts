/**
 * Andamiaje de los tests HTTP de integración de los flujos de correo (registro,
 * recuperación, invitaciones): una aplicación real contra PostgreSQL real, una bandeja
 * de correo en memoria y un servicio de contraseñas barato que cuenta los scrypt.
 */
import type { FastifyInstance, LightMyRequestResponse } from "fastify";
import type pg from "pg";
import { crearServicioContrasenas, derivarScrypt } from "../acceso/contrasenas.js";
import { construirApp } from "../app.js";
import {
  comprobarBaseDeDatos,
  conAsociacion,
  crearPool,
  resolverAsociacion,
} from "../base-de-datos.js";
import {
  borrarAsociacionesDePrueba,
  crearAsociacionDePrueba,
  crearPersonaConCuenta,
} from "./datos-acceso.js";
import { crearBandejaDePrueba, type BandejaDePrueba } from "./correo.js";
import { dependenciasDePrueba } from "./dependencias.js";
import { urlsDePrueba } from "./preparar-integracion.js";
import type { Dependencias } from "../app.js";

export const CLAVE = "una-clave-larga-y-correcta";
export const COOKIE = "aspal_sesion";
const PARAMETROS_RAPIDOS = { N: 2 ** 14, r: 8, p: 1 };

export interface OpcionesPedir {
  sub: string;
  ip?: string;
  cuerpo?: unknown;
  token?: string;
  sinOrigen?: boolean;
}

export interface OpcionesUsuario {
  correo?: string;
  roles?: string[];
  estado?: string;
  hash?: string | null;
  contrasena?: string;
  nombre?: string;
}

export interface EntornoHttp {
  admin: pg.Pool;
  pool: pg.Pool;
  app: FastifyInstance;
  bandeja: BandejaDePrueba;
  /** Scrypts ejecutados hasta ahora. */
  scrypts: () => number;
  ip: () => string;
  pedir: (
    metodo: "GET" | "POST" | "PUT" | "DELETE",
    url: string,
    opciones: OpcionesPedir,
  ) => Promise<LightMyRequestResponse>;
  crearAsociacion: (subdominio: string) => Promise<string>;
  crearUsuario: (
    asociacionId: string,
    opciones?: OpcionesUsuario,
  ) => Promise<{ personaId: string; cuentaId: string; correo: string }>;
  /** Inicia sesión y devuelve el token de la cookie. */
  entrar: (sub: string, correo: string, contrasena?: string) => Promise<string>;
  /** Construye otra aplicación con otras dependencias, sobre la misma base. */
  otraApp: (parciales: Partial<Dependencias>) => FastifyInstance;
  cerrar: () => Promise<void>;
}

export async function crearEntornoHttp(
  parciales: Partial<Dependencias> = {},
): Promise<EntornoHttp> {
  const urls = urlsDePrueba();
  const admin = crearPool(urls.admin);
  const pool = crearPool(urls.app, { max: 10 });
  const bandeja = crearBandejaDePrueba();
  let scrypts = 0;
  const contrasenas = crearServicioContrasenas({
    parametros: PARAMETROS_RAPIDOS,
    derivar: (...argumentos) => {
      scrypts++;
      return derivarScrypt(...argumentos);
    },
  });
  const asociaciones: string[] = [];
  let siguienteIp = 1;
  let numero = 0;

  const dependencias = (extra: Partial<Dependencias>): Dependencias =>
    dependenciasDePrueba({
      comprobarBaseDeDatos: () => comprobarBaseDeDatos(pool),
      puertoPublico: 5010,
      resolverAsociacion: (subdominio) => resolverAsociacion(pool, subdominio),
      enAsociacion: (id, fn) => conAsociacion(pool, id, fn),
      contrasenas,
      correo: bandeja.servicio,
      ...extra,
    });

  const app = construirApp(dependencias(parciales));
  await app.ready();

  const ip = () => `10.${Math.floor(siguienteIp / 250)}.${siguienteIp++ % 250}.5`;
  const origen = (sub: string) => `http://${sub}.localhost:5010`;

  const entorno: EntornoHttp = {
    admin,
    pool,
    app,
    bandeja,
    scrypts: () => scrypts,
    ip,
    pedir: (metodo, url, { sub, ip: direccion, cuerpo, token, sinOrigen }) =>
      app.inject({
        method: metodo,
        url,
        remoteAddress: direccion ?? ip(),
        headers: {
          host: `${sub}.localhost:5010`,
          ...(sinOrigen ? {} : { origin: origen(sub) }),
          ...(token ? { cookie: `${COOKIE}=${token}` } : {}),
        },
        ...(cuerpo === undefined ? {} : { payload: cuerpo as object }),
      }),
    crearAsociacion: async (subdominio) => {
      const id = await crearAsociacionDePrueba(admin, subdominio);
      asociaciones.push(id);
      return id;
    },
    crearUsuario: async (asociacionId, opciones = {}) => {
      const correo = opciones.correo ?? `usuario${numero++}@ejemplo.org`;
      const hash =
        opciones.hash === undefined
          ? await crearServicioContrasenas({ parametros: PARAMETROS_RAPIDOS }).hashear(
              opciones.contrasena ?? CLAVE,
              asociacionId,
            )
          : opciones.hash;
      const persona = await crearPersonaConCuenta(admin, asociacionId, correo, {
        roles: opciones.roles,
        estado: opciones.estado,
        hash,
        nombre: opciones.nombre ?? "Persona de prueba",
      });
      return { ...persona, correo };
    },
    entrar: async (sub, correo, contrasena = CLAVE) => {
      const respuesta = await entorno.pedir("POST", "/sesiones", {
        sub,
        cuerpo: { correo, contrasena },
      });
      const cookie = respuesta.cookies.find((c) => c.name === COOKIE);
      if (respuesta.statusCode !== 200 || !cookie) {
        throw new Error(`login ${respuesta.statusCode}`);
      }
      return cookie.value;
    },
    otraApp: (extra) => construirApp(dependencias(extra)),
    cerrar: async () => {
      await app.close();
      await borrarAsociacionesDePrueba(admin, asociaciones);
      await Promise.all([admin.end(), pool.end()]);
    },
  };
  return entorno;
}
