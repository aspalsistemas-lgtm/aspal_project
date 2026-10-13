# Plan actualizado de la plataforma ASPAL

**Versión:** 2.2  
**Fecha:** 13 de octubre de 2026  
**Propósito:** orientar la construcción gradual de un SaaS para organizaciones, empezando por el gestor de contenido propio de ASPAL.  
**Estado:** dirección de producto actualizada; las reglas señaladas como pendientes deben resolverse antes de implementar su etapa. Este documento define trabajo futuro y no acredita que las funciones estén implementadas.

## 1. Dirección del producto

ASPAL será el primer usuario operativo de una plataforma comercializable. La primera entrega permitirá gestionar publicaciones y páginas desde una interfaz propia y sustituir WordPress. La arquitectura deberá admitir otras organizaciones desde el comienzo, aunque su incorporación comercial ocurra después.

El producto crecerá hacia membresías, cobros, comunidad, eventos y formación. Cada organización podrá activar los módulos contratados y tener condiciones comerciales propias. Eventos podrá contratarse y operar sin membresías ni comunidad.

Se conserva la aplicación modular integrada con API, PostgreSQL y la orientación a AWS para la plataforma. El sitio existente y sus componentes se aprovechan; mover todo su alojamiento no condiciona la primera entrega. La separación futura de servicios requerirá una razón operativa comprobada.

## 2. Decisiones confirmadas y sustituidas

| Tema                    | Decisión vigente                                                                                                                                                                                                                       |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primera entrega         | Gestor propio de contenido y edición de páginas para ASPAL.                                                                                                                                                                            |
| WordPress               | Fuente de migración temporal; se retira como dependencia **solo para blog y podcast** después de validar el reemplazo. MemberPress, la comunidad (`comunidad.`) y los cursos siguen en WordPress hasta que sus módulos los sustituyan. |
| Forma del repositorio   | Monorepo con `apps/sitio`, `apps/plataforma`, `packages/ui` y `packages/contratos`. La plataforma es una aplicación nueva (Fastify + Zod); el sitio actual no cambia de naturaleza.                                                    |
| Sitio público           | Sigue sin base de datos ni sesiones propias. Obtiene el contenido por la API de la plataforma y conserva el contrato público de `/api/posts` y `/api/posts/:slug`: cambia la fuente, no el formato.                                    |
| Identidad               | Una persona tiene **un solo login** (cuenta de acceso global). La afiliación a cada asociación (membresías, representaciones, roles) es independiente y no se hereda entre asociaciones.                                               |
| Acceso al lanzamiento   | Correo y Google. Facebook queda fuera del alcance; solo se reconsidera si la audiencia lo pide. SSO institucional es un candidato posterior.                                                                                           |
| Páginas por asociación  | Cada asociación tiene su subdominio dentro del dominio de ASPAL, con logo, colores y contenido propios.                                                                                                                                |
| Otros clientes          | Arquitectura y pruebas con dos organizaciones desde el inicio; ASPAL es el primer cliente operativo. ANPR permanece como candidato a siguiente piloto, sujeto a coordinación.                                                          |
| Arquitectura            | Aplicación modular integrada; interfaces claras entre módulos.                                                                                                                                                                         |
| SaaS                    | Contratos configurables por organización, sin obligar a escoger planes comerciales fijos.                                                                                                                                              |
| Condiciones comerciales | Precio, moneda, duración, periodicidad admitida, prueba, comisiones, módulos, límites y política de vencimiento explícitos por contrato.                                                                                               |
| Páginas                 | Conversión gradual del sitio existente a páginas editables mediante campos y bloques aprobados.                                                                                                                                        |
| Eventos                 | Módulo autónomo comercialmente, integrado técnicamente al inicio.                                                                                                                                                                      |
| IA                      | Mejora posterior; no condiciona el lanzamiento del gestor ni de los módulos operativos.                                                                                                                                                |
| Formación               | Las fichas de cursos pueden existir en contenido; aprendizaje, progreso y evaluación pertenecen a un módulo posterior.                                                                                                                 |

La suscripción anual del plan anterior puede conservarse como valor predeterminado. Los tres meses de solo lectura dejan de ser una regla universal: pueden configurarse como política predeterminada y quedar registrados en cada contrato. Un catálogo de paquetes puede facilitar ventas, pero será opcional y no impondrá valores inmutables.

## 3. Punto de partida y alcance de la revisión

Los documentos originales describen un sitio público React y TypeScript, construido con Vite, componentes reutilizables, un intermediario de WordPress y captación mediante Mailchimp. No describen una plataforma de miembros ya operativa.

