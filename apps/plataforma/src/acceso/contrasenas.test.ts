import { describe, expect, it, vi } from "vitest";
import {
  PARAMETROS_SCRYPT,
  crearServicioContrasenas,
  derivarScrypt,
  validarContrasena,
  type Derivar,
} from "./contrasenas.js";
import { ColaLlena, SemaforoDeHashes } from "./semaforo.js";

/** Parámetros baratos para que la batería no tarde: la correcta se prueba aparte. */
const RAPIDOS = { N: 2 ** 14, r: 8, p: 1 } as const;
const CLAVE = "una-contrasena-larga-y-buena";
const ASOCIACION = "asociacion-a";

/** Un servicio con un derivador que cuenta las llamadas y la concurrencia. */
function crear(opciones: { semaforo?: SemaforoDeHashes } = {}) {
  const llamadas: { N: number; r: number; p: number }[] = [];
  let simultaneas = 0;
  let maximo = 0;
  const derivar: Derivar = vi.fn(async (contrasena, sal, longitud, parametros) => {
    llamadas.push({ ...parametros });
    simultaneas += 1;
    maximo = Math.max(maximo, simultaneas);
    try {
      return await derivarScrypt(contrasena, sal, longitud, parametros);
    } finally {
      simultaneas -= 1;
    }
  });
  const servicio = crearServicioContrasenas({
    parametros: RAPIDOS,
    derivar,
    semaforo: opciones.semaforo,
  });
  return { servicio, llamadas, derivar, maximoSimultaneo: () => maximo };
}

describe("hashear y verificar (CA-13)", () => {
  it("el hash lleva sus parámetros y una sal propia", async () => {
    const { servicio } = crear();
    const hash = await servicio.hashear(CLAVE, ASOCIACION);
    expect(hash).toMatch(/^scrypt\$16384\$8\$1\$[A-Za-z0-9_-]{22}\$[A-Za-z0-9_-]{86}$/);
  });

  it("dos hashes de la misma contraseña son distintos (sal aleatoria)", async () => {
    const { servicio } = crear();
    const a = await servicio.hashear(CLAVE, ASOCIACION);
    const b = await servicio.hashear(CLAVE, ASOCIACION);
    expect(a).not.toBe(b);
  });

  it("verifica la contraseña correcta y rechaza una incorrecta", async () => {
    const { servicio } = crear();
    const hash = await servicio.hashear(CLAVE, ASOCIACION);
    expect(await servicio.verificar(CLAVE, hash, ASOCIACION)).toBe(true);
    expect(await servicio.verificar(`${CLAVE}x`, hash, ASOCIACION)).toBe(false);
    expect(await servicio.verificar("", hash, ASOCIACION)).toBe(false);
  });

  it("aplica NFKC: la forma de ancho completo es la misma contraseña", async () => {
    const { servicio } = crear();
    const hash = await servicio.hashear("contraseña-segura-123", ASOCIACION);
    expect(
      await servicio.verificar("ｃｏｎｔｒａｓｅñａ-segura-123", hash, ASOCIACION),
    ).toBe(true);
  });

  it("distingue mayúsculas de minúsculas", async () => {
    const { servicio } = crear();
    const hash = await servicio.hashear(CLAVE, ASOCIACION);
    expect(await servicio.verificar(CLAVE.toUpperCase(), hash, ASOCIACION)).toBe(false);
  });

  it("con los parámetros de producción (N=2^17) funciona: maxmem está bien fijado", async () => {
    // Sin maxmem explícito, Node falla con 128 MiB (su tope por defecto es 32 MiB).
    const real = crearServicioContrasenas();
    expect(PARAMETROS_SCRYPT.N).toBe(2 ** 17);
    const hash = await real.hashear(CLAVE, ASOCIACION);
    expect(hash).toMatch(/^scrypt\$131072\$8\$1\$/);
    expect(await real.verificar(CLAVE, hash, ASOCIACION)).toBe(true);
    expect(await real.verificar("otra-contrasena-distinta", hash, ASOCIACION)).toBe(
      false,
    );
  }, 30_000);
});

