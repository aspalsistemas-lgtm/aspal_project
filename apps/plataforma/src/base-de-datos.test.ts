import { describe, expect, it } from "vitest";
import { crearPool } from "./base-de-datos.js";

describe("crearPool", () => {
  it("escucha los errores del pool para que una conexión caída no tumbe el proceso", async () => {
    // Sin oyente, el «error» de una conexión inactiva (la base se reinicia o
    // cierra la conexión) es un evento no manejado y Node termina el proceso.
    const pool = crearPool("postgres://aspal:aspal@127.0.0.1:1/aspal");
    expect(pool.listenerCount("error")).toBeGreaterThan(0);
    expect(() => pool.emit("error", new Error("conexión cerrada"))).not.toThrow();
    await pool.end();
  });
});
