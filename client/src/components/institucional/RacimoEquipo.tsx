import { RetratoHex } from "@/components/atoms/RetratoHex";
import { PatronPanal } from "@/components/atoms/PatronPanal";
import type { Perfil } from "@/content/institucional/equipo";

/** Posición de las 3 celdas: una arriba y dos abajo, encajadas como en el panal. */
const CELDAS = [
  { left: "25%", top: "0%" },
  { left: "0%", top: "43%" },
  { left: "50%", top: "43%" },
];

/**
 * El equipo como racimo de 3 celdas del panal, sobre el patrón de la marca: la
 * primera persona en miel, las demás en claro. Es la columna visual del hero
 * de Nuestro equipo. Decorativo (`aria-hidden`): los perfiles están debajo.
 *
 * Las celdas se arman una tras otra al cargar (CSS, solo transform: el
 * prerender ya las trae en su sitio y «reducir movimiento» las deja quietas).
 */
export function RacimoEquipo({ perfiles }: { perfiles: Perfil[] }) {
  return (
    // Ancho de 2 celdas; alto de 1 celda más 1 paso de ¾: 1 : 1,01.
    <div
      className="relative mx-auto aspect-[0.99] w-full max-w-sm"
      aria-hidden="true"
      data-testid="racimo-equipo"
    >
      <PatronPanal className="absolute -inset-8 h-[calc(100%+4rem)] w-[calc(100%+4rem)] opacity-40" />
      {perfiles.slice(0, CELDAS.length).map((perfil, i) => (
        <span
          key={perfil.nombre}
          className="absolute w-1/2 animate-insignia p-1.5 motion-reduce:animate-none"
          style={{ ...CELDAS[i], animationDelay: `${200 + i * 160}ms` }}
        >
          <RetratoHex
            perfil={perfil}
            tono={i === 0 ? "miel" : "claro"}
            className="w-full text-5xl"
          />
        </span>
      ))}
    </div>
  );
}
