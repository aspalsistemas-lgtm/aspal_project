---
title: Plataforma ASPAL — Etapa 0: preparación y decisiones
type: feat
status: draft
date: 2026-10-01
origin: docs/plan-plataforma-por-etapas.md · docs/database-design.md · tabla de opciones tecnológicas (1 oct 2026)
---

# feat: Plataforma ASPAL — Etapa 0: preparación y decisiones

> Aterriza la **Etapa 0** del plan de la plataforma
> (`docs/plan-plataforma-por-etapas.md`, versión 2.x: el gestor de contenido
> primero) sobre el repositorio: fija las decisiones técnicas que el plan deja
> abiertas, propone el modelo de dominio inicial y deja listo el backlog de la
> Etapa 1. Cada decisión lleva su estado: las **cerradas** se implementan tal
> cual; las **propuestas** se implementan según la recomendación, aisladas para
> poder cambiarlas; las **pendientes** necesitan una respuesta del responsable
> antes de tocar código.
>
> **Revisión del 13 de octubre de 2026.** Este documento se escribió contra la
> versión 1.0 del plan (membresías primero). La versión 2 cambia el orden de las
> etapas y el piloto; esta revisión lo reconcilia y cierra las decisiones D1, D3,
> D5 y D6. Numeración de etapas vigente: 0 preparación · 1 núcleo y aislamiento ·
> 2 gestor de contenido · 3 membresías · 4 cobros · 5 comunidad y biblioteca ·
> 6 eventos · 7 formación y expansión (incluye IA y SSO).

## 0. Instrucciones para agentes (Claude Code)

- `CLAUDE.md` manda sobre este plan. En particular: **todo dato persistente se
  rige por `docs/database-design.md`**, y antes de escribir una migración se
  entrega la propuesta de su sección 6.
- La plataforma es **una aplicación nueva** (decisión D1). El sitio público
  sigue siendo estático y sin estado; no se le añaden sesiones, base de datos
  ni Stripe. Lo que el sitio necesite del producto lo pide a la API pública de
  la plataforma.
- Si una decisión de la sección 3 sigue «propuesta», implementa la
  recomendación y déjala en un solo módulo para que cambiarla sea trivial. Si
  sigue «pendiente», detente y pregunta: no inventes la regla de negocio.
- Cada corte de la Etapa 1 (sección 8) llega desplegado a `staging` de AWS
  antes de abrir el siguiente, y cierra con el caso real de ASPAL y la prueba
  contra una segunda organización de prueba (ficticia). ANPR es candidato a
  siguiente piloto, no condición de cierre.
- Los tests de **cruce entre asociaciones** (una asociación no ve ni modifica
  datos de otra) son condición de cierre de todas las etapas, no solo de la 1.

## 1. Qué es la Etapa 0 y cuándo está cerrada

**Objetivo del plan:** construir sobre el repositorio existente sin
interrumpir el sitio público.

**Entregables (del plan):** mapa del sistema actual, estructura propuesta de
módulos, reglas de negocio iniciales y recorridos aprobados.

**Cierre:** el equipo puede explicar qué sistema conserva cada dato, qué cambia
en el sitio y qué flujo se implementa primero.

En este repositorio eso se traduce en:

| Entregable del plan                         | Dónde queda                                                                         | Estado                          |
| ------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------- |
| Mapa del sistema actual                     | `docs/plataforma.md` y `docs/architecture.md` (ya existen) + sección 2 de este plan | Hecho                           |
| Estructura de módulos y decisiones técnicas | Sección 3 (decisiones) y sección 7 (forma del repositorio)                          | Propuesto                       |
| Modelo de dominio inicial                   | Sección 4                                                                           | Propuesto                       |
| Reglas de negocio iniciales                 | Sección 5 (matriz)                                                                  | Por rellenar con el responsable |
| Inventario de datos y recorridos de ASPAL   | Sección 6                                                                           | Pendiente de insumos            |
| Backlog de la Etapa 1                       | Sección 8                                                                           | Propuesto                       |

## 2. Punto de partida: qué se conserva y qué cambia

**Se conserva tal cual:** el sitio institucional (React 18 + Vite, prerender,
Vercel), el sistema visual (pizarra, miel, noche; Montserrat; panal), el
catálogo de componentes de `/componentes` y el boletín en Mailchimp. Mientras
no se cierre la Etapa 2, el blog y el podcast siguen saliendo de WordPress.

**Cambia de sitio:** el sistema visual y los componentes dejan de ser
exclusivos del sitio y pasan a un paquete compartido (`packages/ui`) para que
los paneles de la plataforma se vean igual (D1). Al cerrar la Etapa 2, el blog
y el podcast pasan a leerse de la API de la plataforma; el sitio sigue sin base
de datos ni sesiones y conserva el contrato público de `/api/posts` y
`/api/posts/:slug` (cambia la fuente, no el formato). `shared/wordpress/` se
retira del sitio solo cuando se valide el reemplazo.

