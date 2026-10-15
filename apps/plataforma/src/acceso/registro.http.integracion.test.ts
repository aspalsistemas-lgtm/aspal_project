/**
 * Registro abierto por HTTP contra PostgreSQL real (plan del corte 3, CA-23 y CA-24):
 * la solicitud no crea cuentas, responde siempre igual, el token se valida antes de
 * hashear y 20 confirmaciones simultáneas dan exactamente una cuenta.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { crearServicioContrasenas } from "./contrasenas.js";
import { ColaLlena } from "./semaforo.js";
import { tokenDelCorreo } from "../pruebas/correo.js";
import { crearEntornoHttp, type EntornoHttp } from "../pruebas/http-acceso.js";

let e: EntornoHttp;
let A: string;
let B: string;
let CERRADA: string;

const NUEVA = "clave-nueva-larga-y-segura";
let n = 0;
const correoNuevo = () => `registro${n++}@ejemplo.org`;

beforeAll(async () => {
  e = await crearEntornoHttp();
  A = await e.crearAsociacion("reg-a");
  B = await e.crearAsociacion("reg-b");
  CERRADA = await e.crearAsociacion("reg-cerrada");
  await e.admin.query(
    "UPDATE public.asociacion SET registro_abierto = true WHERE id = ANY ($1)",
    [[A, B]],
  );
});

afterAll(async () => {
  await e.cerrar();
});

const solicitar = (correo: string, sub = "reg-a", ip?: string) =>
  e.pedir("POST", "/registros", { sub, cuerpo: { correo }, ip });

const confirmar = (
  token: string,
  extra: Partial<{ nombre: string; contrasena: string; aceptaTerminos: unknown }> = {},
  sub = "reg-a",
) =>
  e.pedir("POST", "/registros/confirmar", {
    sub,
    cuerpo: {
      token,
      nombre: "Ana Pérez",
      contrasena: NUEVA,
      aceptaTerminos: true,
      ...extra,
    },
  });

const correosA = (correo: string) => e.bandeja.mensajes.filter((m) => m.para === correo);

/** Solicita el registro y devuelve el token del correo. */
async function pedirToken(correo: string, sub = "reg-a"): Promise<string> {
  const antes = e.bandeja.mensajes.length;
  const respuesta = await solicitar(correo, sub);
  expect(respuesta.statusCode).toBe(202);
  await e.bandeja.servicio.vaciar();
  const mensajes = e.bandeja.mensajes
    .slice(antes)
    .filter((m) => m.para === correo && m.asunto.startsWith("Confirma tu correo"));
  expect(mensajes, `correo a ${correo}`).toHaveLength(1);
  return tokenDelCorreo(mensajes[0]!);
}

const filas = async (tabla: string, asociacion: string) =>
  (
    await e.admin.query(
      `SELECT count(*)::int AS n FROM public.${tabla} WHERE asociacion_id = $1`,
      [asociacion],
    )
  ).rows[0].n as number;

