---
title: Etapa 1, corte 2 — asociaciones y aislamiento entre ellas
type: feat
status: propuesta
date: 2026-10-15
origin: docs/plans/2026-10-01-001-feat-plataforma-etapa-0-plan.md (§8, D8) · ADR-0006 · docs/database-design.md (§6)
---

# feat(plataforma): asociaciones y aislamiento entre asociaciones

> Especificación, propuesta de esquema y plan del corte 2. **No se escribe
> ninguna migración ni código hasta que el responsable apruebe este documento.**

## 1. Objetivo y alcance

Dejar resuelto, una sola vez y con tests, **cómo se aísla una asociación de
otra**. Todo lo que venga después (afiliaciones, planes, membresías, pagos,
contenido) hereda este patrón; si aquí queda mal, queda mal en todo.

**Dentro:**

- La tabla `asociacion` (ámbito plataforma).
- Un rol de PostgreSQL propio de la aplicación, sin privilegios para saltarse
  RLS.
- El mecanismo de RLS: contexto por transacción y una función que aplica la
  política estándar a cualquier tabla de una asociación.
- El test de cruce entre ASPAL y la organización de prueba, en lectura y
  escritura, en los dos sentidos.
- La resolución de la asociación por el `Host`, demostrada con
  `GET /asociaciones/actual`: el dominio principal resuelve ASPAL y cada
  subdominio resuelve su asociación (§2.1).
- Semillas locales: ASPAL y la organización de prueba.

**Fuera (decidido el 2026-10-15):**

- La página pública con logo y colores: obliga a decidir el renderizado (D13),
  que el plan reserva para el corte 4.
- Logo y colores: van con la marca de la asociación en el corte 4. El logo
  necesita además almacenamiento de archivos (corte 5).
- El estado de la asociación (prueba, activa, vencida, solo lectura): es el
  estado del **contrato**, que llega en los cortes 4 y 5.
- Alta y edición de asociaciones: panel de operador, corte 4.
- Sesiones y usuarios: corte 3. Aquí el «contexto de asociación» lo fija el
  servidor a partir del subdominio, no una sesión.

## 2. Hallazgo que fija el diseño

En el contenedor local, `aspal` (el `POSTGRES_USER`) es **superusuario**, y
PostgreSQL **nunca aplica RLS a un superusuario** ni a un rol con `BYPASSRLS`.
Tampoco la aplica al dueño de una tabla, salvo con `FORCE ROW LEVEL SECURITY`.
Si la plataforma se conectara como `aspal`, las políticas existirían pero no
filtrarían nada, y los tests pasarían en verde sin probar nada.

Por eso hay **dos roles**:

| Rol         | Para qué                                   | Privilegios                                                                      |
| ----------- | ------------------------------------------ | -------------------------------------------------------------------------------- |
| `aspal`     | Migraciones y semillas (dueño del esquema) | Los de dueño                                                                     |
| `aspal_app` | La aplicación en ejecución (pool de `pg`)  | `LOGIN`, `NOSUPERUSER`, `NOBYPASSRLS`; solo los `GRANT` explícitos de cada tabla |

Un test comprueba que el rol con que corre la aplicación no es superusuario ni
tiene `BYPASSRLS` (CA-4).

### 2.1 ASPAL vive en el dominio principal (decisión del 15 de octubre de 2026)

El sitio actual es de ASPAL. Internamente usará el mismo sistema que las demás
asociaciones, pero **ASPAL es la asociación principal y se sirve en el dominio
principal, sin subdominio**. Las demás usan `<subdominio>.<DOMINIO_BASE>`.

Consecuencias para este corte:

- ASPAL es una fila más de `asociacion`, aislada por RLS como cualquier otra.
  «Principal» solo cambia **cómo se llega a ella**, no qué puede ver.
- ASPAL conserva un `subdominio` (`aspal`) como identificador estable. No se
  hace opcional: así no hay un caso especial de `NULL` en el esquema, y su
  dirección por subdominio queda reservada para ella.
- Una columna `principal` marca a ASPAL. PostgreSQL garantiza que **como mucho
  una** asociación sea principal (índice único parcial).
- `DOMINIO_BASE` y `www.DOMINIO_BASE` resuelven la asociación principal.
  `aspal.DOMINIO_BASE` también la resuelve; que redirija al dominio principal
  es cosa del renderizado público (corte 4).
