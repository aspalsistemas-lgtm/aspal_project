import { describe, expect, it } from "vitest";
import { isGatedContent, transformPost } from "./transform";
import type { WPPost } from "./types";

/** Muro de MemberPress tal y como lo devuelve la REST API a una petición
 *  anónima. Es lo que llega hoy en los 15 posts. */
const GATED_HTML = `<div class="mp_wrapper">
  <div class="mepr-unauthorized-message">
    <p>You are unauthorized to view this page.</p>
  </div>
</div>`;

function makePost(overrides: Partial<WPPost> = {}): WPPost {
  return {
    id: 1,
    date: "2026-08-05T10:30:00",
    date_gmt: "2026-08-05T08:30:00",
    slug: "un-articulo",
    title: { rendered: "Un art&#039;culo" },
    content: { rendered: "<p>Hola mundo</p>" },
    excerpt: { rendered: "<p>Resumen breve</p>" },
    link: "https://wordpress.example/un-articulo",
    ...overrides,
  };
}

describe("transformPost — tiempo de lectura", () => {
  it("cuenta palabras del texto, no los atributos del HTML", () => {
    // Cinco palabras reales envueltas en una etiqueta con atributos largos.
    // El cálculo antiguo, sobre HTML crudo, contaba también src/class/alt.
    const ruidoso = `<img src="https://cdn.example.com/una-imagen-con-nombre-larguisimo.jpg" class="wp-image-1234 aligncenter size-full" alt="texto alternativo bastante largo" /><p>una dos tres cuatro cinco</p>`;

    const post = transformPost(makePost({ content: { rendered: ruidoso } }));

    expect(post.readingMinutes).toBe(1);
  });

  it("escala con la longitud real del texto", () => {
    const seiscientasPalabras = Array.from({ length: 600 }, () => "palabra").join(" ");

    const post = transformPost(
      makePost({ content: { rendered: `<p>${seiscientasPalabras}</p>` } }),
    );

    // 600 palabras a 200 ppm = 3 minutos.
    expect(post.readingMinutes).toBe(3);
  });

  it("nunca baja de 1 minuto con contenido corto pero real", () => {
    const post = transformPost(makePost({ content: { rendered: "<p>Hola</p>" } }));

    expect(post.readingMinutes).toBe(1);
  });
});

describe("transformPost — contenido bloqueado", () => {
  it("marca isGated y anula el tiempo de lectura", () => {
    const post = transformPost(makePost({ content: { rendered: GATED_HTML } }));

    expect(post.isGated).toBe(true);
    // 0 significa "no hay dato": la UI omite el hueco en vez de decir "1 min".
    expect(post.readingMinutes).toBe(0);
  });

  it("no marca como bloqueado un artículo normal", () => {
    const post = transformPost(makePost());

    expect(post.isGated).toBe(false);
    expect(post.readingMinutes).toBeGreaterThan(0);
  });

  it("isGatedContent detecta ambas variantes del stub", () => {
    expect(isGatedContent(GATED_HTML)).toBe(true);
    expect(isGatedContent("<p>You are unauthorized to view this page.</p>")).toBe(true);
    expect(isGatedContent("<p>Un artículo cualquiera</p>")).toBe(false);
  });
});

describe("transformPost — extracto", () => {
  it("no añade sufijo si no hubo truncamiento", () => {
    const post = transformPost(makePost());

    expect(post.excerpt).toBe("Resumen breve");
    expect(post.excerpt.endsWith("…")).toBe(false);
  });

  it("deja vacío el extracto vacío, sin pintar '...'", () => {
    const post = transformPost(makePost({ excerpt: { rendered: "" } }));

    expect(post.excerpt).toBe("");
  });

  it("trunca y añade el sufijo cuando el texto se pasa de largo", () => {
    const largo = "a".repeat(250);

    const post = transformPost(makePost({ excerpt: { rendered: `<p>${largo}</p>` } }));

    expect(post.excerpt).toHaveLength(201); // 200 caracteres + el sufijo
    expect(post.excerpt.endsWith("…")).toBe(true);
  });
});

describe("transformPost — fecha", () => {
  it("usa date_gmt y le añade el sufijo Z", () => {
    const post = transformPost(makePost());

    expect(post.publishedAt).toBe("2026-08-05T08:30:00Z");
    // Sin la Z, esto se leería como hora local y podría saltar un día.
    expect(new Date(post.publishedAt).toISOString()).toBe("2026-08-05T08:30:00.000Z");
  });

  it("no duplica el sufijo si WordPress ya lo trae", () => {
    const post = transformPost(makePost({ date_gmt: "2026-08-05T08:30:00Z" }));

    expect(post.publishedAt).toBe("2026-08-05T08:30:00Z");
  });

  it("cae a date si no hay date_gmt", () => {
    const post = transformPost(makePost({ date_gmt: undefined }));

    expect(post.publishedAt).toBe("2026-08-05T10:30:00");
  });
});

describe("transformPost — imagen y categorías", () => {
  it("cae al primer <img> del contenido si no hay featuredmedia", () => {
    const post = transformPost(
      makePost({
        content: { rendered: `<p>Texto</p><img src="https://cdn.example/foto.jpg" />` },
      }),
    );

    expect(post.featuredImage).toBe("https://cdn.example/foto.jpg");
  });

  it("deja la imagen vacía cuando no hay ninguna, para que la UI la omita", () => {
    const post = transformPost(makePost());

    // Un <img src=""> solicita la propia página y pinta el icono de rota.
    expect(post.featuredImage).toBe("");
  });

  it("recoge todos los slugs de categoría", () => {
    const post = transformPost(
      makePost({
        _embedded: {
          "wp:term": [
            [
              { id: 1, name: "Blog", slug: "blog" },
              { id: 3, name: "Podcast", slug: "podcast" },
            ],
          ],
        },
      }),
    );

    expect(post.categorySlugs).toEqual(["blog", "podcast"]);
    expect(post.category).toBe("Blog");
  });

  it("decodifica las entidades HTML del título", () => {
    const post = transformPost(
      makePost({ title: { rendered: "Caf&amp;eacute; &amp; t&#039;" } }),
    );

    expect(post.title).not.toContain("&amp;");
  });
});

describe("transformPost — entidades HTML", () => {
  it("decodifica las numéricas y las tipográficas del título", () => {
    const post = transformPost(
      makePost({
        title: { rendered: "Fines de Flujo &#8211; Parte 1 &#x2014; &ldquo;ya&rdquo;" },
      }),
    );
    expect(post.title).toBe("Fines de Flujo – Parte 1 — “ya”");
  });

  it("decodifica en una sola pasada y deja intactas las desconocidas", () => {
    const post = transformPost(
      makePost({ title: { rendered: "A &amp;#8211; B &noexiste; C &#039;D&#039;" } }),
    );
    expect(post.title).toBe("A &#8211; B &noexiste; C 'D'");
  });
});
