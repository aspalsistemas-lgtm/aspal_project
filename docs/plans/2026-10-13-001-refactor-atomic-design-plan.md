---
title: Migración de client/src/components a Atomic Design
type: refactor
status: approved
date: 2026-10-13
origin: docs/sprints/deuda-tecnica.md (3.1, con 3.3 y 4.2) · design.md §1.2 · ADR-0006 (SDD)
---

# refactor: migración de `client/src/components` a Atomic Design

> Plan de la deuda 3.1, que arrastra 3.3 (nombres en inglés) y 4.2
> (`export default`). Sigue ADR-0006: especificación y criterios de aceptación
> antes de tocar código. **No se mueve nada hasta cerrar las decisiones de la
> sección 3.** La clasificación de la sección 4 es una propuesta: cada
> componente se confirma leyendo su código en la fase que lo mueve.

## 1. Objetivo y alcance

Organizar `client/src/components/` por nivel atómico (Brad Frost), según las
reglas de `design.md` §1.2, **sin cambiar el comportamiento ni el aspecto del
sitio**. Es un cambio de estructura: el HTML prerenderizado de cada ruta debe
quedar idéntico salvo los hashes de los assets.

**Entra:** 3.1 (mover a `atoms/`, `molecules/`, `organisms/`, `templates/`),
3.3 (renombrar los componentes heredados en inglés al moverlos) y 4.2
(`export function` nombrada en lugar de `export default`).

**Fuera:** 3.6 (hooks de shadcn), 3.5 (`set-state-in-effect`: cambia
comportamiento, va aparte) y 3.7 (props booleanas: solo en componentes cuyo
contenido se edite, nunca en un commit de movimiento). Tampoco se rediseña ni
se refactoriza ningún componente.

## 2. Punto de partida (medido el 2026-10-13)

| Carpeta          | Componentes | Nota                                                  |
| ---------------- | ----------- | ----------------------------------------------------- |
| `institucional/` | 20          |                                                       |
| `layout/`        | 13          | incluye piezas de infraestructura sin aspecto propio  |
| `content/`       | 9           |                                                       |
| `ui/`            | 8           | shadcn: la ruta la fija el alias de `components.json` |
| `sections/`      | 7           | legado; solo los usa `pages/plataforma.tsx`           |
| `forms/`         | 1           |                                                       |
| **Total**        | **58**      | 47 archivos los importan por alias `@/components/...` |

Lo que depende de las rutas actuales y hay que actualizar en el mismo cambio:

- `client/src/catalogo/registro.ts`: cada entrada lleva `archivo` e `importar`.
- `client/src/catalogo/registro.test.ts`: `CATEGORIAS_POR_CARPETA` y las
  comprobaciones «clasifica cada componente según su carpeta», «una línea de
  import que apunta a su archivo» y «el nombre importado existe».
- `client/src/catalogo/tipos.ts`: el tipo `Categoria`.
- Demos y vistas del catálogo (`demos-*.tsx`, `VistaDemo.tsx`,
  `SeccionFundamentos.tsx`, `CopiarCodigo.tsx`).
- `components.json` (alias de shadcn) y `eslint.config.js` (ignora `ui/**`).
- Documentación: `design.md` §1, `client/CLAUDE.md` §1-2 y `CLAUDE.md` §3-4.

Red de seguridad disponible: typecheck de los tests (3.2), el test del
catálogo, cobertura con umbral (4.3) y `npm run check:browser`.

## 3. Decisiones

**Cerradas el 2026-10-14 por el responsable, todas según la recomendación:**
`ui/` no se mueve (DA-1) · `sections/` no se migra (DA-2) · el catálogo gana
el campo `nivel` y conserva `categoria` (DA-3) · carpeta
`components/infraestructura/` (DA-4) · los nombres de DA-5 tal cual.

### DA-1 · `ui/` de shadcn — se recomienda **no moverla**