**Se conecta progresivamente:** `/unete` (Etapa 3, planes e inscripción, con
cobro en la 4), `/eventos` (Etapa 6, eventos de ASPAL), `/plataforma` (deja de
describir un producto genérico y describe el real).

**Dónde vive cada dato tras la primera versión comercial:**

| Dato                                                                              | Sistema                                                                          |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Textos institucionales, páginas del sitio                                         | Repositorio hoy; gestor de contenido de la plataforma de forma gradual (Etapa 2) |
| Blog y podcast                                                                    | WordPress hasta la Etapa 2; gestor propio después                                |
| MemberPress, comunidad (`comunidad.`) y cursos                                    | WordPress hasta que sus módulos (Etapas 3, 5 y 7) los sustituyan                 |
| Boletín                                                                           | Mailchimp (sin cambios)                                                          |
| Asociaciones, contratos, cuentas, personas, membresías, eventos, pagos, auditoría | PostgreSQL de la plataforma (AWS)                                                |
| Cobros, cuentas conectadas, suscripciones de clientes                             | Stripe (la plataforma guarda referencias y estados)                              |
| Correos operativos                                                                | SES (la plataforma guarda el registro de envío)                                  |
| Logos, certificados y archivos                                                    | S3                                                                               |

**Lo que hoy está en WordPress + MemberPress** (miembros actuales, comunidad en
línea, cursos) es la fuente del inventario de miembros de la sección 6. No se
migra en la Etapa 0 ni en la 2: WordPress se retira únicamente para blog y
podcast. Ese contenido editorial tiene su propio inventario (entradas,
episodios, audio, feeds, adjuntos, redirecciones; ver el plan, sección 9).

## 3. Decisiones

Formato: decisión, alternativas descartadas, motivo, consecuencias. Estado:
**cerrada** (viene del plan), **propuesta** (recomendación de este documento,
se implementa salvo objeción) o **pendiente** (necesita respuesta).

### D1 · Forma del repositorio — cerrada (13 oct 2026)

**Decisión:** un monorepo con npm workspaces:

```
apps/sitio          el sitio actual (client/, server/, api/), sin cambios funcionales
apps/plataforma     la plataforma: API, paneles y páginas públicas por asociación
packages/ui         tokens, componentes, catálogo (/componentes) y guía visual
packages/contratos  esquemas Zod y tipos compartidos entre API, sitio y paneles
```

**Descartado:** un segundo repositorio. **Motivo:** el sistema visual debe ser
uno; con dos repositorios el paquete de UI acabaría divergiendo, igual que
divergieron `server/` y `api/` antes de existir `shared/`. **Consecuencias:**
mover el sitio a `apps/sitio` es mecánico pero toca CI, el _root directory_ de
Vercel y los scripts; es el único trabajo de código de la Etapa 0 (sección 7).
`shared/` del sitio se queda donde está: su lógica (WordPress, Mailchimp) es
del sitio, no de la plataforma.

### D2 · Despliegue y dominios — cerrada (AWS) + propuesta (forma)

**Decisión del responsable (14 de octubre de 2026):** la plataforma se
desarrolla entera en local, en contenedores de Docker (`compose.yaml`), y se
mueve a AWS u otro servidor más adelante. Lo que sigue describe la forma en la
nube cuando llegue ese momento; mientras tanto, los cortes se cierran en local.

**Cerrada por el plan:** AWS, PostgreSQL, SES. El sitio puede seguir en Vercel;
su migración a AWS no bloquea.

**Propuesta de forma:** un contenedor (App Runner, o ECS Fargate si hace falta
red privada) + RDS PostgreSQL + S3 + SES, definido con CDK. Sin Kubernetes.
**Dominios:** `www.` sigue en Vercel; `app.asociacionesprofesionales.org` y el
comodín `*.asociacionesprofesionales.org` (subdominio por asociación) apuntan
a AWS; `comunidad.` sigue en WordPress. Las cookies de sesión se limitan al
subdominio en que se emiten.
El dominio principal (y `www.`) es de ASPAL como asociación principal
(decisión del 15 de octubre de 2026): usa el mismo sistema que las demás, sin
subdominio propio.

**Motivo:** ~300 miembros y 10 administradores no justifican más piezas; un
contenedor y una base gestionada cubren las etapas 1–5. **Consecuencia:** hay
que crear la cuenta de AWS (región, facturación, usuarios IAM) y el comodín
DNS en la Etapa 1, corte 1.

### D3 · Servidor de la plataforma — cerrada (13 oct 2026)

