# ADR-0001: Una sola fuente de lógica en `shared/`

- **Fecha:** 2026-08-05 (registrada retroactivamente el 2026-10-01)
- **Estado:** Aceptada
- **Alcance:** `shared/`, `server/`, `api/`

## Contexto

El sitio tiene dos entradas de servidor: `server/index.ts` (Express de
desarrollo y self-hosted) y `api/index.ts` (función serverless de Vercel, que
es producción). Al principio `api/index.ts` era una copia literal de la lógica
del servidor, con la instrucción de sincronizar cada cambio a mano. No se
sostuvo: `/api/health` llegó a existir solo en Vercel, y la transformación de
posts divergió entre los dos.

## Decisión

Toda la lógica de WordPress vive en `shared/wordpress/` (tipos, normalización,
cliente y registro de rutas) y toda la de suscripción en `shared/suscripcion/`.
`server/index.ts` y `api/index.ts` solo hacen wiring: importan las funciones de
registro y las montan. Un endpoint nuevo se añade en `shared/` y aparece en los
dos entornos a la vez.

## Alternativas consideradas

| Alternativa                                     | Por qué se descartó                                                       |
| ----------------------------------------------- | ------------------------------------------------------------------------- |
| Mantener dos copias sincronizadas a mano        | Ya había fallado: divergieron sin que nadie lo notara                     |
| Un solo entrypoint (solo Vercel o solo Express) | Hace falta Express con Vite en desarrollo y la función serverless en prod |
| Empaquetar `server/` como dependencia de `api/` | Vercel transpila archivo a archivo; más ceremonia que un import directo   |

## Consecuencias

**Positivas**

- Un cambio, dos despliegues. Imposible que producción se quede atrás.
- Los tests de `shared/` cubren lo que corre en producción.

**Negativas o riesgos**

- Los imports relativos de `shared/` y `api/` deben llevar extensión `.js`
  (Node ESM en Vercel). Sin ella, `ERR_MODULE_NOT_FOUND` en producción.
- Los módulos de `shared/` que leen `process.env` (`client.ts`,
  `mailchimp.ts`) no pueden llegar al bundle del navegador; el cliente solo
  importa los puros.

**Qué cambia para el equipo**

- Nunca añadir un endpoint o una transformación en `server/` o `api/`.
- `rutas.test.ts` («montaje») comprueba que ambos consumidores registran la
  suscripción; replicar ese test para cualquier módulo nuevo de `shared/`.
- `npm run check` incluye `api/` en el typecheck.

## Referencias

- Commit `365a70e` «Unificar la lógica de WordPress en shared/»
- `docs/architecture.md`, sección «Backend»
- `CLAUDE.md`, «La regla que más importa»
