/**
 * Login, sesión actual y cierre de sesión por HTTP contra PostgreSQL real (plan del
 * corte 3, CA-1 a CA-12 y CA-16). La aplicación se construye como en producción; solo
 * el servicio de contraseñas lleva parámetros baratos y un contador de scrypts.
 */
import { Writable } from "node:stream";
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
import {
  crearServicioContrasenas,
  derivarScrypt,
  type ServicioContrasenas,
} from "./contrasenas.js";
import { ColaLlena } from "./semaforo.js";
import { revocarCredenciales } from "./sesiones.js";

const urls = urlsDePrueba();
const PARAMETROS_RAPIDOS = { N: 2 ** 14, r: 8, p: 1 };
const CLAVE = "una-clave-larga-y-correcta";
const COOKIE = "aspal_sesion";

let admin: pg.Pool;
let pool: pg.Pool;
let A: string;
let B: string;
let C: string;
let D: string;
let scrypts = 0;
let contrasenas: ServicioContrasenas;
let app: FastifyInstance;
let siguienteIp = 1;

const ipNueva = () => `10.${Math.floor(siguienteIp / 250)}.${siguienteIp++ % 250}.7`;
const origenDe = (sub: string) => `http://${sub}.localhost:5010`;

function construir(
  opciones: { logger?: { stream: Writable }; servicio?: ServicioContrasenas } = {},
): FastifyInstance {
  return construirApp(
    dependenciasDePrueba({
      comprobarBaseDeDatos: () => comprobarBaseDeDatos(pool),
      puertoPublico: 5010,
      resolverAsociacion: (subdominio) => resolverAsociacion(pool, subdominio),
      enAsociacion: (id, fn) => conAsociacion(pool, id, fn),
      contrasenas: opciones.servicio ?? contrasenas,
    }),
    opciones.logger ? { logger: opciones.logger } : {},
  );
}

interface OpcionesLogin {
  sub?: string;
  ip?: string;
  sinOrigen?: boolean;
  aplicacion?: FastifyInstance;
}

function login(correo: string, contrasena: string, opciones: OpcionesLogin = {}) {
  const sub = opciones.sub ?? "login-a";
  return (opciones.aplicacion ?? app).inject({
    method: "POST",
    url: "/sesiones",
    remoteAddress: opciones.ip ?? ipNueva(),
    headers: {
      host: `${sub}.localhost:5010`,
      ...(opciones.sinOrigen ? {} : { origin: origenDe(sub) }),
    },
    payload: { correo, contrasena },
  });
}

function conCookie(
  metodo: "GET" | "DELETE",
  token: string,
  sub = "login-a",
  aplicacion = app,
) {
  return aplicacion.inject({
    method: metodo,
    url: "/sesiones/actual",
    headers: {
      host: `${sub}.localhost:5010`,
      origin: origenDe(sub),
      cookie: `${COOKIE}=${token}`,
      ...(metodo === "DELETE" ? {} : {}),
    },
  });
}

function tokenDe(respuesta: Awaited<ReturnType<typeof login>>): string {
  const cookie = respuesta.cookies.find((c) => c.name === COOKIE);
  if (!cookie) throw new Error("la respuesta no trae la cookie de sesión");
  return cookie.value;
}

let numeroDeUsuario = 0;
async function crearUsuario(
  asociacionId: string,
  opciones: {
    correo?: string;
    roles?: string[];
    estado?: string;
    hash?: string | null;
    contrasena?: string;
    nombre?: string;
  } = {},
) {
  const correo = opciones.correo ?? `usuario${numeroDeUsuario++}@ejemplo.org`;
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
}

const sesionesVivas = async (cuentaId: string) =>
  (
    await admin.query(
      "SELECT count(*)::int AS n FROM public.sesion WHERE cuenta_id = $1 AND revocada_en IS NULL",
      [cuentaId],
    )
  ).rows[0].n as number;

beforeAll(async () => {
  admin = crearPool(urls.admin);
  pool = crearPool(urls.app, { max: 8 });
  A = await crearAsociacionDePrueba(admin, "login-a");
  B = await crearAsociacionDePrueba(admin, "login-b");
  C = await crearAsociacionDePrueba(admin, "login-c");
  D = await crearAsociacionDePrueba(admin, "login-d");
  contrasenas = crearServicioContrasenas({
    parametros: PARAMETROS_RAPIDOS,
    derivar: (...argumentos) => {
      scrypts++;
      return derivarScrypt(...argumentos);
    },
  });
  app = construir();
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await borrarAsociacionesDePrueba(admin, [A, B, C, D]);
  await Promise.all([admin.end(), pool.end()]);
});

