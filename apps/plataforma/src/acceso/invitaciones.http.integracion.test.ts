/**
 * Invitaciones por HTTP contra PostgreSQL real (plan del corte 3, CA-24 y CA-26):
 * crear, listar, revocar y aceptar; el invitador se revalida al aceptar y un solo
 * aceptante gana ante la concurrencia.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { crearServicioContrasenas } from "./contrasenas.js";
import { ColaLlena } from "./semaforo.js";
import { conAsociacion } from "../base-de-datos.js";
import { tokenDelCorreo } from "../pruebas/correo.js";
import { crearEntornoHttp, type EntornoHttp } from "../pruebas/http-acceso.js";

let e: EntornoHttp;
let A: string;
let B: string;

const NUEVA = "clave-nueva-larga-y-segura";
let n = 0;
const correoNuevo = () => `invitado${n++}@ejemplo.org`;

beforeAll(async () => {
  e = await crearEntornoHttp();
  A = await e.crearAsociacion("inv-a");
  B = await e.crearAsociacion("inv-b");
});

afterAll(async () => {
  await e.cerrar();
});

/** Un administrador con sesión iniciada. */
async function administrador(sub = "inv-a", asociacion = A) {
  const usuario = await e.crearUsuario(asociacion, { roles: ["administrador"] });
  const token = await e.entrar(sub, usuario.correo);
  return { ...usuario, token, sub };
}
type Admin = Awaited<ReturnType<typeof administrador>>;

const invitar = (quien: Admin, correo: string, rol: unknown = "miembro") =>
  e.pedir("POST", "/invitaciones", {
    sub: quien.sub,
    token: quien.token,
    cuerpo: { correo, rol },
  });

const aceptar = (
  token: string,
  extra: Partial<{ nombre: string; contrasena: string; aceptaTerminos: unknown }> = {},
  sub = "inv-a",
) =>
  e.pedir("POST", "/invitaciones/aceptar", {
    sub,
    cuerpo: {
      token,
      nombre: "Beto Gómez",
      contrasena: NUEVA,
      aceptaTerminos: true,
      ...extra,
    },
  });

/** Invita y devuelve el id y el token del correo recibido. */
async function invitarYRecibir(quien: Admin, correo: string, rol = "miembro") {
  const antes = e.bandeja.mensajes.length;
  const respuesta = await invitar(quien, correo, rol);
  expect(respuesta.statusCode, respuesta.body).toBe(201);
  await e.bandeja.servicio.vaciar();
  const mensajes = e.bandeja.mensajes.slice(antes).filter((m) => m.para === correo);
  expect(mensajes, `correo a ${correo}`).toHaveLength(1);
  return { id: respuesta.json().data.id as string, token: tokenDelCorreo(mensajes[0]!) };
}

const lista = async (quien: Admin) =>
  (await e.pedir("GET", "/invitaciones", { sub: quien.sub, token: quien.token })).json()
    .data.invitaciones as Array<{ id: string; correo: string; rol: string }>;

