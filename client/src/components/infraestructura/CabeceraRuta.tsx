import { registrarRuta } from "@/lib/historial";
import { rutaCanonica } from "@/lib/rutas";
import { metaDeRuta } from "@/lib/seo";
import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Mantiene el título y la descripción al navegar sin recargar. Al cargar, el
 * HTML prerenderizado ya los trae; esto cubre los cambios de ruta dentro de la
 * SPA. Las rutas dinámicas (`/blog/:slug`) y el 404 fijan su propio título, así
 * que aquí solo se tocan las rutas estáticas.
 */
export function CabeceraRuta() {
  const [ruta, navegar] = useLocation();

  useEffect(() => {
    registrarRuta(ruta);
    // wouter compara sin distinguir mayúsculas, pero el servidor sí: `/Blog`
    // recibe el 404.html y el cliente pintaría el blog. Se lleva a la forma
    // canónica para que código, contenido y URL coincidan, conservando consulta y ancla.
    const canonica = rutaCanonica(ruta);
    if (canonica) {
      navegar(canonica + window.location.search + window.location.hash, {
        replace: true,
      });
      return;
    }
    const meta = metaDeRuta(ruta);
    if (!meta) return;
    document.title = meta.titulo;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", meta.descripcion);
  }, [ruta, navegar]);

  return null;
}
