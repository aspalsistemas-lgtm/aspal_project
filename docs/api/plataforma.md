# Catálogo de Endpoints — Plataforma ASPAL

> Fuente de verdad de los contratos HTTP de `apps/plataforma`. Todo endpoint
> nuevo se documenta aquí ANTES de implementarse. Un endpoint que no está aquí
> no existe. La API del sitio tiene su propio catálogo: `endpoints.md`.

Servidor: Fastify 5 con Zod (D3). Validación de entrada y salida con los
esquemas de cada ruta: lo que no cumple el esquema no entra ni sale.

## Convenciones

- Rutas en español, kebab-case, sustantivos en plural, sin verbos ni trailing
  slash; params de ruta en camelCase.
- Respuesta de éxito: `{ success: true, data, meta? }`.
- Respuesta de error: `{ success: false, error: { codigo, mensaje, campo? } }`,
  con códigos en SCREAMING_SNAKE sin tildes (`VALIDACION_FALLIDA`,
  `RECURSO_NO_ENCONTRADO`, `NO_DISPONIBLE`, `ERROR_INTERNO`…).
- Listas con `pagina` · `limite` · `ordenPor` · `direccion` · `buscar`.
- Ninguna respuesta ni log contiene datos personales ni detalles internos
  (cadenas de conexión, trazas, SQL).

## Formato de cada entrada

```
### METODO /ruta
Auth:      público | sesión | rol
Módulo:    carpeta de apps/plataforma/src
Respuestas: status y cuerpo
Notas:     invariantes y por qué
```

---

### GET /health

```
Auth:      público
Módulo:    src/salud
Respuestas:
  200 { "success": true,
        "data": { "estado": "ok", "baseDeDatos": "ok" } }
  503 { "success": false,
        "error": { "codigo": "NO_DISPONIBLE",
                   "mensaje": "La base de datos no responde" } }
```

Notas:

- Lo consultan el `healthcheck` del contenedor y, cuando exista, el balanceador
  de la nube. Por eso va sin prefijo `/api` y sin autenticación.
- Comprueba PostgreSQL con `SELECT 1` y un tiempo máximo de 2 s: una base que
  tarda más se da por caída. Sin base, la plataforma no sirve nada útil, así
  que el 503 hace que el orquestador deje de mandarle tráfico.
- No devuelve versiones, nombres de host ni el error de la base.
- Etapa 1, corte 1 (plan de la Etapa 0, sección 8).

---

## Resolución de la asociación por subdominio

Cada petición se atiende en nombre de la asociación de su `Host`:
`<subdominio>.<DOMINIO_BASE>` (`aspal.localhost` en local,
`aspal.asociacionesprofesionales.org` en la nube). Reglas:

- El `Host` debe terminar en `.` + `DOMINIO_BASE`: `aspal.evillocalhost` no
  resuelve. Se ignoran el puerto, el punto final y las mayúsculas.
- Un solo nivel: `a.b.localhost` no resuelve. Tampoco un host sin subdominio
  ni un subdominio reservado.
- `X-Forwarded-Host` se ignora.
- El contexto de aislamiento (RLS) sale **solo** de esta resolución hecha en el
  servidor, nunca de un parámetro de la petición.

### GET /asociaciones/actual

```
Auth:      público
Módulo:    src/asociaciones
Respuestas:
  200 { "success": true,
        "data": { "nombre": "ASPAL", "subdominio": "aspal",
                  "zonaHoraria": "America/Merida" } }
  404 { "success": false,
        "error": { "codigo": "RECURSO_NO_ENCONTRADO",
                   "mensaje": "No hay una asociación en esta dirección" } }
Cabeceras: Cache-Control: private, no-store
```

Notas:

- Demuestra la resolución por subdominio (Etapa 1, corte 2). La página pública
  con marca llega cuando se decida D13.