describe("un único scrypt en TODAS las ramas (CA-3)", () => {
  async function derivaciones(
    hash: (s: ReturnType<typeof crear>["servicio"]) => Promise<string | null>,
  ) {
    const { servicio, llamadas } = crear();
    const guardado = await hash(servicio);
    llamadas.length = 0;
    await servicio.verificar(CLAVE, guardado, ASOCIACION);
    return llamadas;
  }

  it("contraseña correcta: 1", async () => {
    expect(await derivaciones((s) => s.hashear(CLAVE, ASOCIACION))).toHaveLength(1);
  });

  it("contraseña incorrecta: 1", async () => {
    const { servicio, llamadas } = crear();
    const hash = await servicio.hashear(CLAVE, ASOCIACION);
    llamadas.length = 0;
    await servicio.verificar("incorrecta-incorrecta", hash, ASOCIACION);
    expect(llamadas).toHaveLength(1);
  });

  it("cuenta inexistente (sin hash): 1, con los parámetros vigentes", async () => {
    const llamadas = await derivaciones(async () => null);
    expect(llamadas).toEqual([RAPIDOS]);
  });

  it("cuenta sin contraseña (alta por Google o enlace): 1", async () => {
    expect(await derivaciones(async () => null)).toHaveLength(1);
  });

  it.each([
    ["vacío", ""],
    ["basura", "no-es-un-hash"],
    ["otro algoritmo", "bcrypt$12$abcdefghijklmnopqrstuv$abcdefghijklmnopqrstuvwxyz"],
    ["faltan campos", "scrypt$16384$8$1$abc"],
    ["sobran campos", "scrypt$16384$8$1$abc$def$ghi"],
    ["parámetros no numéricos", "scrypt$N$r$p$abcdefghijklmnopqrstuv$abc"],
  ])(
    "hash guardado ilegible (%s): rechaza con 1 scrypt sobre un objetivo simulado",
    async (_n, hash) => {
      const { servicio, llamadas } = crear();
      expect(await servicio.verificar(CLAVE, hash, ASOCIACION)).toBe(false);
      expect(llamadas).toEqual([RAPIDOS]);
    },
  );

  it.each([
    ["N enorme", { N: 2 ** 30, r: 8, p: 1 }],
    ["N que no es potencia de dos", { N: 20_000, r: 8, p: 1 }],
    ["N demasiado pequeño", { N: 2 ** 10, r: 8, p: 1 }],
    ["r a cero", { N: 2 ** 14, r: 0, p: 1 }],
    ["p excesivo", { N: 2 ** 14, r: 8, p: 100 }],
    ["memoria por encima del tope", { N: 2 ** 20, r: 16, p: 1 }],
  ])(
    "un hash con %s no se usa: no se derivan sus parámetros (cota de lectura)",
    async (_n, p) => {
      const { servicio, llamadas } = crear();
      // Sal y clave BIEN formadas: si no, el hash se descartaría por eso y la cota que
      // se quiere probar nunca llegaría a comprobarse (un falso verde).
      const sal = Buffer.alloc(16, 1).toString("base64url");
      const clave = Buffer.alloc(64, 2).toString("base64url");
      const hash = `scrypt$${p.N}$${p.r}$${p.p}$${sal}$${clave}`;
      expect(await servicio.verificar(CLAVE, hash, ASOCIACION)).toBe(false);
      // Una sola derivación y con los parámetros vigentes, nunca con los del hash.
      expect(llamadas).toEqual([RAPIDOS]);
    },
  );

  it("el mismo hash con parámetros válidos y sal y clave bien formadas SÍ se lee (control de los casos de arriba)", async () => {
    const { servicio, llamadas } = crear();
    const sal = Buffer.alloc(16, 1).toString("base64url");
    const clave = Buffer.alloc(64, 2).toString("base64url");
    const hash = `scrypt$${RAPIDOS.N}$${RAPIDOS.r}$${RAPIDOS.p}$${sal}$${clave}`;
    expect(await servicio.verificar(CLAVE, hash, ASOCIACION)).toBe(false); // no es su contraseña
    // Se derivó con la sal del hash, no con una simulada: se lee, no se descarta.
    expect(llamadas).toEqual([RAPIDOS]);
    expect(servicio.necesitaRehash(hash)).toBe(false);
  });

  it("una contraseña desmesurada tampoco deriva nada con ella: 1 scrypt, y rechaza", async () => {
    const { servicio, llamadas } = crear();
    const hash = await servicio.hashear(CLAVE, ASOCIACION);
    llamadas.length = 0;
    expect(await servicio.verificar("x".repeat(100_000), hash, ASOCIACION)).toBe(false);
    expect(llamadas).toHaveLength(1);
  });
});

