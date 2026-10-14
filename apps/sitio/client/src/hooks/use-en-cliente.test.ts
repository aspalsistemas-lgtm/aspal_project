import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { useEnCliente } from "./use-en-cliente";

function Sonda() {
  return createElement("p", null, useEnCliente() ? "cliente" : "servidor");
}

describe("useEnCliente", () => {
  it("es false en el prerender, para que la hidratación coincida con el HTML", () => {
    expect(renderToString(createElement(Sonda))).toBe("<p>servidor</p>");
  });
});