**Decisión:** Fastify + Zod. **Descartado:** Express (lo que usa el sitio: sin
validación de esquemas integrada), NestJS (mucha ceremonia para un equipo
pequeño), Hono (válido, pero su ecosistema de servidor es más joven).
**Motivo:** los esquemas Zod validan la entrada y se comparten con los paneles
y el sitio (`packages/contratos`), como ya se hace con
`shared/suscripcion/validacion`. **Consecuencia:** la API es la única puerta a
los datos; las pantallas no contienen reglas de cobro, vigencia ni
autorización (principio 2 del plan).

### D4 · Acceso a datos — cerrada (14 oct 2026)

**Decisión:** Drizzle. **Descartado:** Prisma. **Motivo:** el aislamiento por
asociación se apoya en Row Level Security (D8) y Drizzle define las políticas
en el propio esquema y permite fijar el contexto por transacción sin rodeos;
con Prisma eso exige extensiones y envolver cada consulta. Además es SQL
explícito, que es lo que se querrá leer al auditar un cobro. **Driver:** `pg` (node-postgres). **Consecuencia:**
las migraciones se versionan con Drizzle Kit en el repositorio
(`docs/database-design.md`, sección 5).

### D5 · Autenticación — propuesta (alcance de proveedores cerrado)

**Decisión:** autenticación propia en la aplicación: sesiones en PostgreSQL y
una librería TypeScript para el flujo (Better Auth, con Auth.js como
alternativa). Al lanzamiento: correo (enlace o contraseña) y **Google**.
**Facebook queda fuera del alcance** (cerrado el 13 de octubre de 2026): exige
revisión de app de Meta y verificación de empresa; solo se reconsidera si la
audiencia lo pide. SSO institucional (OIDC/SAML) en la Etapa 7, con un
plugin SAML/OIDC, WorkOS o Cognito **solo para ese caso**.

**Descartado:** Amazon Cognito como acceso principal. **Motivo:** (1) la
pantalla de login alojada se personaliza poco y la plataforma promete marca
por asociación, así que habría que construir la pantalla igualmente; (2) la
identidad quedaría fuera de PostgreSQL y habría que mantener la
correspondencia `sub` → cuenta, lo que complica el RLS; (3) de un _user pool_
no se exportan contraseñas: salir de Cognito obliga a todos los usuarios a
cambiarla. Lo que Cognito aporta (federación por institución) no hace falta
hasta la Etapa 7.

**Consecuencia inmediata:** el aviso de privacidad y los términos del sitio,
hoy «Próximamente», pasan a ser **bloqueantes** antes del primer OAuth y antes
de Stripe.

### D6 · Identidad, persona y afiliación — cerrada (13 oct 2026)

`docs/database-design.md` separa **cuenta de acceso, persona, asociación
cliente, institución miembro, representación, plan, membresía, rol y permiso**,
y dice que «el acceso a otra asociación es independiente según la decisión de
producto vigente». El plan dice «accesos separados entre asociaciones».

**Recomendación:** una **cuenta de acceso** global (un correo, un login) ligada
a una **persona**; la **afiliación** a cada asociación (membresías,
representaciones, roles) es independiente y no se hereda de una asociación a
otra. «Accesos separados» se cumple como autorización, no como credenciales
distintas.

**Decisión del responsable (13 de octubre de 2026):** un solo login por
persona. Una persona con membresía en varias asociaciones usa la misma cuenta
de acceso; la autorización se resuelve por afiliación y nunca por coincidencia
de correo.

### D7 · Roles y permisos — propuesta

**Decisión:** módulo de permisos propio: tablas de rol y permiso en
PostgreSQL, roles globales (operador ASPAL, soporte) y por asociación
(administrador, gestor, representante, miembro), y una función
`puede(cuenta, acción, recurso)` con tests. Si se quiere librería, **CASL**
(nativa de TypeScript y reutilizable en React para ocultar acciones).

**Descartado:** Casbin. **Motivo:** el modelo de permisos es pequeño y estable;
Casbin añade un lenguaje de políticas, un adaptador y sincronización entre
instancias para lo que cabe en un módulo corto. Como señala la tabla de
opciones, ninguna librería de permisos resuelve el aislamiento de datos: eso
va en la aplicación y en PostgreSQL (D8). **Consecuencia:** las operaciones de
soporte de ASPAL sobre datos de una asociación requieren autorización
explícita, alcance acotado y auditoría (`database-design.md`, sección 3).

### D8 · Aislamiento entre asociaciones — cerrada (15 oct 2026)

**Mecanismo implementado y probado en el corte 2** (plan
`2026-10-15-001`): el de abajo, endurecido tras una revisión adversarial con
tres roles, política RESTRICTIVE, migraciones como dueño sin privilegios y
guardianes del catálogo, de los privilegios y del código.

**Cerrada por el plan:** aislamiento en servidor y en PostgreSQL, no solo
visual.