describe("login correcto (CA-1, CA-4)", () => {
  it("entra, fija la cookie con sus atributos y no expone ids, hashes ni el token", async () => {
    const usuario = await crearUsuario(A, { nombre: "Ana Pérez", roles: ["miembro"] });
    const respuesta = await login(usuario.correo, CLAVE);
    expect(respuesta.statusCode).toBe(200);

    const cuerpo = respuesta.json();
    expect(cuerpo).toEqual({
      success: true,
      data: {
        persona: { nombre: "Ana Pérez" },
        roles: ["miembro"],
        expiraEn: expect.any(String),
      },
    });
    const token = tokenDe(respuesta);
    const crudo = respuesta.body;
    for (const secreto of [token, usuario.personaId, usuario.cuentaId, "scrypt$"]) {
      expect(crudo).not.toContain(secreto);
    }

    const cookie = respuesta.cookies.find((c) => c.name === COOKIE)!;
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe("Lax");
    expect(cookie.path).toBe("/");
    expect(cookie.domain).toBeUndefined();
    expect(cookie.maxAge).toBeGreaterThan(0);
    expect(respuesta.headers["cache-control"]).toBe("private, no-store");
    expect(respuesta.headers.vary).toMatch(/cookie/i);

    // En la base solo está el hash del token.
    const { rows } = await admin.query(
      "SELECT token_hash FROM public.sesion WHERE cuenta_id = $1",
      [usuario.cuentaId],
    );
    expect(rows).toHaveLength(1);
    expect(Buffer.from(rows[0].token_hash).toString("utf8")).not.toContain(token);
  });

  it("GET /sesiones/actual devuelve la misma persona; DELETE la cierra y borra la cookie", async () => {
    const usuario = await crearUsuario(A, { nombre: "Beto", roles: ["gestor"] });
    const token = tokenDe(await login(usuario.correo, CLAVE));

    const actual = await conCookie("GET", token);
    expect(actual.statusCode).toBe(200);
    expect(actual.json().data).toMatchObject({
      persona: { nombre: "Beto" },
      roles: ["gestor"],
    });

    const cierre = await conCookie("DELETE", token);
    expect(cierre.statusCode).toBe(200);
    expect(cierre.json()).toEqual({ success: true, data: {} });
    const borrada = cierre.cookies.find((c) => c.name === COOKIE)!;
    expect(borrada.value).toBe("");

    const despues = await conCookie("GET", token);
    expect(despues.statusCode).toBe(401);
    expect(despues.json().error.codigo).toBe("NO_AUTENTICADO");
  });

  it("cada entrada crea una sesión nueva (no hay fijación)", async () => {
    const usuario = await crearUsuario(A);
    const uno = tokenDe(await login(usuario.correo, CLAVE));
    const dos = tokenDe(await login(usuario.correo, CLAVE));
    expect(uno).not.toBe(dos);
    expect(await sesionesVivas(usuario.cuentaId)).toBe(2);
  });
});

describe("un solo 401, un solo scrypt (CA-2)", () => {
  it("correo inexistente, sin contraseña, suspendida, baja, formato inválido y contraseña errónea", async () => {
    const sinClave = await crearUsuario(A, { hash: null });
    const suspendida = await crearUsuario(A, { estado: "suspendida" });
    const baja = await crearUsuario(A, { estado: "baja" });
    const normal = await crearUsuario(A);

    const casos: [string, string, string][] = [
      ["inexistente", "nadie-existe@ejemplo.org", CLAVE],
      ["sin contraseña", sinClave.correo, CLAVE],
      ["suspendida", suspendida.correo, CLAVE],
      ["baja", baja.correo, CLAVE],
      ["formato inválido", "esto no es un correo", CLAVE],
      ["correo no ASCII", "ñandú@ejemplo.org", CLAVE],
      ["contraseña errónea", normal.correo, "otra-clave-muy-distinta"],
    ];
    const cuerpos = new Set<string>();
    for (const [nombre, correo, clave] of casos) {
      const antes = scrypts;
      const respuesta = await login(correo, clave);
      expect(respuesta.statusCode, nombre).toBe(401);
      expect(respuesta.json().error.codigo, nombre).toBe("CREDENCIALES_INVALIDAS");
      expect(respuesta.headers["set-cookie"], nombre).toBeUndefined();
      expect(scrypts - antes, `${nombre}: scrypts`).toBe(1);
      cuerpos.add(respuesta.body);
    }
    // Idénticos byte a byte.
    expect(cuerpos.size).toBe(1);
  });

  it("una contraseña desmesurada se rechaza en la validación, sin scrypt", async () => {
    const usuario = await crearUsuario(A);
    const antes = scrypts;
    const respuesta = await login(usuario.correo, "x".repeat(201));
    expect(respuesta.statusCode).toBe(400);
    expect(scrypts - antes).toBe(0);
  });
});

