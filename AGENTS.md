# AGENTS.md

Instrucciones de trabajo para agentes de código en todo el repositorio `aspal`.
Mantener este archivo estable, conciso y libre de estado temporal de una sesión.

## Objetivo del producto

Sitio público de ASPAL (Asociaciones Profesionales de Latinoamérica): landing
institucional, blog y podcast servidos desde un WordPress headless, y alta al
boletín en Mailchimp.

Estas reglas describen **el sitio**. La plataforma SaaS (gestor de contenido,
membresías, cobros) es una aplicación aparte, con base de datos y
autenticación propias; se rige por `docs/plan-plataforma-por-etapas.md` y
`docs/database-design.md`, y tendrá sus guías cuando exista su código. Al
migrar el blog y el podcast, el sitio leerá de la API de la plataforma y seguirá
sin estado.

Una modificación al sitio debe proteger primero:

- **El sitio sigue sin estado.** Sin base de datos, sesiones ni autenticación;
  la única escritura delega en Mailchimp y no guarda nada.
- **Una sola fuente de lógica.** WordPress y suscripción viven en `shared/`;
  `server/` y `api/` solo la montan. Un endpoint que exista en un entorno y no
  en el otro es una regresión.
- **Los fallos se ven.** Un error de WordPress sale como 5xx, nunca como lista
  vacía; el cliente distingue «no se pudo cargar» de «no hay contenido».
- **Nada personal en los logs.** Correo, nombre y organización de quien se
  suscribe no se registran ni en errores.

## Fuentes de verdad y contexto

- Antes de editar, identificar la carpeta y el módulo afectados y revisar
  `git status --short`. Preservar todos los cambios del usuario, aunque no
  estén relacionados con la tarea.
- Tratar `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`,
  `eslint.config.js`, `vercel.json` y el código vigente como fuentes de verdad
  ejecutables.
- Leer `CLAUDE.md` para las reglas generales y, según el alcance:
  - `apps/sitio/server/CLAUDE.md` para `server/`, `api/`, `shared/` y cualquier endpoint.
  - `apps/sitio/client/CLAUDE.md` y `design.md` para frontend o UX/UI.
  - `docs/api/endpoints.md` al crear o cambiar contratos HTTP.
  - `docs/database-design.md` antes de cualquier dato persistente (plataforma).
  - `docs/plan-plataforma-por-etapas.md` para reglas de negocio de la plataforma.
  - `docs/adr/` para decisiones transversales; `docs/plans/` es histórico.
- Las secciones de sesión, rama, producción o «próxima tarea» dentro de otros
  documentos son contexto histórico: verificarlo contra Git y el código. No
  actualizar esos bloques salvo petición explícita.
- Si una guía contradice la configuración ejecutable o el comportamiento
  comprobado, no adivinar: conservar el comportamiento seguro, documentar la
  discrepancia y pedir criterio solo si cambia materialmente el resultado.

## Arquitectura del repositorio

- Monorepo con npm workspaces (D1), sin Turborepo. Usar npm (un solo
  `package-lock.json` en la raíz); no introducir otro gestor. Workspaces:
  `apps/sitio` (`@aspal/sitio`); la plataforma llegará como `apps/plataforma`.
  Los comandos se lanzan desde la raíz, que los reenvía al workspace.
- `vercel.json` y `api/index.ts` de la raíz existen porque el proyecto de Vercel
  sigue con la raíz del repo como Root Directory: la puerta solo reexporta
  `apps/sitio/api/index.ts` y `vercel.test.ts` lo vigila.
- Runtime requerido por el manifiesto raíz: Node.js `22.x` (`.nvmrc` = 22). No
  hay campo `packageManager`; el npm local es el que acompaña a Node 22.
- Carpetas y responsabilidad (dentro de `apps/sitio/`):
  - `shared/wordpress`: tipos, normalización, cliente HTTP y rutas `/api/*` de
    WordPress. `client.ts` es solo-servidor.
  - `shared/suscripcion`: tipos, validación compartida con el navegador, rutas y
    cliente de Mailchimp. `mailchimp.ts` es solo-servidor.
  - `server/`: Express de desarrollo (Vite middleware) y self-hosted
    (estáticos con las mismas reglas que Vercel). Solo wiring.
  - `api/index.ts`: función serverless de Vercel. Solo wiring. Es producción.
  - `client/`: SPA React 18 + Vite, prerenderizada por ruta en el build.
  - `scripts/`: `check-assets.mjs` (puerta del build), `prerender.mjs`,
    `imagenes.mjs` (conversión puntual a WebP).
