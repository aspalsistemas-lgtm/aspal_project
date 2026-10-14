# ASPAL Plataforma — Convenciones y Reglas

> Complementa el CLAUDE.md raíz. Se aplica a todo archivo bajo `apps/plataforma/`.
> Decisiones de fondo: `docs/plans/2026-10-01-001-feat-plataforma-etapa-0-plan.md`
> (D1–D15). Datos: `docs/database-design.md`. Contratos: `docs/api/plataforma.md`.
> Última actualización: octubre de 2026 (Etapa 1, corte 1)

---

## 1. Qué es y cómo corre

La plataforma SaaS: API, y más adelante paneles y páginas públicas por
asociación. **Se desarrolla en local con Docker** y se moverá a la nube (AWS u
otro servidor) más adelante (decisión del 2026-10-14).

```
Servidor:   Fastify 5 (D3) · validación de entrada y salida con Zod 4
Datos:      PostgreSQL 17 · Drizzle ORM sobre pg (D4) · migraciones con Drizzle Kit
Tests:      Vitest: unitarios (sin red ni base) e integración (PostgreSQL real)
Contenedor: Dockerfile multietapa (node:22-alpine) · compose.yaml en la raíz
```

```
src/
├── servidor.ts        ← punto de entrada: configuración, pool, listen (solo wiring)
├── app.ts             ← construirApp(dependencias): sin arrancar, para inject en tests
├── configuracion.ts   ← variables de entorno validadas con Zod al arrancar
├── zod-fastify.ts     ← puente Zod ↔ Fastify, sobre único de error, 404
├── base-de-datos.ts   ← crearPool, comprobarBaseDeDatos
├── migrar.ts          ← aplicarMigraciones (también como programa)
├── esquema.ts         ← esquema de Drizzle (vacío hasta el corte 2)
└── <modulo>/rutas.ts  ← un módulo por carpeta (salud/ es el primero)
migraciones/           ← SQL versionado de Drizzle Kit; nunca se edita uno aplicado
```

## 2. Comandos (desde la raíz)

```bash
npm run db:levantar          # PostgreSQL 17 en Docker (puerto 5433)
npm run db:migrar            # aplica migraciones (DATABASE_URL)
npm run dev:plataforma       # tsx watch; necesita DATABASE_URL
npm run test:plataforma      # unitarios
npm run test:integracion     # contra la base aspal_prueba (DATABASE_URL_PRUEBA)
npm run check:plataforma     # tsc
npm run plataforma:levantar  # base + plataforma en contenedor (puerto 5010)
```

URLs locales: `DATABASE_URL=postgres://aspal:aspal_local@localhost:5433/aspal` y
`DATABASE_URL_PRUEBA=postgres://aspal:aspal_local@localhost:5433/aspal_prueba`.
Son credenciales solo locales. Puertos 5433 y 5010 porque el 5432 y el 5000-5001
los usa otro proyecto de la máquina.

**Avast en esta máquina:** su escudo web intercepta HTTPS, y dentro de Docker
`npm ci` falla al verificar el certificado. La imagen se construye en la CI.
En local, hace falta resolverlo antes de `plataforma:levantar`.

## 3. Reglas

- **Contrato primero:** un endpoint nuevo se documenta en `docs/api/plataforma.md`
  antes de implementarse. Sobre único: `{ success, data, meta? }` o
  `{ success: false, error: { codigo, mensaje, campo? } }`.
- **Esquemas Zod en cada ruta**, de entrada y de salida. La salida pasa por el
  esquema: lo que no declara no sale, y si no cumple es un 500 sin detalles.
- **Nada de detalles internos en respuestas ni logs:** ni la URL de la base ni
  el error de PostgreSQL ni datos personales.
- **Dependencias externas por parámetro** (`construirApp({ comprobarBaseDeDatos })`):
  los tests unitarios no tocan red ni base.
- **Esquema y migraciones:** ningún cambio sin la propuesta de la sección 6 de
  `docs/database-design.md`. Se generan con `npm run db:generar`; nunca `push`.
  Toda tabla de una asociación lleva `asociacion_id` y RLS (D8).
- **Tests de integración:** fallan si falta `DATABASE_URL_PRUEBA`; nunca se
  saltan en silencio. Usan la base `aspal_prueba`, jamás la de desarrollo.
- Los imports relativos llevan extensión `.js`.
- Nomenclatura: la del CLAUDE.md raíz (español sin tildes en identificadores).
  `/health` es la única ruta en inglés: es el nombre que esperan los
  orquestadores.

---

_ASPAL Plataforma CLAUDE.md v0.1 — octubre de 2026_
