import { describe, expect, it } from "vitest";
import {
  claveHmac,
  claveDeOrigen,
  correoParaLimite,
  esCorreoValido,
  normalizarCorreo,
} from "./claves.js";

describe("normalizarCorreo (CA-1)", () => {
  it("quita espacios, pasa a minúsculas y aplica NFKC", () => {
    expect(normalizarCorreo("  Ana.PEREZ@Ejemplo.ORG ")).toBe("ana.perez@ejemplo.org");
    // NFKC: la «ﬁ» (ligadura) y las formas de ancho completo se unifican.
    expect(normalizarCorreo("ＡＮＡ@ejemplo.org")).toBe("ana@ejemplo.org");
  });

  it("no toca la etiqueta +algo ni los puntos: la cuenta conserva el correo exacto", () => {
    expect(normalizarCorreo("ana+club@gmail.com")).toBe("ana+club@gmail.com");
    expect(normalizarCorreo("a.n.a@gmail.com")).toBe("a.n.a@gmail.com");
  });
});

describe("esCorreoValido (CHECK de la base: ASCII imprimible, 3–254)", () => {
  it.each(["a@b.co", "ana.perez+club@ejemplo.org", "x@y.zz"])("acepta %s", (correo) => {
    expect(esCorreoValido(correo)).toBe(true);
  });

  it.each([
    ["", "vacío"],
    ["ab", "demasiado corto"],
    ["sin-arroba.org", "sin @"],
    ["dos@@arrobas.org", "dos @"],
    ["@sin-usuario.org", "sin usuario"],
    ["sin-dominio@", "sin dominio"],
    ["con espacio@ejemplo.org", "con espacio"],
    ["ñandú@ejemplo.org", "no ASCII"],
    ["ana@ejemplo.org\n", "con salto de línea"],
    [`${"a".repeat(250)}@b.co`, "más de 254"],
    ["Ana@Ejemplo.org", "con mayúsculas (debe llegar ya normalizado)"],
    ["x:victima@gmail.com", "grupo que nodemailer entrega a otro buzón"],
    ["victima(1)@gmail.com", "comentario que nodemailer descarta"],
    ["victima@gmail.com.", "dominio con punto final"],
    ["a..b@ejemplo.org", "puntos consecutivos"],
    [".ana@ejemplo.org", "empieza por punto"],
    ["ana.@ejemplo.org", "termina en punto"],
    ["ana@ejemplo", "dominio sin punto"],
    ["ana@-ejemplo.org", "etiqueta que empieza por guion"],
    ["ana@ejemplo..org", "etiqueta vacía"],
    ["ana@ejemplo.o", "TLD de un carácter"],
    ["a<b>@ejemplo.org", "ángulos"],
    ["a,b@ejemplo.org", "coma"],
    ['a"b@ejemplo.org', "comillas"],
  ])("rechaza %j (%s)", (correo) => {
    expect(esCorreoValido(correo)).toBe(false);
  });
});

describe("correoParaLimite (auditoría 8: no esquivar el límite con +etiqueta)", () => {
  it("quita +etiqueta", () => {
    expect(correoParaLimite("ana+1@ejemplo.org")).toBe("ana@ejemplo.org");
    expect(correoParaLimite("ana+2@ejemplo.org")).toBe("ana@ejemplo.org");
    expect(correoParaLimite("ana+@ejemplo.org")).toBe("ana@ejemplo.org");
  });

  it("en Gmail quita también los puntos del usuario", () => {
    expect(correoParaLimite("a.n.a+x@gmail.com")).toBe("ana@gmail.com");
    expect(correoParaLimite("a.n.a@googlemail.com")).toBe("ana@gmail.com");
  });

  it("fuera de Gmail conserva los puntos (pueden ser cuentas distintas)", () => {
    expect(correoParaLimite("a.n.a@ejemplo.org")).toBe("a.n.a@ejemplo.org");
  });

  it("normaliza mayúsculas y espacios", () => {
    expect(correoParaLimite("  ANA+x@Ejemplo.ORG ")).toBe("ana@ejemplo.org");
  });
});

describe("claveDeOrigen (CA-12)", () => {
  it("IPv4 tal cual", () => {
    expect(claveDeOrigen("203.0.113.7")).toBe("203.0.113.7");
  });

  it("IPv6: agrupa por /64, así rotar la parte baja no esquiva el límite", () => {
    const a = claveDeOrigen("2001:db8:abcd:12::1");
    const b = claveDeOrigen("2001:db8:abcd:12:ffff:ffff:ffff:ffff");
    expect(a).toBe(b);
    expect(a).toBe("2001:db8:abcd:12::/64");
    expect(claveDeOrigen("2001:db8:abcd:13::1")).not.toBe(a);
  });

  it("IPv6 con :: en medio o al principio se expande bien", () => {
    expect(claveDeOrigen("::1")).toBe("0:0:0:0::/64");
    expect(claveDeOrigen("fe80::1")).toBe("fe80:0:0:0::/64");
    expect(claveDeOrigen("2001:db8::")).toBe("2001:db8:0:0::/64");
  });

  it("IPv4 mapeada en IPv6 se trata como la IPv4", () => {
    expect(claveDeOrigen("::ffff:203.0.113.7")).toBe("203.0.113.7");
  });

  it("una IPv6 en mayúsculas es la misma que en minúsculas", () => {
    expect(claveDeOrigen("2001:DB8:ABCD:12::1")).toBe(
      claveDeOrigen("2001:db8:abcd:12::1"),
    );
  });

  it("lo que no es una IP no se confunde con ninguna otra", () => {
    expect(claveDeOrigen("")).toBe("desconocido");
    expect(claveDeOrigen("no-es-una-ip")).toBe("desconocido");
  });
});

describe("claveHmac (CA-10: claves del correo enviado, nunca del id de cuenta)", () => {
  const SECRETO = "secreto-de-prueba-con-mas-de-32-caracteres";

  it("es determinista y de 32 bytes", () => {
    const clave = claveHmac(SECRETO, "c", "ana@ejemplo.org", "203.0.113.7");
    expect(clave).toBeInstanceOf(Buffer);
    expect(clave.length).toBe(32);
    expect(clave.equals(claveHmac(SECRETO, "c", "ana@ejemplo.org", "203.0.113.7"))).toBe(
      true,
    );
  });

  it("cambia con el secreto, con el tipo y con cada parte", () => {
    const base = claveHmac(SECRETO, "c", "ana@ejemplo.org", "203.0.113.7");
    expect(
      base.equals(claveHmac(SECRETO + "x", "c", "ana@ejemplo.org", "203.0.113.7")),
    ).toBe(false);
    expect(base.equals(claveHmac(SECRETO, "o", "ana@ejemplo.org", "203.0.113.7"))).toBe(
      false,
    );
    expect(base.equals(claveHmac(SECRETO, "c", "otra@ejemplo.org", "203.0.113.7"))).toBe(
      false,
    );
    expect(base.equals(claveHmac(SECRETO, "c", "ana@ejemplo.org", "203.0.113.8"))).toBe(
      false,
    );
  });

  it("las partes no se pueden confundir al concatenarlas", () => {
    expect(
      claveHmac(SECRETO, "c", "a", "bc").equals(claveHmac(SECRETO, "c", "ab", "c")),
    ).toBe(false);
  });

  it("no contiene el correo ni el origen en claro", () => {
    const hex = claveHmac(SECRETO, "c", "ana@ejemplo.org", "203.0.113.7").toString(
      "latin1",
    );
    expect(hex).not.toContain("ana@ejemplo.org");
    expect(hex).not.toContain("203.0.113.7");
  });
});
