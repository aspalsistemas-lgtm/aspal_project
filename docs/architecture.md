# Arquitectura

Documento de referencia técnica. Para arrancar el proyecto ve al
[README](../README.md); para las reglas que deben seguir los agentes de IA, a
[CLAUDE.md](../CLAUDE.md) y [AGENTS.md](../AGENTS.md). Las decisiones costosas
de revertir están en [adr/](adr/); el catálogo de endpoints, en
[api/endpoints.md](api/endpoints.md).

## Panorama

Landing institucional de ASPAL con blog y podcast. React 18 + TypeScript sobre
Vite, servido por un Express mínimo cuya única función es hacer de proxy sobre
la REST API de un WordPress headless y normalizar la respuesta.

Sin base de datos. Sin sesiones. Sin autenticación. El sitio es público,
de solo lectura y sin estado.

## Frontend

**Rutas** (`wouter`): se definen en `client/src/lib/rutas.ts` y se cablean en
`client/src/App.tsx`.

| Ruta              | Página                                                                                                                |
| ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| `/`               | Home institucional. Consume `/api/posts` y `/api/podcasts` solo en `ContenidoReciente`, que se oculta si la API falla |
| `/nosotros`       | Quiénes somos                                                                                                         |
| `/que-hacemos`    | Los cuatro pilares                                                                                                    |
| `/nuestro-equipo` | Equipo operativo                                                                                                      |
| `/mapa-de-ruta`   | Mapa de Ruta: las 7 etapas paso a paso                                                                                |
| `/plataforma`     | Contenido de producto SaaS                                                                                            |
| `/unete`          | Suscripción al boletín (formulario completo)                                                                          |
| `/eventos`        | Eventos (en preparación) con suscripción compacta                                                                     |
| `/blog`           | Listado de artículos con portada y «Ver más» (el filtro por categoría se retiró)                                      |
| `/blog/:slug`     | Artículo individual                                                                                                   |
| `/podcast`        | Listado de episodios con «Ver más»                                                                                    |
| `/componentes`    | Catálogo interno de componentes con demos y código (noindex, sin enlace en el menú)                                   |
| `*`               | 404                                                                                                                   |

**Catálogo (`/componentes`):** va en el bundle único (≈8–10 KB gzip, ~4–5 %).
Cargarlo aparte exigiría Suspense + precarga antes de `hydrateRoot`; se revisa
si supera ~20 KB gzip. El catálogo no registra analítica (guardia en
`registrarEvento`).

**Estado:** TanStack Query para estado de servidor; hooks de React para estado
local. Hooks propios en `client/src/hooks/` (`use-lista-paginada`,
`use-en-cliente`, `use-animar-al-ver`, `use-mobile`, `use-toast`).

**Estilos:** Tailwind CSS como base, shadcn/ui (variante New York) para las
primitivas accesibles, tipografía Montserrat. La paleta institucional
(pizarra, miel y noche) y el resto de decisiones visuales están en
[design.md](../design.md), en la raíz.

**Organización de componentes** (detalle y reglas en `design.md` §1):

```
components/
  layout/         Banda, HeroInstitucional, Header, Footer, PatronPanal, FotoHero,
                  ErrorBoundary, ScrollToTop, ScrollRestoration, CabeceraRuta…
  institucional/  PilarCard, PerfilCard, RutaTimeline, MuroAliados, CifraAnimada…
  content/        BlogCard, EpisodioFila, PortadaArticulo, FranjaPodcast, VerMas…
  forms/          FormSuscripcion
  ui/             primitivas shadcn/ui — solo las que se usan
  sections/       legado de /plataforma (HeroSection, FeaturesGrid…)
```

Cada componente está registrado en `client/src/catalogo/registro.ts` y se ve en
`/componentes`. Las entradas de página animan solo el desplazamiento, nunca la
opacidad (prerender). Los elementos interactivos y significativos llevan
`data-testid`.