**Mecanismo propuesto:** esquema compartido; toda tabla propia de una
asociación lleva `asociacion_id NOT NULL`; cada petición autenticada abre una
transacción que fija `SET LOCAL app.asociacion_id` y las políticas RLS filtran
por él aunque una consulta olvide el `WHERE`. Las claves únicas y los índices
se definen en el ámbito de la asociación. Las relaciones entre entidades de
asociación comprueban que ambos extremos pertenecen a la misma (restricción
compuesta), además de la validación en la aplicación. Los datos de ASPAL
operador (clientes, contratos, comisiones) viven en tablas de ámbito
plataforma, separadas de ASPAL como asociación.

**Consecuencia:** cada etapa incluye tests que intentan leer y escribir datos
de una asociación con una sesión de otra (ASPAL y la organización de prueba, y
viceversa) y comprueban que se niega.

### D9 · Cobros de membresías y eventos — cerrada (Connect) + propuesta (forma)

**Cerrada por el plan:** Stripe Connect; cada asociación recibe sus cobros y
ASPAL retiene la comisión configurada por contrato.

**Forma propuesta:** cuentas **Express** (ASPAL controla el alta de la cuenta
y el panel), **Checkout** alojado con **cargos directos** en la cuenta de la
asociación y `application_fee_amount` para la comisión; tarjeta, **OXXO** y
**SPEI** habilitados. Los webhooks se procesan de forma **idempotente**: se
guarda el `event.id` de Stripe como único y cada efecto (activar membresía,
emitir inscripción) se deriva del estado registrado, nunca del orden de
llegada (`database-design.md`, secciones 2 y 4). **Consecuencia:** la cuenta
de Stripe de ASPAL debe estar en México y con Connect activado antes de la
Etapa 4.

### D10 · Suscripción de la asociación a ASPAL — propuesta

**Decisión:** Stripe **Billing** en la cuenta de plataforma, con la asociación
como cliente de ASPAL: precio por cliente, periodo de prueba de Stripe para
los días configurables y `collection_method: send_invoice` para quien pague
por transferencia, que en LATAM serán varias. Las **condiciones del contrato**
(precio, comisión, días de prueba, estado) se guardan en la base de la
plataforma; Stripe es el cobro, no la fuente de verdad del contrato.

**Descartado:** descontar la cuota de ASPAL del saldo de la cuenta conectada
(«service fees to connected accounts»). **Motivo:** una asociación en prueba
no tiene saldo, y mezcla la cuota con los cobros de miembros. **Consecuencia:**
la prueba vencida y los tres meses de solo lectura son estados del contrato en
nuestra base, no de Stripe (sección 5).

### D11 · Correos — cerrada (SES) + propuesta (plantillas)

**Cerrada por el plan:** SES para mensajes operativos; Mailchimp sigue con el
boletín.

**Propuesta:** plantillas con **React Email** (mismo React y Tailwind del
equipo, previsualización en desarrollo). Un _configuration set_ de SES por
asociación para seguir rebotes y quejas por separado (vía SNS); la lista de
supresión de SES es por cuenta de AWS, no por asociación. Remitente: el
dominio de ASPAL con el nombre de la asociación como nombre visible; dominios
propios por asociación (DKIM propio) en la Etapa 7.

**Consecuencia:** verificar el dominio y salir del _sandbox_ de SES lleva días
de calendario: se pide en la Etapa 1, corte 1, aunque se use en la 3 o la 4.

### D12 · Trabajos en segundo plano — propuesta

**Decisión:** **pg-boss** (cola sobre PostgreSQL) con patrón **outbox**: el
hecho de negocio y su publicación pendiente se registran en la misma
transacción (`database-design.md`, sección 4). Correos, certificados, avisos de
pago e IA corren ahí. **Descartado:** Redis + BullMQ, SQS. **Motivo:** una
pieza menos que operar; a este volumen PostgreSQL sobra.

### D13 · Frontend de la plataforma y páginas públicas por asociación — propuesta

**Decisión:** paneles (operador, administrador, miembro) como aplicación
React con Vite, TanStack Query y Router, Tailwind y `packages/ui`. Las
**páginas públicas de cada asociación** (planes, inscripción, eventos) deben
indexarse y son dinámicas, así que necesitan **SSR**.

**Abierto dentro de la decisión:** React Router 7 en modo _framework_ (SSR y
SPA en una sola aplicación) frente a SSR propio con Vite como el que ya hace
el prerender del sitio. **Recomendación:** React Router 7, para no mantener
un SSR a mano. Se decide en el corte 4 de la Etapa 1, cuando se construya la
primera página pública.

**Pendiente, ligado a la Etapa 2:** cómo se publica el contenido del gestor en
el sitio público (prerender en el build con una reconstrucción al publicar, o
renderizado en servidor o regeneración incremental) y cómo se conserva el 404
real del ADR 0003. Se resuelve en el inventario de la Etapa 2, antes de
construir la publicación; hasta entonces el prerender actual no cambia.

### D14 · Observabilidad, secretos y copias — propuesta

