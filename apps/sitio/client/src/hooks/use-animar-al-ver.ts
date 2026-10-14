import { useEffect, useRef, useState } from "react";
import { useEnCliente } from "./use-en-cliente";

/**
 * - `estatico`: sin animación. En el prerender, durante la hidratación, con
 *   «reducir movimiento» y en navegadores sin IntersectionObserver. Es el
 *   estado final: el contenido completo y en su sitio.
 * - `esperando`: en el cliente, aún fuera de pantalla. Aquí van los estados
 *   iniciales de la animación (línea sin trazar, cifra a 0).
 * - `activa`: ya entró en pantalla; se reproduce una sola vez.
 */
export type EstadoAnimacion = "estatico" | "esperando" | "activa";

function sinMovimiento(): boolean {
  return (
    typeof IntersectionObserver === "undefined" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Animación de entrada que se dispara la primera vez que el elemento entra en
 * pantalla. Solo transform y contenido, nunca opacidad: el HTML prerenderizado
 * (estado `estatico`) ya es la versión final.
 *
 * Dispara cuando el borde superior pasa del 85 % de la ventana (no con un
 * porcentaje del elemento: uno más alto que la pantalla no llegaría nunca).
 */
export function useAnimarAlVer<T extends Element>() {
  const ref = useRef<T>(null);
  const enCliente = useEnCliente();
  const [visto, setVisto] = useState(false);
  const quieto = !enCliente || sinMovimiento();

  useEffect(() => {
    const el = ref.current;
    if (quieto || visto || !el) return;
    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          setVisto(true);
          observador.disconnect();
        }
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    observador.observe(el);
    return () => observador.disconnect();
  }, [quieto, visto]);

  const estado: EstadoAnimacion = quieto ? "estatico" : visto ? "activa" : "esperando";
  return { ref, estado };
}
