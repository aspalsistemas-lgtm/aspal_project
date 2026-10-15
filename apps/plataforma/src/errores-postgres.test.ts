import { describe, expect, it } from "vitest";
import { codigoPostgres } from "./errores-postgres.js";

describe("codigoPostgres", () => {
  it("lee el SQLSTATE directo o dentro de la causa que pone Drizzle", () => {
    expect(codigoPostgres({ code: "23505" })).toBe("23505");
    expect(
      codigoPostgres(Object.assign(new Error("x"), { cause: { code: "55P03" } })),
    ).toBe("55P03");
  });

  it("ignora lo que no es un SQLSTATE y no se pierde en causas circulares", () => {
    expect(codigoPostgres(new Error("sin código"))).toBeUndefined();
    expect(codigoPostgres({ code: "ECONNREFUSED" })).toBeUndefined();
    expect(codigoPostgres(null)).toBeUndefined();
    const circular: { cause?: unknown } = {};
    circular.cause = circular;
    expect(codigoPostgres(circular)).toBeUndefined();
  });
});
