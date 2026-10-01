# Deuda técnica

Registro vivo. Sale del diagnóstico de alineación con la plantilla de
documentos de contexto (1 de octubre de 2026). Cada punto se trabaja en la
fase 3, **uno a uno y con aprobación previa**: propuesta (archivos,
antes/después, riesgo, verificación) → «adelante» → cambio mínimo con pruebas
→ salida real de las validaciones → mover a «Resueltos» con su commit.

Prioridades: **P1** seguridad y datos · **P2** contratos API · **P3**
convenciones · **P4** estilo. Esfuerzo: S (< 1 h), M (media jornada), L (una o
más jornadas).

Lo que NO está aquí porque se decidió no cambiarlo: el contrato actual de los
endpoints existentes (se congela; lo nuevo usa el sobre único), el inglés de
`shared/wordpress/` y `TransformedPost` (excepción documentada), la ausencia de
i18n (el sitio es solo en español).

---

## Pendientes

### P1 · Seguridad y datos

| #   | Punto                                                                                                                                                                                                                                                                                                                                               | Archivos                         | Esfuerzo |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | -------- |
| 1.1 | **Rate limit de `POST /api/suscripcion`: documentado, pendiente de aplicar en Vercel.** La regla (10 peticiones por IP cada 10 minutos, 429 al superarlo) está especificada en `docs/api/endpoints.md` desde el 2026-10-01. Falta crearla en Settings → Firewall del proyecto de producción; no es código del repo. Al aplicarla, mover aquí abajo. | Vercel Firewall (fuera del repo) | S        |

### P2 · Contratos API

| #   | Punto                                                                                                                                                                                                                                                     | Archivos                                                              | Esfuerzo |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | -------- |
| 2.1 | **Infraestructura del sobre único para endpoints nuevos.** Crear `ErrorDeAplicacion(codigo, status, mensaje, campo?)` y el middleware que la formatea a `{ success: false, error }`, montado en los dos consumidores. Sin tocar los endpoints existentes. | `shared/errores.ts` (nuevo), `server/index.ts`, `api/index.ts`, tests | M        |
| 2.2 | **Mensajes de error en inglés en `/api/posts*`** («Failed to fetch posts», «Post not found»). El contrato se congela en forma, pero el texto es visible y está en inglés en un sitio en español. Decidir si el texto cuenta como «forma».                 | `shared/wordpress/routes.ts`, `client.test.ts`                        | S        |

### P3 · Convenciones

| #   | Punto                                                                                                                                                                                                                                                                | Archivos                                                                                                | Esfuerzo |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------- |
| 3.1 | **Migrar `client/src/components/` a Atomic Design** (`atoms/ molecules/ organisms/ templates/`). Decisión de octubre de 2026. Plan sugerido en `design.md` §1.2. Exige adaptar `CATEGORIAS_POR_CARPETA`, el tipo `Categoria`, `registro.ts` y los imports por alias. | 51 componentes, `catalogo/registro.ts`, `registro.test.ts`, `catalogo/tipos.ts`, todos los importadores | L        |
| 3.2 | **Los tests no se typechequean.** `tsconfig.json` excluye `**/*.test.ts`. Incluirlos (o un `tsconfig.test.json`) y corregir lo que salga.                                                                                                                            | `tsconfig.json`, 28 archivos `.test.ts`                                                                 | M        |
| 3.3 | **Trece componentes con nombre en inglés heredado**: `Header`, `Footer`, `BlogCard`, `ErrorBoundary`, `ScrollToTop`, `ScrollRestoration` y los siete de `sections/`. Renombrar al migrar a Atomic (3.1), no antes, para mover cada archivo una sola vez.             | 13 componentes, `registro.ts`, importadores                                                             | M        |
| 3.4 | **`any` en el middleware de log** (`server/index.ts:28`, `capturedJsonResponse: Record<string, any>`). Los dos del manejador de errores desaparecieron con 1.2. Tipar como `unknown`.                                                                                | `server/index.ts`, `api/index.ts`                                                                       | S        |
| 3.5 | **`react-hooks/set-state-in-effect` en 5 sitios** (`Header.tsx:350,551`, `LogoCarousel.tsx:17`, `use-mobile.tsx:14`, `not-found.tsx:93`). Degradado a aviso en `eslint.config.js`; la forma canónica de varios es `useSyncExternalStore` (como `useEnCliente`).      | 4 archivos, `eslint.config.js`                                                                          | M        |
| 3.6 | **Hooks con nombre en inglés** (`useIsMobile`, `useToast`). Vienen de shadcn; renombrar solo si se tocan por otro motivo.                                                                                                                                            | `hooks/use-mobile.tsx`, `hooks/use-toast.ts`, importadores                                              | S        |
| 3.7 | **Props booleanas sin prefijo** (`animado`, `overlineNormal`, `oscuro`…). La convención nueva pide `es`/`esta`/`tiene`. Aplicar solo al tocar cada componente; no hacer una pasada masiva.                                                                           | `components/**`                                                                                         | S c/u    |

### P4 · Estilo

| #   | Punto                                                                                                                                                                                              | Archivos                                               | Esfuerzo |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | -------- |
| 4.1 | **Un hex directo**: `bg-[#243240]` en `ScrollToTop.tsx:53`. Sustituir por `bg-primary` (pizarra `#233543`) o un token nuevo si el matiz importa.                                                   | `components/layout/ScrollToTop.tsx`                    | S        |
| 4.2 | **`export default function` en 22 archivos** (13 páginas + 9 componentes). Unificar a `export function` nombrada y ajustar `App.tsx` e importadores.                                               | `pages/*.tsx`, 9 componentes, `App.tsx`, `registro.ts` | M        |
| 4.3 | **Cobertura: medir y decidir umbral.** Hoy no hay umbral ni dependencia de cobertura (`@vitest/coverage-v8` no está instalada). Instalarla (autorización de dependencia), medir y fijar el número. | `package.json`, `vitest.config.ts`                     | S        |
| 4.4 | **`@types/node` 20.16.11 con runtime Node 22.** Actualizar a 22.x (autorización de dependencia).                                                                                                   | `package.json`, `package-lock.json`                    | S        |
| 4.5 | **CSS muerto en `index.css`**: bloque `.dark` completo y tokens `--chart-*`, `--sidebar-*` que nada usa. Retirar y comprobar que `tokens.test.ts` y el catálogo siguen pasando.                    | `client/src/index.css`, `tailwind.config.ts`           | S        |
| 4.6 | **Comentarios en inglés heredados** en `server/index.ts`, `server/vite.ts`, `index.css` (sistema elevate) y `ui/button.tsx`. Traducir al tocar cada archivo.                                       | 4 archivos                                             | S        |
| 4.7 | **`.env.example` no lista `NODE_ENV`**, que README y `server/index.ts` sí usan. Añadirlo con comentario (autorización explícita: toca `.env.example`).                                             | `.env.example`                                         | S        |

---

## Resueltos

| #   | Punto                                                                                                                                                                 | Commit    | Fecha      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------- |
| 1.2 | Manejador de errores único en `shared/errores.ts`, montado por `server/index.ts` y `api/index.ts`; registra en consola en vez de relanzar; sin `any`. 6 tests nuevos. | `96e3ab6` | 2026-10-01 |
| 1.3 | Test `shared/extensiones.test.ts`: todo import relativo de `shared/` y `api/` (sin tests) lleva `.js` y apunta a un `.ts` existente.                                  | `4814183` | 2026-10-01 |
