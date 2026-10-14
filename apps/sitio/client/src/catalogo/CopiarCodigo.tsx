import { Button } from "@/components/ui/button";
import { Check, Copy, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type EstadoCopia = "inactivo" | "copiado" | "fallo";

const ETIQUETA: Record<EstadoCopia, string> = {
  inactivo: "Copiar",
  copiado: "Copiado",
  fallo: "No se pudo copiar",
};

/**
 * Bloque de código con botón de copiar. El resultado se anuncia al lector de
 * pantalla. Sin portapapeles (http sin cifrar, permiso denegado) avisa del
 * fallo en vez de decir «Copiado» sin haber copiado nada.
 */
export function CopiarCodigo({ codigo, testid }: { codigo: string; testid: string }) {
  const [estado, setEstado] = useState<EstadoCopia>("inactivo");
  const temporizador = useRef(0);

  useEffect(() => () => window.clearTimeout(temporizador.current), []);

  async function copiar() {
    let resultado: EstadoCopia = "copiado";
    try {
      if (!navigator.clipboard) throw new Error("Portapapeles no disponible");
      await navigator.clipboard.writeText(codigo);
    } catch {
      resultado = "fallo";
    }
    setEstado(resultado);
    window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => setEstado("inactivo"), 1500);
  }

  const Icono = estado === "copiado" ? Check : estado === "fallo" ? X : Copy;

  return (
    <div className="relative">
      {/* Enfocable: si el código es más ancho que la pantalla, con teclado
          solo se puede desplazar si el bloque recibe el foco (WCAG 2.1.1). */}
      <pre
        tabIndex={0}
        aria-label="Código"
        className="overflow-x-auto rounded-xl bg-noche p-4 pr-24 text-sm text-noche-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
      >
        <code>{codigo}</code>
      </pre>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="absolute right-2 top-2 min-h-9 bg-background"
        onClick={copiar}
        data-testid={testid}
      >
        <Icono aria-hidden="true" />
        {ETIQUETA[estado]}
      </Button>
      <span className="sr-only" role="status" aria-live="polite">
        {estado === "inactivo" ? "" : ETIQUETA[estado]}
      </span>
    </div>
  );
}