describe("cuentas independientes por asociación (CA-3, CA-20)", () => {
  it("el mismo correo en dos asociaciones son dos cuentas con su propia contraseña", async () => {
    const correo = "compartido@ejemplo.org";
    await crearUsuario(A, {
      correo,
      contrasena: "clave-de-la-asociacion-a",
      nombre: "En A",
    });
    await crearUsuario(B, {
      correo,
      contrasena: "clave-de-la-asociacion-b",
      nombre: "En B",
    });

    const enA = await login(correo, "clave-de-la-asociacion-a", { sub: "login-a" });
    expect(enA.json().data.persona.nombre).toBe("En A");
    // La contraseña de A no abre B, y viceversa.
    expect(
      (await login(correo, "clave-de-la-asociacion-a", { sub: "login-b" })).statusCode,
    ).toBe(401);
    const enB = await login(correo, "clave-de-la-asociacion-b", { sub: "login-b" });
    expect(enB.json().data.persona.nombre).toBe("En B");
    expect(
      (await login(correo, "clave-de-la-asociacion-b", { sub: "login-a" })).statusCode,
    ).toBe(401);
  });

  it("la cookie de una asociación no vale en otra", async () => {
    const usuario = await crearUsuario(A);
    const token = tokenDe(await login(usuario.correo, CLAVE));
    expect((await conCookie("GET", token, "login-a")).statusCode).toBe(200);
    const enOtra = await conCookie("GET", token, "login-b");
    expect(enOtra.statusCode).toBe(401);
    expect(enOtra.json().error.codigo).toBe("NO_AUTENTICADO");
  });

  it("una cuenta de A no inicia sesión en un correo que solo existe en B", async () => {
    const soloEnB = await crearUsuario(B);
    expect((await login(soloEnB.correo, CLAVE, { sub: "login-a" })).statusCode).toBe(401);
    expect((await login(soloEnB.correo, CLAVE, { sub: "login-b" })).statusCode).toBe(200);
  });
});

describe("protección de la petición (CA-14)", () => {
  it("sin Origin responde 403 (login CSRF)", async () => {
    const usuario = await crearUsuario(A);
    const respuesta = await login(usuario.correo, CLAVE, { sinOrigen: true });
    expect(respuesta.statusCode).toBe(403);
    expect(respuesta.json().error.codigo).toBe("ORIGEN_NO_PERMITIDO");
    expect(respuesta.headers["set-cookie"]).toBeUndefined();
  });

  it("un Host sin asociación responde 404", async () => {
    const respuesta = await login("a@ejemplo.org", CLAVE, { sub: "no-existe" });
    expect(respuesta.statusCode).toBe(404);
  });
});

