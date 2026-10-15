import { Writable } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { construirApp, type Dependencias } from "../app.js";
import { dependenciasDePrueba } from "../pruebas/dependencias.js";

const IDS: Record<string, string> = {
  aspal: "0b9e7c1e-1111-4111-8111-111111111111",
  prueba: "0b9e7c1e-2222-4222-8222-222222222222",
};
const HOST = "aspal.localhost:5010";
const ORIGEN = "http://aspal.localhost:5010";
const JSON_HEADERS = { "content-type": "application/json" };

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

function construir(
  parciales: Partial<Dependencias> = {},
  opciones?: Parameters<typeof construirApp>[1],
) {
  const resolverAsociacion = vi.fn(async (subdominio: string) =>
    IDS[subdominio] ? { id: IDS[subdominio]!, subdominio } : null,
  );
  app = construirApp(
    dependenciasDePrueba({
      esquemaPublico: "http",
      puertoPublico: 5010,
      resolverAsociacion,
      ...parciales,
    }),
    opciones,
  );
  const manejador = async (peticion: { asociacion: { subdominio: string } | null }) => ({
    success: true,
    data: { subdominio: peticion.asociacion?.subdominio ?? null },
  });
  app.get("/pub", { config: { categoria: "publica" } }, manejador);
  app.post("/pub", { config: { categoria: "publica" } }, manejador);
  app.put("/aut", { config: { categoria: "autenticada" } }, manejador);
  app.delete("/aut", { config: { categoria: "autenticada" } }, manejador);
  return { app, resolverAsociacion };
}

describe("categorías de ruta (CA-16)", () => {
  it("una ruta que no declara categoría no se registra", () => {
    const { app } = construir();
    expect(() => app.get("/sin-categoria", async () => ({}))).toThrow(/categor/i);
    expect(() => app.post("/otra", { config: {} }, async () => ({}))).toThrow(/categor/i);
  });

  it("rechaza una categoría que no existe", () => {
    const { app } = construir();
    expect(() =>
      // @ts-expect-error categoría inventada a propósito
      app.get("/rara", { config: { categoria: "secreta" } }, async () => ({})),
    ).toThrow(/categor/i);
  });

  it("deja registro de todas las rutas con su categoría", () => {
    const { app } = construir();
    const registro = app.rutasRegistradas.map((r) => `${r.categoria} ${r.url}`);
    expect(registro).toContain("global /health");
    expect(registro).toContain("publica /asociaciones/actual");
    expect(registro).toContain("publica /pub");
    expect(registro).toContain("autenticada /aut");
  });

  it("toda ruta registrada por la aplicación declara una categoría válida", () => {
    const { app } = construir();
    for (const ruta of app.rutasRegistradas) {
      expect(["global", "publica", "autenticada"], ruta.url).toContain(ruta.categoria);
    }
  });
});

describe("resolución de la asociación para las rutas no globales", () => {
  it("responde 404 si el Host no es de ninguna asociación, sin consultar la base", async () => {
    const { app, resolverAsociacion } = construir();
    for (const host of [
      "localhost",
      "www.localhost",
      "a.b.localhost",
      "evillocalhost",
      "",
    ]) {
      const respuesta = await app.inject({
        method: "GET",
        url: "/pub",
        headers: { host },
      });
      expect(respuesta.statusCode, host).toBe(404);
      expect(respuesta.json().error.codigo).toBe("RECURSO_NO_ENCONTRADO");
    }
    expect(resolverAsociacion).not.toHaveBeenCalled();
  });

  it("responde 404 si el subdominio tiene forma válida pero no existe", async () => {
    const { app, resolverAsociacion } = construir();
    const respuesta = await app.inject({
      method: "GET",
      url: "/pub",
      headers: { host: "nada.localhost:5010" },
    });
    expect(respuesta.statusCode).toBe(404);
    expect(resolverAsociacion).toHaveBeenCalledWith("nada");
  });

  it("deja la asociación resuelta disponible para el manejador", async () => {
    const { app } = construir();
    const respuesta = await app.inject({
      method: "GET",
      url: "/pub",
      headers: { host: HOST },
    });
    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json().data.subdominio).toBe("aspal");
  });

  it("las rutas globales no resuelven ninguna asociación", async () => {
    const { app, resolverAsociacion } = construir();
    const respuesta = await app.inject({
      method: "GET",
      url: "/health",
      headers: { host: HOST },
    });
    expect(respuesta.statusCode).toBe(200);
    expect(resolverAsociacion).not.toHaveBeenCalled();
  });
});

