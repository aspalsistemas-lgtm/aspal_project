/**
 * Preparación global de los tests de integración: recrea la base de pruebas
 * desde cero, ejecuta `prepararBase` y aplica las migraciones, igual que un
 * despliegue nuevo.
 *
 * Solo toca una base cuyo nombre termine en `_prueba`: nunca la de desarrollo.
 */
import pg from "pg";
import { aplicarMigraciones } from "../migrar.js";
import { prepararBase } from "../preparar-base.js";

export function urlsDePrueba(): { admin: string; app: string } {
  const admin = process.env.DATABASE_URL_PRUEBA_ADMIN;
  const app = process.env.DATABASE_URL_PRUEBA_APP;
  if (!admin || !app) {
    throw new Error(
      "Faltan DATABASE_URL_PRUEBA_ADMIN y DATABASE_URL_PRUEBA_APP: levanta la base con npm run db:levantar",
    );
  }
  return { admin, app };
}

export default async function prepararIntegracion(): Promise<void> {
  const { admin, app } = urlsDePrueba();
  const urlAdmin = new URL(admin);
  const nombreBase = decodeURIComponent(urlAdmin.pathname.slice(1));
  if (!/^[a-z0-9_]+_prueba$/.test(nombreBase)) {
    throw new Error(
      `La base de pruebas debe llamarse *_prueba (recibida: ${nombreBase})`,
    );
  }

  const mantenimiento = new URL(admin);
  mantenimiento.pathname = "/postgres";
  const clienteMantenimiento = new pg.Client({
    connectionString: mantenimiento.toString(),
  });
  await clienteMantenimiento.connect();
  try {
    await clienteMantenimiento.query(
      `DROP DATABASE IF EXISTS ${nombreBase} WITH (FORCE)`,
    );
    await clienteMantenimiento.query(`CREATE DATABASE ${nombreBase}`);
  } finally {
    await clienteMantenimiento.end();
  }

  const cliente = new pg.Client({ connectionString: admin });
  await cliente.connect();
  try {
    await prepararBase(cliente, decodeURIComponent(new URL(app).password));
    await aplicarMigraciones(cliente);
  } finally {
    await cliente.end();
  }
}