## Backend

Express con TypeScript. Dos despliegues del mismo código:

| Entorno                  | Entrada           | Rol                                |
| ------------------------ | ----------------- | ---------------------------------- |
| Desarrollo / self-hosted | `server/index.ts` | Express + middleware de Vite (HMR) |
| Producción (Vercel)      | `api/index.ts`    | Función serverless para `/api/*`   |

**Ambos son solo wiring.** La lógica está en `shared/wordpress/`:

```
types.ts       WPPost (crudo de WordPress) · TransformedPost (normalizado)
transform.ts   limpieza de HTML, extracción de imagen, normalización
client.ts      fetch contra WordPress            [SOLO SERVIDOR]
routes.ts      registro de los endpoints /api/*
```

Esta separación existe por una razón concreta: `api/index.ts` fue durante un
tiempo una copia literal de la lógica del servidor, con la instrucción de
sincronizar cada cambio a mano. No se sostuvo — `/api/health` llegó a existir
solo en Vercel. Ahora un endpoint nuevo en `shared/wordpress/routes.ts` aparece
en los dos entornos a la vez.

`client.ts` lee `process.env` y no debe llegar nunca al bundle del navegador.
El cliente solo importa tipos desde `shared/`.

**Modo desarrollo vs producción** (`server/index.ts`): con
`NODE_ENV=development` se monta el middleware de Vite; si no, se sirven los
estáticos de `dist/public/`. En ambos casos el mismo proceso sirve API y
cliente en un único puerto.

## Datos

No hay persistencia. Todo el contenido se pide a WordPress en cada request:

`https://comunidad.asociacionesprofesionales.org/wp-json/wp/v2`
(configurable con `WP_API_BASE`)

| Endpoint                              | Origen                                              |
| ------------------------------------- | --------------------------------------------------- |
| `GET /api/posts?per_page=N&page=P`    | `/posts?_embed` (sin la categoría `podcast`)        |
| `GET /api/posts/:slug`                | `/posts?_embed&slug=…` · `404` si no hay resultados |
| `GET /api/podcasts?per_page=N&page=P` | `/posts` filtrado por la categoría `podcast`        |
| `GET /api/health`                     | —                                                   |

**Paginación**: `per_page` va de 1 a 100 (el máximo de WordPress; por defecto 6) y `page` empieza en 1. El cuerpo es la lista de esa página; el total de la
colección llega en la cabecera `X-Total-Count` (de `X-WP-Total`). Lo usan el
«Ver más» de /blog y /podcast (`useListaPaginada`) y la numeración de episodios,
que se cuenta sobre ese total y no sobre lo cargado.

**Normalización** (`transformPost`): se limpia el HTML para título y extracto
(truncado a 200 caracteres) y se decodifican sus entidades, también las
numéricas (`&#8211;` → «–»), el contenido se conserva como HTML crudo para
renderizar, y la imagen destacada cae al primer `<img>` del contenido cuando
WordPress no devuelve `wp:featuredmedia`. Autor por defecto: `ASPAL`.
Categoría por defecto: `General`.

Los podcasts no son un tipo de contenido propio: son posts de la categoría
`podcast`, cuyo id hay que resolver por slug antes de poder filtrar. Eso
implica **dos** llamadas a WordPress por petición de podcasts.

**Errores:** los fallos de WordPress se propagan y salen como 5xx: `client.ts`
lanza y `routes.ts` traduce. El cliente distingue así «no se pudo cargar» de
«no hay artículos». El único `null`/404 legítimo es `/api/posts/:slug` cuando el
post no existe.

No se requieren credenciales — la API de WordPress es pública.

## Suscripción al boletín

