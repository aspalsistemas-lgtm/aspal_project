# CLAUDE.md

Contexto para agentes de IA que trabajen en este repositorio.

## Qué es esto

Sitio público de ASPAL: landing + blog + podcast. React 18 (Vite) sobre un
Express mínimo que hace de proxy sobre un WordPress headless.

**El sitio no tiene base de datos, sesiones, autenticación ni estado de servidor.** La única escritura es `POST /api/suscripcion`, que delega en Mailchimp y no guarda nada (decisión D8). Si una
tarea del sitio parece necesitar cualquiera de esas cosas, es señal de que hay
que confirmarla antes de implementarla, no de improvisar una capa nueva.

La **plataforma SaaS** (plan en `docs/Plan_ASPAL_Plataforma_por_Etapas (1).md`,
aterrizado en `docs/plans/2026-10-01-001-feat-plataforma-etapa-0-plan.md`) es
una aplicación aparte, con PostgreSQL en AWS. Sus datos se rigen por la sección
«Base de datos relacional» de este archivo; el sitio sigue sin estado.

## La regla que más importa

**Toda la lógica de WordPress vive en `shared/wordpress/`. Punto.**

```
shared/wordpress/types.ts       WPPost (crudo) · TransformedPost (normalizado)
shared/wordpress/transform.ts   normalización
shared/wordpress/client.ts      fetch contra WordPress   [SOLO SERVIDOR]
shared/wordpress/routes.ts      registro de los endpoints /api/*
```

La montan dos consumidores que **solo hacen wiring**:

- `server/index.ts` → desarrollo y self-hosted
- `api/index.ts` → función serverless de Vercel (esto es lo que corre en producción)

Históricamente `api/index.ts` era una copia literal del código del servidor y
había que sincronizar cada cambio a mano. Divergieron. Por eso existe `shared/`.

**Nunca** añadas un endpoint, un campo o una transformación directamente en
`server/` o en `api/`: hazlo en `shared/wordpress/` y ambos lo heredan.

### Fronteras de import

| Desde                 | Puede importar                                                                                |
| --------------------- | --------------------------------------------------------------------------------------------- |
| `client/src/**`       | `@shared/wordpress/types` y `@shared/suscripcion/{tipos,validacion}` — **solo módulos puros** |
| `server/**`, `api/**` | cualquier cosa de `shared/wordpress/`                                                         |

`shared/suscripcion/mailchimp.ts` es solo-servidor, igual que `client.ts`.

`client.ts` lee `process.env` y hace fetch de red: si acaba en el bundle del
navegador, rompe. El cliente obtiene datos por `/api/*`, nunca importando ese
módulo.

No redeclares la forma de un post en un componente. Estuvo declarada cinco
veces —y en el cliente con el nombre equivocado (`WPPost` para la forma ya
transformada)—. Importa `TransformedPost`.

## Base de datos relacional

Antes de implementar cualquier cambio que cree, modifique o elimine datos
persistentes, lee y aplica **`docs/database-design.md`**. Esta guía es
obligatoria para PostgreSQL, modelos del ORM, migraciones, consultas,
importaciones e integraciones que escriban datos.

Inspecciona primero el esquema, migraciones, tablas, columnas, relaciones e
índices existentes. Para cada dato nuevo, determina si corresponde a una
columna existente, una entidad nueva, una clave foránea, una tabla pivote o un
hecho histórico. Respeta normalización, integridad referencial, aislamiento por
asociación, permisos, historial e idempotencia. No uses JSON, columnas
duplicadas o listas de identificadores como sustitutos de relaciones sin
justificarlo.

**Antes de escribir una migración**, entrega la propuesta breve especificada
en la sección 6 de `docs/database-design.md`. Si falta una regla de negocio que
altere el modelo, consúltala. Después de implementar, ejecuta verificaciones
significativas de integridad, migración y aislamiento entre asociaciones, y
mantén tipos y documentación consistentes.

## Comandos

```bash
npm run dev      # Express + Vite HMR en :5000
npm run build    # cliente -> dist/public, prerender por ruta, servidor -> dist/
npm run check    # typecheck: client + server + shared + api
```

`npm run check` es la puerta de calidad antes de cualquier commit. Cubre `api/`
—no siempre fue así, y por eso el código de producción pasó tiempo sin
typecheckear.

## Entorno de desarrollo

- **Windows.** El shell por defecto es PowerShell; hay Git Bash disponible.
- **Node 22** (`.nvmrc` y `engines` de `package.json`, fijado a `22.x`). Vercel desactivó Node 20 el 1 de octubre de 2026; con `>=20` el deploy cambiaba de versión solo.
- **Los imports relativos de `shared/` y `api/` llevan extensión `.js`** (`from "./types.js"`). Vercel no empaqueta la función: transpila archivo a archivo y Node ESM exige la extensión; sin ella la función cae con `ERR_MODULE_NOT_FOUND`. tsc, Vite, tsx y esbuild resuelven `.js` → `.ts` sin problema.
- `reusePort` está desactivado en Windows a propósito (`server/index.ts`):
  `SO_REUSEPORT` no existe ahí y `listen()` lanza `ENOTSUP`. No lo "arregles".
