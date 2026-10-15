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
un `Origin` **idéntico** (esquema, host y puerto) al de la asociación resuelta
por el `Host`; si llega `Sec-Fetch-Site`, debe ser `same-origin`. Sin `Origin`,
`403 ORIGEN_NO_PERMITIDO`. Las que llevan cuerpo (`POST`, `PUT`, `PATCH`)
exigen además `Content-Type: application/json`, o `415 TIPO_NO_ADMITIDO`;
`DELETE` no lleva cuerpo y no lo exige.

**Rutas autenticadas sin cookie.** Responden `401 NO_AUTENTICADO` antes de
validar el cuerpo: quien no ha entrado no recibe un `400` distinto según lo que
mande.

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
  409 ULTIMO_ADMINISTRADOR · PERSONA_NO_ACTIVA (la persona está de baja)
  400 VALIDACION_FALLIDA
```

Notas:

- Suspender o dar de baja sube la versión de credencial de la cuenta y revoca
  todas sus sesiones en la misma transacción.
- **Baja:** se retiran todos sus roles, se conserva el correo (la persona no
  puede volver a registrarse) y se anonimiza el nombre. En este corte la baja es
  **definitiva**: reactivar a una persona de baja no existe todavía.
- `suspendida` → `activa` sí se permite. Desde `baja` a cualquier otro estado
  responde `409 PERSONA_NO_ACTIVA`; pedir el estado que ya tiene es una
  operación sin efecto (`200`).
- Tras el bloqueo se revalida que quien actúa sigue siendo administrador
  activo: si lo perdió mientras esperaba, `403 PROHIBIDO`.
- Misma regla del último administrador y mismo bloqueo por asociación que en los
  roles.

## Correo: registro, recuperación e invitaciones (Etapa 1, corte 3b)

Plan: `docs/plans/2026-10-16-001-feat-plataforma-corte-3-acceso-plan.md`
(CA-22 a CA-26). El **enlace mágico queda fuera** de este corte (decisión del
2026-10-17).

### Convenciones de este grupo

- **Tokens de un solo uso.** 32 bytes aleatorios en base64url (43 caracteres); en la
  base solo se guarda su SHA-256. Viajan en el **fragmento** del enlace
  (`https://<subdominio>.<dominio>/<ruta>#<token>`), nunca en la query, y el
  cliente los manda en el **cuerpo** de un `POST`. Las rutas de los enlaces las
  consumirá la interfaz (aún no existe): `/registro`, `/recuperar-contrasena` y
  `/invitacion`.
- **Los enlaces se construyen** solo con `ESQUEMA_PUBLICO`, `DOMINIO_BASE`, el
  puerto público y el subdominio ya resuelto; nunca con cabeceras de la petición.
- **Caducidad:** registro 24 h · recuperación 1 h · invitación 7 días.
- **Respuesta uniforme de las solicitudes.** `POST /registros` y
  `POST /solicitudes-recuperacion` responden siempre `202 { "success": true,
"data": {} }`, exista o no la cuenta, esté o no abierto el registro, se envíe o
  no el correo. Nunca revelan nada. El envío no bloquea la respuesta.
- **Enlace inválido.** Un token desconocido, caducado, usado o de otra asociación
  responde siempre el mismo `400 ENLACE_INVALIDO`. El token se valida **antes** de
  hashear la contraseña: tokens inventados cuestan cero scrypt.
- **Presupuestos de envío** (por asociación, separados por tipo; agotar uno no
  afecta a los demás): registro y recuperación, por destinatario (correo
  normalizado) y por origen, más un tope diario; avisos aparte; invitaciones por
  administrador. Una solicitud nueva **no invalida** los enlaces vigentes (hasta 3
  por correo): el límite solo frena el envío.
- **Plantillas fijas:** solo llevan el nombre de la asociación, el enlace y texto
  fijo; ningún campo libre de quien solicita.

**Errores nuevos:**

| Código                   | Status | Cuándo                                                       |
| ------------------------ | ------ | ------------------------------------------------------------ |
| `ENLACE_INVALIDO`        | 400    | Token desconocido, caducado, usado, revocado o de otra asoc. |
| `CONTRASENA_NO_ADMITIDA` | 400    | Incumple la política (12–200, no común, no igual al correo)  |
| `TERMINOS_NO_ACEPTADOS`  | 400    | Falta `aceptaTerminos: true`                                 |
| `CUENTA_EXISTENTE`       | 409    | Invitar a un correo que ya tiene cuenta en la asociación     |
| `INVITACION_DUPLICADA`   | 409    | Ya hay una invitación pendiente para ese correo y ese rol    |
| `DEMASIADOS_INTENTOS`    | 429    | Tope de invitaciones del día (lleva `Retry-After`)           |

### POST /registros

```
Categoría:  pública de asociación
Cuerpo:     { "correo": string }
Respuestas: 202 { "success": true, "data": {} }
            400 VALIDACION_FALLIDA · 403 ORIGEN_NO_PERMITIDO
            415 TIPO_NO_ADMITIDO · 404 (el Host no es de ninguna asociación)
```

