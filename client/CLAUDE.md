# ASPAL Client — Convenciones y Reglas

> Complementa el CLAUDE.md raíz. Se aplica a todo archivo bajo `client/`.
> Última actualización: octubre de 2026

> **Para reglas de diseño detalladas (organización de componentes, tokens,
> clases compartidas, movimiento, responsive):** leer `design.md`.

---

## 1. Estructura del Paquete

```
client/
├── index.html         ← plantilla: lang="es", viewport sin maximum-scale, preload de la fuente
├── public/            ← favicon, og-aspal.png, fuentes/montserrat-v31/, fotos/, PDF del Mapa
└── src/
    ├── main.tsx           ← hydrateRoot si el HTML viene prerenderizado; createRoot en spa.html
    ├── entry-server.tsx   ← entrada del build SSR que usa scripts/prerender.mjs
    ├── App.tsx            ← providers, PAGINAS por ruta (Record<RutaEstatica, …>)
    ├── index.css          ← tokens HSL, @font-face, reduced-motion, utilidades elevate
    ├── pages/             ← una página por ruta; kebab-case español
    ├── components/
    │   ├── atoms/         ← átomos de Atomic Design (migración en curso, design.md §1.2)
    │   ├── molecules/     ← moléculas: tarjetas, índices, cifras, VerMas, BotonVolverArriba…
    │   ├── organisms/     ← organismos: CabeceraSitio, PieSitio, FormSuscripcion, secciones…
    │   ├── layout/        ← pendientes de la F4: Banda, HeroInstitucional,
    │   │                     ErrorBoundary, ScrollRestoration, CabeceraRuta, SaltarAlContenido
    │   ├── ui/            ← primitivas shadcn/ui en uso (8). Fuera de lint y Prettier
    │   └── sections/      ← legado de /plataforma; no reutilizar
    ├── content/institucional/ ← textos de Nosotros, Qué hacemos, Equipo, Mapa, inicio (datos)
    ├── catalogo/          ← registro.ts, tipos, demos y vistas de /componentes
    ├── hooks/             ← use-lista-paginada, use-en-cliente, use-animar-al-ver, use-mobile, use-toast
    ├── lib/               ← rutas, seo, navegacion, marca, analitica, clases, date, utils (cn)…
    └── assets/            ← solo lo que se usa; ≤ 250 KB por imagen (check-assets)
```

Cada módulo de `lib/` tiene su `.test.ts` al lado. Los tests corren en
entorno `node`: no hay tests de componentes.

---

## 2. Componentes

Catálogo obligatorio en `catalogo/registro.ts`. La migración a Atomic Design
está en curso (`design.md` §1.2): átomos, moléculas y organismos ya viven en `atoms/`,
`molecules/` y `organisms/`; el resto sigue en `layout/` hasta la F4. Lo nuevo va
ya a la carpeta de su nivel y declara su `nivel` en el catálogo.

Nomenclatura: PascalCase español descriptivo.

```
✅  HeroInstitucional · PilarCard · FormSuscripcion · FranjaPodcast
❌  Card (genérico) · PilarCard2 (sufijo numérico) · pilarCard (camelCase)
```

Los nueve nombres en inglés que quedan (`ErrorBoundary`, `ScrollRestoration` y
`sections/*`) son
heredados; no crear más.

Antes de crear uno:

1. Buscar en `registro.ts` (`usarCuando`, `evitarPara`).
2. Si falta una variante, añadirla al existente.
3. Si hace falta uno nuevo: carpeta de su categoría, entrada en `registro.ts`,
   demo en `demos-*.tsx` si su `vista` es `"demo"`. `registro.test.ts` falla si
   no.
4. Lo que deja de usarse se borra.

---

## 3. Páginas y Rutas

Añadir una página exige tres cosas, y TypeScript las comprueba:

1. La ruta en `lib/rutas.ts` (`RUTAS_ESTATICAS` o `RUTAS_DINAMICAS`).
2. Su componente en `PAGINAS` o `PAGINAS_DINAMICAS` de `App.tsx`.
3. Su título, descripción e `indexable` en `SEO` de `lib/seo.ts`.

Toda página compone `CabeceraSitio`, `<main id="contenido" tabIndex={-1}>` con
un solo `<h1>` (lo pone `HeroInstitucional`) y `PieSitio`. `prerender.mjs` aborta
el build si falta el `<h1>` o el `main#contenido`.

Las rutas estáticas se prerenderizan: lo que solo existe en el navegador
(estados de carga, consultas, `window`) se pinta tras `useEnCliente()` o en
un efecto, para que el primer render coincida con el HTML. Las rutas dinámicas
(`/blog/:slug`) montan sobre `spa.html` vacío.

---

## 4. Responsive Design

> Sistema completo de patrones en `design.md` §7. Esta sección es referencia rápida.

TODA pantalla, layout y componente nuevo se construye mobile-first, sin excepción.