Sentry (errores y trazas, API y paneles); logs del contenedor en CloudWatch;
secretos en Secrets Manager (nunca en el repositorio ni en variables de CI);
copias automáticas de RDS con un **ensayo de restauración** documentado antes
de la Etapa 4. No son etapas, pero sin ellas la Etapa 4 no es lanzable.

### D15 · IA administrativa — aplazada

Como dice el plan: Etapa 7, borradores con revisión humana y acceso solo a
datos permitidos. El proveedor y la frontera de datos se deciden al abrirla;
no se toca antes.

## 4. Modelo de dominio inicial

Sigue `docs/database-design.md`: entidades separadas, claves foráneas (nada de
listas en JSON), hechos financieros separados de estados derivados, dinero en
importes exactos con moneda, instantes con zona horaria, historial donde
borrar destruiría evidencia. Es un punto de partida para la propuesta formal
de cada migración (sección 6 de la guía), no el esquema definitivo.

**Ámbito plataforma (ASPAL operador):**

| Entidad                                | Qué guarda                                                                                                                                    |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `asociacion`                           | Cliente de la plataforma: nombre, subdominio (único), logo, colores, zona horaria, estado                                                     |
| `contrato`                             | Condiciones por cliente: precio anual, comisión, días de prueba, estado (prueba, activa, vencida, solo lectura), fechas; historial de cambios |
| `cuenta_acceso`                        | Login: correo verificado (único), proveedor (correo, Google), estado. **Nunca** es la clave de identidad de negocio                           |
| `persona`                              | La persona física: nombre, datos de contacto. Una cuenta ↔ una persona                                                                        |
| `rol_global` · `asignacion_rol_global` | Operador ASPAL y soporte                                                                                                                      |
| `auditoria`                            | Acciones sensibles: quién, qué, sobre qué, cuándo, desde dónde                                                                                |
| `outbox`                               | Eventos pendientes de publicar (D12)                                                                                                          |

**Ámbito asociación (toda tabla lleva `asociacion_id`):**

| Entidad                                      | Qué guarda                                                                                                                                              |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `afiliacion`                                 | La persona dentro de la asociación: enlaza `persona` con `asociacion`; roles de la asociación cuelgan de aquí                                           |
| `rol` · `permiso` · `asignacion_rol`         | Administrador, gestor, representante, miembro, y qué puede cada uno                                                                                     |
| `institucion`                                | Institución miembro: razón social, datos fiscales (CFDI después)                                                                                        |
| `representacion`                             | Persona que representa a una institución: vigencia, estado. El límite de representantes lo fija el plan (fijo o ilimitado)                              |
| `plan`                                       | Plan **ofrecido**: individual o institucional; gratuito, estudiante, vitalicio; precio, moneda, vigencia, beneficios, número de representantes          |
| `membresia`                                  | Membresía **contratada**: persona o institución, plan, vigencia, origen (pago, alta manual, importación), estado; `membresia_historial` con cada cambio |
| `cargo` · `pago` · `devolucion` · `comision` | Hechos financieros con referencia única de Stripe; el estado de la membresía se **deriva** de ellos                                                     |
| `contenido` · `version_contenido` · `medio`  | Etapa 2: publicaciones, páginas, bloques, versiones y medios del gestor (propuesta formal pendiente; ver sección 8)                                     |
| `evento` · `tipo_entrada` · `descuento`      | Etapa 6                                                                                                                                                 |
| `inscripcion` · `asistencia` · `certificado` | Etapa 6                                                                                                                                                 |
| `envio_correo`                               | Registro de cada mensaje operativo y su resultado                                                                                                       |

**Reglas que el modelo ya fija:**

- Una `persona` puede tener en la misma asociación una `membresia` individual y
  una o varias `representacion` (decisión del plan).
- Un cambio de `plan` no altera las `membresia` ya contratadas; cada membresía
  guarda las condiciones con que se contrató (guía, sección 2).
- Claves únicas en ámbito de asociación: por ejemplo, el correo de contacto de
  una `institucion` puede repetirse en otra asociación.
- `membresia`, `representacion` y `contrato` no se borran: se desactivan y
  dejan historial.

## 5. Matriz de reglas de negocio (inicial)

El plan (sección 14) pide cerrarla antes de cobrar y de aplicar restricciones
comerciales (Etapa 4), y antes de eventos (Etapa 6). Se rellena con el
responsable; aquí queda la lista de casos y lo que cada uno
debe definir.

