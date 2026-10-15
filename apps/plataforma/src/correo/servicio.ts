/**
 * Servicio de correo saliente (plan del corte 3, CA-22).
 *
 * - **No bloquea** a quien lo usa: `encolar` devuelve al instante. Una cola acotada
 *   absorbe los envíos; si está llena, se descarta y se registra el hecho (sin datos
 *   personales). Un SMTP lento no puede acumular memoria ni retener peticiones.
 * - **Un fallo nunca sube** a la petición ni se registra con su mensaje: los errores
 *   de SMTP traen la dirección del destinatario. Solo se registra el evento.
 * - **Tope global por proceso** (por hora), además de los presupuestos de cada
 *   asociación: pase lo que pase en la base, el proceso no envía sin límite.
 * - Las plantillas (`plantillas.ts`) no llevan campos libres de quien solicita.
 */

export interface MensajeCorreo {
  para: string;
  asunto: string;
  texto: string;
}

/** Entrega un mensaje; lanza si no pudo. El de SMTP está en `transporte-smtp.ts`. */
export type Transporte = (mensaje: MensajeCorreo & { de: string }) => Promise<void>;

export type EventoCorreo =
  "enviado" | "fallo" | "cola_llena" | "tope_global" | "invalido";

export interface OpcionesServicioCorreo {
  transporte: Transporte;
  remitente: string;
  /** Mensajes en espera como máximo. */
  tamanoCola?: number;
  /** Envíos simultáneos. */
  concurrencia?: number;
  /** Envíos por hora y por proceso. */
  topePorHora?: number;
  /** Recibe solo el evento: nunca direcciones ni contenido. */
  registrar?: (evento: EventoCorreo) => void;
  ahora?: () => number;
}

export interface ServicioCorreo {
  /** Encola sin esperar. `false` = se descartó (cola llena, tope global o mensaje inválido). */
  encolar(mensaje: MensajeCorreo): boolean;
  /** Espera a que la cola y los envíos en curso terminen (cierre ordenado y tests). */
  vaciar(): Promise<void>;
}

const HORA_MS = 3_600_000;
const SIN_SALTOS = /^[^\r\n]+$/;
const DIRECCION = /^[\x21-\x7e]{3,254}$/;

/** ¿Es seguro usar esto como destinatario y asunto? Impide inyectar cabeceras. */
function esMensajeValido({ para, asunto, texto }: MensajeCorreo): boolean {
  return (
    DIRECCION.test(para) &&
    !/[<>,;"]/.test(para) &&
    SIN_SALTOS.test(asunto) &&
    asunto.length <= 200 &&
    texto.length > 0 &&
    texto.length <= 10_000
  );
}

export function crearServicioCorreo(opciones: OpcionesServicioCorreo): ServicioCorreo {
  const {
    transporte,
    remitente,
    tamanoCola = 100,
    concurrencia = 2,
    topePorHora = 2000,
    registrar = () => {},
    ahora = Date.now,
  } = opciones;

  const cola: MensajeCorreo[] = [];
  let enVuelo = 0;
  let ventanaDesde = ahora();
  let enviadosEnVentana = 0;
  const reposo: Array<() => void> = [];

  function avisarSiReposa(): void {
    if (cola.length === 0 && enVuelo === 0) {
      for (const despertar of reposo.splice(0)) despertar();
    }
  }

  function bombear(): void {
    while (enVuelo < concurrencia && cola.length > 0) {
      const mensaje = cola.shift()!;
      enVuelo++;
      void transporte({ ...mensaje, de: remitente })
        .then(
          () => registrar("enviado"),
          () => registrar("fallo"),
        )
        .finally(() => {
          enVuelo--;
          bombear();
          avisarSiReposa();
        });
    }
  }

  return {
    encolar(mensaje) {
      if (!esMensajeValido(mensaje)) {
        registrar("invalido");
        return false;
      }
      const instante = ahora();
      if (instante - ventanaDesde >= HORA_MS) {
        ventanaDesde = instante;
        enviadosEnVentana = 0;
      }
      if (enviadosEnVentana >= topePorHora) {
        registrar("tope_global");
        return false;
      }
      if (cola.length >= tamanoCola) {
        registrar("cola_llena");
        return false;
      }
      enviadosEnVentana++;
      cola.push(mensaje);
      bombear();
      return true;
    },

    vaciar() {
      if (cola.length === 0 && enVuelo === 0) return Promise.resolve();
      return new Promise<void>((resolver) => reposo.push(resolver));
    },
  };
}
