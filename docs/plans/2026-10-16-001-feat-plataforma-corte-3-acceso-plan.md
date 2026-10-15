---
title: Etapa 1, corte 3 — acceso: cuentas, sesiones y permisos por asociación
type: feat
status: aprobado
date: 2026-10-16
origin: docs/plans/2026-10-01-001-feat-plataforma-etapa-0-plan.md (§8, D5, D6, D7) · docs/plans/2026-10-15-001-feat-plataforma-corte-2-asociaciones-plan.md · ADR-0006 · docs/database-design.md (§6)
---

# feat(plataforma): acceso — cuentas, sesiones y permisos por asociación

> Especificación, propuesta de esquema y plan del corte 3, corregidos tras **dos
> revisiones adversariales independientes** y **aprobados por el responsable el
> 2026-10-16** con las decisiones del §2 y §8. Cierra el corte cuando un
> administrador de la organización de prueba entra y no ve nada de ASPAL (plan
> de la Etapa 0, §8).

## 1. Objetivo y alcance

Que una persona se registre o sea invitada, entre, tenga una sesión **atada a la
asociación en la que entró** y solo pueda hacer lo que su rol en **esa**
asociación permite. El gestor de contenido (Etapa 2) y los miembros (Etapa 3) se
apoyan en esto.

**Dentro:**

- `persona`, `cuenta_acceso`, roles, sesiones y límites de uso, **todo dentro de
  la asociación** y bajo RLS.
- Entrada con correo y contraseña; recuperación; límites de uso y protección
  frente a saturación por el coste del hash.
- **Registro abierto** de miembros (rol `miembro`), activable por asociación, e
  **invitaciones** para roles de gestión.
- Entrada con enlace al correo (opcional, §8) y con Google (OIDC).
- Roles de asociación (`administrador`, `gestor`, `representante`, `miembro`),
  estados de la persona y `puede()` con denegación por defecto.
- Correo operativo por SMTP (Mailpit en local, SES más adelante).

**Fuera (con su corte):**

- **Dashboard maestro** (panel de operador, **corte 4**; requisito del responsable, §8.1): alta de asociaciones y de su primer administrador, contratos y módulos, estadísticas y soporte. Los **operadores** (personal de ASPAL) no son miembros de ninguna asociación: viven en un reino aparte, con su propio acceso en el host reservado `app`, rol y pool de base de datos propios y todo auditado. Este corte lo deja **sin bloquear**: nada de lo que se construye aquí impide ese reino aparte.
- Auditoría completa y archivos: corte 5. Mientras, los eventos de acceso salen
  como logs estructurados **sin datos personales**.
- Doble factor para cuentas privilegiadas: obligatorio **antes de producción**
  (plan, §5.3). Aquí solo se deja la columna `nivel_autenticacion` en la sesión.
- Cambio de correo de una cuenta: **no existe** en este corte.
- Las **restricciones de la membresía gratuita**: llegan con los planes
  (Etapa 3). Quien se registra aquí solo tiene el rol `miembro`, con los permisos
  mínimos.
- Pantallas (login, perfil): D13. Este corte es solo API.

## 2. Decisiones del responsable (2026-10-16)

| Decisión                      | Resultado                                                                                                                                                                   |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Modelo de cuenta**          | **A · La cuenta vive dentro de la asociación.** El mismo correo en dos asociaciones son dos cuentas independientes. **Reabre y cierra de nuevo D6**: ya no hay login global |
| **Cómo se crean las cuentas** | **Registro abierto + invitación.** Cualquiera se registra como miembro; los roles de gestión se dan por invitación                                                          |
| **Capa de sesión**            | **Propia**, sin librería de autenticación (reabre D5, que proponía Better Auth). Ver §2.1                                                                                   |

### 2.1 Por qué sesión propia

Better Auth (con su plugin de organizaciones) cubre buena parte del corte, pero:
sus consultas salen por su propia conexión, **fuera de `conAsociacion`**, así que
o sus tablas quedan sin RLS o hay que escribir un adaptador propio que meta el
contexto en cada consulta (posible, no probado); su sesión guarda una
«organización activa», no está atada al subdominio; su usuario es **global**, y
el modelo A pide lo contrario; y tuvo en 2026 avisos de toma de cuentas de la
clase que este plan cierra. Con código propio esos errores serían nuestros: por
eso cada defensa del §3 tiene su test y su mutación.

| Pieza                   | Para qué                                             | Dependencia nueva                      |
| ----------------------- | ---------------------------------------------------- | -------------------------------------- |
| Hash de contraseñas     | scrypt (OWASP: N=2¹⁷, r=8, p=1), con `maxmem` fijado | ninguna (`node:crypto`)                |
| Validar el token Google | firma, `iss`, `aud`, `azp`, `exp` y `nonce`          | `jose` (3c)                            |
| Correo                  | SMTP (Mailpit local, SES SMTP después)               | `nodemailer`, `@types/nodemailer` (3b) |
| Cookies                 | lectura y escritura con atributos                    | `@fastify/cookie` (3a)                 |

### 2.2 Riesgos residuales que hay que decir en voz alta

1. **Inyección SQL.** La aplicación se conecta con un solo rol (`aspal_app`). Una
   inyección en cualquier ruta le permitiría fijar el contexto de **una**
   asociación y crear sesiones o leer datos de ella. Ya no puede recorrer las
   cuentas de todas: no existe ninguna tabla de acceso global. La defensa real es
   **no tener SQL en bruto** (guardián existente) y los parámetros enlazados.
2. **Fuerza bruta distribuida contra una cuenta.** El contador de la cuenta solo
   da alerta, no bloquea (bloquearía a su dueño legítimo). Una botnet que rote
   orígenes puede seguir adivinando contraseñas de 12 caracteres contra una cuenta
   de administrador. Se acepta **hasta el doble factor**, que es obligatorio antes
   de producción.
3. **El correo es la llave.** Quien controle el buzón controla la cuenta (registro,
   recuperación, enlace mágico). Es inherente al correo; el doble factor de los
   administradores lo mitiga.

### 2.3 Cómo se parte el corte