- ASPAL operador sigue siendo un ámbito distinto de ASPAL asociación (§3 de la
  guía): compartir dominio no da al operador acceso a los datos de la
  asociación ni al revés.

## 3. Especificación (criterios de aceptación)

- **CA-1 · Tabla `asociacion`.** Clave `uuid`; `subdominio` único, en
  minúsculas, con formato de etiqueta DNS y fuera de la lista de reservados;
  `nombre` obligatorio y acotado; `zona_horaria` obligatoria; `principal`
  obligatoria, y como mucho una asociación principal. PostgreSQL garantiza
  todo esto: una fila inválida no entra aunque el código falle.
- **CA-2 · Roles.** Las migraciones corren como `aspal` y la aplicación como
  `aspal_app`. `aspal_app` solo puede leer `asociacion`: no puede crear,
  cambiar ni borrar asociaciones.
- **CA-3 · Contexto por transacción.** `conAsociacion(pool, asociacionId, fn)`
  abre una transacción, fija el contexto con `SET LOCAL` y lo pierde al
  terminar. Una conexión devuelta al pool no conserva el contexto de la
  petición anterior. Si `fn` lanza, la transacción se revierte.
- **CA-4 · Test de cruce.** Sobre una tabla de asociación con la política
  estándar, con el contexto de la organización de prueba:
  - no se ven las filas de ASPAL (`SELECT` devuelve 0 filas);
  - no se pueden cambiar ni borrar (`UPDATE` y `DELETE` afectan 0 filas);
  - no se pueden insertar a nombre de ASPAL (error de política);
  - no se puede mover una fila propia a ASPAL cambiando su `asociacion_id`.

  Y lo mismo en sentido contrario. **Sin contexto** no se ve ni se escribe
  nada. El rol de la aplicación no es superusuario ni tiene `BYPASSRLS`.

- **CA-5 · Guardián.** Un test recorre el catálogo de PostgreSQL y falla si
  alguna tabla con columna `asociacion_id` no tiene RLS activado, RLS forzado y
  la política `aislamiento`. Así una tabla futura no puede olvidarse el patrón.
- **CA-6 · Resolución por `Host`.** `DOMINIO_BASE` vale `localhost` en local y
  será `asociacionesprofesionales.org` en la nube. Se ignoran el puerto y las
  mayúsculas.
  - `DOMINIO_BASE` y `www.DOMINIO_BASE` resuelven la asociación principal
    (ASPAL).
  - `<subdominio>.<DOMINIO_BASE>` resuelve la asociación de ese subdominio,
    incluido `aspal`.
  - Un subdominio reservado (salvo `www`), uno desconocido o un host de otro
    dominio no resuelven ninguna asociación. Sin asociación principal en la
    base, el dominio principal tampoco resuelve ninguna.
  - `/health` no depende del `Host`.
- **CA-7 · `GET /asociaciones/actual`.** Si el `Host` resuelve una asociación
  responde 200 `{ success: true, data: { nombre, subdominio, zonaHoraria,
principal } }`; si no, 404 `RECURSO_NO_ENCONTRADO`. No expone el `id`
  interno. Se documenta antes en `docs/api/plataforma.md`.
- **CA-8 · Semillas locales.** `npm run db:sembrar` crea ASPAL (`aspal`,
  principal) y la organización de prueba (`prueba`). Es idempotente y no corre nunca contra una
  base que no sea local: las semillas no son migraciones.
- **CA-9 · Sin regresiones.** El sitio sigue con su build idéntico byte a byte,
  la CI en verde (con el job de la plataforma ampliado) y la documentación al
  día.

## 4. Propuesta de esquema (`database-design.md`, §6)

### 4.1 Necesidad

La plataforma sirve a varias asociaciones. `asociacion` es el **cliente de la
plataforma**: su dueño es ASPAL como operador, vive mientras dure la relación
comercial y solo la cambia el operador (corte 4). Es la raíz del aislamiento:
todas las tablas de ámbito asociación la referencian.

### 4.2 Inspección

- Esquema actual: vacío. Solo existe la migración `0000_inicio`, sin tablas, y
  la tabla de control de Drizzle (`drizzle.__drizzle_migrations`).
- El sitio no tiene base de datos.
- `asociacion` no existe con otro nombre. ASPAL como operador (contratos,
  comisiones) y ASPAL como asociación cliente son cosas distintas (§3 de la
  guía): este corte solo crea la segunda, una fila más de `asociacion`.

