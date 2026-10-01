# ASPAL — Contexto del Proyecto para Claude Code

> Contrato de trabajo del agente. No modificar sin revisión del equipo.
> Última actualización: octubre de 2026

---

## Documentos de Contexto

| Archivo                              | Cuándo leerlo                                                                    |
| ------------------------------------ | -------------------------------------------------------------------------------- |
| `CLAUDE.md` (este)                   | Inicio de cada sesión. Reglas globales                                           |
| `AGENTS.md`                          | Reglas estables para cualquier agente; sin estado de sesión                      |
| `server/CLAUDE.md`                   | Al trabajar en `server/`, `api/` o `shared/` (backend y lógica compartida)       |
| `client/CLAUDE.md`                   | Al trabajar en cualquier archivo de `client/`                                    |
| `docs/api/endpoints.md`              | Al crear o modificar endpoints                                                   |
| `design.md`                          | Al crear o modificar componentes o estilos                                       |
| `docs/database-design.md`            | Antes de crear, modificar o eliminar datos persistentes (plataforma, PostgreSQL) |
| `docs/plan-plataforma-por-etapas.md` | Antes de tocar cualquier cosa de la plataforma SaaS (decisiones de negocio)      |
| `docs/sprints/deuda-tecnica.md`      | Antes de alinear código con estas convenciones; al cerrar un punto               |

> Claude Code carga los CLAUDE.md del directorio activo hacia arriba automáticamente.
> En caso de conflicto entre documentos, `design.md` prevalece para todo lo visual,
> `docs/database-design.md` prevalece para datos persistentes y
> `docs/plan-plataforma-por-etapas.md` prevalece para reglas de negocio de la plataforma.

Referencia técnica ampliada: `docs/architecture.md` (cómo está construido) y
`docs/plataforma.md` (mapa del sistema, stack y operación).

---

## 1. Descripción del Proyecto

Sitio público de ASPAL (Asociaciones Profesionales de Latinoamérica): landing
institucional, blog y podcast. React 18 sobre Vite con un Express mínimo que
hace de proxy sobre un WordPress headless. Público, de solo lectura y sin
estado. Su única escritura es `POST /api/suscripcion`, que delega en Mailchimp
y no guarda nada (decisión D8 de la Etapa 1).

**El sitio no tiene base de datos, sesiones, autenticación ni estado de
servidor.** Si una tarea del sitio parece necesitar cualquiera de esas cosas,
hay que confirmarla antes de implementarla, no improvisar una capa nueva.

La **plataforma SaaS** (plan en `docs/plan-plataforma-por-etapas.md`,
aterrizado en `docs/plans/2026-10-01-001-feat-plataforma-etapa-0-plan.md`) es
una aplicación aparte, con PostgreSQL en AWS. Sus datos se rigen por
`docs/database-design.md`; el sitio sigue sin estado.

- **Despliegue:** Vercel (estáticos prerenderizados + función serverless
  `api/index.ts`). Sin base de datos ni almacenamiento propio. Contenido en
  WordPress; boletín en Mailchimp.
- **Idiomas V1:** español únicamente. No hay i18n y no está previsto (decisión
  de octubre de 2026).

---

## 2. Stack

```
Repo:       un solo paquete npm (sin workspaces) · Node 22.x · TypeScript 5.6 strict
Backend:    Express 4 · sin ORM ni BD · validación manual en shared/ · console como logger
Frontend:   React 18 + Vite 5 + wouter 3 · Tailwind 3 + shadcn/ui (New York) · estado
            local con hooks de React · estado remoto con TanStack Query 5 · formularios
            con FormData + validación compartida · toasts de shadcn (use-toast)
Auth:       ninguna
Externos:   WordPress REST API (contenido) · Mailchimp API v3 (boletín) · GTM dataLayer
Testing:    Vitest 3 (entorno node) · sin umbral de cobertura; un .test.ts por módulo de
            lógica en shared/ y client/src/lib/
Calidad:    ESLint 10 + typescript-eslint · Prettier 3 · scripts/check-assets.mjs · CI en
            GitHub Actions
```

Versiones exactas en `package.json`. Toda librería que no esté en esa lista
requiere autorización explícita antes de agregarse (ver sección 6).

---

## 3. Estructura del Repositorio

```
aspal/
├── CLAUDE.md                ← reglas globales (este archivo)
├── AGENTS.md                ← reglas estables para agentes
├── design.md                ← sistema de diseño
├── client/                  ← SPA (React + Vite)
│   ├── CLAUDE.md
│   ├── index.html · public/
│   └── src/  pages/ components/ content/ catalogo/ hooks/ lib/ assets/
├── server/                  ← Express de desarrollo y self-hosted (solo wiring)
│   └── CLAUDE.md            ← cubre también api/ y shared/
├── api/index.ts             ← función serverless de Vercel (solo wiring)
├── shared/                  ← la lógica: wordpress/ y suscripcion/
├── scripts/                 ← check-assets, prerender, imagenes
└── docs/
    ├── api/endpoints.md     ← catálogo de endpoints
    ├── adr/                 ← Architecture Decision Records
    ├── sprints/             ← deuda técnica
    ├── plans/ · brainstorms/← histórico de planes y exploraciones
    ├── architecture.md · plataforma.md · database-design.md
    └── plan-plataforma-por-etapas.md
```

