import logoParksys from "@assets/logo-parksys-fondo-claro.webp";
import logoAnpr from "@assets/Recurso 50comunidad ASPAL_1763678044080.png";
import logoWup from "@assets/Recurso 53comunidad ASPAL_1763678055285.png";
import type { Aliado } from "@/content/institucional/nosotros";

/**
 * Logos de aliados, versión para fondo claro, con sus medidas intrínsecas
 * (evitan el salto de maquetación al cargar). El de Parksys llegó solo en
 * versión para fondo oscuro; el de fondo claro se derivó pasando el texto
 * blanco a noche (originales en docs/marca/).
 */
const LOGOS: Record<
  NonNullable<Aliado["logo"]>,
  { src: string; ancho: number; alto: number }
> = {
  wup: { src: logoWup, ancho: 240, alto: 95 },
  anpr: { src: logoAnpr, ancho: 207, alto: 102 },
  parksys: { src: logoParksys, ancho: 760, alto: 240 },
};

/**
 * Muro de aliados (Bloque 9). En la Etapa 1 solo los fundadores; las demás
 * categorías se anuncian «conforme se firmen convenios» (§6.2). Rejilla
 * estática: sin carrusel automático (accesibilidad).
 *
 * Logos en gris para que ninguno pese más que otro; al pasar el ratón por la
 * tarjeta recuperan su color (hoy solo Parksys lo tiene: los archivos de WUP y
 * ANPR ya son grises).
 */
export function MuroAliados({
  fundadores,
  pendientes,
}: {
  fundadores: Aliado[];
  pendientes?: string[];
}) {
  return (
    <div>
      <h3 className="text-xl font-semibold text-foreground">
        Fundadores y respaldo institucional
      </h3>
      <ul className="mt-6 grid gap-6 md:grid-cols-3">
        {fundadores.map((aliado) => (
          <li
            key={aliado.nombre}
            className="group flex h-full flex-col rounded-2xl border border-border bg-background p-6"
            data-testid={`aliado-${aliado.nombre.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <div className="flex h-24 items-center">
              {aliado.logo ? (
                <img
                  src={LOGOS[aliado.logo].src}
                  alt={aliado.nombre}
                  width={LOGOS[aliado.logo].ancho}
                  height={LOGOS[aliado.logo].alto}
                  className="max-h-20 w-auto opacity-70 grayscale transition-[filter,opacity] duration-300 group-hover:opacity-100 group-hover:grayscale-0"
                  loading="lazy"
                />
              ) : (
                <span className="text-2xl font-bold text-foreground">
                  {aliado.nombre}
                </span>
              )}
            </div>
            <p className="mt-4 text-base text-muted-foreground">
              {aliado.logo && (
                <strong className="font-semibold text-foreground">
                  {aliado.nombre}:{" "}
                </strong>
              )}
              {aliado.descripcion}
            </p>
          </li>
        ))}
      </ul>
      {pendientes && pendientes.length > 0 && (
        <ul className="mt-8 grid gap-3 md:grid-cols-3">
          {pendientes.map((categoria) => (
            <li
              key={categoria}
              className="rounded-2xl border border-dashed border-border p-4 text-base text-muted-foreground"
            >
              <span className="font-semibold text-foreground">{categoria}.</span> Conforme
              se firmen convenios.
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
