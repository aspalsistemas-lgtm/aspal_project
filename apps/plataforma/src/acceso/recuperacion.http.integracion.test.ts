/**
 * Recuperar la contraseña por HTTP contra PostgreSQL real (plan del corte 3, CA-24 y
 * CA-25): respuesta uniforme, tokens de un solo uso, cero scrypt con tokens inventados
 * y un único ganador entre confirmaciones simultáneas.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { crearServicioContrasenas } from "./contrasenas.js";
import { ColaLlena } from "./semaforo.js";
import { tokenDelCorreo } from "../pruebas/correo.js";
import { CLAVE, crearEntornoHttp, type EntornoHttp } from "../pruebas/http-acceso.js";

let e: EntornoHttp;
let A: string;
let B: string;

const NUEVA = "otra-clave-larga-y-segura";

beforeAll(async () => {
  e = await crearEntornoHttp();
  A = await e.crearAsociacion("rec-a");
  B = await e.crearAsociacion("rec-b");
});

afterAll(async () => {
  await e.cerrar();
});

const solicitar = (correo: string, sub = "rec-a", ip?: string) =>
  e.pedir("POST", "/solicitudes-recuperacion", { sub, cuerpo: { correo }, ip });
const restablecer = (token: string, contrasena = NUEVA, sub = "rec-a") =>
  e.pedir("POST", "/restablecimientos-contrasena", {
    sub,
    cuerpo: { token, contrasena },
  });

/** Pide recuperación y devuelve el token del correo recibido. */
async function pedirToken(correo: string, sub = "rec-a"): Promise<string> {
  const antes = e.bandeja.mensajes.length;
  const respuesta = await solicitar(correo, sub);
  expect(respuesta.statusCode).toBe(202);
  await e.bandeja.servicio.vaciar();
  const nuevos = e.bandeja.mensajes.slice(antes).filter((m) => m.para === correo);
  expect(nuevos, `correo a ${correo}`).toHaveLength(1);
  return tokenDelCorreo(nuevos[0]!);
}

const correosA = (correo: string) => e.bandeja.mensajes.filter((m) => m.para === correo);

