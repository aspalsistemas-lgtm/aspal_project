# ADR-0004: Suscripción al boletín vía Mailchimp, sin guardar datos

- **Fecha:** 2026-09-29 (registrada retroactivamente el 2026-10-01)
- **Estado:** Aceptada
- **Alcance:** `shared/suscripcion/`, `client/src/components/forms/FormSuscripcion.tsx`

## Contexto

La Etapa 1 pedía captar suscriptores desde /unete, la home, el pie y /eventos.
Era la primera escritura del sitio, que hasta entonces era de solo lectura y
sin estado. Guardar datos personales exigiría base de datos, política de
retención y aviso de privacidad propios, y abriría la puerta a que el sitio
dejara de ser sin estado. Es la decisión D8 del plan de la Etapa 1.

## Decisión

`POST /api/suscripcion` valida la entrada con la misma función que usa el
formulario, descarta en silencio a los bots (campo trampa) y hace un alta de
**solo creación** en Mailchimp con `status: "pending"`, que dispara la doble
confirmación. El sitio no guarda nada ni registra datos personales en los
logs. A un miembro existente, pendiente, dado de baja u olvidado se le
responde igual y no se le modifica: nadie puede reescribir los datos de otro
ni averiguar quién está en la lista. El origen se guarda como etiqueta; si el
etiquetado falla, el alta ya ocurrió y no se devuelve error. Sin claves
configuradas el endpoint responde 503, nunca un éxito falso.

## Alternativas consideradas

| Alternativa                                      | Por qué se descartó                                                                   |
| ------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Guardar suscriptores en una base de datos propia | Rompe «sin estado»; obliga a custodiar datos personales y a sincronizar con Mailchimp |
| `PUT` (upsert) en Mailchimp                      | Permitiría sobrescribir los datos de un miembro existente desde un formulario público |
| Formulario embebido de Mailchimp                 | Sin control de accesibilidad, validación ni estilo; carga JavaScript de terceros      |
| Suscribir con `status: "subscribed"`             | Sin doble confirmación: altas no consentidas y peor reputación de envío               |

## Consecuencias

**Positivas**

- El sitio sigue sin estado y sin datos personales.
- La validación es una sola (`shared/suscripcion/validacion.ts`) en navegador
  y servidor.
- Idempotente frente a reenvíos y miembros existentes.

**Negativas o riesgos**

- Quien se dio de baja no puede volver a suscribirse desde el sitio (Mailchimp
  lo impide); se le indica escribir al correo de contacto.
- El endpoint no limita por IP: hace falta una regla de rate limit en el
  Vercel Firewall antes del lanzamiento.
- Depende de que la audiencia tenga los campos `PAIS`, `ORG` y `CARGO` y la
  doble confirmación activada.

**Qué cambia para el equipo**

- Las claves van en Vercel; en local, sin ellas, el 503 es el comportamiento
  esperado.
- Ningún log puede contener el correo; `rutas.test.ts` lo comprueba.

## Referencias

- Commit `b7c4295` «PR E1: suscripción con Mailchimp, /unete y /eventos»
- Commit `91bf02e` «Mailchimp: crear miembros con POST sin sobrescribir a los existentes»
- `docs/plans/2026-09-29-004-feat-etapa-1-pr-e1-suscripcion-plan.md`
- `docs/architecture.md`, sección «Suscripción al boletín»
