# ASPAL Plataforma — Convenciones y Reglas

> Complementa el CLAUDE.md raíz. Se aplica a todo archivo bajo `apps/plataforma/`.
> Decisiones de fondo: `docs/plans/2026-10-01-001-feat-plataforma-etapa-0-plan.md`
> (D1–D15). Aislamiento: `docs/plans/2026-10-15-001-feat-plataforma-corte-2-asociaciones-plan.md`.
> Datos: `docs/database-design.md`. Contratos: `docs/api/plataforma.md`.
> Última actualización: octubre de 2026 (Etapa 1, corte 3a)

---

## 1. Qué es y cómo corre

La plataforma SaaS: API, y más adelante paneles y páginas públicas por
asociación. **Se desarrolla en local con Docker** y se moverá a la nube (AWS u
otro servidor) más adelante (decisión del 2026-10-14).

```
Servidor:   Fastify 5 (D3) · validación de entrada y salida con Zod 4
Datos:      PostgreSQL 17 · Drizzle ORM sobre pg (D4) · migraciones con Drizzle Kit
Aislamiento: esquema compartido + RLS restrictiva por asociacion_id (D8)
Tests:      Vitest: unitarios (sin red ni base) e integración (PostgreSQL real)
Contenedor: Dockerfile multietapa (node:22-alpine) · compose.yaml en la raíz
```

```
src/
├── servidor.ts        ← entrada: configuración, pool, comprobación del rol, listen
├── app.ts             ← construirApp(dependencias): sin arrancar, para inject en tests
├── configuracion.ts   ← entorno validado con Zod (aplicación y administración, aparte)
├── zod-fastify.ts     ← puente Zod ↔ Fastify, sobre único de error, 404
├── base-de-datos.ts   ← pool, conAsociacion, resolverAsociacion, verificarRolDeAplicacion
├── preparar-base.ts   ← roles y privilegios (db:preparar, como administrador)
├── migrar.ts          ← aplicarMigraciones con SET ROLE aspal_dueno
├── sembrar.ts         ← semillas solo locales (asociaciones y usuarios de desarrollo)
├── esquema.ts         ← esquema de Drizzle
├── asociaciones/      ← subdominios, análisis del Host, GET /asociaciones/actual
├── acceso/            ← sesiones, contraseñas, límites, permisos, gestión de personas
├── http/              ← protección común: Host, Origin, límite grueso, categorías
├── salud/             ← GET /health
└── pruebas/           ← preparación de integración, guardianes, dependencias falsas
migraciones/           ← SQL versionado de Drizzle Kit; nunca se edita uno aplicado
```

## 2. Comandos (desde la raíz)

```bash
npm run db:levantar          # PostgreSQL 17 en Docker (puerto 5433) + db:preparar
npm run db:migrar            # migraciones, como aspal_dueno
npm run db:sembrar           # ASPAL (aspal) y Organización de Prueba (prueba), solo local
                             # con SEMILLA_CLAVE (≥12 car.) crea también usuarios de desarrollo
npm run dev:plataforma       # tsx watch con local.env (puerto 5010)
npm run test:plataforma      # unitarios
npm run test:integracion     # recrea aspal_prueba, la prepara, migra y prueba
npm run check:plataforma     # tsc
npm run plataforma:levantar  # base + migrador + plataforma en contenedores
```

Dos archivos de entorno con credenciales **solo locales** (las mismas de `compose.yaml`): `local.env` (la aplicación: solo la URL de `aspal_app`) y `local.admin.env` (preparar, migrar, sembrar y tests de integración). El servidor de desarrollo nunca carga el de administración.
En local: `http://aspal.localhost:5010/asociaciones/actual` y
`http://prueba.localhost:5010/asociaciones/actual`.

**Avast en esta máquina:** su escudo web intercepta HTTPS y `npm ci` falla dentro
de `docker build`. La imagen la construye la CI; en local, hay que excluir Docker
del escudo de Avast antes de `plataforma:levantar`.

## 3. Aislamiento entre asociaciones — reglas obligatorias

Ninguna asociación puede ver ni tocar datos de otra. Está **probado** contra
PostgreSQL real (`*.integracion.test.ts`) y con pruebas de mutación: si una
de estas reglas se rompe, un test falla.

**Roles** (los crea `db:preparar`, nunca una migración):

| Rol           | Qué es                                                                   |
| ------------- | ------------------------------------------------------------------------ |
| `aspal`       | administrador: solo `db:preparar` y migrar/sembrar con `SET ROLE`        |
| `aspal_dueno` | dueño de todo; sin login, sin superusuario ni BYPASSRLS                  |
| `aspal_app`   | la aplicación; sin BYPASSRLS, sin herencia, sin pertenecer a aspal_dueno |

**Toda tabla nueva de una asociación:**

