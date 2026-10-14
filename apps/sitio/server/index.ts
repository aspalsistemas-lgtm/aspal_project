import express from "express";
import { createServer } from "http";
import { registerApiRoutes } from "../shared/wordpress/routes";
import { registrarRutasSuscripcion } from "../shared/suscripcion/rutas";
import { manejadorDeErrores } from "../shared/errores";
import { serveStatic } from "./static";
import { setupVite, log } from "./vite";

const app = express();

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  registerApiRoutes(app);
  registrarRutasSuscripcion(app);
  const server = createServer(app);

  app.use(manejadorDeErrores);

  // Vite solo en desarrollo, y después de registrar las demás rutas: su ruta
  // comodín no debe tapar a las otras.
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // API y cliente se sirven en el mismo puerto: el de PORT, o 5000 si no se
  // define. (Lo de «los demás puertos tienen cortafuegos» era de Replit.)
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      // SO_REUSEPORT no existe en Windows y listen() lanza ENOTSUP: no «arreglarlo».
      reusePort: process.platform !== "win32",
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