| Caso                      | Debe definir                                                                                                    | Estado      |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------- |
| Pago exitoso              | Cuándo se activa la membresía, qué correo sale, vigencia desde la fecha de pago o desde el vencimiento anterior | Por definir |
| Pago fallido              | Reintentos, plazo de gracia, cuándo pasa a vencida, qué ve el miembro                                           | Por definir |
| Alta manual               | Quién puede, qué se registra como origen, si lleva vigencia y precio                                            | Por definir |
| Renovación                | Aviso previo (días), ventana de renovación, qué pasa al vencer                                                  | Por definir |
| Prueba vencida (contrato) | Qué ve cada rol durante los tres meses de solo lectura; qué pasa al terminar                                    | Por definir |
| Cambio de representantes  | Si el límite es fijo, qué ocurre al sustituir; vigencia de la representación saliente                           | Por definir |
| Cancelación               | De membresía y de contrato; efectos sobre vigencia, datos y acceso                                              | Por definir |
| Descuentos                | Por membresía, por código, por institución; acumulables o no                                                    | Por definir |
| Devoluciones              | Quién autoriza, efecto sobre la membresía o inscripción, registro                                               | Por definir |
| Certificados              | Condición de emisión (asistencia, pago), plantilla, reemisión                                                   | Por definir |

## 6. Inventario de datos actuales y recorridos

**Inventario de contenido editorial (bloquea la Etapa 2).** Lo que se pide:
entradas, episodios de podcast, borradores accesibles, autores, taxonomías,
imágenes, adjuntos, incrustaciones, feeds, dónde se aloja el audio y qué
redirecciones hacen falta (plan, sección 9). La API pública de WordPress puede
no incluir borradores, versiones ni medios privados.

Primera pasada, 2026-10-14, solo con la API pública
(`comunidad.asociacionesprofesionales.org/wp-json/wp/v2`):

| Qué                       | Medido                                                                                                                                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entradas                  | **15**: 7 `blog` y 8 `podcast`, de 2024-04-30 a **2024-10-28** (sin publicaciones desde entonces); 3 autores; 0 etiquetas; 0 comentarios                                                        |
| Contenido de las entradas | Las **15** tras el muro de MemberPress: la API pública no da el cuerpo completo, por eso tampoco muestra incrustaciones ni el audio                                                             |
| Audio del podcast         | **Desconocido** desde fuera: ningún reproductor ni archivo visible en lo que entrega la API                                                                                                     |
| Páginas                   | 28, casi todas de la comunidad (grupos, mensajes, miembros, registro, login, cuenta, paneles de eventos), Elementor; entre ellas `politica-privacidad`, `blog`, `podcast` y `todos-los-podcast` |
| Medios                    | 245, **1,39 GB** declarados: 180 PNG, 27 MP4, 26 JPEG, 6 GIF, 4 PDF, 1 SVG, 1 WebP                                                                                                              |
| Fuera de la Etapa 2       | MemberPress Courses (1 curso, 36 lecciones), eventos (`event_listing`, 0), myCred, Advanced Ads, MailPoet: siguen en WordPress (decisión del 13 de octubre)                                     |

Segunda pasada, 2026-10-14, con la exportación WXR de «Entradas» que entregó el
responsable (WordPress 7.1.3, 864 KB). El archivo **no se versiona**: trae
datos de autores. Se guarda fuera del repo y se vuelve a pedir si hace falta.

| Qué               | Medido                                                                                                                                                                                                                             |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entradas          | Las mismas **15**, todas publicadas: **sin borradores** (el WXR no incluye revisiones). 13 de un autor y 1 de cada uno de otros dos                                                                                                |
| Cuerpo            | Completo, pero **maquetado con Elementor** en las 15 (`_elementor_data`): texto, títulos, imágenes, espaciadores, botones y bloques de entradas relacionadas. Hay que extraer el texto, no copiar HTML                             |
| Audio del podcast | **En Captivate.fm**, no en WordPress: los 8 episodios incrustan `player.captivate.fm/episode/<id>`. No hay audio que migrar, y el feed que leen Spotify y Apple también sale de Captivate (confirmado el 2026-10-14)               |
| Imágenes          | 37 distintas, todas en `comunidad.…/wp-content/uploads/2024/`. **13 son de la plantilla** (banners, redes, botones de Apple y Spotify, firma) y se repiten en todas; **24 son propias** y se migran; las de plantilla se descartan |
| Adjuntos          | 39 en el export: 26 PNG, 9 JPEG, 3 GIF, 1 PDF. Ningún audio ni vídeo: los 27 MP4 de la biblioteca no los usan las entradas                                                                                                         |
| SEO y extras      | Imagen destacada en las 15; Yoast con metadescripción en 14; extracto en las 15. 0 comentarios (un pingback sin aprobar); sin etiquetas. Metadatos de PeepSo, myCred y Advanced Ads: no se migran                                  |
| URL antiguas      | `comunidad.asociacionesprofesionales.org/<slug>/`: las 15 necesitan redirección cuando el contenido cambie de casa                                                                                                                 |

Decidido el 2026-10-14: el podcast sigue en Captivate (la plataforma solo
incrusta el reproductor de cada episodio) y las 13 imágenes de plantilla
(banners del boletín, del Mapa de Ruta y del estudio comparativo, redes,
botones, firma) **se descartan**; no se rehacen como bloques del gestor.

