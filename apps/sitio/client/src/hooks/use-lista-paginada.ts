import { CABECERA_TOTAL, type TransformedPost } from "@shared/wordpress/types";
import { useInfiniteQuery } from "@tanstack/react-query";

interface Pagina {
  items: TransformedPost[];
  total: number;
}

/**
 * Lista de `/api/posts` o `/api/podcasts` por páginas, para «Ver más»: la
 * primera página al montar y las siguientes con `cargarMas()`. `total` es el
 * de la colección entera (cabecera CABECERA_TOTAL), no el de lo cargado: sirve
 * para numerar (episodio N) y para saber si quedan más.
 *
 * Un fallo de la primera página es `isError` (estado de error de la página);
 * uno de las siguientes, `errorAlCargarMas`, y lo ya cargado sigue a la vista.
 */
export function useListaPaginada(
  ruta: "/api/posts" | "/api/podcasts",
  porPagina: number,
) {
  const consulta = useInfiniteQuery({
    queryKey: [ruta, { per_page: porPagina, paginada: true }],
    queryFn: async ({ pageParam }): Promise<Pagina> => {
      const url = `${ruta}?per_page=${porPagina}&page=${pageParam}`;
      const respuesta = await fetch(url);
      if (!respuesta.ok) throw new Error(`Error al cargar ${url}: ${respuesta.status}`);
      const items = (await respuesta.json()) as TransformedPost[];
      const total = Number.parseInt(respuesta.headers.get(CABECERA_TOTAL) ?? "", 10);
      return { items, total: Number.isNaN(total) ? items.length : total };
    },
    initialPageParam: 1,
    getNextPageParam: (ultima, paginas) => {
      const cargados = paginas.reduce((n, pagina) => n + pagina.items.length, 0);
      // Una página vacía corta: si el total cambió por debajo, no se pide en bucle.
      return ultima.items.length > 0 && cargados < ultima.total
        ? paginas.length + 1
        : undefined;
    },
    // Un solo fetch fallido no puede quedar cacheado como "no hay contenido".
    retry: 2,
    retryDelay: (intento) => Math.min(1000 * 2 ** intento, 8000),
  });

  const paginas = consulta.data?.pages ?? [];
  return {
    items: paginas.flatMap((pagina) => pagina.items),
    total: paginas.at(-1)?.total ?? 0,
    isPending: consulta.isPending,
    isError: consulta.isError,
    isFetching: consulta.isFetching,
    reintentar: () => consulta.refetch(),
    hayMas: consulta.hasNextPage,
    cargandoMas: consulta.isFetchingNextPage,
    errorAlCargarMas: consulta.isFetchNextPageError,
    cargarMas: () => consulta.fetchNextPage(),
  };
}