Tres ramas, cada una con su revisión adversarial del **código**, su fusión y su
rama borrada:

- **3a · Núcleo:** persona, cuenta, sesión, contraseña, límites, roles y estados,
  `puede()` y semillas. Sin correo ni Google.
- **3b · Correo:** SMTP, registro abierto, recuperación, invitaciones y enlace
  mágico.
- **3c · Google.**

## 3. Lo que se defiende (modelo de amenazas)

Cada fila tiene su criterio de aceptación y su test.

| Amenaza                                                                     | Defensa                                                                                                                                                                                                                                      |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Usar la sesión de la asociación B en la A                                   | La sesión es una fila de la asociación (RLS): desde otra asociación **no existe**. Además se compara con la del `Host`                                                                                                                       |
| Ver o tocar cuentas de otra asociación                                      | Todas las tablas de acceso llevan RLS y claves compuestas; **no hay tablas globales**; el correo es único solo dentro de la asociación                                                                                                       |
| **Login que gana la carrera contra un cambio de contraseña**                | El login crea la sesión en una transacción que **revalida** la versión de credencial y el estado leídos antes; si cambiaron, `401` (CA-3, CA-6)                                                                                              |
| Contraseña robada o cambiada que deja sesiones vivas                        | Cambiar la contraseña, suspender o dar de baja sube la versión de credencial y revoca **todas** sus sesiones en la misma transacción                                                                                                         |
| **Pre-registro del correo de la víctima** («pre-hijack»)                    | **No existen cuentas sin verificar**: el registro guarda un pendiente y la cuenta se crea, con la contraseña elegida **en ese momento**, al consumir el enlace del buzón                                                                     |
| Saber si un correo tiene cuenta (enumeración, por contenido o por tiempo)   | Todas las ramas hacen **exactamente un scrypt** y responden igual; registro, recuperación y enlace público responden siempre `202`; el envío no bloquea; las claves de límite salen del **correo enviado**, no de la existencia de la cuenta |
| **Impedir que la víctima reciba su enlace** (negación de servicio dirigida) | Una solicitud nueva **no invalida** los enlaces vigentes (hasta 3 por correo); el límite por destinatario solo frena el **envío**                                                                                                            |
| **Agotar el cupo de una asociación**                                        | Presupuestos **separados por tipo** (registro, recuperación, invitación, aviso): agotar el de registro no afecta a la recuperación                                                                                                           |
| Abusar del registro: cuentas basura y correo masivo a terceros              | Límites por origen, por destinatario (correo **normalizado**: sin `+etiqueta`) y diario; plantillas **sin campos libres** del solicitante; CAPTCHA antes de abrir al público                                                                 |
| Fuerza bruta y carreras entre peticiones paralelas                          | Se **reserva** el intento antes de verificar, con una sola sentencia atómica; un éxito **no reinicia** el límite de origen                                                                                                                   |
| Bloquear a un tercero a propósito                                           | El bloqueo estricto incluye el origen; el contador de la cuenta solo da alerta (§2.2); el límite de origen no se aplica a quien ya trae una sesión válida                                                                                    |
| Saturar el servidor con logins (scrypt = 128 MiB y hilos de libuv)          | Semáforo con **tope por asociación** en la cola, `maxmem` explícito, `UV_THREADPOOL_SIZE`, límite grueso por IP que cuenta **cada** petición y actúa **antes** de resolver la asociación                                                     |
| Falsificar el origen con `X-Forwarded-For`                                  | `trustProxy` explícito: **el servidor no arranca en producción sin `TRUST_PROXY`**; clave de origen IPv6 por /64; los enlaces **no** usan `request.hostname`                                                                                 |
| Una conexión colgada que bloquea a toda una asociación                      | `statement_timeout`, `lock_timeout` e `idle_in_transaction_session_timeout` fijados al crear el pool y comprobados al arrancar                                                                                                               |
| Robo de la base: leer sesiones, tokens o contraseñas                        | Solo se guarda el **hash** de tokens; contraseñas con scrypt, sal propia y parámetros dentro del hash                                                                                                                                        |
| Fijación de sesión                                                          | Sesión nueva en cada entrada y al cambiar contraseña o roles propios; nunca se acepta un identificador del cliente                                                                                                                           |
| CSRF y _login CSRF_                                                         | `SameSite=Lax`, solo JSON, `Origin` **exacto** (esquema + host + puerto) y `Sec-Fetch-Site` contra la asociación resuelta, también en `POST /sesiones`; sin `Origin`, `403`                                                                  |
| Robo o plantado de cookie                                                   | `HttpOnly`, `Secure`, prefijo `__Host-`, sin `Domain` (un subdominio hermano no puede plantarla)                                                                                                                                             |
| Rol revocado que sigue funcionando                                          | Permisos leídos de la base en **cada** petición, con los roles actuales; persona suspendida o dada de baja mata la sesión en esa petición                                                                                                    |
| Autopromoción y administradores que se quitan entre sí a la vez             | Solo `administrador` asigna roles y cambia estados; nadie cambia los propios; bloqueo por asociación y recuento **tras** el bloqueo en **toda** vía que reduzca administradores                                                              |
| Invitación cuyo privilegio sobrevive al invitador                           | Aceptar revalida el permiso del invitador **en ese momento**; perder el rol invalida sus invitaciones pendientes                                                                                                                             |
| Google de otra persona aceptando la invitación de un tercero                | El correo **verificado y normalizado** de Google debe ser igual al de la invitación                                                                                                                                                          |
| _Login CSRF_ y vinculación por correo en el retorno de Google               | `state`, `nonce` y PKCE de un solo uso, ligados al navegador con una cookie propia; Google **nunca** se vincula solo por coincidencia de correo                                                                                              |
| Enlaces de correo reutilizados, consumidos por escáneres o filtrados        | Un solo uso atómico; el token viaja en el **fragmento** (`#`) y se confirma por `POST`; un `GET` no consume nada; la query se oculta de los logs                                                                                             |
| Entrar en la cuenta de otro con su enlace mágico                            | El enlace solo vale en el **navegador que lo pidió** (cookie propia); un token inventado cuesta cero scrypt                                                                                                                                  |
| Mezclar asociaciones en una caché compartida                                | `Cache-Control: private, no-store` y `Vary: Host, Cookie` por defecto en **todas** las respuestas (salvo `/health`), incluidos 401/403/404                                                                                                   |
| Una ruta que olvida resolver la asociación o la sesión                      | Toda ruta declara una de **tres categorías** (global, pública de asociación, autenticada); un test recorre `onRoute` y falla si falta                                                                                                        |
| Un hash, un token o un `id` de cuenta en una respuesta o en un log          | **Repositorio único** de acceso, esquemas de salida revisados por test, serializador de `req` que quita la query y errores que no arrastran parámetros enlazados                                                                             |

