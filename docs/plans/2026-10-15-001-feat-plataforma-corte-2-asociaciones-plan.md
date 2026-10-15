---
title: Etapa 1, corte 2 — asociaciones y aislamiento verificado entre asociaciones
type: feat
status: aprobado
date: 2026-10-15
origin: docs/plans/2026-10-01-001-feat-plataforma-etapa-0-plan.md (§8, D8) · ADR-0006 · docs/database-design.md (§6)
---

# feat(plataforma): asociaciones y aislamiento verificado entre asociaciones

## Contexto

La plataforma (`apps/plataforma`: Fastify 5 + Zod 4 + Drizzle/pg, PostgreSQL 17 en
Docker) servirá a varias asociaciones con **esquema compartido y RLS** (decisión D8).
El responsable exige que **ninguna asociación pueda ver ni modificar datos de otra** y
que esté **verificado, no supuesto**. Este corte fija el patrón que heredarán todas
las tablas futuras.

Una revisión adversarial del primer borrador (sin commit) encontró fallos que lo habrían dejado **aislado solo en apariencia**:

- En Docker, `aspal` es **superusuario**. Todo objeto creado por las migraciones sería
  suyo, y un dueño superusuario anula `FORCE RLS`, las vistas y las funciones
  `SECURITY DEFINER`. En la nube (RDS) el maestro no es superusuario, así que el
  entorno local se comportaría distinto del real.
- El `Dockerfile` ejecuta `migrar && servidor` en el mismo contenedor: la aplicación
  tendría en su entorno las credenciales del migrador.
- `current_setting(...)::uuid` devuelve `''` en una conexión reutilizada y lanza un
  error. Por eso «sin contexto» daría resultados distintos según el orden de los tests.
- Por defecto, PUBLIC tiene `EXECUTE` sobre todas las funciones y `CONNECT`/`TEMP`
  sobre las bases; el borrador decía «nada más».
- Las políticas PERMISSIVE se suman con OR: una política futura podría abrirlo todo.
  El guardián del borrador solo miraba las tablas que ya tienen `asociacion_id`.
- Las claves únicas y foráneas se comprueban **sin RLS**: con el diseño del borrador
  sirven para descubrir si un dato existe en otra asociación y para referenciar sus filas.
- Los roles se creaban en una migración y en mal orden; los scripts de
  `initdb.d` no se vuelven a ejecutar con un volumen ya existente.

Este documento sustituye al borrador del 2026-10-15 e incorpora esas correcciones. Aprobado por el responsable el 2026-10-15.

**Alcance acordado el 2026-10-15.** Fuera de este corte quedan:

- la página pública con logo y colores, que depende de D13;
- el estado del contrato, el alta y edición de asociaciones, y las sesiones.

## Diseño

### 1. Tres roles, creados por un script de arranque (no por migración)

Nuevo `apps/plataforma/src/preparar-base.ts`, ejecutado con `npm run db:preparar`.
Corre como el administrador, antes de migrar, y es idempotente (bloques `DO` con
`IF NOT EXISTS`).

| Rol           | Atributos                                                                  | Uso                                                                      |
| ------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `aspal`       | administrador (superusuario en local; maestro en la nube)                  | solo `db:preparar`, y migrar haciendo `SET ROLE`                         |
| `aspal_dueno` | `NOLOGIN NOSUPERUSER NOBYPASSRLS`                                          | dueño de los esquemas `app`, `public` y `drizzle` y de todos los objetos |
| `aspal_app`   | `LOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT`, **no** miembro de `aspal_dueno` | la aplicación en ejecución                                               |

El script, además:

- pone contraseña a `aspal_app` (solo local, desde la variable de entorno; nunca en git);
- ejecuta `REVOKE ALL ON DATABASE ... FROM PUBLIC` + `GRANT CONNECT` a `aspal_app`, en las
  bases `aspal` y `aspal_prueba`;
- ejecuta `REVOKE ALL ON SCHEMA public FROM PUBLIC`.

### 2. Migraciones como `aspal_dueno`

En `src/migrar.ts`: un `pg.Client` dedicado (no el pool) ejecuta `SET ROLE aspal_dueno`
y luego `migrate(drizzle(client))`.

