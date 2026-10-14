import { afterEach, describe, expect, it, vi } from "vitest";
import {
  COMUNIDAD,
  ENTRADAS_PIE,
  NAVEGACION,
  URL_LOGIN,
  URL_REGISTRO,
  destinosDe,
  destinosPie,
  esDesplegable,
  esEntradaActiva,
  esRutaActiva,
  listasDe,
  registrarClicDestino,
  type DestinoNav,
  type EntradaNav,
} from "./navegacion";
import { esRutaConocida } from "./rutas";

const destinos: DestinoNav[] = NAVEGACION.flatMap(destinosDe);
const entrada = (etiqueta: string): EntradaNav =>
  NAVEGACION.find((e) => e.etiqueta === etiqueta)!;

afterEach(() => vi.unstubAllGlobals());

describe("esRutaActiva", () => {
  it("marca la ruta exacta", () => {
    expect(esRutaActiva("/blog", "/blog")).toBe(true);
  });

  it("mantiene /blog activa mientras se lee un artículo", () => {
    expect(esRutaActiva("/blog", "/blog/el-poder-del-podcasting")).toBe(true);
  });

  it("compara por segmento, no por prefijo de texto", () => {
    expect(esRutaActiva("/blog", "/blogosfera")).toBe(false);
  });

  it("solo activa la raíz en la raíz exacta", () => {
    expect(esRutaActiva("/", "/")).toBe(true);
    expect(esRutaActiva("/", "/blog")).toBe(false);
  });

  it("nunca marca un destino externo ni uno que no existe", () => {
    expect(esRutaActiva(`${COMUNIDAD}/comunidad/`, "/")).toBe(false);
    expect(esRutaActiva(undefined, "/blog")).toBe(false);
  });
});

describe("arquitectura del menú (D1)", () => {
  it("tiene los cinco rubros en el orden recomendado", () => {
    expect(NAVEGACION.map((e) => e.etiqueta)).toEqual([
      "Acerca de",
      "Recursos",
      "Eventos",
      "Membresía",
      "Comunidad",
    ]);
  });

  it("organiza Recursos en los cuatro grupos del mega-menú", () => {
    expect(entrada("Recursos").grupos?.map((g) => g.titulo)).toEqual([
      "Aprende",
      "Certifícate",
      "Participa",
      "Conecta",
    ]);
  });

  it("aplana grupos y destinos en el mismo orden en que se pintan", () => {
    const recursos = entrada("Recursos");
    expect(destinosDe(recursos)).toEqual(recursos.grupos!.flatMap((g) => g.destinos));
    expect(destinosDe(entrada("Membresía"))).toEqual(entrada("Membresía").destinos);
    expect(destinosDe(entrada("Eventos"))).toEqual([]);
  });

  it("sabe qué entradas despliegan algo", () => {
    expect(esDesplegable(entrada("Recursos"))).toBe(true);
    expect(esDesplegable(entrada("Acerca de"))).toBe(true);
    expect(esDesplegable(entrada("Eventos"))).toBe(false);
  });
});

describe("esEntradaActiva", () => {
  it("marca Recursos cuando lo está uno de sus destinos, esté en el grupo que esté", () => {
    expect(esEntradaActiva(entrada("Recursos"), "/blog/un-articulo")).toBe(true);
    expect(esEntradaActiva(entrada("Recursos"), "/podcast")).toBe(true);
    expect(esEntradaActiva(entrada("Recursos"), "/")).toBe(false);
  });

  it("marca un rubro con página propia y no uno que solo apunta fuera", () => {
    expect(esEntradaActiva(entrada("Comunidad"), "/blog")).toBe(false);
    expect(esEntradaActiva(entrada("Eventos"), "/eventos")).toBe(true);
  });
});

