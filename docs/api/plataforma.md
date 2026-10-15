# Catálogo de Endpoints — Plataforma ASPAL

> Fuente de verdad de los contratos HTTP de `apps/plataforma`. Todo endpoint
> nuevo se documenta aquí ANTES de implementarse. Un endpoint que no está aquí
> no existe. La API del sitio tiene su propio catálogo: `endpoints.md`.

Servidor: Fastify 5 con Zod (D3). Validación de entrada y salida con los
esquemas de cada ruta: lo que no cumple el esquema no entra ni sale.

## Convenciones

- Rutas en español, kebab-case, sustantivos en plural, sin verbos ni trailing
  slash; params de ruta en camelCase.
- Respuesta de éxito: `{ success: true, data, meta? }`.
- Respuesta de error: `{ success: false, error: { codigo, mensaje, campo? } }`,
  con códigos en SCREAMING_SNAKE sin tildes (`VALIDACION_FALLIDA`,
  `RECURSO_NO_ENCONTRADO`, `NO_DISPONIBLE`, `ERROR_INTERNO`…).
- Listas con `pagina` · `limite` · `ordenPor` · `direccion` · `buscar`.
- Ninguna respuesta ni log contiene datos personales ni detalles internos
  (cadenas de conexión, trazas, SQL).

## Formato de cada entrada

```
### METODO /ruta
Auth:      público | sesión | rol
Módulo:    carpeta de apps/plataforma/src
Respuestas: status y cuerpo
Notas:     invariantes y por qué
```

---

### GET /health

```
Auth:      público
Módulo:    src/salud
Respuestas:
  200 { "success": true,
        "data": { "estado": "ok", "baseDeDatos": "ok" } }
  503 { "success": false,
        "error": { "codigo": "NO_DISPONIBLE",
                   "mensaje": "La base de datos no responde" } }
```

Notas:

- Lo consultan el `healthcheck` del contenedor y, cuando exista, el balanceador
  de la nube. Por eso va sin prefijo `/api` y sin autenticación.
- Comprueba PostgreSQL con `SELECT 1` y un tiempo máximo de 2 s: una base que
  tarda más se da por caída. Sin base, la plataforma no sirve nada útil, así
  que el 503 hace que el orquestador deje de mandarle tráfico.
- No devuelve versiones, nombres de host ni el error de la base.
- Etapa 1, corte 1 (plan de la Etapa 0, sección 8).

---

## Resolución de la asociación por subdominio

Cada petición se atiende en nombre de la asociación de su `Host`:
`<subdominio>.<DOMINIO_BASE>` (`aspal.localhost` en local,
`aspal.asociacionesprofesionales.org` en la nube). Reglas:

- El `Host` debe terminar en `.` + `DOMINIO_BASE`: `aspal.evillocalhost` no
  resuelve. Se ignoran el puerto, el punto final y las mayúsculas.
- Un solo nivel: `a.b.localhost` no resuelve. Tampoco un host sin subdominio
  ni un subdominio reservado.
- `X-Forwarded-Host` se ignora.
- El contexto de aislamiento (RLS) sale **solo** de esta resolución hecha en el
  servidor, nunca de un parámetro de la petición.

### GET /asociaciones/actual

```
Auth:      público
Módulo:    src/asociaciones
Respuestas:
  200 { "success": true,
        "data": { "nombre": "ASPAL", "subdominio": "aspal",
                  "zonaHoraria": "America/Merida" } }
  404 { "success": false,
        "error": { "codigo": "RECURSO_NO_ENCONTRADO",
                   "mensaje": "No hay una asociación en esta dirección" } }
Cabeceras: Cache-Control: private, no-store
```

Notas:

- Demuestra la resolución por subdominio (Etapa 1, corte 2). La página pública
  con marca llega cuando se decida D13.
- No expone el `id` interno de la asociación.
- `no-store`: la respuesta depende del `Host`; una caché compartida no debe
  servir la de una asociación a otra.