describe("peticiones con efecto: Origin y tipo de contenido (CA-9)", () => {
  const casos: [string, Record<string, string>, number][] = [
    ["Origin exacto", { origin: ORIGEN }, 200],
    ["sin Origin", {}, 403],
    ["Origin de un subdominio hermano", { origin: "http://prueba.localhost:5010" }, 403],
    ["Origin sin el puerto", { origin: "http://aspal.localhost" }, 403],
    ["Origin con otro puerto", { origin: "http://aspal.localhost:5011" }, 403],
    ["Origin con otro esquema", { origin: "https://aspal.localhost:5010" }, 403],
    ["Origin «null»", { origin: "null" }, 403],
    ["Origin con ruta final", { origin: `${ORIGEN}/` }, 403],
    ["Origin de otro dominio", { origin: "http://evil.example.org" }, 403],
    [
      "Origin con el dominio base como sufijo falso",
      { origin: "http://aspal.localhost.evil.com:5010" },
      403,
    ],
  ];

  it.each(casos)("POST con %s → %i", async (_nombre, cabeceras, estado) => {
    const { app } = construir();
    const respuesta = await app.inject({
      method: "POST",
      url: "/pub",
      headers: { host: HOST, ...JSON_HEADERS, ...cabeceras },
      payload: {},
    });
    expect(respuesta.statusCode).toBe(estado);
    if (estado === 403) expect(respuesta.json().error.codigo).toBe("ORIGEN_NO_PERMITIDO");
  });

  it("el Origin se compara con la asociación del Host, no con cualquier asociación", async () => {
    const { app } = construir();
    const respuesta = await app.inject({
      method: "POST",
      url: "/pub",
      headers: { host: "prueba.localhost:5010", ...JSON_HEADERS, origin: ORIGEN },
      payload: {},
    });
    expect(respuesta.statusCode).toBe(403);
  });

  it.each([
    ["same-origin", 200],
    ["same-site", 403],
    ["cross-site", 403],
    ["none", 403],
  ])("Sec-Fetch-Site %s → %i", async (valor, estado) => {
    const { app } = construir();
    const respuesta = await app.inject({
      method: "POST",
      url: "/pub",
      headers: { host: HOST, ...JSON_HEADERS, origin: ORIGEN, "sec-fetch-site": valor },
      payload: {},
    });
    expect(respuesta.statusCode).toBe(estado);
  });

  it("sin Sec-Fetch-Site (clientes que no lo envían) basta el Origin", async () => {
    const { app } = construir();
    const respuesta = await app.inject({
      method: "POST",
      url: "/pub",
      headers: { host: HOST, ...JSON_HEADERS, origin: ORIGEN },
      payload: {},
    });
    expect(respuesta.statusCode).toBe(200);
  });

  it.each(["text/plain", "application/x-www-form-urlencoded", "multipart/form-data"])(
    "POST, PUT y PATCH con %s → 415 TIPO_NO_ADMITIDO",
    async (tipo) => {
      const { app } = construir();
      const respuesta = await app.inject({
        method: "PUT",
        url: "/aut",
        headers: { host: HOST, "content-type": tipo, origin: ORIGEN },
        payload: "x=1",
      });
      expect(respuesta.statusCode).toBe(415);
      expect(respuesta.json().error.codigo).toBe("TIPO_NO_ADMITIDO");
    },
  );

  it("acepta application/json con charset", async () => {
    const { app } = construir();
    const respuesta = await app.inject({
      method: "POST",
      url: "/pub",
      headers: {
        host: HOST,
        "content-type": "application/json; charset=utf-8",
        origin: ORIGEN,
      },
      payload: {},
    });
    expect(respuesta.statusCode).toBe(200);
  });

  it("POST sin tipo de contenido → 415", async () => {
    const { app } = construir();
    const respuesta = await app.inject({
      method: "POST",
      url: "/pub",
      headers: { host: HOST, origin: ORIGEN },
    });
    expect(respuesta.statusCode).toBe(415);
  });

  it("DELETE exige Origin, pero no tipo de contenido (no lleva cuerpo)", async () => {
    const { app } = construir();
    const sinOrigen = await app.inject({
      method: "DELETE",
      url: "/aut",
      headers: { host: HOST },
    });
    expect(sinOrigen.statusCode).toBe(403);
    const conOrigen = await app.inject({
      method: "DELETE",
      url: "/aut",
      headers: { host: HOST, origin: ORIGEN },
    });
    expect(conOrigen.statusCode).toBe(200);
  });

  it("GET no exige Origin: no tiene efecto", async () => {
    const { app } = construir();
    const respuesta = await app.inject({
      method: "GET",
      url: "/pub",
      headers: { host: HOST },
    });
    expect(respuesta.statusCode).toBe(200);
  });

  it("en producción el Origin esperado es https sin puerto", async () => {
    const { app } = construir({ esquemaPublico: "https", puertoPublico: undefined });
    const bien = await app.inject({
      method: "POST",
      url: "/pub",
      headers: {
        host: "aspal.localhost",
        ...JSON_HEADERS,
        origin: "https://aspal.localhost",
      },
      payload: {},
    });
    expect(bien.statusCode).toBe(200);
    const mal = await app.inject({
      method: "POST",
      url: "/pub",
      headers: {
        host: "aspal.localhost",
        ...JSON_HEADERS,
        origin: "http://aspal.localhost",
      },
      payload: {},
    });
    expect(mal.statusCode).toBe(403);
  });

  it("las peticiones rechazadas por Origin no consultan la base", async () => {
    const { app, resolverAsociacion } = construir();
    await app.inject({
      method: "POST",
      url: "/pub",
      headers: { host: HOST, ...JSON_HEADERS, origin: "http://evil.example.org" },
      payload: {},
    });
    expect(resolverAsociacion).not.toHaveBeenCalled();
  });
});

