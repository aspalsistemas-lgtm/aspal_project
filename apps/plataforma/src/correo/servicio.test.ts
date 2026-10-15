import { describe, expect, it } from "vitest";
import {
  crearServicioCorreo,
  type EventoCorreo,
  type MensajeCorreo,
  type Transporte,
} from "./servicio.js";

const MENSAJE: MensajeCorreo = {
  para: "ana@ejemplo.org",
  asunto: "Hola",
  texto: "Texto de prueba",
};

/** Un transporte cuyas entregas se resuelven a mano. */
function transporteManual() {
  const pendientes: Array<{ resolver: () => void; rechazar: () => void }> = [];
  const entregados: Array<MensajeCorreo & { de: string }> = [];
  const transporte: Transporte = (mensaje) =>
    new Promise<void>((resolver, rechazar) => {
      entregados.push(mensaje);
      pendientes.push({
        resolver,
        rechazar: () => rechazar(new Error("ana@ejemplo.org: 550")),
      });
    });
  return { transporte, pendientes, entregados };
}

describe("servicio de correo (CA-22)", () => {
  it("encolar no espera al transporte: devuelve al instante aunque esté colgado", () => {
    const { transporte } = transporteManual();
    const servicio = crearServicioCorreo({ transporte, remitente: "no-responder@x.org" });
    expect(servicio.encolar(MENSAJE)).toBe(true);
  });

  it("entrega con el remitente configurado", async () => {
    const entregados: Array<MensajeCorreo & { de: string }> = [];
    const servicio = crearServicioCorreo({
      transporte: async (m) => void entregados.push(m),
      remitente: "no-responder@x.org",
    });
    servicio.encolar(MENSAJE);
    await servicio.vaciar();
    expect(entregados).toEqual([{ ...MENSAJE, de: "no-responder@x.org" }]);
  });

  it("limita los envíos simultáneos y acota la cola: lo que sobra se descarta", () => {
    const { transporte, entregados } = transporteManual();
    const eventos: EventoCorreo[] = [];
    const servicio = crearServicioCorreo({
      transporte,
      remitente: "r@x.org",
      concurrencia: 2,
      tamanoCola: 3,
      registrar: (evento) => eventos.push(evento),
    });
    const aceptados = Array.from({ length: 10 }, () => servicio.encolar(MENSAJE));
    // 2 en vuelo + 3 en cola.
    expect(aceptados.filter(Boolean)).toHaveLength(5);
    expect(entregados).toHaveLength(2);
    expect(eventos.filter((e) => e === "cola_llena")).toHaveLength(5);
  });

  it("un fallo del transporte no sube ni se registra con su mensaje; la cola sigue", async () => {
    const { transporte, pendientes } = transporteManual();
    const registrado: unknown[] = [];
    const servicio = crearServicioCorreo({
      transporte,
      remitente: "r@x.org",
      concurrencia: 1,
      registrar: (evento) => registrado.push(evento),
    });
    servicio.encolar(MENSAJE);
    servicio.encolar({ ...MENSAJE, para: "beto@ejemplo.org" });
    pendientes[0]!.rechazar();
    await new Promise((resolver) => setImmediate(resolver));
    expect(pendientes).toHaveLength(2);
    pendientes[1]!.resolver();
    await servicio.vaciar();
    // Solo eventos: ninguna dirección ni texto de error.
    expect(registrado).toEqual(["fallo", "enviado"]);
    expect(JSON.stringify(registrado)).not.toContain("ejemplo.org");
  });

  it("tope global por hora: pasado el tope se descarta, y la hora siguiente se recupera", async () => {
    let reloj = 1_000_000;
    const eventos: EventoCorreo[] = [];
    const servicio = crearServicioCorreo({
      transporte: async () => {},
      remitente: "r@x.org",
      topePorHora: 3,
      registrar: (e) => eventos.push(e),
      ahora: () => reloj,
    });
    const resultados = Array.from({ length: 5 }, () => servicio.encolar(MENSAJE));
    await servicio.vaciar();
    expect(resultados).toEqual([true, true, true, false, false]);
    expect(eventos.filter((e) => e === "tope_global")).toHaveLength(2);
    reloj += 3_600_001;
    expect(servicio.encolar(MENSAJE)).toBe(true);
  });

  it.each([
    ["destinatario con salto de línea", { ...MENSAJE, para: "a@x.org\r\nBcc: v@x.org" }],
    ["destinatario con varias direcciones", { ...MENSAJE, para: "a@x.org,b@x.org" }],
    ["destinatario con nombre y ángulos", { ...MENSAJE, para: "Ana <a@x.org>" }],
    ["asunto con salto de línea", { ...MENSAJE, asunto: "Hola\r\nBcc: v@x.org" }],
    ["texto vacío", { ...MENSAJE, texto: "" }],
  ])("descarta un mensaje inválido: %s", (_nombre, mensaje) => {
    const { transporte, entregados } = transporteManual();
    const servicio = crearServicioCorreo({ transporte, remitente: "r@x.org" });
    expect(servicio.encolar(mensaje)).toBe(false);
    expect(entregados).toHaveLength(0);
  });

  it("vaciar espera a los envíos en curso", async () => {
    const { transporte, pendientes } = transporteManual();
    const servicio = crearServicioCorreo({ transporte, remitente: "r@x.org" });
    servicio.encolar(MENSAJE);
    let vacio = false;
    const espera = servicio.vaciar().then(() => (vacio = true));
    await new Promise((resolver) => setImmediate(resolver));
    expect(vacio).toBe(false);
    pendientes[0]!.resolver();
    await espera;
    expect(vacio).toBe(true);
  });
});
