# Guía de la plataforma ASPAL

Documentación para entender **qué es y qué hará la plataforma SaaS de ASPAL**
sin necesidad de leer código. Está pensada para directivos, clientes y
cualquier persona del equipo técnico que quiera recordar el alcance general.

No cubre el sitio público actual ni explica cómo está construido el sistema
por dentro; para eso están `docs/architecture.md` y `docs/database-design.md`.

## Cómo leerla

Se lee en orden; cada documento se apoya en el anterior.

| #   | Documento                                          | Responde a                                         |
| --- | -------------------------------------------------- | -------------------------------------------------- |
| 1   | [Qué es la plataforma](01-que-es-la-plataforma.md) | Qué es, para quién, qué ofrece y en qué punto está |
| 2   | [Glosario](02-glosario.md)                         | Qué significa cada término que usamos              |
| 3   | [Roles y permisos](03-roles-y-permisos.md)         | Quién usa la plataforma y qué puede hacer cada uno |
| 4   | [Casos de uso por rol](04-casos-de-uso/README.md)  | Qué logra cada persona con la plataforma, y cuándo |

## Qué documento manda

Esta guía **resume y explica**; no decide. Si algo aquí contradice a estas
fuentes, la fuente tiene razón y la guía se corrige:

- Reglas de negocio y etapas: `docs/plan-plataforma-por-etapas.md`.
- Decisiones técnicas y avance por cortes:
  `docs/plans/2026-10-01-001-feat-plataforma-etapa-0-plan.md`.
- Datos: `docs/database-design.md`.

## Leyenda de estado

Los casos de uso y las funciones llevan uno de estos estados:

| Estado             | Significa                                                 |
| ------------------ | --------------------------------------------------------- |
| ✅ Disponible      | Funciona y se puede usar                                  |
| 🔨 En construcción | Se está construyendo en el corte actual                   |
| 📅 Planificado     | Tiene etapa asignada en el plan, pero aún no se construye |
| ❔ Por definir     | Depende de una decisión de negocio pendiente              |

## Mantenimiento semanal

**Esta guía se revisa y actualiza una vez por semana.** La revisión consiste en:

1. Comparar la guía con el avance real: cortes cerrados en el plan de la Etapa
   0 (§8), decisiones nuevas en el plan de negocio (§2 y §14) y planes nuevos
   en `docs/plans/`.
2. Actualizar los estados de los casos de uso y la sección «Dónde estamos» de
   [Qué es la plataforma](01-que-es-la-plataforma.md).
3. Añadir al glosario los términos nuevos y a la matriz los roles o permisos
   que hayan cambiado.
4. Cambiar la fecha de **Última revisión** de cada documento revisado, aunque
   no haya cambiado nada, para que se sepa que está al día.
5. Hacer commit con `docs(guia): revision semanal del AAAA-MM-DD`.

Si una semana no hubo avance, basta con actualizar las fechas.

**Última revisión:** 15 de octubre de 2026