describe("límite grueso por origen (CA-11 y CA-12)", () => {
  const limite = { publica: 3, autenticada: 5, ventanaMs: 60_000 };

  async function pedir(app: FastifyInstance, remoteAddress: string, cabeceras = {}) {
    return app.inject({
      method: "GET",
      url: "/pub",
      remoteAddress,
      headers: { host: HOST, ...cabeceras },
    });
  }

  it("cuenta cada petición de un origen y responde 429 con Retry-After", async () => {
    const { app } = construir({ limiteGrueso: limite });
    const estados = [];
    for (let i = 0; i < 5; i++)
      estados.push((await pedir(app, "203.0.113.7")).statusCode);
    expect(estados).toEqual([200, 200, 200, 429, 429]);
    const bloqueada = await pedir(app, "203.0.113.7");
    expect(bloqueada.json().error.codigo).toBe("DEMASIADOS_INTENTOS");
    expect(Number(bloqueada.headers["retry-after"])).toBeGreaterThan(0);
  });

  it("otro origen no se ve afectado", async () => {
    const { app } = construir({ limiteGrueso: limite });
    for (let i = 0; i < 5; i++) await pedir(app, "203.0.113.7");
    expect((await pedir(app, "203.0.113.8")).statusCode).toBe(200);
  });

  it("actúa antes de resolver la asociación: no cuesta una consulta", async () => {
    const { app, resolverAsociacion } = construir({ limiteGrueso: limite });
    for (let i = 0; i < 10; i++) await pedir(app, "203.0.113.7");
    expect(resolverAsociacion).toHaveBeenCalledTimes(3);
  });

  it("las rutas autenticadas tienen su propio cupo", async () => {
    const { app } = construir({ limiteGrueso: limite });
    for (let i = 0; i < 4; i++) await pedir(app, "203.0.113.7");
    const respuesta = await app.inject({
      method: "DELETE",
      url: "/aut",
      remoteAddress: "203.0.113.7",
      headers: { host: HOST, origin: ORIGEN },
    });
    expect(respuesta.statusCode).toBe(200);
  });

  it("IPv6: rotar la parte baja de la dirección no esquiva el límite (/64)", async () => {
    const { app } = construir({ limiteGrueso: limite });
    const estados = [];
    for (let i = 1; i <= 5; i++) {
      estados.push((await pedir(app, `2001:db8:abcd:12::${i}`)).statusCode);
    }
    expect(estados).toEqual([200, 200, 200, 429, 429]);
  });

  describe("X-Forwarded-For", () => {
    it("con 0 saltos de confianza se ignora: falsificarlo no esquiva el límite", async () => {
      const { app } = construir({ limiteGrueso: limite, trustProxy: 0 });
      const estados = [];
      for (let i = 0; i < 5; i++) {
        estados.push(
          (await pedir(app, "203.0.113.7", { "x-forwarded-for": `198.51.100.${i}` }))
            .statusCode,
        );
      }
      expect(estados).toEqual([200, 200, 200, 429, 429]);
    });

    it("con el balanceador declarado se usa la IP del cliente que reenvía", async () => {
      const { app } = construir({ limiteGrueso: limite, trustProxy: ["10.0.0.0/8"] });
      // Todas llegan por el mismo balanceador (10.0.0.1), pero de clientes distintos.
      const distintos = [];
      for (let i = 0; i < 5; i++) {
        distintos.push(
          (await pedir(app, "10.0.0.1", { "x-forwarded-for": `198.51.100.${i}` }))
            .statusCode,
        );
      }
      expect(distintos).toEqual([200, 200, 200, 200, 200]);
      // Y un mismo cliente repetido sí se limita.
      const repetidos = [];
      for (let i = 0; i < 5; i++) {
        repetidos.push(
          (await pedir(app, "10.0.0.1", { "x-forwarded-for": "198.51.100.99" }))
            .statusCode,
        );
      }
      expect(repetidos).toEqual([200, 200, 200, 429, 429]);
    });

    it("quien llega directo, fuera del balanceador, no puede falsificarla", async () => {
      const { app } = construir({ limiteGrueso: limite, trustProxy: ["10.0.0.0/8"] });
      const estados = [];
      for (let i = 0; i < 5; i++) {
        estados.push(
          // 203.0.113.7 no es el balanceador: su X-Forwarded-For no cuenta.
          (await pedir(app, "203.0.113.7", { "x-forwarded-for": `198.51.100.${i}` }))
            .statusCode,
        );
      }
      expect(estados).toEqual([200, 200, 200, 429, 429]);
    });
  });
});

