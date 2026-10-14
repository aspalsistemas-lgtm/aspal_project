# La plataforma de ASPAL

Descripción general del sitio público de ASPAL (Asociaciones Profesionales de
Latinoamérica): qué es, qué ofrece, cómo está construido y cómo se opera. Para
el detalle técnico ve a [architecture.md](architecture.md); para la guía
visual, a [design.md](../design.md).

- **Sitio:** <https://www.asociacionesprofesionales.org>
- **Contenido editorial:** <https://comunidad.asociacionesprofesionales.org>
  (WordPress)
- **Repositorio:** <https://github.com/Antonio1491/aspal_project>

---

## 1. Qué es

ASPAL es la red en español del sector asociativo de América Latina. El sitio es
su cara pública y tiene tres funciones:

1. **Institucional.** Explica quién es ASPAL, qué hace y cómo sumarse.
2. **Editorial.** Publica el blog y el podcast _Conexión Profesional_. El
   contenido se escribe en WordPress y el sitio lo muestra en tiempo real.
3. **Captación.** Recoge suscripciones al boletín, que van directamente a
   Mailchimp.

Todo el sitio es público y de solo lectura. **No tiene base de datos,
sesiones, autenticación ni estado de servidor.** Su única escritura es el alta
en el boletín, y el sitio no guarda nada: la delega en Mailchimp.

## 2. Secciones

| Ruta              | Página                                                                              |
| ----------------- | ----------------------------------------------------------------------------------- |
| `/`               | Inicio: propuesta, pilares, aliados y contenido reciente del blog/podcast           |
| `/nosotros`       | Quiénes somos                                                                       |
| `/que-hacemos`    | Los cuatro pilares: Comunidad, Conocimiento, Tecnología y Datos                     |
| `/nuestro-equipo` | Equipo operativo y secretariado compartido con WUP y ANPR                           |
| `/mapa-de-ruta`   | Guía de gestión asociativa: 7 etapas y 23 pasos, con PDF descargable                |
| `/plataforma`     | Producto SaaS: membresías, comunidad en línea, cursos, marketing y bolsa de trabajo |
| `/unete`          | Suscripción gratuita o membresía                                                    |
| `/eventos`        | Calendario de eventos y webinars (en preparación)                                   |
| `/blog`           | Artículos, con filtro por categoría                                                 |
| `/blog/:slug`     | Artículo individual                                                                 |
| `/podcast`        | Episodios de _Conexión Profesional_                                                 |
| `/componentes`    | Catálogo interno de componentes y estilos (noindex, fuera del menú)                 |
| `*`               | 404                                                                                 |

La lista de rutas vive en un solo lugar: `client/src/lib/rutas.ts`. Una ruta
que no aparezca ahí no existe, y un test impide que el menú enlace a una ruta
inexistente.

## 3. Stack

### Frontend

| Capa             | Tecnología                                                         |
| ---------------- | ------------------------------------------------------------------ |
| Lenguaje         | TypeScript 5.6                                                     |
| UI               | React 18                                                           |
| Build y dev      | Vite 5 (HMR en desarrollo, build SSR para el prerender)            |
| Rutas            | wouter 3                                                           |
| Datos remotos    | TanStack Query 5 (la `queryKey` es el path del endpoint)           |
| Estilos          | Tailwind CSS 3 · `@tailwindcss/typography` · `tailwindcss-animate` |
| Componentes base | shadcn/ui (variante New York) sobre primitivas de Radix UI         |
| Iconos           | lucide-react                                                       |
| Animación        | framer-motion 11                                                   |
| Fechas           | date-fns 3 con locale español                                      |
| Clases           | class-variance-authority · clsx · tailwind-merge                   |
| Tipografía       | Montserrat variable (400–800), alojada en el propio dominio        |

### Backend

| Capa                    | Tecnología                                               |
| ----------------------- | -------------------------------------------------------- |
| Runtime                 | Node.js 22 (`.nvmrc`, `engines` fijado a `22.x`)         |
| Servidor                | Express 4: proxy sobre WordPress y servidor de estáticos |
| Producción              | Función serverless de Vercel (`api/index.ts`)            |
| Ejecución en desarrollo | tsx                                                      |
| Bundle del servidor     | esbuild                                                  |

### Servicios externos

| Servicio                 | Uso                                                                  |
| ------------------------ | -------------------------------------------------------------------- |
| WordPress                | CMS headless. Su REST API pública es el origen de blog y podcast     |
| Mailchimp                | Audiencia del boletín, con doble confirmación                        |
| Vercel                   | Hosting, CDN y funciones serverless                                  |
| GitHub Actions           | Integración continua                                                 |
| Google Tag Manager / GA4 | Analítica mediante `window.dataLayer` (el contenedor está pendiente) |

### Calidad y herramientas

| Herramienta                   | Uso                                                                       |
| ----------------------------- | ------------------------------------------------------------------------- |
| `tsc`                         | Typecheck de `client/`, `server/`, `shared/` y `api/`                     |
| Vitest 3                      | Tests unitarios (lógica pura, SEO, rutas, contraste, catálogo…)           |
| ESLint 10 + typescript-eslint | Lint, con reglas de hooks de React                                        |
| Prettier 3                    | Formato                                                                   |
| `scripts/check-assets.mjs`    | Detecta assets rotos y huérfanos, y aplica el límite de 250 KB por imagen |
| sharp (solo desarrollo)       | Conversión puntual de imágenes a WebP                                     |

## 4. Arquitectura