La inspección puntual del código confirmó que `client/src/App.tsx` y `client/src/lib/rutas.ts` registran páginas conocidas en código; `inicio.tsx` y `nuestro-equipo.tsx` consumen parte de sus textos y listas desde `client/src/content/institucional/`, pero mantienen otros textos y la composición en sus componentes. `vercel.json` reescribe `/api/*` hacia la función serverless y el artículo de blog hacia `spa.html`, además de definir cabeceras de caché; no contempla páginas creadas desde un gestor.

Esta base es aprovechable, pero aún no equivale a un CMS. La revisión no constituye una auditoría completa del repositorio, de producción ni del contenido WordPress.

Antes de implementar se actualizarán las guías del repositorio para distinguir el sitio público existente de la nueva plataforma. Las afirmaciones generales de “sin persistencia”, “sin autenticación” y “todos los endpoints públicos” no pueden regir la plataforma futura. Se preservarán los contratos públicos existentes durante la transición o se documentará su migración.

## 4. Estructura funcional

| Módulo                          | Datos y responsabilidades principales                                               |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| Organizaciones y contratos SaaS | Clientes, dominios, módulos disponibles, condiciones comerciales y límites.         |
| Identidad y autorización        | Cuentas, sesiones, invitaciones, recuperación, roles y permisos por ámbito.         |
| Contenido y sitios              | Publicaciones, páginas, bloques, versiones, medios, navegación y metadatos.         |
| Personas e instituciones        | Fichas administrativas, instituciones y relaciones de representación.               |
| Membresías                      | Solicitudes, planes ofrecidos, afiliaciones contratadas, vigencias y beneficios.    |
| Cobros                          | Cargos, pagos, devoluciones, comisiones, conciliación y referencias de proveedores. |
| Eventos                         | Agenda, entradas, inscripciones, asistentes, cupos, asistencia y constancias.       |
| Comunidad                       | Perfiles visibles, directorio, publicaciones sociales, discusiones y moderación.    |
| Formación                       | Inscripciones académicas, lecciones, progreso, evaluaciones y certificados.         |
| Servicios compartidos           | Archivos, formularios, notificaciones, auditoría y procesos en segundo plano.       |

ASPAL operador y ASPAL organización usuaria son ámbitos distintos. El operador administra el producto y sus contratos; el espacio de ASPAL administra su contenido y sus miembros. El soporte no recibe acceso permanente e irrestricto a todos los datos por pertenecer al operador.

Cada módulo será dueño de sus datos y expondrá operaciones para los demás. Eventos podrá consultar beneficios de membresía sin modificar afiliaciones. Contenido podrá comprobar un derecho de acceso sin reproducir reglas de cobro.

## 5. Permisos y derechos de acceso

### 5.1 Cuatro controles diferentes

1. **Disponibilidad comercial:** el contrato de la organización habilita un módulo y sus capacidades.
2. **Permiso del usuario:** determina qué acciones puede ejecutar en ese ámbito.
3. **Derecho sobre el recurso:** determina qué contenido, curso o evento puede consultar o utilizar.
4. **Estado del recurso y del servicio:** restringe acciones según publicación, vigencia, suspensión o archivo.

Contratar contenido no da permiso de publicación a todas las cuentas. Ser miembro no convierte a alguien en administrador. Pagar un curso puede dar acceso aunque no exista membresía. La decisión efectiva debe comprobar todos los controles aplicables.

### 5.2 Matriz inicial de roles

Los siguientes son perfiles iniciales. Las acciones son permisos explícitos que pueden agruparse en roles; no deben existir condiciones dispersas basadas únicamente en nombres de rol.

| Rol                           | Acciones previstas                                              | Restricción principal                                                        |
| ----------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Operador comercial            | Crear clientes y administrar contratos SaaS.                    | No obtiene automáticamente acceso al contenido privado de cada organización. |
| Soporte autorizado            | Diagnosticar un caso dentro del alcance y plazo concedidos.     | Acceso temporal, revocable y auditado.                                       |
| Propietario de organización   | Administrar responsables y configuración de su espacio.         | No modifica unilateralmente su precio SaaS ni sus comisiones contractuales.  |
| Administrador de organización | Gestionar usuarios y módulos según permisos delegados.          | No puede conceder permisos superiores a su capacidad de delegación.          |
| Autor                         | Crear y editar sus borradores y enviarlos a revisión.           | No publica ni modifica automáticamente contenido ajeno.                      |
| Editor                        | Revisar y editar contenido de su organización.                  | Publicar requiere un permiso adicional.                                      |
| Publicador                    | Publicar, programar, retirar y restaurar versiones autorizadas. | No administra por ese motivo finanzas o usuarios.                            |
| Gestor de miembros            | Tramitar altas, vigencias y representación institucional.       | Devoluciones y exportaciones sensibles requieren permisos propios.           |
| Gestor financiero             | Consultar cobros y conciliar; devolver si se le autoriza.       | No obtiene facultades editoriales.                                           |
| Gestor de eventos             | Administrar eventos y participantes asignados.                  | El personal de acceso puede limitarse a validar entradas.                    |
| Moderador                     | Atender reportes y moderar espacios asignados.                  | No accede automáticamente a información financiera.                          |
| Representante institucional   | Administrar representantes si su relación lo permite.           | Ámbito restringido a su institución y asociación.                            |
| Miembro o lector              | Consultar recursos y gestionar sus propios datos permitidos.    | Acceso conforme a sus derechos y a la visibilidad de cada campo.             |

