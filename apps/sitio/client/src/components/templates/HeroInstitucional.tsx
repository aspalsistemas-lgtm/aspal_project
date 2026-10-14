import { Banda } from "@/components/templates/Banda";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Hero de las páginas institucionales: banda noche, overline miel y un único
 * H1. Sin animaciones de opacidad: se prerenderiza.
 *
 * `visual` (opcional) ocupa una columna a la derecha desde `lg`: foto o el
 * patrón de panal. Por debajo de `lg` no se pinta, para que en móvil el texto
 * y las acciones queden arriba sin scroll. Sin `visual`, el hero es el de
 * siempre (Nosotros, Qué hacemos, Equipo…).
 */
export function HeroInstitucional({
  overline,
  overlineNormal,
  titulo,
  visual,
  children,
}: {
  overline: string;
  /** Sin mayúsculas forzadas: para hashtags, que se leen mal en versalitas. */
  overlineNormal?: boolean;
  titulo: string;
  visual?: ReactNode;
  children?: ReactNode;
}) {
  const texto = (
    <>
      <p
        className={cn(
          "text-[13px] font-semibold tracking-wider text-secondary",
          overlineNormal ? "normal-case" : "uppercase",
        )}
      >
        {overline}
      </p>
      <h1
        className="mt-3 max-w-3xl text-4xl font-bold leading-tight md:text-5xl lg:text-6xl"
        data-testid="text-hero-titulo"
      >
        {titulo}
      </h1>
      {children && <div className="mt-6 max-w-2xl text-lg text-white/85">{children}</div>}
    </>
  );

  return (
    // overflow-x-clip: la foto «sangrado» sale hasta el borde de la ventana
    // (100vw incluye la barra de scroll) y no debe crear scroll horizontal.
    <Banda tono="noche" className="overflow-x-clip">
      {visual ? (
        <div className="grid items-center gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">{texto}</div>
          <div className="hidden lg:col-span-5 lg:block" data-testid="hero-visual">
            {visual}
          </div>
        </div>
      ) : (
        texto
      )}
    </Banda>
  );
}