**Inventario de miembros (insumo pendiente, bloquea la Etapa 3):** dónde están
hoy los miembros de ASPAL (y, cuando ANPR se incorpore, los de ANPR) en
MemberPress, hojas de cálculo o pasarela previa, con qué campos, cuántos
registros, cuántos duplicados, y qué pagos históricos hay que conservar. De
esto depende la importación y si hace falta un periodo de operación en
paralelo con la plataforma actual.

**Recorridos (insumo pendiente):** se escriben primero para ASPAL, en el orden
de las etapas:

1. Un autor: edita una página existente, la envía a revisión; otro usuario
   autorizado la publica; se comprueba la página pública (Etapa 2).
2. Un miembro individual: descubre el plan, se registra, paga, accede, renueva
   (Etapas 3 y 4).
3. Una institución: se da de alta, designa representantes, los cambia, renueva.
4. Un administrador: da de alta manual, consulta vigencias, ve renovaciones
   próximas, exporta.
5. Un evento: se publica, recibe inscripciones gratuitas y de pago, hace
   check-in, emite certificados (Etapa 6).

Los de ANPR se escriben cuando se acuerde su incorporación como piloto. Cada
recorrido se escribe en una página y se aprueba antes de abrir la etapa que lo
implementa.

## 7. Trabajo de código de la Etapa 0

Un solo cambio, sin efecto funcional en el sitio. **Hecho el 2026-10-14** con el
alcance que aprobó el responsable ese día:

1. Monorepo con npm workspaces (D1): el sitio pasa a `apps/sitio`
   (`@aspal/sitio`) con `git mv`, en un commit solo de renombrados. Mismas 517
   versiones en el lockfile; ninguna dependencia nueva.
2. **`packages/ui` y `packages/contratos` se aplazan** hasta su primer
   consumidor (`apps/plataforma`, Etapa 1): extraer la UI sin un segundo
   usuario no da nada y la frontera se ve mejor con el primer panel; los
   esquemas Zod de la suscripción exigían añadir `zod` y reescribir una
   validación que funciona.
3. **Vercel sin tocar:** el Root Directory sigue siendo la raíz del repo,
   porque ese ajuste vale para todas las ramas y rompería los despliegues de
   `main`. `vercel.json` sigue en la raíz (`outputDirectory` →
   `apps/sitio/dist/public`) y `api/index.ts` de la raíz reexporta la función
   del sitio. Cuando `main` tenga el monorepo, el Root Directory pasa a
   `apps/sitio` y la puerta se borra.
4. Verificado: HTML, SSR y servidor compilado idénticos byte a byte al build
   anterior; tests, cobertura, lint, formato y `check:browser` en verde.
   Queda el despliegue de `staging` en Vercel, que exige push.

## 8. Backlog de la Etapa 1 (esqueleto andante)

Cinco cortes. Por la decisión del 14 de octubre (D2), cada uno se cierra en el
entorno local de Docker; el despliegue en la nube se hará después.

**Corte 2, hecho el 2026-10-15 en local:** tabla `asociacion`, aislamiento con
RLS (roles `aspal_dueno` y `aspal_app`, `conAsociacion`, política RESTRICTIVE),
resolución por subdominio y `GET /asociaciones/actual`. Matriz de cruce entre
ASPAL y la organización de prueba contra PostgreSQL real, con pruebas de
mutación. La página pública con marca queda para cuando se decida D13.

**Corte 1, hecho el 2026-10-14 en local:** `apps/plataforma` (Fastify 5, Zod 4,
Drizzle sobre `pg`), `GET /health` (`docs/api/plataforma.md`), migraciones con
Drizzle Kit (la primera, vacía), PostgreSQL 17 y la plataforma en
`compose.yaml`, y un job de CI con PostgreSQL real que construye la imagen. **Falta verificar la imagen:** en esta máquina el escudo web de Avast
intercepta HTTPS y `npm ci` falla dentro de Docker; la construye la CI (exige
push) o se resuelve Avast en local. Lo
de la nube (CDK, RDS, S3, SES, Secrets Manager, Sentry) queda para la mudanza.

| Corte                                    | Qué entrega                                                                                                                                                                   | Cierra cuando                                                                   |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 1 · Infraestructura mínima               | Cuenta AWS, CDK: contenedor, RDS, S3, SES (verificación de dominio y salida del sandbox pedidas), Secrets Manager, Sentry; CI que despliega; `/health`; migraciones corriendo | `app.asociacionesprofesionales.org/health` responde desde AWS                   |
| 2 · Asociaciones y aislamiento           | `asociacion`, resolución por subdominio, RLS con contexto por transacción, página pública mínima con logo y colores                                                           | El test de cruce ASPAL ↔ organización de prueba se niega en lectura y escritura |
| 3 · Acceso                               | `cuenta_acceso` global, `persona`, sesiones, correo y Google; roles globales y de asociación; `puede()`; invitaciones y recuperación                                          | Un administrador de la organización de prueba entra y no ve nada de ASPAL       |
| 4 · Panel de operador y de administrador | Alta de asociación, contrato (precio, comisión, prueba) con historial; módulos habilitados; marca de la asociación; decisión D13 tomada                                       | ASPAL da de alta a una organización sin tocar código                            |
| 5 · Estados y auditoría                  | Prueba, activa, vencida, solo lectura; registro de acciones sensibles; archivos con ámbito; ensayo de restauración desde respaldo                                             | Se cumple el cierre de la Etapa 1 del plan                                      |

