import { Hashtag } from "@/components/atoms/Hashtag";
import { MuroAliados } from "@/components/organisms/MuroAliados";
import { PerfilCard } from "@/components/molecules/PerfilCard";
import { RacimoEquipo } from "@/components/molecules/RacimoEquipo";
import { SubnavSeccion } from "@/components/molecules/SubnavSeccion";
import { Banda } from "@/components/layout/Banda";
import { PieSitio } from "@/components/organisms/PieSitio";
import { CabeceraSitio } from "@/components/organisms/CabeceraSitio";
import { HeroInstitucional } from "@/components/layout/HeroInstitucional";
import { PatronPanal } from "@/components/atoms/PatronPanal";
import { Proximamente } from "@/components/atoms/Proximamente";
import { Button } from "@/components/ui/button";
import { INTRO_EQUIPO, PERFILES } from "@/content/institucional/equipo";
import {
  ALIADOS_FUNDADORES,
  CTA_FINAL,
  HACEN_POSIBLE,
} from "@/content/institucional/nosotros";
import { registrarEvento } from "@/lib/analitica";
import {
  BOTON_CONTORNO_NOCHE,
  BOTON_MIEL_NOCHE,
  H2_BANDA,
  HEXAGONO_PUNTA,
} from "@/lib/clases";
import { CONTACTO } from "@/lib/marca";
import { cn } from "@/lib/utils";
import { ArrowRight, Landmark } from "lucide-react";
import { Link } from "wouter";

/** Equipo Ejecutivo, Consejo Directivo y Aliados: las tarjetas de Nosotros. */
const [EQUIPO, CONSEJO, ALIADOS] = HACEN_POSIBLE;

/** Flecha que avanza al pasar el ratón por su `group`. */
function Flecha({ className }: { className?: string }) {
  return (
    <ArrowRight
      className={cn(
        "transition-transform duration-200 group-hover:translate-x-1 group-focus-visible:translate-x-1",
        className,
      )}
      aria-hidden="true"
    />
  );
}

/**
 * Nuestro equipo (§6.4), con el lenguaje de la home y Nosotros: retratos en el
 * hexágono del isotipo, la Dirección General destacada y, después, quién más
 * respalda la operación (Consejo Directivo y aliados, con el copy de Nosotros).
 */
export default function NuestroEquipo() {
  const [director, ...resto] = PERFILES;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <CabeceraSitio />
      <SubnavSeccion />
      <main id="contenido" tabIndex={-1} className="flex-1 focus:outline-none">
        {/* 1. Hero: el equipo como racimo del panal */}
        <HeroInstitucional
          overline="Nuestro equipo"
          titulo="Quiénes hacen posible ASPAL"
          visual={<RacimoEquipo perfiles={PERFILES} />}
        >
          <p>{INTRO_EQUIPO}</p>
        </HeroInstitucional>

        {/* 2. Equipo Ejecutivo: la Dirección General en grande, después el resto */}
        <Banda id="equipo" tono="suave">
          <h2 className={H2_BANDA}>{EQUIPO.titulo}</h2>
          <div className="mt-10 space-y-6">
            {director && <PerfilCard perfil={director} destacado />}
            <ul className="grid gap-6 md:grid-cols-2">
              {resto.map((perfil) => (
                <li key={perfil.nombre}>
                  <PerfilCard perfil={perfil} />
                </li>
              ))}
            </ul>
          </div>
        </Banda>

        {/* 3. Quién más lo respalda: Consejo Directivo y aliados */}
        <Banda>
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <article>
              <span
                className={cn(
                  "flex h-14 w-12 items-center justify-center bg-noche text-noche-foreground",
                  HEXAGONO_PUNTA,
                )}
                aria-hidden="true"
              >
                <Landmark className="h-5 w-5" />
              </span>
              <h2 className={cn("mt-4", H2_BANDA)}>{CONSEJO.titulo}</h2>
              <p className="mt-4 text-lg text-muted-foreground">{CONSEJO.texto}</p>
              {/* PENDIENTE (Etapa 2): integrantes con foto, cargo, organización y ciudad. */}
              <p className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-dashed border-border px-5 text-muted-foreground">
                {CONSEJO.enlace.etiqueta} <Proximamente />
              </p>
            </article>
            <article className="lg:border-l lg:border-border lg:pl-16">
              <h2 className={H2_BANDA}>{ALIADOS.titulo}</h2>
              <p className="mt-4 text-lg text-muted-foreground">{ALIADOS.texto}</p>
              <Link
                href="/nosotros#aliados"
                className="group mt-4 inline-flex min-h-11 items-center gap-1.5 font-medium text-primary underline underline-offset-4"
                data-testid="enlace-equipo-aliados"
              >
                {ALIADOS.enlace.etiqueta}
                <Flecha className="h-4 w-4" />
              </Link>
            </article>
          </div>
          <div className="mt-12 border-t border-border pt-12">
            <MuroAliados fundadores={ALIADOS_FUNDADORES} />
          </div>
        </Banda>

        {/* 4. Cierre: hablar con el equipo o sumarse */}
        <Banda tono="noche">
          <div className="grid items-center gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <h2 className="text-3xl font-extrabold text-secondary md:text-5xl">
                <Hashtag />
              </h2>
              <p className="mt-4 max-w-2xl text-lg text-white/85">{CTA_FINAL[1]}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                {/* PENDIENTE (Etapa 0): /contacto. Mientras tanto, correo. */}
                <Button variant="secondary" className={BOTON_MIEL_NOCHE} asChild>
                  <a
                    href={`mailto:${CONTACTO.correo}`}
                    className="group"
                    data-testid="button-equipo-contacto"
                  >
                    Contactar al equipo
                    <Flecha />
                  </a>
                </Button>
                <Button variant="outline" className={BOTON_CONTORNO_NOCHE} asChild>
                  <Link
                    href="/unete"
                    onClick={() => registrarEvento("click_unete", { origen: "equipo" })}
                    data-testid="button-equipo-unete"
                  >
                    Únete a la comunidad
                  </Link>
                </Button>
              </div>
            </div>
            <div className="hidden lg:col-span-5 lg:block">
              <PatronPanal />
            </div>
          </div>
        </Banda>
      </main>
      <PieSitio />
    </div>
  );
}