### 4.3 Modelo propuesto

**`asociacion`** (ámbito plataforma, sin RLS: es la tabla que define el ámbito)

| Columna          | Tipo          | Restricciones                                                                                                  |
| ---------------- | ------------- | -------------------------------------------------------------------------------------------------------------- |
| `id`             | `uuid`        | PK, `DEFAULT gen_random_uuid()`                                                                                |
| `nombre`         | `text`        | `NOT NULL`, `CHECK (char_length(btrim(nombre)) BETWEEN 2 AND 120)`                                             |
| `subdominio`     | `text`        | `NOT NULL`, `UNIQUE`, `CHECK` de formato `^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$`, `CHECK` contra los reservados |
| `zona_horaria`   | `text`        | `NOT NULL`. Nombre IANA (`America/Merida`), validado en la aplicación                                          |
| `principal`      | `boolean`     | `NOT NULL DEFAULT false`. Índice único parcial `ON asociacion ((true)) WHERE principal`: como mucho una        |
| `creado_en`      | `timestamptz` | `NOT NULL DEFAULT now()`                                                                                       |
| `actualizado_en` | `timestamptz` | `NOT NULL DEFAULT now()`                                                                                       |

Subdominios reservados: `www`, `app`, `api`, `admin`, `comunidad`, `correo`,
`mail`, `soporte`, `ayuda`, `estado`, `static`, `assets`, `cdn`, `staging`,
`dev`. Son los que el dominio ya usa o usará la plataforma (D2). `www` está
reservado como subdominio de asociación, pero en la resolución equivale al
dominio principal (§2.1).

**Infraestructura de aislamiento** (esquema `app`, del dueño):

- `app.asociacion_actual() RETURNS uuid`: lee
  `current_setting('app.asociacion_id', true)`. Sin contexto devuelve `NULL`, y
  `asociacion_id = NULL` nunca es verdadero, así que sin contexto no pasa
  ninguna fila.
- `app.aplicar_aislamiento(tabla regclass)`: activa y fuerza RLS y crea la
  política `aislamiento` con
  `USING (asociacion_id = app.asociacion_actual())` y el mismo `WITH CHECK`.
  Cada migración futura de una tabla de asociación la llama en una línea:
  `SELECT app.aplicar_aislamiento('afiliacion');`.

### 4.4 Integridad

- La clave `uuid`, no un serial, para que un identificador no revele cuántas
  asociaciones hay ni permita adivinar el de otra.
- `subdominio`: `UNIQUE`, y los `CHECK` de formato y de reservados dentro de
  PostgreSQL, no solo en el código.
- `principal`: el índice único parcial impide una segunda asociación principal.
  No se exige que exista una: la base vacía es válida y el dominio principal
  simplemente no resuelve. Cambiar la principal es tarea del operador (corte
  4), en una transacción que desmarca una y marca la otra.
- Las tablas de asociación futuras: `asociacion_id uuid NOT NULL REFERENCES
asociacion(id) ON DELETE RESTRICT`. Una asociación con datos no se borra:
  se desactiva su contrato (cortes 4 y 5). Las relaciones entre dos tablas de
  asociación usarán una clave foránea compuesta `(asociacion_id, id)`, que
  impide referencias cruzadas entre asociaciones. El patrón se documenta aquí;
  la primera relación llega en el corte 3.
- Privilegios: `aspal_app` recibe `USAGE` en el esquema `app`, `EXECUTE` en
  `app.asociacion_actual()` y `SELECT` en `asociacion`. Nada más.
- `zona_horaria` no tiene `CHECK` porque PostgreSQL no puede validar un nombre
  IANA en una restricción inmutable. La valida la aplicación con `Intl`, y un
  test cubre las semillas.
- Historial: sin tabla de historial en este corte, porque nadie puede editar
  una asociación hasta el corte 4. Los cambios quedarán en `auditoria` (corte
  5).

### 4.5 Cambio

- **Migración `0001_aislamiento`** (SQL propio): crea el rol `aspal_app` si no
  existe (`NOLOGIN`, `NOSUPERUSER`, `NOBYPASSRLS`, sin contraseña), el esquema
  `app` y las dos funciones.
- **Migración `0002_asociacion`**: la genera Drizzle Kit desde `esquema.ts`,
  añadiendo al final el `GRANT SELECT` a `aspal_app`.
