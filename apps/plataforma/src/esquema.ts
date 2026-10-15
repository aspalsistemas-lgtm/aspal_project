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
import { check, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
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
