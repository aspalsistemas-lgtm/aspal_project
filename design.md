# ASPAL — Sistema de Diseño

> Prevalece sobre cualquier otro documento en todo lo visual.
> Leer completo antes de crear o modificar cualquier componente o estilo.
> Última actualización: octubre de 2026

Refleja lo que el código hace hoy. Donde la organización objetivo difiere de la
actual, se dice explícitamente y el trabajo está en
`docs/sprints/deuda-tecnica.md`.

---

## 1. Organización de Componentes

### 1.1 Hoy: carpetas por rol, con catálogo

`client/src/components/` se organiza por el papel del componente en el sitio.
El test `client/src/catalogo/registro.test.ts` fija la correspondencia
carpeta → categoría (`CATEGORIAS_POR_CARPETA`) y exige una entrada en
`registro.ts` por cada archivo:

```
components/
├── atoms/          ← átomos ya migrados (§1.2): PatronPanal, FotoHero, Hashtag, RetratoHex,
│                      IlustracionPilar, Proximamente, AvisoMiembros, AvisoPestanaNueva
├── molecules/      ← moléculas ya migradas (§1.2): PilarCard, PerfilCard, TarjetaArticulo,
│                      EpisodioFila, MetaArticulo, CifraAnimada, VerMas, BotonVolverArriba…
├── layout/         ← estructura de página e infraestructura: Banda, HeroInstitucional,
│                      Header, Footer, ErrorBoundary…
├── institucional/  ← piezas de Nosotros, Qué hacemos, Equipo y Mapa de Ruta:
│                      RutaTimeline, MuroAliados, SeccionPilar, SeccionEtapa…
├── content/        ← contenido de WordPress: FranjaPodcast, ContenidoReciente
├── forms/          ← FormSuscripcion
├── ui/             ← primitivas shadcn/ui en uso (button, card, collapsible, input,
│                      navigation-menu, toast, toaster, tooltip)
└── sections/       ← legado de /plataforma: HeroSection, FeaturesGrid… No reutilizar.
```

Reglas vigentes:

- Antes de crear un componente, buscar en `registro.ts` (`usarCuando`,
  `evitarPara`) uno que ya lo resuelva. Si le falta una variante, añadirla.
- Un componente nuevo se registra y, si su `vista` es `"demo"`, lleva demo en
  `catalogo/demos-*.tsx`. Una carpeta nueva exige añadirla a
  `CATEGORIAS_POR_CARPETA` y al tipo `Categoria`.
- Un componente que nadie importa se borra; el test lo detecta.
- Las páginas (`client/src/pages/`) son la única capa que lee la URL, lanza
  consultas y compone `Header`, `main#contenido` y `Footer`.
- Los imports son directos por alias: `import { Banda } from "@/components/layout/Banda"`.
  No hay barrels (`index.ts`) y el detector de uso del catálogo depende de esa
  forma de importar.

### 1.2 Objetivo: Atomic Design

Decisión de octubre de 2026: migrar a la metodología Atomic Design de Brad
Frost. Es un punto de la deuda técnica (P3), **en curso** según
`docs/plans/2026-10-13-001-refactor-atomic-design-plan.md`: F0 (campo `nivel`
en el catálogo), F1 (átomos) y F2 (moléculas) hechas. Cada entrada del catálogo declara su
nivel y el test exige que coincida con su carpeta. **Lo nuevo va ya a la
carpeta de su nivel**; `ui/` (shadcn) y `sections/` (legado) no se mueven.

Reglas de cada nivel:

**Átomos (`atoms/`):** la unidad más pequeña. Sin sub-componentes propios, sin
llamadas a API ni queries, sin estado local complejo. Props estrictamente
tipadas, siempre `className` opcional. Migrados: `PatronPanal`, `FotoHero`,
`Hashtag`, `RetratoHex`, `IlustracionPilar`, `Proximamente`, `AvisoMiembros` y
`AvisoPestanaNueva`; las primitivas de `ui/` cuentan como átomos.

**Moléculas (`molecules/`):** dos o más átomos con un propósito único. Estado
local simple (abierto/cerrado, hover). Sin API. Migradas las 17 del catálogo,
entre ellas `PilarCard`, `PerfilCard`, `TarjetaArticulo` (antes `BlogCard`),
`EpisodioFila`, `MetaArticulo`, `CifraAnimada`, `VerMas` y `BotonVolverArriba`
(antes `ScrollToTop`).