El CLI de shadcn escribe en la ruta del alias `ui` de `components.json`.
Moverla a `atoms/` obliga a cambiar el alias y a desviarse del estándar de
shadcn para siempre. **Recomendación:** `components/ui/` se queda; se documenta
como «átomos de base gestionados por shadcn». Alternativa: moverla y cambiar el
alias (más coherente, más fricción con el CLI).

### DA-2 · `sections/` (legado) — se recomienda **no migrarla**

Siete componentes heredados que solo usa `/plataforma`, una página que el plan
v2 rehará (deja de describir un producto genérico). Migrarlos sería trabajo
que se tira. **Recomendación:** se quedan en `sections/` marcados como legado
hasta que se rehaga `/plataforma`; entonces se borran o se reescriben ya en su
nivel. Alternativa: migrarlos ahora como el resto.

### DA-3 · Catálogo: nivel y dominio — se recomienda **separarlos**

Hoy `categoria` es el dominio (Institucional, Contenido de WordPress…) y
`/componentes` navega por él. **Recomendación:** añadir un campo `nivel`
(`atomo · molecula · organismo · plantilla`) que el test valida contra la
carpeta, y conservar `categoria` para navegar. El catálogo sigue igual para
quien lo usa y gana un filtro por nivel. Alternativa: sustituir la categoría
por el nivel (más simple, pero cambia la navegación del catálogo).

### DA-4 · Infraestructura sin aspecto propio

`ErrorBoundary`, `ScrollRestoration` y `SaltarAlContenido` no son piezas
visuales y no encajan en ningún nivel. **Recomendación:** carpeta
`components/infraestructura/` (la categoría ya existe en el catálogo).
Alternativa: tratarlas como organismos.

### DA-5 · Nombres en español de los heredados (3.3)

Aprobados: `Header` → `CabeceraSitio` · `Footer` → `PieSitio` ·
`BlogCard` → `TarjetaArticulo` · `ErrorBoundary` → `LimiteDeErrores` ·
`ScrollToTop` → `BotonVolverArriba` · `ScrollRestoration` →
`RestaurarDesplazamiento`. Los siete de `sections/` dependen de DA-2.

## 4. Clasificación

Cerrada en la F0 (2026-10-14) leyendo los casos dudosos, y registrada en el
campo `nivel` de `client/src/catalogo/registro.ts`, que es la fuente de verdad.
Criterio: combina otros componentes → molécula; carga sus propios datos o es
una sección autónoma → organismo; ante la duda, el nivel más simple.

| Nivel                  | Componentes                                                                                                                                                                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `atoms/` (8)           | AvisoMiembros · AvisoPestanaNueva · FotoHero · Hashtag · IlustracionPilar · PatronPanal · Proximamente · RetratoHex                                                                                                                                  |
| `molecules/` (17)      | BlogCard · CifraAnimada · EpisodioFila · IndiceEtapas · IndiceMapa · IndicePilares · ManifiestoNumerado · MetaArticulo · NavEtapas · PerfilCard · PilarCard · PortadaArticulo · PortadaPodcast · RacimoEquipo · ScrollToTop · SubnavSeccion · VerMas |
| `organisms/` (12)      | ContenidoReciente · Footer · FormSuscripcion · FranjaPodcast · Header · MuroAliados · PanalEtapas · PanalPilares · RutaTimeline · SeccionEtapa · SeccionPilar · VocesRed                                                                             |
| `templates/` (2)       | Banda · HeroInstitucional                                                                                                                                                                                                                            |
| `infraestructura/` (4) | CabeceraRuta · ErrorBoundary · SaltarAlContenido · ScrollRestoration                                                                                                                                                                                 |
| sin mover              | `ui/` (8, cuentan como átomos; DA-1) · `sections/` (7, legado; DA-2)                                                                                                                                                                                 |

Cambios respecto a la propuesta inicial: `CabeceraRuta` no pinta nada (solo fija
el título al navegar), así que va a infraestructura y no a plantillas;
`PortadaArticulo`, `PortadaPodcast` y `VerMas` combinan otros componentes
(moléculas); `ManifiestoNumerado` y `RacimoEquipo` no cargan datos propios
(moléculas); `PanalEtapas` y `PanalPilares` leen los suyos (organismos).