1. `asociacion_id uuid NOT NULL REFERENCES asociacion (id) ON DELETE RESTRICT`.
2. `UNIQUE (asociacion_id, id)` en toda tabla que otras referencian (una tabla
   que nadie referencia, como `limite_uso`, puede prescindir de `id`), y **toda**
   otra clave única incluye `asociacion_id`: una clave global delata si un dato
   existe en otra asociación.
3. Las FK hacia otra tabla de asociación son compuestas:
   `(asociacion_id, x_id) REFERENCES x (asociacion_id, id)`.
4. La migración termina con `SELECT app.aplicar_aislamiento('public.<tabla>');`
   (RLS activada y forzada, política `aislamiento` RESTRICTIVE y `asociacion_id`
   por defecto = el contexto) y los `GRANT` explícitos a `aspal_app`. Nunca
   `TRUNCATE`, `TRIGGER` ni `REFERENCES`.
5. Se añade a la instantánea de privilegios de `asociacion.integracion.test.ts`.

El guardián del catálogo (`pruebas/guardianes.ts`) falla si falta cualquiera de
1–4, si una política no es la canónica, si hay vistas sin `security_invoker`,
vistas materializadas o funciones `SECURITY DEFINER` fuera de la lista blanca.

**En el código:**

- Los datos de una asociación se leen y escriben **solo** dentro de
  `conAsociacion(pool, id, fn)`, con la base que recibe `fn`. Fuera de ella no
  hay contexto y no se ve nada. `fn` recibe un cliente **vigilado**: rechaza toda
  consulta que llegue después de que `conAsociacion` termine (una rama de
  `Promise.all`, un `insert` sin `await`) y las sentencias que tocan la
  transacción o la sesión (`BEGIN`, `COMMIT`, `SET`, `set_config`, `DISCARD`…).
  Todo `await` dentro de `fn` debe resolverse antes de devolver.
- El `id` sale de la asociación resuelta del `Host` (`peticion.asociacion`),
  **nunca** de un parámetro, cuerpo o cabecera de la petición.
- Solo `base-de-datos.ts` fija el contexto (`set_config`) y solo los archivos de
  infraestructura importan `pg` (guardián de código).
- Los errores nunca devuelven `error.detail` de PostgreSQL ni la causa interna.
- Respuestas que dependen de la asociación: `Cache-Control: private, no-store`.

## 3 bis. Acceso: sesiones, contraseñas y roles (corte 3) — reglas obligatorias

Plan: `docs/plans/2026-10-16-001-feat-plataforma-corte-3-acceso-plan.md`. Las
**cuentas son independientes por asociación**: el mismo correo en dos
asociaciones son dos cuentas, sin tablas globales de acceso.

- **Categorías de ruta.** Toda ruta declara `global`, `publica` o `autenticada`;
  una `autenticada` solo se registra con `rutaAutenticada` (`acceso/con-sesion.ts`),
  que abre **una sola** transacción por petición, resuelve la sesión y entrega
  `contexto.base`. Sin cookie válida en forma, 401 antes de validar el cuerpo.
- **Un solo repositorio.** Solo `acceso/` (y `esquema.ts`/`sembrar.ts`) nombra
  `hash_contrasena` o `token_hash` (guardián de código). Las respuestas no llevan
  hashes, tokens ni ids de cuenta o sesión.
- **Login en tres pasos** (`acceso/rutas-sesion.ts`): contar el intento en una
  transacción corta, **un único scrypt fuera de transacción** (también con
  cuenta inexistente) y crear la sesión revalidando la versión de credencial y el
  estado de la persona. Todo rechazo es el mismo `401 CREDENCIALES_INVALIDAS`.
- **Límites.** `reservarIntento` cuenta antes de verificar (atómico). Claves HMAC
  del correo **enviado**, nunca de la cuenta. El éxito reinicia solo su clave
  (correo, origen). El límite por correo solo avisa, no bloquea.
- **scrypt acotado.** Semáforo (2 en vuelo, cola de 8, 2 por asociación); cola
  llena = 503 sin hashear. Los parámetros mínimos y máximos de lectura de un hash
  guardado están en `contrasenas.ts`.
- **Sesión.** Token de 32 bytes; en la base solo su SHA-256. Cookie `__Host-`
  (en local http, `aspal_sesion`) sin `Domain`. Caducidad por inactividad y
  absoluta, más corta para administrador y gestor, evaluada con los **roles
  actuales**. Máximo 10 sesiones vivas por cuenta.
- **Permisos.** `puede(roles, accion)` en `acceso/permisos.ts` deniega por
  defecto; los roles se leen de la base en la misma petición, nunca de la cookie.
- **Último administrador.** Cambiar roles o estado toma un bloqueo por
  asociación, **revalida al actor y recuenta tras el bloqueo**: dos
  administradores concurrentes dejan siempre exactamente uno. Nadie cambia lo
  propio. Una persona ajena responde 404, nunca 403.
