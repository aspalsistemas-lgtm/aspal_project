import { RetratoHex } from "@/components/atoms/RetratoHex";
import { AvisoPestanaNueva } from "@/components/atoms/AvisoPestanaNueva";
import type { Perfil } from "@/content/institucional/equipo";
import { registrarEvento } from "@/lib/analitica";
import { Linkedin } from "lucide-react";

function EnlaceLinkedin({ perfil, testid }: { perfil: Perfil; testid: string }) {
  if (!perfil.linkedin) return null;
  return (
    <a
      href={perfil.linkedin}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() =>
        registrarEvento("salida_plataforma", {
          destino: perfil.linkedin!,
          origen: "equipo",
        })
      }
      data-testid={`${testid}-linkedin`}
      className="inline-flex min-h-11 items-center gap-2 font-medium text-primary underline underline-offset-4"
    >
      <Linkedin className="h-4 w-4" aria-hidden="true" />
      LinkedIn
      <AvisoPestanaNueva />
    </a>
  );
}

/**
 * Perfil de una persona (§6.4) con su retrato en el hexágono del isotipo
 * (RetratoHex: foto o, mientras no llegue, iniciales). Nombre en h3: va bajo
 * el h2 de su sección.
 *
 * - Por defecto, en fila: retrato pequeño a la izquierda, nombre, cargo y bio.
 * - `destacado` (la Dirección General): tarjeta ancha con el retrato grande en
 *   miel, el cargo como antetítulo y la bio como declaración.
 */
export function PerfilCard({
  perfil,
  destacado = false,
}: {
  perfil: Perfil;
  destacado?: boolean;
}) {
  const testid = `perfil-${perfil.nombre.toLowerCase().split(" ")[0]}`;

  if (destacado) {
    return (
      <article
        className="grid items-center gap-8 rounded-3xl border border-border bg-background p-6 md:grid-cols-12 md:p-10"
        data-testid={testid}
      >
        <RetratoHex
          perfil={perfil}
          tono="miel"
          className="mx-auto w-40 text-5xl md:col-span-4 md:w-56 md:text-6xl"
        />
        <div className="md:col-span-8">
          <p className="text-[13px] font-semibold uppercase tracking-wider text-miel-texto">
            {perfil.cargo}
          </p>
          <h3 className="mt-2 text-3xl font-extrabold text-foreground md:text-4xl">
            {perfil.nombre}
          </h3>
          <p className="mt-4 border-l-4 border-secondary pl-4 text-xl leading-relaxed text-foreground">
            {perfil.bio}
          </p>
          <div className="mt-4">
            <EnlaceLinkedin perfil={perfil} testid={testid} />
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className="flex h-full gap-5 rounded-2xl border border-border bg-background p-6 md:p-8"
      data-testid={testid}
    >
      <RetratoHex perfil={perfil} className="w-20 shrink-0 self-start text-2xl md:w-24" />
      <div className="min-w-0">
        <h3 className="text-2xl font-bold text-foreground">{perfil.nombre}</h3>
        <p className="mt-1 font-medium text-miel-texto">{perfil.cargo}</p>
        <p className="mt-3 text-lg text-muted-foreground">{perfil.bio}</p>
        <EnlaceLinkedin perfil={perfil} testid={testid} />
      </div>
    </article>
  );
}