## 4. Especificación (criterios de aceptación)

**3a — Núcleo**

- **CA-1 · Modelo.** Existen `persona`, `cuenta_acceso`, `asignacion_rol`,
  `sesion` y `limite_uso`, **todas de la asociación** (§5). Una persona tiene una
  sola cuenta; un correo (ASCII, minúsculas) una sola cuenta **por asociación**.
  El estado (`activa`/`suspendida`/`baja`) vive **solo** en `persona`.
- **CA-2 · Aislamiento de lo nuevo.** Las cinco llevan el patrón del corte 2 (RLS
  restrictiva, claves compuestas). **Los guardianes existentes no se tocan** y
  siguen en verde; no se añade ninguna función `SECURITY DEFINER`. Se añaden los
  guardianes del §5.5.
- **CA-3 · `POST /sesiones` en tres pasos.**
  1. Transacción corta: reserva el intento y lee cuenta, persona y
     `credencial_version`.
  2. scrypt **fuera** de toda transacción.
  3. Transacción que inserta la sesión **solo si** la `credencial_version` y el
     estado de la persona siguen siendo los leídos (`INSERT … SELECT … WHERE`);
     con 0 filas, el mismo `401`. El rehash usa comparar-y-cambiar sobre el hash
     leído.

  Con correo y contraseña válidos y persona activa, `200` con cookie. En
  cualquier otro caso, **el mismo** `401` (`CREDENCIALES_INVALIDAS`) con **el
  mismo número de scrypt** en todas las ramas.

- **CA-4 · Cookie.** `__Host-aspal_sesion`, `HttpOnly`, `Secure`,
  `SameSite=Lax`, `Path=/`, sin `Domain`. En local sobre `http`, el prefijo y
  `Secure` se desactivan por una opción de configuración que **impide arrancar**
  si `DOMINIO_BASE` no termina en `.localhost`.
- **CA-5 · Sesión atada.** Una sesión de la asociación B presentada en el `Host`
  de A no se reconoce (`401`), aunque el token sea válido.
- **CA-6 · Revocación sin carreras.** Cambiar la contraseña, suspender o dar de
  baja sube `credencial_version` y revoca todas las sesiones de la persona en la
  misma transacción. **Test de la carrera:** se pausa el login tras el scrypt, se
  cambia la contraseña y se reanuda; debe dar `401` y **cero sesiones vivas**.
  Igual con un rehash concurrente.
- **CA-7 · `GET /sesiones/actual` y `DELETE /sesiones/actual`.** Devuelven quién
  es la persona (nombre y roles, sin `id` internos) y cierran la sesión; después,
  el mismo token no sirve.
- **CA-8 · Caducidad y tope.** Por inactividad y absoluta (§7), evaluada con los
  roles **actuales**; `ultimo_uso_en` se actualiza como máximo cada 5 minutos.
  Una persona suspendida o de baja pierde la sesión en la misma petición. Tope de
  10 sesiones vivas por cuenta (se revoca la más antigua).
- **CA-9 · Cambios de estado.** Toda petición con efecto, **incluida**
  `POST /sesiones`, exige `application/json`, un `Origin` idéntico (esquema, host
  y puerto) al de la asociación resuelta y un `Sec-Fetch-Site` compatible; sin
  `Origin`, `403`.
- **CA-10 · Límites de uso.** Se reserva el intento antes de verificar con una
  sola sentencia atómica. 50 intentos simultáneos con contraseña errónea provocan
  **como máximo 5** hashes. Las claves son HMAC (secreto del servidor y prefijo de
  tipo) del **correo enviado**, nunca del `id` de cuenta. Un login correcto solo
  reinicia **su** clave (correo, origen), jamás la de origen, y todas las
  peticiones, correctas o no, cuentan en el límite grueso de origen. **30 fallos
  desde 30 orígenes contra el mismo correo** dan la **misma respuesta** que
  contra un correo inexistente. La tabla se limpia en lotes y tiene tope.
- **CA-11 · Coste del hash.** `maxmem` explícito, semáforo de 2 hashes en vuelo y
  cola acotada **con tope por asociación** (si se llena, `503` sin hashear),
  `UV_THREADPOOL_SIZE` fijado, parámetros del hash validados al leerlos, NFKC,
  comparación en tiempo constante. Con 20 logins simultáneos, `/health` responde
  en menos de un segundo; un atacante contra la asociación X no deja sin servicio
  a la Y.
- **CA-12 · Origen.** `trustProxy` explícito: el servidor **no arranca en
  producción** sin `TRUST_PROXY`. Clave de origen IPv6 por /64; un
  `X-Forwarded-For` falsificado desde un cliente no confiable no cambia la clave.
  El umbral por origen es mayor que el de (correo, origen) y no se aplica a quien
  trae una sesión válida. Un guardián prohíbe `request.hostname` y
  `request.protocol` para construir enlaces.
- **CA-13 · Contraseñas.** 12–200 caracteres, distinta del correo y de una lista
  corta de comunes; scrypt N=2¹⁷, r=8, p=1, sal de 16 bytes y parámetros en el
  propio hash; se rehashea al entrar si quedaron viejos.
- **CA-14 · `puede()`.** Pura, deniega por defecto, matriz completa rol × acción
  generada de la lista de acciones (falla si falta una). Sin sesión o con persona
  no activa: no puede nada.
