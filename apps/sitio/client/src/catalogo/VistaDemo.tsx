import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useId, useState } from "react";
import { CopiarCodigo } from "./CopiarCodigo";
import type { Control, Demo, Fondo, Valores } from "./tipos";

const FONDOS: Record<Fondo, string> = {
  blanco: "bg-background",
  suave: "bg-fondo-suave",
  noche: "bg-noche text-noche-foreground [--ring:42_93%_68%]",
};

function valoresIniciales(controles: readonly Control[] = []): Valores {
  return Object.fromEntries(controles.map((c) => [c.clave, c.inicial]));
}

function CampoControl({
  control,
  valor,
  alCambiar,
}: {
  control: Control;
  valor: string | boolean;
  alCambiar: (v: string | boolean) => void;
}) {
  const id = useId();
  const clases =
    "min-h-11 w-full rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-semibold text-foreground">
        {control.etiqueta}
      </label>
      {control.tipo === "opciones" && (
        <select
          id={id}
          className={clases}
          value={String(valor)}
          onChange={(e) => alCambiar(e.target.value)}
        >
          {control.opciones.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      )}
      {control.tipo === "texto" && (
        <Input
          id={id}
          className="min-h-11"
          value={String(valor)}
          onChange={(e) => alCambiar(e.target.value)}
        />
      )}
      {control.tipo === "interruptor" && (
        <input
          id={id}
          type="checkbox"
          className="h-6 w-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          checked={Boolean(valor)}
          onChange={(e) => alCambiar(e.target.checked)}
        />
      )}
    </div>
  );
}

/** Demo en vivo: controles, marco con el componente y el código que la reproduce. */
export function VistaDemo({ id, demo }: { id: string; demo: Demo }) {
  const [valores, setValores] = useState<Valores>(() => valoresIniciales(demo.controles));
  const fondo =
    typeof demo.fondo === "function" ? demo.fondo(valores) : (demo.fondo ?? "blanco");
  return (
    <div className="space-y-4">
      {demo.controles && demo.controles.length > 0 && (
        <fieldset className="grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-2 lg:grid-cols-3">
          <legend className="px-1 text-sm font-semibold text-muted-foreground">
            Variantes
          </legend>
          {demo.controles.map((c) => (
            <CampoControl
              key={c.clave}
              control={c}
              valor={valores[c.clave]}
              alCambiar={(v) => setValores((a) => ({ ...a, [c.clave]: v }))}
            />
          ))}
        </fieldset>
      )}
      <div
        className={cn(
          "overflow-x-auto rounded-2xl border border-border p-4 md:p-6",
          FONDOS[fondo],
        )}
        data-testid={`marco-${id}`}
      >
        {demo.render(valores)}
      </div>
      {demo.nota && <p className="text-sm text-muted-foreground">{demo.nota}</p>}
      <CopiarCodigo codigo={demo.codigo(valores)} testid={`copiar-codigo-${id}`} />
    </div>
  );
}
