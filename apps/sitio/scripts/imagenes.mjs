#!/usr/bin/env node
/**
 * Conversión única de las imágenes en uso a WebP (RF-15). Los originales .png
 * ya no existen: viven en el historial de git, commit anterior a d94cccc. Cada
 * origen ausente se salta con un aviso. Escribe el .webp
 * junto al original e imprime tamaño y dimensiones, que son los `width` y
 * `height` que llevan los <img>. Los originales se borran a mano después, con
 * `git rm`: git los conserva si hay que regenerar.
 *
 * Uso: node scripts/imagenes.mjs
 */
import sharp from "sharp";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const ASSETS = resolve(import.meta.dirname, "..", "client", "src", "assets");

/** [archivo, ancho máximo]: el doble del ancho al que se pinta, para pantallas 2x. */
const TRABAJOS = [
  ["generated_images/hero_dashboard_with_yellow_background.png", 1400],
  ["recurso-8-comunidad.png", 960],
  ["recurso-3-blog.png", 960],
  ["recurso-40-certificaciones.png", 960],
  ["recurso-27-marketing.png", 960],
  ["recurso-26-bolsa-trabajo.png", 960],
  ["recurso-13-membresias.png", 960],
  ["Aspal-Icono_1763675356866.png", 512],
];

for (const [archivo, ancho] of TRABAJOS) {
  const origen = join(ASSETS, archivo);
  if (!existsSync(origen)) {
    console.warn(`(salta) no existe ${archivo}`);
    continue;
  }
  const destino = origen.replace(/\.png$/, ".webp");
  const info = await sharp(origen)
    .resize({ width: ancho, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(destino);
  console.log(
    `${archivo} → ${info.width}×${info.height}, ${Math.round(info.size / 1024)} KB`,
  );
}
