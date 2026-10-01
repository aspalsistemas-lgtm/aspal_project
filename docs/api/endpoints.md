# Catálogo de Endpoints — ASPAL

> Fuente de verdad de los contratos HTTP. Todo endpoint nuevo se documenta aquí
> ANTES de implementarse. Un endpoint que no está aquí no existe.
> Prefijo global: `/api` (sin versión).

Todos los endpoints son públicos: no hay autenticación. Los registra `shared/`
(`registerApiRoutes` y `registrarRutasSuscripcion`) y los montan
`server/index.ts` y `api/index.ts`. En Vercel, `/api/(.*)` se reescribe a la
función serverless (`vercel.json`).

## Convenciones

- **Existentes:** conservan su contrato tal cual está aquí (decisión de octubre
  de 2026). No se migran.
- **Nuevos:** rutas en español, kebab-case, sustantivos en plural, sin verbos ni
  trailing slash; params de ruta en camelCase; respuestas
  `{ success: true, data, meta? }` o
  `{ success: false, error: { codigo, mensaje, campo? } }`; listas con
  `pagina` · `limite` · `ordenPor` · `direccion` · `buscar`.
- Los fallos de WordPress salen como 5xx, nunca como lista vacía.
- Ninguna respuesta ni log contiene datos personales.

## Formato de cada entrada

```
### METODO /ruta/:param
Auth:      público
Módulo:    [carpeta de shared/]
Body:      [forma o "ninguno"]
Query:     [params aceptados o "ninguno"]
Respuesta: [código] + forma del cuerpo y cabeceras
Errores:   [código HTTP · cuerpo]
```

---

## WordPress (`shared/wordpress/routes.ts`)

### GET /api/posts

Auth: público
Módulo: wordpress
Body: ninguno
Query: `per_page` (1–100, por defecto 6) · `page` (≥ 1, por defecto 1). Valores
no numéricos caen al defecto; fuera de rango se acotan.
Respuesta: 200 + `TransformedPost[]` (artículos sin la categoría `podcast`,
ordenados como los devuelve WordPress) · cabecera `X-Total-Count` con el total
de la colección.
Errores: 500 · `{ "error": "Failed to fetch posts" }` si WordPress falla.

### GET /api/posts/:slug

Auth: público
Módulo: wordpress
Body: ninguno
Query: ninguno
Respuesta: 200 + `TransformedPost`. Si `isGated` es `true`, `content` es el
muro de MemberPress y `readingMinutes` es 0: el cliente no pinta ni uno ni otro.
Errores: 404 · `{ "error": "Post not found" }` (el post no existe; es el único
404 legítimo) · 500 · `{ "error": "Failed to fetch post" }`.

### GET /api/podcasts

Auth: público
Módulo: wordpress
Body: ninguno
Query: `per_page` · `page` (igual que `/api/posts`)
Respuesta: 200 + `TransformedPost[]` de la categoría `podcast` · cabecera
`X-Total-Count`. Si la categoría no existe en WordPress, lista vacía con total 0
(no es un error). Cada petición hace dos llamadas a WordPress: resolver el id de
la categoría por slug y pedir los posts.
Errores: 500 · `{ "error": "Failed to fetch podcasts" }`.

### GET /api/health

Auth: público
Módulo: wordpress
Body: ninguno
Query: ninguno
Respuesta: 200 + `{ "status": "ok" }`. No consulta WordPress.
Errores: ninguno

#### Forma de `TransformedPost`

Definida en `shared/wordpress/types.ts`; el cliente la importa, nunca la
redeclara.

| Campo            | Tipo       | Notas                                                                   |
| ---------------- | ---------- | ----------------------------------------------------------------------- |
| `id`             | `number`   | id de WordPress                                                         |
| `title`          | `string`   | sin HTML, entidades decodificadas                                       |
| `slug`           | `string`   |                                                                         |
| `excerpt`        | `string`   | texto plano, máximo 200 caracteres, «…» solo si se truncó               |
| `content`        | `string`   | HTML crudo                                                              |
| `featuredImage`  | `string`   | `wp:featuredmedia` o primer `<img>` del contenido; `""` si no hay       |
| `category`       | `string`   | primera categoría; `"General"` por defecto                              |
| `categorySlugs`  | `string[]` | todas las categorías                                                    |
| `publishedAt`    | `string`   | ISO 8601 con zona explícita (de `date_gmt` + `Z`)                       |
| `isGated`        | `boolean`  | WordPress sirvió el muro de MemberPress                                 |
| `readingMinutes` | `number`   | sobre el texto limpio, 200 ppm; `0` = sin dato fiable (contenido gated) |
| `author`         | `string`   | `"ASPAL"` por defecto                                                   |
| `link`           | `string`   | URL del post en WordPress                                               |

---

## Suscripción (`shared/suscripcion/rutas.ts`)

### POST /api/suscripcion

Auth: público
Módulo: suscripcion
Body: JSON obligatorio (`Content-Type: application/json`):

```json
{
  "correo": "ana@ejemplo.org",
  "consentimiento": true,
  "origen": "unete | home | footer | eventos",
  "nombre": "opcional (obligatorio si origen = unete)",
  "pais": "opcional, de la lista PAISES (obligatorio si origen = unete)",
  "organizacion": "opcional",
  "cargo": "opcional",
  "sitioWeb": "campo trampa: debe ir vacío"
}
```

Validación en `shared/suscripcion/validacion.ts`, la misma que ejecuta el
formulario antes de enviar: correo normalizado a minúsculas y ≤ 254
caracteres, textos recortados (nombre 100, organización 150, cargo 100) y sin
caracteres de control, `consentimiento` estrictamente `true`.
Query: ninguno
Respuesta: 200 + `{ "ok": true }`. Alta de solo creación en Mailchimp con
`status: "pending"` (doble confirmación) y etiqueta `origen:<origen>`. Un
miembro existente, pendiente, dado de baja u olvidado recibe el mismo 200 y no
se modifica. Si el campo trampa viene relleno, 200 sin llamar a Mailchimp. Si
el etiquetado falla, el alta ya ocurrió y se responde 200.
Errores:

- 400 · `{ "ok": false, "errores": { "<campo>": "<mensaje>" } }` por campo
  (`correo`, `nombre`, `pais`, `consentimiento`, `origen`).
- 415 · `{ "ok": false, "error": "tipo_no_admitido" }` si no es JSON.
- 502 · `{ "ok": false, "error": "proveedor" }` si Mailchimp responde mal, hay
  fallo de red o se superan los 4 s por llamada.
- 503 · `{ "ok": false, "error": "no_configurada" }` si faltan
  `MAILCHIMP_API_KEY` o `MAILCHIMP_AUDIENCE_ID`.

Pendiente antes del lanzamiento: rate limit en el Vercel Firewall; el endpoint
no limita por IP.

---

## Middleware de error (`server/index.ts`, `api/index.ts`)

Cualquier excepción que escape de un handler responde con el `status` del
error (o 500) y `{ "message": "<mensaje>" }`. En la práctica no se alcanza:
cada handler captura sus errores.

---

## Plantilla para endpoints nuevos

```
### METODO /api/recursos/:recursoId
Auth:      público
Módulo:    [shared/<modulo>]
Body:      `{ ... }` o ninguno
Query:     pagina, limite, buscar
Respuesta: 200 + `{ success: true, data: Entidad[], meta: { total, pagina, limite, totalPaginas } }`
           201 + `{ success: true, data: Entidad }` al crear
Errores:   VALIDACION_FALLIDA (400) · RECURSO_NO_ENCONTRADO (404) · ERROR_INTERNO (500)
```
