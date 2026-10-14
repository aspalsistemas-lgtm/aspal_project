import { Lock } from "lucide-react";

/**
 * «Exclusivo para miembros»: el cuerpo del artículo está tras el muro de la
 * comunidad (MemberPress, `isGated`). Se avisa antes del clic para que el
 * login al otro lado no sea una sorpresa.
 */
export function AvisoMiembros() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
      <Lock className="h-3 w-3" aria-hidden="true" />
      Exclusivo para miembros
    </span>
  );
}