**Organismos (`organisms/`):** sección completa y autónoma. Puede tener su
propia query y estado complejo. Candidatos: `Header`, `Footer`,
`ContenidoReciente`, `FormSuscripcion`, `MuroAliados`, `RutaTimeline`,
`SeccionPilar`, `SeccionEtapa`.

**Plantillas (`templates/`):** layout sin datos reales; recibe children o
slots. Candidatos: `Banda`, `HeroInstitucional`, `CabeceraRuta`.

**Páginas (`pages/`):** ya existen con ese papel.

Checklist para decidir nivel: ¿pieza mínima sin sub-componentes? → atom ·
¿combina atoms con un fin? → molecule · ¿sección autónoma con estado o datos?
→ organism · ¿layout sin datos? → template · ¿datos de URL o queries? → page.
Si dudas entre dos niveles, elige el más simple.

---

## 2. Estructura Interna de Componentes React

### 2.1 Declaración

```
✅ export function NombreComponente(props: PropsNombreComponente)   ← 42 archivos hoy
🟡 export default function Pagina()                                  ← las 13 páginas y 9
                                                                        componentes heredados
❌ const NombreComponente = (props) =>
```

Lo nuevo va con `export function` nombrada. Las páginas conservan `export
default` porque `App.tsx` las importa así; unificarlo está en la deuda (P4).

### 2.2 Anatomía

Todo componente sigue este orden:

```
1. Imports        (React → librerías externas → internos por alias → tipos)
2. Tipos          (interfaces nombradas, antes del componente)
3. JSDoc          (qué es, cuándo usarlo, qué no hace)
4. El componente  (hooks → derivaciones → handlers → guards → JSX)
5. Helpers locales (funciones y sub-componentes privados del archivo)
```

Las cadenas de clases que se repiten entre archivos no se declaran al final del
componente: van a `client/src/lib/clases.ts` (§3.2).

### 2.3 Props

```tsx
// Callbacks: prefijo "on" (del DOM) o "al" (propias). Hoy conviven onClick y alEnviar.
onClick: () => void;
alSeleccionar: (id: string) => void;

// Booleanos: hoy sin prefijo (animado, overlineNormal). Lo nuevo: "es", "esta", "tiene".
animado?: boolean; // existente
estaAbierto?: boolean; // nuevo

// Variantes: siempre union type, nunca string libre
tono?: "blanco" | "suave" | "noche";
variante?: "completo" | "compacto";

// Contenido: ReactNode para slots
children: React.ReactNode;
visual?: React.ReactNode;

// Siempre opcional
className?: string;

// Extender el elemento HTML cuando el componente ES ese elemento (ui/button.tsx)
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}
```

### 2.4 JSDoc

Mínimo: descripción con «cuándo usarlo». 43 de los 50 componentes propios la
tienen. `@example` no se usa hoy; el ejemplo vive en la demo del catálogo
(`codigo()` de `demos-*.tsx`), que es ejecutable.

### 2.5 Resumen ejecutivo

```
JSX
  ✅ Handlers nombrados (alEnviar, mostrarErrores), nunca anónimos con lógica
  ✅ Derivaciones nombradas (destacado, resto), nunca lógica inline
  ✅ Texto en español directamente o desde content/; sin i18n
  ✅ cn() para clases condicionales (lib/utils.ts)
  ✅ Siempre manejar: carga, error, vacío, datos (blog.tsx es la referencia)
  ✅ data-testid en lo interactivo y significativo
  ✅ Prerender: sin opacity 0 inicial, sin window en el primer render (useEnCliente)
```

---

## 3. Paleta de Colores y Sistema de Estilos

### 3.1 Tokens: siempre los semánticos, nunca hex directos

Tokens HSL en `client/src/index.css` (`:root`), expuestos por
`tailwind.config.ts`. **Solo modo claro**: el sitio no tiene modo oscuro ni
selector de tema (decisión de octubre de 2026). No usar la variante `dark:`;
un test lo impide (`sin-tema-oscuro.test.ts`).

