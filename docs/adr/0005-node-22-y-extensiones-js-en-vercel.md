# ADR-0005: Node fijado a 22.x y extensiones `.js` en los imports de la función de Vercel

- **Fecha:** 2026-10-01
- **Estado:** Aceptada
- **Alcance:** `package.json` (`engines`), `.nvmrc`, `api/`, `shared/`

## Contexto

`engines.node` era `>=20`. Vercel desactivó Node 20 el 1 de octubre de 2026 y,
con un rango abierto, el deploy cambiaba de versión de runtime por su cuenta.
Además, la función serverless `api/index.ts` no se empaqueta: Vercel transpila
archivo a archivo y Node ESM exige la extensión en los imports relativos. Los
imports sin extensión (`from "./types"`) funcionaban en desarrollo (tsx, Vite y
esbuild los resuelven) y caían en producción con `ERR_MODULE_NOT_FOUND`.

## Decisión

`engines.node` se fija a `22.x` y `.nvmrc` a `22`; CI usa `.nvmrc`. Todos los
imports relativos de `shared/` y `api/` llevan extensión `.js`
(`from "./types.js"`), que tsc, Vite, tsx y esbuild resuelven a `.ts` sin
problema. `server/` y `client/` se empaquetan y no la necesitan.

## Alternativas consideradas

| Alternativa                                    | Por qué se descartó                                                     |
| ---------------------------------------------- | ----------------------------------------------------------------------- |
| Dejar `>=20` y confiar en el default           | El runtime de producción cambiaba sin un commit que lo explicara        |
| Empaquetar `api/` con esbuild antes del deploy | Un paso más en el build de Vercel para evitar escribir `.js` en imports |
| `moduleResolution: node16` en tsconfig         | Obligaría a `.js` también en `client/` y `server/`, donde no hace falta |

## Consecuencias

**Positivas**

- El runtime de producción es explícito y coincide con el local y con CI.
- La función de Vercel arranca con los mismos archivos que pasa `npm run check`.

**Negativas o riesgos**

- Un import nuevo en `shared/` o `api/` sin `.js` pasa el typecheck y rompe
  solo en producción. No hay test que lo detecte (ver deuda técnica).
- Cambiar de versión mayor de Node es un cambio deliberado en dos archivos.

**Qué cambia para el equipo**

- Al escribir imports en `shared/` o `api/`, terminar siempre en `.js`.
- `@types/node` sigue en 20.x; actualizarlo está en la deuda.

## Referencias

- Commit `24b197f` «Vercel: extensiones .js en los imports de la función y Node fijado a 22.x»
- `CLAUDE.md`, Anexo A «Comandos y entorno»
