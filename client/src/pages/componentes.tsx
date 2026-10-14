import { PieSitio } from "@/components/organisms/PieSitio";
import { CabeceraSitio } from "@/components/organisms/CabeceraSitio";
import { HeroInstitucional } from "@/components/layout/HeroInstitucional";
import { FichaComponente } from "@/catalogo/FichaComponente";
import { CATEGORIAS, REGISTRO } from "@/catalogo/registro";
import { SeccionFundamentos } from "@/catalogo/SeccionFundamentos";
import { H2_BANDA } from "@/lib/clases";

/**
 * Catálogo interno (pública pero noindex; no se enlaza desde el menú). Para
 * quien programa o diseña: ver lo que existe, probar variantes y copiar el
 * código. La fuente es client/src/catalogo/registro.ts.
 */
export default function Componentes() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <CabeceraSitio />
      <main id="contenido" tabIndex={-1} className="flex-1 focus:outline-none">
        <HeroInstitucional overline="Para el equipo" titulo="Componentes y estilos">
          <p>
            Todo lo que ya existe en el sitio, con sus variantes y el código para usarlo.
            Antes de crear un componente nuevo, busca aquí uno que lo resuelva. Página
            interna: no aparece en buscadores.
          </p>
        </HeroInstitucional>

        <div className="container mx-auto max-w-7xl px-4 py-16 md:px-8 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
          <nav aria-label="Índice del catálogo" className="mb-10 lg:mb-0">
            <ul className="space-y-1 lg:sticky lg:top-24">
              <li>
                <a
                  href="#fundamentos"
                  className="inline-flex min-h-11 items-center font-medium text-primary underline-offset-4 hover:underline"
                >
                  Fundamentos
                </a>
              </li>
              {CATEGORIAS.map((c) => (
                <li key={c.id}>
                  <a
                    href={`#categoria-${c.id}`}
                    className="inline-flex min-h-11 items-center font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {c.titulo}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="min-w-0 space-y-16">
            <SeccionFundamentos />
            {CATEGORIAS.map((c) => {
              const entradas = REGISTRO.filter((e) => e.categoria === c.id);
              return (
                <section
                  key={c.id}
                  id={`categoria-${c.id}`}
                  aria-labelledby={`categoria-${c.id}-titulo`}
                  className="scroll-mt-32"
                >
                  <h2 id={`categoria-${c.id}-titulo`} className={H2_BANDA}>
                    {c.titulo}
                  </h2>
                  <p className="mt-2 max-w-3xl text-lg text-muted-foreground">
                    {c.descripcion}
                  </p>
                  <div className="mt-6 space-y-6">
                    {entradas.map((e) => (
                      <FichaComponente key={e.id} entrada={e} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </main>
      <PieSitio />
    </div>
  );
}
