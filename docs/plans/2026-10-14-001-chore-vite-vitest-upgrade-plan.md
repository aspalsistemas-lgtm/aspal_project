---
title: Subir vite y vitest para cerrar los avisos críticos de npm audit
type: chore
status: draft
date: 2026-10-14
origin: docs/sprints/deuda-tecnica.md (1.4) · ADR-0006 (SDD)
---

# chore: subir `vite` y `vitest` para cerrar los avisos críticos de `npm audit`

> Parte del punto 1.4 de la deuda. Sigue ADR-0006: decisiones y criterios de
> aceptación antes de tocar `package.json`. **No se cambia ninguna versión
> hasta cerrar las decisiones de la sección 3.**

## 1. Objetivo y alcance

Cerrar los avisos de `npm audit` de `vitest` (2 críticos: `vitest` y
`tinypool`) y de `vite` (alto: path traversal del servidor de desarrollo) **sin
cambiar el comportamiento del sitio**: el HTML prerenderizado, el servidor de
desarrollo, el prerender y la función de Vercel deben seguir igual.

**Fuera:** `tailwindcss` 3 → 4 (el resto de avisos de 1.4): es una migración de
estilos con su propio plan.

## 2. Hallazgo que fija el alcance (medido el 2026-10-14)

`vitest` no se puede subir solo:

| Paquete                | Hoy    | Objetivo | Requisito que lo ata                                               |
| ---------------------- | ------ | -------- | ------------------------------------------------------------------ |
| `vitest`               | 3.2.7  | 5.0.x    | peer `vite` `^6.4.0 \|\| ^7 \|\| ^8`; Node `^22.12.0`              |
| `@vitest/coverage-v8`  | 3.2.7  | 5.0.x    | peer `vitest` misma versión exacta                                 |
| `vite`                 | 5.4.21 | 7.x      | el aviso alcanza a `<=6.4.2`: hace falta 7 u 8                     |
| `@vitejs/plugin-react` | 4.7.0  | 5.x      | 4.7 admite hasta `vite` 7; la 5.2 admite 4–8 y pide Node `>=22.12` |

Node local 22.22 y `engines: 22.x` cumplen todos los requisitos.

`vite` es la herramienta que **construye el sitio**: `npm run build`, el
prerender por ruta (`vite build --ssr` + `scripts/prerender.mjs`) y el servidor
de desarrollo (`server/vite.ts` usa `createServer` en `middlewareMode` y
`createLogger`). Por eso el cambio no es «solo de tests».

## 3. Decisiones

### DV-1 · `vite` 7 o 8 — se recomienda **7**

`vite` 8 sustituye Rollup por Rolldown como empaquetador: cambia el motor que
genera el JavaScript de producción. `vite` 7 cierra el mismo aviso con Rollup,
como hoy. **Recomendación:** 7; el 8 se evalúa aparte cuando haga falta.

### DV-2 · Un salto de `vitest` 3 → 5 o pasando por 4 — se recomienda **directo**

La suite es pequeña (278 tests, entorno `node`, sin tests de componentes) y la
cobertura con umbral detecta regresiones. **Recomendación:** directo a 5; si
algo no cuadra, se baja a 4 (que también exige `vite` ≥ 6) y se documenta.

### DV-3 · Navegadores soportados — se recomienda **conservar los de hoy**

`vite.config.ts` no fija `build.target`, así que hereda el valor por defecto
de cada versión. Según la guía de Vite 7 (a confirmar al implementarlo), el
predeterminado pasa de `modules` (Chrome 87, Safari 14, Firefox 78, Edge 88) a
`baseline-widely-available` (Chrome 107, Safari 16, Firefox 104, Edge 107).
El público tiene sesgo de edad alto (`design.md`), con más probabilidad de
navegadores antiguos. **Recomendación:** fijar `build.target` al valor actual
para no dejar fuera a nadie sin decidirlo. Alternativa: aceptar el nuevo
predeterminado (algo menos de JavaScript generado).

## 4. Fases

Cada fase en su rama, en verde y fusionada antes de la siguiente.

| Fase | Qué hace                                                                                                                                                       |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V1   | `vite` 5 → 7 y `@vitejs/plugin-react` 4 → 5, con `build.target` según DV-3. Leer la guía de migración de Vite 6 y 7 antes de tocar nada y adaptar lo que pida. |
| V2   | `vitest` y `@vitest/coverage-v8` 3 → 5. Leer las guías de Vitest 4 y 5; adaptar `vitest.config.ts` (cobertura, umbrales) si hace falta.                        |
| V3   | `npm audit` final, deuda 1.4 actualizada y documentación (`CLAUDE.md` §2 Stack).                                                                               |

## 5. Criterios de aceptación

- **CA-1:** `npm audit` sin avisos de `vite`, `vitest`, `tinypool` ni
  `@vitest/*`.
- **CA-2:** `package.json` solo cambia esos cuatro paquetes (y lo que sus guías
  exijan, documentado).
- **CA-3:** HTML prerenderizado de las 13 páginas idéntico al de antes de la V1,
  con los hashes normalizados. El JavaScript generado puede cambiar.
- **CA-4:** el servidor de desarrollo (`npm run dev`) y el de producción
  (`npm start`) sirven el sitio; `npm run check:browser` en las 12 rutas, a
  1280 y 375 px, sin errores de consola en ambos.
- **CA-5:** los mismos 278 tests pasan y la cobertura no baja del umbral.
- **CA-6:** `check`, `lint`, `format:check` y `build` en verde, y la CI de
  GitHub en verde tras el push.
- **CA-7:** los navegadores soportados son los que decida DV-3.

## 6. Riesgos

| Riesgo                                                                         | Control                                                            |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Cambios de API de Vite rompen `server/vite.ts` o el prerender                  | Leer las guías antes; CA-3 y CA-4 lo detectan                      |
| El nuevo target deja fuera a navegadores antiguos sin decidirlo                | DV-3: fijarlo explícitamente                                       |
| Vitest cambia la configuración de cobertura y el umbral deja de medir lo mismo | Comparar el informe de cobertura antes y después (mismos archivos) |
| Vercel construye con otra versión de Node                                      | `engines: 22.x` y `.nvmrc`; Node 22 actual ya cumple `>=22.12`     |

## 7. Siguiente paso

Responder DV-1 a DV-3. Con eso se abre la V1.
