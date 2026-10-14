import { Banda } from "@/components/templates/Banda";
import { Button } from "@/components/ui/button";
import { useEnCliente } from "@/hooks/use-en-cliente";
import { BOTON_CONTORNO_NOCHE, BOTON_MIEL_NOCHE, H2_BANDA } from "@/lib/clases";
import { contraste, hslDeTexto, PARES } from "@/lib/contraste";
import { CopiarCodigo } from "./CopiarCodigo";
import { COLORES, TIPOGRAFIA } from "./fundamentos";

const h3 = "text-2xl font-semibold text-foreground";

/** Contraste medido sobre los valores que el navegador ya resolvió (index.css). */
function useContrastes() {
  const enCliente = useEnCliente();
  if (!enCliente) return null;
  const estilo = getComputedStyle(document.documentElement);
  return PARES.map(([texto, fondo]) => {
    const t = hslDeTexto(estilo.getPropertyValue(`--${texto}`));
    const f = hslDeTexto(estilo.getPropertyValue(`--${fondo}`));
    return { texto, fondo, ratio: t && f ? contraste(t, f) : null };
  });
}

export function SeccionFundamentos() {
  const contrastes = useContrastes();
  return (
    <section
      id="fundamentos"
      aria-labelledby="fundamentos-titulo"
      className="scroll-mt-32"
    >
      <h2 id="fundamentos-titulo" className={H2_BANDA}>
        Fundamentos
      </h2>

      <h3 className={`mt-10 ${h3}`}>Color</h3>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {COLORES.map((c) => (
          <li
            key={c.token}
            className="overflow-hidden rounded-2xl border border-border"
            data-testid={`color-${c.token}`}
          >
            <div className={`h-20 ${c.muestra}`} aria-hidden="true" />
            <div className="p-4">
              <p className="font-semibold text-foreground">{c.nombre}</p>
              <p className="font-mono text-sm text-muted-foreground">
                --{c.token} · {c.muestra}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{c.uso}</p>
            </div>
          </li>
        ))}
      </ul>

      <h3 className={`mt-10 ${h3}`}>Contraste de los pares de texto</h3>
      <p className="mt-2 text-muted-foreground">
        Medido en vivo sobre index.css. AA exige 4,5:1. Un par nuevo se añade a PARES en
        client/src/lib/contraste.ts.
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PARES.map(([texto, fondo], i) => {
          const ratio = contrastes?.[i]?.ratio;
          return (
            <li key={`${texto}-${fondo}`} className="rounded-xl border border-border p-4">
              <p className="font-mono text-sm">
                {texto} sobre {fondo}
              </p>
              <p
                className="mt-1 text-lg font-semibold"
                data-testid={`contraste-${texto}-${fondo}`}
              >
                {ratio
                  ? `${ratio.toFixed(2)}:1 ${ratio >= 4.5 ? "✓ AA" : "✗ no cumple AA"}`
                  : "—"}
              </p>
            </li>
          );
        })}
      </ul>

      <h3 className={`mt-10 ${h3}`}>Tipografía</h3>
      <p className="mt-2 text-muted-foreground">
        Montserrat 400–800, servida desde /fuentes/montserrat-v31/.
      </p>
      <ul className="mt-4 space-y-4">
        {TIPOGRAFIA.map((t) => (
          <li key={t.nivel} className="rounded-xl border border-border p-4">
            <p className="font-mono text-sm text-muted-foreground">
              {t.nivel} · {t.clases}
            </p>
            <p className={`mt-2 ${t.clases}`}>{t.muestra}</p>
          </li>
        ))}
      </ul>

      <h3 className={`mt-10 ${h3}`}>Clases compartidas</h3>
      <p className="mt-2 text-muted-foreground">
        En client/src/lib/clases.ts. Impórtalas; un test impide copiarlas en línea.
      </p>
      <div className="mt-4 space-y-3">
        <CopiarCodigo
          codigo={`import { H2_BANDA } from "@/lib/clases";\n// "${H2_BANDA}"`}
          testid="copiar-h2-banda"
        />
      </div>

      <h3 className={`mt-10 ${h3}`}>Botones</h3>
      <div className="mt-4 flex flex-wrap gap-3 rounded-2xl border border-border p-6">
        <Button variant="secondary" className="min-h-11 px-6">
          Primario (secondary)
        </Button>
        <Button variant="outline" className="min-h-11 px-6">
          Secundario (outline)
        </Button>
        <Button className="min-h-11 px-6">Pizarra (default)</Button>
        <Button variant="ghost" className="min-h-11 px-6">
          Fantasma (ghost)
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 rounded-2xl bg-noche p-6 [--ring:42_93%_68%]">
        <Button variant="secondary" className={BOTON_MIEL_NOCHE}>
          Miel sobre noche
        </Button>
        <Button variant="outline" className={BOTON_CONTORNO_NOCHE}>
          Contorno sobre noche
        </Button>
      </div>
      <div className="mt-3">
        <CopiarCodigo
          codigo={`import { BOTON_CONTORNO_NOCHE, BOTON_MIEL_NOCHE } from "@/lib/clases";\n\n<Button variant="secondary" className={BOTON_MIEL_NOCHE}>…</Button>\n<Button variant="outline" className={BOTON_CONTORNO_NOCHE}>…</Button>`}
          testid="copiar-botones-noche"
        />
      </div>

      <h3 className={`mt-10 ${h3}`}>Bandas</h3>
      <p className="mt-2 text-muted-foreground">
        Ritmo blanco → suave → noche. Cada bloque de página es una Banda.
      </p>
      <div className="mt-4 overflow-hidden rounded-2xl border border-border">
        {(["blanco", "suave", "noche"] as const).map((tono) => (
          <Banda key={tono} tono={tono} className="py-6 md:py-8">
            <p className="text-lg">tono="{tono}"</p>
          </Banda>
        ))}
      </div>
    </section>
  );
}
