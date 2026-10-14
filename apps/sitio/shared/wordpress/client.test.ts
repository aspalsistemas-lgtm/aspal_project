import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchPodcasts,
  fetchPostBySlug,
  fetchPosts,
  resolvePodcastCategoryId,
} from "./client";

const PODCAST_CATEGORY = [{ id: 3 }];

/** Respuesta mínima que satisface a `transformPost`. */
function wpPost(slug = "un-articulo") {
  return {
    id: 1,
    date: "2026-08-05T10:30:00",
    date_gmt: "2026-08-05T08:30:00",
    slug,
    title: { rendered: "Título" },
    content: { rendered: "<p>Contenido</p>" },
    excerpt: { rendered: "<p>Extracto</p>" },
    link: "https://wordpress.example/un-articulo",
  };
}

function jsonResponse(body: unknown, ok = true, status = 200, total?: number) {
  const headers = new Headers(total === undefined ? {} : { "X-WP-Total": String(total) });
  return { ok, status, headers, json: async () => body } as Response;
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** URL de la llamada número `index`, como objeto para inspeccionar params. */
function calledUrl(index: number): URL {
  return new URL(fetchMock.mock.calls[index][0] as string);
}

describe("resolvePodcastCategoryId", () => {
  it("resuelve el id por slug, sin codificarlo a mano", () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(PODCAST_CATEGORY));

    return resolvePodcastCategoryId().then((id) => {
      expect(id).toBe(3);
      expect(calledUrl(0).searchParams.get("slug")).toBe("podcast");
    });
  });

  it("devuelve null si la categoría no existe, sin lanzar", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));

    await expect(resolvePodcastCategoryId()).resolves.toBeNull();
  });

  it("propaga un fallo HTTP", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(null, false, 503));

    await expect(resolvePodcastCategoryId()).rejects.toThrow("503");
  });
});

describe("fetchPosts", () => {
  it("excluye la categoría podcast usando el id resuelto", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(PODCAST_CATEGORY))
      .mockResolvedValueOnce(jsonResponse([wpPost()]));

    const { items } = await fetchPosts(7);

    const url = calledUrl(1);
    expect(url.searchParams.get("categories_exclude")).toBe("3");
    expect(url.searchParams.get("per_page")).toBe("7");
    expect(url.searchParams.get("page")).toBe("1");
    expect(items).toHaveLength(1);
  });

  it("pide la página indicada y devuelve el total de X-WP-Total", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(PODCAST_CATEGORY))
      .mockResolvedValueOnce(jsonResponse([wpPost()], true, 200, 23));

    const pagina = await fetchPosts(10, 3);

    expect(calledUrl(1).searchParams.get("page")).toBe("3");
    expect(pagina.total).toBe(23);
  });

  it("sin X-WP-Total, el total es lo que llegó", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(PODCAST_CATEGORY))
      .mockResolvedValueOnce(jsonResponse([wpPost(), wpPost("otro")]));

    await expect(fetchPosts()).resolves.toMatchObject({ total: 2 });
  });

  it("no excluye nada si la categoría podcast no existe", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([wpPost()]));

    await fetchPosts();

    expect(calledUrl(1).searchParams.has("categories_exclude")).toBe(false);
  });

  it("LANZA ante un fallo de WordPress en vez de degradar a []", async () => {
    // El fallo de esta política era el bug original: "WordPress caído" y "no
    // hay artículos" llegaban al cliente como el mismo array vacío.
    fetchMock
      .mockResolvedValueOnce(jsonResponse(PODCAST_CATEGORY))
      .mockResolvedValueOnce(jsonResponse(null, false, 500));

    await expect(fetchPosts()).rejects.toThrow("500");
  });

  it("propaga también un fallo de red", async () => {
    fetchMock.mockRejectedValueOnce(new Error("ENOTFOUND"));

    await expect(fetchPosts()).rejects.toThrow("ENOTFOUND");
  });
});

describe("fetchPostBySlug", () => {
  it("devuelve null solo cuando el post de verdad no existe", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));

    await expect(fetchPostBySlug("no-existe")).resolves.toBeNull();
  });

  it("lanza ante un fallo de carga, para no confundirlo con un 404", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(null, false, 502));

    await expect(fetchPostBySlug("un-articulo")).rejects.toThrow("502");
  });

  it("codifica el slug en la query", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([wpPost("con espacio")]));

    await fetchPostBySlug("con espacio");

    expect(calledUrl(0).searchParams.get("slug")).toBe("con espacio");
  });
});

describe("fetchPodcasts", () => {
  it("filtra por la categoría podcast", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(PODCAST_CATEGORY))
      .mockResolvedValueOnce(jsonResponse([wpPost()]));

    await fetchPodcasts(8);

    const url = calledUrl(1);
    expect(url.searchParams.get("categories")).toBe("3");
    expect(url.searchParams.get("per_page")).toBe("8");
  });

  it("devuelve vacío si no hay categoría podcast", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));

    await expect(fetchPodcasts()).resolves.toEqual({ items: [], total: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