- **`0001_aislamiento`** (SQL propio):
  - esquema `app`;
  - `ALTER DEFAULT PRIVILEGES FOR ROLE aspal_dueno REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC`;
  - la función de contexto:
    ```sql
    CREATE FUNCTION app.asociacion_actual() RETURNS uuid LANGUAGE sql STABLE PARALLEL SAFE
      AS $$ SELECT NULLIF(pg_catalog.current_setting('app.asociacion_id', true), '')::uuid $$;
    ```
  - `app.aplicar_aislamiento(regclass)`, que ejecuta `ENABLE` + `FORCE RLS`, `ALTER COLUMN
asociacion_id SET DEFAULT (SELECT app.asociacion_actual())` y crea dos políticas:
    - `aislamiento AS RESTRICTIVE FOR ALL TO PUBLIC USING (asociacion_id = (SELECT
app.asociacion_actual())) WITH CHECK (...)`;
    - `base AS PERMISSIVE FOR ALL TO PUBLIC USING (true) WITH CHECK (true)`.

    Como `aislamiento` es restrictiva, ninguna política permisiva futura puede ampliar
    el acceso.

  - `GRANT USAGE` del esquema `app` y `GRANT EXECUTE` de `asociacion_actual` a
    `aspal_app`; nada más.
- **`0002_asociacion`**: la genera Drizzle desde `src/esquema.ts`, más SQL propio al final.
  - Columnas: `id uuid` (PK, `gen_random_uuid()`), `nombre` (`CHECK` 2–120),
    `subdominio` (`UNIQUE`, `CHECK` de formato DNS en minúsculas y `CHECK` de no
    reservado), `zona_horaria`, `creado_en` y `actualizado_en` (`timestamptz`).
  - `ENABLE RLS` **sin `FORCE`**, y política `FOR SELECT TO aspal_app USING (id = (SELECT
app.asociacion_actual()))`: la aplicación solo ve su propia asociación.
  - Resolución acotada: `app.resolver_asociacion(p text) RETURNS TABLE(id, nombre,
subdominio, zona_horaria) STABLE SECURITY DEFINER SET search_path = ''`, que busca
    por igualdad exacta (`resolver_asociacion('%')` devuelve 0 filas).
  - `GRANT EXECUTE` de `resolver_asociacion` y `GRANT SELECT` sobre `asociacion` a
    `aspal_app`. La política anterior filtra ese `SELECT`.
  - Reservados: `www app api admin comunidad correo mail soporte ayuda estado static
assets cdn staging dev`.

### 3. Separar migrador y aplicación

- **`compose.yaml`:** servicio `migrador` de una sola ejecución (`preparar` + `migrar`, con
  credenciales de administrador). `plataforma` arranca con `depends_on: migrador:
service_completed_successfully` y recibe **solo** la URL de `aspal_app`. Nuevas variables
  `DOMINIO_BASE=localhost` y `DATABASE_URL_ADMIN` (esta solo en `migrador`).
- **`Dockerfile`:** `CMD` arranca solo `servidor.js`. El migrador usa la misma imagen con
  otro comando.
- **`src/servidor.ts`, comprobación al arrancar:** si `rolsuper`, `rolbypassrls` o
  `pg_has_role(current_user,'aspal_dueno','MEMBER')` es verdadero, ejecuta
  `process.exit(1)`.
- **`src/configuracion.ts`:** la aplicación lee `DATABASE_URL` y `DOMINIO_BASE`, rechaza
  una URL con `options=` (no puede traer un contexto por defecto) y no lee la URL de
  administrador.

### 4. Contexto por transacción en la aplicación (`src/base-de-datos.ts`)

`conAsociacion(db, asociacionId, fn)`:

- valida el UUID con Zod;
- usa `db.transaction(tx => ...)` cuya **primera** sentencia es ``tx.execute(sql`SELECT
set_config('app.asociacion_id', ${id}, true)`)``, con un parámetro enlazado y nunca
  interpolado;
- `fn` recibe solo `tx`;
- prohíbe anidar llamadas (marca en `AsyncLocalStorage`);
- si `COMMIT` o `ROLLBACK` no terminan limpios, **destruye** la conexión
  (`release(err)`).

El pool no se exporta fuera de `base-de-datos.ts`.

### 5. Subdominio y endpoint

