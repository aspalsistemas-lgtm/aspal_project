/**
 * `conSesion.alConfirmar` (plan del corte 3, CA-22): lo que depende de que la transacción
 * se confirme —enviar un correo, por ejemplo— no ocurre si se revierte, y ocurre después
 * de confirmarse. Se prueba con una ruta autenticada de prueba sobre PostgreSQL real.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { construirApp } from "../app.js";
import { conAsociacion, resolverAsociacion } from "../base-de-datos.js";
import { dependenciasDePrueba } from "../pruebas/dependencias.js";
import { crearEntornoHttp, type EntornoHttp } from "../pruebas/http-acceso.js";
import { rutaAutenticada } from "./con-sesion.js";
import { conflicto } from "./errores.js";

let e: EntornoHttp;
const eventos: string[] = [];

beforeAll(async () => {
  e = await crearEntornoHttp();
  await e.crearAsociacion("alconfirmar");
});

afterAll(async () => {
  await e.cerrar();
});

function appDePrueba() {
  const dependencias = dependenciasDePrueba({
    puertoPublico: 5010,
    resolverAsociacion: (subdominio) => resolverAsociacion(e.pool, subdominio),
    enAsociacion: async (id, fn) => {
      const resultado = await conAsociacion(e.pool, id, fn);
      eventos.push("commit");
      return resultado;
    },
  });
  const app = construirApp(dependencias);
  rutaAutenticada(
    app,
    dependencias,
    { metodo: "POST", url: "/prueba/confirmar" },
    async (contexto, peticion) => {
      const { falla } = (peticion.body ?? {}) as { falla?: boolean };
      await contexto.base.execute(sql`SELECT 1`);
      contexto.alConfirmar(() => eventos.push("accion"));
      if (falla) throw conflicto("PRUEBA", "revierte");
      return { success: true, data: {} };
    },
  );
  return app;
}

describe("alConfirmar", () => {
  it("ejecuta la acción después del commit y una sola vez", async () => {
    const usuario = await e.crearUsuario(
      (
        await e.admin.query(
          "SELECT id FROM public.asociacion WHERE subdominio = 'alconfirmar'",
        )
      ).rows[0].id,
    );
    const token = await e.entrar("alconfirmar", usuario.correo);
    const app = appDePrueba();
    try {
      eventos.length = 0;
      const r = await app.inject({
        method: "POST",
        url: "/prueba/confirmar",
        remoteAddress: e.ip(),
        headers: {
          host: "alconfirmar.localhost:5010",
          origin: "http://alconfirmar.localhost:5010",
          cookie: `aspal_sesion=${token}`,
        },
        payload: {},
      });
      expect(r.statusCode).toBe(200);
      expect(eventos).toEqual(["commit", "accion"]);

      // Si la transacción se revierte, la acción no ocurre.
      eventos.length = 0;
      const revertida = await app.inject({
        method: "POST",
        url: "/prueba/confirmar",
        remoteAddress: e.ip(),
        headers: {
          host: "alconfirmar.localhost:5010",
          origin: "http://alconfirmar.localhost:5010",
          cookie: `aspal_sesion=${token}`,
        },
        payload: { falla: true },
      });
      expect(revertida.statusCode).toBe(409);
      expect(eventos).not.toContain("accion");
    } finally {
      await app.close();
    }
  });
});