- **No crea ninguna cuenta.** Si la asociación tiene `registro_abierto`, el correo
  es válido y hay presupuesto, guarda un registro pendiente y envía el enlace.
- Si el correo **ya tiene cuenta** (también si su persona está suspendida o de
  baja), envía un aviso en lugar del enlace.

### POST /registros/confirmar

```
Categoría:  pública de asociación
Cuerpo:     { "token": string, "nombre": string (2–120),
              "contrasena": string, "aceptaTerminos": true }
Respuestas: 200 { "success": true,
                  "data": { "persona": { "nombre": "…" }, "roles": ["miembro"],
                            "expiraEn": "…" } }
                + Set-Cookie de sesión
            400 ENLACE_INVALIDO · CONTRASENA_NO_ADMITIDA · TERMINOS_NO_ACEPTADOS
                · VALIDACION_FALLIDA
```

- Crea la persona (rol `miembro`) y la cuenta con el **correo verificado** y la
  versión de los términos aceptados, y abre sesión.
- Es **una sola sentencia atómica**: 20 confirmaciones simultáneas con el mismo
  token dan exactamente 1 cuenta y 19 `ENLACE_INVALIDO` idénticos. Consumir marca
  **todos** los pendientes de ese correo.
- La política de contraseña se comprueba antes de consumir el token: una
  contraseña rechazada no lo gasta.

### POST /solicitudes-recuperacion

```
Categoría:  pública de asociación
Cuerpo:     { "correo": string }
Respuestas: 202 { "success": true, "data": {} }  · 400 · 403 · 415 · 404
```

Envía el enlace solo si existe la cuenta, su persona está **activa** y hay
presupuesto. En cualquier otro caso no envía nada y responde igual.

### POST /restablecimientos-contrasena

```
Categoría:  pública de asociación
Cuerpo:     { "token": string, "contrasena": string }
Respuestas: 200 { "success": true, "data": {} }
            400 ENLACE_INVALIDO · CONTRASENA_NO_ADMITIDA · VALIDACION_FALLIDA
```

- Token de un solo uso (1 h). Cambia la contraseña, **sube la versión de
  credencial, revoca todas las sesiones** y avisa por correo del cambio. No abre
  sesión: la persona entra después con `POST /sesiones`.
- Una cuenta sin contraseña fija una con el buzón verificado.
- Si la persona no está activa, responde `ENLACE_INVALIDO`.

### POST /invitaciones

```
Categoría:  autenticada · acción invitaciones:gestionar (solo administrador)
Cuerpo:     { "correo": string, "rol": "administrador"|"gestor"|"representante"|"miembro" }
Respuestas: 201 { "success": true,
                  "data": { "id": "…", "correo": "…", "rol": "…", "expiraEn": "…" } }
            403 PROHIBIDO · 400 VALIDACION_FALLIDA
            409 CUENTA_EXISTENTE · INVITACION_DUPLICADA
            429 DEMASIADOS_INTENTOS
```

- Envía la plantilla fija. Tope diario por administrador (20).
- `CUENTA_EXISTENTE`: el correo ya tiene cuenta (también si su persona está de
  baja, porque la baja conserva el correo); se asigna el rol a esa persona con
  `PUT /personas/:personaId/roles`.

### GET /invitaciones

```
Categoría:  autenticada · acción invitaciones:gestionar
Respuestas: 200 { "success": true,
                  "data": { "invitaciones": [ { "id", "correo", "rol", "expiraEn" } ] } }
```

Solo las pendientes (ni aceptadas, ni revocadas, ni caducadas).

### DELETE /invitaciones/:invitacionId

```
Categoría:  autenticada · acción invitaciones:gestionar
Respuestas: 200 { "success": true, "data": {} }
            404 RECURSO_NO_ENCONTRADO (no existe, no es de esta asociación o ya no está pendiente)
```

### POST /invitaciones/aceptar

```
Categoría:  pública de asociación
Cuerpo:     { "token": string, "nombre": string (2–120),
              "contrasena": string, "aceptaTerminos": true }
Respuestas: 200 { "success": true,
                  "data": { "persona": { "nombre": "…" }, "roles": ["…"], "expiraEn": "…" } }
                + Set-Cookie de sesión
            400 ENLACE_INVALIDO · CONTRASENA_NO_ADMITIDA · TERMINOS_NO_ACEPTADOS
                · VALIDACION_FALLIDA
```

- **Revalida al aceptar** que quien invitó sigue siendo administrador activo; si
  no, `ENLACE_INVALIDO`. Perder el rol de administrador, ser suspendido o dado de
  baja invalida también sus invitaciones pendientes.
- Crea persona y cuenta (correo verificado) con el rol invitado. Una invitación de
  una asociación no se acepta en otra. Si entretanto el correo ya tiene cuenta,
  `ENLACE_INVALIDO`.
