/**
 * Gestión de roles y de estado por HTTP contra PostgreSQL real (plan del corte 3,
 * CA-17, CA-18 y CA-19), incluidas las carreras entre administradores con conexiones
 * reales distintas.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type pg from "pg";
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
} from "../pruebas/datos-acceso.js";
import { dependenciasDePrueba } from "../pruebas/dependencias.js";
import { urlsDePrueba } from "../pruebas/preparar-integracion.js";
import { crearServicioContrasenas } from "./contrasenas.js";
import { NOMBRE_ANONIMIZADO } from "./gestion-personas.js";

const urls = urlsDePrueba();
const CLAVE = "una-clave-larga-y-correcta";
const COOKIE = "aspal_sesion";
const SUB = "gestion-a";

let admin: pg.Pool;
let pool: pg.Pool;
let A: string;
let B: string;
let app: FastifyInstance;
let hashDeClave: string;
let ip = 1;
const creadas: string[] = [];
let n = 0;

const ipNueva = () => `10.${Math.floor(ip / 250)}.${ip++ % 250}.9`;
const origen = (sub: string) => `http://${sub}.localhost:5010`;

async function crear(
  asociacion: string,
  roles: string[],
  opciones: { estado?: string; nombre?: string } = {},
) {
  const correo = `gestion${n++}@ejemplo.org`;
  const persona = await crearPersonaConCuenta(admin, asociacion, correo, {
    roles,
    estado: opciones.estado,
    nombre: opciones.nombre,
    hash: hashDeClave,
  });
  return { ...persona, correo };
}

async function entrar(correo: string, sub = SUB): Promise<string> {
  const respuesta = await app.inject({
    method: "POST",
    url: "/sesiones",
    remoteAddress: ipNueva(),
    headers: { host: `${sub}.localhost:5010`, origin: origen(sub) },
    payload: { correo, contrasena: CLAVE },
  });
  if (respuesta.statusCode !== 200) throw new Error(`login ${respuesta.statusCode}`);
  return respuesta.cookies.find((c) => c.name === COOKIE)!.value;
}

function pedir(
  metodo: "GET" | "PUT",
  url: string,
  token: string | null,
  payload?: unknown,
  sub = SUB,
) {
  return app.inject({
    method: metodo,
    url,
    headers: {
      host: `${sub}.localhost:5010`,
      origin: origen(sub),
      ...(token ? { cookie: `${COOKIE}=${token}` } : {}),
    },
    ...(payload === undefined ? {} : { payload: payload as object }),
  });
}

const ponerRoles = (token: string, personaId: string, roles: unknown) =>
  pedir("PUT", `/personas/${personaId}/roles`, token, { roles });
const ponerEstado = (token: string, personaId: string, estado: unknown) =>
  pedir("PUT", `/personas/${personaId}/estado`, token, { estado });

async function rolesDe(personaId: string): Promise<string[]> {
  const { rows } = await admin.query(
    "SELECT rol FROM public.asignacion_rol WHERE persona_id = $1 AND revocado_en IS NULL ORDER BY rol",
    [personaId],
  );
  return rows.map((fila) => fila.rol);
}

async function administradoresActivos(asociacion: string): Promise<number> {
  const { rows } = await admin.query(
    `SELECT count(*)::int AS n FROM public.asignacion_rol r
       JOIN public.persona p ON p.asociacion_id = r.asociacion_id AND p.id = r.persona_id
      WHERE r.asociacion_id = $1 AND r.rol = 'administrador'
        AND r.revocado_en IS NULL AND p.estado = 'activa'`,
    [asociacion],
  );
  return rows[0].n;
}

beforeAll(async () => {
  admin = crearPool(urls.admin);
  pool = crearPool(urls.app, { max: 10 });
  A = await crearAsociacionDePrueba(admin, SUB);
  B = await crearAsociacionDePrueba(admin, "gestion-b");
  hashDeClave = await crearServicioContrasenas({
    parametros: { N: 2 ** 14, r: 8, p: 1 },
  }).hashear(CLAVE, A);
  app = construirApp(
    dependenciasDePrueba({
      comprobarBaseDeDatos: () => comprobarBaseDeDatos(pool),
      puertoPublico: 5010,
      resolverAsociacion: (subdominio) => resolverAsociacion(pool, subdominio),
      enAsociacion: (id, fn) => conAsociacion(pool, id, fn),
    }),
  );
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await borrarAsociacionesDePrueba(admin, [A, B, ...creadas]);
  await Promise.all([admin.end(), pool.end()]);
});

describe("autorización (CA-17)", () => {
  it("sin sesión responde 401 aunque el cuerpo sea inválido", async () => {
    const persona = await crear(A, ["miembro"]);
    for (const [ruta, cuerpo] of [
      ["roles", { roles: [] }],
      ["estado", { estado: "inventado" }],
      ["roles", {}],
    ] as const) {
      const respuesta = await pedir(
        "PUT",
        `/personas/${persona.personaId}/${ruta}`,
        null,
        cuerpo,
      );
      expect(respuesta.statusCode, ruta).toBe(401);
      expect(respuesta.json().error.codigo).toBe("NO_AUTENTICADO");
    }
  });

  it("miembro, representante y gestor reciben 403 y no cambian nada", async () => {
    const objetivo = await crear(A, ["miembro"]);
    for (const rol of ["miembro", "representante", "gestor"]) {
      const quien = await crear(A, [rol]);
      const token = await entrar(quien.correo);
      const roles = await ponerRoles(token, objetivo.personaId, ["gestor"]);
      expect(roles.statusCode, rol).toBe(403);
      expect(roles.json().error.codigo).toBe("PROHIBIDO");
      const estado = await ponerEstado(token, objetivo.personaId, "suspendida");
      expect(estado.statusCode, rol).toBe(403);
    }
    expect(await rolesDe(objetivo.personaId)).toEqual(["miembro"]);
  });

  it("la entrada se valida: roles vacíos, repetidos, desconocidos, demasiados; estado y id inválidos", async () => {
    const jefe = await crear(A, ["administrador"]);
    const objetivo = await crear(A, ["miembro"]);
    const token = await entrar(jefe.correo);
    for (const roles of [
      [],
      ["gestor", "gestor"],
      ["superusuario"],
      ["administrador", "gestor", "representante", "miembro", "miembro"],
      "gestor",
    ]) {
      const r = await ponerRoles(token, objetivo.personaId, roles);
      expect(r.statusCode, JSON.stringify(roles)).toBe(400);
      expect(r.json().error.codigo).toBe("VALIDACION_FALLIDA");
    }
    expect((await ponerEstado(token, objetivo.personaId, "inventado")).statusCode).toBe(
      400,
    );
    expect((await ponerRoles(token, "no-es-uuid", ["miembro"])).statusCode).toBe(400);
    expect(await rolesDe(objetivo.personaId)).toEqual(["miembro"]);
  });
});

describe("cambiar roles (CA-18)", () => {
  it("sustituye el conjunto, deja constancia de quién y revoca las sesiones del afectado", async () => {
    const jefe = await crear(A, ["administrador"]);
    const objetivo = await crear(A, ["miembro", "representante"]);
    const tokenObjetivo = await entrar(objetivo.correo);
    expect((await pedir("GET", "/sesiones/actual", tokenObjetivo)).statusCode).toBe(200);

    const token = await entrar(jefe.correo);
    const respuesta = await ponerRoles(token, objetivo.personaId, ["gestor", "miembro"]);
    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json().data).toEqual({ roles: ["gestor", "miembro"] });
    expect(await rolesDe(objetivo.personaId)).toEqual(["gestor", "miembro"]);

    const { rows } = await admin.query(
      `SELECT rol, asignado_por, revocado_por FROM public.asignacion_rol
        WHERE persona_id = $1 ORDER BY rol, asignado_en`,
      [objetivo.personaId],
    );
    const gestor = rows.find((f) => f.rol === "gestor");
    const representante = rows.find((f) => f.rol === "representante");
    expect(gestor.asignado_por).toBe(jefe.personaId);
    expect(representante.revocado_por).toBe(jefe.personaId);

    // La sesión anterior ya no sirve; al volver a entrar trae los roles nuevos.
    expect((await pedir("GET", "/sesiones/actual", tokenObjetivo)).statusCode).toBe(401);
    const nuevo = await entrar(objetivo.correo);
    expect((await pedir("GET", "/sesiones/actual", nuevo)).json().data.roles).toEqual([
      "gestor",
      "miembro",
    ]);
  });

  it("repetir el mismo conjunto no cambia nada ni cierra sesiones", async () => {
    const jefe = await crear(A, ["administrador"]);
    const objetivo = await crear(A, ["miembro"]);
    const tokenObjetivo = await entrar(objetivo.correo);
    const token = await entrar(jefe.correo);
    expect((await ponerRoles(token, objetivo.personaId, ["miembro"])).statusCode).toBe(
      200,
    );
    expect((await pedir("GET", "/sesiones/actual", tokenObjetivo)).statusCode).toBe(200);
  });

  it("nadie cambia sus propios roles (403 CAMBIO_PROPIO_NO_PERMITIDO)", async () => {
    const jefe = await crear(A, ["administrador"]);
    await crear(A, ["administrador"]);
    const token = await entrar(jefe.correo);
    const respuesta = await ponerRoles(token, jefe.personaId, ["miembro"]);
    expect(respuesta.statusCode).toBe(403);
    expect(respuesta.json().error.codigo).toBe("CAMBIO_PROPIO_NO_PERMITIDO");
    expect(await rolesDe(jefe.personaId)).toEqual(["administrador"]);
  });

  it("a una persona suspendida o de baja no se le dan roles (409 PERSONA_NO_ACTIVA)", async () => {
    const jefe = await crear(A, ["administrador"]);
    const token = await entrar(jefe.correo);
    for (const estado of ["suspendida", "baja"]) {
      const objetivo = await crear(A, ["miembro"], { estado });
      const respuesta = await ponerRoles(token, objetivo.personaId, ["gestor"]);
      expect(respuesta.statusCode, estado).toBe(409);
      expect(respuesta.json().error.codigo).toBe("PERSONA_NO_ACTIVA");
    }
  });

  it("una persona de otra asociación o inexistente responde 404, igual que no existir", async () => {
    const jefe = await crear(A, ["administrador"]);
    const ajena = await crear(B, ["miembro"]);
    const token = await entrar(jefe.correo);
    const cuerpos = new Set<string>();
    for (const id of [ajena.personaId, "00000000-0000-4000-8000-000000000000"]) {
      const roles = await ponerRoles(token, id, ["gestor"]);
      const estado = await ponerEstado(token, id, "suspendida");
      expect(roles.statusCode).toBe(404);
      expect(estado.statusCode).toBe(404);
      cuerpos.add(roles.body);
      cuerpos.add(estado.body);
    }
    expect(cuerpos.size).toBe(1);
    expect(await rolesDe(ajena.personaId)).toEqual(["miembro"]);
  });

  it("un administrador puede quitarle el rol a otro mientras quede alguien (CA-18)", async () => {
    const uno = await crear(A, ["administrador"]);
    const dos = await crear(A, ["administrador"]);
    const token = await entrar(uno.correo);
    expect((await ponerRoles(token, dos.personaId, ["miembro"])).statusCode).toBe(200);
    expect(await rolesDe(dos.personaId)).toEqual(["miembro"]);
  });
});

describe("cambiar estado (CA-19)", () => {
  it("suspender cierra sesiones, impide entrar y se puede revertir", async () => {
    const jefe = await crear(A, ["administrador"]);
    const objetivo = await crear(A, ["miembro"], { nombre: "Persona Suspendible" });
    const tokenObjetivo = await entrar(objetivo.correo);
    const token = await entrar(jefe.correo);

    const respuesta = await ponerEstado(token, objetivo.personaId, "suspendida");
    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json().data).toEqual({ estado: "suspendida" });
    expect((await pedir("GET", "/sesiones/actual", tokenObjetivo)).statusCode).toBe(401);
    await expect(entrar(objetivo.correo)).rejects.toThrow(/401/);

    expect((await ponerEstado(token, objetivo.personaId, "activa")).statusCode).toBe(200);
    const vuelta = await entrar(objetivo.correo);
    expect(
      (await pedir("GET", "/sesiones/actual", vuelta)).json().data.persona.nombre,
    ).toBe("Persona Suspendible");
  });

  it("la baja retira los roles, anonimiza el nombre, conserva el correo y es definitiva", async () => {
    const jefe = await crear(A, ["administrador"]);
    const objetivo = await crear(A, ["miembro", "gestor"], { nombre: "Nombre Real" });
    const tokenObjetivo = await entrar(objetivo.correo);
    const token = await entrar(jefe.correo);

    expect((await ponerEstado(token, objetivo.personaId, "baja")).statusCode).toBe(200);
    expect(await rolesDe(objetivo.personaId)).toEqual([]);
    const { rows } = await admin.query(
      `SELECT p.nombre, p.estado, c.correo FROM public.persona p
         JOIN public.cuenta_acceso c ON c.persona_id = p.id WHERE p.id = $1`,
      [objetivo.personaId],
    );
    expect(rows[0]).toEqual({
      nombre: NOMBRE_ANONIMIZADO,
      estado: "baja",
      correo: objetivo.correo,
    });
    expect((await pedir("GET", "/sesiones/actual", tokenObjetivo)).statusCode).toBe(401);

    const reactivar = await ponerEstado(token, objetivo.personaId, "activa");
    expect(reactivar.statusCode).toBe(409);
    expect(reactivar.json().error.codigo).toBe("PERSONA_NO_ACTIVA");
    const { rows: despues } = await admin.query(
      "SELECT estado FROM public.persona WHERE id = $1",
      [objetivo.personaId],
    );
    expect(despues[0].estado).toBe("baja");
  });

  it("nadie cambia su propio estado", async () => {
    const jefe = await crear(A, ["administrador"]);
    await crear(A, ["administrador"]);
    const token = await entrar(jefe.correo);
    const respuesta = await ponerEstado(token, jefe.personaId, "suspendida");
    expect(respuesta.statusCode).toBe(403);
    expect(respuesta.json().error.codigo).toBe("CAMBIO_PROPIO_NO_PERMITIDO");
  });
});

describe("carreras entre administradores (CA-18, CA-19)", () => {
  /** Dos administradores, solos en su asociación, con una sesión cada uno. */
  async function dos() {
    const asociacion = await crearAsociacionDePrueba(admin, `carrera-${n++}`);
    creadas.push(asociacion);
    const sub = `carrera-${n - 1}`;
    const hash = hashDeClave;
    const uno = await crearPersonaConCuenta(admin, asociacion, "uno@ejemplo.org", {
      roles: ["administrador"],
      hash,
    });
    const otro = await crearPersonaConCuenta(admin, asociacion, "otro@ejemplo.org", {
      roles: ["administrador"],
      hash,
    });
    return {
      asociacion,
      sub,
      uno,
      otro,
      tokenUno: await entrar("uno@ejemplo.org", sub),
      tokenOtro: await entrar("otro@ejemplo.org", sub),
    };
  }

  const aplicar = async (
    escenario: Awaited<ReturnType<typeof dos>>,
    accionUno: "roles" | "estado",
    accionOtro: "roles" | "estado",
  ) => {
    const lanzar = (token: string, objetivo: string, accion: "roles" | "estado") =>
      pedir(
        "PUT",
        `/personas/${objetivo}/${accion}`,
        token,
        accion === "roles" ? { roles: ["miembro"] } : { estado: "suspendida" },
        escenario.sub,
      );
    return Promise.all([
      lanzar(escenario.tokenUno, escenario.otro.personaId, accionUno),
      lanzar(escenario.tokenOtro, escenario.uno.personaId, accionOtro),
    ]);
  };

  const REPETICIONES = 12;
  for (const [nombre, a, b] of [
    ["dos que se quitan el rol", "roles", "roles"],
    ["dos que se suspenden", "estado", "estado"],
    ["uno quita el rol y el otro suspende", "roles", "estado"],
  ] as const) {
    it(`${nombre}: siempre queda exactamente un administrador activo`, async () => {
      for (let i = 0; i < REPETICIONES; i++) {
        const escenario = await dos();
        const respuestas = await aplicar(escenario, a, b);
        const codigos = respuestas.map((r) => r.statusCode).sort();
        expect(await administradoresActivos(escenario.asociacion), `vuelta ${i}`).toBe(1);
        // Exactamente uno lo consiguió; el otro recibió un rechazo de negocio.
        expect(codigos[0], `vuelta ${i}`).toBe(200);
        expect([403, 409, 401]).toContain(codigos[1]);
      }
    }, 120_000);
  }
});