- Los artefactos generados (`dist/`, `node_modules/`, `.superpowers/`) y los
  archivos de log no se editan ni se incluyen en cambios.

## Forma de trabajar

- Resolver la causa raíz con el cambio más pequeño y coherente posible. No hacer
  refactors, renombrados o reformateos masivos fuera del alcance solicitado.
- Buscar primero una implementación análoga en el mismo módulo y respetar sus
  contratos, estructura, estilo e imports. Antes de crear un componente, buscar
  en `client/src/catalogo/registro.ts`; antes de un hook o helper, en
  `client/src/hooks/` y `client/src/lib/`.
- No eliminar archivos, descartar cambios, reescribir historial, hacer push ni
  modificar infraestructura remota (Vercel, Mailchimp, WordPress) salvo
  autorización explícita. Commitear solo cuando se pida.
- No agregar, quitar ni actualizar dependencias sin autorización explícita. Si
  una dependencia cambia, mantener sincronizados `package.json` y
  `package-lock.json`. Un componente de shadcn se añade con su CLI.
- No leer, mostrar, copiar ni versionar secretos. No modificar `.env`. Cambiar
  `.env.example` solo cuando la tarea incluya una variable pública nueva y usar
  exclusivamente valores ficticios o vacíos.
- No editar archivos fuera del módulo afectado excepto contratos compartidos,
  pruebas o documentación que deban mantenerse sincronizados.
- No suprimir errores con `any`, `@ts-ignore`, `@ts-expect-error`, casts amplios
  o `eslint-disable` sin una justificación localizada y comprobable.
- Mantener compatibilidad hacia atrás en la API `/api/*`, salvo que la tarea
  exija y documente una ruptura.

## Desarrollo guiado por especificaciones

Toda funcionalidad o módulo nuevo sigue **SDD** (ADR-0006). Orden fijo:
especificación → contrato → tests → código → verificación. La especificación
manda: si el código se desvía, se corrige primero la especificación.

1. **Especificación.** Problema, alcance (y qué queda fuera) y **criterios de
   aceptación numerados** (`CA-1`, `CA-2`…), verificables, con casos de error y
   límites. Formato: _Dado_ / _cuando_ / _entonces_. Para esfuerzo M o L, un plan
   en `docs/plans/` con la sección «Criterios de aceptación»; para S, en la
   descripción del commit. Se presenta y se espera aprobación antes de
   implementar.
2. **Contrato.** Primero lo que otros consumen y de forma ejecutable: endpoint en
   `docs/api/endpoints.md`; datos con la propuesta de la sección 6 de
   `docs/database-design.md`; tipos y validación en `shared/` con su test. En la
   plataforma, esquemas Zod en `packages/contratos`. No se añade una librería de
   esquemas al sitio.
3. **Tests.** Cada criterio tiene al menos un test cuyo nombre cita el criterio
   (`CA-2: …`) o declara su comprobación manual. **Test primero** (que falle
   antes del código) es obligatorio en lógica de negocio, permisos, dinero,
   aislamiento entre asociaciones y toda corrección de bug; en lo demás, es lo
   recomendable.
4. **Código limpio.** El cambio mínimo que cumple los criterios; nombres que
   revelan intención; funciones pequeñas de una sola responsabilidad; sin
   duplicación, código muerto ni abstracciones anticipadas (YAGNI, KISS);
   comentarios que explican el porqué; errores explícitos, nunca degradados en
   silencio; la lógica no depende de Express, la red ni un proveedor (eso va en
   los bordes); denegar por defecto y validar toda entrada en el servidor.
5. **Terminado.** Ver «Documentación y terminado».

Proporcionalidad: un cambio trivial (texto, typo, formato) no necesita
especificación formal. Todo lo que añada comportamiento, contrato, datos,
permisos o dinero sigue el flujo completo.

## Convenciones de código

- TypeScript estricto: `strict: true`, `moduleResolution: bundler`, `noEmit`.
  No están activas `exactOptionalPropertyTypes` ni `noUncheckedIndexedAccess`.
  `tsconfig.json` excluye `**/*.test.ts` del typecheck (ver deuda técnica).
