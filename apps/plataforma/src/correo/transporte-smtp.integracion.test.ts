/**
 * El transporte SMTP real (nodemailer) contra un servidor SMTP mínimo en el propio
 * proceso: lo único del correo que los demás tests sustituyen por un doble.
 */
import { createServer, type Server } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { crearTransporteSmtp } from "./transporte-smtp.js";

interface Servidor {
  puerto: number;
  datos: string[];
  cerrar: () => Promise<void>;
}

/** Un SMTP de juguete: acepta un mensaje, sin STARTTLS ni autenticación. */
async function levantarSmtp(): Promise<Servidor> {
  const datos: string[] = [];
  const servidor: Server = createServer((socket) => {
    let enDatos = false;
    let mensaje = "";
    socket.write("220 stub ESMTP\r\n");
    socket.on("data", (trozo) => {
      const texto = trozo.toString("utf8");
      if (enDatos) {
        mensaje += texto;
        if (mensaje.endsWith("\r\n.\r\n")) {
          datos.push(mensaje);
          enDatos = false;
          mensaje = "";
          socket.write("250 aceptado\r\n");
        }
        return;
      }
      for (const linea of texto.split("\r\n").filter(Boolean)) {
        const orden = linea.toUpperCase();
        if (orden.startsWith("EHLO") || orden.startsWith("HELO")) {
          socket.write("250-stub\r\n250 8BITMIME\r\n");
        } else if (orden.startsWith("MAIL FROM") || orden.startsWith("RCPT TO")) {
          socket.write("250 ok\r\n");
        } else if (orden === "DATA") {
          enDatos = true;
          socket.write("354 adelante\r\n");
        } else if (orden === "QUIT") {
          socket.end("221 adiós\r\n");
        } else {
          socket.write("250 ok\r\n");
        }
      }
    });
    socket.on("error", () => {});
  });
  await new Promise<void>((resolver) => servidor.listen(0, "127.0.0.1", resolver));
  const direccion = servidor.address();
  if (!direccion || typeof direccion === "string") throw new Error("sin puerto");
  return {
    puerto: direccion.port,
    datos,
    cerrar: () => new Promise<void>((resolver) => servidor.close(() => resolver())),
  };
}

let servidor: Servidor | null = null;
afterEach(async () => {
  await servidor?.cerrar();
  servidor = null;
});

const MENSAJE = {
  de: "no-responder@aspal.localhost",
  para: "ana@ejemplo.org",
  asunto: "Confirma tu correo · ASPAL",
  texto: "Abre este enlace: http://aspal.localhost:5010/registro#token",
};

describe("transporte SMTP (CA-22)", () => {
  it("entrega el mensaje con remitente, destinatario, asunto y texto", async () => {
    servidor = await levantarSmtp();
    const enviar = crearTransporteSmtp(
      {
        host: "127.0.0.1",
        puerto: servidor.puerto,
        seguro: false,
        remitente: MENSAJE.de,
      },
      { exigirTls: false },
    );
    await enviar(MENSAJE);
    expect(servidor.datos).toHaveLength(1);
    const crudo = servidor.datos[0]!;
    expect(crudo).toMatch(/^From: .*no-responder@aspal\.localhost/im);
    expect(crudo).toMatch(/^To: .*ana@ejemplo\.org/im);
    expect(crudo).toMatch(/^Subject: /im);
    expect(crudo).toContain("registro#token");
  });

  it("en producción exige TLS: contra un servidor sin STARTTLS no envía en claro", async () => {
    servidor = await levantarSmtp();
    const enviar = crearTransporteSmtp(
      {
        host: "127.0.0.1",
        puerto: servidor.puerto,
        seguro: false,
        remitente: MENSAJE.de,
      },
      { exigirTls: true },
    );
    await expect(enviar(MENSAJE)).rejects.toThrow();
    expect(servidor.datos).toHaveLength(0);
  });

  it("un servidor inalcanzable rechaza la promesa (el servicio lo registrará como fallo)", async () => {
    const enviar = crearTransporteSmtp(
      { host: "127.0.0.1", puerto: 1, seguro: false, remitente: MENSAJE.de },
      { exigirTls: false },
    );
    await expect(enviar(MENSAJE)).rejects.toThrow();
  });
});
