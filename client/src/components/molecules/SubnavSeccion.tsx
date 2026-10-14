import { NAVEGACION, destinosDe, esRutaActiva } from "@/lib/navegacion";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";

/**
 * Subnavegación «Acerca de» (§6.2): barra fija bajo el header, compartida por
 * Nosotros, ¿Qué hacemos? y Nuestro equipo. Sale de navegacion.ts (solo los
 * destinos internos vivos), así que un destino nuevo aparece aquí solo al
 * darle `href`. Con menos de dos destinos no tiene sentido y no se pinta.
 */
export function SubnavSeccion() {
  const [ruta] = useLocation();
  const acerca = NAVEGACION.find((entrada) => entrada.testid === "menu-acerca-de");
  const destinos = acerca ? destinosDe(acerca).filter((d) => d.href && !d.externo) : [];
  if (destinos.length < 2) return null;

  return (
    <nav
      aria-label="Acerca de"
      className="sticky top-16 z-40 border-b border-border bg-background/95 backdrop-blur"
      data-testid="subnav-acerca-de"
    >
      <div className="container mx-auto max-w-7xl overflow-x-auto px-4 md:px-8">
        <ul className="flex gap-1">
          {destinos.map((destino) => {
            const activo = esRutaActiva(destino.href, ruta);
            return (
              <li key={destino.testid}>
                <Link
                  href={destino.href!}
                  aria-current={activo ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center whitespace-nowrap border-b-2 px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                    activo
                      ? "border-secondary font-semibold text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                  data-testid={`subnav-${destino.testid}`}
                >
                  {destino.etiqueta}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