La **Etapa 2 (gestor de contenido)** es la primera entrega operativa y tiene su
propio backlog, que se escribe al cerrar la Etapa 1: contenido, medios, flujo
editorial, tipos configurables acotados, plantillas de páginas, publicación y
migración de blog y podcast. Antes hay que cerrar el inventario editorial y la
decisión de renderizado (D13). Las etapas 3–7 siguen la misma mecánica: backlog
con criterios de aceptación, cortes desplegados, cierre con el caso completo de
ASPAL y de una segunda organización.

## 9. Preguntas para el responsable

Las que cambian el modelo o el calendario; el resto se decide por la
recomendación.

Cerradas el 13 de octubre de 2026: identidad (D6, un solo login), Facebook
(D5, fuera de alcance), forma del repositorio (D1) y servidor (D3).

Respondidas el 14 de octubre de 2026:

- **Equipo:** el responsable decide y aprueba; la implementación la hace él con
  Claude Code, por fases cortas como hasta ahora. Sin más aprobadores.
- **Exportación de WordPress:** el responsable exporta desde wp-admin (WXR) y
  entrega el archivo e indica dónde está el audio del podcast. No se comparten
  credenciales.
- **Aviso de privacidad y términos:** el texto de la página `politica-privacidad`
  de WordPress (actualizada 2024-11-19) se copió literal a páginas propias del
  sitio: `/aviso-de-privacidad` (responsable, finalidades, derechos ARCO) y
  `/terminos` (reglamento de la comunidad). **No menciona el boletín ni
  Mailchimp, Google ni Stripe**, y trae un correo ARCO inválido, teléfonos
  distintos de los del sitio y otro nombre de responsable (lista en
  `client/src/content/institucional/documentos-legales.ts`). Antes de activar el
  acceso con Google o los cobros, y conviene que ya para el boletín, hay que
  completarlo (revisión legal a cargo del responsable).
- **D13 (renderizado y publicación):** se decide más adelante; no bloquea la
  Etapa 1.

Quedan:

1. **Contenido editorial (sección 6):** cerrado el 2026-10-14: exportación
   analizada, audio y feed en Captivate, imágenes de plantilla descartadas.
2. **Datos actuales (sección 6):** ¿dónde están hoy los miembros y pagos de
   ASPAL, y hay que conservar el historial de pagos? (Etapa 3.)
3. **Renderizado y publicación (D13):** abierto (ver arriba).
4. **Términos de uso:** se reutilizó el reglamento de la comunidad
   (`/terminos`); no cubre la plataforma (cuentas, pagos, organizaciones). Hay
   que ampliarlo antes de OAuth y Stripe, junto con el aviso.
5. ~~Equipo~~ y ~~aviso de privacidad~~: respondidas arriba.
6. **Cuentas:** AWS (¿existe?, ¿qué región?) y Stripe (¿cuenta mexicana con
   Connect?).
7. **Dominios:** confirmar `app.` y `*.asociacionesprofesionales.org` para la
   plataforma y quién administra el DNS.
8. **Nombre de la plataforma** de cara al cliente (afecta a subdominios,
   remitente de correos y marca de los paneles).

## 10. Riesgos añadidos a los del plan

| Riesgo                                                            | Control                                                                                                                                |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Reestructurar el repositorio rompe el sitio sin que nadie lo note | El cambio de la sección 7 se hace solo, con el sitio desplegado en `staging` y comparado ruta a ruta antes de seguir                   |
| Las decisiones «propuestas» se dan por cerradas sin revisión      | Este documento se revisa con el responsable antes del corte 1; cada decisión cambia de estado por escrito                              |
| Documentos legales llegan tarde                                   | Se piden en la Etapa 0 (pregunta 5) con fecha límite antes del corte 3                                                                 |
| SES y Stripe tardan en habilitarse                                | Se solicitan en el corte 1 de la Etapa 1 aunque se usen en la 3 o la 4                                                                 |
| Apagar WordPress pierde contenido, medios o URLs                  | Solo para blog y podcast, con corte editorial, redirecciones y retorno temporal (plan, sección 9); MemberPress y comunidad no se tocan |
| Operar dos sistemas de miembros a la vez                          | El inventario de la sección 6 decide si hay periodo en paralelo y cuánto dura                                                          |
