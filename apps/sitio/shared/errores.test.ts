import express from "express";
import { readFileSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { resolve } from "node:path";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { ErrorDeAplicacion, manejadorDeErrores } from "./errores";

let servidor: Server;
let base: string;

beforeAll(async () => {
  const app = express();
  app.get("/con-status", () => {
    throw Object.assign(new Error("No existe"), { status: 404 });
  });
  app.get("/con-status-code", () => {
    throw Object.assign(new Error("Soy una tetera"), { statusCode: 418 });
  });
  app.get("/generico", () => {
    throw new Error("Algo se rompió");
  });
  app.get("/sin-mensaje", () => {
    // Un valor que no es Error: no debe reventar el manejador.
    throw "cadena suelta";
  });
  app.get("/app-con-campo", () => {
    throw new ErrorDeAplicacion("VALIDACION", 400, "Correo no válido", "correo");
  });
  app.get("/app-sin-campo", () => {
    throw new ErrorDeAplicacion("NO_ENCONTRADO", 404, "No existe");
  });
  app.get("/app-status-invalido", () => {
    throw new ErrorDeAplicacion("RARO", 200, "Status fuera de rango");
  });
  app.use(manejadorDeErrores);
  await new Promise<void>((listo) => {
    servidor = app.listen(0, listo);
  });
  base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
});

afterAll(() => servidor.close());

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function pedir(ruta: string) {
  const r = await fetch(`${base}${ruta}`);
  return { estado: r.status, cuerpo: await r.json() };
}

describe("manejadorDeErrores", () => {
  it("usa `status` del error y responde { message }", async () => {
    expect(await pedir("/con-status")).toEqual({
      estado: 404,
      cuerpo: { message: "No existe" },
    });
  });

  it("acepta también `statusCode`", async () => {
    expect(await pedir("/con-status-code")).toEqual({
      estado: 418,
      cuerpo: { message: "Soy una tetera" },
    });
  });

  it("un error sin status es 500", async () => {
    expect(await pedir("/generico")).toEqual({
      estado: 500,
      cuerpo: { message: "Algo se rompió" },
    });
  });

  it("un valor que no es Error responde 500 con mensaje por defecto", async () => {
    expect(await pedir("/sin-mensaje")).toEqual({
      estado: 500,
      cuerpo: { message: "Internal Server Error" },
    });
  });

  it("registra el error en consola en vez de relanzarlo, y no expone la pila", async () => {
    const { cuerpo } = await pedir("/generico");
    expect(console.error).toHaveBeenCalledTimes(1);
    const registro = vi.mocked(console.error).mock.calls[0].map(String).join(" ");
    expect(registro).toContain("GET /generico");
    expect(registro).toContain("Algo se rompió");
    expect(JSON.stringify(cuerpo)).not.toContain("at ");
  });
});

describe("ErrorDeAplicacion", () => {
  it("responde el sobre único con `campo` cuando existe", async () => {
    expect(await pedir("/app-con-campo")).toEqual({
      estado: 400,
      cuerpo: {
        success: false,
        error: {
          codigo: "VALIDACION",
          mensaje: "Correo no válido",
          campo: "correo",
        },
      },
    });
  });

  it("omite `campo` cuando no se indica", async () => {
    const { estado, cuerpo } = await pedir("/app-sin-campo");
    expect(estado).toBe(404);
    expect(cuerpo).toEqual({
      success: false,
      error: { codigo: "NO_ENCONTRADO", mensaje: "No existe" },
    });
    expect(cuerpo.error).not.toHaveProperty("campo");
  });

  it("un status fuera de 400–599 se normaliza a 500", async () => {
    expect((await pedir("/app-status-invalido")).estado).toBe(500);
  });

  it("también se registra en consola", async () => {
    await pedir("/app-con-campo");
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it("no altera el contrato `{ message }` de los errores comunes", async () => {
    expect((await pedir("/generico")).cuerpo).toEqual({
      message: "Algo se rompió",
    });
  });
});

describe("montaje", () => {
  it("lo usan tanto el servidor como la función de Vercel", () => {
    // Antes cada uno tenía su copia y divergían (una relanzaba, la otra no).
    const raiz = resolve(import.meta.dirname, "..");
    for (const archivo of ["server/index.ts", "api/index.ts"]) {
      const codigo = readFileSync(resolve(raiz, archivo), "utf8");
      expect(codigo, archivo).toContain("app.use(manejadorDeErrores)");
    }
  });
});