- **CA-15 · Roles y estados.** `PUT /personas/:personaId/roles` y
  `PUT /personas/:personaId/estado` solo para `administrador`. No se puede dejar
  la asociación **sin administrador activo** por ninguna vía (quitar el rol,
  suspender, dar de baja), ni cambiar los propios roles o estado, ni asignar un
  rol a una persona no activa. Toda mutación toma un bloqueo por asociación
  (`pg_advisory_xact_lock` con clave derivada del `id` de la asociación) y **recuenta
  tras el bloqueo**. Tres tests con **dos conexiones reales**: dos que se quitan el
  rol, dos que se suspenden y una de cada; en todos queda exactamente uno. Los
  cambios dejan `asignado_por`/`revocado_por` y rotan la sesión.
- **CA-16 · Una transacción por petición y tres categorías de ruta.**
  `conSesion(peticion, fn)` resuelve la sesión, la persona y los roles en un único
  `conAsociacion`. Toda ruta declara **global**, **pública de asociación**
  (requiere asociación, no sesión: `POST /sesiones`, `/registros`, recuperación)
  o **autenticada**; el test sobre `onRoute` falla si falta, y exige `Origin` y
  las cabeceras de caché donde corresponda. Las rutas que hashean (cambiar
  contraseña, reautenticar) leen en `conSesion`, **cierran**, hashean y revalidan
  en una segunda transacción.
- **CA-17 · Caché.** Todas las respuestas salen con `Cache-Control: private,
no-store` y `Vary: Host, Cookie`, salvo `/health`.
- **CA-18 · Tiempos de la base.** El pool fija `statement_timeout`,
  `lock_timeout` e `idle_in_transaction_session_timeout`; `verificarRolDeAplicacion`
  los comprueba al arrancar. Un bloqueo colgado falla rápido y no retiene una
  conexión.
- **CA-19 · Semillas locales.** `db:sembrar` crea, en ASPAL y en la organización
  de prueba, un administrador (contraseña de una variable local) y un miembro, y
  **la misma dirección de correo** en las dos con cuentas independientes. Se
  niega a correr fuera de una base local.
- **CA-20 · Cierre del corte.** Test de punta a punta: el administrador de
  `prueba` entra en `prueba.localhost`; su cookie no vale en `aspal.localhost`;
  con su correo y contraseña **no** puede entrar en ASPAL; ninguna ruta le muestra
  filas de ASPAL; y la persona con el mismo correo en las dos tiene en cada una
  **solo** sus propios roles.
- **CA-21 · Privilegios mínimos.** `aspal_app` recibe solo lo del §5.4, **por
  columna** donde corresponde, y la instantánea de privilegios los comprueba por
  columna.

**3b — Correo, registro, invitaciones y enlace mágico**

- **CA-22 · Correo operativo.** SMTP con tiempo máximo; en local lo recoge
  Mailpit. El envío **no bloquea** la respuesta (cola acotada: si se llena, se
  descarta y se registra) y un fallo se registra sin datos personales. **Las
  plantillas no llevan ningún campo libre del solicitante**: solo la asociación,
  el enlace y texto fijo. Tope global de envíos por proceso, además del de cada
  asociación.
- **CA-23 · Registro abierto.** La asociación lo activa con `registro_abierto`.
  `POST /registros` (**solo el correo**) responde siempre `202` y **no crea ninguna
  cuenta**: guarda un pendiente y envía un enlace. Confirmar (`POST`, token en el
  fragmento) pide **nombre y contraseña en ese momento** y registra la
  aceptación de términos; crea persona y cuenta con el correo verificado. Quien
  tiene ya una cuenta con ese correo recibe un aviso en lugar del enlace. El
  token se valida **antes** de hashear (100 tokens inventados cuestan **cero**
  scrypt). Consumir es **una sola sentencia atómica** y la `UNIQUE (asociacion_id,
correo)` es el árbitro final: **20 confirmaciones simultáneas con el mismo
  token dan exactamente 1 cuenta** y 19 respuestas idénticas.
- **CA-24 · Anti-abuso.** Presupuestos **separados** por tipo (registro,
  recuperación, invitación, aviso), por origen, por destinatario (correo
  normalizado) y diarios por asociación. Una solicitud nueva **no invalida** los
  enlaces vigentes (hasta 3 por correo): el límite solo frena el envío. Agotar el
  cupo de registro de A **no** afecta a la recuperación de A. Los pendientes
  caducados se limpian en lotes.
- **CA-25 · Recuperación.** `POST /solicitudes-recuperacion` responde siempre
  `202`. `POST /restablecimientos-contrasena` cambia la contraseña (token de un
  solo uso, 1 h), sube la versión de credencial, revoca todas las sesiones (CA-6) y
  avisa por correo del cambio. Una cuenta sin contraseña (alta por Google o
  enlace) fija una con el buzón verificado; se comprueba que la persona esté
  activa.
- **CA-26 · Invitaciones.** Un `administrador` invita por correo con un rol
  (plantilla fija, tope diario por administrador); puede listar y **revocar**
  las pendientes. Caduca a los 7 días, un solo uso. **Aceptar revalida el permiso
  del invitador en ese momento**, y perder el rol invalida sus pendientes. Si el
  correo ya tiene cuenta, se le dice al administrador (ve a sus miembros) y se le
  asigna el rol por `PUT`. Aceptar crea persona y cuenta con la contraseña que la
  persona elige. Una invitación de una asociación no se acepta en otra; reinvitar
  a una persona dada de baja **no** restaura los roles anteriores.
- **CA-27 · Enlace mágico (opcional, §8).** `POST /solicitudes-acceso` responde
  siempre `202`. El enlace caduca a los 15 minutos, es de un solo uso, viaja en el
  fragmento, se confirma por `POST` y **solo vale en el navegador que lo pidió**
  (cookie `__Host-aspal_enlace`). La sesión que crea tiene `nivel_autenticacion`
  1: no sirve para operaciones que exijan reautenticación. Las mismas defensas de
  enumeración, tiempo y presupuesto que el resto.

**3c — Google**

