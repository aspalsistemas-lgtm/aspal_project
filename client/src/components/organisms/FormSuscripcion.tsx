import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { registrarEvento } from "@/lib/analitica";
import { CONTACTO } from "@/lib/marca";
import { enviarSuscripcion } from "@/lib/suscripcion";
import { cn } from "@/lib/utils";
import {
  CAMPO_TRAMPA,
  PAISES,
  type CampoSuscripcion,
  type ErroresSuscripcion,
  type OrigenSuscripcion,
} from "@shared/suscripcion/tipos";
import { validarSuscripcion } from "@shared/suscripcion/validacion";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

type Estado = "inactivo" | "enviando" | "exito" | "error";

/** Orden visual de los campos: el foco va al primero con error en este orden. */
const ORDEN_CAMPOS = [
  "nombre",
  "pais",
  "organizacion",
  "cargo",
  "correo",
  "consentimiento",
] as const;

interface Props {
  origen: OrigenSuscripcion;
  /** Completo: el alta de /unete. Compacto: solo correo (pie, /eventos). */
  variante: "completo" | "compacto";
  /** Sobre bandas noche el texto va en claro. */
  tono?: "claro" | "noche";
}

/**
 * Formulario de suscripción al boletín (RF-05). Valida con la misma función
 * que el servidor, envía a /api/suscripcion y distingue enviando, éxito y
 * error. El éxito explica la doble confirmación: sin ese aviso, quien no abre
 * el correo nunca queda suscrito y no sabe por qué.
 */