- **El puerto 5000 suele estar ocupado por otro proyecto de esta máquina.**
  Si ves `EADDRINUSE`, no mates el proceso: arranca en otro puerto con
  `PORT=5001 npm run dev`.

## Convenciones

- **La UI está en español.** Todo texto visible, en español. Los comentarios de
  código también.
- Rutas con `wouter`. Añadir una página = añadir su ruta en
  `client/src/lib/rutas.ts` (`RUTAS_ESTATICAS` o `RUTAS_DINAMICAS`) y su
  componente en `PAGINAS` de `client/src/App.tsx`; TypeScript exige los dos,
  y su título y descripción en `SEO` de `client/src/lib/seo.ts` (también lo
  exige TypeScript). Un `<Route>` suelto se salta el test de enlaces muertos.
- Datos con TanStack Query. La `queryKey` es el path del endpoint.
- Alias: `@/` → `client/src/`, `@shared/` → `shared/`, `@assets/` →
  `client/src/assets/`.
- `data-testid` en elementos interactivos y significativos. Mantenlo.
- **Los fallos de WordPress se propagan y salen como 5xx.** `client.ts` lanza y
  `routes.ts` traduce. No lo degrades a `[]`: el cliente necesita distinguir
  "no se pudo cargar" (→ reintentar) de "no hay artículos" (→ estado vacío), y
  con la política anterior ambos llegaban como el mismo array vacío. El único
  `null`/404 legítimo es `/api/posts/:slug` cuando el post de verdad no existe.

  Antes se degradaba a vacío "para que la landing renderizara aunque el blog
  no respondiera". No hace falta: la home (`inicio.tsx`) consume la API solo en
  `ContenidoReciente`, que oculta el bloque si la petición falla (RF-13) y deja
  el resto de la página intacto. También la consumen `blog.tsx`,
  `blog-post.tsx` y `podcast.tsx`.

### shadcn/ui

`client/src/components/ui/` contiene **solo los componentes en uso**. Se
eliminaron 37 sin usar junto con sus dependencias. Si necesitas uno nuevo,
añádelo con el CLI de shadcn (`components.json` ya está configurado) e instala
su dependencia de Radix — no lo reintroduzcas a mano ni asumas que ya está.

### Componentes: reutiliza antes de crear

El catálogo está en `client/src/catalogo/registro.ts` y se ve en
`/componentes` (pública, noindex, sin enlace en el menú). Antes de crear un
componente o una vista:

1. Busca en `registro.ts` (`usarCuando`, `evitarPara`) uno que ya lo resuelva.
   Reutilízalo; si le falta una variante, añádela al existente. Revisa también
   `client/src/hooks/` y `client/src/lib/` antes de escribir un hook o un
   helper.
2. Estilos que se repiten: `client/src/lib/clases.ts`. No copies cadenas de
   clases (un test lo impide para las que ya están ahí).
3. Si hace falta uno nuevo: créalo en la carpeta de su categoría, regístralo
   (`registro.test.ts` falla si no) y, si su `vista` es `"demo"`, añade su demo
   en `client/src/catalogo/demos-*.tsx` (TypeScript lo exige). Una carpeta
   nueva en `components/` exige añadirla a `CATEGORIAS_POR_CARPETA` (el test lo
   pide). Solo `.tsx`.
4. Un componente que deja de usarse se borra: el mismo test lo detecta.

## Verificar el trabajo

Un cambio no está hecho hasta que se ve funcionando:

```bash
npm run check
PORT=5001 npm run dev
curl http://localhost:5001/api/health
curl "http://localhost:5001/api/posts?per_page=2"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5001/no-existe   # en dev: 200 (Vite); en build: 404
```

El 404 real solo existe en el build (`npm run build && PORT=5002 npm start`);
el servidor de desarrollo de Vite responde 200 a todo.

Y para cambios de UI, abrir la ruta afectada en el navegador y mirarla. Las
secciones usan animaciones de entrada de framer-motion: una captura tomada al
instante puede salir en blanco sin que nada esté roto — espera o haz scroll
antes de concluir que hay un fallo.

## Contexto que ahorra tiempo

- `client/src/assets/` solo contiene lo que se usa (lo vigila `check-assets`) y
  ninguna imagen supera 250 KB: pesa ~520 KB (antes ~11 MB). Está versionado.
  Los nombres con timestamp (`Aspal-Icono_1763675356866.webp`) son heredados;
  los descriptivos son los buenos.
- El proyecto nació en Replit y se migró a Vercel. Si encuentras restos de
  Replit, sobran.
- La documentación de arquitectura está en `docs/architecture.md`; la guía de
  diseño (paleta, tipografía, espaciado) en `docs/design-guidelines.md`.