describe("carrera entre la verificación y el cambio de credenciales (CA-6)", () => {
  it("una contraseña cambiada a mitad del login deja cero sesiones", async () => {
    const usuario = await crearUsuario(A);
    let llegado!: () => void;
    const alPunto = new Promise<void>((resolver) => (llegado = resolver));
    let soltar!: () => void;
    const compuerta = new Promise<void>((resolver) => (soltar = resolver));
    const real = crearServicioContrasenas({ parametros: PARAMETROS_RAPIDOS });
    const conCompuerta: ServicioContrasenas = {
      ...real,
      verificar: async (...argumentos) => {
        const resultado = await real.verificar(...argumentos);
        llegado();
        await compuerta;
        return resultado;
      },
    };
    const aplicacion = construir({ servicio: conCompuerta });
    try {
      const enCurso = login(usuario.correo, CLAVE, { aplicacion });
      await alPunto;
      // Con la contraseña ya verificada, otra petición cambia las credenciales.
      await conAsociacion(pool, A, (base) => revocarCredenciales(base, usuario.cuentaId));
      soltar();
      const respuesta = await enCurso;
      expect(respuesta.statusCode).toBe(401);
      expect(respuesta.json().error.codigo).toBe("CREDENCIALES_INVALIDAS");
      expect(respuesta.headers["set-cookie"]).toBeUndefined();
      expect(await sesionesVivas(usuario.cuentaId)).toBe(0);
    } finally {
      soltar();
      await aplicacion.close();
    }
  });

  it("una persona suspendida a mitad del login deja cero sesiones", async () => {
    const usuario = await crearUsuario(A);
    let llegado!: () => void;
    const alPunto = new Promise<void>((resolver) => (llegado = resolver));
    let soltar!: () => void;
    const compuerta = new Promise<void>((resolver) => (soltar = resolver));
    const real = crearServicioContrasenas({ parametros: PARAMETROS_RAPIDOS });
    const aplicacion = construir({
      servicio: {
        ...real,
        verificar: async (...argumentos) => {
          const resultado = await real.verificar(...argumentos);
          llegado();
          await compuerta;
          return resultado;
        },
      },
    });
    try {
      const enCurso = login(usuario.correo, CLAVE, { aplicacion });
      await alPunto;
      await admin.query("UPDATE public.persona SET estado = 'suspendida' WHERE id = $1", [
        usuario.personaId,
      ]);
      soltar();
      expect((await enCurso).statusCode).toBe(401);
      expect(await sesionesVivas(usuario.cuentaId)).toBe(0);
    } finally {
      soltar();
      await aplicacion.close();
    }
  });
});

describe("límites de intentos (CA-10, CA-11)", () => {
  it("el sexto intento desde el mismo origen da 429 con Retry-After, aunque sea el correcto", async () => {
    const usuario = await crearUsuario(A);
    const ip = ipNueva();
    for (let i = 0; i < 5; i++) {
      expect((await login(usuario.correo, "mala-clave-mala", { ip })).statusCode).toBe(
        401,
      );
    }
    const sexto = await login(usuario.correo, "mala-clave-mala", { ip });
    expect(sexto.statusCode).toBe(429);
    expect(sexto.json().error.codigo).toBe("DEMASIADOS_INTENTOS");
    expect(Number(sexto.headers["retry-after"])).toBeGreaterThan(0);

    const antes = scrypts;
    const correcta = await login(usuario.correo, CLAVE, { ip });
    expect(correcta.statusCode).toBe(429);
    expect(scrypts - antes).toBe(0);
  });

  it("el bloqueo es por (correo, origen): otro origen sigue entrando", async () => {
    const usuario = await crearUsuario(A);
    const ip = ipNueva();
    for (let i = 0; i < 6; i++) await login(usuario.correo, "mala-clave-mala", { ip });
    expect((await login(usuario.correo, CLAVE)).statusCode).toBe(200);
  });

  it("el bloqueo no se filtra a otra asociación", async () => {
    const correo = "bloqueado@ejemplo.org";
    await crearUsuario(A, { correo });
    await crearUsuario(B, { correo });
    const ip = ipNueva();
    for (let i = 0; i < 6; i++)
      await login(correo, "mala-clave-mala", { ip, sub: "login-a" });
    expect((await login(correo, CLAVE, { ip, sub: "login-a" })).statusCode).toBe(429);
    expect((await login(correo, CLAVE, { ip, sub: "login-b" })).statusCode).toBe(200);
  });

  it("50 intentos simultáneos ejecutan como mucho 5 scrypts", async () => {
    const usuario = await crearUsuario(A);
    const ip = ipNueva();
    const antes = scrypts;
    const respuestas = await Promise.all(
      Array.from({ length: 50 }, () => login(usuario.correo, "mala-clave-mala", { ip })),
    );
    expect(scrypts - antes).toBeLessThanOrEqual(5);
    for (const respuesta of respuestas) {
      expect([401, 429, 503]).toContain(respuesta.statusCode);
    }
    expect(respuestas.filter((r) => r.statusCode === 429).length).toBeGreaterThanOrEqual(
      45,
    );
  });

  it("un éxito reinicia solo la clave (correo, origen), no la del origen", async () => {
    const usuario = await crearUsuario(C);
    const ip = ipNueva();
    const filas = async () =>
      (
        await admin.query(
          "SELECT count(*)::int AS n FROM public.limite_uso WHERE asociacion_id = $1",
          [C],
        )
      ).rows[0].n as number;
    expect(await filas()).toBe(0);
    await login(usuario.correo, "mala-clave-mala", { ip, sub: "login-c" });
    await login(usuario.correo, "mala-clave-mala", { ip, sub: "login-c" });
    // Tres claves: (correo, origen), origen y correo.
    expect(await filas()).toBe(3);
    expect((await login(usuario.correo, CLAVE, { ip, sub: "login-c" })).statusCode).toBe(
      200,
    );
    expect(await filas()).toBe(2);
  });

  it("30 orígenes contra un correo real y contra uno inexistente reciben lo mismo", async () => {
    const real = await crearUsuario(A);
    const respuestas = async (correo: string) => {
      const resultado = [];
      for (let i = 0; i < 30; i++) {
        const r = await login(correo, "mala-clave-mala", { ip: ipNueva() });
        resultado.push([r.statusCode, r.body, r.headers["retry-after"]]);
      }
      return resultado;
    };
    const deReal = await respuestas(real.correo);
    const deFantasma = await respuestas("fantasma-que-no-existe@ejemplo.org");
    expect(deReal).toEqual(deFantasma);
    expect(new Set(deReal.map((r) => r[0]))).toEqual(new Set([401]));
  }, 60_000);

  it("con la cola de hashes llena responde 503 con Retry-After y sin hashear", async () => {
    const usuario = await crearUsuario(A);
    const llena: ServicioContrasenas = {
      ...crearServicioContrasenas({ parametros: PARAMETROS_RAPIDOS }),
      verificar: async () => {
        throw new ColaLlena();
      },
    };
    const aplicacion = construir({ servicio: llena });
    try {
      const antes = scrypts;
      const respuesta = await login(usuario.correo, CLAVE, { aplicacion });
      expect(respuesta.statusCode).toBe(503);
      expect(respuesta.json().error.codigo).toBe("NO_DISPONIBLE");
      expect(Number(respuesta.headers["retry-after"])).toBeGreaterThan(0);
      expect(scrypts - antes).toBe(0);
    } finally {
      await aplicacion.close();
    }
  });
});

