# ASPAL — Asociaciones Profesionales

Sitio público de ASPAL: landing institucional, blog y podcast. El contenido
editorial no vive aquí — se sirve en tiempo real desde un WordPress headless.

- **Repositorio:** <https://github.com/Antonio1491/aspal_project>
- **Sitio institucional:** <https://asociacionesprofesionales.org>
- **Fuente de contenido:** <https://comunidad.asociacionesprofesionales.org>

---

## Qué es

Una SPA de React que presenta la propuesta de ASPAL a asociaciones y
organizaciones sin ánimo de lucro: gestión de membresías, comunidad en línea,
certificaciones, marketing y bolsa de trabajo.

Detrás hay un servidor Express mínimo cuya única responsabilidad es hacer de
proxy sobre la REST API de WordPress y normalizar la respuesta antes de que
llegue al cliente. **No hay base de datos, ni sesiones, ni autenticación**: el
sitio es público, de solo lectura y sin estado.

## Stack

| Capa      | Tecnología                                                 |
| --------- | ---------------------------------------------------------- |
| UI        | React 18 · TypeScript · Vite                               |
| Estilos   | Tailwind CSS · shadcn/ui (New York) · Montserrat           |
| Rutas     | wouter                                                     |
| Datos     | TanStack Query                                             |
| Animación | framer-motion                                              |
| Backend   | Express (dev y self-hosted) · función serverless en Vercel |
| Contenido | WordPress REST API (headless)                              |

## Arranque rápido

Requiere **Node 22** (ver `.nvmrc`).

```bash
git clone https://github.com/Antonio1491/aspal_project.git
cd aspal_project
npm install
cp .env.example .env      # opcional: todos los valores tienen default
npm run dev
```

Abre <http://localhost:5000>.

> **Si el puerto 5000 está ocupado**, arranca en otro:
> `PORT=5001 npm run dev`

## Scripts

| Comando                | Qué hace                                                       |
| ---------------------- | -------------------------------------------------------------- |
| `npm run dev`          | Express + Vite con HMR                                         |
| `npm run build`        | Assets → cliente → SSR → prerender → servidor (`dist/`)        |
| `npm run start`        | Sirve el build de producción                                   |
| `npm run check`        | Typecheck de `client/`, `server/`, `shared/` y `api/` + assets |
| `npm run lint`         | ESLint (`lint:fix` corrige)                                    |
| `npm run format:check` | Prettier (`format` escribe)                                    |
| `npm test`             | Vitest, una pasada (`test:watch` en vigilancia)                |

## Estructura

```
shared/
  wordpress/          ⚠️ fuente única: tipos, transformación y endpoints /api/*
  suscripcion/        validación compartida, rutas y cliente de Mailchimp
server/               Express para desarrollo y self-hosted (solo wiring)
api/index.ts          función serverless de Vercel (solo wiring)
client/src/
  pages/              una página por ruta (inicio, nosotros, blog, podcast, unete…)
  components/
    layout/           bandas, hero, cabecera, pie, utilidades de navegación
    institucional/    pilares, mapa de ruta, perfiles, aliados, cifras
    content/          tarjetas de blog y podcast, contenido reciente
    forms/            formulario de suscripción
    ui/               primitivas shadcn/ui en uso
    sections/         legado de /plataforma
  content/            textos institucionales como datos
  catalogo/           registro y demos de /componentes
  hooks/  lib/        hooks y utilidades
scripts/              prerender, verificación de assets, conversión de imágenes
docs/                 arquitectura, API, ADRs, deuda técnica, planes
```

**La regla que no se rompe:** toda la lógica de WordPress y de la suscripción
vive **solo** en `shared/`. El servidor Express y la función de Vercel la
montan; ninguno de los dos la reimplementa. Antes sí lo hacían y acabaron
divergiendo.

## API

Todos los endpoints son públicos y sin autenticación. Catálogo completo con
contratos y errores en [`docs/api/endpoints.md`](docs/api/endpoints.md).

| Endpoint                              | Descripción                                                   |
| ------------------------------------- | ------------------------------------------------------------- |
| `GET /api/posts?per_page=N&page=P`    | Posts por páginas (6 por defecto); total en `X-Total-Count`   |
| `GET /api/posts/:slug`                | Post individual · `404` si no existe                          |
| `GET /api/podcasts?per_page=N&page=P` | Episodios de la categoría `podcast`; total en `X-Total-Count` |
| `GET /api/health`                     | Sonda de estado                                               |
| `POST /api/suscripcion`               | Alta en Mailchimp (`pending`, doble confirmación)             |

Los posts se devuelven ya normalizados (`TransformedPost`): el HTML se limpia
para el extracto y la imagen destacada cae al primer `<img>` del contenido
cuando WordPress no trae `wp:featuredmedia`.

Si WordPress falla, el error se propaga y la API responde 5xx. Así el cliente
distingue «no se pudo cargar» (y ofrece reintentar) de «no hay contenido». La
home oculta el bloque de contenido reciente y el resto de la página no se ve
afectado.

## Variables de entorno

Ninguna es obligatoria para arrancar — la API de WordPress es pública. Sin las
de Mailchimp, `POST /api/suscripcion` responde 503.

| Variable                | Default                                                         | Para qué                                            |
| ----------------------- | --------------------------------------------------------------- | --------------------------------------------------- |
| `PORT`                  | `5000`                                                          | Puerto del servidor Express                         |
| `WP_API_BASE`           | `https://comunidad.asociacionesprofesionales.org/wp-json/wp/v2` | Origen del contenido                                |
| `NODE_ENV`              | —                                                               | `development` activa Vite/HMR; si no, sirve `dist/` |
| `MAILCHIMP_API_KEY`     | —                                                               | Boletín; termina en el centro de datos (`…-us21`)   |
| `MAILCHIMP_AUDIENCE_ID` | —                                                               | Boletín; id de la audiencia                         |

## Despliegue

Vercel, configurado en `vercel.json`:

- El build genera un HTML prerenderizado por ruta estática en `dist/public/`,
  más `404.html`, `spa.html`, `sitemap.xml` y `robots.txt`.
- `api/index.ts` se despliega como función serverless para `/api/*`.
- `/blog/:slug` se sirve desde `spa.html`; cualquier otra ruta desconocida
  responde `404.html` con código 404. No hay fallback de SPA.

Ramas: `main` → producción · `staging` → preview.

## Contribuir

1. Rama desde `staging`.
2. `npm run check`, `npm run lint`, `npm run format:check` y `npm test` tienen
   que pasar antes de abrir PR (es lo que ejecuta CI). `check` cubre también
   `api/`.
3. Si tocas los endpoints, tócalos en `shared/`, nunca en los dos consumidores
   por separado, y documéntalos en `docs/api/endpoints.md`.
4. Commits en Conventional Commits (ver `CLAUDE.md` §5).

Más contexto en [`docs/architecture.md`](docs/architecture.md),
[`docs/plataforma.md`](docs/plataforma.md) y [`design.md`](design.md). Si
trabajas con agentes de IA, [`CLAUDE.md`](CLAUDE.md) es el contrato que deben
seguir y [`AGENTS.md`](AGENTS.md) las reglas estables.

## Licencia

MIT — ver [LICENSE](LICENSE).