Una cuenta puede combinar roles. En la primera entrega se implementan los roles editoriales, propietario, administrador y funciones mínimas del operador; el resto se incorpora con su módulo. Se preparan permisos estables y roles componibles, sin exigir un constructor visual complejo de permisos para lanzar el CMS.

### 5.3 Garantías y validación

- Denegar por defecto y verificar en servidor cada acción y recurso. Ocultar botones es una ayuda de interfaz, no un control de seguridad.
- Resolver la organización mediante un contexto validado; no confiar únicamente en un identificador enviado por el navegador o un subdominio.
- Impedir relaciones cruzadas entre organizaciones también en la base de datos. Si se utiliza RLS, diseñar el contexto por transacción y las cuentas de servicio.
- Proteger medios privados, exportaciones, búsquedas, vistas previas y tareas automáticas con el mismo ámbito.
- Separar campos públicos del perfil de datos administrativos y financieros.
- Invalidar o reevaluar permisos cuando cambien roles, vigencias o relaciones institucionales; evitar que sesiones o cachés mantengan acceso revocado.
- Mantener trazabilidad de cambios de roles, publicación, exportaciones, acceso de soporte y operaciones financieras. Evitar secretos y datos personales innecesarios en logs.
- Exigir autenticación reforzada para cuentas privilegiadas y operaciones sensibles; concretar recuperación segura y política de sesiones antes de producción.
- Probar acceso directo por API, referencias a recursos ajenos, intentos de autopromoción y publicación sin permiso, además de los recorridos permitidos.

**Conclusión:** los permisos estaban contemplados conceptualmente en el plan anterior. Esta versión los convierte en una parte verificable del alcance; su existencia en el documento no significa que estén implementados.

## 6. SaaS configurable por cliente

### 6.1 Condiciones del contrato

| Configuración          | Comportamiento previsto                                                                                                             |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Precio y moneda        | Importe exacto por contrato; sin constantes de precio dentro del código.                                                            |
| Duración y facturación | Separar vigencia contractual de frecuencia de cobro. Habilitar solo combinaciones soportadas y probadas por el sistema y proveedor. |
| Prueba                 | Sin prueba o duración configurada; inicio, fin y extensiones con historial.                                                         |
| Módulos                | Contenido, membresías, eventos y otros activables por cliente.                                                                      |
| Límites                | Almacenamiento, administradores u otras capacidades; límites finitos o ilimitados explícitos y unidades definidas.                  |
| Comisión               | Regla por cliente y, cuando corresponda, por tipo de operación; momento de aplicación y vigencia conservados.                       |
| Vencimiento            | Gracia, restricciones, periodo de lectura, exportación y finalización según política del contrato.                                  |
| Condiciones especiales | Descuentos, exenciones o acuerdos autorizados, con motivo y responsable.                                                            |

La configuración tendrá validaciones y límites coherentes. “Configurable” no significa ejecutar fórmulas arbitrarias ni admitir cualquier periodicidad sin implementación. Un cliente con condiciones fuera del soporte disponible requerirá una ampliación explícita.

### 6.2 Historial y autoridad

Los contratos tendrán versiones y fechas de efecto. Cambiar una plantilla o tarifa predeterminada no alterará acuerdos existentes. Cada cargo conserva las condiciones efectivamente aplicadas. Los cambios indicarán si afectan únicamente a la siguiente renovación o a una fecha pactada; el prorrateo no se supondrá automáticamente.

El operador configura precio, prueba y comisión. La organización puede consultar su acuerdo y solicitar cambios; sus administradores configuran contenido, imagen, formularios y sus propias ofertas de membresía según permisos.

Los módulos y límites se comprueban en servidor. Reducir almacenamiento o desactivar un módulo no eliminará datos automáticamente. Se documentará cómo consultar, exportar y reactivar información conservada.