- **Errores de negocio** dentro de una transacción se lanzan como
  `RespuestaDeError` (revierte pero devuelve la conexión limpia al pool); un
  error desconocido destruye la conexión.
- **Riesgos aceptados** (plan §2.2): una inyección SQL permitiría fijar el
  contexto de otra asociación (la defensa es no tener SQL en bruto); la fuerza
  bruta distribuida contra una cuenta no se bloquea hasta tener doble factor; el
  correo es la llave de la cuenta; una web ajena puede gastar el cupo grueso en
  memoria (60 por minuto) del origen de una víctima con POST cross-site, que se
  rechazan con 403 pero cuentan (molestia de un minuto, no toca `limite_uso`).
- **Contadores.** El del origen cuenta **fallos**: un acierto lo descuenta y, con
  un bloqueo vigente, los reintentos no cuentan. Un origen bloqueado no crea filas
  por correo. Solo el correo canónico (sin alias) reinicia su contador.
- **Crear sesión** bloquea la cuenta y la persona (`FOR NO KEY UPDATE`/`FOR SHARE`):
  sin ello un login concurrente a una revocación sobreviviría a ella.

**Reglas para los cortes siguientes** (decididas en la revisión del corte 2):

- **Trabajos (pg-boss, outbox):** cada trabajo lleva `asociacion_id` y corre
  dentro de `conAsociacion`. La tabla outbox lleva RLS. Un proceso que lea
  todas las asociaciones usa un rol propio y auditado, nunca `aspal_app`.
- **Operador (corte 4):** rol y pool separados (`aspal_operador`), con
  auditoría; nunca dar BYPASSRLS a `aspal_app`.
- **PgBouncer o RDS Proxy:** solo `set_config` local (ya es así); nunca `SET`
  de sesión.
- **Datos:** nada de `COPY FROM` (falla con RLS: importar con
  `INSERT … SELECT FROM unnest`), objetos grandes (`lo_*`, sin RLS) ni
  contadores globales expuestos (los folios por asociación, en una tabla con RLS).
- **Claves primarias:** el `id` de una fila lo genera siempre el servidor; nunca
  se acepta uno del cliente. Con un `id` elegido por quien llama, un
  `INSERT … ON CONFLICT (id)` delataría si existe en otra asociación.
- **Sin SQL en bruto:** nada de `sql.raw` ni de construir SQL con datos de la
  petición (el guardián de código lo impide). Una inyección SQL equivale a
  acceso entre asociaciones: el contexto es un parámetro de sesión que cualquier
  SQL puede cambiar, y la barrera es el código, no la base.
- **Pendiente conocido:** `aspal_app` puede conectarse a la base de
  mantenimiento `postgres` y crear tablas temporales allí (privilegio por
  defecto de PUBLIC). No contiene datos de asociaciones; se cierra al preparar
  la base en la nube, donde conviene revocar también CONNECT/TEMP de PUBLIC en
  `postgres` y `template1`. Siguen abiertos para PUBLIC `LISTEN`/`NOTIFY` en
  cualquier canal (los payloads de pg-boss y del outbox no llevan datos, solo
  ids) y `pg_stat_activity`, que muestra el texto de las consultas de otras
  sesiones del mismo rol (siempre con parámetros enlazados).

## 4. Otras reglas

- **Contrato primero:** un endpoint nuevo se documenta en `docs/api/plataforma.md`
  antes de implementarse. Sobre único: `{ success, data, meta? }` o
  `{ success: false, error: { codigo, mensaje, campo? } }`.
- **Esquemas Zod en cada ruta**, de entrada y de salida. La salida pasa por el
  esquema: lo que no declara no sale, y si no cumple es un 500 sin detalles.
- **Nada de detalles internos en respuestas ni logs:** ni la URL de la base ni
  el error de PostgreSQL ni datos personales.
- **Dependencias externas por parámetro** (`construirApp(dependencias)`): los
  tests unitarios no tocan red ni base (`pruebas/dependencias.ts`).
- **Esquema y migraciones:** ningún cambio sin la propuesta de la sección 6 de
  `docs/database-design.md`. Se generan con `npm run db:generar`; nunca `push`.
- **Tests de integración:** fallan si faltan sus variables; nunca se saltan en
  silencio. Usan `aspal_prueba`, que recrean en cada pasada; jamás la de desarrollo.
- Los imports relativos llevan extensión `.js`.
- Nomenclatura: la del CLAUDE.md raíz (español sin tildes en identificadores).
  `/health` es la única ruta en inglés: es el nombre que esperan los
  orquestadores.

---

_ASPAL Plataforma CLAUDE.md v0.3 — octubre de 2026_
