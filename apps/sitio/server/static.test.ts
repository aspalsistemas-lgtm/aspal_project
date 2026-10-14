import express from "express";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import type { Server } from "node:http";
import { connect, type AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CACHE_INMUTABLE, serveStatic } from "./static";

let servidor: Server;
let base: string;
let dist: string;

beforeAll(async () => {
  dist = mkdtempSync(join(tmpdir(), "aspal-dist-"));
  for (const [archivo, marca] of [
    ["index.html", "HOME"],
    ["blog.html", "BLOG"],
    ["spa.html", "SHELL"],
    ["404.html", "NO-ENCONTRADA"],
  ]) {
    writeFileSync(join(dist, archivo), `<html>${marca}</html>`);
  }
  mkdirSync(join(dist, "assets"));
  writeFileSync(join(dist, "assets", "app.js"), "console.log(1)");
  mkdirSync(join(dist, "fuentes", "montserrat-v31"), { recursive: true });
  writeFileSync(join(dist, "fuentes", "montserrat-v31", "latin.woff2"), "woff2");
  const app = express();
  serveStatic(app, dist);
  await new Promise<void>((listo) => {
    servidor = app.listen(0, listo);
  });
  base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
});

afterAll(() => {
  servidor.close();
  rmSync(dist, { recursive: true, force: true });
});

async function pedir(ruta: string) {
  const respuesta = await fetch(`${base}${ruta}`, { redirect: "manual" });
  return { estado: respuesta.status, cuerpo: await respuesta.text() };
}

/**
 * Petición con la ruta tal cual, por un socket crudo: `fetch` normaliza `\` a
 * `/` y no reproduce el ataque.
 */
function pedirCrudo(rutaLiteral: string) {
  return new Promise<{ estado: number; location: string }>((resolver, rechazar) => {
    const puerto = (servidor.address() as AddressInfo).port;
    const socket = connect(puerto, "127.0.0.1", () => {
      socket.write(
        `GET ${rutaLiteral} HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n`,
      );
    });
    let texto = "";
    socket.on("data", (trozo) => (texto += trozo.toString()));
    socket.on("error", rechazar);
    socket.on("close", () => {
      const estado = Number(/^HTTP\/1\.1 (\d+)/.exec(texto)?.[1]);
      const location = /^location: (.*)\r$/im.exec(texto)?.[1] ?? "";
      resolver({ estado, location });
    });
  });
}

describe("serveStatic", () => {
  it("sirve la home prerenderizada", async () => {
    expect(await pedir("/")).toEqual({ estado: 200, cuerpo: "<html>HOME</html>" });
  });

  it("sirve cada ruta estática sin extensión", async () => {
    expect(await pedir("/blog")).toEqual({ estado: 200, cuerpo: "<html>BLOG</html>" });
  });

  it("redirige la barra final a la ruta sin barra, conservando la consulta", async () => {
    // Si no, /blog/ recibiría el 404.html pero wouter pintaría el blog en el
    // cliente: código y contenido se contradirían.
    const respuesta = await fetch(`${base}/blog/?origen=correo`, { redirect: "manual" });
    expect(respuesta.status).toBe(308);
    expect(respuesta.headers.get("location")).toBe("/blog?origen=correo");
  });

  it("no redirige fuera del dominio con barras iniciales (`//evil.com/`)", async () => {
    // `//evil.com` en Location es relativa al protocolo: sale del sitio.
    const respuesta = await fetch(`${base}//evil.com/`, { redirect: "manual" });
    expect(respuesta.status).toBe(308);
    const destino = respuesta.headers.get("location") ?? "";
    expect(destino.startsWith("//")).toBe(false);
    expect(destino).toBe("/evil.com");
  });

  it("redirige `//` a la raíz, sin Location vacío", async () => {
    const respuesta = await fetch(`${base}//`, { redirect: "manual" });
    expect(respuesta.status).toBe(308);
    expect(respuesta.headers.get("location")).toBe("/");
  });

  it("conserva las mayúsculas al quitar la barra final", async () => {
    const respuesta = await fetch(`${base}/Blog/`, { redirect: "manual" });
    expect(respuesta.status).toBe(308);
    expect(respuesta.headers.get("location")).toBe("/Blog");
  });

  it.each([String.raw`/\evil.com/`, String.raw`//\evil.com/`, String.raw`/\/evil.com/`])(
    "no redirige fuera del dominio con barras invertidas (%s)",
    async (ruta) => {
      // Los navegadores tratan `/\` como `//`.
      const { estado, location } = await pedirCrudo(ruta);
      expect(estado).toBe(308);
      expect(location.startsWith("//")).toBe(false);
      expect(location.startsWith("/\\")).toBe(false);
      expect(location).toBe("/evil.com");
    },
  );

  it("sirve el shell a las rutas dinámicas, con 200", async () => {
    // Recargar un artículo no puede dar 404: el cliente lo carga desde la API.
    expect(await pedir("/blog/un-articulo")).toEqual({
      estado: 200,
      cuerpo: "<html>SHELL</html>",
    });
  });

  it("responde 404 de verdad, con la página 404, a lo que no existe", async () => {
    expect(await pedir("/no-existe")).toEqual({
      estado: 404,
      cuerpo: "<html>NO-ENCONTRADA</html>",
    });
    expect((await pedir("/blog/a/b")).estado).toBe(404);
  });

  it("no entra en bucle de redirecciones con los directorios del build", async () => {
    // express.static redirigiría /assets a /assets/ y la barra final volvería
    // a /assets, sin fin. Un directorio no es una página: 404.
    expect((await pedir("/assets")).estado).toBe(404);
    expect((await pedir("/assets/app.js")).estado).toBe(200);
  });

  it("cachea un año los archivos con nombre versionado, y no las páginas", async () => {
    // /assets lleva hash en el nombre y /fuentes la versión en la carpeta: si
    // cambian, cambia la URL. Las páginas tienen que revalidarse siempre.
    for (const ruta of ["/assets/app.js", "/fuentes/montserrat-v31/latin.woff2"]) {
      const respuesta = await fetch(`${base}${ruta}`);
      expect(respuesta.headers.get("cache-control"), ruta).toBe(CACHE_INMUTABLE);
    }
    for (const ruta of ["/", "/blog"]) {
      const respuesta = await fetch(`${base}${ruta}`);
      expect(respuesta.headers.get("cache-control"), ruta).not.toContain("immutable");
    }
  });
});