| Token                                     | Clase                               | Uso                                                                        |
| ----------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------- |
| `--primary` pizarra `#233543`             | `bg-primary`, `text-primary`        | Títulos, botones de contorno, bandas institucionales                       |
| `--secondary` miel `#F9CC62`              | `<Button variant="secondary">`      | Únete (el único botón lleno de la cabecera), acentos, marca de ruta activa |
| `--brand-noche` `#112738` (azul del logo) | `bg-noche`, `text-noche-foreground` | Hero, banda CTA final, franja inferior del pie                             |
| `--miel-texto` `#8A6414`                  | `text-miel-texto`                   | Overlines y etiquetas sobre fondo claro                                    |
| `--fondo-suave` `#F7F8FA`                 | `bg-fondo-suave`                    | Bandas alternas                                                            |
| `--accent` `#FEF5E1`                      | `bg-accent`                         | Tarjetas destacadas                                                        |
| `--muted-foreground` `#576875`            | `text-muted-foreground`             | Texto secundario                                                           |
| `--background` / `--foreground`           | `bg-background`, `text-foreground`  | Fondo de página y texto principal                                          |
| `--border`, `--card`, `--input`, `--ring` | `border-border`, `bg-card`, …       | Bordes, tarjetas, inputs, anillo de foco                                   |
| `--destructive`                           | `text-destructive`                  | Errores de formulario                                                      |

Reglas:

- **Nunca** texto miel sobre blanco (1.5:1). Por eso existe `--miel-texto`.
- Todo par nuevo de texto y fondo se añade a `PARES` en
  `client/src/lib/contraste.ts`; `tokens.test.ts` exige AA (4.5:1) contra los
  valores reales de `index.css`.
- Sobre fondos sólidos (noche, pizarra) el texto es blanco fijo (`text-white`).
- Hex directos: prohibidos en componentes; `sin-hex-directo.test.ts` lo
  impide (el último, en el botón de volver arriba, se retiró en la deuda 4.1).
- Las clases de color crudas de Tailwind (`bg-gray-900`, `text-blue-500`) no
  se usan. `--chart-*` y `--sidebar-*` existen por shadcn y no tienen uso.

### 3.2 Clases compartidas: definir una sola vez

No hay objeto `UI` en `lib/styles.ts`. El equivalente del repo es
`client/src/lib/clases.ts`: constantes con las cadenas que se repetían página a
página, y `clases.test.ts` falla si alguien vuelve a escribirlas en línea.

```
H2_BANDA               título de banda (h2): text-3xl font-bold md:text-4xl
BOTON_MIEL_NOCHE       Button secondary sobre banda noche, min-h-11
BOTON_CONTORNO_NOCHE   Button outline blanco sobre banda noche
HEXAGONO_PUNTA         clip-path del isotipo
NUMERO_CONTORNO        número decorativo en contorno miel (01, 02…)
REJILLA_PILARES_PANAL  rejilla de los 4 pilares en panal escalonado
```

Las variantes de los botones viven en `ui/button.tsx` (cva): `default`,
`secondary`, `outline`, `ghost`, `destructive`; tamaños `default`, `sm`, `lg`,
`icon`. Se ven con sus demos en `/componentes` (Fundamentos).

### 3.3 Tipografía

Montserrat 400–800, servida desde el propio dominio
(`client/public/fuentes/montserrat-v31/`, fuente variable con licencia OFL;
`@font-face` y respaldo con sus medidas en `client/src/index.css`). Para
cambiar de versión, carpeta nueva (`montserrat-v32/`): se cachea un año como
inmutable.

| Nivel    | Tamaño   | Clases                                                               |
| -------- | -------- | -------------------------------------------------------------------- |
| H1       | 48–64 px | `text-5xl lg:text-6xl font-bold`                                     |
| H2       | 32–40 px | `H2_BANDA` (`text-3xl md:text-4xl font-bold`)                        |
| H3       | 24 px    | `text-2xl font-semibold`                                             |
| Cuerpo   | 18 px    | `text-lg` (el público tiene sesgo de edad alto)                      |
| Overline | 13 px    | `text-[13px] font-semibold uppercase tracking-wider text-miel-texto` |

### 3.4 Componentes y espaciado

- Botones: primario `variant="secondary"` (miel, texto pizarra); secundario
  `variant="outline"`; sobre `bg-noche`, contorno blanco. Objetivo táctil de
  44 px mínimo (`min-h-11`).
- Tarjetas: `rounded-2xl`, borde sutil y `hover-elevate`. Sin glassmorphism.
- Bandas: `Banda` (`py-16 md:py-24`, contenedor `max-w-7xl mx-auto px-4
md:px-8`), ritmo blanco → `bg-fondo-suave` → `bg-noche`.
- Iconos: Lucide, de línea, en pizarra, siempre con `aria-hidden` y junto a su
  texto. Pilares: Users (Comunidad), BookOpen (Conocimiento), Cpu
  (Tecnología), BarChart3 (Datos).