- No expone el `id` interno de la asociación.
- `no-store`: la respuesta depende del `Host`; una caché compartida no debe
  servir la de una asociación a otra.

---

## Acceso: sesiones, roles y estados (Etapa 1, corte 3a)

Plan: `docs/plans/2026-10-16-001-feat-plataforma-corte-3-acceso-plan.md`. Las
cuentas son **independientes por asociación**: el mismo correo en dos
asociaciones son dos cuentas distintas.

### Convenciones de este grupo

**Categorías de ruta.** Toda ruta declara una:

| Categoría                 | Requiere asociación (por `Host`) | Requiere sesión | Ejemplos                        |
| ------------------------- | -------------------------------- | --------------- | ------------------------------- |
| **global**                | no                               | no              | `GET /health`                   |
| **pública de asociación** | sí                               | no              | `POST /sesiones`                |
| **autenticada**           | sí                               | sí              | `GET /sesiones/actual`, `PUT …` |

Una ruta sin categoría no se registra.

**Cookie de sesión.** `__Host-aspal_sesion` (`HttpOnly`, `Secure`,
`SameSite=Lax`, `Path=/`, sin `Domain`). En local sobre `http`
(`ESQUEMA_PUBLICO=http`, solo con `DOMINIO_BASE` terminado en `.localhost`) el
nombre es `aspal_sesion` y no lleva `Secure`. El valor es un secreto aleatorio de
32 bytes; en la base solo se guarda su SHA-256.

**Peticiones con efecto** (`POST`, `PUT`, `PATCH`, `DELETE`): exigen
`Content-Type: application/json` y un `Origin` **idéntico** (esquema, host y
puerto) al de la asociación resuelta por el `Host`; si llega `Sec-Fetch-Site`,
debe ser `same-origin`. Sin `Origin`, `403 ORIGEN_NO_PERMITIDO`; sin JSON,
`415 TIPO_NO_ADMITIDO`.

**Cabeceras de toda respuesta** (salvo `/health`):
`Cache-Control: private, no-store` y `Vary: Host, Cookie`.

**Errores nuevos** (códigos en el sobre único):

| Código                       | Status | Cuándo                                                                  |
| ---------------------------- | ------ | ----------------------------------------------------------------------- |
| `NO_AUTENTICADO`             | 401    | Sin sesión válida (cookie ausente, desconocida, caducada o revocada)    |
| `CREDENCIALES_INVALIDAS`     | 401    | Entrada rechazada, **sea cual sea el motivo** (misma respuesta siempre) |
| `PROHIBIDO`                  | 403    | La persona no puede hacer la acción (`puede()` deniega)                 |
| `ORIGEN_NO_PERMITIDO`        | 403    | `Origin` ausente o distinto del de la asociación                        |
| `TIPO_NO_ADMITIDO`           | 415    | La petición con efecto no es `application/json`                         |
| `DEMASIADOS_INTENTOS`        | 429    | Límite de intentos; lleva `Retry-After`                                 |
| `NO_DISPONIBLE`              | 503    | Cola de hashes llena o base de datos sin responder                      |
| `ULTIMO_ADMINISTRADOR`       | 409    | El cambio dejaría la asociación sin un administrador activo             |
| `PERSONA_NO_ACTIVA`          | 409    | Se intenta dar un rol a una persona suspendida o de baja                |
| `CAMBIO_PROPIO_NO_PERMITIDO` | 403    | Nadie cambia sus propios roles ni su propio estado                      |

Ninguna respuesta lleva hashes, tokens ni `id` internos de cuentas o sesiones.

### POST /sesiones

