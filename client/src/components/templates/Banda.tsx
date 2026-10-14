import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const FONDOS = {
  blanco: "bg-background text-foreground",
  suave: "bg-fondo-suave text-foreground",
  noche: "bg-noche text-noche-foreground [--ring:42_93%_68%]",
} as const;

/**
 * Banda horizontal de las páginas institucionales (guía de diseño: ritmo
 * blanco → suave → noche, 64 px en móvil y 96 px en escritorio).
 */
export function Banda({
  tono = "blanco",
  id,
  className,
  children,
}: {
  tono?: keyof typeof FONDOS;
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={cn("py-16 md:py-24", FONDOS[tono], className)}>
      <div className="container mx-auto max-w-7xl px-4 md:px-8">{children}</div>
    </section>
  );
}
