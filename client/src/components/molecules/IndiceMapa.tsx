import { AvisoPestanaNueva } from "@/components/atoms/AvisoPestanaNueva";
import { ETAPAS, MAPA_RUTA } from "@/content/institucional/mapa-ruta";
import { registrarEvento } from "@/lib/analitica";
import { HEXAGONO_PUNTA } from "@/lib/clases";
import { cn } from "@/lib/utils";
import { Download } from "lucide-react";

const TOTAL_PASOS = ETAPAS.reduce((n, etapa) => n + etapa.pasos.length, 0);

/**
 * Índice de /mapa-de-ruta: la escala del mapa de un vistazo. Abre con una
 * celda miel de cifras (pasos y etapas, contados de los datos) y la descarga
 * del PDF; después, cada etapa con icono, resumen y su rango de pasos, que
 * salta a su sección (#etapa-N).
 */
export function IndiceMapa() {
  return (
    <ol
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      data-testid="indice-etapas-mapa"
    >
      <li className="flex flex-col justify-between rounded-2xl bg-secondary p-6 text-secondary-foreground sm:col-span-2 lg:col-span-1">
        <p>
          <span className="block text-6xl font-extrabold leading-none">
            {TOTAL_PASOS}
          </span>
          <span className="mt-2 block text-lg font-semibold">
            pasos en {ETAPAS.length} etapas
          </span>
        </p>
        <a
          href={MAPA_RUTA.pdf.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => registrarEvento("click_mapa_ruta", { origen: "descarga_pdf" })}
          className="mt-6 inline-flex min-h-11 items-center gap-2 font-semibold underline underline-offset-4"
          data-testid="indice-mapa-pdf"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Descarga el mapa (PDF, {MAPA_RUTA.pdf.peso})
          <AvisoPestanaNueva />
        </a>
      </li>
      {ETAPAS.map((etapa) => {
        const Icono = etapa.icono;
        const primero = etapa.pasos[0]!.numero;
        const ultimo = etapa.pasos[etapa.pasos.length - 1]!.numero;
        return (
          <li key={etapa.id}>
            <a
              href={`#${etapa.id}`}
              className="group flex h-full flex-col rounded-2xl border border-border bg-background p-5 transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              data-testid={`etapa-mapa-${etapa.numero}`}
            >
              <span className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-12 w-[2.6rem] shrink-0 items-center justify-center bg-noche text-noche-foreground transition-colors group-hover:bg-primary",
                    HEXAGONO_PUNTA,
                  )}
                  aria-hidden="true"
                >
                  <Icono className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold uppercase tracking-wider text-miel-texto">
                  Etapa {etapa.numero}
                </span>
              </span>
              <span className="mt-3 hyphens-auto break-words text-lg font-bold text-foreground">
                {etapa.nombre}
              </span>
              <span className="mt-1 hyphens-auto break-words text-sm text-muted-foreground">
                {etapa.resumen}
              </span>
              <span className="mt-auto pt-3 text-sm font-medium text-primary">
                {primero === ultimo ? `Paso ${primero}` : `Pasos ${primero}–${ultimo}`}
              </span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}
