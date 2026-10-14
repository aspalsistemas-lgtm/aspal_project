/**
 * Puerta de la función serverless de Vercel, que solo busca funciones en `api/`
 * de la raíz del proyecto. La función real es la del sitio; aquí solo se
 * reexporta.
 *
 * Existe porque el proyecto de Vercel sigue con la raíz del repositorio como
 * Root Directory: ese ajuste vale para todas las ramas, y cambiarlo rompería
 * los despliegues de `main` mientras no tenga el monorepo (plan de la Etapa 0,
 * sección 7). Cuando `main` lo tenga, el Root Directory pasa a `apps/sitio` y
 * este archivo se borra.
 */
export { default } from "../apps/sitio/api/index.js";