```
                 ┌──────────────────────────┐
  Navegador ───▶ │ Vercel CDN               │  HTML prerenderizado por ruta
                 │  apps/sitio/dist/public/ │  + JS/CSS con caché inmutable
                 └────────────┬─────────────┘
                              │ /api/*
                 ┌────────────▼─────────────┐
                 │ api/index.ts (serverless)│  solo wiring
                 │   └─ shared/wordpress    │  tipos, normalización, rutas
                 │   └─ shared/suscripcion  │  validación, Mailchimp
                 └──────┬──────────┬────────┘
                        │          │
              WordPress REST     Mailchimp API
```

**Una sola fuente de lógica.** Todo lo relacionado con WordPress está en
`shared/wordpress/`, y todo lo de la suscripción en `shared/suscripcion/`.
Los montan dos consumidores que no hacen otra cosa que conectarlos:
`server/index.ts` (desarrollo y self-hosted) y `api/index.ts` (Vercel). Hace
tiempo cada uno tenía su propia copia de la lógica y acabaron divergiendo; por
eso existe `shared/`.

**Fronteras de import.** El navegador solo importa módulos puros de `shared/`
(tipos y validación). `client.ts` y `mailchimp.ts` leen `process.env` y hacen
peticiones de red, así que solo corren en el servidor.

### API

| Endpoint                       | Qué hace                                               |
| ------------------------------ | ------------------------------------------------------ |
| `GET /api/posts?per_page=N`    | Últimos artículos, ya normalizados (`TransformedPost`) |
| `GET /api/posts/:slug`         | Un artículo · `404` si no existe                       |
| `GET /api/podcasts?per_page=N` | Posts de la categoría `podcast`                        |
| `GET /api/health`              | Sonda de estado                                        |
| `POST /api/suscripcion`        | Alta en Mailchimp (`pending`, doble confirmación)      |

Si WordPress falla, el error se propaga y la API responde con un 5xx. Así el
cliente distingue «no se pudo cargar» (y ofrece reintentar) de «no hay
contenido» (y muestra el estado vacío). En la home, el bloque de contenido
reciente se oculta si falla y el resto de la página no se ve afectado.

### Renderizado

El build genera **un HTML prerenderizado por cada ruta estática**, además de
`404.html`, `sitemap.xml` y `robots.txt`. En el navegador, React hidrata ese
HTML (`hydrateRoot`). Los artículos (`/blog/:slug`) se sirven desde un shell
vacío (`spa.html`) y el cliente carga el contenido. Las rutas desconocidas
responden con un 404 real, sin fallback de SPA.

Cada ruta tiene título, descripción, canonical, Open Graph y JSON-LD definidos
en `client/src/lib/seo.ts`. TypeScript impide añadir una ruta sin su entrada
de SEO.

## 5. Estructura del repositorio

```
Monorepo con npm workspaces (decisión D1). Hoy tiene un solo workspace; la
plataforma llegará como `apps/plataforma`, y `packages/ui` y
`packages/contratos` nacerán con su primer consumidor.

```

api/index.ts puerta de Vercel: reexporta apps/sitio/api
vercel.json despliegue del sitio
apps/sitio/ el sitio público (@aspal/sitio)
client/src/
pages/ una página por ruta
components/ atoms/ molecules/ organisms/ templates/ infraestructura/
ui/ (shadcn/ui en uso) · sections/ (legado de /plataforma)
content/ textos institucionales y legales como datos
catalogo/ registro y demos de /componentes
hooks/ lib/ hooks y utilidades (rutas, SEO, marca, analítica, tokens…)
shared/
wordpress/ tipos, transformación, cliente y rutas /api/*
suscripcion/ tipos, validación y cliente de Mailchimp
server/ Express: desarrollo, estáticos y self-hosted
api/index.ts función serverless de Vercel
scripts/ prerender, verificación de assets, imágenes, check-browser
docs/ arquitectura, diseño, marca, planes y brainstorms

````

## 6. Diseño

- **Paleta institucional:** pizarra `#233543`, miel `#F9CC62` y noche
  `#112738`. Solo hay modo claro. Un test verifica el contraste de cada par de
  texto y fondo.
- **Tipografía:** Montserrat. El cuerpo es de 18 px porque el público tiene
  una edad media alta.
- **Motivo gráfico:** el hexágono del isotipo (panal).
- **Catálogo vivo:** `/componentes` muestra cada componente con su demo, su
  código y cuándo usarlo. Antes de crear un componente nuevo se busca aquí.

El detalle está en [design.md](../design.md).

## 7. Despliegue y operación

| Rama      | Entorno    |
| --------- | ---------- |
| `main`    | Producción |
| `staging` | Preview    |

**CI (GitHub Actions)**, en cada push y PR a `main` o `staging`: typecheck →
verificación de assets → lint → formato → tests → build.

**Variables de entorno:**

| Variable                | Obligatoria     | Uso                                              |
| ----------------------- | --------------- | ------------------------------------------------ |
| `WP_API_BASE`           | No              | Origen de WordPress (tiene un valor por defecto) |
| `MAILCHIMP_API_KEY`     | Para el boletín | Sin ella, `/api/suscripcion` responde 503        |
| `MAILCHIMP_AUDIENCE_ID` | Para el boletín | Ídem                                             |
| `PORT`                  | No              | Puerto de Express (5000 por defecto)             |

**Caché:** `/assets/*` y `/fuentes/*` se sirven con
`max-age=31536000, immutable`.

**Comandos:**

```bash
npm run dev      # Express + Vite con HMR
npm run build    # assets → cliente → SSR → prerender → servidor
npm start        # sirve el build
npm run check    # typecheck + assets
npm test         # Vitest
````

## 8. Historia

El proyecto nació en Replit y después se migró a Vercel. En la migración se
eliminaron el andamiaje de Replit, 37 componentes de shadcn/ui que no se
usaban con sus dependencias, y cerca de 10 MB de imágenes. Los assets pasaron
de ~11 MB a ~520 KB.
