#!/usr/bin/env node
/**
 * Verifica que todo import `@assets/...` apunte a un archivo que existe.
 *
 * Hace falta porque ni `tsc` ni `vite build` lo detectan: sin una entrada en
 * `paths` del tsconfig, TypeScript resuelve estos imports con la declaración
 * comodín `declare module '*.png'` de vite/client, que acepta cualquier ruta
 * termine donde termine. Un asset borrado o mal escrito pasa las dos puertas en
 * verde y solo se manifiesta como imagen rota en el navegador.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const SRC = join(ROOT, "client", "src");
const ASSETS = join(SRC, "assets");

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const sources = walk(SRC).filter((f) => /\.(ts|tsx)$/.test(f));
const missing = [];
const referencias = new Set();

for (const file of sources) {
  const content = readFileSync(file, "utf8");
  for (const match of content.matchAll(/["']@assets\/([^"']+)["']/g)) {
    referencias.add(match[1]);
    const asset = join(ASSETS, match[1]);
    try {
      statSync(asset);
    } catch {
      missing.push({ file: relative(ROOT, file), asset: match[1] });
    }
  }
}

// Huérfanos: archivos que ningún import usa. Pesan en el repo y confunden
// sobre qué imagen es la buena (CLAUDE.md: los nombres con timestamp son
// heredados).
const huerfanos = walk(ASSETS)
  .map((f) => relative(ASSETS, f).split(sep).join("/"))
  .filter((asset) => !referencias.has(asset));

// Límite de peso (RF-15): ninguna imagen que llegue al navegador por encima de
// 250 KB. Las de 1 MB eran la causa del Lighthouse de 68.
const LIMITE = 250 * 1024;
const pesados = [...referencias]
  .filter((asset) => /\.(png|jpe?g|webp|avif|gif)$/i.test(asset))
  .map((asset) => ({
    asset,
    bytes: statSync(join(ASSETS, asset), { throwIfNoEntry: false })?.size ?? 0,
  }))
  .filter(({ bytes }) => bytes > LIMITE);

if (huerfanos.length > 0) {
  console.error(`✗ ${huerfanos.length} asset(s) sin usar en client/src/assets:\n`);
  for (const asset of huerfanos) console.error(`  ${asset}`);
}
if (pesados.length > 0) {
  console.error(`✗ ${pesados.length} imagen(es) por encima de ${LIMITE / 1024} KB:\n`);
  for (const { asset, bytes } of pesados)
    console.error(`  ${asset} (${Math.round(bytes / 1024)} KB)`);
}
if (missing.length > 0) {
  console.error(`✗ ${missing.length} asset(s) referenciado(s) que no existe(n):\n`);
  for (const { file, asset } of missing) {
    console.error(`  ${file}`);
    console.error(`    @assets/${asset}`);
  }
}

if (missing.length > 0 || huerfanos.length > 0 || pesados.length > 0) process.exit(1);

console.log(
  "✓ assets: referencias resueltas, sin huérfanos y ninguna imagen por encima de 250 KB",
);
