# ADR-0003: Prerender por ruta y 404 real, sin fallback de SPA

- **Fecha:** 2026-09-29 (registrada retroactivamente el 2026-10-01)
- **Estado:** Aceptada
- **Alcance:** `scripts/prerender.mjs`, `client/src/entry-server.tsx`, `client/src/main.tsx`, `server/static.ts`, `vercel.json`

## Contexto

El sitio se servía como SPA pura: `vercel.json` reescribía todo a `/` y
cualquier dirección inexistente respondía 200 con la home. Para un buscador el
sitio tenía infinitas páginas iguales; el `<head>` era el mismo para todas las
rutas; y el HTML llegaba vacío a quien no ejecuta JavaScript. El plan de la
Etapa 1 fijó SEO por ruta (RF-10) y 404 real (RF-11).

## Decisión

El build genera un HTML por ruta estática con su `<head>` propio (título,
descripción, canonical, Open Graph, JSON-LD en la home) y el cuerpo ya
renderizado, además de `404.html`, `spa.html`, `sitemap.xml` y `robots.txt`.
En el navegador, `main.tsx` hidrata las páginas prerenderizadas y monta desde
cero el `spa.html` vacío, que es lo que reciben las rutas dinámicas
(`/blog/:slug`). Lo que no esté en `rutas.ts` responde 404 con código 404, en
Vercel y en Express. `prerender.mjs` es también una puerta: aborta el build si
una ruta sale sin `<h1>`, con contenido a `opacity:0` o sin un único
`main#contenido`.

## Alternativas consideradas

| Alternativa                             | Por qué se descartó                                                                |
| --------------------------------------- | ---------------------------------------------------------------------------------- |
| SSR en la función serverless            | Añade latencia y coste a cada petición para contenido que cambia con cada deploy   |
| Migrar a un framework con SSG integrado | Reescribir el sitio por una necesidad que dos builds de Vite y un script resuelven |
| Mantener la SPA y añadir solo `<meta>`  | No arregla el 404 falso ni el HTML vacío                                           |

## Consecuencias

**Positivas**

- Cada ruta tiene su título, descripción y canonical; hay sitemap y robots.
- Las rutas inexistentes responden 404 de verdad.
- El contenido se ve sin JavaScript y antes de hidratar.

**Negativas o riesgos**

- El primer render del cliente debe coincidir con el HTML: lo que solo existe
  en el navegador se pinta tras `useEnCliente()` o en un efecto.
- No se puede animar la opacidad del contenido en entradas de página.
- Añadir una ruta exige tres cosas (ruta, página, SEO); TypeScript lo exige.
- `server/static.ts` y `vercel.json` deben aplicar las mismas reglas;
  `vercel.test.ts` y `static.test.ts` lo vigilan.

**Qué cambia para el equipo**

- Leer `client/CLAUDE.md` §3 antes de crear una página.
- El 404 real solo existe en el build; el servidor de desarrollo de Vite
  responde 200 a todo.

## Referencias

- Commit `189970c` «PR B: SEO por ruta, prerender y 404 real»
- Commit `fa5be6b` «Hidratar las páginas prerenderizadas en vez de volver a pintarlas»
- `docs/plans/2026-09-29-002-feat-etapa-1-pr-b-seo-prerender-404-plan.md`
- `docs/architecture.md`, sección «Despliegue»