- **CA-28 · Flujo.** Código con PKCE; `state`, `nonce` y verificador guardados en
  `estado_oauth` (con RLS, de un solo uso, caducan en 10 min, con límite por
  origen y limpieza) y ligados al navegador con la cookie `__Host-aspal_oauth`; sin
  esa cookie, el retorno se rechaza. Validación completa con `jose`: `iss` (sus
  dos formas), `aud`, `azp`, `exp`, `nonce` y `email_verified === true` estricto.
  Los endpoints de Google están fijos en código. El destino posterior sale de una
  **lista cerrada** de rutas propias, nunca de la petición. Se prueba contra un
  proveedor falso.
- **CA-29 · Alta, entrada y vínculo.** Se entra con Google si la identidad está
  vinculada, aplicando las **mismas** comprobaciones de persona activa y la misma
  respuesta uniforme. Si no existe cuenta con ese correo, se crea una (registro
  con buzón probado, si la asociación lo permite) y **consume la invitación
  pendiente de ese correo**, si la hay. Si existe una cuenta con ese correo, **no
  se vincula sola**: se entra con la contraseña y se vincula desde la sesión con
  **reautenticación reciente** (`reautenticada_en`). No se puede desvincular la
  última credencial. Aceptar una invitación con Google exige que el correo
  verificado coincida con el de la invitación.

**Transversales**

- **CA-30 · Nada sensible fuera.** Repositorio único de acceso (§5.5), esquemas de
  salida sin campos de hash, token o `id` de cuenta, serializador de `req` que
  quita la query, y manejador de errores que **no** serializa parámetros
  enlazados. Test: una violación de `UNIQUE` en un `INSERT` con hash y token no
  deja ninguno de los dos en el log ni en la respuesta.
- **CA-31 · Verificación.** Typecheck, lint, formato, tests unitarios y de
  integración, **mutaciones** de cada defensa del §3, el sitio idéntico byte a
  byte y una revisión adversarial independiente del **código** antes de cerrar
  cada rama.

## 5. Propuesta de esquema (`database-design.md`, §6)

### 5.1 Necesidad

Identidad y acceso de las personas de cada asociación. Dueño: cada asociación.
Ciclo de vida: la persona y su cuenta, mientras dure su relación con la
asociación; la sesión, horas o días.

### 5.2 Inspección

Esquema actual (`0000`–`0003`): `asociacion` y las funciones `app.*`. Nada de
esto existe con otro nombre. **Cambia el modelo del plan** (§4 del plan de la
Etapa 0): `cuenta_acceso` pasa de global a de la asociación y desaparece
`afiliacion`, porque con la persona dentro de la asociación ya es la relación.
`database-design.md` (§2) ya dice que «el acceso a otra asociación es
independiente».

### 5.3 Modelo propuesto

**Todas las tablas son de la asociación**: llevan `asociacion_id` y el patrón del
corte 2 (RLS restrictiva, FK compuestas, guardianes). No hay tablas globales.
Todas las FK entre ellas son compuestas `(asociacion_id, …)` y `ON DELETE
RESTRICT`, **incluidas** `asignado_por`, `revocado_por` e `invitada_por`.

| Tabla                     | Columnas principales                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `asociacion` (cambio)     | se añade `registro_abierto boolean NOT NULL DEFAULT false` (migración `0004`, junto con los subdominios reservados)                                                                                                                                                                                                                                                                           |
| `persona`                 | `id`, `asociacion_id`, `nombre` (2–120), **`estado`** (`activa`/`suspendida`/`baja`), `creado_en`; `UNIQUE (asociacion_id, id)`                                                                                                                                                                                                                                                               |
| `cuenta_acceso`           | `id`, `asociacion_id`, `persona_id` (FK compuesta, `UNIQUE (asociacion_id, persona_id)`), `correo` con `CHECK` (ASCII imprimible, 3–254, `= lower(correo)`), `correo_verificado_en NOT NULL`, `hash_contrasena NULL`, **`credencial_version int NOT NULL DEFAULT 1`**, `terminos_version NULL`, `terminos_aceptados_en NULL`, `creado_en`, `actualizado_en`; `UNIQUE (asociacion_id, correo)` |
| `asignacion_rol`          | `id`, `asociacion_id`, `persona_id` (FK compuesta), `rol` (`administrador`/`gestor`/`representante`/`miembro`, `CHECK`), `asignado_en`, `asignado_por`, `revocado_en NULL`, `revocado_por NULL`; índice único **parcial** `(asociacion_id, persona_id, rol) WHERE revocado_en IS NULL`                                                                                                        |
| `sesion`                  | `id`, `asociacion_id`, `cuenta_id` (FK compuesta), `token_hash bytea`, `nivel_autenticacion smallint DEFAULT 1`, **`reautenticada_en NULL`**, `creada_en`, `ultimo_uso_en`, `expira_en`, `revocada_en NULL`; `UNIQUE (asociacion_id, token_hash)`                                                                                                                                             |
| `limite_uso`              | `asociacion_id`, `clave bytea` (HMAC con secreto del servidor y prefijo de tipo: cuenta, origen, registro, aviso…), `contador`, `ventana_desde`, `bloqueado_hasta NULL`; PK `(asociacion_id, clave)`. **Sin `id`**: ninguna tabla la referencia                                                                                                                                               |
| `registro_pendiente` (3b) | `id`, `asociacion_id`, `correo`, `token_hash bytea`, `creado_en`, `expira_en`, `usado_en NULL`, `terminos_version`; `UNIQUE (asociacion_id, token_hash)`. Hasta 3 vigentes por correo; consumir marca **todos** los de ese correo                                                                                                                                                             |
| `token_correo` (3b)       | `id`, `asociacion_id`, `cuenta_id` (FK compuesta), `tipo` (`recuperar_contrasena`/`enlace_acceso`), `token_hash bytea`, `creado_en`, `expira_en`, `usado_en NULL`; `UNIQUE (asociacion_id, token_hash)`                                                                                                                                                                                       |
| `invitacion` (3b)         | `id`, `asociacion_id`, `correo`, `rol`, `token_hash bytea`, `invitada_por` (FK compuesta a `persona`), `creado_en`, `expira_en`, `aceptada_en NULL`, `revocada_en NULL`; `UNIQUE (asociacion_id, token_hash)`                                                                                                                                                                                 |
| `identidad_externa` (3c)  | `id`, `asociacion_id`, `cuenta_id` (FK compuesta), `proveedor` (`google`), `sujeto`, `UNIQUE (asociacion_id, proveedor, sujeto)`, `UNIQUE (asociacion_id, cuenta_id, proveedor)`                                                                                                                                                                                                              |
| `estado_oauth` (3c)       | `id`, `asociacion_id`, `estado_hash bytea`, `nonce`, `verificador_pkce`, `creado_en`, `expira_en`, `usado_en NULL`; `UNIQUE (asociacion_id, estado_hash)`                                                                                                                                                                                                                                     |