- Formato: Prettier con **comillas dobles**, punto y coma, `trailingComma: all`,
  `printWidth: 90`, dos espacios, LF. `client/src/components/ui/` y
  `client/src/assets/` están fuera de Prettier y ESLint. No reformatear código
  ajeno.
- Identificadores en español sin tildes; componentes React en PascalCase y
  hooks con prefijo `use`. Excepción congelada: `shared/wordpress/` y el
  contrato `TransformedPost` están en inglés y así se quedan. Conservar el
  vocabulario del módulo en vez de mezclar idiomas. Detalle en `CLAUDE.md` §4.
- Evitar abreviaturas opacas y utilidades genéricas. Extraer una abstracción
  solo cuando exista reutilización o reduzca complejidad real. Las clases
  Tailwind repetidas van a `client/src/lib/clases.ts`.
- Agregar comentarios para explicar decisiones, invariantes o riesgos, no para
  narrar código evidente. Los comentarios van en español.
- Los imports relativos de `shared/` y `api/` llevan extensión `.js`
  (`from "./types.js"`): Vercel transpila archivo a archivo y Node ESM exige la
  extensión. `server/` y `client/` se empaquetan y no la necesitan.
- Las variables descartadas empiezan por `_` (`argsIgnorePattern: "^_"`).

## Backend y API

- No hay capa routes/controller/service. Cada módulo de `shared/` registra sus
  rutas en una función `registrar…`/`register…` que reciben `server/index.ts` y
  `api/index.ts`. Un endpoint nuevo se registra en `shared/`, nunca en los dos
  consumidores por separado.
- Validar toda entrada no confiable en el borde: `enteroAcotado` para la
  paginación, `validarSuscripcion` para el formulario. No confiar en query,
  body ni datos de WordPress o Mailchimp.
- Formato de respuesta: los endpoints existentes conservan su contrato actual
  (ver `docs/api/endpoints.md`). **Los endpoints nuevos** responden
  `{ success: true, data, meta? }` o
  `{ success: false, error: { codigo, mensaje, campo? } }`.
- Rutas bajo `/api/` sin versión. Todos los endpoints son públicos; no hay
  autenticación ni autorización. No exponer detalles internos ni datos de
  terceros en mensajes de error.
- Los fallos de WordPress se propagan como 5xx. El único 404 legítimo es
  `/api/posts/:slug` cuando el post no existe.
- Las listas paginan y acotan: `per_page` 1–100, `page` ≥ 1; el total viaja en
  la cabecera `X-Total-Count` (`CABECERA_TOTAL`).
- Operaciones externas con tiempo máximo (`AbortSignal.timeout`) y sin PII en
  logs. Mailchimp: alta de solo creación, idempotente frente a miembros
  existentes.
- Datos persistentes: no existen en el sitio. Para la plataforma rige
  `docs/database-design.md`; generar y revisar el SQL de migración, nunca
  ejecutarlo contra bases reales sin permiso.

## Frontend

- Las llamadas HTTP viven junto a quien las usa: `fetch` en hooks
  (`use-lista-paginada.ts`), en páginas o en `client/src/lib/suscripcion.ts`.
  Estado remoto en TanStack Query (la `queryKey` es el path del endpoint);
  estado local con hooks de React. No hay stores globales. Invalidar las query
  keys afectadas después de una mutación.
- Reutilizar componentes y patrones existentes antes de crear variantes. Seguir
  `client/CLAUDE.md` y los tokens de `design.md`; no introducir hexadecimales ni
  estilos aislados si existe un token o una clase compartida.
- Construir mobile-first y comprobar al menos estados de carga, vacío, error y
  éxito. No ocultar errores de envío ni dejar acciones duplicables durante una
  solicitud.
- Texto visible en español, directamente en el componente o en
  `client/src/content/`. No hay i18n.
- Fechas con `date-fns` y locale `es` a través de `client/src/lib/date.ts`; no
  formatear a mano.
- Mantener accesibilidad: HTML semántico, un solo `<h1>` y un
  `<main id="contenido">` por página, nombre accesible en enlaces, navegación
  por teclado, foco visible, contraste AA (test en `tokens.test.ts`) y respeto
  de `prefers-reduced-motion` (CSS y `MotionConfig`).
- En páginas prerenderizadas no animar la opacidad del contenido ni depender de
  `window` en el primer render (`useEnCliente`). `prerender.mjs` aborta el build
  si una ruta sale con `opacity:0` o sin `<h1>`.
