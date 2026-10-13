#!/usr/bin/env node
/**
 * Abre una URL en Chrome sin ventana, guarda una captura y lista los errores
 * de consola.
 *
 * Usa Playwright (`playwright-core`) con el Chrome o el Edge que ya están
 * instalados en la máquina: `playwright-core` es solo la librería y NUNCA
 * descarga navegadores. Si no hay ninguno, falla con un mensaje claro; para
 * usar otro ejecutable, define `CHROME_PATH`.
 *
 * Hace falta porque `tsc`, `vitest` y `vite build` no ejecutan la página: un
 * error de consola o una pantalla en blanco solo se ven en un navegador real.
 *
 * Uso (con el servidor levantado, p. ej. `PORT=5001 npm run dev`):
 *   npm run check:browser
 *   npm run check:browser -- http://localhost:5001/blog --ancho=375
 *
 * Opciones: `--ancho=1280` · `--alto=800` · `--salida=ruta.png` · `--completa`
 * (captura de toda la página). Sin `--salida`, guarda en `capturas/` (ignorada
 * por git). Salida: 0 sin errores · 1 con errores de consola · 2 no se pudo
 * ejecutar.
 *
 * Las secciones usan animaciones de entrada: la captura espera un momento, pero
 * una captura completa puede mostrar en blanco lo que aún no entró en pantalla.
 */
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const RAIZ = resolve(import.meta.dirname, "..");
const URL_POR_DEFECTO = "http://localhost:5001/";
const LIMITE_MINIMO = 200;
const LIMITE_MAXIMO = 4000;

function enteroAcotado(nombre, valor) {
  const n = /^\d+$/.test(valor) ? Number(valor) : Number.NaN;
  if (!(n >= LIMITE_MINIMO && n <= LIMITE_MAXIMO)) {
    throw new Error(
      `--${nombre} debe ser un entero entre ${LIMITE_MINIMO} y ${LIMITE_MAXIMO}`,
    );
  }
  return n;
}

/** Argumentos de la línea de comandos → opciones. Lanza si algo no es válido. */
export function parsearArgumentos(argv) {
  const opciones = {
    url: URL_POR_DEFECTO,
    ancho: 1280,
    alto: 800,
    salida: undefined,
    completa: false,
  };
  let urlDada = false;

  for (const arg of argv) {
    if (!arg.startsWith("--")) {
      if (urlDada) throw new Error("Solo se admite una URL");
      opciones.url = arg;
      urlDada = true;
      continue;
    }
    const igual = arg.indexOf("=");
    const nombre = igual === -1 ? arg.slice(2) : arg.slice(2, igual);
    const valor = igual === -1 ? "" : arg.slice(igual + 1);
    if (nombre === "ancho" || nombre === "alto") {
      opciones[nombre] = enteroAcotado(nombre, valor);
    } else if (nombre === "salida" && valor) {
      opciones.salida = valor;
    } else if (nombre === "completa" && igual === -1) {
      opciones.completa = true;
    } else {
      throw new Error(`Opción desconocida o incompleta: ${arg}`);
    }
  }
  return opciones;
}

const slug = (texto) =>
  texto
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Ruta predecible de la captura: `capturas/<host>-<ruta>-<ancho>x<alto>.png`. */
export function nombreDeCaptura(url, ancho, alto) {
  const tamano = `${ancho}x${alto}`;
  let analizada;
  try {
    analizada = new URL(url);
  } catch {
    return `capturas/pagina-${tamano}.png`;
  }
  if (!analizada.host) return `capturas/pagina-${tamano}.png`;
  const ruta = slug(analizada.pathname) || "inicio";
  return `capturas/${slug(analizada.host)}-${ruta}-${tamano}.png`;
}

/** Texto para la terminal con los errores de consola encontrados. */
export function resumir(errores) {
  if (errores.length === 0) return "✓ Sin errores de consola.";
  const n = errores.length;
  const lineas = errores.map((e, i) => {
    const donde = e.ubicacion ? ` (${e.ubicacion})` : "";
    return `  ${i + 1}. [${e.tipo}] ${e.texto}${donde}`;
  });
  return [`✗ ${n} ${n === 1 ? "error" : "errores"} de consola:`, ...lineas].join("\n");
}

export function codigoDeSalida(errores) {
  return errores.length > 0 ? 1 : 0;
}

async function lanzarNavegador() {
  // Import dinámico: las funciones puras de arriba se prueban sin Playwright.
  const { chromium } = await import("playwright-core");
  const intentos = process.env.CHROME_PATH
    ? [{ executablePath: process.env.CHROME_PATH }]
    : [{ channel: "chrome" }, { channel: "msedge" }];
  for (const opciones of intentos) {
    try {
      return await chromium.launch({ headless: true, ...opciones });
    } catch {
      // Probar el siguiente: Chrome, y si no está, Edge.
    }
  }
  throw new Error(
    "No se encontró Chrome ni Edge instalados. Instala uno o define CHROME_PATH " +
      "con la ruta del ejecutable. Este script nunca descarga navegadores.",
  );
}

async function main() {
  const opciones = parsearArgumentos(process.argv.slice(2));
  const navegador = await lanzarNavegador();
  try {
    const contexto = await navegador.newContext({
      viewport: { width: opciones.ancho, height: opciones.alto },
    });
    const pagina = await contexto.newPage();
    const errores = [];

    pagina.on("console", (mensaje) => {
      if (mensaje.type() !== "error") return;
      const sitio = mensaje.location();
      errores.push({
        tipo: "console.error",
        texto: mensaje.text(),
        ubicacion: sitio.url ? `${sitio.url}:${sitio.lineNumber + 1}` : undefined,
      });
    });
    pagina.on("pageerror", (error) => {
      errores.push({ tipo: "excepción", texto: error.message });
    });
    pagina.on("requestfailed", (peticion) => {
      const motivo = peticion.failure()?.errorText ?? "sin detalle";
      errores.push({
        tipo: "petición fallida",
        texto: `${peticion.method()} ${peticion.url()} (${motivo})`,
      });
    });

    let respuesta;
    try {
      respuesta = await pagina.goto(opciones.url, {
        waitUntil: "networkidle",
        timeout: 30_000,
      });
    } catch (error) {
      throw new Error(
        `No se pudo abrir ${opciones.url}: ${String(error.message).split("\n")[0]}\n` +
          "¿Está el servidor levantado? Por ejemplo: PORT=5001 npm run dev",
        { cause: error },
      );
    }
    if (respuesta && respuesta.status() >= 400) {
      errores.push({ tipo: "http", texto: `La página respondió ${respuesta.status()}` });
    }
    await pagina.waitForTimeout(800); // animaciones de entrada

    const destino = resolve(
      RAIZ,
      opciones.salida ?? nombreDeCaptura(opciones.url, opciones.ancho, opciones.alto),
    );
    mkdirSync(dirname(destino), { recursive: true });
    await pagina.screenshot({ path: destino, fullPage: opciones.completa });

    console.log(`Página:  ${opciones.url} (HTTP ${respuesta?.status() ?? "?"})`);
    console.log(`Captura: ${destino}`);
    console.log(resumir(errores));
    process.exitCode = codigoDeSalida(errores);
  } finally {
    await navegador.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`✗ ${error.message}`);
    process.exitCode = 2;
  });
}