**Por qué `persona` y `cuenta_acceso` separadas.** Lo pide `database-design.md`:
una persona puede existir sin cuenta (un contacto de una institución, un
asistente a un evento, en etapas posteriores) y una cuenta es solo una forma de
entrar. Aquí cada cuenta tiene exactamente una persona.

**Por qué el estado está solo en `persona`.** Con dos fuentes (persona y cuenta)
había combinaciones sin definir y «administrador activo» era ambiguo.

**Por qué la revocación es sencilla.** Sesión, cuenta y persona están en la misma
asociación y bajo el mismo contexto: cambiar la contraseña, suspender o dar de
baja actualiza todo en **una transacción** y sube `credencial_version`, que es lo
que el login revalida (CA-3, CA-6).

**Por qué no hay `afiliacion` ni tablas de permisos.** La persona ya es de la
asociación. Y con cuatro roles fijos, la matriz rol × acción de `puede()` en una
constante tipada y probada se audita mejor que filas; las tablas llegarán con
roles configurables. Cambios registrados sobre el plan (§4) y D7.

### 5.4 Integridad y privilegios

- Correo: `CHECK` ASCII imprimible, longitud 3–254 y minúsculas, y NFKC en la
  aplicación; no depende del `lower()` de la colación. Los correos con caracteres
  no ASCII entran en su forma punycode.
- Tokens de sesión, de correo, de invitación y de OAuth: 32 bytes aleatorios;
  **solo se guarda su SHA-256**.
- **Reservados.** `0004` amplía el `CHECK` de subdominios reservados con `auth`,
  `login`, `oauth`, `sso`, `id`, `cuenta`, `accounts` y `signin`.
- **Privilegios de `aspal_app`** (mínimos, por columna donde corresponde; nunca
  `TRUNCATE`, `TRIGGER` ni `REFERENCES`):

  | Tabla                                              | Privilegios                                                                                              |
  | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
  | `persona`                                          | `SELECT`, `INSERT`, `UPDATE (nombre, estado)`                                                            |
  | `cuenta_acceso`                                    | `SELECT`, `INSERT`, `UPDATE (hash_contrasena, credencial_version, actualizado_en)`. Sin cambiar `correo` |
  | `asignacion_rol`                                   | `SELECT`, `INSERT`, `UPDATE (revocado_en, revocado_por)`                                                 |
  | `sesion`                                           | `SELECT`, `INSERT`, `UPDATE (ultimo_uso_en, revocada_en, reautenticada_en)`, `DELETE`                    |
  | `limite_uso`, tokens, `invitacion`, `estado_oauth` | `SELECT`, `INSERT`, `UPDATE` solo de sus columnas de estado, `DELETE` (limpieza)                         |

  `SELECT` sobre `token_hash` y `hash_contrasena` no se puede quitar (hay que
  filtrar y verificar con ellos): la defensa es de código (§5.5).

- Índices: los de las claves únicas; `(asociacion_id, expira_en)` o
  `(asociacion_id, ventana_desde)` en toda tabla que se limpia.
- **Limpieza.** Oportunista, **en lotes** (`LIMIT`), no en cada petición, y dentro
  del contexto de cada asociación; no hay un trabajo que lea todas (haría falta un
  rol propio, regla del corte 2). `limite_uso` tiene tope por asociación con
  descarte de lo más antiguo.
- **Datos personales sin cuenta.** El correo de un `registro_pendiente` o de una
  invitación es dato personal: caduca y se borra con la limpieza.

### 5.5 Guardianes

**Existentes, sin cambios:** catálogo (RLS, política `aislamiento`, FK compuesta),
claves, privilegios, propiedad, código, lista blanca de `SECURITY DEFINER`.

**Nuevos** (cada uno con su propio test de que detecta el defecto):

1. **Repositorio único:** solo el módulo de acceso importa estas tablas y nombra
   `hash_contrasena` o `token_hash`; ninguna consulta suya usa `select()` sin
   columnas explícitas.
2. **Esquemas de salida:** recorre todas las rutas y falla si un esquema de
   respuesta tiene un campo de hash, token o `id` de cuenta.
3. **Rutas:** las tres categorías de CA-16, `Origin` en las que cambian estado y
   cabeceras de caché en todas.
4. **Origen del contexto:** ningún `conAsociacion(…)` recibe un `id` que no salga de
   `peticion.asociacion.id` (análisis sintáctico).
5. **Privilegios por columna** en la instantánea, y que `aspal_app` no pueda
   `UPDATE` de `token_hash`, de `correo` ni de `hash_contrasena` fuera de lo
   previsto.
6. **Arranque:** el pool trae los tres tiempos de CA-18 y el servidor no arranca en
   producción sin `TRUST_PROXY`.
7. **`request.hostname` y `request.protocol`** no se usan para construir enlaces.

### 5.6 Cambio

- Migraciones: `0004` (reservados y `registro_abierto`), `0005` (3a), `0006` (3b),
  `0007` (3c). Cada una con su guardián y su prueba.
- Datos actuales: solo las dos asociaciones sembradas.
- Vuelta atrás: sin datos de producción; se revierte el commit y se recrea la
  base local.
- Documentación a corregir con la aprobación: **D6** (cuenta por asociación) y §4
  del plan de la Etapa 0, la nota de `database-design.md`, y la regla 2 de
  `apps/plataforma/CLAUDE.md` (`UNIQUE (asociacion_id, id)` solo en las tablas que
  otras referencian).

### 5.7 Alternativas descartadas