`POST /api/suscripcion` (lógica en `shared/suscripcion/`, montada en
`server/index.ts` y `api/index.ts`). Es la única escritura del sitio y no
guarda nada: valida con `validacion.ts` (la misma función que usa el
formulario), descarta en silencio a los bots (campo trampa `sitioWeb`) y hace
un alta de solo creación (POST) en Mailchimp con `status: "pending"`, que
dispara la doble confirmación. A un miembro existente no se le modifica nada y
recibe la misma respuesta. Etiqueta al miembro con
`origen:<unete|home|footer|eventos>`; si el etiquetado falla, el alta ya
ocurrió y no se devuelve error. El endpoint exige `Content-Type:
application/json` (415 si no).

Las llamadas a Mailchimp tienen un tiempo máximo de 4 s cada una; el formulario, de 10 s.

Configuración (Vercel → Settings → Environment Variables):

- `MAILCHIMP_API_KEY`: termina en el centro de datos (`…-us21`).
- `MAILCHIMP_AUDIENCE_ID`: id de la audiencia.
- En la audiencia: campos de texto `PAIS`, `ORG` y `CARGO` (además de `FNAME`)
  y la doble confirmación activada.

Respuestas: 200 `{ok:true}` · 400 con `errores` por campo · 415 si no es JSON ·
503 sin configuración · 502 si falla Mailchimp. Nunca registra datos personales
en los logs.

Antes del lanzamiento: regla de rate limit en el Vercel Firewall para
`POST /api/suscripcion` (el endpoint no guarda estado y no limita por IP).

Quien se dio de baja no puede volver a suscribirse desde el sitio (Mailchimp lo
impide); se le indica escribir al correo de contacto.

## Despliegue

Vercel, según `vercel.json`:

- `buildCommand`: `npm run build`. Primero corre `scripts/check-assets.mjs`
  (referencias rotas, huérfanos y el límite de 250 KB por imagen) y luego son
  dos builds de Vite (cliente y `--ssr`) más
  `scripts/prerender.mjs`, que escribe un HTML por ruta estática, `404.html`,
  `spa.html`, `sitemap.xml` y `robots.txt`. En el navegador, `main.tsx`
  hidrata (`hydrateRoot`) las páginas prerenderizadas y monta desde cero
  (`createRoot`) el `spa.html` vacío. Lo que solo existe en el cliente
  (estados de carga, la dirección pedida en el 404) se pinta después de
  hidratar (`useEnCliente` o un efecto), para que el primer render coincida
  con el HTML.
- `sharp` es dependencia solo de desarrollo: la usa `scripts/imagenes.mjs`
  (conversión única a WebP), no el build.
- `outputDirectory`: `dist/public`
- `cleanUrls`: `/blog` sirve `blog.html`
- `trailingSlash: false`: `/blog/` redirige a `/blog` (308)
- `/api/(.*)` → la función serverless
- `/blog/:slug` → `spa.html` (el shell vacío; el cliente carga el artículo)
- Todo lo demás → `404.html` con código 404. Ya no hay fallback de SPA.

Express en producción (`server/static.ts`) aplica las mismas reglas.

Ramas: `main` → producción · `staging` → preview.

## Dependencias externas

**UI:** primitivas de Radix (collapsible, navigation-menu, slot, toast,
tooltip), Lucide para iconos, class-variance-authority para variantes,
framer-motion para animación.

**Utilidades:** date-fns con locale español para fechas, clsx y tailwind-merge
para composición de clases.

**Servicios referenciados desde la UI:** redes sociales, el sistema de
registro externo en asociacionesprofesionales.org y GTM/GA4 vía
`window.dataLayer` (`lib/analitica.ts`).

**Assets:** en `client/src/assets/` (~520 KB versionados; `check-assets`
impide huérfanos e imágenes de más de 250 KB) — logotipo ASPAL para fondo
claro, isotipo, logo de Parksys e ilustraciones. Los originales en alta viven en
`docs/marca/`.

## Historia

El proyecto nació en Replit y se migró a Vercel. Se han eliminado el andamiaje
de Replit, 37 componentes de shadcn/ui sin usar y las 36 dependencias que
arrastraban.
