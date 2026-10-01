# Plan de construcción de la plataforma ASPAL

**Versión:** 1.0  
**Fecha:** 30 de septiembre de 2026  
**Estado:** plan funcional y de arquitectura para revisión antes de implementación

## 1. Objetivo

Convertir el sitio institucional existente de ASPAL en la puerta de entrada a una plataforma SaaS de gestión de asociaciones profesionales y de otros tipos. La plataforma dará a cada asociación un espacio independiente para gestionar miembros, instituciones, pagos, eventos, contenidos y, posteriormente, comunidad y recursos.

Los pilotos serán **ANPR** y **ASPAL Asociaciones Profesionales de América Latina**, con una referencia inicial de aproximadamente **300 miembros y 10 administradores**. ASPAL actuará además como operador comercial de la plataforma; ese panel de operador es distinto del espacio de ASPAL como asociación usuaria.

## 2. Decisiones ya tomadas

| Tema                    | Decisión                                                                                                                                                                   |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Producto                | Una plataforma para múltiples asociaciones, comenzando con ANPR y ASPAL.                                                                                                   |
| Arquitectura inicial    | Aplicación modular integrada, con API; extraer servicios solo cuando exista una necesidad operativa comprobada.                                                            |
| Infraestructura y datos | AWS para la nueva plataforma, PostgreSQL como base de datos y Amazon SES para correos operativos.                                                                          |
| Acceso                  | Correo electrónico, Google y Facebook desde el lanzamiento. La integración con proveedores institucionales queda preparada para una etapa posterior.                       |
| Cuentas                 | Accesos separados entre asociaciones; una persona puede ser miembro individual y representante institucional dentro de una misma asociación.                               |
| Contrato SaaS           | Suscripción anual; precio, comisión y días de prueba configurables por cliente.                                                                                            |
| Prueba vencida          | Tres meses de acceso de solo lectura.                                                                                                                                      |
| Membresías              | Individuales e institucionales, incluidas variantes gratuitas, de estudiante y vitalicias; altas automáticas tras pago y registros manuales.                               |
| Representantes          | Cada asociación define si el número permitido por plan institucional es fijo o ilimitado.                                                                                  |
| Cobros                  | Stripe Connect: cada asociación recibe sus cobros y ASPAL obtiene la comisión configurada por cliente. La suscripción que paga la asociación a ASPAL es un flujo distinto. |
| Facturación CFDI        | Posterior al primer lanzamiento.                                                                                                                                           |
| Página pública          | Subdominio dentro de ASPAL, con logo, colores y contenido propio por asociación.                                                                                           |
| Eventos                 | Inscripción, entradas de pago, cupos, descuentos, check-in y certificados.                                                                                                 |
| Correos iniciales       | Confirmación de cuenta y pago, renovaciones y mensajes de eventos.                                                                                                         |

## 3. Punto de partida: sitio existente

Según `plataforma.md`, el sitio público usa TypeScript, React, Vite, wouter, TanStack Query, Tailwind y shadcn/ui. El servidor Express actúa hoy como intermediario para WordPress y Mailchimp; el despliegue actual está en Vercel. El sitio no tiene base de datos, sesiones ni autenticación.

Se conservarán las páginas institucionales, el sistema visual, el catálogo de componentes y la integración editorial actual de blog y podcast con WordPress. Mailchimp puede seguir atendiendo la captación del boletín, mientras SES se incorpora para mensajes operativos. Las rutas `/unete`, `/eventos` y `/plataforma` se conectarán progresivamente con las funciones reales del producto. La migración completa del sitio público a AWS no debe bloquear el desarrollo de la plataforma.

## 4. Principios de crecimiento

1. **Separar los módulos por responsabilidad:** clientes y contratos, identidad, permisos, personas e instituciones, membresías, pagos, eventos, comunicaciones, páginas públicas, comunidad y recursos.
2. **API para el sitio y los portales:** las pantallas no contendrán reglas de cobro, vigencia o autorización.
3. **Contratos internos claros:** los módulos intercambian operaciones y eventos definidos; no alteran libremente los datos privados de otros módulos.
4. **Aislamiento por asociación:** la identidad visual y el subdominio se acompañan de controles de acceso y separación de datos en servidor y PostgreSQL.
5. **Procesos en segundo plano:** correos, certificados, avisos de pagos e IA no deben bloquear los recorridos principales.
6. **Evolución gradual:** comunidad u otro módulo podrá independizarse si su volumen, equipo o frecuencia de despliegue lo justifica.
7. **IA bajo supervisión:** los borradores se revisan antes de publicarse o enviarse, y el asistente solo accede a datos permitidos para el usuario y la asociación.