### 6.3 Vencimiento y procesos activos

Se distinguirán estados comerciales del contrato y capacidades operativas resultantes. Un modo de solo lectura no bloqueará avisos de pago, conciliación, auditoría ni tareas necesarias para mantener consistencia.

Antes de activar restricciones deberán definirse los efectos sobre páginas públicas, miembros, suscripciones recurrentes y eventos vendidos. No se continuará cobrando una prestación inaccesible por accidente. La política deberá resolver notificaciones, suspensión de nuevos cobros cuando proceda y atención de obligaciones pendientes.

## 7. Gestor de contenido inicial

### 7.1 Alcance de la primera entrega

- Artículos de blog y episodios de podcast como tipos propios, con autores, fecha, categorías, etiquetas, imagen y metadatos.
- Páginas institucionales editables mediante bloques aprobados.
- Editor de texto enriquecido con contenido validado y saneado; enlaces e incrustaciones permitidas de forma controlada.
- Borradores, revisión, publicación, programación, retiro y archivo.
- Versiones, comparación o identificación de cambios y restauración sin perder el historial.
- Prevención de sobrescritura silenciosa cuando dos editores trabajan sobre la misma versión.
- Biblioteca de medios con textos alternativos, tamaño, tipo, pertenencia y permisos; cargas con validación y protección adecuada.
- Vista previa autorizada y separada de la versión pública.
- Buscador, navegación, slugs, redirecciones, títulos, descripciones, imágenes sociales y sitemap.
- Formularios públicos existentes conectados a su servicio; la edición de una página no modifica su lógica de consentimiento o envío.
- Contenido público y privado para usuarios autorizados; integración posterior con derechos derivados de membresías y compras.
- Exportación utilizable de contenido y referencias a medios.

### 7.2 Tipos configurables

Se podrá definir un tipo de contenido con nombre, campos tipados, validaciones, taxonomías y plantilla compatible. El esquema del tipo tendrá versiones; cambios de campos deberán preservar contenido existente o exigir una conversión controlada.

Una primera capacidad acotada de tipos configurables forma parte del cierre del gestor: por ejemplo, crear “recurso” con título, autor, fecha y archivo. No se permitirá que un campo configurable sustituya entidades de pagos, membresías o progreso académico.

La biblioteca básica puede comenzar como contenido. La biblioteca avanzada, con beneficios por plan y búsqueda especializada, crece después. La distribución RSS y el alojamiento de audio del podcast se definirán al inventariar el flujo actual; no se asumirá que sustituir WordPress sustituye también un proveedor externo de audio.

## 8. Conversión de las páginas públicas

**Sí es viable conservar el diseño actual y administrar sus contenidos desde el SaaS.** Requiere convertir las fuentes de contenido y el mecanismo de publicación; no basta con añadir una pantalla de edición.

### 8.1 Modelo de edición

La primera versión utilizará componentes existentes como bloques con campos: portada, texto, imagen, llamada a la acción, cifras, aliados, perfiles, testimonios y listados. El editor podrá modificar datos y, donde se habilite, ordenar, añadir u ocultar bloques compatibles.

Las plantillas mantendrán estructura, accesibilidad y adaptación a móviles. La identidad visual será configurable mediante opciones y tokens validados. Los estilos propios de ASPAL serán una configuración o plantilla, no supuestos obligatorios para otros clientes.

Un constructor visual libre queda fuera de la primera entrega. Los bloques tendrán esquema y versión para que una mejora del componente no rompa páginas publicadas anteriormente.

### 8.2 Tratamiento por página

| Página o elemento                      | Tratamiento                                                                                                            |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Inicio, nosotros, qué hacemos y equipo | Importar textos y listas; conservar componentes como plantillas editables.                                             |
| Mapa de ruta                           | Contenido estructurado con etapas y recursos; preservar navegación y documentos asociados.                             |
| Blog y podcast                         | Listados funcionales alimentados por el gestor; configuración editorial de cabeceras y presentación.                   |
| Artículos y episodios                  | Rutas dinámicas y contenido propio con metadatos completos.                                                            |
| Únete                                  | Bloques editables y formulario funcional; posteriormente integra contratación de membresías.                           |
| Eventos                                | Cabecera y textos editables; agenda e inscripción dependen del módulo correspondiente.                                 |
| Plataforma                             | Página comercial del operador, con propiedad editorial explícita y sin aparecer obligatoriamente en cada organización. |
| Menú y pie                             | Elementos compartidos editables con validación de enlaces y ámbito del sitio.                                          |
| Componentes, acceso y administración   | Rutas del sistema reservadas, fuera del catálogo de páginas públicas editables.                                        |

