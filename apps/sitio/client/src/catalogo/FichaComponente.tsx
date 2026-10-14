import { CopiarCodigo } from "./CopiarCodigo";
import { demoDe } from "./demos";
import { ETIQUETA_NIVEL } from "./registro";
import type { EntradaCatalogo } from "./tipos";
import { VistaDemo } from "./VistaDemo";

const VISTA: Record<EntradaCatalogo["vista"], string> = {
  demo: "",
  "en-esta-pagina": "Se ve en esta misma página (cabecera, pie o botones globales).",
  "sin-vista": "No tiene vista propia aquí: ver su archivo y la página donde se usa.",
};

/** Ficha de un componente: qué es, cuándo usarlo, cómo importarlo y su demo. */
export function FichaComponente({ entrada }: { entrada: EntradaCatalogo }) {
  const demo = entrada.vista === "demo" ? demoDe(entrada.id) : undefined;
  return (
    <article
      id={entrada.id}
      aria-labelledby={`${entrada.id}-titulo`}
      // break-words: descripciones con palabras largas sin espacios
      // («Header/Title/Description…») desbordaban la página a 375 px.
      className="scroll-mt-32 break-words rounded-2xl border border-border bg-background p-6"
      data-testid={`ficha-${entrada.id}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3
          id={`${entrada.id}-titulo`}
          className="text-2xl font-semibold text-foreground"
        >
          {entrada.nombre}
        </h3>
        {/* Nivel de Atomic Design (DA-3): independiente de la categoría. */}
        <span
          className="rounded-full border border-border bg-fondo-suave px-2.5 py-0.5 text-xs font-semibold text-primary"
          data-testid={`nivel-${entrada.id}`}
        >
          {ETIQUETA_NIVEL[entrada.nivel]}
        </span>
        {entrada.estado === "sin-uso" && (
          <span className="rounded-full bg-destructive px-2.5 py-0.5 text-xs font-semibold text-destructive-foreground">
            Sin uso
          </span>
        )}
      </div>
      <p className="mt-1 break-all font-mono text-sm text-muted-foreground">
        {entrada.archivo}
      </p>
      <p className="mt-3 text-lg text-foreground">{entrada.descripcion}</p>
      <dl className="mt-4 grid gap-3 text-base md:grid-cols-2">
        <div>
          <dt className="font-semibold text-foreground">Úsalo para</dt>
          <dd className="text-muted-foreground">{entrada.usarCuando}</dd>
        </div>
        {entrada.evitarPara && (
          <div>
            <dt className="font-semibold text-foreground">No lo uses para</dt>
            <dd className="text-muted-foreground">{entrada.evitarPara}</dd>
          </div>
        )}
        <div className="md:col-span-2">
          <dt className="font-semibold text-foreground">Props</dt>
          <dd className="font-mono text-sm text-muted-foreground">{entrada.props}</dd>
        </div>
      </dl>
      <div className="mt-4">
        <CopiarCodigo codigo={entrada.importar} testid={`copiar-import-${entrada.id}`} />
      </div>
      {entrada.vista !== "demo" && (
        <p className="mt-4 text-muted-foreground">{VISTA[entrada.vista]}</p>
      )}
      {demo && (
        <div className="mt-6" data-testid={`demo-${entrada.id}`}>
          <VistaDemo id={entrada.id} demo={demo} />
        </div>
      )}
    </article>
  );
}
