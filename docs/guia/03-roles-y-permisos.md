# Roles y permisos

**Última revisión:** 15 de octubre de 2026

Quién usa la plataforma y qué puede hacer cada uno. Fuente que manda:
`docs/plan-plataforma-por-etapas.md`, §5.

## Las cuatro preguntas antes de permitir algo

Para dejar a alguien hacer algo, la plataforma comprueba siempre cuatro cosas,
y basta con que una falle para negarlo:

1. **¿La asociación contrató el módulo?** Sin el módulo de eventos, nadie en
   esa asociación puede crear eventos.
2. **¿La persona tiene el permiso?** Que la asociación tenga contenido no
   significa que todos puedan publicar.
3. **¿Tiene derecho a ese recurso concreto?** Un miembro puede ver un recurso
   reservado a miembros; un visitante, no.
4. **¿El estado lo permite?** Un contenido archivado no se edita; una
   asociación en solo lectura no crea nada nuevo; una persona suspendida no
   entra.

Otras reglas que valen para todos:

- **Todo está negado salvo que se permita expresamente.**
- **Las cuentas y los roles son de una asociación.** El mismo correo en dos
  asociaciones son dos cuentas distintas; ser administrador en una no da nada
  en otra.
- **Los operadores de ASPAL no son miembros de ninguna asociación.** Tienen su
  propio acceso, al dashboard maestro.
- **Una persona puede tener varios roles** a la vez en su asociación (por
  ejemplo, editora y miembro).
- **Nadie se da permisos a sí mismo** ni concede más de lo que puede delegar.
- **Las acciones sensibles quedan registradas**: cambios de roles,
  publicaciones, exportaciones, accesos de soporte y operaciones de dinero.

## Los actores

Los roles se agrupan en siete actores. Cada uno tiene su documento de casos de
uso en [04-casos-de-uso](04-casos-de-uso/README.md).

| Actor                       | Roles que agrupa                                      | Ámbito               |
| --------------------------- | ----------------------------------------------------- | -------------------- |
| Operador ASPAL              | Operador comercial, soporte autorizado                | El dashboard maestro |
| Dirección de la asociación  | Propietario, administrador                            | Su asociación        |
| Equipo editorial            | Autor, editor, publicador                             | Su asociación        |
| Gestores especializados     | Gestor de miembros, financiero, de eventos; moderador | Su asociación        |
| Representante institucional | Representante institucional                           | Su institución       |
| Miembro                     | Miembro o lector                                      | Sus propios datos    |
| Visitante                   | (sin cuenta)                                          | Lo público           |

## Los roles, uno por uno

| Rol                         | Qué puede hacer                                                       | Qué no puede hacer                                                   | Llega en    |
| --------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------- |
| Operador comercial          | Dar de alta asociaciones y sus administradores; administrar contratos | Ver el contenido privado de una asociación por ser operador          | Etapa 1     |
| Soporte autorizado          | Diagnosticar un caso con el alcance y el plazo concedidos             | Acceder de forma permanente; todo su acceso es temporal y registrado | Etapa 1     |
| Propietario                 | Administrar responsables y la configuración de su asociación          | Cambiar por su cuenta el precio o la comisión de su contrato         | Etapa 1     |
| Administrador               | Gestionar personas, roles y módulos según lo que se le delegue        | Conceder permisos superiores a los suyos o cambiar los propios       | Etapa 1     |
| Autor                       | Crear y editar sus borradores y enviarlos a revisión                  | Publicar o modificar contenido ajeno                                 | Etapa 2     |
| Editor                      | Revisar y editar contenido de su asociación                           | Publicar, salvo que tenga además ese permiso                         | Etapa 2     |
| Publicador                  | Publicar, programar, retirar y restaurar versiones                    | Administrar finanzas o usuarios                                      | Etapa 2     |
| Gestor de miembros          | Tramitar altas, vigencias y representaciones                          | Hacer devoluciones o exportaciones sensibles sin permiso propio      | Etapa 3     |
| Gestor financiero           | Consultar cobros, conciliar y devolver si se le autoriza              | Editar contenido                                                     | Etapa 4     |
| Moderador                   | Atender reportes y moderar los espacios asignados                     | Ver información financiera                                           | Etapa 5     |
| Gestor de eventos           | Administrar eventos y participantes asignados                         | (El personal de acceso puede limitarse a validar entradas)           | Etapa 6     |
| Representante institucional | Administrar los representantes de su institución, si se le permite    | Actuar fuera de su institución y asociación                          | Etapa 3     |
| Miembro o lector            | Consultar recursos y gestionar sus propios datos                      | Ver lo que su membresía no incluye o datos de otros miembros         | Etapa 1 y 3 |

## Matriz resumida

✔ puede · ◐ con permiso adicional o limitado · — no puede

Columnas: **Op** operador · **Sop** soporte · **Prop** propietario · **Adm**
administrador · **Aut** autor · **Ed** editor · **Pub** publicador · **GM**
gestor de miembros · **GF** gestor financiero · **Mod** moderador · **GE**
gestor de eventos · **Rep** representante · **Mie** miembro · **Vis**
visitante.

