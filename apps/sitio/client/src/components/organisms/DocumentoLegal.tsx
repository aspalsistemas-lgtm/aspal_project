import {
  partirCorreos,
  type BloqueLegal,
  type DocumentoLegal as Documento,
} from "@/content/institucional/documentos-legales";

/** Un texto con sus correos enlazados (`mailto:`); el resto, tal cual. */
function TextoConCorreos({ texto }: { texto: string }) {
  return (
    <>
      {partirCorreos(texto).map((trozo, i) =>
        trozo.esCorreo ? (
          <a
            key={i}
            href={`mailto:${trozo.texto}`}
            className="rounded-sm text-primary underline underline-offset-4 [overflow-wrap:anywhere] hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {trozo.texto}
          </a>
        ) : (
          trozo.texto
        ),
      )}
    </>
  );
}

function Bloque({ bloque }: { bloque: BloqueLegal }) {
  if (typeof bloque === "string") {
    return (
      <p>
        <TextoConCorreos texto={bloque} />
      </p>
    );
  }
  const Lista = bloque.ordenada ? "ol" : "ul";
  return (
    <Lista className={`space-y-2 pl-6 ${bloque.ordenada ? "list-decimal" : "list-disc"}`}>
      {bloque.elementos.map((elemento) => (
        <li key={elemento}>
          <TextoConCorreos texto={elemento} />
        </li>
      ))}
    </Lista>
  );
}

/**
 * Cuerpo de un documento legal (aviso de privacidad, términos): la intro y un
 * `h2` por apartado, a ancho de lectura. El `h1` y la fecha los pone el hero
 * de la página; el texto vive en `content/institucional/documentos-legales.ts`.
 */
export function DocumentoLegal({ documento }: { documento: Documento }) {
  return (
    <article
      className="max-w-3xl space-y-4 text-base leading-relaxed text-foreground md:text-lg"
      data-testid="documento-legal"
    >
      {documento.intro.map((bloque, i) => (
        <Bloque key={i} bloque={bloque} />
      ))}
      {documento.apartados.map((apartado) => (
        <section key={apartado.titulo} className="space-y-4 pt-6">
          <h2 className="text-2xl font-bold text-foreground">{apartado.titulo}</h2>
          {apartado.bloques.map((bloque, i) => (
            <Bloque key={i} bloque={bloque} />
          ))}
        </section>
      ))}
    </article>
  );
}