No todas las pantallas se convierten en texto libre. Un editor puede cambiar la introducción de inscripción, pero no alterar por esa vía el proceso de pago o la autorización.

### 8.3 Publicación y rutas

La lista de rutas fija actual se dividirá en rutas del sistema y páginas publicadas. Las nuevas páginas deberán resolverse desde el contenido sin requerir un cambio de código. Se reservarán prefijos administrativos y de API; habrá unicidad de rutas por sitio y controles de colisión con blog, eventos y otros módulos.

El renderizado deberá producir contenido y metadatos públicos adecuados para cada URL. La implementación elegirá renderizado de servidor o generación actualizable y verificará su compatibilidad con el alojamiento. Los borradores no se incluirán en HTML público, caché compartida, buscadores o sitemap.

Publicar invalidará o regenerará las páginas afectadas, incluidos listados y menús. Si ese proceso falla, el panel mostrará que la distribución está pendiente o fallida; no presentará una actualización incompleta como publicada correctamente. Una URL desconocida seguirá devolviendo un 404 real.

## 9. Sustitución de WordPress en blog y podcast

El alcance es el contenido editorial (blog y podcast). MemberPress, la comunidad y los cursos permanecen en WordPress hasta sus etapas y no forman parte de este corte.

1. Inventariar entradas, episodios, borradores accesibles, autores, taxonomías, enlaces, imágenes, adjuntos, incrustaciones, feeds y posibles comentarios. Decidir explícitamente qué se migra.
2. Respaldar WordPress y obtener exportación adecuada. La API pública actual puede no incluir borradores, versiones y medios privados.
3. Definir correspondencias de datos y almacenar referencias de origen para repetir la importación sin duplicados.
4. Importar en un entorno de prueba, copiar medios cuya conservación corresponda y revisar dependencias externas. No dejar imágenes necesarias alojadas únicamente en el WordPress que se retirará.
5. Verificar recuentos, fechas, autores, enlaces y muestras visuales de cada formato; sanear HTML sin perder contenido editorial válido.
6. Mantener slugs cuando sea posible y preparar redirecciones permanentes para cambios de URL, incluidos accesos al dominio editorial anterior si siguen utilizándose.
7. Establecer una ventana de congelación editorial o una importación final incremental; desde el corte, el gestor propio será la única fuente editable.
8. Cambiar la lectura pública al nuevo origen, comprobar páginas, medios, búsqueda, feeds aplicables y analítica; conservar un procedimiento de retorno durante una ventana acordada.
9. Retirar llamadas, credenciales o configuración WordPress que ya no correspondan cuando se valide el cierre. Conservar el respaldo según política acordada y mantener las redirecciones necesarias.

No se apagará WordPress solo porque terminó la primera importación. Si hay retorno temporal al sistema anterior después de haber editado contenido nuevo, habrá que reconciliar esos cambios para no perderlos.

## 10. Arquitectura y datos

Se conserva TypeScript y la interfaz existente. El repositorio pasa a ser un monorepo: el sitio actual a `apps/sitio`, la plataforma en `apps/plataforma`, y el sistema visual y los esquemas compartidos en `packages/ui` y `packages/contratos`. Así el sistema visual es uno solo y no diverge entre sitio y paneles.

La plataforma es una aplicación nueva, con su propia API (Fastify y esquemas Zod), que distingue sitio público de cada organización, portal de miembros y panel del operador. El servidor Express del sitio no se convierte en la API de la plataforma: sigue como intermediario del sitio mientras exista y, tras la migración, el contenido llega por la API de la plataforma sin cambiar el formato público de `/api/posts`. Las reglas de negocio no se acumularán en las pantallas ni se duplicarán entre puntos de entrada.

PostgreSQL conservará relaciones, restricciones e historial. Se aplicará la guía de diseño de datos existente antes de escribir migraciones. JSON validado puede servir para documentos de bloques y campos flexibles; no sustituirá claves foráneas ni registros financieros esenciales.

Las identidades de acceso, personas, instituciones, representaciones, planes y membresías serán entidades conceptualmente separadas. Una persona tiene una única cuenta de acceso global; sus afiliaciones a cada organización son independientes, de modo que tener cuenta o membresía en una no concede acceso a otra ni por coincidencia de correo. «Accesos separados entre asociaciones» se cumple como autorización, no como credenciales distintas.

La infraestructura contemplará base administrada, almacenamiento de objetos, entrega de contenido, API y trabajadores para tareas diferidas, correo operativo, secretos, monitoreo y copias de seguridad. Se documentarán entorno de pruebas, producción, costos previstos, recuperación y responsables antes de desplegar. AWS sigue siendo la orientación acordada; no se define aquí una selección exhaustiva de servicios.