- **Un login global (D6 original):** una contraseña para varias asociaciones, pero
  exige tablas de acceso globales, funciones `SECURITY DEFINER` y reglas de
  revocación entre asociaciones. La primera revisión encontró en ese modelo tres
  fallos críticos y varios altos que el modelo A elimina por construcción. Pasar
  de A a un login global más adelante exige fusionar cuentas por correo verificado.
- **Una librería completa (Better Auth, Auth.js):** §2.1.
- **JWT sin estado en la cookie:** no revoca ni reevalúa al instante.
- **Crear la cuenta al registrarse, con contraseña, y verificarla después:** deja
  cuentas sin verificar que alguien puede haber preparado con el correo de otro.
- **Invalidar el enlace anterior en cada solicitud nueva:** permite a un atacante
  dejar a la víctima sin enlace utilizable.

## 6. Plan de implementación

Una rama por entrega (`feat/plataforma-acceso-a`, `-b`, `-c`), commits pequeños,
tests primero, **fusión en `staging` y rama borrada** al cerrar cada una:

**3a**

1. `docs`: este plan aprobado, D6 y el modelo del plan corregidos, y el contrato
   de endpoints en `docs/api/plataforma.md`.
2. `feat`: tiempos de la base (CA-18), `TRUST_PROXY` y las tres categorías de ruta
   con `exigirAsociacion`, `no-store` y `Vary` globales (la base sobre la que se
   apoya todo lo demás).
3. `feat`: migraciones `0004` y `0005`, esquema, privilegios por columna y
   guardianes nuevos.
4. `feat`: contraseñas (scrypt, semáforo por asociación, `maxmem`) y `limite_uso`
   (reserva atómica, claves HMAC, `SECRETO_CLAVES`).
5. `feat`: sesiones y `POST /sesiones` en tres pasos con revalidación, cookie,
   `Origin`, `conSesion`, serializador de `req` y repositorio único.
6. `feat`: `GET/DELETE /sesiones/actual`, roles y estados, `puede()` con su
   matriz y el bloqueo por asociación.
7. `feat`: semillas y el test de punta a punta (CA-20).
8. Revisión adversarial del código, correcciones, documentación (`CLAUDE.md` con
   las reglas de acceso), fusión.

**3b** y **3c** siguen el mismo patrón y se detallan al abrirlas.

### 6.1 3b: lo que se construyó y en qué se apartó del plan

Rama `feat/plataforma-acceso-b` (aprobada el 2026-10-17), en el orden: contrato en
`docs/api/plataforma.md` → servicio de correo (`nodemailer`, Mailpit en local) →
migración `0006` → presupuestos de envío y limpieza → recuperación → registro abierto →
invitaciones → auditoría independiente.

Decisiones y desvíos respecto a lo escrito arriba:

- **El enlace mágico (CA-27) queda fuera del corte** (decisión del responsable,
  2026-10-17). `token_correo.tipo` solo admite `recuperar_contrasena` por ahora.
- **`registro_pendiente` no lleva `terminos_version`:** la aceptación se registra al
  confirmar, en `cuenta_acceso` (`terminos_version`, `terminos_aceptados_en`). La
  versión es `2024-04`, la fecha del aviso de privacidad que ya publica el sitio
  (decisión del responsable, 2026-10-17: se toma el texto existente).
- **Reclamar antes de hashear** (CA-23): el token se valida con una lectura, y luego se
  _reclama_ con una sentencia atómica **antes** del scrypt; solo el ganador hashea y, si
  el hash no puede hacerse (cola llena), se libera. Mejora lo previsto: 20
  confirmaciones simultáneas cuestan un scrypt, no veinte.
- **Aceptar una invitación revalida al invitador dentro de la misma sentencia** que
  reclama el token (no solo antes).
- **Presupuestos** (CA-24): recuperación admite 3 por hora por destinatario (el correo
  pudo perderse); registro y aviso, 1. Origen 10 por hora y 500 al día por asociación,
  por tipo.
- **Correo tras el commit:** `conSesion` ofrece `alConfirmar` para encolar el envío solo
  cuando la transacción se confirma.

**Riesgos principales:** (1) tiempos distintos que delaten cuentas → se cuentan
las llamadas a scrypt por rama, no milisegundos; (2) la carrera del login → test
con gancho que pausa tras el scrypt; (3) una matriz de `puede()` incompleta en
verde → se genera de la lista completa; (4) abuso del registro abierto →
presupuestos separados y caducidad desde el primer día del 3b.

## 7. Valores por defecto (se pueden cambiar al aprobar)

| Política                                                | Valor propuesto                                                                           |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Sesión de miembro y representante                       | Inactividad 8 h · duración máxima 7 días                                                  |
| Sesión de `administrador`/`gestor`                      | Inactividad 2 h · duración máxima 12 h                                                    |
| Sesiones vivas por cuenta                               | 10                                                                                        |
| Intentos fallidos                                       | 5 por (correo, origen) y 20 por origen cada 15 min; espera 1, 5, 15 min, 1 h              |
| Hashes en vuelo / cola / plazas por asociación          | 2 / 8 / 2                                                                                 |
| Tiempos de la base                                      | `statement_timeout` 5 s · `lock_timeout` 3 s · `idle_in_transaction_session_timeout` 10 s |
| Contraseña                                              | 12–200 caracteres                                                                         |
| Enlace de registro · recuperación · invitación · acceso | 24 h · 1 h · 7 días · 15 min                                                              |
| Correos de registro                                     | 1 por hora por destinatario, 10 por hora por origen, 500 al día por asociación            |
| Invitaciones                                            | Plantilla fija, 20 al día por administrador                                               |

## 8. Decisiones tomadas y pendientes

### 8.1 Decisiones del responsable (2026-10-16)

El responsable aprobó **todas las propuestas por defecto** de este documento
(«vamos con tus sugerencias»):