### La regla que más importa

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
`server/` o en `api/`: hazlo en `shared/` y ambos lo heredan. Lo mismo vale
para `shared/suscripcion/`.

### Fronteras de import

| Desde                 | Puede importar                                                                                |
| --------------------- | --------------------------------------------------------------------------------------------- |
| `client/src/**`       | `@shared/wordpress/types` y `@shared/suscripcion/{tipos,validacion}` — **solo módulos puros** |
| `server/**`, `api/**` | cualquier cosa de `shared/`                                                                   |

`shared/wordpress/client.ts` y `shared/suscripcion/mailchimp.ts` son
solo-servidor: leen `process.env` y hacen fetch de red; si acaban en el bundle
del navegador, rompen. El cliente obtiene datos por `/api/*`.

No redeclares la forma de un post en un componente. Estuvo declarada cinco
veces, y en el cliente con el nombre equivocado. Importa `TransformedPost`.

---

## 4. Convenciones de Nomenclatura

Regla general: **español sin tildes en identificadores**, comentarios y textos
visibles en español (estos sí con tildes).

**Excepción documentada:** `shared/wordpress/` (funciones `fetchPosts`,
`transformPost`, `isGatedContent`, `registerApiRoutes`…) y el contrato
`TransformedPost` (`featuredImage`, `publishedAt`, `readingMinutes`…) se quedan
**en inglés**. Es un contrato público que consumen ~15 componentes; renombrarlo
no compensa. No extiendas esa excepción a código nuevo.

### Funciones y métodos — español camelCase, verbo primero

```
✅  validarSuscripcion · registrarRutasSuscripcion · esRutaConocida · generarSitemap
❌  getUserById (inglés) · suscripcion() (sin verbo) · validarSuscripción (tilde)
```

### Variables y parámetros — español camelCase, nunca abreviado

```
✅  perPage (solo dentro de shared/wordpress) · errores · resultado · podcastCategoryId
❌  rc · data · temp · e (en catch: usar error)
```

### Constantes del sistema — SCREAMING_SNAKE español sin tildes

```
✅  RUTAS_ESTATICAS · CABECERA_TOTAL · CAMPO_TRAMPA · BOTON_MIEL_NOCHE
❌  MAX_PRICE · tokenExpiry
```

### Tipos e interfaces — PascalCase español sin tildes

```
✅  SuscripcionValida · ErroresSuscripcion · RutaEstatica · EntradaCatalogo
❌  IUsuario (prefijo I) · TransformedPost en código nuevo (la excepción es solo la existente)
```

### Archivos — lo que el repo hace hoy

```
Componentes:  PascalCase español          HeroInstitucional.tsx · FormSuscripcion.tsx
Páginas:      kebab-case español          mapa-de-ruta.tsx · nuestro-equipo.tsx
Hooks:        kebab-case con prefijo use- use-lista-paginada.ts · use-en-cliente.ts
Lib y shared: kebab-case español          contenido-reciente.ts · validacion.ts
```

Trece componentes heredados conservan nombre en inglés (`Header`, `Footer`,
`BlogCard`, `ErrorBoundary`, `ScrollToTop`, `ScrollRestoration` y los siete de
`components/sections/`, marcados «legado» en el catálogo). No crees más.

### Componentes React — PascalCase español descriptivo

```
✅  HeroInstitucional · PilarCard · FormSuscripcion · PatronPanal
❌  Card (genérico) · PilarCard2 (sufijo numérico) · pilarCard (camelCase)
```

### Custom Hooks — use + sustantivo español

```
✅  useListaPaginada · useEnCliente · useAnimarAlVer
❌  useGetPosts (verbo tras use) · usarLista (sin prefijo use)
```

`useIsMobile` y `useToast` vienen de shadcn y se conservan.

---

## 5. Commits

Conventional Commits · scope en inglés · descripción en español sin tildes.
**Rige desde octubre de 2026**; el historial anterior usa `Área: descripción`
y no se reescribe.

```bash
feat(blog): agregar paginacion con ver mas
fix(static): cerrar la redireccion abierta con barras invertidas
refactor(shared): extraer la paginacion a una funcion propia
test(suscripcion): cubrir el campo trampa
docs(adr): registrar la decision de prerender y 404 real
chore(deps): actualizar vite a version 5.4.x
```