- El viewport base (sin prefijo) es móvil (< 640px)
- Escalar hacia arriba con `sm:` / `md:` / `lg:` / `xl:` según necesidad
- Nunca construir para desktop y adaptar hacia abajo; no usar `max-*:`
- Menú: panel móvil como diálogo por debajo de `xl`, completo desde `xl`
  (`CabeceraSitio.tsx`)
- Rejillas: `md:grid-cols-2 lg:grid-cols-3` (`pages/blog.tsx`)
- Interactivos con `min-h-11` (44 px)
- Verificar toda vista nueva en el navegador a ~375 px y ~1280 px antes de
  darla por terminada

---

## 5. Custom Hooks

`use` + sustantivo en español que describe el recurso o la capacidad.

```typescript
// Correcto
useListaPaginada("/api/posts", 10); // lista con «Ver más» sobre useInfiniteQuery
useEnCliente(); // false en prerender e hidratación, true después
useAnimarAlVer(); // "estatico" | "esperando" | "animando" según visibilidad

// Prohibido
useGetPosts(); // verbo después de use
usarLista(); // sin prefijo use
```

`useIsMobile` (`use-mobile.tsx`) y `useToast` (`use-toast.ts`) vienen de
shadcn y se conservan con su nombre.

Archivo: `hooks/use-<nombre-en-kebab>.ts`.

---

## 6. Estado

- **Remoto:** TanStack Query 5. La `queryKey` es el path del endpoint
  (`["/api/podcasts", { per_page: 1 }]`). El `queryClient` global tiene
  `retry: false` y `staleTime: Infinity`; las consultas de WordPress añaden
  `retry: 2` con backoff para que un fallo puntual no quede cacheado como «no
  hay contenido».
- **Local:** `useState`/`useRef`/`useReducer` dentro del componente. No hay
  stores globales ni Zustand. `lib/historial.ts` guarda el scroll en
  `sessionStorage`.
- **Mutaciones:** solo `POST /api/suscripcion`, vía `lib/suscripcion.ts`, que
  nunca lanza y traduce la respuesta a `exito | invalido | error`. El
  formulario bloquea envíos dobles con un ref.

---

## 7. Texto, fechas y analítica

- Todo texto visible en español, con tildes, escrito en el componente o en
  `content/institucional/`. **No hay i18n** y no está previsto.
- Nombre de la marca, contacto y redes: `lib/marca.ts`. No se escriben a mano.
- Fechas: `formatPublishedDate` de `lib/date.ts` (date-fns, locale `es`,
  tolerante a fechas inválidas). No formatear a mano ni usar `toLocaleDateString`.
- Analítica: `registrarEvento(evento, datos)` de `lib/analitica.ts` sobre
  `window.dataLayer`; los eventos son un union type (`click_unete`,
  `signup_suscriptor`, `salida_plataforma`…). En `/componentes` no se registra
  nada.

---

## 8. Paleta de Colores

> Sistema completo de tokens y clases compartidas en `design.md` §3.
> Esta sección es referencia rápida.

```css
/* client/src/index.css — HSL sin hsl(), lo envuelve tailwind.config.ts */
--primary: 206 31% 20%; /* pizarra #233543: títulos, contorno, bandas    */
--secondary: 42 93% 68%; /* miel #F9CC62: Únete, acentos, ruta activa      */
--brand-noche: 206 53% 14%; /* noche #112738: hero, CTA final, pie            */
--miel-texto: 41 75% 31%; /* overlines sobre claro (el miel no da AA)      */
--fondo-suave: 220 23% 97%; /* bandas alternas                               */
--accent: 42 93% 94%; /* tarjetas destacadas                           */
--muted-foreground: 206 15% 40%; /* texto secundario                              */
```

Reglas:

- `secondary` (miel) solo para el botón Únete, el elemento de mayor foco y la
  marca de ruta activa.
- Nunca hex directos en componentes; siempre clases de token (`bg-noche`,
  `text-miel-texto`). Un par texto/fondo nuevo se añade a `PARES` de
  `lib/contraste.ts` y el test exige AA.
- Clases repetidas: `lib/clases.ts`.

---

## 9. Accesibilidad

- `lang="es"`, un `<h1>` por página, `<main id="contenido">` y el enlace
  «Saltar al contenido».
- Enlaces con nombre accesible propio (`aria-label`) cuando el contenido es
  una tarjeta; externos con «(se abre en otra pestaña)».
- Iconos decorativos con `aria-hidden`; imágenes decorativas con `alt=""`.
- Foco visible siempre (`focus-visible:ring-2`); sobre noche, anillo miel.
- Formularios: `aria-invalid`, `aria-describedby`, foco al primer error, aviso
  de éxito con foco.
- `prefers-reduced-motion` respetado por CSS y por `MotionConfig`.
- Contraste AA verificado por test; menú móvil como diálogo modal.

---

_ASPAL Client CLAUDE.md v1.0 — octubre de 2026_
