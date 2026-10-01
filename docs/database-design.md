# Diseño y evolución de la base de datos de ASPAL

**Ámbito:** cualquier cambio que cree, modifique, migre o elimine datos persistentes en PostgreSQL.  
**Objetivo:** preservar integridad, aislamiento entre asociaciones y capacidad de evolución de los módulos.

## 1. Antes de modificar el esquema

1. Inspecciona el esquema actual, migraciones, restricciones, índices, consultas y reglas del módulo afectado. Comprueba si la información ya existe con otro nombre o pertenece a otra entidad.
2. Define el hecho de negocio que se guardará, quién es dueño del dato, su ámbito (plataforma, asociación, institución o persona), su ciclo de vida y quién puede cambiarlo.
3. Distingue si corresponde a un atributo de una entidad existente, una nueva entidad, una referencia mediante clave foránea, una relación muchos a muchos o un evento histórico. Una tabla pivote con atributos, vigencia o estados es una entidad de relación con reglas propias.
4. Expón al responsable de la tarea la propuesta de modelo antes de escribir la migración. Pregunta solo si falta una regla de negocio que cambie las relaciones o las restricciones; no inventes esa regla.

## 2. Modelado relacional

- Modela entidades y dependencias funcionales. Aplica primera, segunda y tercera forma normal cuando corresponda: valores atómicos, sin grupos repetidos, sin dependencias parciales ni atributos que dependan de otra entidad. No crees tablas solo por formalismo; explica las excepciones.
- No guardes listas de identificadores separados por comas ni relaciones en arrays o JSON. Usa claves foráneas y tablas de relación. JSON puede contener datos flexibles de verdad, con validación y una justificación, pero no sustituye entidades consultables ni restricciones esenciales.
- Separa **cuenta de acceso, persona, asociación cliente, institución miembro, representación institucional, plan, membresía, rol y permiso**. No uses correo como clave primaria ni como prueba suficiente de identidad o autorización.
- Una persona puede tener roles simultáneos y, en una asociación, membresía individual y representación institucional. El acceso a otra asociación es independiente según la decisión de producto vigente.
- Define cardinalidades, obligatoriedad y propiedad de cada relación. Toda relación persistente debe declarar sus claves foráneas y su comportamiento al borrar o desactivar registros. Prefiere desactivación o historial cuando borrar destruya evidencia de pagos, vigencias o permisos.
- En membresías distingue el **plan ofrecido** de la **membresía contratada** y su historial de cambios; en instituciones, el número permitido de representantes puede ser finito o ilimitado. Evita que un cambio del plan altere retroactivamente contratos históricos sin una regla explícita.
- Separa hechos financieros (cargo, pago, devolución, comisión) de estados derivados. Registra referencias externas de Stripe de manera única e idempotente. Usa importes exactos y código de moneda explícito; no uses punto flotante para dinero.
- Para fechas distingue fecha civil, instante y periodo de vigencia. Guarda instantes con zona horaria y define la zona relevante para reglas de eventos y renovaciones. Evita múltiples booleanos que puedan representar estados contradictorios.

## 3. Multiinquilino y permisos

- Cada registro propio de una asociación debe tener un ámbito inequívoco. Los datos globales de ASPAL operador se mantienen conceptualmente separados de los de ASPAL como asociación cliente.
- Diseña claves únicas e índices en el ámbito correcto, por ejemplo, por asociación cuando la misma clave de negocio puede repetirse en otra. No confíes solo en un filtro de interfaz o subdominio.
- Evita referencias cruzadas entre asociaciones por error. Cuando sea necesario, usa restricciones que comprueben el mismo ámbito en ambos extremos de la relación, además de validaciones de aplicación.
- Si se adopta Row Level Security, define cómo se establece y limpia el contexto de asociación en cada transacción y cómo se prueban accesos negados. RLS complementa las verificaciones de autorización; no reemplaza las reglas de roles y permisos.
- Las operaciones de soporte ASPAL y exportación de datos requieren autorización explícita, alcance acotado y auditoría.

## 4. Restricciones, índices e historial

- Usa tipos adecuados, `NOT NULL` cuando el dato sea obligatorio, `UNIQUE`, `CHECK` y claves foráneas para reglas que PostgreSQL puede garantizar. No dejes invariantes centrales únicamente en código de aplicación.
- Índices según consultas, relaciones y volumen esperado. Evalúa el costo de escritura; no indexes todas las columnas por defecto. Revisa índices compuestos y parciales cuando respondan a consultas frecuentes por asociación y estado.
- Conserva el historial necesario para explicar altas manuales, renovaciones, cambios de representantes, contratos, comisiones, descuentos, devoluciones y permisos. Distingue el estado actual del registro de acciones que lo produjo.
- Para eventos entre módulos y efectos externos, define identificadores de evento, reintentos e idempotencia. Si se usa un patrón de salida transaccional (_outbox_), el hecho de negocio y su publicación pendiente se registran en la misma transacción.
- La desnormalización, caché o vistas materializadas requieren un caso medido, fuente de verdad identificada y mecanismo de actualización o reconstrucción.

## 5. Migraciones y despliegue

1. Todo cambio de esquema se versiona en una migración del repositorio. No se modifica producción manualmente.
2. Revisa datos existentes antes de imponer una restricción nueva. Especifica respaldo, transformación, validación y comportamiento ante registros incompatibles.
3. Para cambios incompatibles, usa una secuencia gradual: añadir estructura, adaptar lecturas y escrituras, migrar y verificar datos, y retirar lo anterior en una entrega posterior. Considera instalaciones en las que convivan temporalmente versiones distintas de la aplicación.
4. Evita migraciones que bloqueen tablas extensas sin evaluar su impacto. Describe cómo volver a una versión operativa; no prometas revertir automáticamente una transformación destructiva de datos.
5. Actualiza tipos, consultas, documentación y pruebas afectadas en el mismo cambio. Comprueba aislamiento entre asociaciones, integridad de relaciones, duplicados, límites de representantes, reintentos de pagos y migración de datos existentes según el caso.

## 6. Formato obligatorio de propuesta antes de implementar

Al añadir un tipo de dato o cambiar el esquema, presenta brevemente:

1. **Necesidad:** hecho de negocio, módulo dueño y ciclo de vida.
2. **Inspección:** tablas, columnas, migraciones y relaciones existentes que revisaste.
3. **Modelo propuesto:** tablas y columnas nuevas o reutilizadas, cardinalidades, ámbito de asociación y motivo de la decisión entre columna, tabla o pivote.
4. **Integridad:** tipos, claves, restricciones, índices, permisos e historial.
5. **Cambio:** migración, tratamiento de datos actuales, compatibilidad durante despliegue y verificación.
6. **Alternativa descartada:** al menos una, con la razón concreta.
7. **Preguntas de negocio:** únicamente las que impidan definir correctamente el esquema.

Después de la revisión, implementa la migración y el código correspondiente, verifica los casos significativos y resume los resultados. Para cambios pequeños, la propuesta puede ser breve; la inspección del esquema y el respeto de las restricciones nunca se omiten.