describe("mejora del hash tras una entrada correcta (CA-9)", () => {
  it("un hash con parámetros débiles se sustituye por uno vigente", async () => {
    // El servicio vigente usa N=2^15; el hash guardado, el mínimo legible (2^14).
    const vigente = { N: 2 ** 15, r: 8, p: 1 };
    const aplicacion = construir({
      servicio: crearServicioContrasenas({ parametros: vigente }),
    });
    try {
      const debil = await crearServicioContrasenas({
        parametros: PARAMETROS_RAPIDOS,
      }).hashear(CLAVE, A);
      const usuario = await crearUsuario(A, { hash: debil });
      expect((await login(usuario.correo, CLAVE, { aplicacion })).statusCode).toBe(200);
      const { rows } = await admin.query(
        "SELECT hash_contrasena FROM public.cuenta_acceso WHERE id = $1",
        [usuario.cuentaId],
      );
      expect(rows[0].hash_contrasena).not.toBe(debil);
      expect(rows[0].hash_contrasena).toMatch(/^scrypt\$32768\$/);
      // Y la contraseña sigue valiendo, ya con el hash nuevo.
      expect((await login(usuario.correo, CLAVE, { aplicacion })).statusCode).toBe(200);
    } finally {
      await aplicacion.close();
    }
  });
});

