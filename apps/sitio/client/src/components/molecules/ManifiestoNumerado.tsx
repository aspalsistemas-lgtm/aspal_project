import { NUMERO_CONTORNO } from "@/lib/clases";
import { cn } from "@/lib/utils";

/**
 * Enunciados de valores o compromisos como manifiesto: lista numerada (01, 02…
 * en contorno miel, decorativo) con título y texto, separados por una línea.
 * Sustituye a la rejilla de tarjetas iguales de «Lo que defendemos».
 */
export function ManifiestoNumerado({
  items,
}: {
  items: { titulo: string; texto: string }[];
}) {
  return (
    <ol data-testid="manifiesto-numerado">
      {items.map((item, i) => (
        <li
          key={item.titulo}
          className="flex gap-4 border-b border-border py-8 first:pt-0 last:border-0 last:pb-0 sm:gap-6"
        >
          <span
            className={cn(NUMERO_CONTORNO, "w-14 shrink-0 text-5xl sm:w-20 sm:text-6xl")}
            data-numero={String(i + 1).padStart(2, "0")}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h3 className="text-2xl font-bold text-foreground">{item.titulo}</h3>
            <p className="mt-3 text-lg text-muted-foreground">{item.texto}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