export function FormSuscripcion({ origen, variante, tono = "claro" }: Props) {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const exitoRef = useRef<HTMLDivElement>(null);
  const enviandoRef = useRef(false);
  const debeEnfocarRef = useRef(false);
  const [estado, setEstado] = useState<Estado>("inactivo");
  const [errores, setErrores] = useState<ErroresSuscripcion>({});
  const completo = variante === "completo";
  const oscuro = tono === "noche";

  function campoEnDom(nombre: string) {
    return formRef.current?.querySelector<HTMLElement>(`[name="${nombre}"]`) ?? null;
  }

  // El foco se mueve al primer error una vez pintado, cuando aria-invalid y
  // aria-describedby ya están en el DOM.
  useEffect(() => {
    if (!debeEnfocarRef.current) return;
    debeEnfocarRef.current = false;
    const primero = ORDEN_CAMPOS.find((nombre) => errores[nombre] && campoEnDom(nombre));
    if (primero) campoEnDom(primero)?.focus();
  }, [errores]);

  // Al confirmar el envío el formulario desaparece: el foco pasa al aviso.
  useEffect(() => {
    if (estado === "exito") exitoRef.current?.focus();
  }, [estado]);

  /** Muestra los errores; si ninguno cae en un campo visible, avisa en general. */
  function mostrarErrores(lista: ErroresSuscripcion) {
    const visible = ORDEN_CAMPOS.some((nombre) => lista[nombre] && campoEnDom(nombre));
    if (!visible) {
      setErrores({});
      setEstado("error");
      return;
    }
    debeEnfocarRef.current = true;
    setEstado("inactivo");
    setErrores(lista);
  }

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviandoRef.current) return;
    const formulario = new FormData(evento.currentTarget);
    const datos = {
      correo: formulario.get("correo"),
      nombre: formulario.get("nombre") ?? undefined,
      pais: formulario.get("pais") ?? undefined,
      organizacion: formulario.get("organizacion") ?? undefined,
      cargo: formulario.get("cargo") ?? undefined,
      consentimiento: formulario.get("consentimiento") === "si",
      origen,
      [CAMPO_TRAMPA]: formulario.get(CAMPO_TRAMPA) ?? "",
    };

    const local = validarSuscripcion(datos);
    if (!local.ok) {
      mostrarErrores(local.errores);
      return;
    }

    setErrores({});
    enviandoRef.current = true;
    setEstado("enviando");
    const respuesta = await enviarSuscripcion(datos);
    enviandoRef.current = false;
    if (respuesta.estado === "exito") {
      setEstado("exito");
      registrarEvento("signup_suscriptor", { origen });
    } else if (respuesta.estado === "invalido") {
      mostrarErrores(respuesta.errores);
    } else {
      setEstado("error");
    }
  }

  if (estado === "exito") {
    return (
      <div
        ref={exitoRef}
        tabIndex={-1}
        role="status"
        className={cn(
          "outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "flex items-start gap-3 rounded-2xl p-5",
          oscuro ? "bg-white/10 text-white" : "bg-accent text-foreground",
        )}
        data-testid={`text-suscripcion-exito-${origen}`}
      >
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <p className="text-base">
          ¡Listo! Te enviamos un correo para confirmar tu suscripción. Ábrelo y pulsa el
          botón de confirmación; sin ese paso no podemos escribirte. Si no te llega en
          unos minutos, revisa el correo no deseado o escríbenos a{" "}
          <a href={`mailto:${CONTACTO.correo}`} className="underline underline-offset-4">
            {CONTACTO.correo}
          </a>
          .
        </p>
      </div>
    );
  }

  const etiqueta = cn(
    "block text-sm font-medium",
    oscuro ? "text-white" : "text-foreground",
  );
  const ayudaError = "mt-1 text-sm font-medium text-destructive";
  const campo = (nombre: CampoSuscripcion) => ({
    id: `${id}-${nombre}`,
    name: nombre,
    "aria-invalid": errores[nombre] ? true : undefined,
    "aria-required": (nombre === "organizacion" || nombre === "cargo"
      ? undefined
      : "true") as "true" | undefined,
    "aria-describedby": errores[nombre] ? `${id}-${nombre}-error` : undefined,
    "data-testid": `input-suscripcion-${nombre}-${origen}`,
  });
  const error = (nombre: CampoSuscripcion) =>
    errores[nombre] ? (
      <p
        role="alert"
        id={`${id}-${nombre}-error`}
        className={cn(ayudaError, oscuro && "text-secondary")}
        data-testid={`error-suscripcion-${nombre}-${origen}`}
      >
        {errores[nombre]}
      </p>
    ) : null;

  return (
    <form
      ref={formRef}
      onSubmit={alEnviar}
      noValidate
      className="space-y-4"
      aria-busy={estado === "enviando"}
      data-testid={`form-suscripcion-${origen}`}
    >
      {completo && (
        <p className={cn("text-sm", oscuro ? "text-white" : "text-muted-foreground")}>
          Los campos sin «(opcional)» son obligatorios.
        </p>
      )}

      {completo && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${id}-nombre`} className={etiqueta}>
              Nombre
            </label>
            <Input {...campo("nombre")} autoComplete="name" className="mt-1 min-h-11" />
            {error("nombre")}
          </div>
          <div>
            <label htmlFor={`${id}-pais`} className={etiqueta}>
              País
            </label>
            <select
              {...campo("pais")}
              defaultValue=""
              className="mt-1 flex min-h-11 w-full rounded-md border border-input bg-background px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="" disabled>
                Elige tu país
              </option>
              {PAISES.map((pais) => (
                <option key={pais} value={pais}>
                  {pais}
                </option>
              ))}
            </select>
            {error("pais")}
          </div>
          <div>
            <label htmlFor={`${id}-organizacion`} className={etiqueta}>
              Organización <span className="font-normal opacity-80">(opcional)</span>
            </label>
            <Input
              {...campo("organizacion")}
              autoComplete="organization"
              className="mt-1 min-h-11"
            />
          </div>
          <div>
            <label htmlFor={`${id}-cargo`} className={etiqueta}>
              Cargo <span className="font-normal opacity-80">(opcional)</span>
            </label>
            <Input
              {...campo("cargo")}
              autoComplete="organization-title"
              className="mt-1 min-h-11"
            />
          </div>
        </div>
      )}

      <div>
        <label htmlFor={`${id}-correo`} className={etiqueta}>
          Correo electrónico
        </label>
        <Input
          {...campo("correo")}
          type="email"
          autoComplete="email"
          inputMode="email"
          className="mt-1 min-h-11"
        />
        {error("correo")}
      </div>

      {/* Campo trampa: invisible y fuera del orden de tabulación. Solo lo
          rellenan los bots. */}
      {/* inert: fuera del árbol de accesibilidad y del foco sin aria-hidden. */}
      <div
        {...{ inert: "" }}
        className="absolute left-[-10000px] h-px w-px overflow-hidden"
      >
        <label htmlFor={`${id}-${CAMPO_TRAMPA}`}>No rellenes este campo</label>
        <input
          id={`${id}-${CAMPO_TRAMPA}`}
          name={CAMPO_TRAMPA}
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div>
        <label
          className={cn(
            "flex min-h-11 items-start gap-3 text-sm",
            oscuro ? "text-white" : "text-foreground",
          )}
        >
          <input
            type="checkbox"
            name="consentimiento"
            value="si"
            className="mt-0.5 h-5 w-5 shrink-0 accent-[hsl(var(--primary))]"
            aria-required="true"
            aria-invalid={errores.consentimiento ? true : undefined}
            aria-describedby={
              errores.consentimiento ? `${id}-consentimiento-error` : undefined
            }
            data-testid={`checkbox-suscripcion-consentimiento-${origen}`}
          />
          {/* PENDIENTE (Etapa 0): enlazar el aviso de privacidad cuando exista
              /aviso-privacidad. Texto a revisar por la Coordinación. */}
          <span>
            Acepto que ASPAL use mis datos para enviarme su boletín. Puedo darme de baja
            en cualquier momento desde el propio correo.
          </span>
        </label>
        {error("consentimiento")}
      </div>

      {estado === "error" && (
        <p
          role="alert"
          className={cn(ayudaError, oscuro && "text-secondary")}
          data-testid={`text-suscripcion-error-${origen}`}
        >
          No pudimos completar tu registro. Inténtalo de nuevo en unos minutos o
          escríbenos a{" "}
          <a href={`mailto:${CONTACTO.correo}`} className="underline underline-offset-4">
            {CONTACTO.correo}
          </a>
          .
        </p>
      )}

      <Button
        type="submit"
        variant="secondary"
        className="min-h-11 w-full px-6 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 sm:w-auto"
        aria-disabled={estado === "enviando"}
        data-testid={`button-suscripcion-enviar-${origen}`}
      >
        {estado === "enviando" && <Loader2 className="animate-spin" aria-hidden="true" />}
        {estado === "enviando" ? "Enviando…" : completo ? "Unirme gratis" : "Suscribirme"}
      </Button>
      <p className="sr-only" aria-live="polite">
        {estado === "enviando" ? "Enviando…" : ""}
      </p>
    </form>
  );
}
