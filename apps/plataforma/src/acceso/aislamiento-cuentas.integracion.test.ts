/**
 * De punta a punta (plan del corte 3, CA-20): con las semillas de desarrollo, ASPAL y la
 * organización de prueba son dos mundos. El mismo correo es dos cuentas, una sesión no
 * cruza la frontera y nadie ve ni toca las filas del otro.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import pg from "pg";
import { construirApp } from "../app.js";
import {
  comprobarBaseDeDatos,
  conAsociacion,
  crearPool,
  resolverAsociacion,
} from "../base-de-datos.js";
import { dependenciasDePrueba } from "../pruebas/dependencias.js";
import { urlsDePrueba } from "../pruebas/preparar-integracion.js";
import { sembrar, sembrarUsuarios, USUARIOS_LOCALES } from "../sembrar.js";
import { crearServicioContrasenas } from "./contrasenas.js";

const urls = urlsDePrueba();
const CLAVE = "clave-local-de-prueba";
const COOKIE = "aspal_sesion";
const servicio = crearServicioContrasenas({ parametros: { N: 2 ** 14, r: 8, p: 1 } });

let pool: pg.Pool;
let app: FastifyInstance;
let ip = 1;
let creadosLaPrimeraVez = 0;
const ids: Record<string, string> = {};

const ipNueva = () => `10.7.${Math.floor(ip / 250)}.${ip++ % 250}`;
const origen = (sub: string) => `http://${sub}.localhost:5010`;

function entrar(sub: string, correo: string, contrasena = CLAVE) {
  return app.inject({
    method: "POST",
    url: "/sesiones",
    remoteAddress: ipNueva(),
    headers: { host: `${sub}.localhost:5010`, origin: origen(sub) },
    payload: { correo, contrasena },
  });
}

async function token(sub: string, correo: string): Promise<string> {
  const respuesta = await entrar(sub, correo);
  expect(respuesta.statusCode, `${correo} en ${sub}`).toBe(200);
  return respuesta.cookies.find((c) => c.name === COOKIE)!.value;
}

function pedir(
  metodo: "GET" | "PUT",
  url: string,
  sub: string,
  galleta: string,
  payload?: object,
) {
  return app.inject({
    method: metodo,
    url,
    headers: {
      host: `${sub}.localhost:5010`,
      origin: origen(sub),
      cookie: `${COOKIE}=${galleta}`,
    },
    ...(payload ? { payload } : {}),
  });
}

async function personaIdDe(sub: string, correo: string): Promise<string> {
  return conAsociacion(pool, ids[sub]!, async (base) => {
    const { rows } = await base.execute<{ persona_id: string }>(
      sql`SELECT persona_id FROM public.cuenta_acceso WHERE correo = ${correo}`,
    );
    return rows[0]!.persona_id;
  });
}

beforeAll(async () => {
  const cliente = new pg.Client({ connectionString: urls.admin });
  await cliente.connect();
  try {
    await sembrar(cliente);
    creadosLaPrimeraVez = await sembrarUsuarios(cliente, CLAVE, servicio);
    const { rows } = await cliente.query("SELECT id, subdominio FROM public.asociacion");
    for (const fila of rows) ids[fila.subdominio] = fila.id;
  } finally {
    await cliente.end();
  }
  pool = crearPool(urls.app, { max: 4 });
  app = construirApp(
    dependenciasDePrueba({
      comprobarBaseDeDatos: () => comprobarBaseDeDatos(pool),
      puertoPublico: 5010,
      resolverAsociacion: (subdominio) => resolverAsociacion(pool, subdominio),
      enAsociacion: (id, fn) => conAsociacion(pool, id, fn),
      contrasenas: servicio,
    }),
  );
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await pool.end();
});

describe("semillas de usuarios", () => {
  it("crean todos los usuarios la primera vez y ninguno la segunda", async () => {
    expect(creadosLaPrimeraVez).toBeGreaterThan(0);
    const cliente = new pg.Client({ connectionString: urls.admin });
    await cliente.connect();
    try {
      expect(await sembrarUsuarios(cliente, "otra-clave-distinta-1", servicio)).toBe(0);
    } finally {
      await cliente.end();
    }
    // Y no pisaron la contraseña existente.
    expect((await entrar("aspal", "admin@ejemplo.org")).statusCode).toBe(200);
    expect(
      (await entrar("aspal", "admin@ejemplo.org", "otra-clave-distinta-1")).statusCode,
    ).toBe(401);
  });

  it("rechazan una contraseña inadmisible", async () => {
    const cliente = new pg.Client({ connectionString: urls.admin });
    await cliente.connect();
    try {
      await expect(sembrarUsuarios(cliente, "corta", servicio)).rejects.toThrow(/corta/);
    } finally {
      await cliente.end();
    }
  });
});

describe("dos mundos (CA-20)", () => {
  it("el mismo correo es dos cuentas: cada una entra en su asociación y es otra persona", async () => {
    const enAspal = await entrar("aspal", "admin@ejemplo.org");
    const enPrueba = await entrar("prueba", "admin@ejemplo.org");
    expect(enAspal.json().data.persona.nombre).toBe("Administrador ASPAL");
    expect(enPrueba.json().data.persona.nombre).toBe("Administrador Prueba");
    expect(await personaIdDe("aspal", "admin@ejemplo.org")).not.toBe(
      await personaIdDe("prueba", "admin@ejemplo.org"),
    );
  });

  it("la cookie de la organización de prueba no vale en ASPAL", async () => {
    const galleta = await token("prueba", "admin@ejemplo.org");
    expect((await pedir("GET", "/sesiones/actual", "prueba", galleta)).statusCode).toBe(
      200,
    );
    const enAspal = await pedir("GET", "/sesiones/actual", "aspal", galleta);
    expect(enAspal.statusCode).toBe(401);
    expect(enAspal.json().error.codigo).toBe("NO_AUTENTICADO");
  });

  it("quien solo existe en la organización de prueba no puede entrar en ASPAL", async () => {
    expect((await entrar("prueba", "solo-prueba@ejemplo.org")).statusCode).toBe(200);
    const enAspal = await entrar("aspal", "solo-prueba@ejemplo.org");
    expect(enAspal.statusCode).toBe(401);
    expect(enAspal.json().error.codigo).toBe("CREDENCIALES_INVALIDAS");
  });

  it("cada cuenta tiene solo sus roles: promover en una asociación no toca a la homónima", async () => {
    const jefePrueba = await token("prueba", "admin@ejemplo.org");
    const miembroPrueba = await personaIdDe("prueba", "miembro@ejemplo.org");
    const miembroAspal = await personaIdDe("aspal", "miembro@ejemplo.org");

    const promocion = await pedir(
      "PUT",
      `/personas/${miembroPrueba}/roles`,
      "prueba",
      jefePrueba,
      {
        roles: ["gestor", "miembro"],
      },
    );
    expect(promocion.statusCode).toBe(200);

    const rolesDe = async (sub: string) =>
      (await entrar(sub, "miembro@ejemplo.org")).json().data.roles;
    expect(await rolesDe("prueba")).toEqual(["gestor", "miembro"]);
    expect(await rolesDe("aspal")).toEqual(["miembro"]);

    // El administrador de prueba no alcanza a la persona de ASPAL: ni con su id.
    const intento = await pedir(
      "PUT",
      `/personas/${miembroAspal}/roles`,
      "prueba",
      jefePrueba,
      {
        roles: ["administrador"],
      },
    );
    expect(intento.statusCode).toBe(404);
    expect(await rolesDe("aspal")).toEqual(["miembro"]);
  });

  it("desde el contexto de la organización de prueba no se ve ninguna fila de ASPAL", async () => {
    const vistas = await conAsociacion(pool, ids.prueba!, async (base) => {
      const contar = async (consulta: ReturnType<typeof sql>) => {
        const { rows } = await base.execute<{ otras: number; todas: number }>(consulta);
        return rows[0]!;
      };
      const propia = ids.prueba!;
      return {
        persona: await contar(sql`SELECT
          count(*) FILTER (WHERE asociacion_id <> ${propia})::int AS otras,
          count(*)::int AS todas FROM public.persona`),
        cuenta_acceso: await contar(sql`SELECT
          count(*) FILTER (WHERE asociacion_id <> ${propia})::int AS otras,
          count(*)::int AS todas FROM public.cuenta_acceso`),
        asignacion_rol: await contar(sql`SELECT
          count(*) FILTER (WHERE asociacion_id <> ${propia})::int AS otras,
          count(*)::int AS todas FROM public.asignacion_rol`),
        sesion: await contar(sql`SELECT
          count(*) FILTER (WHERE asociacion_id <> ${propia})::int AS otras,
          count(*)::int AS todas FROM public.sesion`),
        limite_uso: await contar(sql`SELECT
          count(*) FILTER (WHERE asociacion_id <> ${propia})::int AS otras,
          count(*)::int AS todas FROM public.limite_uso`),
      };
    });
    for (const [tabla, { otras, todas }] of Object.entries(vistas)) {
      expect(otras, tabla).toBe(0);
      expect(todas, `${tabla} propias`).toBeGreaterThan(0);
    }
    expect(USUARIOS_LOCALES.filter((u) => u.subdominio === "prueba")).toHaveLength(
      vistas.persona.todas,
    );
  });
});
