# ASPAL Server — Convenciones y Reglas

> Complementa el CLAUDE.md raíz. Se aplica a todo archivo bajo `server/`, `api/`
> y `shared/`: el backend del sitio es la suma de los tres.
> Última actualización: octubre de 2026

> Librerías externas del stack (refleja la sección 2 «Stack» del raíz):
> Express 4 · `fetch` nativo de Node 22 · tsx (desarrollo) · esbuild (bundle) ·
> Vite (middleware en desarrollo) · nanoid (solo `server/vite.ts`).

---

## 1. Estructura

No hay capa routes/controller/service. Dos módulos de lógica en `shared/` y
dos consumidores que solo hacen wiring:

```
shared/
├── wordpress/
│   ├── types.ts        ← WPPost (crudo) · TransformedPost (normalizado) · CABECERA_TOTAL
│   ├── transform.ts    ← normalización: limpiar HTML, entidades, extracto, fecha UTC,
│   │                      detección del muro de MemberPress, minutos de lectura
│   ├── client.ts       ← fetch contra WordPress            [SOLO SERVIDOR: process.env]
│   ├── routes.ts       ← registerApiRoutes(app): /api/posts, /api/posts/:slug,
│   │                      /api/podcasts, /api/health
│   └── *.test.ts
└── suscripcion/
    ├── tipos.ts        ← ORIGENES, PAISES, CAMPO_TRAMPA, SuscripcionValida…   [puro]
    ├── validacion.ts   ← validarSuscripcion, esTrampa (misma función en navegador) [puro]
    ├── mailchimp.ts    ← suscribir(): alta en Mailchimp     [SOLO SERVIDOR: process.env]
    ├── rutas.ts        ← registrarRutasSuscripcion(app): POST /api/suscripcion
    └── *.test.ts

server/
├── index.ts    ← Express de desarrollo y self-hosted: json, log de /api, monta las dos
│                  funciones de registro, Vite (dev) o estáticos (prod), listen
├── static.ts   ← serveStatic(): HTML prerenderizado, spa.html, 404 real, redirección de
│                  barra final, caché inmutable de /assets y /fuentes
├── vite.ts     ← setupVite() y log()
└── *.test.ts   ← static.test.ts (Express en puerto libre) · vercel.test.ts (vercel.json)

api/
└── index.ts    ← función serverless de Vercel: json + las dos funciones de registro
```

Reglas de separación:

- Lógica de negocio y llamadas externas → SOLO en `shared/`.
- `req` y `res` → SOLO en `routes.ts`/`rutas.ts` y en `server/`.
- Validación de entrada → en el módulo (`validacion.ts`, `enteroAcotado`), se
  ejecuta en el handler.
- Tipos que también usa el cliente → en los módulos puros (`types.ts`,
  `tipos.ts`, `validacion.ts`). Los módulos que leen `process.env` no se
  importan desde `client/`.
- `server/index.ts` y `api/index.ts` deben montar lo mismo. `rutas.test.ts`
  comprueba que ambos llaman a `registrarRutasSuscripcion(app)`.
- Imports relativos de `shared/` y `api/` con extensión `.js`.

### Idioma

`shared/wordpress/` está en inglés (`fetchPosts`, `transformPost`,
`registerApiRoutes`, campos de `TransformedPost`) y así se queda: es un
contrato que consume el cliente. `shared/suscripcion/` y todo lo nuevo, en
español sin tildes (`registrarRutasSuscripcion`, `validarSuscripcion`).

---

## 2. Datos

**El sitio no tiene base de datos ni persistencia.** No hay esquema,
migraciones, soft delete ni aislamiento por inquilino que mantener aquí.

- Todo el contenido se pide a WordPress en cada petición; no hay caché de
  servidor.
- La suscripción no guarda nada: el dato vive en Mailchimp.
- Si una tarea del sitio parece necesitar persistencia, se confirma antes
  (`CLAUDE.md` §6, punto 1).

La **plataforma SaaS** sí tendrá PostgreSQL. Cualquier dato persistente de la
plataforma se rige por `docs/database-design.md`: inspección previa,
normalización, aislamiento por asociación, propuesta de la sección 6 antes de
escribir una migración, y nunca ejecutar migraciones contra una base real sin
permiso.

### 2.1 Paginación en listas

`/api/posts` y `/api/podcasts` paginan siempre:

```typescript
// shared/wordpress/routes.ts
perPage: enteroAcotado(req.query.per_page, 6, 1, 100), // 100 = máximo de WordPress
page:    enteroAcotado(req.query.page, 1, 1, Number.MAX_SAFE_INTEGER),
```

El cuerpo es la lista de la página; el total de la colección va en la cabecera
`X-Total-Count` (`CABECERA_TOTAL`, de `X-WP-Total`). Si WordPress no manda el
total, se usa la longitud de la página.

