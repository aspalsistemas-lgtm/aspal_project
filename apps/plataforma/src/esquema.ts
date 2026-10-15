/**
 * Esquema de Drizzle de la plataforma. Cada cambio llega con su propuesta formal
 * (`docs/database-design.md`, sección 6) y su migración generada con
 * `npm run db:generar`.
 *
 * Las tablas de **una asociación** llevan `asociacion_id uuid NOT NULL` y su
 * migración termina con `SELECT app.aplicar_aislamiento('public.<tabla>')`; un
 * guardián de los tests lo exige.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  FORMATO_SUBDOMINIO,
  SUBDOMINIOS_RESERVADOS,
} from "./asociaciones/subdominios.js";

/**
 * Cliente de la plataforma (ámbito plataforma: sin `asociacion_id`). Plan del
 * corte 2, §4.3. La aplicación solo puede leer su propia fila (RLS) y resolver
 * un subdominio con `app.resolver_asociacion`; altas y cambios, en el corte 4.
 */
export const asociacion = pgTable(
  "asociacion",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nombre: text("nombre").notNull(),
    subdominio: text("subdominio").notNull().unique("asociacion_subdominio_unico"),
    // Nombre IANA (America/Merida). PostgreSQL no puede validarlo en un CHECK
    // inmutable: lo valida la aplicación con Intl.
    zonaHoraria: text("zona_horaria").notNull(),
    // Si la asociación admite que cualquiera se registre como miembro (plan del
    // corte 3, CA-23). Cerrado por defecto; solo lo cambia el operador (corte 4).
    registroAbierto: boolean("registro_abierto").notNull().default(false),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp("actualizado_en", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (tabla) => [
    check(
      "asociacion_nombre_longitud",
      sql`char_length(btrim(${tabla.nombre})) BETWEEN 2 AND 120`,
    ),
    check(
      "asociacion_subdominio_formato",
      sql`${tabla.subdominio} ~ ${sql.raw(`'${FORMATO_SUBDOMINIO}'`)}`,
    ),
    check(
      "asociacion_subdominio_no_reservado",
      sql`${tabla.subdominio} NOT IN (${sql.raw(
        SUBDOMINIOS_RESERVADOS.map((reservado) => `'${reservado}'`).join(", "),
      )})`,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Acceso (Etapa 1, corte 3a; plan 2026-10-16-001, §5.3). Todas las tablas son de
// la asociación: llevan `asociacion_id`, FK compuestas `(asociacion_id, …)` y su
// migración termina con `app.aplicar_aislamiento`. No hay tablas globales.
// ---------------------------------------------------------------------------

/** `bytea` (hashes de tokens y claves HMAC): Drizzle no lo trae de serie. */
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

/** La asociación a la que pertenece la fila. RESTRICT: no se borra una asociación con datos. */
const columnaAsociacion = () =>
  uuid("asociacion_id")
    .notNull()
    .references(() => asociacion.id, { onDelete: "restrict" });

/**
 * La persona dentro de la asociación (el ser humano; no es una cuenta). El estado
 * vive solo aquí: con dos fuentes («persona» y «cuenta») había combinaciones sin
 * definir. `baja` es definitiva en este corte y anonimiza el nombre.
 */
export const persona = pgTable(
  "persona",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    asociacionId: columnaAsociacion(),
    nombre: text("nombre").notNull(),
    estado: text("estado").notNull().default("activa"),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("persona_asociacion_id_unico").on(t.asociacionId, t.id),
    check(
      "persona_nombre_longitud",
      sql`char_length(btrim(${t.nombre})) BETWEEN 2 AND 120`,
    ),
    check("persona_estado_valido", sql`${t.estado} IN ('activa', 'suspendida', 'baja')`),
  ],
);

/**
 * Una forma de entrar. **No existen cuentas sin verificar**: el correo se verifica
 * antes de crearla (`correo_verificado_en` es obligatorio), así que quien se
 * registra con el correo de otro nunca llega a fijar una contraseña. El correo es
 * único solo dentro de la asociación: el mismo correo en dos son dos cuentas.
 */
export const cuentaAcceso = pgTable(
  "cuenta_acceso",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    asociacionId: columnaAsociacion(),
    personaId: uuid("persona_id").notNull(),
    correo: text("correo").notNull(),
    correoVerificadoEn: timestamp("correo_verificado_en", {
      withTimezone: true,
    }).notNull(),
    // Sin contraseña si se entró por Google o por enlace al correo.
    hashContrasena: text("hash_contrasena"),
    // Sube al cambiar la contraseña o suspender: el login lo revalida (CA-3, CA-6).
    credencialVersion: integer("credencial_version").notNull().default(1),
    terminosVersion: text("terminos_version"),
    terminosAceptadosEn: timestamp("terminos_aceptados_en", { withTimezone: true }),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp("actualizado_en", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("cuenta_acceso_asociacion_id_unico").on(t.asociacionId, t.id),
    unique("cuenta_acceso_persona_unica").on(t.asociacionId, t.personaId),
    unique("cuenta_acceso_correo_unico").on(t.asociacionId, t.correo),
    foreignKey({
      name: "cuenta_acceso_persona_fk",
      columns: [t.asociacionId, t.personaId],
      foreignColumns: [persona.asociacionId, persona.id],
    }).onDelete("restrict"),
    // ASCII imprimible sin espacios, 3–254, minúsculas, una sola @ con algo a cada
    // lado. No depende del lower() de la colación (los correos no ASCII entran en
    // punycode).
    check(
      "cuenta_acceso_correo_formato",
      sql`${t.correo} ~ '^[!-~]{3,254}$'
        AND ${t.correo} = lower(${t.correo})
        AND char_length(${t.correo}) - char_length(replace(${t.correo}, '@', '')) = 1
        AND strpos(${t.correo}, '@') > 1
        AND strpos(${t.correo}, '@') < char_length(${t.correo})`,
    ),
    check("cuenta_acceso_version_positiva", sql`${t.credencialVersion} >= 1`),
  ],
);

/** Roles de la persona. Se revocan (`revocado_en`), no se borran: queda el rastro. */
export const asignacionRol = pgTable(
  "asignacion_rol",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    asociacionId: columnaAsociacion(),
    personaId: uuid("persona_id").notNull(),
    rol: text("rol").notNull(),
    asignadoEn: timestamp("asignado_en", { withTimezone: true }).notNull().defaultNow(),
    // Nulo = lo asignó la plataforma (semilla u operador), no una persona.
    asignadoPor: uuid("asignado_por"),
    revocadoEn: timestamp("revocado_en", { withTimezone: true }),
    revocadoPor: uuid("revocado_por"),
  },
  (t) => [
    foreignKey({
      name: "asignacion_rol_persona_fk",
      columns: [t.asociacionId, t.personaId],
      foreignColumns: [persona.asociacionId, persona.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "asignacion_rol_asignado_por_fk",
      columns: [t.asociacionId, t.asignadoPor],
      foreignColumns: [persona.asociacionId, persona.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "asignacion_rol_revocado_por_fk",
      columns: [t.asociacionId, t.revocadoPor],
      foreignColumns: [persona.asociacionId, persona.id],
    }).onDelete("restrict"),
    check(
      "asignacion_rol_rol_valido",
      sql`${t.rol} IN ('administrador', 'gestor', 'representante', 'miembro')`,
    ),
    // Un rol vigente no puede repetirse; tras revocarlo se puede volver a asignar.
    uniqueIndex("asignacion_rol_vigente")
      .on(t.asociacionId, t.personaId, t.rol)
      .where(sql`${t.revocadoEn} IS NULL`),
  ],
);

/**
 * Sesión de servidor, de la asociación (RLS): buscada desde otra asociación **no
 * existe**. Solo se guarda el SHA-256 del token. `nivel_autenticacion` deja
 * preparado el doble factor; `reautenticada_en` sirve a las operaciones sensibles.
 */
export const sesion = pgTable(
  "sesion",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    asociacionId: columnaAsociacion(),
    cuentaId: uuid("cuenta_id").notNull(),
    tokenHash: bytea("token_hash").notNull(),
    nivelAutenticacion: smallint("nivel_autenticacion").notNull().default(1),
    reautenticadaEn: timestamp("reautenticada_en", { withTimezone: true }),
    creadaEn: timestamp("creada_en", { withTimezone: true }).notNull().defaultNow(),
    ultimoUsoEn: timestamp("ultimo_uso_en", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiraEn: timestamp("expira_en", { withTimezone: true }).notNull(),
    revocadaEn: timestamp("revocada_en", { withTimezone: true }),
  },
  (t) => [
    unique("sesion_token_unico").on(t.asociacionId, t.tokenHash),
    foreignKey({
      name: "sesion_cuenta_fk",
      columns: [t.asociacionId, t.cuentaId],
      foreignColumns: [cuentaAcceso.asociacionId, cuentaAcceso.id],
    }).onDelete("restrict"),
    check("sesion_nivel_valido", sql`${t.nivelAutenticacion} IN (1, 2)`),
    index("sesion_expira_idx").on(t.asociacionId, t.expiraEn),
    index("sesion_cuenta_idx").on(t.asociacionId, t.cuentaId),
  ],
);

/**
 * Contadores de los límites de uso (intentos de entrada, correos enviados…). La
 * clave es un HMAC del correo enviado y del origen, nunca de una cuenta. Sin `id`:
 * ninguna tabla la referencia.
 */
export const limiteUso = pgTable(
  "limite_uso",
  {
    asociacionId: columnaAsociacion(),
    clave: bytea("clave").notNull(),
    contador: integer("contador").notNull().default(0),
    ventanaDesde: timestamp("ventana_desde", { withTimezone: true })
      .notNull()
      .defaultNow(),
    bloqueadoHasta: timestamp("bloqueado_hasta", { withTimezone: true }),
  },
  (t) => [
    primaryKey({ columns: [t.asociacionId, t.clave] }),
    check("limite_uso_contador_no_negativo", sql`${t.contador} >= 0`),
    index("limite_uso_ventana_idx").on(t.asociacionId, t.ventanaDesde),
  ],
);