- Secciones sin construir: `<Proximamente />`, nunca un enlace a ningún sitio.
- Contenido reciente de la home: portada de revista (artículo protagonista,
  dos más en lista numerada con `NUMERO_CONTORNO` y el último episodio en
  `FranjaPodcast`). Sin fechas a la vista.

---

## 4. Marca

- **Logotipo:** `client/src/assets/aspal-logo-fondo-claro.webp` sobre fondos
  claros. Para `bg-noche`, la versión de fondo oscuro; hoy ninguna página la
  usa y su original vive en `docs/marca/` (ver su README para exportarla).
  Nunca el de fondo claro sobre fondo oscuro.
- **Isotipo** (panal de 4 hexágonos): `Aspal-Icono_*.webp`. Es la silueta de
  perfil cuando falta la foto.
- **Motivo gráfico:** el hexágono del isotipo. `PatronPanal`
  (`components/atoms/PatronPanal.tsx`), panal estático en miel sobre noche, en
  la columna visual del hero de la home; insignias hexagonales en el paso a
  paso del Mapa de Ruta y en las iniciales de «Voces de la red».
- **Ilustraciones:** familia plana en miel y noche con manchas azul claro
  (`client/src/assets/recurso-*.webp` y sus versiones ligeras de 480 px en
  `assets/ilustraciones/`). Una por pilar y la del webinar en Eventos. No
  mezclar con fotos dentro de la misma banda.
- **Fotos:** reales, de eventos y personas de la red. Ranuras preparadas en
  `content/institucional/inicio.ts` (`FOTO_HERO`, `TESTIMONIOS`); mientras
  estén vacías, la home no muestra huecos. En el hero la foto va con `FotoHero`
  estilo «panal»: repartida en celdas del isotipo, con una celda miel rayada.
  Su encuadre está ajustado a mano para la foto actual (`ENCUADRE_PANAL`): una
  foto nueva exige reencuadrar para que ninguna cara caiga en la separación
  entre celdas. Nunca una foto rectangular sin tratar.
- **Fotografía:** rostros reales de directivos latinoamericanos en eventos;
  retratos del equipo con el mismo fondo y la misma luz. Sin fotos de stock ni
  mockups de dashboard (esos viven solo en `/plataforma`).
- **Nombre visible:** `NOMBRE_MARCA` de `client/src/lib/marca.ts`. No se
  escribe a mano.

---

## 5. Navegación

- Fuente única: `client/src/lib/navegacion.ts`. Cabecera, panel móvil, pie y
  404 leen de ahí; ningún componente declara enlaces propios.
- Cinco rubros (Acerca de · Recursos · Eventos · Membresía · Comunidad) y el
  botón Únete, el único botón lleno de la cabecera. Recursos es un mega-menú
  de cuatro grupos (Aprende · Certifícate · Participa · Conecta).
- Un destino sin página no lleva `href` y se muestra «Próximamente». Al crear
  su página, se le pone `href` en el mismo PR (el test de enlaces muertos lo
  exige). Dentro de cada lista, los vivos van arriba.
- Externos: ↗, pestaña nueva, texto `sr-only` «(se abre en otra pestaña)» y
  evento `salida_plataforma`.
- Menú completo desde `xl` (1280 px): a 1024 no cabían los cinco rubros; por
  debajo, panel móvil con un acordeón por rubro y Únete fijo abajo.
- Teclado en el mega-menú: flechas, Inicio y Fin (`lib/teclado.ts`); Radix da
  Enter/Espacio para abrir y Escape para cerrar.
- Pie: solo destinos vivos por columna; si un rubro no tiene ninguno, una sola
  marca «Próximamente». Sin animaciones de entrada.

### Contenido institucional

- El copy de Nosotros, ¿Qué hacemos? y Nuestro equipo vive en
  `client/src/content/institucional/` y es literal del documento «Concepto
  NOSOTROS». Cambiar un texto = editar ese módulo; las páginas no llevan copy.
- `contenido.test.ts` rechaza textos vacíos, marcadores de relleno y enlaces a
  rutas que no existen.
- Datos pendientes (año de fundación D7, fotos, LinkedIn, Consejo, Dossier)
  van como `PENDIENTE` en el módulo, nunca inventados.
- Anclas: las secciones enlazables llevan `id` y `scroll-mt-32`;
  `ScrollRestoration` lleva al ancla cuando la URL trae `#`.

---

## 6. Movimiento

- Todo framer-motion respeta `MotionConfig reducedMotion="user"` (App.tsx). El
  CSS de Tailwind tiene su propia media query en `index.css`; hacen falta las
  dos.