describe("POST /invitaciones (CA-26)", () => {
  it("crea la invitación, envía el enlace y no devuelve el token", async () => {
    const jefe = await administrador();
    const correo = correoNuevo();
    const antes = e.bandeja.mensajes.length;
    const respuesta = await invitar(jefe, correo, "gestor");
    expect(respuesta.statusCode).toBe(201);
    expect(respuesta.json().data).toEqual({
      id: expect.any(String),
      correo,
      rol: "gestor",
      expiraEn: expect.any(String),
    });
    await e.bandeja.servicio.vaciar();
    const mensaje = e.bandeja.mensajes.slice(antes).find((m) => m.para === correo)!;
    const token = tokenDelCorreo(mensaje);
    expect(mensaje.texto).toContain(`http://inv-a.localhost:5010/invitacion#${token}`);
    expect(respuesta.body).not.toContain(token);

    const { rows } = await e.admin.query(
      "SELECT token_hash, invitada_por FROM public.invitacion WHERE correo = $1",
      [correo],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].invitada_por).toBe(jefe.personaId);
    expect(Buffer.from(rows[0].token_hash).toString("utf8")).not.toContain(token);
  });

  it("solo el administrador: gestor, representante y miembro reciben 403 y no se envía nada", async () => {
    const correo = correoNuevo();
    const antes = e.bandeja.mensajes.length;
    for (const rol of ["gestor", "representante", "miembro"]) {
      const u = await e.crearUsuario(A, { roles: [rol] });
      const token = await e.entrar("inv-a", u.correo);
      const quien = { ...u, token, sub: "inv-a" } as Admin;
      expect((await invitar(quien, correo)).statusCode, rol).toBe(403);
      expect(
        (await e.pedir("GET", "/invitaciones", { sub: "inv-a", token })).statusCode,
        rol,
      ).toBe(403);
      expect(
        (
          await e.pedir("DELETE", "/invitaciones/00000000-0000-4000-8000-000000000000", {
            sub: "inv-a",
            token,
          })
        ).statusCode,
        rol,
      ).toBe(403);
    }
    await e.bandeja.servicio.vaciar();
    expect(e.bandeja.mensajes.slice(antes)).toHaveLength(0);
  });

  it("valida la entrada: correo mal formado y rol desconocido", async () => {
    const jefe = await administrador();
    for (const correo of ["no es un correo", "ñandú@ejemplo.org", "a@"]) {
      expect((await invitar(jefe, correo)).statusCode, correo).toBe(400);
    }
    for (const rol of ["superusuario", "", null, 7]) {
      expect((await invitar(jefe, correoNuevo(), rol)).statusCode, String(rol)).toBe(400);
    }
  });

  it("si el correo ya tiene cuenta (aunque esté de baja) responde 409 y no envía nada", async () => {
    const jefe = await administrador();
    const existente = await e.crearUsuario(A);
    const baja = await e.crearUsuario(A, { estado: "baja" });
    const antes = e.bandeja.mensajes.length;
    for (const u of [existente, baja]) {
      const r = await invitar(jefe, u.correo);
      expect(r.statusCode).toBe(409);
      expect(r.json().error.codigo).toBe("CUENTA_EXISTENTE");
    }
    await e.bandeja.servicio.vaciar();
    expect(e.bandeja.mensajes.slice(antes)).toHaveLength(0);
  });

  it("una pendiente por (correo, rol): duplicada 409; otro rol sí; caducada se reemplaza", async () => {
    const jefe = await administrador();
    const correo = correoNuevo();
    await invitarYRecibir(jefe, correo, "gestor");
    const repetida = await invitar(jefe, correo, "gestor");
    expect(repetida.statusCode).toBe(409);
    expect(repetida.json().error.codigo).toBe("INVITACION_DUPLICADA");
    expect((await invitar(jefe, correo, "miembro")).statusCode).toBe(201);

    await e.admin.query(
      "UPDATE public.invitacion SET creado_en = now() - interval '8 days', expira_en = now() - interval '1 day' WHERE correo = $1 AND rol = 'gestor'",
      [correo],
    );
    expect((await invitar(jefe, correo, "gestor")).statusCode).toBe(201);
  });

  it("tope diario: 20 por administrador, la 21 da 429 con Retry-After y el bloqueo persiste", async () => {
    const jefe = await administrador();
    const otro = await administrador();
    for (let i = 0; i < 20; i++) {
      expect((await invitar(jefe, correoNuevo())).statusCode, `invitación ${i + 1}`).toBe(
        201,
      );
    }
    const veintiuna = await invitar(jefe, correoNuevo());
    expect(veintiuna.statusCode).toBe(429);
    expect(veintiuna.json().error.codigo).toBe("DEMASIADOS_INTENTOS");
    expect(Number(veintiuna.headers["retry-after"])).toBeGreaterThan(0);
    expect((await invitar(jefe, correoNuevo())).statusCode).toBe(429);
    // Otro administrador no se ve afectado.
    expect((await invitar(otro, correoNuevo())).statusCode).toBe(201);
  }, 60_000);
});