describe("cabeceras de caché en todas las respuestas (CA-17)", () => {
  const ESPERADO = "private, no-store";

  it.each([
    ["200 de una ruta pública", { method: "GET", url: "/pub", headers: { host: HOST } }],
    [
      "404 por un Host desconocido",
      { method: "GET", url: "/pub", headers: { host: "localhost" } },
    ],
    [
      "404 de una ruta inexistente",
      { method: "GET", url: "/no-existe", headers: { host: HOST } },
    ],
    [
      "403 por Origin",
      { method: "POST", url: "/pub", headers: { host: HOST, ...JSON_HEADERS } },
    ],
    [
      "415 por tipo de contenido",
      { method: "POST", url: "/pub", headers: { host: HOST, origin: ORIGEN } },
    ],
  ] as const)("%s lleva no-store y Vary", async (_nombre, peticion) => {
    const { app } = construir();
    const respuesta = await app.inject({ ...peticion, payload: undefined });
    expect(respuesta.headers["cache-control"]).toBe(ESPERADO);
    expect(String(respuesta.headers.vary)).toMatch(/Host/i);
    expect(String(respuesta.headers.vary)).toMatch(/Cookie/i);
  });

  it("el 429 también lleva no-store", async () => {
    const { app } = construir({
      limiteGrueso: { publica: 1, autenticada: 1, ventanaMs: 60_000 },
    });
    await app.inject({ method: "GET", url: "/pub", headers: { host: HOST } });
    const respuesta = await app.inject({
      method: "GET",
      url: "/pub",
      headers: { host: HOST },
    });
    expect(respuesta.statusCode).toBe(429);
    expect(respuesta.headers["cache-control"]).toBe(ESPERADO);
  });

  it("/health queda fuera: lo consultan los balanceadores", async () => {
    const { app } = construir();
    const respuesta = await app.inject({ method: "GET", url: "/health" });
    expect(respuesta.headers["cache-control"]).not.toBe(ESPERADO);
  });
});

describe("logs sin la query de la URL (CA-30)", () => {
  it("el log de la petición no contiene ni el token ni nada de la query", async () => {
    const lineas: string[] = [];
    const flujo = new Writable({
      write(trozo, _codificacion, listo) {
        lineas.push(String(trozo));
        listo();
      },
    });
    const aplicacion = construir({}, { logger: { stream: flujo } }).app;
    await aplicacion.inject({
      method: "GET",
      url: "/pub?token=SECRETO-DE-UN-SOLO-USO&correo=ana@ejemplo.org",
      headers: { host: HOST },
    });
    await aplicacion.close();
    const registro = lineas.join("");
    expect(registro).toContain("/pub");
    expect(registro).not.toContain("SECRETO-DE-UN-SOLO-USO");
    expect(registro).not.toContain("ana@ejemplo.org");
    expect(registro).not.toContain("token=");
  });
});