---

## 3. Formato de Respuestas del API

### 3.1 Endpoints existentes: contrato congelado

Decisión de octubre de 2026: lo que ya existe conserva su forma. No se
migra.

```typescript
// GET /api/posts · GET /api/podcasts — lista cruda + cabecera
TransformedPost[]                       // 200, X-Total-Count: <total>
{ "error": "Failed to fetch posts" }    // 500

// GET /api/posts/:slug
TransformedPost                         // 200
{ "error": "Post not found" }           // 404
{ "error": "Failed to fetch post" }     // 500

// GET /api/health
{ "status": "ok" }                      // 200

// POST /api/suscripcion
{ "ok": true }                                          // 200 (también a los bots)
{ "ok": false, "errores": { "correo": "…", … } }        // 400, por campo
{ "ok": false, "error": "tipo_no_admitido" }            // 415
{ "ok": false, "error": "no_configurada" }              // 503
{ "ok": false, "error": "proveedor" }                   // 502

// Middleware de error de Express (server/index.ts y api/index.ts)
{ "message": "…" }                      // status del error o 500
```

### 3.2 Endpoints nuevos: sobre único

Todo endpoint que se añada a partir de ahora responde:

```typescript
// Éxito — objeto
{ "success": true, "data": { ... } }

// Éxito — lista con paginación
{ "success": true, "data": [...], "meta": { "total": 150, "pagina": 1, "limite": 20, "totalPaginas": 8 } }

// Error
{ "success": false, "error": { "codigo": "RECURSO_NO_ENCONTRADO", "mensaje": "...", "campo": "recursoId" } }
```

Códigos de error (SCREAMING_SNAKE sin tildes). Base:

```
VALIDACION_FALLIDA · RECURSO_NO_ENCONTRADO · TIPO_NO_ADMITIDO · NO_CONFIGURADO
PROVEEDOR_NO_DISPONIBLE · ERROR_INTERNO
```

Y se documenta en `docs/api/endpoints.md` antes de implementarse.

---

## 4. Manejo de Errores

Hoy no hay `ErrorDeAplicacion` ni middleware que formatee errores de dominio:
cada handler tiene su `try/catch` y traduce. Las únicas clases propias están en
`shared/suscripcion/mailchimp.ts`:

```typescript
SuscripcionNoConfigurada; // faltan MAILCHIMP_API_KEY / MAILCHIMP_AUDIENCE_ID → 503
ErrorProveedor(estado, operacion); // Mailchimp respondió mal, timeout (504) o red (502) → 502
```

Reglas vigentes:

- Los fallos de WordPress **se propagan** desde `client.ts` (`throw`) y
  `routes.ts` los traduce a 500. Nunca degradar a `[]` o `null`: el único
  `null` legítimo es «el post no existe» (404).
- Los mensajes de error no llevan datos personales ni detalles internos: el
  mensaje de `ErrorProveedor` es «Mailchimp respondió N al <operación>».
- Los logs de `console.error` tampoco: `rutas.test.ts` comprueba que el correo
  no aparece.
- El middleware de error de Express responde `{ message }` con el status del
  error o 500. El de `server/index.ts` además relanza (`throw err`) para que
  salga en consola; el de `api/index.ts` no. Esa diferencia está en la deuda.
- Para endpoints nuevos (§3.2), crear la clase `ErrorDeAplicacion(codigo,
status, mensaje, campo?)` en `shared/` y un middleware que la formatee al
  sobre único, antes de repetir `try/catch` por handler.

---

## 5. Seguridad

No hay autenticación, tokens, roles ni middlewares de autorización: todos los
endpoints son públicos. Lo que sí se protege:

- **Entrada:** `enteroAcotado` en paginación; `validarSuscripcion` recorta
  longitudes, elimina caracteres de control y de dirección, exige
  `consentimiento === true` (booleano, no texto) y solo acepta países y
  orígenes de la lista. Un correo de 50 000 caracteres se rechaza en < 50 ms
  (test de ReDoS).
- **Envíos entre sitios:** `POST /api/suscripcion` exige
  `Content-Type: application/json` (415 si no). Un formulario HTML de otro
  dominio no puede mandarlo sin CORS.
- **Bots:** campo trampa `sitioWeb`; al bot se le responde como a una persona.
- **Redirección abierta:** `server/static.ts` normaliza barras iniciales e
  invertidas antes de redirigir (`//evil.com/` → `/evil.com`); los casos están
  en `static.test.ts`.
- **Secretos:** solo en variables de entorno (Vercel → Settings → Environment
  Variables). Nunca en el repo ni en el bundle del cliente.
- **Tiempo máximo:** 4 s por llamada a Mailchimp (`AbortSignal.timeout`),
  dentro de los 10 s de la función de Vercel.