## 5. Estrategia por fases

De abajo arriba, para que cada fase solo actualice imports hacia niveles ya
migrados. **Cada fase es una rama que termina en verde y se fusiona antes de
abrir la siguiente.** Dentro de una fase, el movimiento (`git mv`, sin tocar el
contenido) va en un commit y los renombrados o cambios de export en otro, para
que git conserve el historial de cada archivo.

| Fase | Qué hace                                                                                                                                                             | Esfuerzo |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| F0   | Preparar sin mover nada: carpetas nuevas admitidas en el test y en `Categoria`/`nivel` (DA-3); test de «sin `export default` en components» en modo lista.           | S        |
| F1   | Átomos.                                                                                                                                                              | M        |
| F2   | Moléculas (incluye `BlogCard` → `TarjetaArticulo`, `ScrollToTop` → `BotonVolverArriba`).                                                                             | M        |
| F3   | Organismos (incluye `Header` y `Footer`).                                                                                                                            | M        |
| F4   | Plantillas e infraestructura (incluye `ErrorBoundary` y `ScrollRestoration`).                                                                                        | S        |
| F5   | Cierre: retirar las carpetas antiguas del test, `export function` en las 13 páginas y `App.tsx` (4.2), documentación (`design.md`, `client/CLAUDE.md`, `CLAUDE.md`). | M        |

Durante la migración no se abre trabajo paralelo sobre componentes: un
movimiento masivo genera conflictos con cualquier otra rama que los toque.

## 6. Criterios de aceptación

- **CA-1:** cada componente vive en la carpeta de su nivel; solo quedan fuera
  `ui/` y `sections/` si así se decide (DA-1, DA-2).
- **CA-2:** el test del catálogo valida que el nivel de cada entrada coincide
  con su carpeta, y que su `importar` apunta al archivo real.
- **CA-3:** `/componentes` conserva su navegación (si DA-3 se resuelve como se
  recomienda).
- **CA-4:** **sin cambio de comportamiento:** el HTML prerenderizado de cada
  ruta de `dist/` es idéntico al de antes de la fase, salvo los hashes de los
  assets. Se compara en cada fase contra un build de referencia.
- **CA-5:** `npm run check:browser` en las 11 rutas, a 1280 y 375 px, sin
  errores de consola.
- **CA-6:** ningún componente propio con nombre en inglés (3.3) ni con
  `export default` (4.2). `client/src/catalogo/pendientes.test.ts` lleva las dos
  listas, que cada fase reduce. Un `export default` nuevo se detecta solo; un
  nombre nuevo en inglés, no: lo vigila la revisión.
- **CA-7:** `check`, `lint`, `format:check`, `test`, `test:coverage` y `build`
  en verde en cada fase.

## 7. Riesgos

| Riesgo                                                | Control                                                                           |
| ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| Un import roto que solo se ve en el navegador         | `tsc` y el build fallan antes; además CA-4 y CA-5 en cada fase                    |
| Perder el historial de los archivos movidos           | `git mv` en un commit sin cambios de contenido; renombrados en otro               |
| El prerender cambia sin que nadie lo note             | CA-4: comparar el HTML de `dist/` contra un build de referencia                   |
| Conflictos con trabajo paralelo                       | Fases cortas, fusionadas una a una; congelar cambios de componentes mientras dure |
| El CLI de shadcn escribe en una ruta que ya no existe | DA-1: `ui/` no se mueve                                                           |
| Discusiones de nivel que frenan la migración          | Regla de `design.md`: ante la duda, el nivel más simple; se documenta y se sigue  |

## 8. Siguiente paso

F0 hecha (2026-10-14): campo `nivel` en el catálogo, etiqueta en `/componentes` y listas de pendientes con test. Siguiente: F1 (átomos).