describe("vigencia de la sesión (CA-5)", () => {
  async function entrar(roles: string[]) {
    const usuario = await crearUsuario(A, { roles });
    const token = tokenDe(await login(usuario.correo, CLAVE));
    return { usuario, token };
  }

  it("caduca por inactividad: 8 h para un miembro", async () => {
    const { usuario, token } = await entrar(["miembro"]);
    await admin.query(
      "UPDATE public.sesion SET ultimo_uso_en = now() - interval '7 hours' WHERE cuenta_id = $1",
      [usuario.cuentaId],
    );
    expect((await conCookie("GET", token)).statusCode).toBe(200);
    await admin.query(
      "UPDATE public.sesion SET ultimo_uso_en = now() - interval '9 hours' WHERE cuenta_id = $1",
      [usuario.cuentaId],
    );
    expect((await conCookie("GET", token)).statusCode).toBe(401);
  });

  it("caduca por inactividad antes para un administrador: 2 h", async () => {
    const { usuario, token } = await entrar(["administrador"]);
    await admin.query(
      "UPDATE public.sesion SET ultimo_uso_en = now() - interval '3 hours' WHERE cuenta_id = $1",
      [usuario.cuentaId],
    );
    expect((await conCookie("GET", token)).statusCode).toBe(401);
  });

  it("caduca de forma absoluta aunque se use", async () => {
    const { usuario, token } = await entrar(["miembro"]);
    await admin.query(
      `UPDATE public.sesion SET creada_en = now() - interval '8 days',
              expira_en = now() - interval '1 day' WHERE cuenta_id = $1`,
      [usuario.cuentaId],
    );
    expect((await conCookie("GET", token)).statusCode).toBe(401);
  });

  it("un miembro ascendido a administrador pierde la sesión larga", async () => {
    const { usuario, token } = await entrar(["miembro"]);
    await admin.query(
      "UPDATE public.sesion SET ultimo_uso_en = now() - interval '3 hours' WHERE cuenta_id = $1",
      [usuario.cuentaId],
    );
    expect((await conCookie("GET", token)).statusCode).toBe(200);
    // Usar la sesión renueva su último uso: se vuelve a dejar inactiva 3 h.
    await admin.query(
      "UPDATE public.sesion SET ultimo_uso_en = now() - interval '3 hours' WHERE cuenta_id = $1",
      [usuario.cuentaId],
    );
    await admin.query(
      `INSERT INTO public.asignacion_rol (asociacion_id, persona_id, rol)
       VALUES ($1, $2, 'administrador')`,
      [A, usuario.personaId],
    );
    expect((await conCookie("GET", token)).statusCode).toBe(401);
  });

  it("una persona suspendida después de entrar pierde la sesión de inmediato", async () => {
    const { usuario, token } = await entrar(["miembro"]);
    await admin.query("UPDATE public.persona SET estado = 'suspendida' WHERE id = $1", [
      usuario.personaId,
    ]);
    const respuesta = await conCookie("GET", token);
    expect(respuesta.statusCode).toBe(401);
    expect(respuesta.json().error.codigo).toBe("NO_AUTENTICADO");
  });

  it("una cookie con forma inválida o desconocida da 401 y borra la cookie", async () => {
    for (const token of ["basura", "x".repeat(43), "a".repeat(500)]) {
      const respuesta = await conCookie("GET", token);
      expect(respuesta.statusCode, token.slice(0, 10)).toBe(401);
      expect(respuesta.cookies.find((c) => c.name === COOKIE)?.value).toBe("");
    }
  });
});

describe("registros sin datos sensibles (CA-4, CA-12)", () => {
  it("el log no contiene el correo, la contraseña ni el token", async () => {
    const lineas: string[] = [];
    const flujo = new Writable({
      write(trozo, _codificacion, listo) {
        lineas.push(String(trozo));
        listo();
      },
    });
    const aplicacion = construir({ logger: { stream: flujo } });
    try {
      const usuario = await crearUsuario(A, { correo: "secreto.en.logs@ejemplo.org" });
      const contrasenaMala = "contrasena-que-no-debe-salir";
      await login(usuario.correo, contrasenaMala, { aplicacion });
      const buena = await login(usuario.correo, CLAVE, { aplicacion });
      const token = tokenDe(buena);
      await conCookie("GET", token, "login-a", aplicacion);
      await login("fantasma.en.logs@ejemplo.org", contrasenaMala, { aplicacion });

      const log = lineas.join("");
      expect(log.length).toBeGreaterThan(0);
      for (const prohibido of [
        "secreto.en.logs",
        "fantasma.en.logs",
        contrasenaMala,
        CLAVE,
        token,
        "scrypt$",
      ]) {
        expect(log, prohibido).not.toContain(prohibido);
      }
    } finally {
      await aplicacion.close();
    }
  });
});