- **En páginas prerenderizadas se anima solo el desplazamiento (`y`), nunca
  la opacidad del contenido:** el HTML mostraría texto invisible a buscadores
  y a quien no ejecuta JavaScript. `prerender.mjs` aborta el build si detecta
  `opacity:0`.
- Sin sliders automáticos ni animaciones infinitas en páginas institucionales.
- **Entradas de la home** (una vez, solo transform, keyframes en
  `tailwind.config.ts`): el panal del hero se ensambla al cargar (`FotoHero`),
  las cifras cuentan hasta su valor (`CifraAnimada`) y el Mapa de Ruta traza
  su línea y activa las insignias en secuencia (`IndiceEtapas`). Las dos
  últimas esperan a entrar en pantalla con `useAnimarAlVer`, que en el
  prerender y con «reducir movimiento» devuelve `estatico`: el HTML ya es el
  estado final.
- **Micro-interacciones:** solo la flecha que avanza al pasar el ratón o
  enfocar (botón del hero, «Cómo se traduce» de los pilares). Las tarjetas no
  se elevan ni animan su ilustración.
- **Pilares en la home:** panal escalonado. La ilustración sale de una
  insignia hexagonal que rompe el borde de la tarjeta, número del pilar en
  contorno miel y, desde `lg`, las tarjetas pares bajan medio paso. Al entrar
  en pantalla, cada ilustración se asoma desde su insignia, en cascada
  (entrada única, no en hover).
- **Nosotros** usa el mismo lenguaje: panal del isotipo que se arma en el hero
  (`PatronPanal animado`, una vez por página) y estático en la banda final,
  cifras que cuentan junto a «Quiénes somos», Misión y Visión en grande sobre
  noche con «2030» como marca de agua, «Lo que defendemos» como manifiesto
  numerado junto a la ilustración del megáfono, pilares en panal escalonado
  (`REJILLA_PILARES_PANAL`) y la Ruta 2026–2030 como camino que se traza.
- **El hashtag a tamaño de titular va con `<Hashtag />`**: es una sola palabra
  de 25 letras y sin puntos de corte desborda en móvil.

---

## 7. Responsive Design (Mobile-First)

**TODA pantalla, layout o componente nuevo se construye mobile-first, sin excepción.**
El viewport base (sin prefijo) es móvil (< 640px); se escala hacia arriba con
`sm:`/`md:`/`lg:`/`xl:` según necesidad. Nunca se construye pensando en desktop
primero y se achica después. El repo cumple: no hay prefijos `max-*`.

### 7.1 Patrones por tipo de elemento

- **Navegación principal.** Menú completo desde `xl`; por debajo, panel móvil
  como diálogo modal (`role="dialog"`, `aria-modal`, foco al abrir, cierre con
  Escape o enlace). Referencia: `components/layout/Header.tsx`.
- **Rejillas de tarjetas.** `grid gap-6 md:grid-cols-2 lg:grid-cols-3`
  (`pages/blog.tsx`) o `REJILLA_PILARES_PANAL`. Nunca scroll horizontal de
  tarjetas.
- **Columna visual del hero.** Solo desde `lg` (`HeroInstitucional` con
  `visual`); en móvil no se pinta.
- **Formularios.** Una columna en móvil, dos desde `sm:` (`FormSuscripcion`
  variante completa).
- **Barras de acción.** `flex-col gap-3 sm:flex-row`; envolver con `flex-wrap`
  antes que forzar scroll horizontal.
- **Objetivo táctil mínimo.** Interactivos de al menos 44 px de alto
  (`min-h-11`, 60 usos). El botón de shadcn tiene 36 px por defecto: añadir
  `min-h-11` (o `BOTON_MIEL_NOCHE`) en controles del sitio.
- **Tablas densas y modales de datos.** No existen hoy. Si aparecen: tarjetas
  apiladas en `< lg` y tabla en `lg+`; modal full-screen en `< md` y centrado
  con `max-w-*` en `md+`.

### 7.2 Verificación

No hay pruebas automatizadas de layout visual. Toda vista nueva o modificada se
verifica manualmente en el navegador en al menos dos anchos: uno móvil
(~375 px) y uno de escritorio (~1280 px), confirmando que no aparece scroll
horizontal a nivel de página y que navegación y rejillas siguen los patrones de
este apartado. Las animaciones de entrada pueden dejar una captura instantánea
en blanco: esperar o hacer scroll antes de concluir que hay un fallo.

---

_ASPAL — design.md v2.0 — octubre de 2026_
_Leer completo antes de crear o modificar cualquier componente o estilo._
