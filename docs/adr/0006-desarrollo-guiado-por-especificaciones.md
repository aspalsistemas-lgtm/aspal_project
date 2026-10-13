# ADR-0006: Desarrollo guiado por especificaciones (SDD) con código limpio

- **Fecha:** 2026-10-13
- **Estado:** Aceptada
- **Alcance:** todo el repositorio (sitio y plataforma); toda funcionalidad o módulo nuevo

## Contexto

El repositorio ya trabaja con disciplina de «documentar primero, cambiar poco y
probar»: los endpoints se documentan antes de implementarse, las migraciones
exigen una propuesta, las decisiones costosas llevan ADR y la deuda técnica se
cierra punto a punto. Pero esa disciplina está repartida en varios documentos y
no hay una regla única que diga cómo se construye una funcionalidad nueva, qué
significa «terminada» ni cómo se derivan los tests de lo que se pidió. La
plataforma SaaS (permisos, pagos, aislamiento entre asociaciones) multiplica el
costo de un requisito mal entendido o sin cobertura.

## Decisión

Toda funcionalidad o módulo nuevo se construye con **desarrollo guiado por
especificaciones (SDD)**, acompañado de las prácticas de código limpio de esta
decisión. El orden es siempre: especificación → contrato → tests → código →
verificación. La especificación manda: si la implementación se desvía, primero
se corrige la especificación y se vuelve a acordar.

### 1. Especificación (antes del código)

Responde qué se construye y cómo se sabrá que está bien. Contiene:

- **Problema y alcance:** qué cambia, para quién, y qué queda **fuera**.
- **Criterios de aceptación numerados** (`CA-1`, `CA-2`…), cada uno
  verificable por un test o por una comprobación manual descrita. Formato
  recomendado: _Dado_ un estado, _cuando_ ocurre algo, _entonces_ se observa un
  resultado. Incluyen los casos de error y los límites, no solo el camino feliz.
- **Riesgos y casos sensibles:** permisos, datos personales, dinero,
  concurrencia, aislamiento entre asociaciones.

Dónde vive, sin crear carpetas nuevas:

| Qué se especifica                           | Dónde                                                                 |
| ------------------------------------------- | --------------------------------------------------------------------- |
| Funcionalidad o módulo (esfuerzo M o L)     | Un plan en `docs/plans/` con la sección «Criterios de aceptación»     |
| Cambio pequeño (esfuerzo S)                 | Los criterios en la descripción del commit o en la propuesta aprobada |
| Endpoint HTTP                               | `docs/api/endpoints.md`, antes de implementarlo                       |
| Datos persistentes de la plataforma         | La propuesta de la sección 6 de `docs/database-design.md`             |
| Componente o vista                          | `client/src/catalogo/registro.ts` y `design.md`                       |
| Decisión arquitectónica costosa de deshacer | Una ADR en `docs/adr/`                                                |

### 2. Contrato (antes del código)

El contrato es lo que otros consumen: forma de la petición y la respuesta,
errores, tipos. Se escribe primero y es **ejecutable**:

- En el sitio, validación y tipos puros en `shared/` con su `.test.ts`, como
  `shared/suscripcion/validacion.ts`. No se añade una librería de esquemas al
  sitio.
- En la plataforma, esquemas Zod en `packages/contratos` (D1 y D3 del plan de la
  Etapa 0), que validan la entrada y generan los tipos compartidos con los
  paneles.
- Los endpoints nuevos responden el sobre único
  (`{ success, data | error }`; `ErrorDeAplicacion` en `shared/errores.ts`,
  punto 2.1 de la deuda técnica). Los existentes conservan su contrato
  congelado.
- Los cambios de contrato son compatibles hacia atrás o se documentan como
  ruptura.

### 3. Tests derivados de la especificación

- Cada criterio de aceptación tiene al menos un test, y el nombre del test cita
  el criterio (`CA-2: …`). Un criterio sin test debe declarar su comprobación
  manual.
- **Test primero** (el test falla antes de escribir el código) es obligatorio
  para: lógica de negocio, permisos y autorización, dinero, aislamiento entre
  asociaciones y toda corrección de un bug (prueba de regresión). Para el resto
  es la práctica recomendada.
- Pirámide: muchas pruebas unitarias, algunas de integración (Express en un
  puerto libre) y pocas de extremo a extremo. Datos ficticios, sin red ni
  `.env`.