describe("GET y DELETE /invitaciones (CA-26)", () => {
  it("lista solo las pendientes de su asociación", async () => {
    const jefe = await administrador();
    const jefeB = await administrador("inv-b", B);
    const viva = await invitarYRecibir(jefe, correoNuevo());
    const revocada = await invitarYRecibir(jefe, correoNuevo());
    const caducada = await invitarYRecibir(jefe, correoNuevo());
    const aceptada = correoNuevo();
    const paraAceptar = await invitarYRecibir(jefe, aceptada);
    const deB = await invitarYRecibir(jefeB, correoNuevo());

    await e.pedir("DELETE", `/invitaciones/${revocada.id}`, {
      sub: "inv-a",
      token: jefe.token,
    });
    await e.admin.query(
      "UPDATE public.invitacion SET creado_en = now() - interval '8 days', expira_en = now() - interval '1 day' WHERE id = $1",
      [caducada.id],
    );
    expect((await aceptar(paraAceptar.token)).statusCode).toBe(200);

    const ids = (await lista(jefe)).map((i) => i.id);
    expect(ids).toContain(viva.id);
    for (const fuera of [revocada.id, caducada.id, paraAceptar.id, deB.id]) {
      expect(ids).not.toContain(fuera);
    }
  });

  it("revocar: 200, deja de aparecer, el enlace deja de valer y revocar de nuevo es 404", async () => {
    const jefe = await administrador();
    const { id, token } = await invitarYRecibir(jefe, correoNuevo());
    const r = await e.pedir("DELETE", `/invitaciones/${id}`, {
      sub: "inv-a",
      token: jefe.token,
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ success: true, data: {} });
    expect((await lista(jefe)).map((i) => i.id)).not.toContain(id);
    expect((await aceptar(token)).json().error.codigo).toBe("ENLACE_INVALIDO");
    expect(
      (
        await e.pedir("DELETE", `/invitaciones/${id}`, {
          sub: "inv-a",
          token: jefe.token,
        })
      ).statusCode,
    ).toBe(404);
  });

  it("no se revoca una invitación de otra asociación (404) ni con id inexistente", async () => {
    const jefe = await administrador();
    const jefeB = await administrador("inv-b", B);
    const { id } = await invitarYRecibir(jefeB, correoNuevo());
    for (const objetivo of [id, "00000000-0000-4000-8000-000000000000"]) {
      expect(
        (
          await e.pedir("DELETE", `/invitaciones/${objetivo}`, {
            sub: "inv-a",
            token: jefe.token,
          })
        ).statusCode,
      ).toBe(404);
    }
    expect((await lista(jefeB)).map((i) => i.id)).toContain(id);
  });
});