## 5. Etapas

### Etapa 0 — Preparación del proyecto

**Objetivo:** construir sobre el repositorio existente sin interrumpir el sitio público.

**Trabajo:** revisar código y documentos de arquitectura; identificar componentes reutilizables; acordar límites de módulos y API; definir la relación entre ASPAL operador y ASPAL asociación; documentar recorridos reales de ANPR y ASPAL para un miembro individual, una institución, un administrador y un evento.

**Entregables:** mapa del sistema actual, estructura propuesta de módulos, reglas de negocio iniciales y recorridos aprobados.

**Cierre:** el equipo puede explicar qué sistema conserva cada dato, qué cambia en el sitio y qué flujo se implementa primero.

### Etapa 1 — Base SaaS, identidad y permisos

**Objetivo:** operar dos asociaciones independientes.

**Trabajo:** alta de asociaciones; subdominios e identidad visual; configuración por cliente de contrato anual, prueba y comisión; acceso por correo, Google y Facebook; roles y permisos de ASPAL operador, soporte, administradores, gestores, representantes y miembros; estados de prueba, activo, vencido y tres meses de solo lectura; registro de acciones sensibles.

**Cierre:** un administrador de ANPR y uno de ASPAL pueden trabajar sin ver ni modificar datos de la otra asociación. Una persona puede combinar su membresía individual con su representación institucional dentro de una misma asociación.

### Etapa 2 — Membresías e instituciones

**Objetivo:** gestionar el ciclo de vida del miembro.

**Trabajo:** personas e instituciones; planes individuales, institucionales, gratuitos, de estudiante y vitalicios; beneficios y vigencias; número fijo o ilimitado de representantes por plan; altas manuales y solicitudes de alta; renovaciones; importación y depuración de miembros iniciales; panel administrativo.

**Cierre:** ambas asociaciones pueden dar de alta una persona y una institución, asignar representantes, consultar vigencias e identificar renovaciones próximas sin compartir información entre sí.

### Etapa 3 — Cobros y página pública operativa

**Objetivo:** permitir contratación y pago reales.

**Trabajo:** cuentas conectadas de Stripe para asociaciones; cobros de membresías; comisión de ASPAL según contrato; suscripción anual del cliente a ASPAL como flujo separado; confirmación de pagos, activación automática y gestión de fallas; páginas públicas configurables con planes e inscripción; integración de `/unete`; mensajes operativos mediante SES.

**Cierre:** una persona puede descubrir un plan, registrarse, pagar y acceder a su membresía. El equipo puede registrar un caso manual y distinguirlo de un pago procesado. Los fondos y comisiones se asignan conforme al contrato correspondiente.

### Etapa 4 — Eventos completos

**Objetivo:** ofrecer un proceso recurrente de participación e ingresos.

**Trabajo:** calendario y páginas de eventos; conexión de `/eventos` con los eventos de ASPAL; inscripción gratuita y pagada; cupos, descuentos y posibles beneficios por membresía; mensajes de inscripción y recordatorios; check-in; certificados; reportes de inscripción, asistencia e ingresos.

**Cierre:** ANPR y ASPAL completan por separado un evento desde publicación e inscripción hasta asistencia y certificado, con cobros correctamente asignados.

### Etapa 5 — Operación e IA administrativa

**Objetivo:** reducir trabajo repetitivo y cerrar la primera versión comercial.

**Trabajo:** paneles de miembros activos, altas, renovaciones, cobros y eventos; seguimiento de errores de pago y entrega de correos; copiloto de IA que prepara borradores de planes, eventos, invitaciones, recordatorios y preguntas frecuentes a partir de información aprobada; revisión humana antes de publicación o envío.

