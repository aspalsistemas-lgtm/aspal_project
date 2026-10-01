# ADR-0002: Los fallos de WordPress se propagan como 5xx

- **Fecha:** 2026-08-07 (registrada retroactivamente el 2026-10-01)
- **Estado:** Aceptada
- **Alcance:** `shared/wordpress/`, consumidores de `/api/*` en `client/`

## Contexto

La política inicial degradaba cualquier fallo de WordPress a una lista vacía
«para que la landing renderizara aunque el blog no respondiera». El efecto fue
que «WordPress está caído» y «no hay artículos publicados» llegaban al cliente
como el mismo `[]`: la página mostraba «No hay artículos en esta categoría»
cuando en realidad no se había podido cargar, y con `retry: false` global el
fallo quedaba cacheado toda la sesión.

## Decisión

`client.ts` lanza cuando WordPress responde mal; `routes.ts` traduce a 500.
No se degrada a `[]` ni a `null`. El único `null`/404 legítimo es
`/api/posts/:slug` cuando el post no existe. El cliente distingue tres estados:
cargando, error (con reintento) y vacío. La home consume la API solo en
`ContenidoReciente`, que oculta el bloque si falla y deja el resto intacto.

## Alternativas consideradas

| Alternativa                                  | Por qué se descartó                                                          |
| -------------------------------------------- | ---------------------------------------------------------------------------- |
| Seguir devolviendo `[]` ante cualquier fallo | El cliente no puede ofrecer reintentar ni distinguir el estado vacío real    |
| Devolver `{ items: [], error: true }`        | Cambia la forma de la respuesta para todos los consumidores por un caso raro |
| Caché de servidor con último valor bueno     | El sitio es sin estado (función serverless); no hay dónde guardarlo          |

## Consecuencias

**Positivas**

- Los estados de error son visibles y reintentables (`blog.tsx`,
  `podcast.tsx`, `useListaPaginada` con `retry: 2` y backoff).
- Un fallo puntual no se cachea como «no hay contenido».

**Negativas o riesgos**

- Un WordPress caído se nota en /blog y /podcast (es lo deseado), aunque no en
  el resto del sitio.

**Qué cambia para el equipo**

- Nunca envolver una llamada a WordPress en un `catch` que devuelva vacío.
- Toda vista que consuma `/api/*` maneja los tres estados; `blog.tsx` es la
  referencia.

## Referencias

- Commit `c2827ca` «Fase 0: excluir podcasts, propagar errores y sanear los metadatos del post»
- Commit `f187d07` «Fase 1: retirar el filtro roto y separar los tres estados de la rejilla»
- `docs/plans/2026-08-05-001-feat-blog-lectura-interna-ux-plan.md`
- `shared/wordpress/client.ts` y `routes.ts` (comentarios de cabecera)