- **La contraseña y el `LOGIN` de `aspal_app` no van en ninguna migración.** En
  local los fija `npm run db:levantar` con una contraseña solo local. En la nube
  los pondrá la infraestructura, desde Secrets Manager.
- **Configuración:**
  - `DATABASE_URL` pasa a ser la de `aspal_app`;
  - nueva `DATABASE_URL_MIGRACIONES`, del dueño, que usan `db:migrar` y
    `db:sembrar`;
  - nueva `DOMINIO_BASE`;
  - en los tests, `DATABASE_URL_PRUEBA` (dueño) y `DATABASE_URL_PRUEBA_APP`
    (aplicación).
- **Datos actuales:** ninguno. La base local está vacía y el volumen existente
  sirve: no hay que borrarlo.
- **Vuelta atrás:** sin datos que perder. Basta con revertir el commit y
  recrear la base local.
- **Verificación:** CA-1 a CA-9 con tests de integración contra PostgreSQL 17
  real, en local y en la CI.

### 4.6 Alternativas descartadas

- **Un esquema de PostgreSQL por asociación.** Aísla bien, pero multiplica las
  migraciones por el número de clientes y complica los informes del operador.
  El plan ya eligió esquema compartido con RLS (D8).
- **Filtrar por `asociacion_id` solo en el código.** Una consulta que olvide el
  `WHERE` expone datos de otra asociación. Con RLS, el olvido devuelve 0 filas.
- **Conectar la aplicación como el dueño, con `FORCE ROW LEVEL SECURITY`.**
  Funciona con un dueño normal, pero en local el dueño es superusuario y se
  salta RLS igualmente. Además, la aplicación podría cambiar el esquema.

### 4.7 Preguntas de negocio

1. ~~**Subdominio de ASPAL**~~ — resuelta el 15 de octubre de 2026: ASPAL es
   la asociación principal y vive en el dominio principal (§2.1). Conserva
   `aspal` como identificador.
2. **Zona horaria de ASPAL:** ¿`America/Merida`?
3. **Subdominios reservados:** ¿añadirías o quitarías alguno de la lista de la
   §4.3?

Si no hay respuesta se usan las propuestas, que son reversibles mientras
no haya datos reales.

## 5. Plan de implementación

Una rama, `feat/plataforma-asociaciones`, con commits pequeños y tests primero:

1. `docs`: este plan aprobado y el contrato de `GET /asociaciones/actual` en
   `docs/api/plataforma.md`.
2. `feat`: roles y aislamiento.
   - Migración `0001`, configuración con dos URL y `db:levantar` fijando el
     `LOGIN` local de `aspal_app`.
   - Tests: el rol de la aplicación sin privilegios (CA-2, CA-4).
3. `feat`: tabla `asociacion`.
   - `esquema.ts`, migración `0002` y `db:sembrar`.
   - Tests de restricciones: subdominio duplicado, mal formado, reservado y
     nombre vacío, y segunda asociación principal (CA-1, CA-8).
4. `feat`: `conAsociacion` y el test de cruce.
   - La tabla de pruebas con la política estándar se crea **solo en la base de
     tests**, nunca en una migración.
   - Tests: CA-3, CA-4 y el guardián del catálogo (CA-5).
5. `feat`: resolución por `Host` y `GET /asociaciones/actual`.
   - Tests unitarios del análisis del `Host` y de integración del endpoint
     (CA-6, CA-7).
6. `docs`: `apps/plataforma/CLAUDE.md` (el patrón de aislamiento como regla
   obligatoria), el plan de la Etapa 0 y `CLAUDE.md` raíz.

**Verificación final:**

- Tests unitarios y de integración de la plataforma.
- Batería completa del sitio, con su build comparado byte a byte.
- `curl` contra `localhost` y `www.localhost` (ASPAL), `aspal.localhost`
  (ASPAL), `prueba.localhost` (prueba), `api.localhost` (reservado) y un
  subdominio desconocido.
- La base detenida, para comprobar que `/health` sigue respondiendo 503.

**Riesgo principal:** que el patrón quede bien en los tests y mal en la
práctica, por ejemplo con una consulta fuera de `conAsociacion` que use un rol
con más privilegios. Lo mitigan la aplicación sin privilegios para saltarse
RLS (CA-2), el contexto que se pierde al cerrar cada transacción (CA-3) y el
guardián (CA-5).
