/**
 * Versión de los términos y del aviso de privacidad que se aceptan al crear una cuenta
 * (`cuenta_acceso.terminos_version`).
 *
 * El texto vigente es el que ya publica el sitio en `/terminos` (reglamento de la
 * comunidad) y `/aviso-de-privacidad`, que viven en
 * `apps/sitio/client/src/content/institucional/documentos-legales.ts`. La versión es la
 * fecha del aviso de privacidad (abril de 2024), el único de los dos que la lleva.
 *
 * `terminos.test.ts` compara la huella de ese texto con `HUELLA_TEXTO_LEGAL`: si alguien
 * cambia el texto legal del sitio, el test falla hasta que se revise, se actualice la
 * versión y se vuelva a calcular la huella. Así cada cuenta guarda la versión exacta que
 * aceptó y el texto no cambia sin que la plataforma se entere.
 */
export const TERMINOS_VERSION = "2024-04";

/** SHA-256 del texto legal del sitio (desde `export const TERMINOS`, espacios normalizados). */
export const HUELLA_TEXTO_LEGAL =
  "b8f7a8de396921ef1e658ec21bd36133f687626c5a15129f9d4d661999acd0cd";
