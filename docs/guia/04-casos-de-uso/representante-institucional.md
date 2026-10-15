# Casos de uso · Representante institucional

**Última revisión:** 15 de octubre de 2026

La persona designada por una institución miembro (empresa, universidad,
dependencia) para actuar en su nombre ante la asociación. Una misma persona
puede ser a la vez representante y miembro individual.

```mermaid
flowchart LR
  re(["👤 Representante institucional"])

  subgraph PL["Plataforma ASPAL"]
    r1([Consultar la membresía de la institución])
    r2([Proponer o cambiar representantes])
    r3([Renovar la membresía institucional])
    r4([Usar los beneficios de la institución])
  end

  re --> r1
  re --> r2
  re --> r3
  re --> r4
```

| Caso                                     | Qué logra                                              | Reglas que importan                                                                         | Etapa | Estado |
| ---------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------- | ----- | ------ |
| Consultar la membresía de la institución | Saber el plan, la vigencia y los representantes        | Solo de su institución y en esa asociación                                                  | 3     | 📅     |
| Proponer o cambiar representantes        | Mantener al día quién representa a la institución      | Si su relación lo permite; el número de representantes lo fija el plan; se guarda historial | 3     | ❔     |
| Renovar la membresía institucional       | Mantener vigente la membresía                          | Las reglas de renovación están por definir                                                  | 3 y 4 | ❔     |
| Usar los beneficios de la institución    | Acceder a recursos y descuentos del plan institucional | Los beneficios dependen del plan contratado                                                 | 3     | 📅     |
