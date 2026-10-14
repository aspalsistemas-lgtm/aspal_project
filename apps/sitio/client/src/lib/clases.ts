/**
 * Clases que se repetían página a página. Impórtalas en vez de copiarlas: el
 * test de al lado falla si alguien vuelve a escribir la cadena en línea. Se
 * ven en /componentes (Fundamentos).
 */

/** Título de banda (h2): 32–40 px, negrita. */
export const H2_BANDA = "text-3xl font-bold text-foreground md:text-4xl";

/** Botón miel sobre banda noche: `<Button variant="secondary" className={…}>`. */
export const BOTON_MIEL_NOCHE =
  "min-h-11 px-6 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-noche";

/**
 * Botón de contorno blanco sobre banda noche: `<Button variant="outline" className={…}>`.
 * `[border-color:white]` y no `border-white`: la variante outline pone
 * `[border-color:var(--button-outline)]` y tailwind-merge solo fusiona la
 * propiedad arbitraria igual.
 */
export const BOTON_CONTORNO_NOCHE =
  "min-h-11 [border-color:white] bg-transparent px-6 text-white hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-noche";

/** Hexágono con vértice arriba, la forma del isotipo (insignias, iniciales). */
export const HEXAGONO_PUNTA =
  "[clip-path:polygon(50%_0,100%_25%,100%_75%,50%_100%,0_75%,0_25%)]";

/**
 * Número decorativo en contorno miel (01, 02…): pilares, listas numeradas.
 * Sin relleno no compite con el título; en alto contraste el trazo
 * desaparecería y quedaría un número macizo, así que se oculta.
 *
 * El número va en `data-numero` y lo pinta ::before, no como texto del DOM:
 * es decoración, y como texto axe le mide un contraste que no le corresponde.
 * `<span className={cn(NUMERO_CONTORNO, "text-5xl")} data-numero="01" aria-hidden="true" />`
 */
export const NUMERO_CONTORNO =
  "select-none font-extrabold leading-none text-transparent [-webkit-text-stroke:2px_hsl(var(--secondary))] before:content-[attr(data-numero)] forced-colors:hidden";

/**
 * Rejilla de los 4 pilares en «panal escalonado» (con PilarCard ilustracion):
 * deja 40 px arriba para la insignia que sobresale y, desde lg, baja medio
 * paso las tarjetas pares.
 */
export const REJILLA_PILARES_PANAL =
  "grid gap-x-6 gap-y-16 pt-10 md:grid-cols-2 lg:grid-cols-4 lg:pb-12 lg:[&>*:nth-child(even)]:translate-y-12";