- `src/asociaciones/host.ts`: función pura `subdominioDesdeHost(host, dominioBase)`.
  - Debe acabar en `'.' + base`: `aspal.evillocalhost` no resuelve.
  - Quita el puerto y el punto final, pasa a minúsculas y rechaza varios niveles, hosts
    vacíos y reservados.
  - Ignora `X-Forwarded-Host`.
- `src/asociaciones/rutas.ts`: un hook resuelve la asociación con
  `app.resolver_asociacion`.
- `GET /asociaciones/actual`:
  - con una asociación conocida, 200 `{ success, data: { nombre, subdominio, zonaHoraria } }`,
    sin `id`;
  - si no, 404 `RECURSO_NO_ENCONTRADO`;
  - siempre con `Cache-Control: private, no-store`.
- El contrato va antes en `docs/api/plataforma.md`.
- `/health` sigue sin depender del subdominio.

### 6. Semillas locales

`npm run db:sembrar` (como `aspal_dueno`): ASPAL (`aspal`, `America/Merida`) y Organización de
Prueba (`prueba`), con `ON CONFLICT (subdominio) DO NOTHING`. Solo corre si el host de la
URL es `localhost` o `db`. Valida la zona horaria con `Intl`.

## Verificación (lo que demuestra el aislamiento)

**Tabla de tests:** `t`, con su hija `t_hija` (FK compuesta `(asociacion_id, t_id)`). Se crea **solo
en la base de tests**, como `aspal_dueno`, con `app.aplicar_aislamiento`. Hay filas de A
(aspal) y de B (prueba). Archivo `src/aislamiento.integracion.test.ts`.

**Matriz de cruce** (rol `aspal_app`, en los dos sentidos A↔B):

- Contexto A sobre filas de B:
  - `SELECT`, `SELECT` por id, `count`, `FOR UPDATE`, `UPDATE` y `DELETE` → 0 filas;
  - `INSERT` con `asociacion_id = B` → 42501;
  - mover una fila propia a B → **42501**;
  - `ON CONFLICT` y `MERGE` no tocan B;
  - `t_hija` con FK a un id de B → 23503;
  - `COPY TO` solo da filas de A, y `COPY FROM` da error.
- Sin contexto, en una conexión nueva **y** en una reutilizada: 0 filas sin error, e
  `INSERT` → 42501. Con un UUID inexistente: 0 filas.
- `TRUNCATE`, `DISABLE RLS`, `DROP POLICY` y `SET ROLE aspal_dueno` → 42501.
- **Testigos:** `aspal_dueno` (con `SET ROLE`) recibe los mismos resultados, lo que prueba
  que `FORCE` funciona. Superusuario sin contexto ve A y B, lo que demuestra que la batería
  **detectaría** un rol que se salta RLS (sin falso verde).
- `asociacion`: sin contexto, `count` = 0; con contexto A, 1; `resolver_asociacion('%')` = 0 filas.

**Pool** (`max: 1` y `max: 2`):

- tras un `fn` que lanza, no queda ninguna transacción abierta y el GUC está vacío;
- si se termina la conexión desde PostgreSQL, el pool no reutiliza una rota;
- anidar `conAsociacion` lanza un error;
- **concurrencia:** 200 peticiones `inject` intercaladas `aspal`/`prueba`, con `pg_sleep`
  aleatorio; cada respuesta corresponde a su `Host`.

**Guardianes:**

1. **Catálogo:** toda tabla de `public` (incluidas las particiones) salvo `asociacion` tiene
   `asociacion_id uuid NOT NULL`, `relrowsecurity`, `relforcerowsecurity` y la política
   `aislamiento`. La política debe ser RESTRICTIVE, para todos los comandos y para PUBLIC,
   con la expresión canónica (`pg_get_expr`).
   - Ninguna vista materializada accesible a la app.
   - Toda vista con `security_invoker`.
   - Las funciones `SECURITY DEFINER` solo de una lista blanca y con `search_path` fijo.
   - El guardián tiene **su propio test**: crea tablas defectuosas en una transacción y
     comprueba que las detecta.
2. **Propiedad:** todos los objetos de `app`, `public` y `drizzle` pertenecen a `aspal_dueno`.
3. **Claves:** todo `UNIQUE` y toda FK de una tabla de asociación incluye `asociacion_id`.
4. **Privilegios:** instantánea exacta de los permisos de `aspal_app`
   (`has_table/function/database/schema_privilege`). `TRUNCATE`, `TRIGGER`, `TEMP` y
   `CREATE` siempre a falso. `pg_db_role_setting` vacío para `aspal_app`.
