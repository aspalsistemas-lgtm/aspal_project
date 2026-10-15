/**
 * Repositorio de sesiones contra PostgreSQL real (plan del corte 3, CA-3, CA-5, CA-6,
 * CA-8). Todo corre dentro de `conAsociacion`, como en producción.
 */
import { createHash, randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { conAsociacion, crearPool } from "../base-de-datos.js";
import {
  borrarAsociacionesDePrueba,
  crearAsociacionDePrueba,
  crearPersonaConCuenta,
  type PersonaDePrueba,
} from "../pruebas/datos-acceso.js";
import { urlsDePrueba } from "../pruebas/preparar-integracion.js";
import {
  buscarCuentaParaAcceso,
  crearSesion,
  generarToken,
  hashDeToken,
  limpiarSesiones,
  rehashearContrasena,
  resolverSesion,
  revocarCredenciales,
  revocarSesion,
  revocarSesionesDePersona,
  tocarSesion,
} from "./sesiones.js";

const urls = urlsDePrueba();
let admin: pg.Pool;
let app: pg.Pool;
let A: string;
let B: string;
let ana: PersonaDePrueba;
let beto: PersonaDePrueba;

const enA = <T>(fn: Parameters<typeof conAsociacion<T>>[2]) => conAsociacion(app, A, fn);
const enB = <T>(fn: Parameters<typeof conAsociacion<T>>[2]) => conAsociacion(app, B, fn);

async function sesionesVivas(cuentaId: string): Promise<number> {
  const { rows } = await admin.query(
    "SELECT count(*)::int AS n FROM public.sesion WHERE cuenta_id = $1 AND revocada_en IS NULL",
    [cuentaId],
  );
  return rows[0].n;
}

beforeAll(async () => {
  admin = crearPool(urls.admin);
  app = crearPool(urls.app, { max: 4 });
  A = await crearAsociacionDePrueba(admin, "sesiones-a");
  B = await crearAsociacionDePrueba(admin, "sesiones-b");
  ana = await crearPersonaConCuenta(admin, A, "ana@ejemplo.org", {
    roles: ["miembro", "representante"],
    hash: "hash-de-ana",
  });
  // El MISMO correo en la otra asociación: otra cuenta, otra persona.
  beto = await crearPersonaConCuenta(admin, B, "ana@ejemplo.org", {
    roles: ["administrador"],
    hash: "hash-de-otra-ana",
  });
});

afterAll(async () => {
  await borrarAsociacionesDePrueba(admin, [A, B]);
  await Promise.all([admin.end(), app.end()]);
});

describe("tokens (CA-4: solo se guarda el hash)", () => {
  it("son de 32 bytes aleatorios en base64url y distintos cada vez", () => {
    const a = generarToken();
    const b = generarToken();
    expect(a.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a.token).not.toBe(b.token);
    expect(a.hash).toBeInstanceOf(Buffer);
    expect(a.hash.length).toBe(32);
  });

  it("el hash es el SHA-256 del token, y el token no se deduce del hash", () => {
    const { token, hash } = generarToken();
    expect(hash.equals(createHash("sha256").update(token).digest())).toBe(true);
    expect(hashDeToken(token).equals(hash)).toBe(true);
    expect(hash.toString("base64url")).not.toBe(token);
  });
});

describe("buscarCuentaParaAcceso", () => {
  it("encuentra la cuenta por el correo, con persona, versión y roles", async () => {
    const cuenta = await enA((base) => buscarCuentaParaAcceso(base, "ana@ejemplo.org"));
    expect(cuenta).toMatchObject({
      cuentaId: ana.cuentaId,
      personaId: ana.personaId,
      hashContrasena: "hash-de-ana",
      credencialVersion: 1,
      estadoPersona: "activa",
      roles: ["miembro", "representante"],
    });
  });

  it("el mismo correo en OTRA asociación es otra cuenta: cada una ve la suya (CA-1)", async () => {
    const enOtra = await enB((base) => buscarCuentaParaAcceso(base, "ana@ejemplo.org"));
    expect(enOtra).toMatchObject({
      cuentaId: beto.cuentaId,
      hashContrasena: "hash-de-otra-ana",
      roles: ["administrador"],
    });
    expect(enOtra!.cuentaId).not.toBe(ana.cuentaId);
  });

  it("un correo que solo existe en otra asociación no se encuentra", async () => {
    const solo = await crearPersonaConCuenta(admin, B, "solo-en-b@ejemplo.org");
    expect(await enA((base) => buscarCuentaParaAcceso(base, solo.correo))).toBeNull();
  });

  it("devuelve null para un correo inexistente", async () => {
    expect(
      await enA((base) => buscarCuentaParaAcceso(base, "nadie@ejemplo.org")),
    ).toBeNull();
  });

  it("no filtra por estado: una persona suspendida llega con su estado, para que el login la rechace", async () => {
    const suspendida = await crearPersonaConCuenta(admin, A, "susp@ejemplo.org", {
      estado: "suspendida",
    });
    const cuenta = await enA((base) => buscarCuentaParaAcceso(base, suspendida.correo));
    expect(cuenta?.estadoPersona).toBe("suspendida");
  });

  it("una cuenta sin contraseña (alta por Google o enlace) llega con hash nulo", async () => {
    const sinClave = await crearPersonaConCuenta(admin, A, "sin-clave@ejemplo.org", {
      hash: null,
    });
    const cuenta = await enA((base) => buscarCuentaParaAcceso(base, sinClave.correo));
    expect(cuenta?.hashContrasena).toBeNull();
  });
});

describe("crearSesion (CA-3, paso 3: revalida antes de crear)", () => {
  it("crea la sesión, guarda solo el hash del token y fija la caducidad por los roles", async () => {
    const { token, hash } = generarToken();
    const creada = await enA((base) =>
      crearSesion(base, {
        cuentaId: ana.cuentaId,
        credencialVersion: 1,
        tokenHash: hash,
        roles: ["miembro", "representante"],
      }),
    );
    expect(creada).not.toBeNull();
    const { rows } = await admin.query(
      `SELECT extract(epoch FROM (expira_en - creada_en))::int AS segundos, nivel_autenticacion
         FROM public.sesion WHERE id = $1`,
      [creada!.sesionId],
    );
    expect(rows[0].segundos).toBeGreaterThanOrEqual(7 * 86_400 - 5);
    expect(rows[0].segundos).toBeLessThanOrEqual(7 * 86_400 + 5);
    expect(rows[0].nivel_autenticacion).toBe(1);
    // El token en claro no está en ninguna parte de la tabla.
    const claro = await admin.query(
      "SELECT count(*)::int AS n FROM public.sesion WHERE token_hash = $1",
      [Buffer.from(token, "utf8")],
    );
    expect(claro.rows[0].n).toBe(0);
  });

  it("para un administrador la caducidad absoluta es de 12 h", async () => {
    const admins = await crearPersonaConCuenta(admin, A, "admin-corto@ejemplo.org", {
      roles: ["administrador"],
    });
    const creada = await enA((base) =>
      crearSesion(base, {
        cuentaId: admins.cuentaId,
        credencialVersion: 1,
        tokenHash: generarToken().hash,
        roles: ["administrador"],
      }),
    );
    const { rows } = await admin.query(
      "SELECT extract(epoch FROM (expira_en - creada_en))::int AS segundos FROM public.sesion WHERE id = $1",
      [creada!.sesionId],
    );
    expect(rows[0].segundos).toBeGreaterThanOrEqual(12 * 3600 - 5);
    expect(rows[0].segundos).toBeLessThanOrEqual(12 * 3600 + 5);
  });

  it("NO crea la sesión si la versión de credencial ya no es la leída (la carrera del login)", async () => {
    const victima = await crearPersonaConCuenta(admin, A, "victima@ejemplo.org");
    // El login lee la cuenta (versión 1) y verifica la contraseña fuera de la transacción…
    const leida = await enA((base) => buscarCuentaParaAcceso(base, victima.correo));
    expect(leida!.credencialVersion).toBe(1);
    // …y mientras tanto la víctima cambia su contraseña (o la suspenden).
    await enA((base) => revocarCredenciales(base, victima.cuentaId, "hash-nuevo"));
    // Con las credenciales ya revocadas, la sesión NO debe nacer.
    const creada = await enA((base) =>
      crearSesion(base, {
        cuentaId: victima.cuentaId,
        credencialVersion: leida!.credencialVersion,
        tokenHash: generarToken().hash,
        roles: ["miembro"],
      }),
    );
    expect(creada).toBeNull();
    expect(await sesionesVivas(victima.cuentaId)).toBe(0);
  });

  it("NO la crea si la persona dejó de estar activa entre la lectura y la creación", async () => {
    const p = await crearPersonaConCuenta(admin, A, "se-suspende@ejemplo.org");
    const leida = await enA((base) => buscarCuentaParaAcceso(base, p.correo));
    await admin.query("UPDATE public.persona SET estado = 'suspendida' WHERE id = $1", [
      p.personaId,
    ]);
    const creada = await enA((base) =>
      crearSesion(base, {
        cuentaId: p.cuentaId,
        credencialVersion: leida!.credencialVersion,
        tokenHash: generarToken().hash,
        roles: ["miembro"],
      }),
    );
    expect(creada).toBeNull();
  });

  it("NO la crea para una cuenta de otra asociación (RLS y clave compuesta)", async () => {
    const creada = await enA((base) =>
      crearSesion(base, {
        cuentaId: beto.cuentaId,
        credencialVersion: 1,
        tokenHash: generarToken().hash,
        roles: ["administrador"],
      }),
    );
    expect(creada).toBeNull();
    expect(await sesionesVivas(beto.cuentaId)).toBe(0);
  });

  it("tope de 10 sesiones vivas por cuenta: al pasar, se revoca la más antigua", async () => {
    const p = await crearPersonaConCuenta(admin, A, "muchas@ejemplo.org");
    const tokens: Buffer[] = [];
    for (let i = 0; i < 12; i++) {
      const { hash } = generarToken();
      tokens.push(hash);
      await enA((base) =>
        crearSesion(base, {
          cuentaId: p.cuentaId,
          credencialVersion: 1,
          tokenHash: hash,
          roles: ["miembro"],
        }),
      );
    }
    expect(await sesionesVivas(p.cuentaId)).toBe(10);
    // Las dos primeras (las más antiguas) son las revocadas.
    const primera = await enA((base) => resolverSesion(base, tokens[0]!));
    const ultima = await enA((base) => resolverSesion(base, tokens[11]!));
    expect(primera?.revocada).toBe(true);
    expect(ultima?.revocada).toBe(false);
  });
});

describe("resolverSesion (CA-5: una sesión de otra asociación no existe)", () => {
  it("resuelve la sesión por el hash, con persona, roles y las medidas de tiempo", async () => {
    const { hash } = generarToken();
    await enA((base) =>
      crearSesion(base, {
        cuentaId: ana.cuentaId,
        credencialVersion: 1,
        tokenHash: hash,
        roles: ["miembro"],
      }),
    );
    const sesion = await enA((base) => resolverSesion(base, hash));
    expect(sesion).toMatchObject({
      cuentaId: ana.cuentaId,
      personaId: ana.personaId,
      nombre: "Persona de prueba",
      estadoPersona: "activa",
      roles: ["miembro", "representante"],
      revocada: false,
    });
    expect(sesion!.inactivaSegundos).toBeLessThan(5);
    expect(sesion!.antiguedadSegundos).toBeLessThan(5);
  });

  it("la MISMA sesión, buscada desde otra asociación, no existe", async () => {
    const { hash } = generarToken();
    await enA((base) =>
      crearSesion(base, {
        cuentaId: ana.cuentaId,
        credencialVersion: 1,
        tokenHash: hash,
        roles: ["miembro"],
      }),
    );
    expect(await enA((base) => resolverSesion(base, hash))).not.toBeNull();
    expect(await enB((base) => resolverSesion(base, hash))).toBeNull();
  });

  it("devuelve null para un hash desconocido", async () => {
    expect(await enA((base) => resolverSesion(base, randomBytes(32)))).toBeNull();
  });

  it("marca la sesión revocada", async () => {
    const { hash } = generarToken();
    const creada = await enA((base) =>
      crearSesion(base, {
        cuentaId: ana.cuentaId,
        credencialVersion: 1,
        tokenHash: hash,
        roles: ["miembro"],
      }),
    );
    await enA((base) => revocarSesion(base, creada!.sesionId));
    expect((await enA((base) => resolverSesion(base, hash)))?.revocada).toBe(true);
  });

  it("refleja el estado actual de la persona: suspendida", async () => {
    const p = await crearPersonaConCuenta(admin, A, "luego-suspendida@ejemplo.org");
    const { hash } = generarToken();
    await enA((base) =>
      crearSesion(base, {
        cuentaId: p.cuentaId,
        credencialVersion: 1,
        tokenHash: hash,
        roles: ["miembro"],
      }),
    );
    await admin.query("UPDATE public.persona SET estado = 'suspendida' WHERE id = $1", [
      p.personaId,
    ]);
    expect((await enA((base) => resolverSesion(base, hash)))?.estadoPersona).toBe(
      "suspendida",
    );
  });

  it("refleja los roles ACTUALES, no los de cuando se creó", async () => {
    const p = await crearPersonaConCuenta(admin, A, "ascendida@ejemplo.org", {
      roles: ["miembro"],
    });
    const { hash } = generarToken();
    await enA((base) =>
      crearSesion(base, {
        cuentaId: p.cuentaId,
        credencialVersion: 1,
        tokenHash: hash,
        roles: ["miembro"],
      }),
    );
    await admin.query(
      "INSERT INTO public.asignacion_rol (asociacion_id, persona_id, rol) VALUES ($1, $2, 'administrador')",
      [A, p.personaId],
    );
    expect((await enA((base) => resolverSesion(base, hash)))?.roles).toEqual([
      "administrador",
      "miembro",
    ]);
  });

  it("no cuenta los roles revocados", async () => {
    const p = await crearPersonaConCuenta(admin, A, "revocada-rol@ejemplo.org", {
      roles: ["miembro", "gestor"],
    });
    await admin.query(
      "UPDATE public.asignacion_rol SET revocado_en = now() WHERE persona_id = $1 AND rol = 'gestor'",
      [p.personaId],
    );
    const cuenta = await enA((base) => buscarCuentaParaAcceso(base, p.correo));
    expect(cuenta?.roles).toEqual(["miembro"]);
  });
});

describe("tocarSesion: no escribe en cada petición (CA-8)", () => {
  async function ultimoUso(sesionId: string): Promise<Date> {
    const { rows } = await admin.query(
      "SELECT ultimo_uso_en FROM public.sesion WHERE id = $1",
      [sesionId],
    );
    return rows[0].ultimo_uso_en;
  }

  it("no actualiza el último uso si es reciente", async () => {
    const creada = await enA((base) =>
      crearSesion(base, {
        cuentaId: ana.cuentaId,
        credencialVersion: 1,
        tokenHash: generarToken().hash,
        roles: ["miembro"],
      }),
    );
    const antes = await ultimoUso(creada!.sesionId);
    await enA((base) => tocarSesion(base, creada!.sesionId));
    expect((await ultimoUso(creada!.sesionId)).getTime()).toBe(antes.getTime());
  });

  it("lo actualiza si pasaron más de 5 minutos", async () => {
    const creada = await enA((base) =>
      crearSesion(base, {
        cuentaId: ana.cuentaId,
        credencialVersion: 1,
        tokenHash: generarToken().hash,
        roles: ["miembro"],
      }),
    );
    await admin.query(
      "UPDATE public.sesion SET ultimo_uso_en = now() - interval '6 minutes' WHERE id = $1",
      [creada!.sesionId],
    );
    const viejo = await ultimoUso(creada!.sesionId);
    await enA((base) => tocarSesion(base, creada!.sesionId));
    expect((await ultimoUso(creada!.sesionId)).getTime()).toBeGreaterThan(
      viejo.getTime() + 5 * 60_000,
    );
  });
});

describe("revocar", () => {
  it("revocarSesionesDePersona cierra todas las de esa persona y ninguna más", async () => {
    const uno = await crearPersonaConCuenta(admin, A, "uno@ejemplo.org");
    const dos = await crearPersonaConCuenta(admin, A, "dos@ejemplo.org");
    for (const p of [uno, uno, dos]) {
      await enA((base) =>
        crearSesion(base, {
          cuentaId: p.cuentaId,
          credencialVersion: 1,
          tokenHash: generarToken().hash,
          roles: ["miembro"],
        }),
      );
    }
    const revocadas = await enA((base) => revocarSesionesDePersona(base, uno.personaId));
    expect(revocadas).toBe(2);
    expect(await sesionesVivas(uno.cuentaId)).toBe(0);
    expect(await sesionesVivas(dos.cuentaId)).toBe(1);
  });

  it("no toca las sesiones de otra asociación", async () => {
    const enOtra = await enB((base) =>
      crearSesion(base, {
        cuentaId: beto.cuentaId,
        credencialVersion: 1,
        tokenHash: generarToken().hash,
        roles: ["administrador"],
      }),
    );
    expect(enOtra).not.toBeNull();
    await enA((base) => revocarSesionesDePersona(base, beto.personaId));
    expect(await sesionesVivas(beto.cuentaId)).toBe(1);
  });
});

describe("revocarCredenciales (CA-6: cambiar la contraseña o suspender)", () => {
  it("sube la versión, cambia la contraseña y revoca todas las sesiones de la cuenta, a la vez", async () => {
    const p = await crearPersonaConCuenta(admin, A, "cambia-clave@ejemplo.org", {
      hash: "hash-viejo",
    });
    for (let i = 0; i < 3; i++) {
      await enA((base) =>
        crearSesion(base, {
          cuentaId: p.cuentaId,
          credencialVersion: 1,
          tokenHash: generarToken().hash,
          roles: ["miembro"],
        }),
      );
    }
    expect(await sesionesVivas(p.cuentaId)).toBe(3);
    await enA((base) => revocarCredenciales(base, p.cuentaId, "hash-nuevo"));
    const { rows } = await admin.query(
      "SELECT credencial_version, hash_contrasena FROM public.cuenta_acceso WHERE id = $1",
      [p.cuentaId],
    );
    expect(rows[0]).toEqual({ credencial_version: 2, hash_contrasena: "hash-nuevo" });
    expect(await sesionesVivas(p.cuentaId)).toBe(0);
  });

  it("sin contraseña nueva (suspender, dar de baja) conserva la actual", async () => {
    const p = await crearPersonaConCuenta(admin, A, "se-suspende2@ejemplo.org", {
      hash: "hash-actual",
    });
    await enA((base) => revocarCredenciales(base, p.cuentaId));
    const { rows } = await admin.query(
      "SELECT credencial_version, hash_contrasena FROM public.cuenta_acceso WHERE id = $1",
      [p.cuentaId],
    );
    expect(rows[0]).toEqual({ credencial_version: 2, hash_contrasena: "hash-actual" });
  });

  it("con contraseña nula la deja sin contraseña (cuentas de Google)", async () => {
    const p = await crearPersonaConCuenta(admin, A, "quita-clave@ejemplo.org", {
      hash: "hash-actual",
    });
    await enA((base) => revocarCredenciales(base, p.cuentaId, null));
    const { rows } = await admin.query(
      "SELECT hash_contrasena FROM public.cuenta_acceso WHERE id = $1",
      [p.cuentaId],
    );
    expect(rows[0].hash_contrasena).toBeNull();
  });
});

describe("rehashearContrasena: comparar y cambiar (CA-3)", () => {
  it("cambia el hash si sigue siendo el que se leyó, SIN subir la versión ni cerrar sesiones", async () => {
    const p = await crearPersonaConCuenta(admin, A, "rehash@ejemplo.org", {
      hash: "hash-viejo",
    });
    await enA((base) =>
      crearSesion(base, {
        cuentaId: p.cuentaId,
        credencialVersion: 1,
        tokenHash: generarToken().hash,
        roles: ["miembro"],
      }),
    );
    const cambiado = await enA((base) =>
      rehashearContrasena(base, p.cuentaId, "hash-viejo", "hash-mas-fuerte"),
    );
    expect(cambiado).toBe(true);
    const { rows } = await admin.query(
      "SELECT credencial_version, hash_contrasena FROM public.cuenta_acceso WHERE id = $1",
      [p.cuentaId],
    );
    expect(rows[0]).toEqual({
      credencial_version: 1,
      hash_contrasena: "hash-mas-fuerte",
    });
    expect(await sesionesVivas(p.cuentaId)).toBe(1);
  });

  it("no hace nada si la contraseña cambió mientras tanto (no pisa la nueva)", async () => {
    const p = await crearPersonaConCuenta(admin, A, "rehash2@ejemplo.org", {
      hash: "hash-viejo",
    });
    await enA((base) =>
      revocarCredenciales(base, p.cuentaId, "hash-que-eligio-el-usuario"),
    );
    const cambiado = await enA((base) =>
      rehashearContrasena(base, p.cuentaId, "hash-viejo", "hash-mas-fuerte"),
    );
    expect(cambiado).toBe(false);
    const { rows } = await admin.query(
      "SELECT hash_contrasena FROM public.cuenta_acceso WHERE id = $1",
      [p.cuentaId],
    );
    expect(rows[0].hash_contrasena).toBe("hash-que-eligio-el-usuario");
  });
});

describe("limpiarSesiones: en lotes (CA-10)", () => {
  it("borra las caducadas y las revocadas hace tiempo, por lotes, y deja las vigentes", async () => {
    const p = await crearPersonaConCuenta(admin, A, "limpieza@ejemplo.org");
    await admin.query(
      `INSERT INTO public.sesion (asociacion_id, cuenta_id, token_hash, expira_en, creada_en)
       SELECT $1, $2, uuid_send(gen_random_uuid()), now() - interval '3 days', now() - interval '4 days'
         FROM generate_series(1, 25)`,
      [A, p.cuentaId],
    );
    await admin.query(
      `INSERT INTO public.sesion (asociacion_id, cuenta_id, token_hash, expira_en, revocada_en)
       VALUES ($1, $2, uuid_send(gen_random_uuid()), now() + interval '1 day', now() - interval '3 days')`,
      [A, p.cuentaId],
    );
    const vigente = generarToken().hash;
    await enA((base) =>
      crearSesion(base, {
        cuentaId: p.cuentaId,
        credencialVersion: 1,
        tokenHash: vigente,
        roles: ["miembro"],
      }),
    );
    const borradas: number[] = [];
    for (let i = 0; i < 4; i++)
      borradas.push(await enA((base) => limpiarSesiones(base, 10)));
    expect(borradas).toEqual([10, 10, 6, 0]);
    expect(await enA((base) => resolverSesion(base, vigente))).not.toBeNull();
  });
});

describe("concurrencia al crear la sesión (auditoría M1 y B2)", () => {
  async function conTransaccionAbierta(
    sentencia: string,
    parametros: unknown[],
    mientras: () => Promise<unknown>,
  ): Promise<void> {
    const cliente = await admin.connect();
    try {
      await cliente.query("BEGIN");
      await cliente.query(sentencia, parametros);
      const pendiente = mientras();
      // Da tiempo a que la sentencia concurrente llegue y quede esperando el bloqueo.
      await new Promise((resolver) => setTimeout(resolver, 300));
      await cliente.query("COMMIT");
      await pendiente;
    } finally {
      cliente.release();
    }
  }

  it("un login que corre mientras se sube la versión de credencial no crea sesión", async () => {
    const persona = await crearPersonaConCuenta(admin, A, "m1-credencial@ejemplo.org", {
      roles: ["miembro"],
      hash: "hash-m1",
    });
    let resultado: unknown = "sin ejecutar";
    await conTransaccionAbierta(
      "UPDATE public.cuenta_acceso SET credencial_version = credencial_version + 1 WHERE id = $1",
      [persona.cuentaId],
      async () => {
        resultado = await enA((base) =>
          crearSesion(base, {
            cuentaId: persona.cuentaId,
            credencialVersion: 1,
            tokenHash: generarToken().hash,
            roles: ["miembro"],
          }),
        );
      },
    );
    expect(resultado).toBeNull();
    expect(await sesionesVivas(persona.cuentaId)).toBe(0);
  });

  it("un login que corre mientras se suspende a la persona no crea sesión", async () => {
    const persona = await crearPersonaConCuenta(admin, A, "m1-estado@ejemplo.org", {
      roles: ["miembro"],
      hash: "hash-m1",
    });
    let resultado: unknown = "sin ejecutar";
    await conTransaccionAbierta(
      "UPDATE public.persona SET estado = 'suspendida' WHERE id = $1",
      [persona.personaId],
      async () => {
        resultado = await enA((base) =>
          crearSesion(base, {
            cuentaId: persona.cuentaId,
            credencialVersion: 1,
            tokenHash: generarToken().hash,
            roles: ["miembro"],
          }),
        );
      },
    );
    expect(resultado).toBeNull();
    expect(await sesionesVivas(persona.cuentaId)).toBe(0);
  });

  it("15 logins simultáneos de la misma cuenta dejan exactamente 10 sesiones vivas", async () => {
    const persona = await crearPersonaConCuenta(admin, A, "b2-tope@ejemplo.org", {
      roles: ["miembro"],
      hash: "hash-b2",
    });
    await Promise.all(
      Array.from({ length: 15 }, () =>
        enA((base) =>
          crearSesion(base, {
            cuentaId: persona.cuentaId,
            credencialVersion: 1,
            tokenHash: generarToken().hash,
            roles: ["miembro"],
          }),
        ),
      ),
    );
    expect(await sesionesVivas(persona.cuentaId)).toBe(10);
  });
});
