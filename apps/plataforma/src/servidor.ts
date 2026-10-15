/**
 * Punto de entrada: valida la configuración, abre el pool y escucha. Solo
 * wiring; la aplicación se construye en `app.ts`.
 */
import { construirApp } from "./app.js";
import {
  comprobarBaseDeDatos,
  conAsociacion,
  crearPool,
  resolverAsociacion,
  verificarRolDeAplicacion,
} from "./base-de-datos.js";
import { crearServicioContrasenas } from "./acceso/contrasenas.js";
import { cargarConfiguracion } from "./configuracion.js";
import { crearServicioCorreo } from "./correo/servicio.js";
import { crearTransporteSmtp, transporteDescartado } from "./correo/transporte-smtp.js";
import { LIMITE_GRUESO_POR_DEFECTO } from "./http/proteccion.js";

const configuracion = cargarConfiguracion(process.env);
const pool = crearPool(configuracion.urlBaseDeDatos);

// Antes de aceptar una sola petición: con un rol que se salta RLS, el
// aislamiento entre asociaciones no existiría.
try {
  await verificarRolDeAplicacion(pool);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  await pool.end();
  process.exit(1);
}

// Sin SMTP (solo fuera de producción) el correo se descarta; la configuración exige
// SMTP_HOST en producción. Los eventos se registran sin direcciones ni contenido.
const correo = crearServicioCorreo({
  transporte: configuracion.correo
    ? crearTransporteSmtp(configuracion.correo, {
        // Nunca en claro con credenciales ni en producción; solo el entorno local con
        // http y sin usuario (Mailpit) lo evita.
        exigirTls:
          configuracion.correo?.usuario !== undefined ||
          (configuracion.produccion && configuracion.esquemaPublico === "https"),
      })
    : transporteDescartado,
  remitente: configuracion.correo?.remitente ?? "no-responder@localhost",
  registrar: (evento) => {
    if (evento !== "enviado") console.warn(`correo: ${evento}`);
  },
});

const app = construirApp(
  {
    comprobarBaseDeDatos: () => comprobarBaseDeDatos(pool),
    dominioBase: configuracion.dominioBase,
    esquemaPublico: configuracion.esquemaPublico,
    puertoPublico: configuracion.puertoPublico,
    trustProxy: configuracion.trustProxy,
    limiteGrueso: LIMITE_GRUESO_POR_DEFECTO,
    secretoClaves: configuracion.secretoClaves,
    contrasenas: crearServicioContrasenas(),
    correo,
    resolverAsociacion: (subdominio) => resolverAsociacion(pool, subdominio),
    enAsociacion: (asociacionId, fn) => conAsociacion(pool, asociacionId, fn),
  },
  { logger: true },
);

// Cierre ordenado: el orquestador manda SIGTERM antes de matar el contenedor.
for (const senal of ["SIGINT", "SIGTERM"] as const) {
  process.once(senal, async () => {
    await app.close();
    await correo.vaciar();
    await pool.end();
    process.exit(0);
  });
}

await app.listen({ port: configuracion.puerto, host: "0.0.0.0" });