**Cierre del primer lanzamiento:** ANPR y ASPAL operan membresías y eventos completos. ASPAL puede configurar un tercer cliente con precio, comisión y prueba propios sin cambios de código. Se mide tiempo administrativo ahorrado y calidad de los borradores de IA.

### Etapa 6 — Comunidad

**Objetivo:** dar valor continuo a la membresía más allá de pagos y eventos.

**Trabajo:** perfiles y directorio con reglas de visibilidad; publicaciones, comentarios, grupos y conversaciones tipo red social; moderación, reportes y notificaciones; búsqueda de conversaciones; sugerencias de IA y detección de preguntas sin respuesta respetando permisos.

**Cierre:** cada asociación puede sostener y moderar su propia comunidad, y un miembro encuentra conversaciones relevantes sin exposición de datos de otras asociaciones. El módulo empieza integrado; se evaluará independizarlo si la carga u operación lo requiere.

### Etapa 7 — Biblioteca y contenido por asociación

**Objetivo:** conservar y distribuir conocimiento útil.

**Trabajo:** biblioteca con categorías y permisos por plan; contenido público y exclusivo; blog y podcast por asociación según demanda; continuidad del WordPress editorial de ASPAL mientras resulte conveniente; búsqueda y asistente con respuestas respaldadas por fuentes autorizadas; reutilización revisada de contenidos de eventos.

**Cierre:** los miembros encuentran recursos según sus derechos y pueden verificar las fuentes de una respuesta del asistente.

### Etapa 8 — Expansión y funciones avanzadas

**Objetivo:** escalar la oferta validada a asociaciones profesionales y de otros sectores.

**Candidatos:** facturación CFDI y conciliación, SSO institucional, dominios propios, opciones de aislamiento especial por cliente, cursos, marketing y bolsa de trabajo, analítica de participación y renovación. Cada función requiere definición funcional y demanda comprobada antes de entrar al alcance comprometido.

## 6. Secuencia de lanzamiento

| Lanzamiento               | Etapas | Resultado                                                                                               |
| ------------------------- | ------ | ------------------------------------------------------------------------------------------------------- |
| Primera versión comercial | 0–5    | Clientes, identidad, membresías, pagos, página pública, eventos, correos, reportes e IA administrativa. |
| Segunda versión           | 6–7    | Comunidad y biblioteca/contenido por asociación.                                                        |
| Expansión                 | 8      | Integraciones y capacidades avanzadas según clientes y operación real.                                  |

La división en etapas ordena el desarrollo y la validación; **las etapas 0–5 componen la primera versión comercial**, no ocho productos separados.

## 7. Riesgos y controles del plan

| Riesgo                                       | Control propuesto                                                                                                             |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Mezclar datos de asociaciones                | Resolver el ámbito de asociación en cada operación; aplicar permisos y controles en PostgreSQL; probar cruces entre clientes. |
| Confundir identidad, membresía y rol         | Modelar por separado la persona, su acceso, sus membresías y sus representaciones institucionales.                            |
| Duplicar o perder efectos de un pago         | Registrar estados y procesar confirmaciones de Stripe de forma repetible y auditable.                                         |
| Ampliar demasiado el primer lanzamiento      | Cerrar cada etapa mediante casos completos de ANPR y ASPAL antes de abrir otra.                                               |
| Hacer que IA publique información incorrecta | Usar datos aprobados, mostrar el borrador y exigir autorización explícita para publicar o enviar.                             |
| Migrar demasiadas piezas a la vez            | Mantener WordPress, Mailchimp y el sitio público mientras la nueva API y sus flujos se estabilizan.                           |

## 8. Próximo trabajo de definición

Convertir las etapas 0 y 1 en un backlog con historias de usuario, dependencias y criterios de aceptación. Antes de implementar cobros y eventos, cerrar una matriz de reglas para: pago exitoso o fallido, alta manual, renovación, vencimiento de prueba, periodo de solo lectura, cambio de representantes, cancelación, descuentos, devoluciones y certificados.

> **Alcance de este documento:** plan basado en las decisiones de producto de la conversación y en el inventario `plataforma.md`. La estructura concreta de código y despliegue se confirmará al inspeccionar el repositorio y sus documentos técnicos.