describe("correcciones de la auditoría", () => {
  it("M2: veinticinco entradas correctas desde el mismo origen no lo bloquean", async () => {
    const usuario = await crearUsuario(A);
    const ip = ipNueva();
    for (let i = 0; i < 25; i++) {
      const respuesta = await login(usuario.correo, CLAVE, { ip });
      expect(respuesta.statusCode, `entrada ${i + 1}`).toBe(200);
    }
  });

  it("M3: con el origen bloqueado, correos nuevos no crean filas de límite", async () => {
    const filas = async () =>
      (
        await admin.query(
          "SELECT count(*)::int AS n FROM public.limite_uso WHERE asociacion_id = $1",
          [D],
        )
      ).rows[0].n as number;
    const ip = ipNueva();
    for (let i = 0; i < 20; i++) {
      await login(`aleatorio${i}@ejemplo.org`, "mala-clave-mala", { ip, sub: "login-d" });
    }
    const bloqueado = await login("aleatorio-x@ejemplo.org", "mala-clave-mala", {
      ip,
      sub: "login-d",
    });
    expect(bloqueado.statusCode).toBe(429);
    const antes = await filas();
    for (let i = 0; i < 10; i++) {
      const r = await login(`nuevo${i}@ejemplo.org`, "mala-clave-mala", {
        ip,
        sub: "login-d",
      });
      expect(r.statusCode).toBe(429);
    }
    expect(await filas()).toBe(antes);
  });

  it("B1: entrar con un alias del correo no reinicia el contador de la víctima", async () => {
    const alias = await crearUsuario(D, { correo: "ana.lopez+alias@gmail.com" });
    const filas = async () =>
      (
        await admin.query(
          "SELECT count(*)::int AS n FROM public.limite_uso WHERE asociacion_id = $1",
          [D],
        )
      ).rows[0].n as number;
    const ip = ipNueva();
    await login(alias.correo, "mala-clave-mala", { ip, sub: "login-d" });
    const antes = await filas();
    expect((await login(alias.correo, CLAVE, { ip, sub: "login-d" })).statusCode).toBe(
      200,
    );
    // La clave (correo canónico, origen) sigue ahí: un alias no la borra.
    expect(await filas()).toBe(antes);
  });

  it("B3: un JSON mal formado es un 400 genérico y no deja la contraseña en el log", async () => {
    const lineas: string[] = [];
    const flujo = new Writable({
      write(trozo, _codificacion, listo) {
        lineas.push(String(trozo));
        listo();
      },
    });
    const aplicacion = construir({ logger: { stream: flujo } });
    try {
      const respuesta = await aplicacion.inject({
        method: "POST",
        url: "/sesiones",
        remoteAddress: ipNueva(),
        headers: {
          host: "login-a.localhost:5010",
          origin: origenDe("login-a"),
          "content-type": "application/json",
        },
        payload: '{"correo": "x@ejemplo.org", "contrasena": "secreta-que-no-debe-salir',
      });
      expect(respuesta.statusCode).toBe(400);
      expect(respuesta.json().error.codigo).toBe("VALIDACION_FALLIDA");
      expect(respuesta.body).not.toContain("secreta-que-no-debe-salir");
      expect(lineas.join("")).not.toContain("secreta-que-no-debe-salir");

      const grande = await aplicacion.inject({
        method: "POST",
        url: "/sesiones",
        remoteAddress: ipNueva(),
        headers: {
          host: "login-a.localhost:5010",
          origin: origenDe("login-a"),
          "content-type": "application/json",
        },
        payload: JSON.stringify({
          correo: "x@ejemplo.org",
          contrasena: "a".repeat(2_000_000),
        }),
      });
      expect(grande.statusCode).toBe(413);
      expect(grande.json().error.codigo).toBe("CUERPO_DEMASIADO_GRANDE");
    } finally {
      await aplicacion.close();
    }
  });

  it("B4: una sesión con expira_en vencido no vale aunque no esté inactiva ni sea antigua", async () => {
    const usuario = await crearUsuario(A);
    const galleta = tokenDe(await login(usuario.correo, CLAVE));
    expect((await conCookie("GET", galleta)).statusCode).toBe(200);
    await admin.query(
      "UPDATE public.sesion SET expira_en = now() - interval '1 minute' WHERE cuenta_id = $1",
      [usuario.cuentaId],
    );
    expect((await conCookie("GET", galleta)).statusCode).toBe(401);
  });
});