- `data-testid` en elementos interactivos y significativos.

## Pruebas y validación

Usar la comprobación mínima suficiente y ampliarla según el riesgo. No afirmar
que un comando pasó si no se ejecutó o si falló por configuración previa.

```powershell
# Todo el repo
npm run check          # tsc + check-assets
npm run lint
npm run format:check
npm test               # Vitest, una sola ejecución
npm run test:coverage  # con cobertura; falla si baja del umbral
npm run build

# Navegador real (servidor levantado): captura en capturas/ y errores de consola
npm run check:browser -- http://localhost:5001/ --ancho=375

# Archivo de prueba enfocado
npm test -- shared/suscripcion/validacion.test.ts

# En modo vigilancia
npm run test:watch
```

- No inventar una validación ni descargar tooling con `npx`. Usar solo scripts y
  herramientas ya declarados, o informar la limitación.
- Para un cambio en `shared/` o `server/`, ejecutar primero la prueba enfocada y
  `npm run check`; ampliar a la suite cuando toque contratos o código
  transversal. Comprobar que `server/index.ts` y `api/index.ts` siguen montando
  lo mismo (`rutas.test.ts` lo vigila para la suscripción).
- Para un cambio de frontend, ejecutar al menos `npm run check` y
  `npm run build`, y verificar visualmente en el navegador cuando cambien layout,
  interacción o responsive (~375 px y ~1280 px).
- Las pruebas unitarias deben ser deterministas, usar datos ficticios y mockear
  `fetch` y variables de entorno (`vi.stubGlobal`, `vi.stubEnv`). Nunca
  depender de `.env`, red o servicios reales. Las de `server/` levantan Express
  en un puerto libre.
- Todo arreglo de bug debe incluir una prueba de regresión cuando el área tenga
  infraestructura de pruebas adecuada.
- Al final ejecutar `git diff --check`, revisar el diff completo y confirmar que
  no se incluyeron secretos, logs, artefactos ni cambios no relacionados.

## Documentación y terminado

- Actualizar `docs/api/endpoints.md`, `.env.example` o documentación solo cuando
  el comportamiento público correspondiente cambie.
- Registrar una ADR en `docs/adr/` para decisiones arquitectónicas costosas de
  revertir; no crear ADR para implementaciones locales rutinarias.
- Una tarea está terminada cuando el comportamiento solicitado está implementado,
  los riesgos relevantes tienen cobertura, las validaciones proporcionales pasan
  y se reportan con claridad las comprobaciones no ejecutadas o bloqueadas.
- Una **funcionalidad o módulo nuevo** (ADR-0006) está terminado cuando, además:
  la especificación está actualizada y viaja en el mismo commit o rama que el
  código; cada criterio de aceptación tiene su test (o comprobación manual
  registrada) y pasa; `check`, `lint`, `format:check`, `test` y, si toca cliente
  o servidor, `build` pasan con salida real; se revisó el diff completo; y las
  decisiones costosas tienen ADR y la deuda dejada está en
  `docs/sprints/deuda-tecnica.md`.
- Si se solicita un commit, usar Conventional Commits con scope descriptivo
  (`CLAUDE.md` §5). No crear el commit hasta que el usuario lo pida expresamente.

## Code Review Rules

En revisiones, priorizar defectos comprobables sobre preferencias de estilo:

- fuga de datos personales a logs o respuestas, y módulos solo-servidor
  (`client.ts`, `mailchimp.ts`) que puedan acabar en el bundle del navegador;
- redirecciones abiertas y bucles en `server/static.ts` y `vercel.json`
  (`static.test.ts` y `vercel.test.ts` cubren los casos conocidos);
- divergencia entre `server/index.ts` y `api/index.ts`;
- degradar un fallo de WordPress a lista vacía, o cachear un fallo como «no hay
  contenido»;
- rupturas del contrato API, del prerender (opacidad 0, `<h1>` ausente,
  acceso a `window` en el primer render) o de los tests del catálogo;
- condiciones de carrera en formularios (envíos dobles) y manejo incorrecto de
  errores;
- falta de pruebas para comportamiento nuevo o regresiones plausibles.

Cada hallazgo debe indicar archivo y línea, impacto, escenario que lo reproduce y
una corrección segura. Si no hay hallazgos, decirlo y mencionar riesgos residuales
o validaciones que no pudieron ejecutarse.
