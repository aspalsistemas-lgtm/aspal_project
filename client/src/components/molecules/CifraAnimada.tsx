import { useAnimarAlVer } from "@/hooks/use-animar-al-ver";
import { formatearCifra, partirCifra } from "@/lib/cifras";
import { useEffect, useState } from "react";

/** easeOutCubic: arranca rápido y frena al llegar. */
const frenar = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Una cifra («15+», «1,000») que cuenta desde 0 hasta su valor la primera vez
 * que entra en pantalla. Cifras de ancho fijo (tabular-nums): no empuja nada.
 *
 * El prerender, la hidratación y «reducir movimiento» muestran el valor final
 * tal cual. Mientras cuenta, el lector de pantalla lee el valor final (sr-only)
 * y no los números intermedios.
 */
export function CifraAnimada({
  valor,
  duracion = 1200,
}: {
  valor: string;
  /** Milisegundos que tarda en llegar a su valor. */
  duracion?: number;
}) {
  const { ref, estado } = useAnimarAlVer<HTMLSpanElement>();
  const [actual, setActual] = useState<number | null>(null);
  const [terminado, setTerminado] = useState(false);
  const partes = partirCifra(valor);

  useEffect(() => {
    const objetivo = partirCifra(valor)?.numero;
    if (estado !== "activa" || objetivo === undefined) return;
    let inicio: number | undefined;
    let cuadro = 0;
    const paso = (t: number) => {
      inicio ??= t;
      const avance = Math.min((t - inicio) / duracion, 1);
      setActual(Math.round(objetivo * frenar(avance)));
      if (avance < 1) cuadro = requestAnimationFrame(paso);
      else setTerminado(true);
    };
    cuadro = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro);
  }, [estado, valor, duracion]);

  const contando = partes !== null && estado !== "estatico" && !terminado;
  return (
    <span ref={ref} className="tabular-nums" data-testid="cifra-animada">
      {contando ? (
        <>
          <span className="sr-only">{valor}</span>
          <span aria-hidden="true">{formatearCifra(actual ?? 0, partes)}</span>
        </>
      ) : (
        valor
      )}
    </span>
  );
}