- La interfaz visual se verifica además en el navegador (~375 px y ~1280 px).

### 4. Código limpio al implementar

- **Cambio mínimo y coherente:** lo necesario para cumplir los criterios. Nada
  de abstracciones anticipadas (YAGNI, KISS) ni refactors fuera de alcance.
- **Nombres que revelan intención** y funciones pequeñas con una sola
  responsabilidad; sin duplicación ni código muerto.
- **Comentarios que explican el porqué**, no lo que el código ya dice.
- **Errores explícitos:** se lanzan o se devuelven con su tipo; nunca se
  degradan en silencio (ADR-0002).
- **Dependencias hacia dentro:** la lógica de negocio no depende de Express, de
  la red ni de un proveedor; esos detalles se montan en los bordes (`server/`,
  `api/`, clientes de WordPress y Mailchimp). Cada módulo es dueño de sus datos
  y expone operaciones a los demás.
- **Seguridad por defecto:** denegar por defecto, validar toda entrada en el
  servidor y no registrar datos personales ni secretos.

### 5. Definición de terminado

Una funcionalidad está terminada cuando se cumple todo lo siguiente:

1. La especificación está actualizada y refleja lo que se construyó.
2. Cada criterio de aceptación tiene su test (o su comprobación manual
   registrada) y pasa.
3. `npm run check`, `npm run lint`, `npm run format:check`, `npm test` y, si
   toca el cliente o el servidor, `npm run build` pasan, y se informa la salida
   real.
4. Se revisó el diff completo (`git diff --check`): sin cambios ajenos, secretos
   ni artefactos.
5. Si hubo una decisión costosa de deshacer, tiene su ADR; si se dejó deuda,
   está en `docs/sprints/deuda-tecnica.md`.
6. La especificación y el código llegan en el mismo commit o la misma rama.

### Proporcionalidad

La regla se aplica en proporción al tamaño. Un cambio trivial (corregir un
texto, un typo, un formato) no necesita especificación formal: basta con
describir el cambio. Cualquier funcionalidad con comportamiento nuevo, contrato,
datos, permisos o dinero sigue el flujo completo.

## Alternativas consideradas

| Alternativa                                             | Por qué se descartó                                                                                 |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Seguir como hasta ahora (disciplina implícita)          | La regla queda repartida, el «terminado» depende de quien trabaje y los criterios no llegan a tests |
| TDD estricto en todo el código                          | Costo desproporcionado para texto y maquetación; se exige solo donde el riesgo lo justifica         |
| Carpeta `docs/specs/` y herramienta de especificaciones | Cambia la estructura de carpetas y añade tooling; los lugares actuales cubren cada tipo de spec     |
| Librería de esquemas (Zod) también en el sitio          | Es una dependencia nueva que el sitio no necesita; la validación manual en `shared/` ya es testeada |

## Consecuencias

**Positivas**

- Un criterio de aceptación equivale a un test: es más difícil entregar algo que
  nadie pidió o dejar sin cubrir un caso de error.
- Un «terminado» único y verificable, igual para el sitio y la plataforma.
- Las áreas de riesgo (autorización, pagos, aislamiento) quedan cubiertas antes
  de implementarse.

**Negativas o riesgos**

- Más trabajo previo por funcionalidad. Se mitiga con la proporcionalidad: lo
  pequeño no exige documento.
- Las especificaciones pueden quedarse obsoletas si se cambian solo en el
  código; por eso viajan en el mismo commit y la especificación manda.

**Qué cambia para el equipo**

- Antes de implementar algo no trivial, se presenta la especificación con sus
  criterios de aceptación y se espera la aprobación.
- Los tests citan sus criterios (`CA-n`).
- La checklist de la sección 5 sustituye al «terminado» informal.
- Las reglas operativas resumidas viven en `AGENTS.md`, sección «Desarrollo
  guiado por especificaciones», y se referencian desde `CLAUDE.md`.

## Referencias

- `AGENTS.md`, «Desarrollo guiado por especificaciones» y «Documentación y
  terminado»
- `docs/api/endpoints.md` y `docs/database-design.md`
- `docs/plans/2026-10-01-001-feat-plataforma-etapa-0-plan.md`, decisiones D1 y D3
- ADR-0002 (los fallos se ven) y `docs/sprints/deuda-tecnica.md`, punto 2.1