describe("POST /solicitudes-recuperacion (CA-25)", () => {
  it("con una cuenta activa envía el enlace al buzón y guarda solo el hash del token", async () => {
    const u = await e.crearUsuario(A);
    const token = await pedirToken(u.correo);
    const mensaje = correosA(u.correo)[0]!;
    expect(mensaje.texto).toContain(
      `http://rec-a.localhost:5010/recuperar-contrasena#${token}`,
    );
    expect(mensaje.asunto).toContain("Asociación rec-a");

    const { rows } = await e.admin.query(
      "SELECT token_hash FROM public.token_correo WHERE cuenta_id = $1",
      [u.cuentaId],
    );
    expect(rows).toHaveLength(1);
    expect(Buffer.from(rows[0].token_hash).toString("base64url")).not.toBe(token);
    expect(Buffer.from(rows[0].token_hash).toString("utf8")).not.toContain(token);
  });

  it("responde lo mismo exista o no la cuenta, y solo envía a una activa", async () => {
    const activa = await e.crearUsuario(A);
    const suspendida = await e.crearUsuario(A, { estado: "suspendida" });
    const baja = await e.crearUsuario(A, { estado: "baja" });
    const casos = [
      activa.correo,
      suspendida.correo,
      baja.correo,
      "nadie-existe@ejemplo.org",
      "esto no es un correo",
      "ñandú@ejemplo.org",
    ];
    const antes = e.scrypts();
    const respuestas = [];
    for (const correo of casos) respuestas.push(await solicitar(correo));
    await e.bandeja.servicio.vaciar();

    for (const r of respuestas) expect(r.statusCode).toBe(202);
    expect(new Set(respuestas.map((r) => r.body)).size).toBe(1);
    expect(respuestas[0]!.json()).toEqual({ success: true, data: {} });
    expect(correosA(activa.correo)).toHaveLength(1);
    for (const correo of casos.slice(1)) expect(correosA(correo), correo).toHaveLength(0);
    // Ninguna rama hashea.
    expect(e.scrypts() - antes).toBe(0);
  });

  it("el presupuesto frena el envío, no la respuesta; y no invalida los enlaces vigentes", async () => {
    const u = await e.crearUsuario(A);
    const primero = await pedirToken(u.correo);
    const segundo = await pedirToken(u.correo);
    const tercero = await pedirToken(u.correo);
    // Cuarta y quinta: sin presupuesto ni más de 3 vigentes → 202 sin correo.
    for (let i = 0; i < 2; i++) expect((await solicitar(u.correo)).statusCode).toBe(202);
    await e.bandeja.servicio.vaciar();
    expect(correosA(u.correo)).toHaveLength(3);
    expect(new Set([primero, segundo, tercero]).size).toBe(3);
    // Pedir otro no invalidó el primero.
    expect((await restablecer(primero)).statusCode).toBe(200);
  });

  it("la recuperación de una asociación no afecta a la de otra (mismo correo, otra cuenta)", async () => {
    const correo = "compartido-rec@ejemplo.org";
    await e.crearUsuario(A, { correo });
    await e.crearUsuario(B, { correo });
    const tokenA = await pedirToken(correo, "rec-a");
    const tokenB = await pedirToken(correo, "rec-b");
    // El token de A no vale en B y viceversa.
    expect((await restablecer(tokenA, NUEVA, "rec-b")).statusCode).toBe(400);
    expect((await restablecer(tokenB, NUEVA, "rec-a")).statusCode).toBe(400);
    expect((await restablecer(tokenA, NUEVA, "rec-a")).statusCode).toBe(200);
    expect((await restablecer(tokenB, NUEVA, "rec-b")).statusCode).toBe(200);
  });

  it("sin Origin responde 403", async () => {
    const r = await e.pedir("POST", "/solicitudes-recuperacion", {
      sub: "rec-a",
      cuerpo: { correo: "a@ejemplo.org" },
      sinOrigen: true,
    });
    expect(r.statusCode).toBe(403);
  });
});