describe("catálogo de navegación", () => {
  it("no enlaza ninguna ruta interna que no exista", () => {
    // RF-01: un enlace interno sin página es un fallo de CI. Un destino sin
    // página se queda en «Próximamente» hasta el PR que crea su ruta.
    const internos = [...NAVEGACION, ...destinos]
      .map((e) => e.href)
      .filter((href): href is string => href !== undefined && !href.startsWith("http"));
    expect(internos.filter((href) => !esRutaConocida(href))).toEqual([]);
  });

  it("no repite ningún data-testid entre rubros, grupos y destinos", () => {
    const grupos = NAVEGACION.flatMap((e) => e.grupos ?? []);
    const ids = [
      ...NAVEGACION.map((e) => e.testid),
      ...grupos.map((g) => g.testid),
      ...destinos.map((d) => d.testid),
    ];
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  it("da descripción e icono a todos los destinos", () => {
    expect(destinos.filter((d) => !d.descripcion.trim())).toEqual([]);
    expect([...NAVEGACION, ...destinos].filter((e) => !e.icono)).toEqual([]);
  });

  it("no repite icono dentro de una misma lista", () => {
    for (const e of NAVEGACION) {
      for (const lista of listasDe(e)) {
        const iconos = lista.map((d) => d.icono);
        expect(new Set(iconos).size, `iconos repetidos en "${e.etiqueta}"`).toBe(
          iconos.length,
        );
      }
    }
  });

  it("pone los destinos vivos antes que los «Próximamente» en cada lista", () => {
    for (const e of NAVEGACION) {
      for (const lista of listasDe(e)) {
        const primeroPendiente = lista.findIndex((d) => !d.href);
        if (primeroPendiente === -1) continue;
        const vivosDespues = lista.slice(primeroPendiente).filter((d) => d.href);
        expect(
          vivosDespues.map((d) => d.etiqueta),
          e.etiqueta,
        ).toEqual([]);
      }
    }
  });

  it("marca como externo todo destino que salga del sitio, y solo esos", () => {
    for (const destino of destinos) {
      expect(Boolean(destino.externo), destino.etiqueta).toBe(
        Boolean(destino.href?.startsWith("http")),
      );
    }
  });

  it("apunta el registro y el login al subdominio de comunidad", () => {
    expect(URL_REGISTRO).toBe(`${COMUNIDAD}/register/membresia-basica/`);
    expect(URL_LOGIN).toBe(`${COMUNIDAD}/login/`);
    expect(COMUNIDAD).toContain("comunidad.");
  });
});

describe("pie", () => {
  it("usa como columnas Acerca de, Recursos, Eventos y Membresía, en ese orden", () => {
    const columnas = ENTRADAS_PIE.map(
      (id) => NAVEGACION.find((e) => e.testid === id)?.etiqueta,
    );
    expect(columnas).toEqual(["Acerca de", "Recursos", "Eventos", "Membresía"]);
  });

  it("lista en el pie solo destinos vivos", () => {
    const recursos = destinosPie(entrada("Recursos"));
    expect(recursos.length).toBeGreaterThan(0);
    expect(recursos.every((d) => Boolean(d.href))).toBe(true);
  });

  it("lista en Acerca de solo las tres páginas que ya existen", () => {
    expect(destinosPie(entrada("Acerca de")).map((d) => d.href)).toEqual([
      "/nosotros",
      "/que-hacemos",
      "/nuestro-equipo",
    ]);
  });

  it("una entrada sin destinos vivos pero con enlace propio se lista a sí misma", () => {
    const eventos = destinosPie(entrada("Eventos"));
    expect(eventos).toHaveLength(1);
    expect(eventos[0].href).toBe("/eventos");
    expect(eventos[0].etiqueta).toBe("Eventos");
  });
});

describe("registrarClicDestino", () => {
  it("registra click_menu con el destino y el origen", () => {
    const ventana: { dataLayer?: unknown[] } = {};
    vi.stubGlobal("window", ventana);
    const blog = destinos.find((d) => d.href === "/blog")!;
    registrarClicDestino(blog, "menu");
    expect(ventana.dataLayer).toEqual([
      { event: "click_menu", destino: "/blog", etiqueta: "Blog", origen: "menu" },
    ]);
  });

  it("añade salida_plataforma cuando el destino sale del sitio", () => {
    const ventana: { dataLayer?: unknown[] } = {};
    vi.stubGlobal("window", ventana);
    const cursos = destinos.find((d) => d.testid === "link-cursos")!;
    registrarClicDestino(cursos, "footer");
    expect(ventana.dataLayer).toEqual([
      {
        event: "click_menu",
        destino: cursos.href,
        etiqueta: cursos.etiqueta,
        origen: "footer",
      },
      { event: "salida_plataforma", destino: cursos.href, origen: "footer" },
    ]);
  });

  it("no registra nada de un destino que aún no existe", () => {
    const ventana: { dataLayer?: unknown[] } = {};
    vi.stubGlobal("window", ventana);
    registrarClicDestino(
      destinos.find((d) => !d.href)!,
      "menu",
    );
    expect(ventana.dataLayer).toBeUndefined();
  });

  it("enlaza el Mapa de Ruta desde Recursos › Aprende", () => {
    const mapa = destinos.find((d) => d.testid === "link-mapa-ruta");
    expect(mapa?.href).toBe("/mapa-de-ruta");
  });
});
