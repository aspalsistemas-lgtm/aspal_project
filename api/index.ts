/**
 * Función serverless de Vercel. Solo hace el wiring de Express: la lógica de
 * WordPress y los endpoints viven en `shared/wordpress/`, compartidos con el
 * servidor de desarrollo.
 */
import express from "express";
import { registerApiRoutes } from "../shared/wordpress/routes.js";
import { registrarRutasSuscripcion } from "../shared/suscripcion/rutas.js";
import { manejadorDeErrores } from "../shared/errores.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

registerApiRoutes(app);
registrarRutasSuscripcion(app);

app.use(manejadorDeErrores);

export default app;
