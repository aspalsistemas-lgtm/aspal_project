import { Banda } from "@/components/layout/Banda";
import type { Testimonio } from "@/content/institucional/inicio";
import { HASHTAG } from "@/content/institucional/nosotros";
import { HEXAGONO_PUNTA } from "@/lib/clases";
import { iniciales } from "@/lib/iniciales";
import { cn } from "@/lib/utils";
import { Quote } from "lucide-react";

/**
 * «Voces de la red»: testimonios de directivos, con cara y nombre. Es la prueba
 * social que la home necesita antes de pedir la suscripción. Ranura: con la
 * lista vacía no se pinta (los testimonios los aporta la Coordinación; no se
 * inventan). Retrato 1:1; sin foto, iniciales en un hexágono de la marca.
 */
export function VocesRed({ testimonios }: { testimonios: Testimonio[] }) {
  if (testimonios.length === 0) return null;
  return (
    <Banda tono="noche" id="voces-de-la-red">
      <p className="text-[13px] font-semibold tracking-wider text-secondary">{HASHTAG}</p>
      <h2 className="mt-2 text-3xl font-bold md:text-4xl">Voces de la red</h2>
      <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {testimonios.map((t) => (
          <li
            key={t.nombre}
            className="flex h-full flex-col rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 md:p-8"
            data-testid={`testimonio-${t.nombre.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <figure className="flex h-full flex-col">
              <Quote className="h-8 w-8 text-secondary" aria-hidden="true" />
              <blockquote className="mt-4 flex-1 text-lg leading-relaxed text-white/90">
                <p>{t.cita}</p>
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-4">
                {t.foto ? (
                  <img
                    src={t.foto}
                    alt=""
                    width={400}
                    height={400}
                    loading="lazy"
                    decoding="async"
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  <span
                    className={cn(
                      "flex h-16 w-14 shrink-0 items-center justify-center bg-secondary font-bold text-secondary-foreground",
                      HEXAGONO_PUNTA,
                    )}
                    aria-hidden="true"
                  >
                    {iniciales(t.nombre)}
                  </span>
                )}
                <span className="text-base">
                  <span className="block font-semibold text-white">{t.nombre}</span>
                  <span className="block text-white/75">
                    {t.cargo} · {t.organizacion}, {t.pais}
                  </span>
                </span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </Banda>
  );
}
