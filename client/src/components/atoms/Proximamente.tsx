import { cn } from "@/lib/utils";

/**
 * Marca de sección todavía no construida. Nunca acompaña a un enlace: el ítem
 * se muestra, se explica que llegará, pero no se finge navegable.
 *
 * Vive aquí y no dentro del header porque el pie la necesita igual, y ambos
 * pintan los mismos destinos desde `navegacion.ts`.
 */
export function Proximamente({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground",
        className,
      )}
    >
      Próximamente
    </span>
  );
}