Tipos válidos: `feat` `fix` `refactor` `test` `docs` `chore` `perf`

Prohibido: tildes en la descripción · sin tipo ni scope · mensajes genéricos
como «fix bug». Terminar siempre con la línea de coautoría que indique la
sesión. **Commitear sí, push no**, salvo petición explícita.

---

## 6. Cuándo Pausar y Preguntar

**Claude NUNCA debe hacer estas acciones sin que el humano lo pida explícitamente:**

1. Añadir al sitio base de datos, sesiones, autenticación o cualquier estado de
   servidor. Si una tarea parece necesitarlo, se confirma primero.
2. Eliminar archivos existentes (excepción: un componente que deja de usarse se
   borra, y el test del catálogo lo exige).
3. Cambiar la firma de una función que ya tiene tests escritos.
4. Agregar una dependencia npm no listada en `package.json`. Un componente de
   shadcn nuevo se añade con su CLI, nunca a mano.
5. Modificar `.env.example` o variables de entorno.
6. Cambiar la estructura de carpetas del proyecto.
7. Crear un endpoint que no esté en `docs/api/endpoints.md`.
8. Modificar archivos fuera del módulo en el que se está trabajando.
9. Cambiar el formato de respuesta de un endpoint existente.
10. Escribir una migración o tocar un esquema de la plataforma sin la propuesta
    de la sección 6 de `docs/database-design.md`, ni ejecutarla contra una base
    real.
11. Hacer push, reescribir historial o tocar la configuración de Vercel
    (`vercel.json`, variables del proyecto).
12. «Arreglar» `reusePort` en `server/index.ts`: está desactivado en Windows a
    propósito (`SO_REUSEPORT` no existe ahí y `listen()` lanza `ENOTSUP`).

**Ante cualquier duda sobre el alcance de una tarea: preguntar antes de actuar.**

---

## 7. Sesión Actual

> Actualizar este bloque al inicio de cada sesión de trabajo.
> Límite: ~40 líneas. Lo cerrado se mueve a `docs/sprints/`.

```
Fecha del bloque: 2026-10-01
Rama:             diseño-plataforma, sin upstream. 156 commits por delante de
                  origin/main y 2 por delante de origin/staging.

Deuda técnica:    Registro vivo en docs/sprints/deuda-tecnica.md. Consultarlo
                  antes de tocar shared/wordpress (contrato en inglés congelado),
                  el formato de respuesta de /api/* o la estructura de
                  client/src/components; al cerrar un punto, moverlo a
                  "Resueltos" con su commit.

Cerrado y en prod: main = 2e9bd45 "Remove unused database layer". Producción
                  NO tiene todavía el rediseño institucional, la suscripción,
                  el prerender ni el catálogo: todo eso está en staging
                  (preview de Vercel) y en esta rama.
                  - staging: rediseño de home, Nosotros, Qué hacemos, Equipo,
                    Mapa de Ruta, Blog y Podcast; POST /api/suscripcion;
                    prerender + 404 real; /componentes.
                  - esta rama: Node fijado a 22.x y .js en imports de api/;
                    plan de la Etapa 0 de la plataforma; guía de BD;
                    documentación de contexto (esta reestructuración).

Runtime:          Node 22.22.0 local · npm 11.20.0 · engines 22.x

Migraciones:      No aplica. El sitio no tiene BD. La plataforma aún no tiene
                  esquema ni código.

En diseño:        Plataforma SaaS, Etapa 0 (plan draft con decisiones D1–D8;
                  D6 identidad/afiliación pendiente de respuesta).

Archivos OK:      docs/, *.md de contexto (fase 2 de la alineación).
Archivos NO:      Código, dependencias, .env*, vercel.json y estructura de
                  carpetas hasta que empiece la fase 3, punto a punto.

Nota DB local:    No aplica. En local todo funciona sin .env; sin claves de
                  Mailchimp, /api/suscripcion responde 503 (esperado).
                  El puerto 5000 suele estar ocupado: PORT=5001 npm run dev.
```

---

## 8. Prompt de Inicio de Sesión

```
Lee el CLAUDE.md raíz y el CLAUDE.md del paquete en el que trabajaremos hoy.
Confirma que entendiste:

1. El módulo en el que trabajamos hoy: [MODULO]
2. La tarea exacta: [DESCRIPCION]
3. Las convenciones de nomenclatura activas
4. Los archivos que NO debes modificar en esta sesión
5. El criterio de terminado para esta tarea

No escribas código hasta confirmar estos cinco puntos.
Cuando confirmes, muéstrame el plan de implementación en pasos antes de ejecutar.
```

---

## Anexo A. Comandos y entorno