describe("POST /invitaciones/aceptar (CA-26)", () => {
  it("crea persona y cuenta con el rol invitado, deja quién lo concedió y abre sesión", async () => {
    const jefe = await administrador();
    const correo = correoNuevo();
    const { token } = await invitarYRecibir(jefe, correo, "representante");

    const respuesta = await aceptar(token);
    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json().data).toMatchObject({
      persona: { nombre: "Beto Gómez" },
      roles: ["representante"],
    });
    const cookie = respuesta.cookies.find((c) => c.name === "aspal_sesion")!;
    expect(cookie.httpOnly).toBe(true);
    expect(respuesta.body).not.toContain(cookie.value);

    const { rows } = await e.admin.query(
      `SELECT c.correo_verificado_en, c.terminos_version, r.rol, r.asignado_por
         FROM public.cuenta_acceso c JOIN public.asignacion_rol r ON r.persona_id = c.persona_id
        WHERE c.asociacion_id = $1 AND c.correo = $2`,
      [A, correo],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      rol: "representante",
      asignado_por: jefe.personaId,
      terminos_version: "pendiente",
    });
    expect(rows[0].correo_verificado_en).toBeInstanceOf(Date);
    await expect(e.entrar("inv-a", correo, NUEVA)).resolves.toEqual(expect.any(String));

    // Un solo uso.
    expect((await aceptar(token)).json().error.codigo).toBe("ENLACE_INVALIDO");
  });

  it("un invitado como administrador entra con el rol de administrador", async () => {
    const jefe = await administrador();
    const { token } = await invitarYRecibir(jefe, correoNuevo(), "administrador");
    expect((await aceptar(token)).json().data.roles).toEqual(["administrador"]);
  });

  it("todos los enlaces malos dan el mismo 400 y cuestan cero scrypt", async () => {
    const jefe = await administrador();
    const jefeB = await administrador("inv-b", B);
    const caducada = await invitarYRecibir(jefe, correoNuevo());
    await e.admin.query(
      "UPDATE public.invitacion SET creado_en = now() - interval '8 days', expira_en = now() - interval '1 day' WHERE id = $1",
      [caducada.id],
    );
    const deB = await invitarYRecibir(jefeB, correoNuevo());
    const inventados = Array.from({ length: 100 }, (_, i) =>
      Buffer.from(`inventado-${i}`.padEnd(32, "x")).toString("base64url"),
    );
    const antes = e.scrypts();
    const cuerpos = new Set<string>();
    for (const token of [caducada.token, "basura", "", "a".repeat(43), ...inventados]) {
      const r = await aceptar(token);
      expect(r.statusCode, token.slice(0, 12)).toBe(400);
      expect(r.json().error.codigo).toBe("ENLACE_INVALIDO");
      cuerpos.add(r.body);
    }
    // Una invitación de B no se acepta en A.
    const cruzada = await aceptar(deB.token, {}, "inv-a");
    expect(cruzada.json().error.codigo).toBe("ENLACE_INVALIDO");
    cuerpos.add(cruzada.body);
    expect(cuerpos.size).toBe(1);
    expect(e.scrypts() - antes).toBe(0);
  });

  it("revalida al invitador: si ya no es administrador, la invitación no vale", async () => {
    const jefe = await administrador();
    const otro = await administrador();

    // (a) Otro administrador le quita el rol: sus pendientes se invalidan.
    const a = await invitarYRecibir(jefe, correoNuevo());
    const quitar = await e.pedir("PUT", `/personas/${jefe.personaId}/roles`, {
      sub: "inv-a",
      token: otro.token,
      cuerpo: { roles: ["miembro"] },
    });
    expect(quitar.statusCode).toBe(200);
    expect((await aceptar(a.token)).json().error.codigo).toBe("ENLACE_INVALIDO");
    // Y desaparece de la lista de pendientes (no solo falla al aceptar).
    expect((await lista(otro)).map((i) => i.id)).not.toContain(a.id);

    // (b) Suspendido.
    const jefe2 = await administrador();
    const b = await invitarYRecibir(jefe2, correoNuevo());
    await e.pedir("PUT", `/personas/${jefe2.personaId}/estado`, {
      sub: "inv-a",
      token: otro.token,
      cuerpo: { estado: "suspendida" },
    });
    expect((await aceptar(b.token)).json().error.codigo).toBe("ENLACE_INVALIDO");
    expect((await lista(otro)).map((i) => i.id)).not.toContain(b.id);

    // (c) Sin pasar por la aplicación: aunque nadie revoque la invitación, la
    //     sentencia de aceptar revalida al invitador.
    const jefe3 = await administrador();
    const c = await invitarYRecibir(jefe3, correoNuevo());
    await e.admin.query(
      "UPDATE public.asignacion_rol SET revocado_en = now() WHERE persona_id = $1",
      [jefe3.personaId],
    );
    const r = await aceptar(c.token);
    expect(r.statusCode).toBe(400);
    expect(r.json().error.codigo).toBe("ENLACE_INVALIDO");
    const { rows } = await e.admin.query(
      "SELECT count(*)::int AS n FROM public.cuenta_acceso WHERE asociacion_id = $1 AND correo = $2",
      [
        A,
        (
          await e.admin.query("SELECT correo FROM public.invitacion WHERE id = $1", [
            c.id,
          ])
        ).rows[0].correo,
      ],
    );
    expect(rows[0].n).toBe(0);
  });

  it("si el invitador pierde el rol justo entre comprobar y reclamar, no se crea la cuenta", async () => {
    const jefe = await administrador();
    const correo = correoNuevo();
    const { token } = await invitarYRecibir(jefe, correo);
    let gancho: (() => Promise<unknown>) | null = () =>
      e.admin.query(
        "UPDATE public.asignacion_rol SET revocado_en = now() WHERE persona_id = $1",
        [jefe.personaId],
      );
    // Tras la primera transacción (la que comprueba), antes de la segunda (la que reclama).
    const conGancho = e.otraApp({
      enAsociacion: async (id, fn) => {
        const resultado = await conAsociacion(e.pool, id, fn);
        const pendiente = gancho;
        gancho = null;
        await pendiente?.();
        return resultado;
      },
    });
    try {
      const r = await conGancho.inject({
        method: "POST",
        url: "/invitaciones/aceptar",
        remoteAddress: e.ip(),
        headers: { host: "inv-a.localhost:5010", origin: "http://inv-a.localhost:5010" },
        payload: { token, nombre: "Beto Gómez", contrasena: NUEVA, aceptaTerminos: true },
      });
      expect(r.statusCode).toBe(400);
      expect(r.json().error.codigo).toBe("ENLACE_INVALIDO");
    } finally {
      await conGancho.close();
    }
    const { rows } = await e.admin.query(
      "SELECT count(*)::int AS n FROM public.cuenta_acceso WHERE asociacion_id = $1 AND correo = $2",
      [A, correo],
    );
    expect(rows[0].n).toBe(0);
  });

  it("términos, contraseña y nombre se rechazan sin gastar la invitación", async () => {
    const jefe = await administrador();
    const correo = correoNuevo();
    const { token } = await invitarYRecibir(jefe, correo);
    expect((await aceptar(token, { aceptaTerminos: false })).json().error.codigo).toBe(
      "TERMINOS_NO_ACEPTADOS",
    );
    for (const mala of ["corta", correo, "password1234"]) {
      expect((await aceptar(token, { contrasena: mala })).json().error.codigo, mala).toBe(
        "CONTRASENA_NO_ADMITIDA",
      );
    }
    expect((await aceptar(token, { nombre: "A" })).statusCode).toBe(400);
    expect((await aceptar(token)).statusCode).toBe(200);
  });

  it("20 aceptaciones simultáneas: exactamente 1 cuenta y 19 respuestas idénticas", async () => {
    const jefe = await administrador();
    const correo = correoNuevo();
    const { token } = await invitarYRecibir(jefe, correo);
    const antes = e.scrypts();
    const respuestas = await Promise.all(
      Array.from({ length: 20 }, () => aceptar(token)),
    );
    expect(respuestas.filter((r) => r.statusCode === 200)).toHaveLength(1);
    const malas = respuestas.filter((r) => r.statusCode === 400);
    expect(malas).toHaveLength(19);
    expect(new Set(malas.map((r) => r.body)).size).toBe(1);
    const { rows } = await e.admin.query(
      "SELECT count(*)::int AS n FROM public.cuenta_acceso WHERE asociacion_id = $1 AND correo = $2",
      [A, correo],
    );
    expect(rows[0].n).toBe(1);
    expect(e.scrypts() - antes).toBe(1);
  });

  it("si el correo ya tiene cuenta por otra vía, la invitación deja de valer y no hay duplicado", async () => {
    const jefe = await administrador();
    const correo = correoNuevo();
    const { token } = await invitarYRecibir(jefe, correo);
    await e.crearUsuario(A, { correo });
    const r = await aceptar(token);
    expect(r.statusCode).toBe(400);
    expect(r.json().error.codigo).toBe("ENLACE_INVALIDO");
    const { rows } = await e.admin.query(
      "SELECT count(*)::int AS n FROM public.cuenta_acceso WHERE asociacion_id = $1 AND correo = $2",
      [A, correo],
    );
    expect(rows[0].n).toBe(1);
  });

  it("con la cola de hashes llena responde 503 y la invitación sigue valiendo", async () => {
    const jefe = await administrador();
    const { token } = await invitarYRecibir(jefe, correoNuevo());
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
        url: "/invitaciones/aceptar",
        remoteAddress: e.ip(),
        headers: { host: "inv-a.localhost:5010", origin: "http://inv-a.localhost:5010" },
        payload: { token, nombre: "Beto Gómez", contrasena: NUEVA, aceptaTerminos: true },
      });
      expect(r.statusCode).toBe(503);
    } finally {
      await llena.close();
    }
    expect((await aceptar(token)).statusCode).toBe(200);
  });

  it("sin Origin responde 403", async () => {
    const r = await e.pedir("POST", "/invitaciones/aceptar", {
      sub: "inv-a",
      cuerpo: { token: "x", nombre: "Beto", contrasena: NUEVA, aceptaTerminos: true },
      sinOrigen: true,
    });
    expect(r.statusCode).toBe(403);
  });
});