describe("POST /registros (CA-23, CA-24)", () => {
  it("guarda un pendiente y envía el enlace, pero NO crea persona ni cuenta", async () => {
    const correo = correoNuevo();
    const personas = await filas("persona", A);
    const cuentas = await filas("cuenta_acceso", A);
    const token = await pedirToken(correo);

    expect(correosA(correo)[0]!.texto).toContain(
      `http://reg-a.localhost:5010/registro#${token}`,
    );
    expect(await filas("persona", A)).toBe(personas);
    expect(await filas("cuenta_acceso", A)).toBe(cuentas);
    const { rows } = await e.admin.query(
      "SELECT token_hash, usado_en FROM public.registro_pendiente WHERE correo = $1",
      [correo],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].usado_en).toBeNull();
    expect(Buffer.from(rows[0].token_hash).toString("utf8")).not.toContain(token);
  });

  it("responde lo mismo en todos los casos y solo envía cuando corresponde", async () => {
    const existente = await e.crearUsuario(A);
    const suspendida = await e.crearUsuario(A, { estado: "suspendida" });
    const baja = await e.crearUsuario(A, { estado: "baja" });
    const nuevo = correoNuevo();
    const casos: Array<[string, string, string]> = [
      ["nuevo y abierto", nuevo, "reg-a"],
      ["con cuenta", existente.correo, "reg-a"],
      ["suspendida", suspendida.correo, "reg-a"],
      ["de baja", baja.correo, "reg-a"],
      ["formato inválido", "esto no es un correo", "reg-a"],
      ["registro cerrado", correoNuevo(), "reg-cerrada"],
    ];
    const antes = e.scrypts();
    const respuestas = [];
    for (const [, correo, sub] of casos) respuestas.push(await solicitar(correo, sub));
    await e.bandeja.servicio.vaciar();

    for (const r of respuestas) expect(r.statusCode).toBe(202);
    expect(new Set(respuestas.map((r) => r.body)).size).toBe(1);
    expect(respuestas[0]!.json()).toEqual({ success: true, data: {} });
    // Un enlace al nuevo; un aviso (sin enlace de registro) a quien ya tiene cuenta.
    expect(correosA(nuevo)[0]!.asunto).toMatch(/^Confirma tu correo/);
    for (const u of [existente, suspendida, baja]) {
      const mensajes = correosA(u.correo);
      expect(mensajes, u.correo).toHaveLength(1);
      expect(mensajes[0]!.asunto).toMatch(/^Ya tienes una cuenta/);
      expect(mensajes[0]!.texto).not.toContain("/registro#");
    }
    expect(correosA(casos[4]![1])).toHaveLength(0);
    expect(correosA(casos[5]![1])).toHaveLength(0);
    // Nada hashea en una solicitud.
    expect(e.scrypts() - antes).toBe(0);
    // Y la cerrada no guardó pendientes.
    expect(await filas("registro_pendiente", CERRADA)).toBe(0);
  });

  it("la segunda solicitud del mismo correo no envía (presupuesto) pero no invalida el enlace vigente", async () => {
    const correo = correoNuevo();
    const token = await pedirToken(correo);
    expect((await solicitar(correo)).statusCode).toBe(202);
    await e.bandeja.servicio.vaciar();
    expect(correosA(correo)).toHaveLength(1);
    expect((await confirmar(token)).statusCode).toBe(200);
  });

  it("sin Origin responde 403", async () => {
    const r = await e.pedir("POST", "/registros", {
      sub: "reg-a",
      cuerpo: { correo: correoNuevo() },
      sinOrigen: true,
    });
    expect(r.statusCode).toBe(403);
  });
});