```bash
npm run dev            # Express + Vite HMR en :5000 (PORT=5001 si está ocupado)
npm run build          # assets → cliente → SSR → prerender → servidor (dist/)
npm start              # sirve el build de producción
npm run check          # tsc (client + server + shared + api) + check:assets
npm run lint           # ESLint; lint:fix para corregir
npm run format:check   # Prettier; format para escribir
npm test               # Vitest, una pasada; test:watch en modo vigilancia
```

`npm run check` es la puerta de calidad antes de cualquier commit. Cubre
`api/`: no siempre fue así, y por eso el código de producción pasó tiempo sin
typecheckear. CI ejecuta además lint, formato, tests y build.

- **Windows.** El shell por defecto es PowerShell; hay Git Bash disponible.
- **Node 22** (`.nvmrc` y `engines`, fijado a `22.x`). Vercel desactivó Node
  20 el 1 de octubre de 2026; con `>=20` el deploy cambiaba de versión solo.
- **Los imports relativos de `shared/` y `api/` llevan extensión `.js`**
  (`from "./types.js"`). Vercel no empaqueta la función: transpila archivo a
  archivo y Node ESM exige la extensión; sin ella la función cae con
  `ERR_MODULE_NOT_FOUND`. tsc, Vite, tsx y esbuild resuelven `.js` → `.ts`.
- **El puerto 5000 suele estar ocupado por otro proyecto de esta máquina.**
  Si ves `EADDRINUSE`, no mates el proceso: `PORT=5001 npm run dev`.

## Anexo B. Convenciones de trabajo del sitio

- **La UI está en español.** Todo texto visible, en español. Los comentarios
  de código también. Sin i18n.
- Rutas con `wouter`. Añadir una página = su ruta en `client/src/lib/rutas.ts`
  (`RUTAS_ESTATICAS` o `RUTAS_DINAMICAS`), su componente en `PAGINAS` de
  `client/src/App.tsx` y su título y descripción en `SEO` de
  `client/src/lib/seo.ts`; TypeScript exige los tres. Un `<Route>` suelto se
  salta el test de enlaces muertos.
- Datos con TanStack Query. La `queryKey` es el path del endpoint.
- Alias: `@/` → `client/src/`, `@shared/` → `shared/`, `@assets/` →
  `client/src/assets/`.
- `data-testid` en elementos interactivos y significativos. Mantenlo.
- **Los fallos de WordPress se propagan y salen como 5xx.** `client.ts` lanza y
  `routes.ts` traduce. No lo degrades a `[]`: el cliente necesita distinguir
  «no se pudo cargar» (reintentar) de «no hay artículos» (estado vacío). El
  único `null`/404 legítimo es `/api/posts/:slug` cuando el post no existe.
  La home consume la API solo en `ContenidoReciente`, que oculta el bloque si
  falla y deja el resto intacto; también la consumen `blog.tsx`,
  `blog-post.tsx` y `podcast.tsx`.

### shadcn/ui

`client/src/components/ui/` contiene **solo los componentes en uso** (8). Se
eliminaron 37 sin usar con sus dependencias. Uno nuevo se añade con el CLI de
shadcn (`components.json` ya está configurado) e instalando su dependencia de
Radix, nunca a mano.

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
   en `client/src/catalogo/demos-*.tsx`. Una carpeta nueva en `components/`
   exige añadirla a `CATEGORIAS_POR_CARPETA` del test. Solo `.tsx`.
4. Un componente que deja de usarse se borra: el mismo test lo detecta.

### Verificar el trabajo

Un cambio no está hecho hasta que se ve funcionando:

```bash
npm run check
PORT=5001 npm run dev
curl http://localhost:5001/api/health
curl "http://localhost:5001/api/posts?per_page=2"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5001/no-existe   # dev: 200 (Vite); build: 404
```

El 404 real solo existe en el build (`npm run build && PORT=5002 npm start`);
el servidor de desarrollo de Vite responde 200 a todo.

Para cambios de UI, abrir la ruta afectada en el navegador y mirarla. Las
secciones usan animaciones de entrada de framer-motion: una captura tomada al
instante puede salir en blanco sin que nada esté roto; espera o haz scroll
antes de concluir que hay un fallo.

### Contexto que ahorra tiempo

- `client/src/assets/` solo contiene lo que se usa (lo vigila `check-assets`)
  y ninguna imagen supera 250 KB: pesa ~520 KB (antes ~11 MB). Los nombres con
  timestamp (`Aspal-Icono_1763675356866.webp`) son heredados; los descriptivos
  son los buenos.
- El proyecto nació en Replit y se migró a Vercel. Si encuentras restos de
  Replit, sobran.
- `.superpowers/` es estado local de herramientas, ignorado por git.

---

_ASPAL — CLAUDE.md v2.0 — octubre de 2026_
_Este archivo es el contrato de trabajo del agente. Toda sesión comienza aquí._