Los procesos entre módulos tendrán reintentos e identificadores únicos. Para efectos externos críticos se utilizará una salida transaccional o mecanismo equivalente que evite perder un aviso después de guardar el hecho de negocio. Los consumidores deberán tolerar repeticiones y eventos fuera de orden cuando corresponda.

Las cachés y consultas incluirán organización y contexto de acceso cuando sea necesario. Conservar una clave basada solo en URL puede ser insuficiente al cambiar de organización o sesión. El contenido privado no se entregará por la misma caché pública que una publicación abierta.

## 11. Etapas y criterios de cierre

### Etapa 0 Preparación y decisiones transversales

Inventariar el código, contenido y servicios existentes; actualizar las guías contradictorias; definir vocabulario, límites de módulos, propiedad editorial del sitio ASPAL y estrategia de identidad. Documentar migración WordPress, rutas, renderizado, roles y configuración contractual. Estimar esfuerzo después de estos inventarios, con equipo y presupuesto conocidos.

**Cierre:** existe un backlog de contenido y núcleo, una matriz de permisos, un inventario migrable y decisiones registradas sobre identidad, publicación y despliegue. No quedan instrucciones generales que prohíban la plataforma que se va a construir.

### Etapa 1 Núcleo mínimo y aislamiento

Implementar organizaciones, contextos de sitio, autenticación, recuperación e invitaciones, permisos editoriales, auditoría y archivos. Registrar módulos habilitados y condiciones comerciales manualmente desde el operador, con historial; automatizar el cobro SaaS puede esperar a la etapa de pagos.

El acceso al lanzamiento del gestor es por correo y Google. Facebook se retira del alcance (decisión del 13 de octubre de 2026): exige revisión de la app de Meta y verificación de empresa, y solo se reconsidera si la audiencia lo pide. Debe verificarse la interacción de Google con la cuenta de acceso global y los ámbitos aislados.

**Cierre:** ASPAL y una organización de prueba pueden administrar cuentas y archivos sin cruces. Un usuario no puede publicar ni concederse permisos sin autorización. Existe recuperación verificada desde respaldo en el entorno de prueba.

### Etapa 2 Gestor propio y sitio editable

Implementar contenido, medios, flujo editorial, tipos configurables acotados, plantillas de páginas, navegación, vistas previas y publicación. Convertir las páginas institucionales gradualmente y ejecutar la migración WordPress.

**Cierre de la primera entrega operativa:** ASPAL crea, revisa y publica un artículo, episodio y página desde la interfaz; programa y restaura una versión; crea un tipo de recurso sin tocar código; las páginas públicas conservan su calidad visual. La segunda organización de prueba usa otra marca y contenidos independientes. El sitio ya no depende de WordPress para los elementos migrados y acordados en el inventario de cierre.

### Etapa 3 Membresías e instituciones

Implementar personas, instituciones, representantes, planes individuales e institucionales, variantes gratuitas, estudiantiles y vitalicias, solicitudes, formularios versionados, altas manuales, beneficios y vigencias. Distinguir pago, aprobación de solicitud y estado de membresía.

**Cierre:** se importan datos de prueba sin duplicados indebidos, se procesa una afiliación individual y otra institucional, se sustituye un representante conservando historial y se verifican derechos sobre contenido. Las reglas de renovación, gracia, aprobación y simultaneidad están documentadas.

### Etapa 4 Cobros y contratación comercial

Integrar Stripe Connect conforme a la decisión previa: organizaciones reciben sus cobros y ASPAL aplica su comisión acordada. Automatizar por separado la suscripción de organizaciones al SaaS. Verificar previamente disponibilidad de países, monedas, medios de pago y modelo concreto de cargos.

Implementar confirmación asíncrona, fallos, reintentos, devoluciones, descuentos, precios especiales y conciliación operativa. Aclarar si depósitos significa transferencias mediante proveedor, pagos en efectivo o abonos externos con comprobantes y revisión. No acreditar un pago por subir una imagen de comprobante.

**Cierre:** se prueba de extremo a extremo contratación y renovación, avisos duplicados, pago pendiente o fallido, devolución, comisión correcta por contrato y casos manuales claramente diferenciados. Hay reportes de importe bruto, comisión, devoluciones y neto reconciliable.

La conciliación mínima se incluye aquí; la integración contable avanzada y CFDI son una ampliación posterior, salvo que los clientes piloto las requieran para operar. La aceptación de un proveedor de pagos no sustituye esa evaluación.

### Etapa 5 Comunidad y biblioteca avanzada