| Acción                                   | Op  | Sop | Prop | Adm | Aut | Ed  | Pub | GM  | GF  | Mod | GE  | Rep | Mie | Vis |
| ---------------------------------------- | :-: | :-: | :--: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| Dar de alta una asociación               |  ✔  |  —  |  —   |  —  |  —  |  —  |  —  |  —  |  —  |  —  |  —  |  —  |  —  |  —  |
| Fijar precio y comisión del contrato     |  ✔  |  —  |  —   |  —  |  —  |  —  |  —  |  —  |  —  |  —  |  —  |  —  |  —  |  —  |
| Ver datos privados de una asociación     |  —  |  ◐  |  ✔   |  ✔  |  ◐  |  ◐  |  ◐  |  ◐  |  ◐  |  ◐  |  ◐  |  ◐  |  ◐  |  —  |
| Configurar marca y módulos de su espacio |  —  |  —  |  ✔   |  ◐  |  —  |  —  |  —  |  —  |  —  |  —  |  —  |  —  |  —  |  —  |
| Invitar personas y asignar roles         |  —  |  —  |  ✔   |  ✔  |  —  |  —  |  —  |  —  |  —  |  —  |  —  |  —  |  —  |  —  |
| Suspender o dar de baja a una persona    |  —  |  —  |  ✔   |  ✔  |  —  |  —  |  —  |  —  |  —  |  —  |  —  |  —  |  —  |  —  |
| Escribir un borrador                     |  —  |  —  |  —   |  —  |  ✔  |  ✔  |  ✔  |  —  |  —  |  —  |  —  |  —  |  —  |  —  |
| Editar contenido ajeno                   |  —  |  —  |  —   |  —  |  —  |  ✔  |  ✔  |  —  |  —  |  —  |  —  |  —  |  —  |  —  |
| Publicar o retirar contenido             |  —  |  —  |  —   |  —  |  —  |  ◐  |  ✔  |  —  |  —  |  —  |  —  |  —  |  —  |  —  |
| Dar de alta o renovar una membresía      |  —  |  —  |  —   |  —  |  —  |  —  |  —  |  ✔  |  —  |  —  |  —  |  —  |  —  |  —  |
| Consultar cobros y conciliar             |  —  |  —  |  —   |  —  |  —  |  —  |  —  |  —  |  ✔  |  —  |  —  |  —  |  —  |  —  |
| Hacer una devolución                     |  —  |  —  |  —   |  —  |  —  |  —  |  —  |  —  |  ◐  |  —  |  —  |  —  |  —  |  —  |
| Moderar la comunidad                     |  —  |  —  |  —   |  —  |  —  |  —  |  —  |  —  |  —  |  ✔  |  —  |  —  |  —  |  —  |
| Crear un evento y gestionar inscritos    |  —  |  —  |  —   |  —  |  —  |  —  |  —  |  —  |  —  |  —  |  ✔  |  —  |  —  |  —  |
| Cambiar representantes de su institución |  —  |  —  |  —   |  —  |  —  |  —  |  —  |  ✔  |  —  |  —  |  —  |  ◐  |  —  |  —  |
| Gestionar sus propios datos              |  ✔  |  ✔  |  ✔   |  ✔  |  ✔  |  ✔  |  ✔  |  ✔  |  ✔  |  ✔  |  ✔  |  ✔  |  ✔  |  —  |
| Crear una cuenta de miembro              |  —  |  —  |  —   |  —  |  —  |  —  |  —  |  —  |  —  |  —  |  —  |  —  |  —  |  ◐  |
| Ver contenido público                    |  ✔  |  ✔  |  ✔   |  ✔  |  ✔  |  ✔  |  ✔  |  ✔  |  ✔  |  ✔  |  ✔  |  ✔  |  ✔  |  ✔  |

- «Ver datos privados» con ◐: solo los que su función necesita. Por ejemplo,
  el gestor financiero ve los cobros pero no los borradores, y el soporte solo
  lo que se le concedió y mientras dure el permiso.
- «Crear una cuenta de miembro» con ◐: solo si la asociación tiene activado el
  registro abierto.

Esta matriz es un resumen para orientarse. La lista exacta de permisos se
define en cada etapa, con su prueba automática.

## Cómo se empieza a construir

La primera versión no trae todos los roles; cada uno llega con su módulo. El
corte 3 de la Etapa 1 arranca con cuatro roles técnicos por asociación, que
irán creciendo:

| Rol técnico     | Se corresponde con                          | Estado                                                            |
| --------------- | ------------------------------------------- | ----------------------------------------------------------------- |
| `administrador` | Propietario y administrador                 | 🔨 Hecho en local (corte 3a); faltan pantallas                    |
| `gestor`        | Base de los gestores y del equipo editorial | 🔨 Hecho en local (corte 3a); sus permisos crecen con cada módulo |
| `representante` | Representante institucional                 | 🔨 Hecho en local (corte 3a); sus permisos llegan en la Etapa 3   |
| `miembro`       | Miembro o lector                            | 🔨 Hecho en local (corte 3a); faltan pantallas                    |

Los operadores llegan en el corte 4, con el dashboard maestro y su propio
acceso. Los roles editoriales finos (autor, editor, publicador) se concretan
en la Etapa 2, junto con el gestor de contenido.