- **Pendiente antes del lanzamiento:** regla de rate limit en el Vercel
  Firewall para `POST /api/suscripcion` (el endpoint no limita por IP). La
  regla concreta, 10 peticiones por IP cada 10 minutos con 429 al superarlo,
  está en `docs/api/endpoints.md`; se aplica desde el panel de Vercel, no
  desde el repo.

---

## 6. Convenciones de Endpoints

Ver catálogo completo en `docs/api/endpoints.md`.

**Reglas base:**

```
Prefijo:    /api/ (sin versión)
Existentes: posts, posts/:slug, podcasts, health (inglés) · suscripcion (español)
Nuevos:     español, kebab-case, sustantivos en plural, sin trailing slash,
            sin verbo en URL; params de ruta en camelCase
```

**Verbos HTTP:**

```
GET    leer (sin side effects, sin body)
POST   crear o enviar → 200 hoy (suscripcion); 201 + recurso en endpoints nuevos
```

No hay PATCH ni DELETE: el sitio no tiene recursos propios que modificar.

**Códigos HTTP en uso:**

```
200 OK                 400 validación fallida      404 post inexistente
415 no es JSON         500 fallo de WordPress      502 fallo de Mailchimp
503 Mailchimp sin configurar
```

**Visibilidad:**

```
/api/*             Sin auth. Público. Sin rate limit propio (pendiente en Vercel Firewall)
/api/health        Sin auth. Siempre disponible
```

**Query params existentes:** `per_page` · `page`. Para listas nuevas: `pagina`
· `limite` · `ordenPor` · `direccion` · `buscar`.

**Rewrites de Vercel** (`vercel.json`, vigilado por `vercel.test.ts`):
`/api/(.*)` → la función; `/blog/:slug` → `spa.html`; el resto son HTML
prerenderizados o `404.html`. `server/static.ts` aplica las mismas reglas.

---

## 7. Tests

```typescript
// Vitest, entorno node. Nombres de describe/it en español, en presente.
describe("validarSuscripcion", () => {
  it("normaliza el correo: sin espacios y en minúsculas", () => {
    const r = validarSuscripcion({ ...completa, correo: "  Ana@Ejemplo.ORG " });
    expect(r.ok && r.datos.correo).toBe("ana@ejemplo.org");
  });
});
```

Reglas:

- Un `.test.ts` junto a cada módulo de lógica de `shared/` y de `server/`.
- `fetch` y `process.env` se mockean (`vi.stubGlobal`, `vi.stubEnv`,
  `vi.unstubAllEnvs` en `afterEach`). Nunca red ni servicios reales.
- Las rutas se prueban levantando Express en un puerto libre
  (`app.listen(0)`), con `fetch` contra `127.0.0.1`; `static.test.ts` usa un
  socket crudo para reproducir rutas con `\`.
- Los tests que vigilan contratos entre archivos (`rutas.test.ts` «montaje»,
  `vercel.test.ts`) leen el disco: si mueves un archivo, actualízalos.
- Sin umbral de cobertura configurado. Decidirlo está en la deuda (P4).
- `tsconfig.json` excluye `**/*.test.ts`: los tests no se typechequean (deuda
  P3).

---

## 8. Documentación Inline (JSDoc)

Obligatorio en funciones exportadas de `shared/` y tipos exportados. Español.
Explicar la invariante o el porqué, no narrar el código:

```typescript
/**
 * Fecha de publicación en UTC explícito.
 *
 * WordPress devuelve `date_gmt` sin sufijo de zona (`2026-08-05T10:30:00`),
 * y `new Date()` lo interpretaría como hora local del navegador: la fecha
 * mostrada podía diferir un día entre husos latinoamericanos.
 */
```

Los módulos solo-servidor llevan en cabecera «MÓDULO SOLO-SERVIDOR» y por qué.

---

## 9. Variables de Entorno

El servidor **no** valida variables al arrancar: todas tienen valor por
defecto salvo las de Mailchimp, y sin ellas `POST /api/suscripcion` responde
503 en cada petición (decisión D8: nunca un éxito falso). `.env.example` es la
referencia; copiarlo a `.env` es opcional.

```bash
# Servidor
PORT=5000                # Express; en esta máquina usar 5001
NODE_ENV=development     # activa Vite/HMR; cualquier otro valor sirve dist/

# Contenido
WP_API_BASE=             # default: https://comunidad.asociacionesprofesionales.org/wp-json/wp/v2

# Boletín (solo nombres; los valores en Vercel)
MAILCHIMP_API_KEY=       # termina en el centro de datos: "…-us21"
MAILCHIMP_AUDIENCE_ID=
```

En la audiencia de Mailchimp: campos de texto `PAIS`, `ORG` y `CARGO` además
de `FNAME`, y la doble confirmación activada.

---

_ASPAL Server CLAUDE.md v1.0 — octubre de 2026_