Implementar perfiles con visibilidad por campo, directorio, feed, discusiones consultables, grupos, reportes, moderación, preferencias de notificación y búsqueda con permisos. Ampliar la biblioteca con acceso por beneficios y recursos propios. La incorporación de recursos procedentes de eventos se añadirá cuando ese módulo esté disponible.

**Cierre:** existen responsables y dinámica de participación; se verifica que un miembro encuentra recursos autorizados y puede reportar contenido. La pérdida de membresía produce el efecto de acceso acordado sin borrar automáticamente sus contribuciones. La comunidad puede operar antes de que exista el módulo de eventos.

### Etapa 6 Eventos independientes

Implementar eventos gratuitos y pagados, compradores y asistentes separados, cupos, reserva temporal durante pago, descuentos opcionales por membresía, agenda, mensajes, check-in, cancelaciones y constancias con reglas de emisión y revocación.

Definir el tratamiento de pagos tardíos al vencer una reserva, concurrencia en el último lugar disponible y entradas anuladas. Precisar si se requiere operación sin conexión antes de construir check-in.

**Cierre:** una organización que solo contrata eventos publica, vende e inscribe sin activar membresías ni comunidad. Se completa asistencia y constancia, se impide sobreventa y se prueba una cancelación o devolución. Un segundo caso utiliza un beneficio de membresía sin acoplar los módulos.

### Etapa 7 Formación y expansión validada

Incorporar aprendizaje, progreso, evaluaciones y certificaciones si existe demanda. Evaluar CFDI, SSO institucional, dominios propios, integraciones, bolsa de trabajo, marketing y opciones especiales de aislamiento por cliente.

La IA puede incorporarse para borradores o búsqueda respaldada por fuentes con permisos, después de validar utilidad, costos y controles. No tendrá capacidad implícita para publicar, enviar mensajes o consultar información de otras organizaciones.

**Cierre de cada ampliación:** demanda identificada, alcance aprobado, recorrido completo, métricas y operación sostenibles. Esta etapa es un conjunto de candidatos, no un compromiso de implementar todas las funciones.

## 12. Validación comercial y operación continua

La primera entrega operativa no obliga a esperar a eventos para usar el gestor. Su comercialización requiere además incorporación de clientes, acuerdo comercial, soporte, exportación, respaldo y operación verificables. El cobro inicial del servicio puede administrarse manualmente con trazabilidad mientras llega su automatización.

La incorporación de una segunda organización debe funcionar sin bifurcar código ni copiar la aplicación. Al inicio se comprobará con datos ficticios; antes de vender ampliamente se validará con una organización real. El volumen aproximado de 300 miembros y 10 administradores del plan anterior es una referencia de piloto, no una medición de carga ni un límite de diseño.

Desde cada entrega se medirán errores, tiempos de respuesta, tareas pendientes y entrega de correos. Para contenido: tiempo de publicación, fallos de distribución y enlaces rotos. Para membresías: tiempo de alta y renovaciones. Para pagos: pendientes y diferencias de conciliación. Para eventos: inscripción, acceso y conflictos de cupo. Los umbrales se acordarán según objetivos y volumen real.

Los correos operativos y de marketing mantendrán finalidades y preferencias separadas. SES se utilizará según el plan previo para operación y Mailchimp podrá continuar en captación. La migración de WordPress no implica migrar el boletín ni convertir suscriptores en miembros.

## 13. Inconsistencias y riesgos que deben resolverse

