import { HASHTAG } from "@/content/institucional/nosotros";
import { partirHashtag } from "@/lib/hashtag";
import { Fragment } from "react";

/**
 * El hashtag de la marca con puntos de corte (<wbr>) entre sus palabras: en
 * una línea si cabe y, si no, salta entre palabras en vez de desbordar. Solo
 * el texto: tamaño, color y etiqueta los pone quien lo envuelve.
 */
export function Hashtag({ texto = HASHTAG }: { texto?: string }) {
  return (
    <>
      {partirHashtag(texto).map((parte, i) => (
        <Fragment key={i}>
          {i > 0 && <wbr />}
          {parte}
        </Fragment>
      ))}
    </>
  );
}