describe("POST /registros/confirmar (CA-23)", () => {
  it("crea persona y cuenta verificadas, abre sesión y deja constancia de los términos", async () => {
    const correo = correoNuevo();
    const token = await pedirToken(correo);
    // Otro pendiente del mismo correo: confirmar uno invalida todos.
    await e.admin.query(
      "INSERT INTO public.registro_pendiente (asociacion_id, correo, token_hash, expira_en) VALUES ($1, $2, decode(repeat('ab', 32), 'hex'), now() + interval '1 day')",
      [A, correo],
    );

    const respuesta = await confirmar(token, { nombre: "  Ana Pérez  " });
    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json()).toEqual({
      success: true,
      data: {
        persona: { nombre: "Ana Pérez" },
        roles: ["miembro"],
        expiraEn: expect.any(String),
      },
    });
    const cookie = respuesta.cookies.find((c) => c.name === "aspal_sesion")!;
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe("Lax");
    expect(respuesta.body).not.toContain(cookie.value);

    const { rows } = await e.admin.query(
      `SELECT c.correo_verificado_en, c.terminos_version, c.terminos_aceptados_en,
              c.hash_contrasena, r.rol, r.asignado_por, p.nombre, p.estado
         FROM public.cuenta_acceso c
         JOIN public.persona p ON p.id = c.persona_id
         JOIN public.asignacion_rol r ON r.persona_id = p.id
        WHERE c.asociacion_id = $1 AND c.correo = $2`,
      [A, correo],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      terminos_version: "pendiente",
      rol: "miembro",
      asignado_por: null,
      nombre: "Ana Pérez",
      estado: "activa",
    });
    expect(rows[0].correo_verificado_en).toBeInstanceOf(Date);
    expect(rows[0].terminos_aceptados_en).toBeInstanceOf(Date);
    expect(rows[0].hash_contrasena).toMatch(/^scrypt\$/);

    // La sesión vale, la contraseña también, y los demás pendientes quedaron usados.
    expect(
      (await e.pedir("GET", "/sesiones/actual", { sub: "reg-a", token: cookie.value }))
        .statusCode,
    ).toBe(200);
    await expect(e.entrar("reg-a", correo, NUEVA)).resolves.toEqual(expect.any(String));
    const { rows: vivos } = await e.admin.query(
      "SELECT count(*)::int AS n FROM public.registro_pendiente WHERE correo = $1 AND usado_en IS NULL",
      [correo],
    );
    expect(vivos[0].n).toBe(0);
  });

  it("todos los enlaces malos dan el mismo 400 y cuestan cero scrypt", async () => {
    const caducado = correoNuevo();
    const tokenCaducado = await pedirToken(caducado);
    await e.admin.query(
      "UPDATE public.registro_pendiente SET creado_en = now() - interval '2 days', expira_en = now() - interval '1 minute' WHERE correo = $1",
      [caducado],
    );
    const usadoCorreo = correoNuevo();
    const tokenUsado = await pedirToken(usadoCorreo);
    await confirmar(tokenUsado);
    // Un token de la asociación abierta usado en la cerrada.
    const deOtra = await pedirToken(correoNuevo(), "reg-b");

    const inventados = Array.from({ length: 100 }, (_, i) =>
      Buffer.from(`inventado-${i}`.padEnd(32, "x")).toString("base64url"),
    );
    const malos = [
      tokenCaducado,
      tokenUsado,
      "basura",
      "",
      "a".repeat(43),
      ...inventados,
    ];

    const antes = e.scrypts();
    const cuerpos = new Set<string>();
    for (const token of malos) {
      const r = await confirmar(token);
      expect(r.statusCode, token.slice(0, 12)).toBe(400);
      expect(r.json().error.codigo).toBe("ENLACE_INVALIDO");
      cuerpos.add(r.body);
    }
    // El token de B no vale en A.
    const cruzado = await confirmar(deOtra, {}, "reg-a");
    expect(cruzado.json().error.codigo).toBe("ENLACE_INVALIDO");
    cuerpos.add(cruzado.body);
    expect(cuerpos.size).toBe(1);
    expect(e.scrypts() - antes).toBe(0);
  });

  it("si la asociación cierra el registro, los enlaces pendientes dejan de valer", async () => {
    const correo = correoNuevo();
    const token = await pedirToken(correo, "reg-b");
    await e.admin.query(
      "UPDATE public.asociacion SET registro_abierto = false WHERE id = $1",
      [B],
    );
    try {
      expect((await confirmar(token, {}, "reg-b")).json().error.codigo).toBe(
        "ENLACE_INVALIDO",
      );
    } finally {
      await e.admin.query(
        "UPDATE public.asociacion SET registro_abierto = true WHERE id = $1",
        [B],
      );
    }
  });

  it("términos, contraseña y nombre se rechazan sin gastar el token", async () => {
    const correo = correoNuevo();
    const token = await pedirToken(correo);

    const sinTerminos = await confirmar(token, { aceptaTerminos: false });
    expect(sinTerminos.statusCode).toBe(400);
    expect(sinTerminos.json().error.codigo).toBe("TERMINOS_NO_ACEPTADOS");

    for (const mala of ["corta", correo, "password1234"]) {
      const r = await confirmar(token, { contrasena: mala });
      expect(r.json().error.codigo, mala).toBe("CONTRASENA_NO_ADMITIDA");
    }
    for (const nombre of ["A", "x".repeat(121), "Ana\u0000Pérez", "Ana‮Pérez", "   "]) {
      const r = await confirmar(token, { nombre });
      expect(r.statusCode, JSON.stringify(nombre)).toBe(400);
      expect(r.json().error.codigo).toBe("VALIDACION_FALLIDA");
    }
    // Ningún rechazo gastó el token.
    expect((await confirmar(token)).statusCode).toBe(200);
  });

  it("20 confirmaciones simultáneas con el mismo token: exactamente 1 cuenta y 19 respuestas idénticas", async () => {
    const correo = correoNuevo();
    const token = await pedirToken(correo);
    const antes = e.scrypts();
    const respuestas = await Promise.all(
      Array.from({ length: 20 }, () => confirmar(token)),
    );
    const buenas = respuestas.filter((r) => r.statusCode === 200);
    const malas = respuestas.filter((r) => r.statusCode === 400);
    expect(buenas).toHaveLength(1);
    expect(malas).toHaveLength(19);
    expect(new Set(malas.map((r) => r.body)).size).toBe(1);
    expect(malas[0]!.json().error.codigo).toBe("ENLACE_INVALIDO");
    // Una sola cuenta, una sola persona, un solo rol.
    const { rows } = await e.admin.query(
      "SELECT count(*)::int AS n FROM public.cuenta_acceso WHERE asociacion_id = $1 AND correo = $2",
      [A, correo],
    );
    expect(rows[0].n).toBe(1);
    // Y solo el ganador hasheó.
    expect(e.scrypts() - antes).toBe(1);
  });

  it("si la cuenta se creó entretanto por otra vía, el enlace deja de valer y no hay duplicado", async () => {
    const correo = correoNuevo();
    const token = await pedirToken(correo);
    await e.crearUsuario(A, { correo });
    const r = await confirmar(token);
    expect(r.statusCode).toBe(400);
    expect(r.json().error.codigo).toBe("ENLACE_INVALIDO");
    const { rows } = await e.admin.query(
      "SELECT count(*)::int AS n FROM public.cuenta_acceso WHERE asociacion_id = $1 AND correo = $2",
      [A, correo],
    );
    expect(rows[0].n).toBe(1);
  });

  it("con la cola de hashes llena responde 503 y el token sigue valiendo", async () => {
    const correo = correoNuevo();
    const token = await pedirToken(correo);
    const real = crearServicioContrasenas({ parametros: { N: 2 ** 14, r: 8, p: 1 } });
    const llena = e.otraApp({
      contrasenas: {
        ...real,
        hashear: async () => {
          throw new ColaLlena();
        },
      },
    });
    try {
      const r = await llena.inject({
        method: "POST",
        url: "/registros/confirmar",
        remoteAddress: e.ip(),
        headers: { host: "reg-a.localhost:5010", origin: "http://reg-a.localhost:5010" },
        payload: { token, nombre: "Ana Pérez", contrasena: NUEVA, aceptaTerminos: true },
      });
      expect(r.statusCode).toBe(503);
      expect(Number(r.headers["retry-after"])).toBeGreaterThan(0);
    } finally {
      await llena.close();
    }
    expect((await confirmar(token)).statusCode).toBe(200);
  });

  it("el mismo correo en dos asociaciones son dos registros y dos cuentas independientes", async () => {
    const correo = correoNuevo();
    const tokenA = await pedirToken(correo, "reg-a");
    const tokenB = await pedirToken(correo, "reg-b");
    expect((await confirmar(tokenA, { nombre: "En A" }, "reg-a")).statusCode).toBe(200);
    expect((await confirmar(tokenB, { nombre: "En B" }, "reg-b")).statusCode).toBe(200);
    expect(
      (await e.entrar("reg-a", correo, NUEVA)) !==
        (await e.entrar("reg-b", correo, NUEVA)),
    ).toBe(true);
  });

  it("sin Origin responde 403", async () => {
    const r = await e.pedir("POST", "/registros/confirmar", {
      sub: "reg-a",
      cuerpo: { token: "x", nombre: "Ana", contrasena: NUEVA, aceptaTerminos: true },
      sinOrigen: true,
    });
    expect(r.statusCode).toBe(403);
  });
});