| Inconsistencia o riesgo                                                                | Resolución prevista                                                                                               |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Plan anterior prioriza membresías y deja contenido para el final.                      | Esta versión establece núcleo y contenido como primera entrega.                                                   |
| WordPress permanece como editor en el plan anterior.                                   | Migración con corte y retiro comprobado; una sola fuente editable después del cambio.                             |
| Guías del repositorio exigen ausencia de estado y endpoints públicos.                  | Actualizar su alcance antes de implementar autenticación o persistencia; conservar garantías aplicables al sitio. |
| Tarifas configurables, pero anualidad y lectura de tres meses aparecen rígidas.        | Condiciones versionadas por contrato y valores predeterminados opcionales.                                        |
| “Cuentas separadas” es ambiguo frente a Google.                                        | Resuelto: un login global por persona y afiliaciones independientes, sin acceso automático entre organizaciones.  |
| Rutas fijas y prerender de build frente a páginas creadas en el CMS.                   | Resolver rutas publicadas y actualización del HTML, metadatos y caché.                                            |
| Textos en archivos y en componentes.                                                   | Inventariar y migrar ambos; evitar que el editor cambie una copia que no usa la página.                           |
| Datos editoriales compartidos por varias páginas.                                      | Distinguir bloques reutilizados de copias independientes; advertir el alcance de la edición.                      |
| Marca ASPAL integrada en componentes y rutas comerciales.                              | Separar plantilla de marca, datos de cliente y páginas del operador.                                              |
| “Eventos completos” puede implicar más que registro y asistencia.                      | Acotar primera versión; ponencias, patrocinio y logística requieren alcance adicional.                            |
| Solo lectura puede interrumpir obligaciones con miembros y asistentes.                 | Definir efecto por capacidad y permitir procesos financieros y de consistencia necesarios.                        |
| Cambios de permisos o módulos dejan cachés y archivos accesibles.                      | Revisar invalidación, sesiones, enlaces de descarga y contexto de consulta.                                       |
| Uso de HTML WordPress en un editor propio puede introducir contenido inseguro.         | Sanear y validar importación, bloques, enlaces e incrustaciones.                                                  |
| Conservación de medios en WordPress después de apagarlo.                               | Copiar o sustituir dependencias y verificar enlaces antes del retiro.                                             |
| Formación tratada como un tipo de publicación.                                         | Separar ficha editorial de procesos de aprendizaje.                                                               |
| Conciliación diferida hasta expansión.                                                 | Incluir conciliación operativa desde la primera etapa de cobros.                                                  |
| Moneda o periodicidad configurable interpretada como soporte universal.                | Limitar a combinaciones implementadas y verificadas; no prometer disponibilidad por configuración.                |
| Preparación para otros clientes confundida con una segunda operación real ya acordada. | Prueba técnica con dos organizaciones desde el inicio y coordinación posterior del piloto externo.                |

## 14. Decisiones pendientes por momento

### Antes de implementar el núcleo y el gestor

- Vinculación segura de Google a la cuenta de acceso global (el modelo de identidad ya está decidido).
- Inventario exacto de contenido WordPress, audio, feeds, adjuntos y redirecciones.
- Propiedad editorial de las páginas del operador y de ASPAL asociación, aunque compartan dominio público.
- Primer catálogo de bloques, campos de tipos configurables y límites de personalización.
- Estrategia de renderizado, distribución, dominios, alojamiento y recuperación.
- Equipo, presupuesto, responsables de publicación y fecha objetivo para estimar entregas.

### Antes de cobrar y aplicar restricciones comerciales

- Duraciones y frecuencias que se habilitarán inicialmente, comisiones y reglas de cambio contractual.
- Efectos de prueba vencida, impago y terminación sobre páginas, usuarios, cobros y eventos activos.
- Métodos de pago concretos, países, monedas, devoluciones, disputas y necesidad operativa de facturación.
- Reglas de afiliación, periodos de gracia, descuentos, aprobación y representación institucional.
- Retención, exportación y eliminación de datos al cerrar una cuenta.

### Antes de comunidad y eventos

- Necesidades de acceso sin conexión, cesión de entradas, aforos por sesión y emisión de constancias.
- Alcance de ponencias, patrocinadores y expositores, si se incorpora.
- Responsables de moderación, visibilidad de perfiles y tratamiento de contribuciones tras una baja.

## 15. Próximo trabajo concreto

Convertir las etapas 0 a 2 en historias de usuario y criterios verificables, manteniendo este documento como referencia de dirección. La primera demostración objetivo será: entrar como autor de ASPAL, editar una página existente, enviar a revisión, publicar con otro usuario autorizado y comprobar la página pública; repetir con otra organización sin exposición cruzada.

Después se completará la migración editorial y se validará que el sitio continúa funcionando sin WordPress. No se crearán por anticipado todas las tablas o interfaces de módulos futuros; se implementarán los límites, permisos y contratos necesarios para incorporarlos sin rehacer el núcleo.

## 16. Referencias de esta actualización

- Versión 1.0 de este plan (30 de septiembre de 2026): historial de git de este archivo.
- Inventario funcional: `docs/plataforma.md`.
- Arquitectura: `docs/architecture.md`.
- Diseño de datos: `docs/database-design.md`.
- Código inspeccionado: `client/src/App.tsx`, `client/src/lib/rutas.ts`, las páginas `inicio.tsx` y `nuestro-equipo.tsx` y `vercel.json`.
- Decisiones del responsable del producto del 13 de octubre de 2026: contenido primero y sustitución de WordPress en blog y podcast; ASPAL como primer cliente y preparación para otras organizaciones; configuración comercial flexible; monorepo con plataforma nueva (Fastify + Zod); sitio sin estado que lee la API de la plataforma; un solo login global por persona; Google sin Facebook; subdominio por asociación.