```
Categoría:  pública de asociación
Cuerpo:     { "correo": string, "contrasena": string }
Respuestas:
  200 { "success": true,
        "data": { "persona": { "nombre": "…" },
                  "roles": ["administrador"],
                  "expiraEn": "2026-10-16T22:00:00.000Z" } }
      + Set-Cookie de sesión (sesión nueva)
  401 CREDENCIALES_INVALIDAS    429 DEMASIADOS_INTENTOS
  400 VALIDACION_FALLIDA        503 NO_DISPONIBLE
  403 ORIGEN_NO_PERMITIDO       415 TIPO_NO_ADMITIDO
  404 RECURSO_NO_ENCONTRADO     (el Host no es de ninguna asociación)
```

Notas:

- **Un solo `401` para todo:** correo inexistente, contraseña errónea, cuenta sin
  contraseña, persona suspendida o dada de baja. Todas las ramas ejecutan
  **exactamente un scrypt**.
- Se entra solo si la persona está `activa` en **esta** asociación.
- La sesión se crea solo si la versión de credencial de la cuenta no cambió
  durante la verificación (una contraseña cambiada a mitad deja **cero** sesiones).
- Cada entrada crea una sesión **nueva**; nunca se acepta un identificador de
  sesión del cliente. Máximo 10 sesiones vivas por cuenta (se revoca la más
  antigua).
- Caducidad por inactividad y absoluta; para `administrador` y `gestor`, más
  corta (2 h y 12 h) que para el resto (8 h y 7 días).

### GET /sesiones/actual

```
Categoría:  autenticada
Respuestas:
  200 { "success": true,
        "data": { "persona": { "nombre": "…" },
                  "roles": ["miembro"],
                  "expiraEn": "…" } }
  401 NO_AUTENTICADO
```

### DELETE /sesiones/actual

```
Categoría:  autenticada
Respuestas:
  200 { "success": true, "data": {} }  + Set-Cookie que borra la cookie
  401 NO_AUTENTICADO
```

Después, el mismo token no sirve.

### PUT /personas/:personaId/roles

```
Categoría:  autenticada · acción roles:asignar (solo administrador)
Cuerpo:     { "roles": ["gestor", "miembro"] }   (1 a 4 roles válidos, sin repetir)
Respuestas:
  200 { "success": true, "data": { "roles": ["gestor", "miembro"] } }
  403 PROHIBIDO · CAMBIO_PROPIO_NO_PERMITIDO
  404 RECURSO_NO_ENCONTRADO   (la persona no existe en esta asociación)
  409 ULTIMO_ADMINISTRADOR · PERSONA_NO_ACTIVA
  400 VALIDACION_FALLIDA
```

Notas:

- Sustituye el conjunto de roles de la persona; los retirados quedan con
  `revocado_en` y `revocado_por`, los nuevos con `asignado_por`.
- Toma un bloqueo por asociación y **recuenta los administradores activos tras el
  bloqueo**: dos administradores que se quitan el rol a la vez dejan exactamente
  uno.
- Revoca todas las sesiones de la persona afectada (vuelve a entrar con sus roles
  nuevos).
- Una persona de **otra** asociación responde `404`, nunca `403`: no se revela su
  existencia.

### PUT /personas/:personaId/estado

```
Categoría:  autenticada · acción personas:cambiar_estado (solo administrador)
Cuerpo:     { "estado": "activa" | "suspendida" | "baja" }
Respuestas:
  200 { "success": true, "data": { "estado": "suspendida" } }
  403 PROHIBIDO · CAMBIO_PROPIO_NO_PERMITIDO
  404 RECURSO_NO_ENCONTRADO
  409 ULTIMO_ADMINISTRADOR
  400 VALIDACION_FALLIDA
```

Notas:

- Suspender o dar de baja sube la versión de credencial de la cuenta y revoca
  todas sus sesiones en la misma transacción.
- **Baja:** se retiran todos sus roles, se conserva el correo (la persona no
  puede volver a registrarse) y se anonimiza el nombre. En este corte la baja es
  **definitiva**: reactivar a una persona de baja no existe todavía.
- `suspendida` → `activa` sí se permite.
- Misma regla del último administrador y mismo bloqueo por asociación que en los
  roles.