| Tema                               | Decisión                                                                                                                                                                           |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tiempos y límites                  | Los del §7                                                                                                                                                                         |
| Enlace mágico                      | **Sí**, como método opcional en el 3b (CA-27); no como método único al lanzamiento                                                                                                 |
| Doble factor                       | Columna `nivel_autenticacion` ya; el factor, antes de producción                                                                                                                   |
| Registro abierto                   | Lo activa cada asociación (`registro_abierto`, desactivado por defecto); **CAPTCHA obligatorio antes de abrirlo al público**                                                       |
| Qué ve un miembro                  | Solo lo suyo; los listados de personas y correos, solo `administrador` y `gestor`                                                                                                  |
| Suspender y dar de baja            | Solo `administrador`; nadie se da de baja a sí mismo desde la API en este corte                                                                                                    |
| Invitar con rol `administrador`    | Solo un `administrador`                                                                                                                                                            |
| Primer administrador en producción | Lo crea el **dashboard maestro** (corte 4); mientras tanto, un comando de línea de comandos del operador, a mano                                                                   |
| Administrador que pierde su buzón  | Lo recupera el **operador** desde el dashboard maestro (corte 4)                                                                                                                   |
| Baja de una persona                | Se **conserva el correo** (bloquea volver a registrarse hasta que un administrador la reactive) y se anonimiza el nombre. Reactivar una persona de baja **no entra en este corte** |
| Consentimiento                     | El esquema guarda versión y fecha de aceptación; la versión vigente y la edad mínima se fijan cuando haya texto legal                                                              |
| Retorno de Google                  | Una URI por asociación; el callback central se decide antes de abrir altas autoservicio                                                                                            |
| Modelo de cuenta                   | **Cuentas independientes por asociación** (confirmado de nuevo)                                                                                                                    |

### 8.2 Requisito nuevo: dashboard maestro

El responsable pide un **dashboard maestro** que administre y dé de alta las
asociaciones y sus administradores, con estadísticas y otras funciones. En el plan
es el **corte 4** (panel de operador). Lo que ya queda fijado para que el 3 no lo
estorbe:

- **Identidad aparte.** Los operadores son personal de ASPAL y **no** pertenecen a
  ninguna asociación: no son «un usuario sin asociación» en el sentido de este
  corte, sino otro reino con su propia cuenta, sesión y límites, en el host
  reservado `app` (ya reservado en `asociacion`).
- **Rol y pool de base de datos propios** (`aspal_operador`), con auditoría; nunca
  se le da `BYPASSRLS` a `aspal_app` (regla del corte 2).
- **Estadísticas solo agregadas** (conteos), nunca datos personales individuales de
  una asociación, salvo soporte con autorización explícita, alcance acotado y
  registro (`database-design.md`, §3).
- **Altas.** Crear una asociación y su primer administrador (que recibe una
  invitación); recuperar a un administrador sin buzón.
- Se diseña con su **propia propuesta de esquema y revisión adversarial** al abrir
  el corte 4.

### 8.3 Pendientes tuyos

- **Credenciales de Google** (ID y secreto de cliente OAuth, creados en Google Cloud
  Console, con las URI de retorno), para probar el 3c con Google real. Hasta
  entonces, proveedor falso.
- **Aviso de privacidad y términos:** bloqueantes antes del primer OAuth real; hoy
  son copia literal de WordPress con pendientes legales. De ahí salen la versión
  vigente de los términos y la edad mínima.
- **Antes de producción:** doble factor para administradores, dominio de correo
  verificado en SES y salida del _sandbox_.
- Pendientes que no bloquean este corte: cambio de correo, dispositivos y avisos de
  entrada nueva, retención de `limite_uso` y de las IP en logs, lista de correos
  desechables y baja de una asociación (`ON DELETE RESTRICT` la impide).

## 9. Qué cambió y por qué

**Primera revisión** (sobre el diseño con login global): tres críticos y ocho
altos, casi todos consecuencia de que la cuenta fuera global y la sesión de cada
asociación. El responsable eligió el modelo A y con eso desaparecieron, por
construcción, la revocación entre asociaciones, el flujo de invitar a quien ya
tiene cuenta, el `persona` global editable desde otra asociación, las funciones
`SECURITY DEFINER` de acceso y el bloqueo cruzado de cuentas.

**Segunda revisión** (sobre el modelo A): tres críticos y ocho altos más, ahora en
la concurrencia y en el registro abierto:

| Hallazgo                                                                                                             | Resultado                                                                  |
| -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Crítico** · login en dos transacciones: la sesión sobrevive a la revocación                                        | `credencial_version` y revalidación en la segunda transacción (CA-3, CA-6) |
| **Crítico** · los límites del registro permiten dejar a la víctima sin enlace o agotar el cupo                       | Enlaces vigentes no se invalidan; presupuestos separados por tipo (CA-24)  |
| **Crítico** · sin tiempos máximos en la base; rutas públicas sin categoría; `intento_acceso` sin `id`; FK de autoría | CA-18, CA-16, §5.3, regla 2 de `CLAUDE.md` corregida                       |
| Alto · un éxito reiniciaba el límite de origen; claves por existencia de cuenta                                      | Claves del correo enviado; el éxito no reinicia el origen (CA-10)          |
| Alto · `trustProxy` en 0 saltos detrás de un balanceador                                                             | El servidor no arranca en producción sin `TRUST_PROXY` (CA-12)             |
| Alto · el semáforo de scrypt era global entre asociaciones                                                           | Tope por asociación en la cola (CA-11)                                     |
| Alto · «último administrador» por vías no cubiertas; estado duplicado                                                | Estado solo en `persona`; bloqueo y recuento en toda vía (CA-15)           |
| Alto · invitaciones cuyo privilegio sobrevive al invitador                                                           | Revalidar al aceptar; revocar al perder el rol; listar y revocar (CA-26)   |
| Alto · carrera y coste al consumir el registro                                                                       | Una sentencia atómica; token validado antes del scrypt (CA-23)             |
| Alto · tablas de 3b sin soporte para sus límites; plantillas con texto libre                                         | `creado_en`, cupos por tipo y plantillas sin campos libres (§5.3, CA-22)   |
| Medio · Google, limpieza, privilegios por columna, correo ASCII, errores con parámetros                              | CA-29, §5.4, CA-21, CA-30                                                  |

Quedan **riesgos aceptados y documentados** en el §2.2.