5. **Código** (test que recorre `src/`): `app.asociacion_id`, `set_config` y `SET ` en SQL solo
   aparecen en `base-de-datos.ts`. Solo `base-de-datos.ts` y `servidor.ts` importan `pg`.
6. **Arranque:** la comprobación rechaza la URL del superusuario y acepta la de `aspal_app`.

**Unitarios:**

- `subdominioDesdeHost`: un caso por cada regla de la §5;
- configuración: `options=` rechazado y la URL de administrador ignorada.

**Batería final:**

- tests unitarios y de integración de la plataforma, en local y en la CI;
- el job de la CI ejecuta `db:preparar` contra el servicio de PostgreSQL y luego los tests;
- con la plataforma en marcha, `curl` contra `aspal.localhost`, `prueba.localhost`,
  `localhost` y `nada.localhost`;
- la base detenida → `/health` responde 503;
- el sitio, con el build idéntico byte a byte, la cobertura y el lint;
- al final, una revisión adversarial independiente del código ya escrito, con un agente
  de seguridad, antes de cerrar.

## Archivos

Se modifican:

- `apps/plataforma/src/{base-de-datos,migrar,servidor,configuracion,esquema,app}.ts`
- `apps/plataforma/Dockerfile`
- `compose.yaml`
- `apps/plataforma/docker/crear-base-prueba.sql`
- `.github/workflows/ci.yml`
- `package.json` (scripts `db:preparar` y `db:sembrar`)

Se crean:

- `src/preparar-base.ts`
- `src/sembrar.ts`
- `src/asociaciones/{host,rutas}.ts`
- `migraciones/0001_*` y `0002_*`
- los tests `*.test.ts` y `*.integracion.test.ts` de la sección de verificación

Se reutilizan:

- `crearPool` y `comprobarBaseDeDatos` de `src/base-de-datos.ts`
- `cuerpoError` y `registrarZod` de `src/zod-fastify.ts`
- `construirApp(dependencias)` de `src/app.ts`

**Documentación:**

- este plan;
- `docs/api/plataforma.md`;
- `apps/plataforma/CLAUDE.md` y `docs/database-design.md`: el patrón de aislamiento y las reglas
  para cortes posteriores;
- el plan de la Etapa 0 (§8) y `CLAUDE.md` raíz.

**Reglas para cortes posteriores** (quedan escritas en esta documentación):

- **Sesiones (corte 3):** la sesión debe coincidir con la asociación del `Host`; cookies
  `__Host-` sin `Domain`.
- **Trabajos (pg-boss y outbox):** cada trabajo lleva su `asociacion_id` y corre dentro de
  `conAsociacion`.
- **Operador (corte 4):** usa un rol y un pool separados, y queda auditado.
- **PgBouncer:** solo `set_config` local.
- **Datos:**
  - nada de `COPY FROM`, objetos grandes ni contadores globales expuestos;
  - los errores nunca devuelven `error.detail` de PostgreSQL.

## Orden de commits (rama `feat/plataforma-asociaciones`, tests primero)

1. `docs`: el plan reescrito y el contrato de `GET /asociaciones/actual`.
2. `feat`: roles, `db:preparar`, migrador separado en `compose.yaml`/`Dockerfile` y la
   comprobación de arranque. Tests: guardianes de propiedad, de privilegios y de arranque.
3. `feat`: `0001_aislamiento` y `conAsociacion`. Tests: matriz de cruce, pool y guardianes de
   catálogo, de claves y de código.
4. `feat`: `asociacion` (`0002`), `resolver_asociacion` y `db:sembrar`. Tests: restricciones y
   RLS de `asociacion`.
5. `feat`: subdominio y `GET /asociaciones/actual`. Tests: unitarios del `Host`, endpoint y
   concurrencia.
6. `docs`: las reglas obligatorias y la documentación al día.
7. Revisión adversarial independiente y corrección de lo que encuentre.

**Valores por defecto** (se pueden cambiar al aprobar):

- subdominio de ASPAL: `aspal`;
- zona horaria: `America/Merida`;
- la lista de reservados de la §2.

**Requisito local:** la base de desarrollo está vacía; `db:preparar` adapta el volumen existente
sin borrarlo.