describe("necesitaRehash", () => {
  it("un hash con los parámetros vigentes no necesita rehash", async () => {
    const { servicio } = crear();
    expect(servicio.necesitaRehash(await servicio.hashear(CLAVE, ASOCIACION))).toBe(
      false,
    );
  });

  it("uno más débil que el vigente, ilegible o de otro algoritmo, sí", async () => {
    const guardadoConN14 = await crear().servicio.hashear(CLAVE, ASOCIACION);
    // El vigente ahora es más fuerte (N=2^15): el guardado quedó viejo.
    const vigente = crearServicioContrasenas({ parametros: { N: 2 ** 15, r: 8, p: 1 } });
    expect(vigente.necesitaRehash(guardadoConN14)).toBe(true);
    expect(vigente.necesitaRehash("basura")).toBe(true);
    expect(vigente.necesitaRehash("bcrypt$12$x$y")).toBe(true);
  });

  it("uno más fuerte que el vigente no se rebaja", async () => {
    const guardadoConN15 = await crearServicioContrasenas({
      parametros: { N: 2 ** 15, r: 8, p: 1 },
    }).hashear(CLAVE, ASOCIACION);
    expect(crear().servicio.necesitaRehash(guardadoConN15)).toBe(false);
  });
});

describe("semáforo de hashes (CA-11)", () => {
  it("no hay más derivaciones simultáneas que plazas en vuelo", async () => {
    const semaforo = new SemaforoDeHashes({
      enVuelo: 2,
      cola: 20,
      colaPorAsociacion: 20,
    });
    const { servicio, maximoSimultaneo } = crear({ semaforo });
    const hash = await servicio.hashear(CLAVE, ASOCIACION);
    await Promise.all(
      Array.from({ length: 8 }, () =>
        servicio.verificar("incorrecta-incorrecta", hash, ASOCIACION),
      ),
    );
    expect(maximoSimultaneo()).toBeLessThanOrEqual(2);
  });

  it("con la cola llena rechaza con ColaLlena SIN derivar nada", async () => {
    const semaforo = new SemaforoDeHashes({ enVuelo: 1, cola: 0, colaPorAsociacion: 0 });
    const { servicio, llamadas } = crear({ semaforo });
    const hash = await servicio.hashear(CLAVE, ASOCIACION);
    llamadas.length = 0;
    const resultados = await Promise.allSettled([
      servicio.verificar(CLAVE, hash, ASOCIACION),
      servicio.verificar(CLAVE, hash, ASOCIACION),
      servicio.verificar(CLAVE, hash, ASOCIACION),
    ]);
    const rechazadas = resultados.filter((r) => r.status === "rejected");
    expect(rechazadas.length).toBeGreaterThan(0);
    for (const r of rechazadas)
      expect((r as PromiseRejectedResult).reason).toBeInstanceOf(ColaLlena);
    // Solo derivó lo que ocupó plaza.
    expect(llamadas.length).toBe(resultados.length - rechazadas.length);
  });
});

describe("validarContrasena (CA-13)", () => {
  const CORREO = "ana@ejemplo.org";

  it("acepta una contraseña de 12 a 200 caracteres", () => {
    expect(validarContrasena("una-buena-clave", CORREO)).toBeNull();
    expect(validarContrasena("a".repeat(11) + "1", CORREO)).toBeNull();
    expect(validarContrasena("aB3".repeat(66) + "xx", CORREO)).toBeNull(); // 200
  });

  it("rechaza menos de 12 y más de 200 caracteres", () => {
    expect(validarContrasena("a".repeat(11), CORREO)).toBe("corta");
    expect(validarContrasena("", CORREO)).toBe("corta");
    expect(validarContrasena("a".repeat(201), CORREO)).toBe("larga");
  });

  it("cuenta caracteres, no bytes: un emoji es uno", () => {
    expect(validarContrasena("😀".repeat(12), CORREO)).toBeNull();
    expect(validarContrasena("😀".repeat(11), CORREO)).toBe("corta");
  });

  it("aplica NFKC antes de contar", () => {
    // Doce letras de ancho completo siguen siendo doce, pero el correo igual se detecta.
    expect(validarContrasena("ａｎａ＠ｅｊｅｍｐｌｏ．ｏｒｇ", CORREO)).toBe(
      "igual_al_correo",
    );
  });

  it("rechaza la contraseña igual al correo, sin distinguir mayúsculas", () => {
    expect(validarContrasena("ana@ejemplo.org", CORREO)).toBe("igual_al_correo");
    expect(validarContrasena("ANA@Ejemplo.ORG", CORREO)).toBe("igual_al_correo");
    expect(validarContrasena("  ana@ejemplo.org ", CORREO)).toBe("igual_al_correo");
  });

  it.each([
    "123456789012",
    "Password1234",
    "CONTRASENA123",
    "qwertyuiop12",
    "administrador",
  ])("rechaza la contraseña común %s", (clave) => {
    expect(validarContrasena(clave, CORREO)).toBe("comun");
  });
});