describe("POST /restablecimientos-contrasena (CA-25)", () => {
  it("cambia la contraseña, cierra todas las sesiones, avisa y gasta el token", async () => {
    const u = await e.crearUsuario(A);
    const sesion = await e.entrar("rec-a", u.correo);
    const token = await pedirToken(u.correo);

    const respuesta = await restablecer(token);
    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json()).toEqual({ success: true, data: {} });
    // No abre sesión.
    expect(respuesta.headers["set-cookie"]).toBeUndefined();

    // La sesión anterior murió; la contraseña vieja ya no vale y la nueva sí.
    expect(
      (await e.pedir("GET", "/sesiones/actual", { sub: "rec-a", token: sesion }))
        .statusCode,
    ).toBe(401);
    await expect(e.entrar("rec-a", u.correo, CLAVE)).rejects.toThrow(/401/);
    await expect(e.entrar("rec-a", u.correo, NUEVA)).resolves.toEqual(expect.any(String));

    // Aviso del cambio por correo.
    await e.bandeja.servicio.vaciar();
    expect(
      correosA(u.correo).some((m) => m.asunto.startsWith("Tu contraseña cambió")),
    ).toBe(true);

    // Un solo uso.
    const reuso = await restablecer(token);
    expect(reuso.statusCode).toBe(400);
    expect(reuso.json().error.codigo).toBe("ENLACE_INVALIDO");
  });

  it("cambiar la contraseña invalida los demás enlaces pendientes de esa cuenta", async () => {
    const u = await e.crearUsuario(A);
    const uno = await pedirToken(u.correo);
    const dos = await pedirToken(u.correo);
    expect((await restablecer(uno)).statusCode).toBe(200);
    expect((await restablecer(dos)).statusCode).toBe(400);
  });

  it("todos los enlaces malos dan el mismo 400 y cuestan cero scrypt", async () => {
    const u = await e.crearUsuario(A);
    const caducado = await pedirToken(u.correo);
    await e.admin.query(
      "UPDATE public.token_correo SET creado_en = now() - interval '2 hours', expira_en = now() - interval '1 minute' WHERE cuenta_id = $1",
      [u.cuentaId],
    );
    const suspendida = await e.crearUsuario(A);
    const deSuspendida = await pedirToken(suspendida.correo);
    await e.admin.query("UPDATE public.persona SET estado = 'suspendida' WHERE id = $1", [
      suspendida.personaId,
    ]);
    const usado = await (async () => {
      const otro = await e.crearUsuario(A);
      const token = await pedirToken(otro.correo);
      await restablecer(token);
      return token;
    })();

    const inventados = Array.from({ length: 100 }, (_, i) =>
      Buffer.from(`inventado-${i}`.padEnd(32, "x")).toString("base64url"),
    );
    const malos = [
      caducado,
      deSuspendida,
      usado,
      "basura",
      "",
      "a".repeat(43),
      ...inventados,
    ];

    const antes = e.scrypts();
    const cuerpos = new Set<string>();
    for (const token of malos) {
      const r = await restablecer(token);
      expect(r.statusCode, token.slice(0, 12)).toBe(400);
      expect(r.json().error.codigo).toBe("ENLACE_INVALIDO");
      cuerpos.add(r.body);
    }
    expect(cuerpos.size).toBe(1);
    expect(e.scrypts() - antes).toBe(0);
  });

  it("una contraseña no admitida se rechaza sin gastar el token", async () => {
    const u = await e.crearUsuario(A);
    const token = await pedirToken(u.correo);
    for (const mala of ["corta", u.correo, "password1234"]) {
      const r = await restablecer(token, mala);
      expect(r.statusCode, mala).toBe(400);
      expect(r.json().error.codigo).toBe("CONTRASENA_NO_ADMITIDA");
    }
    expect((await restablecer(token)).statusCode).toBe(200);
  });

  it("una cuenta sin contraseña (alta sin ella) fija una con el buzón verificado", async () => {
    const u = await e.crearUsuario(A, { hash: null });
    await expect(e.entrar("rec-a", u.correo, CLAVE)).rejects.toThrow(/401/);
    const token = await pedirToken(u.correo);
    expect((await restablecer(token)).statusCode).toBe(200);
    await expect(e.entrar("rec-a", u.correo, NUEVA)).resolves.toEqual(expect.any(String));
  });

  it("20 confirmaciones simultáneas con el mismo token: exactamente 1 gana y 19 son idénticas", async () => {
    const u = await e.crearUsuario(A);
    const token = await pedirToken(u.correo);
    const respuestas = await Promise.all(
      Array.from({ length: 20 }, () => restablecer(token)),
    );
    console.log(
      respuestas.map((r) => r.statusCode + (r.statusCode >= 500 ? r.body : "")).join(" "),
    );
    const buenas = respuestas.filter((r) => r.statusCode === 200);
    const malas = respuestas.filter((r) => r.statusCode === 400);
    expect(buenas).toHaveLength(1);
    expect(malas).toHaveLength(19);
    expect(new Set(malas.map((r) => r.body)).size).toBe(1);
    expect(malas[0]!.json().error.codigo).toBe("ENLACE_INVALIDO");
  });

  it("con la cola de hashes llena responde 503 y el token sigue valiendo", async () => {
    const u = await e.crearUsuario(A);
    const token = await pedirToken(u.correo);
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
        url: "/restablecimientos-contrasena",
        remoteAddress: e.ip(),
        headers: { host: "rec-a.localhost:5010", origin: "http://rec-a.localhost:5010" },
        payload: { token, contrasena: NUEVA },
      });
      expect(r.statusCode).toBe(503);
      expect(Number(r.headers["retry-after"])).toBeGreaterThan(0);
    } finally {
      await llena.close();
    }
    expect((await restablecer(token)).statusCode).toBe(200);
  });

  it("sin Origin responde 403", async () => {
    const r = await e.pedir("POST", "/restablecimientos-contrasena", {
      sub: "rec-a",
      cuerpo: { token: "x", contrasena: NUEVA },
      sinOrigen: true,
    });
    expect(r.statusCode).toBe(403);
  });
});
