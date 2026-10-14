import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";

/**
 * «Ver más» al pie de una lista paginada (useListaPaginada): cuántos se ven
 * de cuántos y el botón que trae la página siguiente. Anuncia por aria-live lo
 * que se ha cargado; si la página siguiente falla, lo dice y el botón pasa a
 * «Reintentar». Sin más páginas, solo queda el recuento.
 */
export function VerMas({
  mostrados,
  total,
  nombre,
  hayMas,
  cargando,
  error,
  onCargarMas,
  testid,
}: {
  mostrados: number;
  total: number;
  /** En plural y minúscula: «episodios», «artículos». */
  nombre: string;
  hayMas: boolean;
  cargando: boolean;
  error: boolean;
  onCargarMas: () => void;
  testid: string;
}) {
  return (
    <div className="mt-10 flex flex-col items-center gap-4 text-center">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {error
          ? `No hemos podido cargar más ${nombre}.`
          : `Mostrando ${mostrados} de ${total} ${nombre}`}
      </p>
      {hayMas && (
        <Button
          variant="outline"
          className="group min-h-11 px-6"
          onClick={onCargarMas}
          disabled={cargando}
          data-testid={testid}
        >
          {cargando ? (
            "Cargando…"
          ) : error ? (
            "Reintentar"
          ) : (
            <>
              Ver más {nombre}
              <ArrowDown
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-y-0.5"
                aria-hidden="true"
              />
            </>
          )}
        </Button>
      )}
    </div>
  );
}
